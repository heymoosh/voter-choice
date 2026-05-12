# Work Packet: launch-openstates-bulk-ingest

Status: ready
Owner: orchestrator
Source: User — bypass OpenStates API 429 limits using the May 2026 postgres dump
Branch: launch/production

## Intent

Populate the Neon `candidates`, `bills`, `votes`, and `candidate_offices` tables from the
OpenStates monthly postgres dump, bypassing the rate-limited OpenStates API entirely.
This unblocks the `lookup_alignment` chatbot tool which is currently returning empty for
every state candidate because the DB has no data.

## Original User Intent

We downloaded the full OpenStates postgres dump (9.8 GB) after hitting 429 rate limits
from their API. We confirmed the dump contains vote records. We need to get that data
into Neon so the chatbot can give grounded voting-record answers.

## Context

- Dump files (not committed, gitignored):
  - `/Users/Muxin/Documents/GitHub/voter-choice/2026-05-schema.pgdump` (696 KB — schema only)
  - `/Users/Muxin/Documents/GitHub/voter-choice/2026-05-public.pgdump` (9.8 GB — full data)
- Dump format: PostgreSQL custom format (v1.16), source DB is `openstatesorg` on pg 14/17
- Our Neon schema is in `db/schema.ts`
- Existing API ingest script: `scripts/ingest/state-votes.ts` (keep, don't delete — needed for future incremental updates)
- Google Civic is still required for polling-place / logistical data; this packet is only about voting records

## OpenStates → Neon Schema Mapping

| Neon table        | Source tables                                                                 |
|-------------------|-------------------------------------------------------------------------------|
| `candidates`      | `opencivicdata_person` (id, name, primary_party, current_role jsonb)          |
| `candidate_offices` | `opencivicdata_membership` + `opencivicdata_organization`                   |
| `bills`           | `opencivicdata_bill` + `opencivicdata_billabstract` (abstract → summary)      |
| `votes`           | `opencivicdata_personvote` + `opencivicdata_voteevent` (option, start_date)   |

Vote option normalization (OpenStates → our schema):

| OpenStates `option`         | Our `vote_cast`  |
|-----------------------------|-----------------|
| yes / yea                   | yea             |
| no / nay                    | nay             |
| absent / excused / not voting / other | not_voting |
| present                     | present         |

## Business Logic

Rules:
- Session filter: load the **two most recent sessions per state** (covers current term
  incumbents and the prior session for challenger context). Older sessions are noise.
- Only load legislators who have `current_role` set (active/recent members). Skip
  historical-only people with no current_role.
- Bill source ID format: `openstates-<bill.id>` (matches existing `state-votes.ts` pattern).
- Candidate source ID: `openstates-<person.id>`.
- Jurisdiction format: `state-<STATE_ABBR>-house` or `state-<STATE_ABBR>-senate`
  (match `state-votes.ts` convention exactly so downstream tag/alignment queries work).
- All 50 states + DC in scope (matches the 50-state expansion already shipped).
- Do not touch federal candidates (GovTrack handles federal; OpenStates federal coverage
  is partial and we already have the GovTrack ingest).

Assumptions:
- `LOCAL_OPENSTATES_URL` points to a local postgres with the dump loaded.
- `DATABASE_URL` points to Neon (production or a branch — user decides before running).
- The tag-bills script runs **after** this ingest populates `bills`.

## Scope

### Phase A — Install postgres tools + stand up local DB (manual steps, user runs)

No code changes. Steps for user to run in terminal:

```bash
# Install postgres (server + client tools)
brew install postgresql@17
brew services start postgresql@17

# Create a database for the OpenStates dump
/opt/homebrew/opt/postgresql@17/bin/createdb openstates

# Restore schema (fast — 696 KB)
/opt/homebrew/opt/postgresql@17/bin/pg_restore \
  --no-owner --no-acl \
  -d postgresql://localhost/openstates \
  /Users/Muxin/Documents/GitHub/voter-choice/2026-05-schema.pgdump

# Restore ONLY the tables we need from the 9.8 GB dump
# (pg_restore scans the whole file but only writes the named tables)
/opt/homebrew/opt/postgresql@17/bin/pg_restore \
  --data-only --no-owner --no-acl \
  --table=opencivicdata_jurisdiction \
  --table=opencivicdata_legislativesession \
  --table=opencivicdata_organization \
  --table=opencivicdata_person \
  --table=opencivicdata_membership \
  --table=opencivicdata_bill \
  --table=opencivicdata_billabstract \
  --table=opencivicdata_voteevent \
  --table=opencivicdata_personvote \
  -d postgresql://localhost/openstates \
  /Users/Muxin/Documents/GitHub/voter-choice/2026-05-public.pgdump
```

Expected: this takes 10–30 minutes depending on disk speed. The selective restore skips
all event, admin, bundle, and django tables.

Verify it worked:
```bash
/opt/homebrew/opt/postgresql@17/bin/psql postgresql://localhost/openstates \
  -c "SELECT COUNT(*) FROM opencivicdata_person; SELECT COUNT(*) FROM opencivicdata_personvote;"
```

### Phase B — Write `scripts/ingest/state-votes-from-dump.ts`

New script. Reads from local OpenStates postgres, writes to Neon. Reuses the
normalization types and `ALL_STATE_ABBREVIATIONS` from `state-votes.ts` (import them).

Key query logic (pseudo-SQL to implement in TypeScript via `postgres` or raw pg):

```sql
-- 1. Get the two most recent sessions per state jurisdiction
WITH ranked_sessions AS (
  SELECT s.id, s.identifier, s.start_date, s.end_date, s.jurisdiction_id,
         ROW_NUMBER() OVER (PARTITION BY s.jurisdiction_id ORDER BY s.start_date DESC) AS rn
  FROM opencivicdata_legislativesession s
  JOIN opencivicdata_jurisdiction j ON j.id = s.jurisdiction_id
  WHERE j.classification = 'government'  -- state govts, not US federal
    AND j.name NOT LIKE '%United States%'
)
SELECT * FROM ranked_sessions WHERE rn <= 2;

-- 2. Bills in those sessions (with abstract)
SELECT b.id, b.identifier, b.title, b.first_action_date, b.legislative_session_id,
       a.abstract
FROM opencivicdata_bill b
LEFT JOIN opencivicdata_billabstract a ON a.bill_id = b.id
WHERE b.legislative_session_id IN (<session_ids>);

-- 3. Vote events linked to those bills
SELECT ve.id, ve.bill_id, ve.start_date, ve.organization_id
FROM opencivicdata_voteevent ve
WHERE ve.bill_id IN (<bill_ids>);

-- 4. Person votes for those events + person info
SELECT pv.option, pv.voter_name, pv.vote_event_id, pv.voter_id,
       p.id, p.name, p.primary_party, p.current_role, p.current_jurisdiction_id
FROM opencivicdata_personvote pv
JOIN opencivicdata_person p ON p.id = pv.voter_id
WHERE pv.vote_event_id IN (<vote_event_ids>)
  AND p.current_role IS NOT NULL;

-- 5. Org → chamber mapping (house/senate)
SELECT id, name, classification FROM opencivicdata_organization
WHERE id IN (<org_ids>);
```

State abbreviation from jurisdiction: OpenStates jurisdiction IDs look like
`ocd-jurisdiction/country:us/state:tx/government` — extract the state code from this.

Script entry point:
```bash
LOCAL_OPENSTATES_URL=postgresql://localhost/openstates \
DATABASE_URL=<neon-connection-string> \
npx tsx scripts/ingest/state-votes-from-dump.ts
```

Progress output: log counts per state as each finishes (same style as `state-votes.ts`).
On completion, print a summary table: state | candidates | bills | votes.

### Phase C — Run tag-bills on newly loaded bills

After Phase B succeeds:
```bash
DATABASE_URL=<neon> ANTHROPIC_API_KEY=<key> npx tsx scripts/ingest/tag-bills.ts
```

This tags the newly loaded state bills with canonical issues — required for the
`lookup_alignment` tool to return useful issue-filtered results.

### Phase D — Smoke checklist

Run steps 1 and 2 from `docs/operations/packet-6-smoke-checklist.md`:
- Step 1: Confirm all five DB tables have non-zero counts.
- Step 2: Hit `/api/alignment` with a known TX state legislator and confirm `found: true`.

## Files to Create

- `scripts/ingest/state-votes-from-dump.ts` — new, one-time bulk ingest from local postgres

## Files to Touch

- `docs/operations/packet-6-smoke-checklist.md` — fill in sign-off rows after Phase D

## Do Not Touch

- `scripts/ingest/state-votes.ts` — keep for future incremental cron updates
- `db/schema.ts` — no schema changes needed
- `main` branch
- Any Vercel workflow files

## Acceptance Criteria

- `SELECT COUNT(*) FROM candidates` returns > 1000 (all 50 states have active legislators)
- `SELECT COUNT(*) FROM bills` returns > 10,000
- `SELECT COUNT(*) FROM votes` returns > 100,000
- `/api/alignment` returns `found: true` for a known TX state rep (e.g. search your DB
  for any TX candidate and use their name)
- Tag-bills audit shows reasonable canonical_issue assignments with no systematic errors

## Anti-Solutions

- Do not load all historical sessions (pre-2022) — unnecessary volume, Neon storage cost
- Do not modify or delete `state-votes.ts` — it stays for incremental updates
- Do not commit the `.pgdump` files to git
- Do not expose `LOCAL_OPENSTATES_URL` or `DATABASE_URL` outside `.env.local`
- Do not skip the session filter and try to load all 9.8 GB into Neon

## Verification

```bash
npm run lint
npm run test
npm run build
```

Plus the smoke checklist steps above.
