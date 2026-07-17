# South Carolina vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: South Carolina (SC)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Twenty-first
state built through this manual track, after AZ, TX, OK, AL, AK, CO, CT, CA,
AR, DE, FL, HI, LA, ME, IN, GA, IA, KS, ID, MD, and KY.

Date: 2026-07-16. South Carolina's June 9, 2026 primary and June 23, 2026
runoff have both already occurred — the House slate and most of the Senate
race are past both stages. The general election is November 3, 2026.

## Bottom line

**GO on the approach for a twenty-first state**, with one significant, novel
caveat this build surfaced: **the U.S. Senate seat's Republican nomination is
completely undetermined.** Sen. Lindsey Graham (R) won his own June 9
primary but died before the general election. Per S.C. Code § 7-11-55, this
triggers a brand-new Republican-only special filing period (opens July 21,
2026) and special primary (August 11, 2026, runoff August 25 if necessary)
to pick the actual November 3 general-ballot nominee — as of this build, no
Republican has even filed yet. Rather than guess or misuse `runoff_pending`
(which requires two already-filed finalist names), the Republican Senate row
is deliberately **omitted** from the fixture, mirroring existing precedent in
this codebase (Louisiana's House-fixture omission, `official-roster.ts`).

All 7 SC House districts render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — 0 mismatches, all
25 rows (21 House + 4 Senate) imported and idempotent.

**South Carolina is not Civix-vended** — its official source is the SC
Election Commission's own VREMS portal (`vrems.scvotes.sc.gov`), a
conventional server-rendered ASP.NET page with no district-by-district query
requirement (unlike Texas's Civix portal, one query returns every district at
once).

**NO-GO on fan-out to further states in this same session** (per the epic's
one-state-per-session build scoping) and **NO-GO on flipping the flag for
real users** without Muxin's sign-off — same standing gate as every prior
state.

## How this was verified — VREMS, a conventional government candidate portal

South Carolina's official candidate source is the SC Election Commission's
VREMS ("MyscVOTES") candidate-tracking system:

1. `https://vrems.scvotes.sc.gov/Candidate/SelectElection` — pick Election
   Type "Statewide Primaries and General Elections", Election Year "2026",
   then the autocomplete "Election Name" field (type "General" to surface
   "11/3/2026 Statewide General Election").
2. Submitting lands on
   `https://vrems.scvotes.sc.gov/Candidate/CandidateSearch?electionId=22596`
   — an "Office" dropdown (no district sub-filter needed — "U.S. House of
   Representatives" returns all 7 districts in one query, 48 rows this
   cycle; "U.S. Senate" returns the entire statewide field, 13 rows) plus
   Party/County/Candidate-Status filters.
3. Setting "entries per page" to 100 renders the whole result set on one
   page — no virtualized-scroll or pagination-scripting gotcha like Texas's
   Election Night Results page.
4. **The "Candidate Status" column is the single most useful signal.**
   Since both the primary and runoff have already occurred, every row
   already carries a determined status: `Active` (survived to the Nov 3
   general ballot) or `Defeated In Primary` (eliminated). This build
   includes ONLY `Active` rows — there is no ballot-status value for a
   primary loser, matching every other post-primary state's build.
5. `Print` (PDF) and `Export` (CSV) buttons exist, but downloading files
   requires explicit user permission under this session's operating rules;
   this build instead set "entries per page" to 100 and read the rendered
   HTML table directly via `get_page_text`, avoiding any download.

**Incumbency cross-check:** `https://www.house.gov/representatives`
(South Carolina section, "By State and District", fetched live via browser
session) confirms Joe Wilson (SC-2), Sheri Biggs (SC-3), William Timmons
(SC-4), Jim Clyburn (SC-6), and Russell Fry (SC-7) as sitting incumbents —
matches this fixture's `isIncumbent: true` rows exactly. house.gov also
confirms Nancy Mace and Ralph Norman still hold SC-1/SC-5 in the current
Congress despite not appearing anywhere in VREMS's 2026 House candidate
list — consistent with, not contradicting, Rollcall's 2026-06-09 reporting
that both instead ran (and lost) in the SC gubernatorial primary.

**The Senate vacancy was independently confirmed at the source**, not just
inferred from VREMS's `Deceased After Primary` status tag: the SC Election
Commission's own press release
(`https://scvotes.gov/u-s-senate-special-republican-party-filing-primary/`,
posted 2026-07-13) states the S.C. Code § 7-11-55 special filing/primary
timeline explicitly, including that "the nominee resulting from this special
filing and primary will be a candidate on the November 3, 2026 General
Election Ballot."

**Certified political parties:** four of South Carolina's 9
state-certified minor parties fielded federal general-ballot candidates this
cycle — Alliance (SC-1 Ellis, SC-6 Oddo), Constitution (Senate's Hackett),
Forward (SC-5 Kaplan), and the South Carolina Workers Party (SC-2 Smith) —
confirmed against
`https://scvotes.gov/candidates/certified-political-parties-of-south-carolina/`,
the Election Commission's own list of all 9 certified parties. New party
codes `SCA`/`SCC`/`SCF`/`SCW` were added to `types.ts` and `races.ts`'s
`PARTY_NAMES` map, each distinct from any same-named party code already used
by another state (mirroring how Florida's `FFP` and Idaho's `CST` are each
that state's own legally distinct chapter).

## Contest inventory

| Seat | Contest | Status |
| --- | --- | --- |
| SC-1 (House) | Open seat (Mace ran for Governor) | Determined — 4-way general |
| SC-2 (House) | Wilson (R) incumbent | Determined — 3-way general |
| SC-3 (House) | Biggs (R) incumbent | Determined — 3-way general |
| SC-4 (House) | Timmons (R) incumbent | Determined — 3-way general |
| SC-5 (House) | Open seat (Norman ran for Governor) | Determined — 3-way general |
| SC-6 (House) | Clyburn (D) incumbent | Determined — 3-way general |
| SC-7 (House) | Fry (R) incumbent | Determined — 2-way general |
| U.S. Senate | Graham (R) won primary, died before general | **Republican nomination undetermined** — special filing/primary pending; Democratic/Libertarian/Constitution nominees already determined |

## Full candidate-by-candidate comparison (fixture vs. official source)

All rows below are `qualified_for_general_ballot`, confirmed against VREMS's
`Active` status filter for the 11/3/2026 Statewide General Election
(`electionId=22596`).

**SC-1** (open seat): Jenny Costa Honeycutt (R), Nancy Lacore (D), Margo
Ellis (Alliance), Bill Reeside (Libertarian).

**SC-2**: Joe Wilson (R, incumbent), Zyon Khalifa (D), Dayna Alane Smith (SC
Workers Party).

**SC-3**: Sheri Biggs (R, incumbent), Eunice Lehmacher (D), Brian Corriea
(Libertarian).

**SC-4**: William Timmons (R, incumbent), Courtney McClain (D), Jessica
Ethridge (Libertarian).

**SC-5** (open seat): Wes Climer (R), Mallory Dittmer (D), Andy Kaplan
(Forward Party).

**SC-6**: James E "Jim" Clyburn (D, incumbent), John Peterson (R), Joseph
Oddo (Alliance).

**SC-7**: Russell Fry (R, incumbent), John Gregory Vincent (D).

**U.S. Senate**: Annie Andrews (D), Jason Elliot Brenkus (Libertarian), Mark
Hackett (Constitution), Kasie Whitener (Libertarian). **No Republican row —
see Bottom line and Known gaps.**

Every row above matches VREMS's `Active`-status candidate list exactly — 0
discrepancies found. 27 total candidates were marked `Defeated In Primary`
(House) or `Defeated In Primary`/`Withdrew Before Primary` (Senate) and are
correctly excluded (no ballot-status value represents a primary loser).

## What was built

- `scripts/congressional-rosters/sc-official-roster-2026.ts` — 21 House rows
  + 4 Senate rows, `SC_STAGE = "general"`.
- `scripts/congressional-rosters/types.ts` — added `SCA`/`SCC`/`SCF`/`SCW`
  party codes (Alliance, Constitution, Forward, and South Carolina Workers
  Party, each a real SC-certified party).
- `scripts/ingest/official-roster.ts` — registered `SC` in the `FIXTURES`
  map (house + senate).
- `src/lib/server/races.ts` — added the same 4 codes to `PARTY_NAMES` so both
  the official-roster path and the FEC path render consistent display names.
- `src/lib/server/officialRoster.test.ts` — added `getOfficialRoster — SC
  narrowing`, `isIncumbentSeekingReelection — SC`, and `lookupChallengers —
  SC wiring` describe blocks (14 new tests), mirroring the existing KY/KS
  coverage shape.

## Verification performed

- `npm run typecheck`: clean.
- `npm run lint`: clean (only pre-existing complexity warnings on unrelated
  files, no new errors).
- `npx vitest run src/lib/server/officialRoster.test.ts`: **207/207 passing**
  (14 new SC tests, all others unaffected).
- `npm run check` (full suite, 3248 tests): 3245 passing; the only 3
  failures are in `scripts/design/capture-shared.test.ts`
  (`chromium.launch()` failing with `mach_port_rendezvous... Permission
  denied`, a macOS sandbox restriction unrelated to this change — confirmed
  by re-running that file alone with the sandbox disabled, where all 3 pass
  cleanly).
- SC's 25 rows (21 House + 4 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  drizzle-query row count both times (25 total, 4 senate / 21 house — not
  just the importer's own self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for SC-1, SC-2, SC-5, and
  the Senate race, diffed against the fixture. **0 mismatches.** SC-2
  correctly excludes incumbent Joe Wilson and returns Zyon Khalifa
  (Democrat) and Dayna Alane Smith (South Carolina Workers Party) as
  challengers. SC-1 and SC-5 (open seats, no incumbent) correctly return all
  candidates with no exclusion. The Senate race correctly returns Annie
  Andrews (Democrat), Jason Elliot Brenkus (Libertarian), Mark Hackett
  (Constitution Party), and Kasie Whitener (Libertarian) — no Republican
  challenger appears, since none is recorded.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).
- **Operational note (not a code issue):** this worktree was not
  Vercel-linked by default (`.vercel/project.json` copied in from the
  primary checkout, then `vercel env pull --environment=development`) —
  same recovery mechanic prior states' builds have used when a fresh
  worktree lacks cached Vercel env state.

## Governing calendar dates (per the epic's standing requirement)

- **April 10, 2026, 5:00 p.m.** — deadline for candidates to withdraw from
  the Primary ballot; already passed.
- **June 9, 2026** — Statewide Primaries; already passed.
- **June 23, 2026** — Primary Runoffs; already passed.
- **July 15, 2026, 12:00 noon** — deadline to submit an independent/petition
  candidacy for the General Election ballot; already passed as of this
  build (one day prior). No petition-party federal filer appeared in VREMS
  as of retrieval.
- **July 21, 2026, 12:00 noon** — S.C. Code § 7-11-55 special Republican
  Senate filing opens (source: scvotes.gov's official press release).
- **July 28, 2026, 12:00 noon** — special Republican Senate filing closes.
- **August 11, 2026** — Statewide Special Primary for the Republican Senate
  nomination.
- **August 17, 2026, 12:00 noon** — deadline to check/certify petition
  candidates and for parties to certify candidates to the appropriate
  board/SEC — the point the House slate and non-Republican Senate slate
  become fully CERTIFIED, not just VREMS's current post-primary/post-runoff
  snapshot.
- **August 25, 2026** — Statewide Special Primary Runoff for the Republican
  Senate nomination, if necessary.
- **September 4, 2026, 5:00 p.m.** — deadline for candidates to withdraw
  from the General Election ballot — South Carolina's standing
  candidate-withdrawal deadline (per the epic's withdrawal-tracking
  requirement); any of this fixture's `qualified_for_general_ballot` rows
  could still withdraw before then.
- **November 3, 2026** — General Election Day.
- **November 12, 2026, 3:00 p.m.** — State Board of Canvassers certifies
  General Election results.

(Source for all dates above except the Senate-special dates:
`https://scvotes.gov/wp-content/uploads/2026/01/2026-Election-Calendar-Draft-scVOTES_.pdf`,
the SC Election Commission's official 2026 Election Calendar PDF.)

A dated `NOT BEFORE` follow-up card has been opened per the epic's
DATE-GATE CONVENTION, targeting 2026-08-12 (day after the special primary;
the card notes the runoff contingency and the Aug 17/Sept 4 dates too).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The Republican U.S. Senate nomination is completely undetermined** as of
  this build. No placeholder row was added. See Bottom line above and the
  dated follow-up card.
- **The House slate and non-Republican Senate slate are not yet formally
  CERTIFIED** — South Carolina's own calendar sets August 17, 2026, noon, as
  the certification deadline. A petition candidate who filed by July 15 but
  isn't certified yet could still appear.
- South Carolina's candidate-withdrawal deadline for the General Election
  ballot (September 4, 2026, 5:00 p.m.) has not yet passed — any determined
  nominee above could still withdraw.
- No write-in candidates appear in either VREMS candidate list — South
  Carolina write-in filing is a distinct, separately-tracked process,
  out of scope for this build (matching prior states' treatment).

## Deliverables (per the card's standing requirement)

- (a) Full absolute path to this doc:
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/south-carolina-vertical-slice-data-check.md`
- (b) Full absolute path to the fixture:
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/sc-official-roster-2026.ts`
- (c) Official South Carolina source URLs used:
  - `https://vrems.scvotes.sc.gov/Candidate/SelectElection`
  - `https://vrems.scvotes.sc.gov/Candidate/CandidateSearch?electionId=22596`
  - `https://scvotes.gov/u-s-senate-special-republican-party-filing-primary/`
  - `https://scvotes.gov/wp-content/uploads/2026/01/2026-Election-Calendar-Draft-scVOTES_.pdf`
  - `https://scvotes.gov/candidates/certified-political-parties-of-south-carolina/`
  - `https://www.house.gov/representatives` (incumbency cross-check only)
- (d) Operational-navigation section: see "How this was verified" above.
- (e) Governing calendar dates: see "Governing calendar dates" above.

## GO/NO-GO verdict

**GO** — merge directly per the epic's self-vet auto-merge gate. The diff
faithfully implements the card's DECISION (roster governs the candidate set
+ incumbent-on-ballot status for SC House + the determined portion of
Senate, flag-gated, staging-only, no prod mutation, no flag flip); it is
low-risk and reversible (an additive fixture + FIXTURES registration + party
name mapping + tests, no schema migration needed); no secrets or destructive
code. `npm run check` passes except for a pre-existing, unrelated sandbox
issue. The Senate Republican-nomination gap is real and clearly documented,
not a build defect — it is the correct, safety-conforming response to a
genuinely unresolved nomination, matching this codebase's own existing
precedent (Louisiana's fixture omission) and its explicit prohibition on
guessing an undetermined nomination.
