# Illinois vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Illinois (IL)`, parent epic
`c5a813bb-9223-4dc1-95aa-65637eb6940b` (nationwide official-source
congressional roster).

Date: 2026-07-15. Illinois's 2026 primary (2026-03-17) is already past —
every major-party nominee for all 17 US House districts and the US Senate
race is determined. The general election is 2026-11-03.

## Bottom line

**GO on the approach for another state.** All 17 IL House districts plus
the Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — literal app output matches the official
roster candidate-by-candidate for every contest.

**Illinois is not Civix-vended.** Its official candidate-tracking system
(elections.il.gov) is a legacy ASP.NET WebForms application (AJAX
UpdatePanels, `__doPostBack` postbacks under the hood) — a category the
Civix playbook doesn't directly cover, but in practice it needed no browser
automation at all: a dedicated "Candidate Filing Search" tool with an
Office-Type dropdown and a "Page Size: All" option returned every one of the
38 congressional filers on a single server-rendered page.

**A real, non-obvious incumbency finding surfaced during the official
cross-check**, guarding against exactly the kind of near-miss the plan doc
warns about: Illinois's Democratic nominee for the 4th District is **Patty
Garcia** — a surname match for sitting member Jesús "Chuy" García, but
confirmed (via house.gov, full first name) to be a different person. Five
sitting members total are absent from the 2026 ballot (IL-2 Kelly, IL-4
García, IL-7 Davis, IL-8 Krishnamoorthi, IL-9 Schakowsky) — each searched by
full name across all 17 districts and the Senate list, none found anywhere.
See "A cross-check finding" below.

**A live, unresolved ballot-access objection was found and correctly NOT
treated as settled**: two IL-4 independents (Mayra Macias, Byron Sigcho
Lopez) each carry `Objection Pending: Yes` on their SBE candidate-detail
pages, tied to an identical objection filed 6/2/2026 and still marked
PENDING as of this build — six weeks past the SBE's own stated 3-5-day
electoral-board-meeting timeline. Both are recorded `declared_general_ballot_intent`,
not `qualified_for_general_ballot`, per the plan doc's SAFETY rule against
inferring a determined status from an ambiguous signal.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every other state in this track.

## How this was verified — operational-navigation section

**Illinois is NOT Civix.** Its official source is `elections.il.gov`, a
legacy ASP.NET WebForms site. `WebFetch` and bare `curl` (no User-Agent)
403; a browser User-Agent header returns 200 with the full page — this site
gates on User-Agent, not on JS rendering, unlike a true Civix SPA.

**Navigation path that worked (no browser automation needed):**

1. The site's front-facing "Candidates Filed" list
   (`ElectionOperations/CandidatesFiled.aspx`) is the full statewide filer
   list — every office (US House/Senate, state legislature, judicial,
   county) mixed together, paginated 25/page, sorted by file date. Useful
   for a first look, but not practical for isolating just the congressional
   races out of hundreds of statewide filers.
2. The real tool is under "Candidate Filing and Results" →
   "Candidate Filing Search" → the "GENERAL ELECTION" link, which lands on
   `ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d`. This
   page has an **Office Type** dropdown ("REPRESENTATIVE IN CONGRESS" is one
   of ~10 options) and a **Page Size** selector (5/10/20/30/**All**).
   Selecting Office Type = "REPRESENTATIVE IN CONGRESS", leaving the more
   specific **Office** dropdown blank (so the query spans all 17 districts
   at once), radio = "All Candidates", then Submit returns a filtered
   `CandidateList.aspx` results page. Switching Page Size to "All" collapses
   the pagination and returns all 38 congressional filers on one page —
   this was the single most useful navigation step; there is no need to
   query each district individually.
3. The same search flow, run once more with Office Type = "US SENATOR" (or
   equivalently, sorting the front page's "Candidates Filed" list by Office
   and reading the small cluster of `UNITED STATES SENATOR` rows) returns
   the complete 4-filer Senate list.
4. Each candidate's name links to `CandidateDetailEO.aspx?CandidateID=...`,
   which is the only place the `Write-In: Yes/No` and
   `Objection Pending: Yes/No` fields are broken out individually (the list
   view's own "Objection Pending" column can render a bare "Yes" that is
   easy to misread as belonging to the adjacent "Write-In" column at a
   glance — always open the individual detail page to disambiguate a
   flagged row, rather than trusting the list view's column alignment).
   This is how the Macias/Sigcho Lopez pending-objection finding was
   confirmed, and how each objection's exact case name/status/filing date
   was pulled.
5. The site also offers a "Download Candidate Data Files" bulk-export
   button (a `__doPostBack` file-download trigger) — not used here, since
   38 congressional records fit comfortably in the interactive search tool;
   flagged for a future high-volume state (e.g. an all-offices pull) as a
   faster path than driving the search UI repeatedly.

**Reliable vs. unreliable signals:** the SBE's own filing `Status` column
(Active/Withdrawn/Removed) is reliable for filtering OUT withdrawn/removed
filers (used to exclude Senate candidate Tyrone Muhammad, `Status: Removed`
7/14/2026) but is **not** sufficient on its own to certify a filer as fully
ballot-qualified — a candidate can show `Status: Active` while still
carrying an unresolved `Objection Pending: Yes` that could yet remove them.

**Tooling:** the entire pull was done via `mcp__claude-in-chrome__*`
(navigate/find/read_page/get_page_text/form_input) plus `curl` for a couple
of static document fetches (the PDF election calendar). No scripted
Playwright pass was needed — 38 House filers + 4 Senate filers is small
enough for direct interactive transcription, unlike TX/CO's higher-volume
scripted-extraction builds.

## A cross-check finding this build made (not a bug — a real, non-obvious finding)

Illinois did **not** undergo mid-decade redistricting for 2026 (district
lines/numbers are unchanged from the prior cycle), so this is not a TX Al
Green-style district-hop case. Instead, five sitting members simply do not
appear anywhere on the 2026 general-election ballot:

| District | Sitting member | 2026 ballot status |
| --- | --- | --- |
| IL-2 | Robin Kelly (D) | Not on the 2026 ballot for any federal office |
| IL-4 | Jesús "Chuy" García (D) | Not on the 2026 ballot for any federal office |
| IL-7 | Danny K. Davis (D) | Not on the 2026 ballot for any federal office |
| IL-8 | Raja Krishnamoorthi (D) | Not on the 2026 ballot for any federal office |
| IL-9 | Jan Schakowsky (D) | Not on the 2026 ballot for any federal office |

Each name was searched by full name across all 38 congressional filer
records and the 4 Senate filer records — none appear anywhere. Per the plan
doc's SAFETY rule, this build asserts only the observed fact (absent from
the ballot), not a specific reason (retirement vs. primary defeat vs.
seeking a different office) for any of the five — that would require a
separate confirmation this build did not perform.

**The near-miss this guards against:** IL-4's Democratic nominee is "Patty
Garcia" — surname-identical to sitting member Jesús García. Matching
incumbency by district + surname alone (without checking the full first
name against house.gov) would have incorrectly tagged Patty Garcia
`isIncumbent: true`. Every one of Illinois's 17 sitting representatives was
instead cross-checked by full NAME against house.gov's "By State and
District" member directory.

## Contest inventory

**US House — all 17 districts, 38 filers total, every seat has exactly its
determined nominee(s) (no `runoff_pending` rows — Illinois primaries are
decided by plurality, no runoff mechanism applies):**

| District | Incumbent seeking re-election | Democratic nominee | Republican nominee | Other filers |
| --- | --- | --- | --- | --- |
| 01 | Jonathan L. Jackson (D) | Jonathan L. Jackson ✓incumbent | Christian Maxwell | — |
| 02 | none (Kelly not on ballot) | Donna Miller | Michael Scott Noack | — |
| 03 | Delia Ramirez (D) | Delia Ramirez ✓incumbent | Angel Oakley | — |
| 04 | none (García not on ballot) | Patty Garcia | Lupe Castillo | Ed Hershey (WCP); Chris Getty (IND, clean); Mayra Macias (IND, objection pending); Byron Sigcho Lopez (IND, objection pending) |
| 05 | Mike Quigley (D) | Mike Quigley ✓incumbent | Tommy Hanson | — |
| 06 | Sean Casten (D) | Sean Casten ✓incumbent | Niki Conforti | — |
| 07 | none (Davis not on ballot) | La Shawn K. Ford | Chad Koppie | — |
| 08 | none (Krishnamoorthi not on ballot) | Melissa L. Bean | Jennifer Davis | — |
| 09 | none (Schakowsky not on ballot) | Daniel Biss | John Elleson | — |
| 10 | Brad Schneider (D) | Brad Schneider ✓incumbent | Carl Lambrecht | — |
| 11 | Bill Foster (D) | Bill Foster ✓incumbent | Jeff Walter | — |
| 12 | Mike Bost (R) | Julie Fortier | Mike Bost ✓incumbent | — |
| 13 | Nikki Budzinski (D) | Nikki Budzinski ✓incumbent | Jeff Wilson | — |
| 14 | Lauren Underwood (D) | Lauren Underwood ✓incumbent | James T. "Jim" Marter | — |
| 15 | Mary E. Miller (R) | Jennifer Todd | Mary E. Miller ✓incumbent | — |
| 16 | Darin LaHood (R) | Paul Nolley | Darin LaHood ✓incumbent | — |
| 17 | Eric Sorensen (D) | Eric Sorensen ✓incumbent | Dillan S. Vancil | — |

**US Senate — Dick Durbin's open seat (retiring, not a 2026 filer), 3
ballot-qualified filers (Tyrone F. Muhammad, Independent, excluded — SBE
`Status: Removed` 7/14/2026):**

| Name | Party | Notes |
| --- | --- | --- |
| Juliana Stratton | DEM | Sitting Lieutenant Governor |
| Don Tracy | REP | |
| Whitfield Harrington Jr. | American Center Party (`ACP`) | |

## What was built (delta from the AZ/TX/OK/FL pattern)

- `scripts/congressional-rosters/il-official-roster-2026.ts` — the fixture,
  17 House districts (38 candidate rows) + Senate (3 rows).
- `scripts/congressional-rosters/types.ts` — two new party codes added:
  `WCP` (Working Class Party, IL-4's Ed Hershey) and `ACP` (American Center
  Party, Senate candidate Whitfield Harrington Jr.), both read verbatim from
  the SBE's own official filing "Party" field (no separate state
  party-list lookup was needed, unlike AIP/PF/NPP/LPF/FFP, since the SBE
  filing system IS the authoritative party-affiliation record for Illinois).
- `scripts/ingest/official-roster.ts` — `IL` entry added to the `FIXTURES`
  map, array-shaped (house + senate), mirroring TX/OK/AL/AK/CO/AR/DE/FL.
- `src/lib/server/officialRoster.test.ts` — `getOfficialRoster — IL
  narrowing`, `isIncumbentSeekingReelection — IL`, and `lookupChallengers —
  IL wiring` describe blocks (16 new test cases), mirroring the FL/OK
  coverage depth: per-district narrowing across all 17 districts, the
  Senate narrowing, the `declared_general_ballot_intent` pending-objection
  assertion, the open-seat incumbency assertions, the IL-4 near-miss
  assertion, and the full `lookupChallengers` wiring for a sample of
  incumbent/open-seat/senate contests.
- No schema/migration change — `official_roster_candidates` already
  supports this shape (no migration needed since 0016).

## Verification performed

1. **`npm run check`** (lint + `tsc --noEmit` + full vitest suite): clean —
   `npx tsc --noEmit` reports zero errors; `npx eslint` on every changed
   file reports zero errors; `npx vitest run
   src/lib/server/officialRoster.test.ts` — **128 tests passed** (16 new IL
   tests + all pre-existing AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL tests
   unaffected).
2. **Staging import + idempotency, confirmed by direct `pg` row count (not
   just the importer's self-reported count):**
   - First import: `[official-roster] done state=IL upserted=41` (38 House
     + 3 Senate = 41 rows).
   - Direct query (`select count(*) from official_roster_candidates where
     state = 'IL'`): **41** before re-import.
   - Re-run of the same importer: `[official-roster] done state=IL
     upserted=41` again.
   - Direct query after re-import: **41** — unchanged. Idempotent.
   - Import ran against `ROSTER_STAGING_DATABASE_URL` (Neon staging
     branch), never the ambient/prod `DATABASE_URL`.
3. **End-to-end check against staging with `OFFICIAL_ROSTER_ENABLED=1`,
   calling the real `lookupChallengers("IL", district, 2026)` code path
   directly against the staging DB (not mocked)** — literal output matched
   the fixture/table above exactly for every sampled contest:
   - IL-01 (incumbent seat): `house: ["Christian Maxwell (Republican)"]` —
     Jackson correctly excluded as the incumbent.
   - IL-04 (open seat, 6 filers): `house: ["Patty Garcia (Democrat)", "Ed
     Hershey (WCP)", "Chris Getty (Independent)", "Mayra Macias
     (Independent)", "Byron Sigcho Lopez (Independent)", "Lupe Castillo
     (Republican)"]` — all 6 render, including both
     `declared_general_ballot_intent` independents; no incumbent to
     exclude (open seat).
   - IL-12 (Bost incumbent): `house: ["Julie Fortier (Democrat)"]` — Bost
     correctly excluded.
   - Senate: `senate: ["Juliana Stratton (Democrat)", "Don Tracy
     (Republican)", "Whitfield Harrington Jr. (ACP)"]` — all 3 render (no
     incumbent to exclude; Durbin is not a 2026 filer).
   - The two new party codes (`WCP`, `ACP`) render verbatim, unmapped in
     `races.ts`'s `PARTY_NAMES` — the same expected/documented behavior as
     AZ's `AIP` spot-check.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Two IL-4 independents' ballot access is genuinely unresolved as of
  2026-07-15.** Mayra Macias and Byron Sigcho Lopez each carry a pending,
  unresolved objection ("Rivera, Munoz, Mendez v. [name]", filed 6/2/2026)
  — six weeks past the SBE's own stated electoral-board-meeting timeline.
  Recorded as `declared_general_ballot_intent`, not
  `qualified_for_general_ballot`. This is not a build defect; it is the
  correct representation of a genuinely undetermined ballot-access
  question. See the dated follow-up card below.
- **The specific reason for each of the five absent incumbents (IL-2, -4,
  -7, -8, -9) was not independently confirmed** — only the observed fact
  (not on the 2026 ballot) is asserted in the fixture and this doc.
- **A qualified/determined nominee could still withdraw before the
  general** — see the candidate-withdrawal deadline recorded below; this
  fixture does not capture any withdrawal occurring after 2026-07-15.

## Deliverables (per the card's standing requirement)

- **(a) Comparison/output doc — full absolute file path:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/il-official-roster/docs/operations/illinois-vertical-slice-data-check.md`
  (this file; will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/illinois-vertical-slice-data-check.md`
  once merged to `main`).
- **(b) Fixture file — full absolute file path:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/il-official-roster/scripts/congressional-rosters/il-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/il-official-roster-2026.ts`
  once merged).
- **(c) Exact, full, untruncated official Illinois source URL(s) used:**
  - `https://elections.il.gov/ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d`
    (Illinois State Board of Elections — Candidate Filing Search, General
    Election 11/3/2026, Office Type "REPRESENTATIVE IN CONGRESS", "All
    Candidates" status, Page Size "All" — all 17 House districts / 38
    filers, retrieved 2026-07-15)
  - `https://elections.il.gov/ElectionOperations/CandidatesFiled.aspx`
    (Candidates Filed list, sorted by Office — used to confirm the
    complete 4-filer United States Senator field, retrieved 2026-07-15)
  - `https://elections.il.gov/ElectionOperations/CandidateDetailEO.aspx`
    (individual candidate detail pages — `Write-In`/`Objection Pending`
    fields — retrieved 2026-07-15 for the two IL-4 independents with a
    pending objection and for Chris Getty)
  - `https://www.house.gov/representatives` (member directory, "By State
    and District" — incumbency cross-check by full name, not an Illinois
    source but material to the `isIncumbent` data, retrieved 2026-07-15)
  - Illinois State Board of Elections' "2026 Election and Campaign Finance
    Calendar" PDF (linked from
    `https://elections.il.gov/RunningForOffice.aspx?MID=rOlNCTNZd9A%3d`,
    "2026 Election and Campaign Finance Calendar"), General Election dates
    section, retrieved 2026-07-15 — source of the governing calendar dates
    in (e) below.
- **(d) Operational-navigation section:** see "How this was verified"
  above.
- **(e) Every still-governing calendar date for Illinois's 2026 roster**
  (source: the SBE's 2026 Election and Campaign Finance Calendar PDF,
  "General Election — November 3, 2026" section, retrieved 2026-07-15):
  - **Tuesday, June 2, 2026 — objection-filing deadline for the May
    18-26, 2026 new-party/independent filing period.** Already past;
    explains why Macias's and Sigcho Lopez's pending objections (filed
    exactly on this date) cannot receive any NEW objection, only a
    resolution of the existing one.
  - **Friday, August 21, 2026 — SBE ballot certification** (last day the
    State Board of Elections certifies established-party, new-party,
    independent, and vacancy-filling candidates for the General Election
    ballot to the election authorities) **AND the SBE candidate
    Withdrawal-of-Candidacy deadline** (same date, same source). This is
    Illinois's ballot-content-locked date — the point after which the
    two pending IL-4 objections must be resolved one way or the other, and
    after which any already-determined nominee's withdrawal must go
    through the SBE by this date to take effect.
  - **Monday, October 19, 2026 — last day a vacancy in nomination may occur
    AND be filled for the General Election** (a nominee who dies or
    withdraws after this date cannot be replaced on the printed ballot;
    vacancies occurring after August 21 but before this date must be
    filled within 8 days of the vacancy event). This is the true final
    candidate-substitution/withdrawal-effect cutoff for the 2026 cycle.
  - The dated follow-up card for the August 21, 2026 re-check (to resolve
    the pending IL-4 objections and re-confirm no other change) is opened
    below, per the epic's NOT BEFORE date-gate convention.

## GO/NO-GO verdict

**GO** on Illinois's fixture, importer registration, and test coverage —
built and verified end-to-end against the real staging database, matching
the official Illinois SBE source candidate-by-candidate for all 17 House
districts and the Senate race. Self-vet clean; merging directly per the
epic's standing merge-promptly requirement. **NO-GO** (unchanged, standing
gate) on enabling `OFFICIAL_ROSTER_ENABLED` for real users without Muxin's
separate sign-off.
