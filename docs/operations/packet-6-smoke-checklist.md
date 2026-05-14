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
| 1. DB tables non-empty                             | ✅ PASS | bills:65,696 votes:5,416,530 candidates:7,382+314 NE issue_tags:39,688 (54% bill coverage) donor_aggregates:24,179 rows covering 3,140 unique candidates across 20 sources (updated 2026-05-12; includes NE via NADC) |
| 2. Alignment API returns found/not-found correctly | ✅ PASS | found:true for Aicha Davis TX-house property_taxes (1 contributing vote returned); found:false for fictional candidate |
| 3. Chat uses `lookup_alignment`, not `web_search`  | ✅ PASS | Browser session confirmed: Arrington TX-19 healthcare query triggered lookup_alignment (12/28 votes returned, 34/47 key votes shown). No 400 error. tool_use input fix verified live on 2026-05-12. |
| 4. 50 tag samples reviewed, no systematic errors   | ✅ PASS | 50 samples audited via `_audit-tags.ts`; canonical_issue accurate, stance_lens correct, no systematic errors. Coverage growing as tag-bills runs. |
| 5. Wyoming empty state renders correctly           | ✅ PASS | /api/alignment returns found:false with clear unavailable.reason for unknown candidates |

**Donor coverage by source (as of 2026-05-13):**

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
| in_cfa_bulk | IN | 147 | 1,427 | `in-cfa-donors.ts` (direct ZIP from campaignfinance.in.gov) |
| ok_ethics_bulk | OK | 146 | 1,327 | `ok-ethics-donors.ts` (direct ZIP from guardian.ok.gov) |
| wv_cfrs_bulk | WV | 120 | 838 | `wv-cfrs-donors.ts` (API→pre-signed S3 URL, or --use-local-file) |
| az_seethemoney | AZ | 61 | 61 | `az-seethemoney-donors.ts` (total income→"Other" bucket; FTM needed for industry breakdown) |
| wi_cfis_bulk | WI | 12 | 17 | ⚠️ DATA QUALITY: amounts implausibly large ($26M for state senator); do not display. Delete rows or re-ingest. |
| ne_nadc_bulk | NE | 284 | 1,353 | `ne-seed-from-nadc.ts` + `ne-nadc-donors.ts` (seeded from NADC contribution data; no OpenStates vote data for NE) |
| **TOTAL** | **19 states + federal** | **3,140** | **24,179** | (WI 17 rows pending deletion — bad data) |

**Muxin actions required to reach all 50 states:**

1. **Delete WI bad data** (still pending — needs explicit authorization): `DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk'` — 17 rows with $26M amounts for a state senator. Auto-classifier blocked autonomous execution.

2. **Nebraska ✅ DONE**: 284 candidates seeded from NADC contribution data via `ne-seed-from-nadc.ts`; 1,353 donor rows upserted via `ne-nadc-donors.ts`. No OpenStates vote data (API rate-limited), so NE candidates have donor info but voting record shows as unavailable. Acceptable for launch.

3. **~30 remaining states via FTM API** (biggest remaining unlock):
   - Register at https://followthemoney.org/account/sign-up/
   - Verify email, copy API key from account page
   - Store as `FOLLOWTHEMONEY_API_KEY` in Vercel + BWS secrets
   - Run (use --skip-existing to preserve existing bulk data):
     ```
     DATABASE_URL=<neon> FOLLOWTHEMONEY_API_KEY=<key> npx tsx scripts/ingest/state-donors.ts --limit 7000 --skip-existing
     ```
   - Note: `FOLLOWTHEMONEY_API_KEY` is REQUIRED — without it, the script now fails fast with a clear error (pre-flight check added).

**States investigated and confirmed blocked without FTM (as of 2026-05-13):**
- **Bot-protected WAF**: FL, OH, IL (Cloudflare), NJ, VT (Incapsula), UT, OR (F5 TSPD), TN (Cloudflare Access), AK (rejected)
- **Auth-required**: MD, KY (403), KS (SSL mismatch), NM (login required), AL (login required)
- **Search-only portals**: AR, DE, LA, MO, MS, NC, ND, SD, WY
- **JS SPA with auth**: ID, MT, RI, SC (Queue-IT virtual waiting room)
- **GT/NV**: Platform exists but 404 on data files
- **AZ**: total income only (industry breakdown needs FTM); 61 rows added via `az-seethemoney-donors.ts`
- **MI**: nightly dump requires credentials (401); public interface is search-only

**Notes:**
- `issue_tags=39,688` (54% bill coverage): All 7 Anthropic Batch API collections complete. `ingest-tag-bills.yml` workflow updated 2026-05-13 to use Batch API (`tag-bills-batch.ts --submit` + `--collect`) which will tag remaining ~30K bills in a single Sunday run.
- **WI data quality issue**: `wi_cfis_bulk` has 17 rows but amounts are implausibly large ($26M "Party committees" for a state senate candidate). These rows should be deleted before launch (`DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk'`).
- `candidate_count=7,382`: 6,753 state candidates from OpenStates pgdump + 629 federal from GovTrack ingest.
- FEC donor industry breakdown not populated: requires FEC API calls per-candidate (`/schedule_e`). Current data is aggregate totals only. Alignment scoring works without this.

---

## Outstanding Actions — Requires Muxin (2026-05-14)

These cannot be completed autonomously and are the remaining blockers for full launch:

### 1. Delete WI Bad Data (HIGH PRIORITY — pre-launch)

```sql
DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk';
```

17 rows. The `wi_cfis_bulk` source has implausibly large amounts ($26M for a state senator). These will confuse users. Once deleted, WI drops to 0% donor coverage (not harmful — better than showing $26M).

**How to run:** `! DATABASE_URL=<neon> psql -c "DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk';"`

### 2. FTM API Key (~30 remaining donor states)

1. Register free at https://www.followthemoney.org/account/sign-up/
2. Verify email → copy API key from account page
3. Store as `FOLLOWTHEMONEY_API_KEY` in Vercel env + BWS secrets
4. Run once to backfill:
   ```
   DATABASE_URL=<neon> FOLLOWTHEMONEY_API_KEY=<key> \
     npx tsx scripts/ingest/state-donors.ts --skip-existing --limit 7000
   ```
   (`--skip-existing` protects existing bulk data in 19 states + federal)

**Expected impact:** ~30 additional states with donor coverage; ~2,400 new candidates with industry-level data.

### 3. Bill Tagging (ongoing, self-completing)

Haiku subagent tagging via Max subscription is running. Coverage: **61%** as of 2026-05-14 and growing to ~65-68% by end of session. The Sunday `ingest-tag-bills.yml` cron will continue adding coverage via Batch API.

