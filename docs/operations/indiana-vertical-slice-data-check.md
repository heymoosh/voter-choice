# Indiana vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Indiana (IN)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15/16. Indiana's 2026 primary (May 5, 2026) is fully certified
(100.0% of 5,067 precincts reporting, last updated June 1, 2026). The
general election is November 3, 2026. Indiana has no 2026 US Senate contest
(both IN Senate seats are Class 1 / Class 3, neither up this cycle).

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/indiana-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/in-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Indiana source URLs used:
- `https://www.in.gov/sos/elections/candidate-information/` (landing page)
- `https://www.in.gov/sos/elections/files/2026-General-Candidate-List.7-6-26.pm.xlsx` (2026 General Election Candidate List, XLSX, dated 7-6-26)
- `https://www.in.gov/sos/elections/files/Primary-Candidate-List-3.25.26.xlsx` (2026 Primary Candidate List, XLSX, dated 3.25.26)
- `https://enr.indianavoters.in.gov/site/index.html` (Indiana Election Division's certified May 5, 2026 primary Election Night Reporting portal — Quest Information Systems "First Tuesday" software)
- `https://www.house.gov/representatives` (incumbency cross-check)
- `https://www.in.gov/sos/elections/files/2026-Election-Calendar-Election-Administrators-Edition.FINAL.pdf` (official 2026 Indiana Election Calendar, Election Administrator's Edition — source for the calendar dates in section (e) below)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for an eleventh state.** All 9 IN House districts
render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — 0 mismatches across all 9 contests.

**Indiana is not Civix-vended.** Its Secretary of State Election Division
publishes two XLSX exports (a pre-primary candidate list and a "general
election candidate list"), plus a separate, dynamic primary-results portal
(Quest Information Systems, not Civix) for the certified May 5, 2026 primary
outcome.

**A genuine publication-gap finding, not a technical blocker:** the
"2026 General Election Candidate List" XLSX — nominally the certified
post-primary congressional roster, per the same convention TX/OK/AL/FL used
— carries a disclaimer that the Indiana Recount Commission is actively
engaged in recounts in **three state legislative districts**, and that
federal/statewide/state-legislative/judicial candidate lists on in.gov "will
be incomplete" until that recount is certified. In practice, this file's `US
REPRESENTATIVE` rows (8 total) contained **zero** Democratic or Republican
nominees for any of the 9 House districts — only write-in and Libertarian
filers — even though Indiana's congressional primary was fully decided over
a month before this file's own last-modified date. This is a real data-
freshness gap in the SoS's own export pipeline (recount work for *state
legislative* races evidently holds up the whole batch export, federal
included), not evidence that Indiana's congressional nominees are
undetermined. **The build worked around this** by pulling the certified
primary results directly from the state's own Election Night Reporting
portal (100% of precincts reporting, June 1, 2026 timestamp — a canvassed,
certified count, not partial election-night data) rather than guessing or
inferring nominees.

**No `runoff_pending` rows** — Indiana has no runoff mechanism for
congressional primaries; the May 5 primary decided every contested
nomination by plurality.

## How this was verified

1. Downloaded both XLSX files directly (`curl`, since `.xlsx` binaries can't
   be read through a markdown-conversion fetch tool) and parsed them with
   `openpyxl`. Confirmed the General Candidate List's `US REPRESENTATIVE`
   rows (8 total, all Libertarian/write-in) against the Primary Candidate
   List's full pre-primary field (all contested DEM/REP primary filers, used
   only to sanity-check spelling/existence, never as a nominee source).
2. Confirmed the recount-linked publication gap by reading the XLSX's own
   header disclaimer text (rows 1-2 of the sheet).
3. Drove `enr.indianavoters.in.gov` — a dynamic results app requiring a
   party selection (no static per-race URL) — via browser automation:
   navigated to the May 5, 2026 primary landing page, selected
   "Republicans" then "Democrats" from the party toggle, selected "US
   Representative" under the Federal office category, and read the
   rendered top-two-by-votes table for every district (visible without
   further navigation — Indiana's portal shows all 9 districts on one page
   per party, unlike TX/OK's per-district query requirement). Confirmed
   "100.0% of 5,067 Precincts Reporting" and "Last Updated: Jun 1, 2026
   8:03:54 AM" in the page chrome — i.e., a certified canvass, not
   election-night partial data. Took the top vote-getter per party per
   district as that party's nominee.
4. **Every result matched the shape of a normal, uncomplicated primary** —
   no ties, no district with more than 2 filers requiring closer review of
   who exactly won (the portal's "top two" view was always sufficient since
   only the winner, not the full field, matters for the roster).
5. Cross-checked incumbency against `house.gov`'s official "By State and
   District" member directory (fetched via `curl`, isolated to the
   `id="state-indiana"` table section) — a second independent official
   source, separate from either Indiana source. **Result: a clean case.**
   Every one of Indiana's 9 sitting US Representatives filed for and won
   their own party's primary in the same district they currently hold — no
   redistricting or cross-district-filing complications (unlike TX's Al
   Green or FL's 2026 map). IN-01 (Mrvan) and IN-07 (Carson) are the two
   Democratic-held seats; all 7 others are Republican-held, and the
   Republican primary winner in each is the sitting incumbent.
6. Assembled `IN_HOUSE_ROSTER_2026` (26 rows: 9 districts × 2 major-party
   nominees, plus 4 Libertarian and 4 write-in filers pulled from the
   General Candidate List XLSX) and registered it in
   `scripts/ingest/official-roster.ts`.
7. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   162 test files, 3,166 tests passed (one unrelated pre-existing flaky
   timeout test — `counters-scan-parity.test.ts` — failed on the first full
   run and passed cleanly in isolation on retry; confirmed unrelated to
   this change, no IN/official-roster code touches that file).
8. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
   via a fresh `vercel env pull --environment=preview` (linked via the main
   checkout's existing `.vercel/project.json`), read inline via a single
   `grep`/`cut` command substitution — never `source`d, never echoed —
   confirmed non-empty (147 characters) before use.
9. **Staging import: done, twice, confirmed by direct row-count query both
   times — no ambient/production `DATABASE_URL` ever used.**
   - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state IN` → `upserted=26`.
   - Queried `SELECT count(*) FROM official_roster_candidates WHERE
     state='IN'` directly against staging → `26`.
   - Re-ran the same import command a second time → `upserted=26` again,
     then re-queried the row count → still `26` (idempotent upsert
     confirmed, not a duplicate insert).
10. **End-to-end check against staging, flag on:** called `lookupChallengers`
    directly (the real production code path, not a mock) for all 9 IN
    House districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`, and
    compared the app's literal output candidate-by-candidate against the
    fixture. **Result: 0 mismatches across all 9 districts** — every
    challenger name matched exactly, every row carried
    `rosterProvenance.sourceKind === "official_state_roster"`, and every
    sitting incumbent was correctly excluded from their own district's
    challenger list. The staging DATABASE_URL and `OFFICIAL_ROSTER_ENABLED`
    flag were both set inline for this verification command only, never
    written to a persisted env file, and both scratch verification scripts
    were deleted immediately after use (not committed).
11. Added 8 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — IN narrowing`, `isIncumbentSeekingReelection —
    IN`, `lookupChallengers — IN wiring`), mirroring the existing AZ/HI
    house-only coverage pattern. 130/130 tests pass in that file alone.

## Standing calendar dates (per the plan doc's requirement (e))

Pulled directly from the official 2026 Indiana Election Calendar, Election
Administrator's Edition
(`https://www.in.gov/sos/elections/files/2026-Election-Calendar-Election-Administrators-Edition.FINAL.pdf`):

- **Wednesday, July 15, 2026, by noon** — deadline for a candidate
  nominated at the primary election, a party convention, or by petition of
  nomination to withdraw from the general election ballot for any reason
  (IC 3-8-7-28; IC 3-8-6-13.5). **This is the SAME DAY this fixture was
  transcribed** (2026-07-15) — a withdrawal filed later that day would not
  be captured. A dated re-check card is opened for 2026-07-17 to confirm no
  eleventh-hour withdrawal occurred (see below).
- **Wednesday, July 15, 2026, by noon** — deadline for a write-in candidate
  to withdraw a declaration of intent to be a write-in candidate (IC
  3-8-2-2.7; IC 3-8-2-4). Same date, same re-check.
- **Friday, September 4, 2026, by noon** — deadline for any pending
  challenge of a candidate's qualifications (statewide/state-legislative)
  to terminate; after this date the challenged candidate's name may not be
  removed from the ballot and no replacement may be named, except for a
  candidate disqualified for moving outside the election district or a
  felony conviction (IC 3-8-8-7; IC 3-8-7-28(b) and (c)). Same date: ballot
  content "is considered approved and eligible for printing" even absent
  county-party/school-corporation feedback (IC 3-11-2-2.1) — this is
  Indiana's practical ballot-content-lock date. A dated re-check card is
  opened for 2026-09-05 (see below).
- **Sunday, October 4, 2026** — the early/late "ballot vacancy" procedure
  split date (IC 3-13-2-1; IC 3-13-1-20): any candidate vacancy arising on
  or after this date follows the more restrictive late-vacancy procedure.
  Contextual, no separate re-check card needed (post-dates the September 4
  ballot-lock date this build already tracks).

**Dated re-check cards opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): one for 2026-07-17 (confirm no last-minute
withdrawal before/at the July 15 deadline changed a nominee), one for
2026-09-05 (confirm no qualification-challenge outcome or ballot-content
change before the September 4 lock date affected a nominee).

## Files changed

- `scripts/congressional-rosters/in-official-roster-2026.ts` (new)
- `scripts/ingest/official-roster.ts` (IN import + FIXTURES entry)
- `src/lib/server/officialRoster.test.ts` (IN test coverage)
- `docs/operations/voter-choice-backlog.md` (STATUS flip, done as a separate
  commit before this build per the claim-safely protocol)
- This doc (new)

No database migration — `ballot_status` remains a plain `text` column with
no CHECK constraint (unchanged since migration 0016). No production
mutation. `OFFICIAL_ROSTER_ENABLED` was never set anywhere persistent —
only inline, for the staging verification command in step 10 above.
