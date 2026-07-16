# Hawaii vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Hawaii (HI)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Twelfth state
built through this manual track, after Arizona, Texas, Oklahoma, Alabama,
Alaska, California, Colorado, Connecticut, Arkansas, Delaware, and Florida.

Date: 2026-07-15. Hawaii's 2026 primary (2026-08-08) is still in the future
at retrieval — this is a **pre-primary build**, like AZ/DE/FL's. The general
election is 2026-11-03. Hawaii has **no US Senate contest in 2026**.

## Bottom line

**GO on the approach for a twelfth state.** Both HI US House districts (I
and II) render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across both contests.**

**Hawaii is not Civix-vended.** Its official candidate-filing system
("OLVR" — Online Voter Registration / candidate filing — at
`olvr.hawaii.gov`) is a Telerik-RadGrid-based ASP.NET WebForms application, a
genuinely different mechanical shape from every prior state: all 411 of
Hawaii's 2026 candidate filings, across every office (federal, state,
county, OHA), live in ONE grid with no office-scoped URL parameter — see
the operational-navigation section below for how this was actually
navigated.

**A wholly new operational finding for this track: "Issued" vs "Filed"
status.** Hawaii's grid separately tracks when a candidate *requested* a
blank nomination paper ("Issued") from when they *returned* the completed,
signed paper with the filing fee ("Filed"). A row with only an Issued date
is **not an actual candidate** — 13 of the 28 total rows across both
congressional districts were Issued-only and are excluded from this fixture
entirely, leaving 15 real filed candidates (8 in District I, 7 in District
II). Getting this wrong would have overstated Hawaii's candidate set by
nearly half.

**No US Senate contest exists in 2026** — confirmed three independent ways
(the grid's own 411-row dataset, the state's own "Contest Schedule" page,
and independent research on Sen. Schatz's/Sen. Hirono's term-expiration
dates). See the operational-navigation section for detail.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** `https://elections.hawaii.gov/candidates/candidate-reports/`
   is a static landing page (confirms filing closed June 2, 2026, last
   updated July 6, 2026) that links to the actual live report at
   `https://olvr.hawaii.gov/Controls/CandidateFiling.aspx?elid=94` — the I06
   rehearsal's `sourceFormat: "html"` / `parserFamily: "html_table"`
   classification undersold this: the landing page IS static HTML, but the
   actual candidate data lives behind that link in a fully
   interactive Telerik RadGrid, not a plain HTML table. This was discovered
   only by fetching the linked report page directly (`WebFetch` returned
   just the first ~15 rows silently, no error — a genuine trap: it looked
   like a complete small state, when it was actually paginated to 28 pages).
2. **Tooling — why plain fetch/WebFetch failed silently and what was used
   instead.** `WebFetch`/`curl` against the report URL only ever return
   whatever page size + page number the grid's ASP.NET ViewState happens to
   render server-side by default (15 rows, page 1) — there is no query-string
   way to request "all rows" or "page N" directly, because Telerik RadGrid
   drives pagination via `__doPostBack` JavaScript calls, not plain links.
   `mcp__claude-in-chrome__*` browser automation was required. Even within
   the browser, the grid's own text-filter inputs (Contest/Party/Name
   columns) proved unreliable to drive via scripted click+type — repeated
   attempts left stale text in the filter box or silently failed to
   re-render (see raw session transcript for the back-and-forth). The
   reliable path that worked: locate the grid's Telerik client-side object
   via `$find('ctl00_cphFooter_rdgSearch')` and call
   `.get_masterTableView().set_pageSize(500)` directly through
   `mcp__claude-in-chrome__javascript_tool`, which forces all 411 rows into
   the DOM in one page, then read exact cell values with a targeted DOM
   query (`document.querySelectorAll('table[id*="rdgSearch"] tr.rgRow, tr.rgAltRow')`)
   rather than trusting the linearized `get_page_text` output (which drops
   empty table cells silently, misaligning columns — confirmed by
   cross-checking against the raw `<td>` array). This is a materially
   different mechanical trap from Civix's "single-select filter, no
   all-districts query" — worth its own note for any future
   Telerik-RadGrid state.
3. **The "Issued" vs "Filed" distinction (the load-bearing finding).** Every
   row carries two dates — "Issued" (when a blank nomination paper was
   requested) and "Filed" (when the completed, signed paper was returned
   with the filing fee) — plus a Status column. A row with an Issued date
   but a BLANK Filed date carries Status = "Issued" and never became an
   actual candidate (confirmed: the regular filing deadline, June 2, 2026
   4:30pm, had already passed at this build's 2026-07-15 retrieval, so
   these rows can never be completed). Only rows with both dates present,
   Status = "In Primary," are real filed candidates. Verified via direct
   DOM inspection (`cells[8]` = Issued, `cells[9]` = Filed, `cells[10]` =
   Status) rather than the linearized text output, which visually looked
   identical for both cases and would have been easy to misread. Of 16 rows
   in District I, 8 were Issued-only (Della Au Belatti — a prominent former
   state House Majority Leader — Zachary Burd, both of Ku Lono "Bobby"
   Cuadra's two applications, Maxwell Frazier, both of Joshua P.K. Gisa's
   two applications, and Garrett Woodrow); of 12 rows in District II, 5 were
   Issued-only (both Cuadra applications again, Ron Curtis, George
   Lucas-Tadeo, Austin Martin). All 13 excluded from the fixture.
4. **"In Primary" does not mean "contested."** The grid's Status column also
   has a distinct "In General" value that skips the primary — but checking
   every "In General" row in the full 411-row dataset confirmed it is used
   ONLY for Hawaii's nonpartisan county-council / OHA-trustee races
   ("NONPARTISAN SPECIAL" party rows), never for a partisan congressional
   filer. Both districts' sole Republican filer (Adriel Lam / District I,
   Brenton Awa / District II) carry Status = "In Primary" despite having no
   intra-party opponent — meaning Hawaii holds a primary for every partisan
   federal filer regardless of contest count, and the official source
   itself has not certified them for the general yet. Per the SAFETY rule
   against inferring ahead of the source, both are recorded
   `qualified_for_primary_ballot`, not promoted.
5. **No US Senate contest — confirmed three ways.** (a) A full-dataset scan
   of all 411 rows' Contest column (via the same forced-pageSize DOM query)
   found zero rows matching "SENAT" combined with "U.S." — only "STATE
   SENATOR, DIST n" rows (a state-legislative office, out of this card's
   scope; one row is a "DIST 19 VACANCY" special election, also
   state-legislative). (b) `elections.hawaii.gov/voting/contest-schedule/`,
   the state's own page listing which offices are up in which cycle, lists
   "U.S. House of Representatives" under its 2026 federal section but "U.S
   Senate" only under the 2028 section. (c) Independent web research
   confirms Sen. Brian Schatz's term (re-elected 2022) runs through January
   2029 and Sen. Mazie Hirono's (re-elected 2024) runs through January
   2031 — neither seat is up in 2026.
6. **Incumbency cross-check.** The OLVR grid carries no incumbency signal at
   all (unlike every prior state's portal, which at least attempts an
   `*Incumbent`-style tag) — incumbency was established entirely from
   independent house.gov-domain sources: `case.house.gov` (Ed Case,
   HI-01) and `tokuda.house.gov` (Jill N. Tokuda, HI-02). Both
   `house.gov/representatives` and the Clerk's member-data feed returned
   HTTP 403 to a direct fetch this session, the same failure DE's build hit
   (worked around there via `mcbride.house.gov`) — the same fallback
   pattern was used here. Both incumbents filed for re-election (Status =
   "In Primary" in their own contested party primary) and carry
   `isIncumbent: true`.
7. **Party-code mapping.** Hawaii's grid literally labels nonpartisan
   filers' party as "NONPARTISAN" — mapped to the existing `NPA` code,
   following the Alaska precedent exactly (AK's "Nonpartisan"/"Undeclared"
   filers already collapse into `NPA`). No new party code was needed. Green
   Party filer Jordan S. Conley uses the existing `GRE` code. No Libertarian
   candidate actually filed in either district (Cuadra's Libertarian
   applications were Issued-only, excluded per finding 3), so `LIB` is
   unused in this fixture despite two Libertarian applications existing.

## Contest inventory

2 US House districts. No US Senate contest.

| District | Incumbent | Filed candidates | Contested? |
|---|---|---|---|
| HI-01 | Ed Case (D) | 8 (5 DEM incl. Case, 1 REP, 1 GRE, 1 NPA) | Yes — 5-way DEM primary; REP/GRE/NPA solo-per-party |
| HI-02 | Jill N. Tokuda (D) | 7 (4 DEM incl. Tokuda, 1 REP, 2 NPA) | Yes — 4-way DEM primary; REP solo; 2 NPA filers |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL pattern)

**Needed no changes:** `db/schema.ts` (no migration — the existing
`official_roster_candidates` table, `NULLS NOT DISTINCT` uniqueness fix
(migration 0016), and plain-text `party`/`ballot_status` columns already
cover Hawaii's shape); `scripts/congressional-rosters/types.ts` (both `GRE`
and `NPA` already exist in the party union, added building AK/AZ/CA/CT and
AK/FL respectively); `src/lib/server/races.ts`'s `PARTY_NAMES` map (`GRE` →
"Green", `NPA` → "No Party Affiliation" already wired); the importer's core
upsert logic; the `runoff_pending`/`isRunoffPending` UI path (unused — no
undetermined-nomination case found for Hawaii, see below).

**New for this build:**

- `scripts/congressional-rosters/hi-official-roster-2026.ts` (new) — 15
  rows (8 District I + 7 District II), house-only shape (mirrors CT/CA, not
  FL/DE's two-array house+senate shape, since HI has no senate contest).
  Full sourcing, methodology, and the "Issued vs Filed" finding are in the
  file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `HI` in `FIXTURES` with
  a single house entry, same one-entry pattern as CT/CA.
- `src/lib/server/officialRoster.test.ts` — 123 total tests now passing (up
  from 114 pre-HI); added HI's import block, `hiDbRow` helper,
  `HI_HOUSE_DB_ROWS`, `HI_INCUMBENTS`, and three `describe` blocks
  (narrowing, incumbency, wiring) covering both districts, the
  no-senate-contest case, and the "solo Republican filer still
  `qualified_for_primary_ballot`" case explicitly.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3159 tests passing, 5 pre-existing `todo` (no failures).
  One `prettier` formatting issue in the new test additions was caught by
  the lint step and fixed (`npx prettier --write`) before this run, per the
  known CI-includes-prettier gotcha.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (from the
  Vercel-linked main checkout's project link; confirmed
  `.vercel/project.json`'s `projectName` reads `voter-choice`), confirmed
  non-empty (177 characters) before use.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Pre-import row count for `state = 'HI'`: **0**.
  2. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state HI` — importer reported `upserted=15`. Direct row-count query
     (`select office, count(*) ... where state = 'HI' group by office`, not
     just the importer's own log line): **15 house / 0 senate = 15**.
  3. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=15`. Direct row-count query again:
     **15/0/15 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for both HI House
  districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`. Diffed
  candidate-by-candidate against the fixture. **0 mismatches across both
  contests.** Full literal output:

  ```
  HI-01 (incumbent Ed Case excluded):
    - Nathan M. Berning (No Party Affiliation)
    - Jennifer Booker (Democrat)
    - Jordan S. Conley (Green)
    - Ben Fatula (Democrat)
    - Jarrett K. Keohokalole (Democrat)
    - Nicholas "Nick" Kiswanto (Democrat)
    - Adriel C. Lam (Republican)

  HI-02 (incumbent Jill N. Tokuda excluded):
    - Brenton Awa (Republican)
    - Kirill Basin (Democrat)
    - Edward A. Codelia (No Party Affiliation)
    - Greg Guithues (Democrat)
    - Steven King (Democrat)
    - Randall Terry (No Party Affiliation)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"` and `isRunoffPending: false`. Both districts'
  senate-challenger count returned 0 (no HI senate fixture rows registered).
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats found. Hawaii's primary is decided by plurality in
a single round — the Candidate's Manual and the official election-objections
page (governing HRS §§11-172, 11-173.5, 11-174.5, 11-175) describe only an
election-*contest* process (a legal challenge to results), not a runoff
election, for federal office. No seat's nomination is ambiguous beyond the
ordinary "primary hasn't happened yet" state every contested-primary row
already carries as `qualified_for_primary_ballot`.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every contested-primary row is undetermined until August 8, 2026**, and
  not legally final/uncontestable until the primary-election-objection
  window closes **August 24, 2026, 4:30pm** (HRS §11-173.5). This fixture is
  a pre-primary snapshot; a dated re-check card is required to promote
  determined nominees (see "Governing calendar dates" below).
- **A filed candidate can still withdraw.** The OLVR grid has a distinct
  "Withdrawn" status (observed elsewhere in the 411-row dataset, not in
  either congressional district as of this build) that a future recheck
  should watch for.
- **The 13 Issued-only applications are excluded, not merely unlabeled.**
  If the grid's own historical Filed-date rendering is ever found to be
  wrong, a future recheck should re-verify against the live grid rather
  than assume this fixture's exclusions are permanent.
- **No independent/minor-party general-ballot filer found for either
  district** beyond the NPA/GRE filers already included — no
  `declared_general_ballot_intent` rows in this fixture.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled directly from Hawaii's own official Office of Elections pages
(`elections.hawaii.gov/candidates/candidate-filing/` and
`elections.hawaii.gov/resources/election-objections/`, both retrieved
2026-07-15):

- **February 2, 2026** — candidate nomination-paper application period
  opens (already passed).
- **May 27, 2026, 4:30pm — candidate-withdrawal deadline** (HRS §11-117;
  "4:30pm on the fourth business day prior to the close of filing," per the
  Candidate's Manual): the deadline for a candidate to withdraw their own
  nomination papers WITHOUT it being treated as a vacancy a party may fill
  under HRS §11-118. Already passed at this build's retrieval, and — unlike
  DE's/AK's withdrawal windows, which fall AFTER the filing deadline and
  therefore remain a live risk against an already-filed candidate set —
  this date falls BEFORE Hawaii's June 2 filing deadline, so it does not
  create an open risk against this fixture's 15 already-filed rows. A
  candidate can still withdraw AFTER filing (HRS §11-117 covers this too,
  triggering the party-vacancy process under §11-118) — that remains a live
  risk against this fixture, same as every other state, and is not bounded
  by a further named deadline found in this build's sources.
- **June 2, 2026, 4:30pm** — regular candidate nomination-paper filing
  deadline (already passed; this is the deadline that makes the 13
  Issued-only applications permanently non-candidates — see finding 3
  above).
- **June 9, 2026, 4:30pm** — deadline to object to a filed nomination paper
  (already passed).
- **July 21, 2026** — primary-election ballots mailed to voters.
- **July 27 – August 8, 2026** — primary voter service centers open.
- **August 1, 2026** — primary absentee-ballot alternate-address request
  deadline.
- **August 8, 2026** — **Primary Election Day.** Resolves every contested
  primary's nominee (this fixture's `qualified_for_primary_ballot` rows).
- **August 24, 2026, 4:30pm** — deadline to file a primary-election
  objection/contest with the Clerk of the Hawaii Supreme Court (HRS
  §11-173.5). This is the practical date after which primary results become
  legally final and this fixture's `qualified_for_primary_ballot` rows
  should be promoted to `qualified_for_general_ballot` for each certified
  nominee — Hawaii has no separate canvass-certification date distinct from
  this objection-window close (HRS §11-155 ties certification to "the
  expiration of the time for bringing an election contest").
- **October 16, 2026** — general-election ballots mailed to voters.
- **October 20 – November 3, 2026** — general voter service centers open.
- **October 26, 2026** — general paper voter-registration deadline.
- **October 27, 2026** — general absentee-ballot alternate-address request
  deadline.
- **November 3, 2026** — **General Election Day.**
- **November 23, 2026, 4:30pm** — deadline to file a general-election
  objection/contest with the Clerk of the Hawaii Supreme Court (HRS
  §11-174.5) — Hawaii's final ballot-content lock date for the cycle.
- **Out of scope, noted for completeness:** a State Senate vacancy special
  election (District 18 per the "Become a Candidate" page's prose, District
  19 per the OLVR grid's own contest label — a discrepancy this build did
  not need to resolve, since it is a state-legislative race, out of this
  card's scope either way) has its own filing window, July 1 – September 4,
  2026, running concurrently with the regular cycle. Not reflected in this
  fixture.

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the August 24, 2026 primary
objection-window-close date above — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
Hawaii (HI) — after primary certification" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/wt-hi-official-roster/docs/operations/hawaii-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/hawaii-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/wt-hi-official-roster/scripts/congressional-rosters/hi-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/hi-official-roster-2026.ts`
  once merged to main).
- **Official Hawaii source URL(s) used:**
  - `https://elections.hawaii.gov/candidates/candidate-reports/` (landing
    page confirming the filing deadline had passed, last updated July 6,
    2026)
  - `https://olvr.hawaii.gov/Controls/CandidateFiling.aspx?elid=94` (the
    Office of Elections' 2026 Candidate Report — all 411 filings across
    every 2026 office; the 28 rows scoped to "U.S. REPRESENTATIVE, DIST I" /
    "DIST II" are this fixture's candidate-set source, retrieved live via
    browser automation 2026-07-15)
  - `https://elections.hawaii.gov/voting/contest-schedule/` (confirms which
    federal offices are up in 2026 vs. 2028 — no US Senate in 2026)
  - `https://elections.hawaii.gov/candidates/candidate-filing/` (official
    "Become a Candidate" page — filing/objection deadlines, last updated by
    the state July 1, 2026)
  - `https://elections.hawaii.gov/resources/election-objections/` (official
    primary/general election-contest deadlines)
  - `https://case.house.gov/` (incumbency cross-check only — confirms Ed
    Case as HI-01's sitting Representative)
  - `https://tokuda.house.gov/` (incumbency cross-check only — confirms
    Jill N. Tokuda as HI-02's sitting Representative)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete, reviewed,
and pass `npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (15 rows, 15 house / 0 senate, no duplication on re-run), and
the real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for both HI House districts, with **0
mismatches** against the fixture. Prod was never touched — every database
command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this
self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for HI and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after August 24, 2026**
   (primary-objection-window close) — opened on the backlog per the NOT
   BEFORE date-gate convention.
