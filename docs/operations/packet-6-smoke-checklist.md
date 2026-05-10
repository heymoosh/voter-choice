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
- `stance_lens` direction (`in_favor` / `opposed`) makes sense. A "yea" vote on this bill *supports* or *restricts* the issue?
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

| Step | Result | Notes |
|------|--------|-------|
| 1. DB tables non-empty | | |
| 2. Alignment API returns found/not-found correctly | | |
| 3. Chat uses `lookup_alignment`, not `web_search` | | |
| 4. 50 tag samples reviewed, no systematic errors | | |
| 5. Wyoming empty state renders correctly | | |
