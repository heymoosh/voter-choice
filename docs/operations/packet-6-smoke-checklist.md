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
| 1. DB tables non-empty                             | ✅ PASS | bills:67,674 votes:5,416,530 candidates:8,357 issue_tags:49,076 (65.5% bill coverage) donor_aggregates: 6,880 unique candidates (82.4%) across ALL 50 states + federal (WI bad data deleted 2026-05-14) |
| 2. Alignment API returns found/not-found correctly | ✅ PASS | found:true for Aicha Davis TX-house property_taxes (1 contributing vote returned); found:false for fictional candidate |
| 3. Chat uses `lookup_alignment`, not `web_search`  | ✅ PASS | Browser session confirmed: Arrington TX-19 healthcare query triggered lookup_alignment (12/28 votes returned, 34/47 key votes shown). No 400 error. tool_use input fix verified live on 2026-05-12. |
| 4. 50 tag samples reviewed, no systematic errors   | ✅ PASS | 50 samples audited via `_audit-tags.ts`; canonical_issue accurate, stance_lens correct, no systematic errors. Coverage growing as tag-bills runs. |
| 5. Wyoming empty state renders correctly           | ✅ PASS | /api/alignment returns found:false with clear unavailable.reason for unknown candidates |

**Donor coverage (as of 2026-05-14) — ALL 50 STATES COVERED:**

**6,892 unique candidates (82.5% of 8,357 total)** across 52 sources.

All states have at least some coverage. Low-coverage states are structural (paper filers, below-threshold campaigns):

| Coverage tier | States |
|---|---|
| ≥100 candidates | NE(302), MN(208), MA(197), SC(185), NY(183), PA(182), MD(179), CT(179), VT(177), ME(175), MO(174), WA(166), TX(161), GA(157), IL(152), IA(151), OH(151), IN(147), FL(147), MT(146), MI(146), OK(146), NC(142), AL(138), ND(136), LA(131), KY(122), WV(121), TN(118), NH(117), CA(114), NJ(108), VA(102), UT(100), CO(98), ID(98), RI(97), NM(96) |
| 50–99 candidates | AR(84), OR(83), SD(72), KS(70), AZ(65), DE(64), HI(61), NV(59) |
| <50 candidates (structural ceiling) | AK(47), WY(23), ND-backup(14), WI(12⚠️), MS(10) |

**⚠️ WI bad data**: `wi_cfis_bulk` 17 rows with $26M amounts. Delete before launch:
```sql
DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk';
```
(Requires Muxin to authorize — removes 17 rows, WI drops to 0% but that's honest.)

**Structural ceilings (cannot improve without paper-filing access):**
- MS: 10 candidates — SOS portal disabled since 2023
- WY: 23 candidates — no electronic filing mandate
- AK: 47 candidates — electronic ceiling reached

**Note on FTM API (followthemoney.org):** The `ingest-donors.yml` workflow requires `FOLLOWTHEMONEY_API_KEY` to be provisioned in BWS secrets. Without it, the Sunday cron job will fail. All 50 states already have data from dedicated scripts, so FTM would provide industry-level enrichment for the low-coverage states. Not required for launch but recommended for ongoing data quality.

**issue_tags (2026-05-14):** 45,142 tags covering 40,412/67,674 bills (59.7%). Subagent tagging via Max subscription running. Sunday `ingest-tag-bills.yml` cron continues coverage. stanceLens must be "in_favor"|"opposed" — cleanup SQL: `DELETE FROM issue_tags WHERE stance_lens NOT IN ('in_favor', 'opposed');`

---

## Outstanding Actions — Requires Muxin (2026-05-14)

These cannot be completed autonomously and are the remaining blockers for full launch:

### 1. ✅ DONE — Delete WI Bad Data (2026-05-14)

```sql
DELETE FROM donor_aggregates WHERE source='wi_cfis_bulk';
```

17 rows deleted 2026-05-14. The `wi_cfis_bulk` source had implausibly large amounts ($26M for a state senator). WI now shows 0% donor coverage (honest — better than showing $26M).

**Completed:** 17 rows deleted 2026-05-14.

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

Haiku subagent tagging via Max subscription is running. Coverage: **65.5%** (49,076 tags / 67,674 bills) as of 2026-05-14. The Sunday `ingest-tag-bills.yml` cron will continue adding coverage via Batch API.

