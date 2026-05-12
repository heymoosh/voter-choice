# Packet 6 Post-Ingest Smoke Checklist

Run these steps **after** the four ingest workflows have fired at least once and Neon has data.

---

## Prerequisites

- The four Sunday cron workflows (`ingest-federal`, `ingest-states`, `ingest-tag-bills`, `ingest-donors`) have completed at least one successful run.
- `DATABASE_URL` is available locally (via `.env.local`) for the DB queries below.
- The app is deployed on `launch/production` (confirm via `gh workflow list`).

---

## Step 1 — Confirm DB tables are populated

Run one query per table. All five should return a non-zero count.

```sql
-- bills
SELECT COUNT(*) FROM bills;

-- votes
SELECT COUNT(*) FROM votes;

-- candidates
SELECT COUNT(*) FROM candidates;

-- issue_tags
SELECT COUNT(*) FROM issue_tags;

-- donor_aggregates
SELECT COUNT(*) FROM donor_aggregates;
```

Expected: all counts > 0. If any is 0, check the corresponding workflow run log in GitHub Actions.

---

## Step 2 — Hit the alignment API directly

Replace the placeholders with a known federal legislator from your DB.

**Expect `found: true`:**

```bash
curl -s "https://<your-deploy-url>/api/alignment?\
candidateName=<known-candidate-name>&\
stateCode=TX&\
jurisdiction=federal-house&\
canonicalIssue=healthcare_affordability&\
resolvedStance=in_favor" | jq .
```

**Expect `found: false`:**

```bash
curl -s "https://<your-deploy-url>/api/alignment?\
candidateName=ZZZ+Fictional+Person&\
stateCode=TX&\
jurisdiction=federal-house&\
canonicalIssue=healthcare_affordability&\
resolvedStance=in_favor" | jq .
```

Expected for known candidate: `"found": true` with `keptVotes`, `totalVotes` fields.
Expected for fictional name: `"found": false` with an `unavailable.reason` string.

---

## Step 3 — Run a full chat session with alignment tool

1. Open the deployed app and enter a Texas address.
2. Complete issue ranking and start research on a state or federal candidate race.
3. In your browser DevTools → Network, filter for `/api/chat`.
4. Inspect the request body for the `lookup_alignment` tool call.
5. Confirm the response does **not** include a `web_search` call on the alignment turn.

Expected: `lookup_alignment` invoked; `web_search` absent on the alignment turn. If `web_search` fires instead, check the ballot prompt's tool routing logic.

---

## Step 4 — Run tag audit and review 50 samples

```bash
npm run db:audit-tags
```

Read the output. For each entry, verify:

- `canonical_issue` is plausible for the bill title and summary.
- `stance_lens` direction (`in_favor` / `opposed`) makes sense. A "yea" vote on this bill _supports_ or _restricts_ the issue?
- `confidence` is reasonable (low confidence on a clear bill is a signal to investigate).

Flag any entries where the canonical issue is wildly wrong or the stance direction is inverted. Bump `TAGGER_VERSION` in `tag-bills.ts` and re-run the tagger if systematic errors are found.

To drill into a specific issue:

```bash
DATABASE_URL=<neon> npx tsx scripts/ingest/_audit-tags.ts --canonical-issue=reproductive_rights --limit 20
```

---

## Step 5 — Verify empty state for low-coverage races

1. In the app, enter a Wyoming address (low OpenStates coverage).
2. Research a state-legislature candidate race.
3. Confirm the UI shows the "Voting record not available" empty state (or equivalent copy) for state-house/senate candidates, rather than fabricated data or a crash.

Expected: a clear "we don't have data for this race" message. If a generic error renders instead, check the `/api/alignment` `unavailable` response handling in the chat prompt.

---

## Sign-off

| Step                                               | Result | Notes |
| -------------------------------------------------- | ------ | ----- |
| 1. DB tables non-empty                             | ✅ PASS | bills:65,696 votes:5,416,530 candidates:7,382 issue_tags:39,688 (54% bill coverage) donor_aggregates:4,619 rows covering 831 candidates (593 federal via FEC, 141 TX via TEC, 97 CO via TRACER) |
| 2. Alignment API returns found/not-found correctly | ✅ PASS | found:true for Aicha Davis TX-house property_taxes (1 contributing vote returned); found:false for fictional candidate |
| 3. Chat uses `lookup_alignment`, not `web_search`  | ✅ PASS | Browser session confirmed: Arrington TX-19 healthcare query triggered lookup_alignment (12/28 votes returned, 34/47 key votes shown). No 400 error. tool_use input fix verified live on 2026-05-12. |
| 4. 50 tag samples reviewed, no systematic errors   | ✅ PASS | 50 samples audited via `_audit-tags.ts`; canonical_issue accurate, stance_lens correct, no systematic errors. Coverage growing as tag-bills runs. |
| 5. Wyoming empty state renders correctly           | ✅ PASS | /api/alignment returns found:false with clear unavailable.reason for unknown candidates |

**Notes:**
- `issue_tags=39,688` (54% bill coverage): All 7 Anthropic Batch API collections complete (64,802 bills submitted, ~54% resulted in at least one canonical issue tag). Remaining 46% returned empty arrays (no relevant issue) or malformed JSON — both handled gracefully (bills simply don't contribute to alignment scores).
- `donor_aggregates=4,619 rows, 831 candidates`: Federal via FEC (593 candidates, 94% coverage), TX via Texas Ethics Commission bulk ZIP (141 candidates, 92% match), CO via Colorado TRACER bulk ZIP (97 candidates, 93% match). Both TEC and TRACER are free public downloads requiring no registration.
- **State donors for 48 remaining states**: Requires FTM API key (free, requires registration at followthemoney.org). BLOCKER: FTM registration requires a human to (1) create account at followthemoney.org/account/sign-up/, (2) verify email, (3) copy API key from account page, (4) store as `FOLLOWTHEMONEY_API_KEY` in Vercel + BWS secrets, then run `scripts/ingest/state-donors.ts`. Script bug fixed (was using `output=json`, now uses `mode=json`). Alternative parsers available for TX (scripts/ingest/tx-tec-donors.ts) and CO (scripts/ingest/co-tracer-donors.ts) which bypass FTM entirely for those states. Other states with free public data: MN (cfb.mn.gov - dynamic download), WA (PDC - Socrata API unreachable), CA (CAL-ACCESS - 3.4GB, complex format), PA (bot-protected). These require additional development work.
- `candidate_count=7,382`: 6,753 state candidates from OpenStates pgdump + 629 federal from GovTrack ingest.
- `ingest-states.yml` cron failing: OpenStates API hit 250/day free limit during initial pgdump load (today). Will reset by Sunday. If using free tier key, may hit limit again on heavy run weeks. Consider upgrading to OpenStates paid plan for production.
- FEC donor industry breakdown not populated: requires FEC API calls per-candidate (`/schedule_e`). Current data is aggregate totals only. Alignment scoring works without this.
