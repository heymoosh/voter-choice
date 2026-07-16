# Missouri vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Missouri (MO)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. Missouri's 2026 primary (August 4, 2026) has **not yet
occurred** as of this fixture's retrieval — filing closed March 31, 2026 and
the primary ballot was certified/locked May 26, 2026, so the candidate FIELD
is final, but the general-election NOMINEE per district/party is not yet
determined. The general election is November 3, 2026. Missouri has no 2026
US Senate contest — Josh Hawley (Class 1) was re-elected November 2024 (term
to January 2031, next up 2030); Eric Schmitt (Class 3) was elected 2022
(next up 2028). Neither Missouri Senate seat is on the 2026 ballot.

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/missouri-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/mo-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Missouri source URLs used:
- `https://s1.sos.mo.gov/candidatesonweb/DisplayCandidatesPlacement.aspx?ElectionCode=750006905` (Missouri SOS "CandidatesOnWeb" — cumulative certified candidate list with ballot placement, 2026 Primary Election)
- `https://s1.sos.mo.gov/candidatesonweb/CandidatesRemoved.aspx?ElectionCode=750006905` (same system — withdrawn/removed candidates)
- `https://www.sos.mo.gov/elections/candidates` (candidate-filing hub)
- `https://www.sos.mo.gov/elections/calendar/2026cal` (2026 Missouri election calendar)
- `https://www.house.gov/representatives` (incumbency cross-check, "By State and District" tab)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for a twelfth state.** All 8 MO House districts render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — 0 mismatches across all 8 contests.

**Missouri is NOT Civix-vended.** Its Secretary of State runs its own
in-house "CandidatesOnWeb" system — a database-backed ASP.NET application
(`.aspx` pages, query-string driven by `ElectionCode`/`OfficeCode`) — dynamic
HTML tables, no XLSX/JSON export. Unlike TX's Civix portal, this source
rendered cleanly through a plain fetch tool; no browser automation was
needed for the SOS pages themselves (house.gov's member directory did
require it — see below).

**This is a genuinely different case from every prior state built so far:
a PRIMARY-STAGE roster, not a post-primary or certified-nominee one.**
Missouri's candidate filing period closed March 31, 2026 and the primary
ballot was certified/locked May 26, 2026 — so the field of filers per
district is final and will not change — but the August 4, 2026 primary
itself has not yet been held. Every row in this fixture is therefore
`qualified_for_primary_ballot`, mirroring Arizona's original primary-stage
build (before its own since-passed July 21 primary), not Indiana's
post-primary `qualified_for_general_ballot` pattern. Missouri has no
congressional runoff system, so no `runoff_pending` rows exist either — the
primary decides every contested nomination by plurality on August 4.

**A genuine open-seat finding:** Missouri's 6th District's currently sitting
representative, Sam Graves (R), **withdrew his 2026 candidacy** (per the
SOS's own withdrawn-candidates list, dated 3/27/2026) and does not appear
anywhere in the active District 6 filer list. No candidate in District 6 is
recorded `isIncumbent: true` — District 6 is a genuine open seat for 2026,
not an omission.

**District 1 is a notable primary rematch:** incumbent Wesley Bell (D), who
defeated Cori Bush in the 2024 Democratic primary, faces a comeback bid from
Bush herself among 5 Democratic filers in the 2026 primary.

**Candidate-count cross-check:** the SOS portal's own summary table reports
61 total "United States Representative" filers (28 Republican / 25
Democratic / 8 Libertarian) across all 8 districts — this fixture's 61 rows
match that total exactly.

**One unresolved same-name observation, documented not resolved:** a
"Nathanael Schultz (R)" is listed as withdrawn from **District 1** (3/31/2026)
on the SOS's withdrawn-candidates list, while a same-named "Nathanael
Schultz (R)" remains an **active** District 6 filer on the placement list.
The SOS's own active/withdrawn data is internally consistent (neither list
contradicts the other — District 1's active roster correctly excludes him,
District 6's correctly includes him), so this was recorded as observed —
either one person who re-filed in a different district, or two distinct
people — rather than resolved through further research.

## How this was verified

1. Fetched the SOS "CandidatesOnWeb" cumulative placement page directly via
   a plain fetch tool (renders cleanly as an ASP.NET-backed HTML table, no
   403/JS-wall issue). Transcribed all 61 candidates across the 8 districts,
   with party and district for each.
2. Cross-checked the transcription's total (61) against the source page's
   own summary/totals table (61: 28R/25D/8L) — exact match.
3. Fetched the SOS's `CandidatesRemoved.aspx` withdrawn-candidates page with
   a strict prompt requiring VERBATIM office-column text (not paraphrased),
   to avoid conflating a state-legislative withdrawal with a federal one.
   Confirmed 6 US House withdrawals by exact office label ("U.S.
   REPRESENTATIVE - DISTRICT N"): Nathanael Schultz (R, D1, 3/31), Sean
   Smith (R, D5, 3/31), Sam Graves (R, D6, 3/27), Mike Conner (D, D3, 4/8),
   Clayton Christopher Harbison (D, D8, 5/15), Nick Vivio (D, D2, 5/18).
   Confirmed none of these six names appear in the active placement list
   fetched the same session — the source's own active roster already
   excludes withdrawn filers.
4. **house.gov 403s on a plain fetch** (same pattern as noted in prior
   builds for authenticated/bot-walled federal sites) — used
   `claude-in-chrome` browser automation instead: navigated to
   `house.gov/representatives`, clicked the "By State and District" tab,
   located and scrolled to the Missouri section (lazy-loads on scroll,
   same behavior as the Indiana build's `house.gov` cross-check), and read
   the rendered table directly via screenshot. Confirmed all 8 districts:
   Bell (D-01), Wagner (R-02), Onder (R-03), Alford (R-04), Cleaver (D-05),
   Graves (R-06), Burlison (R-07), Smith (R-08).
5. Cross-referenced each sitting incumbent's name against the active filer
   list per district. 7 of 8 incumbents are filed for re-election in their
   own district (Bell, Wagner, Onder, Alford, Cleaver, Burlison, Smith).
   District 6's incumbent, Sam Graves, is NOT among the active filers —
   matches the withdrawn-candidates finding in step 3, confirming District
   6 is a genuine open seat rather than a transcription gap.
6. Independently cross-checked the two most notable findings (Bell/Bush
   rematch in D1, Graves's absence from D6) via a Wikipedia fetch (partial
   confirmation — D1 incumbent/re-election status confirmed, article
   truncated before D2-D8 detail) as a secondary, non-primary source; the
   SOS's own active + withdrawn lists remained the primary evidentiary
   basis per the plan doc's SAFETY rule (official-source reads only,
   third-party sources for comparison/spot-check only).
7. Searched for Missouri's Libertarian Party nomination mechanism (primary
   vs. convention) to determine the correct `ballotStatus` for the 8
   Libertarian filers — confirmed via a county election authority's own
   notice ("August 4, 2026 Libertarian Party Ballot") that Missouri's
   Libertarian Party holds its own primary on the SAME August 4, 2026 date
   as the major parties, not a convention nomination (unlike Indiana's
   Libertarian rows). All 61 rows, including the 8 Libertarian filers, are
   therefore uniformly `qualified_for_primary_ballot`.
8. Assembled `MO_HOUSE_ROSTER_2026` (61 rows across all 8 districts) and
   registered it in `scripts/ingest/official-roster.ts`.
9. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   162 test files; 3,187/3,193 tests passed on the first full run (6
   failures were two pre-existing, unrelated issues — a Playwright headless
   browser sandbox-permission failure in `scripts/design/capture-shared.test.ts`
   and a flaky 5s timeout in `src/lib/server/counters-scan-parity.test.ts` —
   both confirmed unrelated to this change and passing cleanly in isolation
   with the sandbox restriction lifted; no MO/official-roster code touches
   either file). `officialRoster.test.ts` alone: 172/172 pass.
10. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
    via a fresh `vercel env pull --environment=preview` (linked via the main
    checkout's existing `.vercel/project.json`), read inline via a single
    `grep`/`cut` command substitution — never `source`d, never echoed —
    confirmed non-empty (147 characters) and confirmed the host
    (`ep-aged-cake-aqhinavd...`) to be the staging branch, not production,
    before use.
11. **Staging import: done, twice, confirmed by direct row-count query both
    times — no ambient/production `DATABASE_URL` ever used.**
    - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
      --state MO` → `upserted=61`.
    - Queried `SELECT count(*) FROM official_roster_candidates WHERE
      state='MO'` directly against staging → `61`.
    - Re-ran the same import command a second time → `upserted=61` again,
      then re-queried the row count → still `61` (idempotent upsert
      confirmed, not a duplicate insert).
12. **End-to-end check against staging, flag on:** called `lookupChallengers`
    directly (the real production code path, not a mock) for all 8 MO
    House districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`, and
    compared the app's literal output candidate-by-candidate against the
    fixture. **Result: 0 mismatches across all 8 districts** — every
    challenger name matched exactly, every row carried
    `rosterProvenance.sourceKind === "official_state_roster"`, every sitting
    incumbent (7 of 8 districts) was correctly excluded from their own
    district's challenger list, and District 6 correctly excluded no one
    (open seat, all 9 filers render as challengers). The staging
    DATABASE_URL and `OFFICIAL_ROSTER_ENABLED` flag were both set inline
    for this verification command only, never written to a persisted env
    file, and both scratch verification scripts were deleted immediately
    after use (not committed).
13. Added 10 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — MO narrowing`, `isIncumbentSeekingReelection —
    MO`, `lookupChallengers — MO wiring`), mirroring the existing IN
    house-only coverage pattern, including explicit open-seat (D6) and
    primary-stage-ballotStatus assertions.

## Operational-navigation section (per plan doc requirement (d))

Missouri's official source is `s1.sos.mo.gov/candidatesonweb/` — an in-house
ASP.NET application, NOT Civix. The Civix playbook in the plan doc does not
apply here.

- **Landing/navigation:** `DisplayCandidatesPlacement.aspx` accepts an
  `ElectionCode` query parameter (`750006905` for the 2026 primary) and
  returns a single cumulative page listing every office's candidates,
  grouped by office then district then party — unlike TX/OK's Civix portals,
  there is no per-office/per-district query requirement; one fetch covers
  all 8 US House districts at once.
- **Reliable signal:** the page's own summary/totals table (candidate counts
  by office and party) is a strong, independent cross-check against a hand
  transcription — used here to confirm 61/61 with an exact party-breakdown
  match (28R/25D/8L), catching any transcription miscount before it reached
  the fixture.
- **Withdrawn candidates are a SEPARATE page** (`CandidatesRemoved.aspx`,
  same `ElectionCode` parameter) — the cumulative placement page already
  excludes withdrawn filers, but cross-checking the removed-candidates page
  is still valuable to positively confirm an absence is a withdrawal (not a
  transcription miss) and to catch the office-column ambiguity described
  below.
- **Unreliable-if-paraphrased signal:** a first pass asking a fetch tool to
  summarize the withdrawn-candidates table paraphrased the office column
  (e.g. rendering "U.S. REPRESENTATIVE - DISTRICT 1" simply as "District
  1"), which risked conflating a state-legislative withdrawal with a
  federal one given the same page lists both. Re-fetching with an explicit
  instruction to report the office column VERBATIM resolved this — a
  general navigation lesson for any hand-transcription pass against a
  mixed-office table: always require verbatim column text for anything
  used to positively confirm or exclude a row, never a paraphrase.
- **house.gov requires browser automation, not a plain fetch** — it 403s a
  plain WebFetch (same as Indiana's build). Its "By State and District" tab
  content lazy-loads on scroll (same as noted previously) — `find` +
  `scroll_to` the state's own heading element, then read the rendered table
  via screenshot rather than `get_page_text` (which only returns the
  page's static, non-lazy-loaded article shell).
- **Tooling used:** a plain fetch tool for all `s1.sos.mo.gov` and
  `www.sos.mo.gov` pages (rendered cleanly, no browser automation needed);
  `claude-in-chrome` browser automation only for `house.gov`; a general web
  search for the two facts not published as a structured table anywhere
  (Missouri's 2026 Senate-seat status, confirmed via the 2024 general
  election results — Hawley re-elected, next up 2030 — rather than assumed
  from the task's own premise; and Missouri's Libertarian Party
  primary-vs-convention nomination mechanism, confirmed via a county
  election authority's own August 4, 2026 Libertarian ballot notice).

## Standing calendar dates (per the plan doc's requirement (e))

Pulled from the Missouri SOS's official 2026 election calendar
(`https://www.sos.mo.gov/elections/calendar/2026cal`) and RSMo Chapter 115:

- **Tuesday, March 31, 2026, 5:00 p.m.** — candidate filing closed for the
  primary. Already passed; the candidate field is final (no new filers
  possible for 2026).
- **Tuesday, May 19, 2026** (the eleventh Tuesday before the August 4
  primary, per RSMo 115.359(1)) — ordinary primary candidate-withdrawal
  deadline. Already passed as of this fixture's transcription (2026-07-15).
  A court-ordered late withdrawal remains possible under RSMo 115.359(2)
  "no later than 5:00 p.m. on the sixth Tuesday before the election" —
  **Tuesday, June 23, 2026** — which has ALSO already passed. Both the
  ordinary and late-withdrawal windows for the primary are closed; no
  further primary-ballot withdrawal is possible before August 4, 2026.
- **Tuesday, May 26, 2026** — per the SOS election calendar, the primary
  ballot content certification deadline (the point at which local election
  authorities finalize/lock the primary ballot for printing). Already
  passed; consistent with the withdrawal-window analysis above — the
  primary ballot as transcribed here is fully locked.
- **Tuesday, August 4, 2026** — Missouri's primary election. This is the
  date that determines each party's nominee per district — the single
  event this fixture's `MO_STAGE = "primary"` / `qualified_for_primary_ballot`
  rows are all pending on. **This is the trigger for the NOT BEFORE
  follow-up card opened below.**
- **Tuesday, August 18, 2026** (the eleventh Tuesday before the November 3
  general election, per RSMo 115.359(1)) — general-election
  candidate-withdrawal deadline for whichever nominees the August 4 primary
  produces. Not yet relevant until nominees exist; recorded here as the
  next governing date after the primary.
- **Tuesday, August 25, 2026** — per the SOS election calendar, the general
  ballot content certification deadline. Also the SOS calendar's stated
  general-election candidate-filing-period certification date (the same
  calendar entry appears to cover both; not independently disambiguated
  here — recorded as the conservative single date to gate the re-check on,
  well past the statutory "two weeks after receiving all abstracts" floor
  for the state canvassers' primary-results announcement under RSMo
  115.511(1)).
- **Tuesday, November 3, 2026** — Missouri's general election.

**Dated re-check card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): "[P2] Re-check official roster: Missouri (MO) —
after primary certification", `NOT BEFORE: 2026-08-25` — see
`docs/operations/voter-choice-backlog.md`.

## Files changed

- `scripts/congressional-rosters/mo-official-roster-2026.ts` (new)
- `scripts/ingest/official-roster.ts` (MO import + FIXTURES entry)
- `src/lib/server/officialRoster.test.ts` (MO test coverage)
- `docs/operations/voter-choice-backlog.md` (STATUS flip, done as a separate
  commit before this build per the claim-safely protocol; plus this build's
  new MO re-check follow-up card)
- This doc (new)

No database migration — `ballot_status` remains a plain `text` column with
no CHECK constraint (unchanged since migration 0016). No production
mutation. `OFFICIAL_ROSTER_ENABLED` was never set anywhere persistent —
only inline, for the staging verification command in step 12 above.
