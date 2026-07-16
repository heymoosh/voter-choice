# Utah vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Utah (UT)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16. Utah's 2026 primary (June 23, 2026) has **already
occurred** and is fully decided (all 3 contested primaries at 100% locality
reporting). Utah's 4th District had no primary at all — both parties'
nominees were decided outright at their party conventions. Utah has no 2026
US Senate contest — Mike Lee's seat (Class 3) was last elected 2022, next up
2028; confirmed both by the 2028-class fact itself and by vote.utah.gov's
own 2026 Federal Offices candidate-filing table, which lists only "U.S.
House District 1-4" rows and zero "U.S. Senate" rows.

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/utah-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ut-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Utah source URLs used:
- `https://vote.utah.gov/2026-candidate-filings/` (Utah Lieutenant Governor's Office / Elections Office, "2026 Candidate Filings" — Federal Offices table, last updated 7/6/2026 4 PM per the page, retrieved 2026-07-16)
- `https://vote.utah.gov/wp-content/uploads/2026/01/Candidate-Filing-2026.xlsx` (same data, downloadable spreadsheet, linked from the page above)
- `https://electionresults.utah.gov/results/public/Utah/elections/Primary06232026` (Utah 2026 Primary Election official results dashboard — UT-01 DEM, UT-02 REP, UT-03 REP US House primary results, retrieved 2026-07-16)
- `https://vote.utah.gov/wp-content/uploads/2026/01/2026-Utah-Election-Calendar.pdf` (2026 Utah Election Calendar for Voters & Candidates, State of Utah Office of the Lieutenant Governor, retrieved 2026-07-16)
- `https://vote.utah.gov/more-information-on-utah-political-parties/` (Utah's 8 officially recognized political parties for 2026, retrieved 2026-07-16)
- `https://www.house.gov/representatives` ("By State and District" tab, Utah section — incumbency cross-check, retrieved 2026-07-16 via browser automation)
- `https://le.utah.gov/xcode/Title20A/Chapter9/20A-9-S202.html` (Utah Code § 20A-9-202, candidate declaration/withdrawal provisions, retrieved 2026-07-16)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for a twentieth-plus state.** All 4 UT House districts
render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — 0 mismatches across all 4 contests.

**Utah is NOT Civix-vended.** The Lieutenant Governor's Office / Elections
Office (vote.utah.gov) runs its own in-house candidate-filing system (a
plain server-rendered page with an XLSX export) and a separate JS-rendered
results dashboard (electionresults.utah.gov) for primary/general results.
Both rendered cleanly enough for a plain fetch/curl (filing page, calendar
PDF) or light browser automation (results dashboard, house.gov cross-check)
— no 403/bot-wall issues encountered anywhere on Utah's own sources.

**This is a genuinely novel case among the states built so far: a
COURT-ORDERED MID-DECADE REDISTRICTING changed all 4 Utah district
boundaries for 2026.** A Utah judge struck down the legislature's map in
August 2025 for violating a voter-approved 2018 anti-gerrymandering ballot
measure; the court-imposed replacement map (upheld on appeal) creates one
new Salt Lake County-centered district likely to elect a Democrat. As a
direct consequence, **3 of Utah's 4 sitting US Representatives are running
in a DIFFERENT district number than the one they currently hold** — a
materially different situation from an ordinary "incumbent lost
renomination, seat now open" case seen in prior states (KY's Massie, CO's
DeGette). `isIncumbent` in this fixture is recorded per each candidate's
ACTUAL 2026 race, cross-checked against house.gov by NAME (never by
matching an old district number to a new one, which would be actively
wrong given the full remap) — the same resolution method already used for
CO/GA/FL's own redistricting-driven incumbency corrections.

**Utah's 2026 primary (June 23) is already held and fully decided.** All 3
contested congressional primaries showed 100% of localities reporting at
transcription time. Utah's own official election calendar's primary-canvass
window (June 29 – July 6, 2026) had already closed by this fixture's
retrieval date (2026-07-16), even though electionresults.utah.gov's page
banner still read "UNOFFICIAL RESULTS" — this fixture treats the primary
winners as determined nominees, consistent with the existing
`OfficialBallotStatus` docblock precedent (a certified, fully-reported
election-night result counts as determined even absent a separate later
"certification" document).

**District 4 needed no primary at all** — both parties' 2026 nominees
(Mike Kennedy, R; Jonny Larsen, D) were decided outright at their party
conventions, confirmed by the total absence of any "Primary" status row for
District 4 on vote.utah.gov's candidate-filing table.

## District-by-district candidate comparison

| District | Name | Party | Incumbent | Status | Source basis |
|---|---|---|---|---|---|
| UT-01 | Riley Owen | REP | No | qualified_for_general_ballot | Sole convention nominee (Election Candidate) |
| UT-01 | Ben McAdams | DEM | No | qualified_for_general_ballot | Primary winner, 51.90% (29,737 votes) over Liban Mohamed, Nate Blouin, Michael Farrell |
| UT-01 | Elias Henry Montgomery | IND | No | qualified_for_general_ballot | Unaffiliated signature-path filer (Election Candidate) |
| UT-01 | Jesse West | LIB | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |
| UT-02 | Blake D. Moore | REP | **Yes** | qualified_for_general_ballot | Primary winner, 56.67% (52,673 votes) over Karianne Lisonbee. Current sitting Rep for OLD Utah-01, running in NEW Utah-02 |
| UT-02 | Peter Crosby | DEM | No | qualified_for_general_ballot | Sole convention nominee to clear delegate threshold |
| UT-02 | Daniel Cottam | LIB | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |
| UT-02 | Carlton E. Bowen | UIAP (Independent American Party) | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |
| UT-02 | Robert M. Moesinger | IND | No | qualified_for_general_ballot | Unaffiliated signature-path filer (Election Candidate) |
| UT-03 | Celeste Maloy | REP | **Yes** | qualified_for_general_ballot | Primary winner, 65.71% (67,135 votes) over Phil Lyman. Current sitting Rep for OLD Utah-02, running in NEW Utah-03 |
| UT-03 | Kent S. Udell | DEM | No | qualified_for_general_ballot | Sole convention nominee |
| UT-03 | Cassie Easley | CST (Constitution) | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |
| UT-03 | Adonis Hooslyn | IND | No | qualified_for_general_ballot | Unaffiliated signature-path filer (Election Candidate) |
| UT-03 | Ayden Scott | IND | No | qualified_for_general_ballot | Second, separate unaffiliated signature-path filer |
| UT-03 | Michael R. Stoddard | LIB | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |
| UT-04 | Mike Kennedy | REP | **Yes** | qualified_for_general_ballot | Sole convention nominee, no primary needed. Current sitting Rep for OLD Utah-03, running in NEW Utah-04 |
| UT-04 | Jonny Larsen | DEM | No | qualified_for_general_ballot | Sole convention nominee |
| UT-04 | Steven Burt | IND | No | qualified_for_general_ballot | Unaffiliated signature-path filer (Election Candidate) |
| UT-04 | Taylor Wright | LIB | No | qualified_for_general_ballot | Sole party filer (Election Candidate) |

**Burgess Owens** (REP), the current sitting Representative for Utah's OLD
4th District per house.gov, does **not** appear anywhere in Utah's 2026
candidate-filing table for any office — a confirmed genuine retirement, not
a transcription gap. He is not the incumbent of NEW District 4 (Kennedy is,
per the redistricting move above), nor a candidate anywhere else on the
2026 ballot.

**Candidate-count cross-check:** 19 candidates total across all 4 districts
(4 + 5 + 6 + 4), matching the full transcription of vote.utah.gov's
Federal Offices table filtered to `Election Candidate` (already-qualified)
and confirmed-primary-winner rows only — every `Out in Convention`,
`Withdrew`, and `Disqualified` row was excluded, consistent with how prior
post-primary/post-convention builds (NE, KY) only carry determined
nominees forward, not eliminated filers.

## How this was verified

1. Fetched `vote.utah.gov/2026-candidate-filings/` live via
   `mcp__claude-in-chrome` browser automation (`get_page_text` — rendered
   cleanly, no 403/JS-wall issue) and transcribed the full "Federal
   Offices" table: every US House District 1-4 candidate with party and
   filing status (`Election Candidate`, `Out in Convention`, `Primary`,
   `Withdrew`, `Disqualified`).
2. Fetched `electionresults.utah.gov/results/public/Utah/elections/Primary06232026`
   via browser automation (a JS-rendered results dashboard — `get_page_text`
   only returns the first visible race card, so subsequent races were read
   via scroll + screenshot) and read the 3 contested congressional primary
   results directly: UT-01 DEM (Ben McAdams 51.90%/29,737 over 3
   challengers), UT-02 REP (Blake D. Moore 56.67%/52,673 over Karianne
   Lisonbee), UT-03 REP (Celeste Maloy 65.71%/67,135 over Phil Lyman). All
   3 races showed 100% of localities reporting.
3. Cross-checked District 4's lack of any "Primary" filing-status row to
   confirm both parties' nominees (Kennedy R, Larsen D) were decided
   outright at convention, with no primary held.
4. Researched Utah's 2026 US Senate status independently (WebSearch, not
   just trusted from the task's own framing) — confirmed Mike Lee's Class 3
   seat runs to January 2029, next up 2028, and separately confirmed via
   vote.utah.gov's own Federal Offices table containing zero "U.S. Senate"
   rows for 2026.
5. Researched Utah's court-ordered congressional redistricting
   independently (WebSearch/news sources for context on WHY 3 sitting
   members were running in new district numbers), then confirmed the
   underlying fact set from Utah's own official sources (the candidate-
   filing table + the primary-results dashboard) and an independent second
   source, not from the news coverage itself.
6. **house.gov 403s a plain fetch** (same pattern as every prior state's
   build) — used `claude-in-chrome` browser automation instead: navigated
   to `house.gov/representatives`, clicked the "By State and District" tab,
   scrolled to the Utah section (lazy-loads on scroll, same as every prior
   state), and read the rendered table via screenshot. Confirmed the
   CURRENT (pre-2026-election) Utah delegation: Moore (1st), Maloy (2nd),
   Kennedy (3rd), Owens (4th) — all Republicans.
7. Matched all 4 house.gov names against the 2026 candidate-filing table
   BY NAME (not by district number, since the old-to-new district mapping
   is not 1:1 given the full remap) to determine `isIncumbent` for each
   2026 race: Moore -> new UT-02 (incumbent), Maloy -> new UT-03
   (incumbent), Kennedy -> new UT-04 (incumbent), Owens -> not a 2026
   candidate anywhere (confirmed absent, genuine retirement).
8. Fetched Utah's official 2026 election calendar PDF and Utah Code §
   20A-9-202 (candidate declaration/withdrawal provisions) to determine the
   governing calendar dates — see below.
9. Fetched `vote.utah.gov/more-information-on-utah-political-parties/` to
   confirm Utah's 8 officially recognized political parties (Constitution,
   Democratic, Forward, Green, Independent American, Libertarian, Peoples'
   Freedom, Republican) and that "Unaffiliated" is NOT itself a recognized
   party (confirming the IND mapping is correct, not a missed party code).
10. Assembled `UT_HOUSE_ROSTER_2026` (19 rows across all 4 districts) and
    registered it in `scripts/ingest/official-roster.ts`. Added a new
    `UIAP` party code to `scripts/congressional-rosters/types.ts` for Utah's
    Independent American Party (distinct from Arizona's differently-named
    AIP), and extended the existing `CST` code's docblock to note it now
    also covers Utah's Constitution Party (reused, not re-minted, since
    both are literally the same national-affiliate party name, unlike the
    AIP/AKP/UIAP precedent of genuinely distinct state-specific parties).
11. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean**
    for every file this build touched. 162 test files; 3,259/3,264 tests
    passed on the first full run after fixing a transient count bug (see
    limitation note below) — the 5 non-passing results (3 failures, 2 todo)
    are the same pre-existing, unrelated Playwright headless-browser
    sandbox-permission failure in `scripts/design/capture-shared.test.ts`
    already documented in the Missouri/Nebraska builds (confirmed unrelated
    — no UT/official-roster code touches that file). `officialRoster.test.ts`
    alone: 223/223 pass. `npx eslint` on every file this build touched:
    clean, zero warnings or errors.
12. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL`
    retrieved via a fresh `vercel env pull --environment=preview` (linked
    via a copy of the main checkout's `.vercel/project.json`, since this
    build's isolated worktree had no pre-existing link; the copy was
    deleted after use, never committed), read inline via a single Python
    command substitution — never `source`d, never echoed — confirmed
    non-empty (146 characters) and confirmed the host
    (`ep-aged-cake-aqhinavd-pooler...`) to be the same staging branch
    already verified in the Missouri build, not production (`ep-silent-dew...`).
13. **Staging import: done, twice, confirmed by direct row-count query both
    times — no ambient/production `DATABASE_URL` ever used.**
    - First run caught a real transcription gap: `upserted=18`, one short
      of the fixture's intended 19 (Robert M. Moesinger, UT-02 Unaffiliated,
      had been omitted from the fixture array despite being correctly
      documented in the docblock's own "19 candidates" coverage count).
      Fixed by adding the missing row and re-running lint/typecheck/tests.
    - Re-ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
      --state UT` → `upserted=19`.
    - Queried `SELECT district, name, party, is_incumbent, ballot_status
      FROM official_roster_candidates WHERE state='UT'` directly against
      staging (via a scratch `tsx` script using the app's own `db/client.ts`
      + `db/schema.ts`, deleted immediately after use) → 19 rows, exactly
      matching the fixture row-for-row (all 4 districts, all 3 incumbents
      correctly flagged, all party codes verbatim).
    - Re-ran the import a second time → `upserted=19` again, re-queried the
      row count → still 19 (idempotent upsert confirmed, not a duplicate
      insert).
14. **End-to-end check against staging, flag on:** called `lookupChallengers`
    directly (the real production code path, not a mock, via a scratch
    `tsx` script deleted immediately after use) for all 4 UT House
    districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`, and
    compared the app's literal output candidate-by-candidate against the
    fixture. **Result: 0 mismatches across all 4 districts** — every
    challenger name matched exactly, every row carried
    `rosterProvenance.sourceKind === "official_state_roster"`, every
    sitting incumbent (Moore/UT-02, Maloy/UT-03, Kennedy/UT-04) was
    correctly excluded from their own district's challenger list, and
    UT-01 correctly excluded no one (open seat, all 4 filers render as
    challengers). The staging `DATABASE_URL` and `OFFICIAL_ROSTER_ENABLED`
    flag were both set inline for this verification command only, never
    written to a persisted env file.
15. Added 12 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — UT narrowing`, `isIncumbentSeekingReelection —
    UT`, `lookupChallengers — UT wiring`), mirroring the existing MO/IN/CT
    house-only coverage pattern, including explicit open-seat (UT-01) and
    UIAP/CST party-code spot-check assertions.

## Operational-navigation section (per plan doc requirement (d))

Utah's official source is `vote.utah.gov` (candidate filing) and the
separate `electionresults.utah.gov` (election results) — both run by the
Lieutenant Governor's Office / Elections Office. Neither is Civix-vended;
the Civix playbook in the plan doc does not apply here.

- **Candidate-filing table (`vote.utah.gov/2026-candidate-filings/`):** a
  single, plain server-rendered page (WordPress) listing every 2026
  candidate across Federal, State, and Judicial offices in one long table,
  each row tagged with an office/district and a `Status` value
  (`Election Candidate`, `Out in Convention`, `Primary`, `Withdrew`,
  `Disqualified`, `Deceased`, `Filed`). Rendered cleanly via
  `get_page_text` — no browser automation strictly required for this page,
  though it was used anyway for consistency with the rest of the session.
  A `Download Spreadsheet` link provides the same data as XLSX
  (`Candidate-Filing-2026.xlsx`), not used directly this session but
  available as a fallback.
- **Reliable-but-nuanced signal:** the `Status` column does NOT itself
  tell you who won a primary — `Primary` status appears to be a permanent
  filing-stage label (the page, last updated 7/6/2026, still showed
  `Primary` for both primary winners AND losers 13 days after the June 23
  election). This is a genuinely different mechanic from Missouri's
  cumulative-placement table (which drops withdrawn candidates from its
  active list) — for Utah, a SEPARATE results source
  (`electionresults.utah.gov`) had to be consulted to determine primary
  winners; the filing table alone cannot answer "who is on the general
  ballot" for a contested primary race.
- **`electionresults.utah.gov` is a JS-rendered results dashboard**, not
  Civix but similarly virtualized/paginated in effect — `get_page_text`
  only returned the FIRST visible race card per call; subsequent races
  required scrolling (`computer` tool, `scroll_direction: down`) and
  re-screenshotting to read. Each race card shows candidate name, party,
  percentage, raw vote count, and a "Localities reporting X/X" indicator —
  the latter is the reliable signal for "is this result final," used here
  to confirm all 3 contested UT congressional primaries were at 100%
  reporting despite the page's own "UNOFFICIAL RESULTS" banner.
- **The "UNOFFICIAL RESULTS" banner is misleading if read alone** — Utah's
  own official election calendar shows the primary-canvass window (the
  formal certification process) closed July 6, 2026, well before this
  fixture's July 16 retrieval date, even though the results dashboard's
  page-level banner text had not been updated to reflect that. Cross-
  checking the calendar PDF against the results-page banner was necessary
  to conclude the primary winners were safely treated as determined.
- **Utah's court-ordered redistricting is the single biggest source of
  potential error for this state** — a "By State and District" cross-check
  by OLD district number would have produced a completely wrong incumbency
  map (e.g. concluding Blake Moore is NOT an incumbent for new UT-02,
  since he currently holds old UT-01). Always match by candidate NAME
  first, confirm via independent news sources that a state is mid-remap
  BEFORE doing the house.gov cross-check, then apply names to whichever
  NEW district each incumbent actually filed for in the current cycle's
  candidate-filing table.
- **house.gov requires browser automation, not a plain fetch** — it 403s a
  plain WebFetch (same as every prior state's build). Its "By State and
  District" tab content lazy-loads on scroll — `find` + `scroll_to` the
  state's own heading element, then read the rendered table via screenshot
  rather than `get_page_text`.
- **The Utah election calendar PDF is a native, non-scanned, text-bearing
  PDF, but Chrome's own in-browser PDF viewer renders it as a paginated
  canvas** with no accessible text layer and unreliable page-navigation
  automation (clicking the page-number field and typing a target page
  number, plus thumbnail-panel scrolling, both failed to navigate
  reliably). The practical fix was to download the PDF via `curl` and
  extract text with `pdftotext -layout` on the command line instead of
  fighting the browser viewer — the resulting text preserved the calendar
  grid well enough (with some multi-line-cell layout artifacts, resolved
  by inspecting the day-of-week grid structure directly) to read every
  date and its governing statute citation.
- **Utah Code § 20A-9-202(6)** ("Any person who filed a declaration of
  candidacy may withdraw as a candidate by filing a written affidavit with
  the clerk") does NOT itself state a standalone numeric withdrawal
  deadline distinct from the ballot-printing timeline — unlike Missouri's
  explicit RSMo 115.359 "eleventh Tuesday before the election" language.
  The practical, functional deadline used in this build is Utah's own
  election calendar's UOCAVA ballot-transmission date (ballots must be
  finalized/printed by then) — see the governing-dates section below.
- **Tooling used:** `mcp__claude-in-chrome` browser automation for
  `vote.utah.gov`, `electionresults.utah.gov`, and `house.gov` (get_page_text
  + scroll + screenshot); `curl` + `pdftotext -layout` (command line, via
  Bash) for the election-calendar PDF, after Chrome's own PDF viewer proved
  unreliable to navigate programmatically; `curl` (with `-k` to bypass a
  TLS handshake issue specific to `le.utah.gov`, a public-data read with no
  secrets involved) for Utah Code § 20A-9-202's statute text; WebSearch for
  independent context on the redistricting situation, Mike Lee's Senate
  class, and the primary/general election dates, all subsequently confirmed
  against Utah's own official sources per the SAFETY rule (news/search used
  for context and cross-check only, never as the primary evidentiary basis).

## Standing calendar dates (per the plan doc's requirement (e))

Pulled from Utah's official 2026 Election Calendar
(`https://vote.utah.gov/wp-content/uploads/2026/01/2026-Utah-Election-Calendar.pdf`)
and Utah Code § 20A-9-202:

- **June 16, 2026, 5:00 p.m. MST** — unaffiliated-candidate declaration
  period ended (Utah Code § 20A-9-502(5)(a)). Already passed; every
  unaffiliated filer in this fixture was already locked in as of this
  deadline, with no pending signature-sufficiency review remaining.
- **Tuesday, June 23, 2026** — Utah's regular primary election. Already
  held; all 3 contested congressional primaries fully decided (100%
  locality reporting).
- **June 29 – July 6, 2026** — the board-of-canvassers window during which
  the primary election's final results could be canvassed (first day June
  29, last day July 6). Already closed as of this fixture's retrieval date
  (2026-07-16) — the practical basis for treating the 3 primary winners as
  determined nominees despite electionresults.utah.gov's residual
  "UNOFFICIAL RESULTS" page banner.
- **Saturday, August 1, 2026, 5:00 p.m. MST** — last day for a write-in
  candidate to declare candidacy with the election officer (Utah Code §
  20A-9-601(1)(a)). Still ahead of this fixture's retrieval date; a
  write-in filer appearing after this build but before this date would not
  yet be reflected here.
- **Friday, September 4, 2026, 5:00 p.m. MST** — last day for a candidate
  to submit a candidate profile for the general election on vote.utah.gov
  (informational voter-guide content, not a ballot-eligibility deadline).
- **Wednesday, September 16, 2026** — ballots must be transmitted to
  UOCAVA (Uniformed and Overseas Citizens Absentee Voting Act) voters by
  this day. Used in this build as the practical "ballot content lock"
  point, since Utah Code § 20A-9-202(6) does not itself specify a
  standalone withdrawal-deadline date — by this date, the general-ballot
  candidate slate must be finalized for printing/transmission, so any
  withdrawal after this point could no longer be reflected on the physical
  ballot. **This is the trigger for the NOT BEFORE follow-up card opened
  below.**
- **Friday, October 23, 2026** — last day to register to vote and not have
  to vote a provisional ballot.
- **Tuesday, October 27, 2026** — last day to request a mail ballot (does
  not apply to military/overseas voters).
- **Tuesday, November 3, 2026** — Utah's general election.
- **November 10 – 17, 2026** — the board-of-canvassers window during which
  the general election's final results can be canvassed.
- **Tuesday, November 24, 2026** — Utah's 2026 General Election Statewide
  Canvass (Utah Code § 20A-4-306(1)(a)(i)) — the final, formal
  statewide certification of the November 3 general election results.

**Dated re-check card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): "[P2] Re-check official roster: Utah (UT) — after
UOCAVA ballot-transmission deadline", `NOT BEFORE: 2026-09-17` — see
`docs/operations/voter-choice-backlog.md`.

## Files changed

- `scripts/congressional-rosters/ut-official-roster-2026.ts` (new)
- `scripts/congressional-rosters/types.ts` (new `UIAP` party code; extended
  `CST`'s docblock to note it also covers Utah's Constitution Party)
- `scripts/ingest/official-roster.ts` (UT import + FIXTURES entry)
- `src/lib/server/officialRoster.test.ts` (UT test coverage, 12 new cases)
- `docs/operations/voter-choice-backlog.md` (STATUS flip was already done
  as a separate prior commit before this build per the claim-safely
  protocol; this build adds a new UT re-check follow-up card as a further
  separate commit)
- This doc (new)

No database migration — `officialRosterCandidates`/`ballot_status` remains
unchanged since migration 0016 (confirmed by inspecting `db/schema.ts` and
`db/migrations/`). No production mutation. `OFFICIAL_ROSTER_ENABLED` was
never set anywhere persistent — only inline, for the staging verification
commands in step 14 above.
