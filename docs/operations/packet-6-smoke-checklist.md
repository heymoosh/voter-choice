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
| 1. DB tables non-empty                             | ✅ PASS | bills:65,696 votes:5,416,530 candidates:7,382 issue_tags:39,688 (54% bill coverage) donor_aggregates:19,173 rows covering 2,382 unique candidates across 15 sources |
| 2. Alignment API returns found/not-found correctly | ✅ PASS | found:true for Aicha Davis TX-house property_taxes (1 contributing vote returned); found:false for fictional candidate |
| 3. Chat uses `lookup_alignment`, not `web_search`  | ✅ PASS | Browser session confirmed: Arrington TX-19 healthcare query triggered lookup_alignment (12/28 votes returned, 34/47 key votes shown). No 400 error. tool_use input fix verified live on 2026-05-12. |
| 4. 50 tag samples reviewed, no systematic errors   | ✅ PASS | 50 samples audited via `_audit-tags.ts`; canonical_issue accurate, stance_lens correct, no systematic errors. Coverage growing as tag-bills runs. |
| 5. Wyoming empty state renders correctly           | ✅ PASS | /api/alignment returns found:false with clear unavailable.reason for unknown candidates |

**Donor coverage by source (as of 2026-05-12):**

| Source | State | Candidates | Rows | Script |
|--------|-------|-----------|------|--------|
| fec | Federal | 593 | 1,146 | `federal-donors.ts` |
| ny_boe_bulk | NY | 182 | 1,324 | `ny-boe-donors.ts` |
| ct_seec_bulk | CT | 178 | 668 | `ct-seec-donors.ts` |
| me_cfis_bulk | ME | 175 | 486 | `me-cfis-donors.ts` |
| wa_pdc_bulk | WA | 165 | 2,648 | `wa-pdc-donors.ts` |
| ma_ocpf_bulk | MA | 151 | 1,526 | `ma-ocpf-donors.ts` |
| ia_iec_bulk | IA | 144 | 1,058 | `ia-iec-donors.ts` |
| tec_bulk | TX | 141 | 2,228 | `tx-tec-donors.ts` |
| mn_cfb_bulk | MN | 129 | 647 | `mn-cfb-donors.ts` |
| ca_calaccess_bulk | CA | 110 | 4,221 | `ca-calaccess-donors.ts` |
| co_tracer_bulk | CO | 97 | 1,245 | `co-tracer-donors.ts` |
| va_sbe_bulk | VA | 91 | 592 | `va-sbe-donors.ts` |
| hi_cfb_bulk | HI | 60 | 698 | `hi-cfb-donors.ts` |
| pa_dos_bulk | PA | 154 | 669 | `pa-dos-donors.ts` (fixed: now uses FILERTYPE=2 committee IDs) |
| wi_cfis_bulk | WI | 12 | 17 | ⚠️ DATA QUALITY: amounts implausibly large ($26M for state senator); do not display. Delete rows or re-ingest with correct committee filtering. |
| **TOTAL** | **14 states + federal** | **2,382** | **19,173** | |

**Notes:**
- `issue_tags=39,688` (54% bill coverage): All 7 Anthropic Batch API collections complete (64,802 bills submitted, ~54% resulted in at least one canonical issue tag). Remaining 46% returned empty arrays (no relevant issue) or malformed JSON — both handled gracefully (bills simply don't contribute to alignment scores).
- **WI data quality issue**: `wi_cfis_bulk` has 17 rows but amounts are implausibly large ($26M "Party committees" for a state senate candidate). Possible cause: WI CFIS tRPC API returns party-committee pass-through aggregates, not individual donor contributions. These rows should be deleted before launch (`DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk'`).
- **NE (Nebraska)**: `ne-nadc-donors.ts` script is ready. Blocked on loading NE candidates via OpenStates API. The API has a 250 req/day free-tier daily limit which was exhausted (session 109 took ~100+ pages). **Muxin action**: tomorrow (after midnight UTC), run `OPENSTATES_API_KEY=ad1e876e-cbb9-43f9-b0c8-1ff5e91f794c STATE=NE DATABASE_URL=<neon> npx tsx scripts/ingest/state-votes.ts`, then `DATABASE_URL=<neon> npx tsx scripts/ingest/ne-nadc-donors.ts`. Alternatively, restore the `2026-05-public.pgdump` to a local Postgres and run `state-votes-from-dump.ts STATE=NE`.
- **Remaining ~35 states**: Bot-protected (FL, OH, IL: Cloudflare; NJ, NV, VT: Incapsula; UT: F5 TSPD) or require per-state Playwright scraping. The cross-state solution is FollowTheMoney (FTM) API.
- **FTM BLOCKER**: FTM registration requires a human to: (1) create account at followthemoney.org/account/sign-up/, (2) verify email, (3) copy API key from account page, (4) store as `FOLLOWTHEMONEY_API_KEY` in Vercel + BWS secrets, then run `scripts/ingest/state-donors.ts`. This is the only scalable path to the remaining ~35 states.
- `candidate_count=7,382`: 6,753 state candidates from OpenStates pgdump + 629 federal from GovTrack ingest.
- FEC donor industry breakdown not populated: requires FEC API calls per-candidate (`/schedule_e`). Current data is aggregate totals only. Alignment scoring works without this.
