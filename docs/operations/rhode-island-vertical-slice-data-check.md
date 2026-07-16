# Rhode Island vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Rhode Island (RI)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16 — Rhode Island's own "deadline to certify nomination
papers" for federal/state offices, per its 2026 Election Calendar. The
September 9, 2026 primary is still upcoming; the November 3, 2026 general
election follows.

## Bottom line

**GO on the approach for the tenth state.** Both RI US House districts plus
the Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across all 3 contests.

**Rhode Island is not Civix-vended** (`vote.sos.ri.gov`, not
`*.civixapps.com`) — its own custom "Voter Information Center" portal. The
portal's search page 403s on a plain fetch, same symptom as a Civix portal,
but a direct static Excel export (found via the page's own DOM, not
documented anywhere) sidesteps browser automation entirely — see
"Operational navigation" below.

**RIGL § 17-15-11 ("dispensation with primary when no contest") is the key
statutory rule this build applies**, confirmed via Justia's legal database:
Rhode Island does not hold a primary in a race with no intra-party
contest — an unopposed filer's name is omitted from the primary ballot and
printed directly on the general-election ballot instead. The state's own
candidate export doesn't pre-split contested-vs-uncontested the way
Delaware's two separate pages did; this build derives it by grouping the
export's rows by (office, party) and applying the statute.

## Candidate-by-candidate comparison

### US House

| District | Name | Party | Incumbent | Contested? | Ballot status |
|---|---|---|---|---|---|
| 1 | Gabe Amo | DEM | Yes (confirmed house.gov) | No — sole D filer | `qualified_for_general_ballot` |
| 1 | Kellie Keenan | REP | No | No — sole R filer | `qualified_for_general_ballot` |
| 1 | Pedro DeSouza | IND | No | n/a (general track) | `declared_general_ballot_intent` |
| 2 | Seth Magaziner | DEM | Yes (confirmed house.gov) | Yes (vs. Dickinson) | `qualified_for_primary_ballot` |
| 2 | Spencer Dickinson | DEM | No | Yes (vs. Magaziner) | `qualified_for_primary_ballot` |
| 2 | Stephen Skoly | REP | No | Yes (vs. Mellor) | `qualified_for_primary_ballot` |
| 2 | Victor Mellor | REP | No | Yes (vs. Skoly) | `qualified_for_primary_ballot` |

### US Senate (Reed's Class II seat; Whitehouse's Class I seat is not up in 2026)

| Name | Party | Incumbent | Contested? | Ballot status |
|---|---|---|---|---|
| John F. Reed | DEM | Yes (confirmed senate.gov) | Yes (vs. Burbridge, Munoz) | `qualified_for_primary_ballot` |
| Connor Burbridge | DEM | No | Yes | `qualified_for_primary_ballot` |
| Luis Daniel Munoz | DEM | No | Yes | `qualified_for_primary_ballot` |
| Raymond McKay | REP | No | No — sole R filer | `qualified_for_general_ballot` |
| Michael Bahry | IND | No | n/a (general track) | `declared_general_ballot_intent` |

Every row above traces directly to the RI Dept. of State's own "Declared
Candidates Report" export (see Sources), filtered to `OFFICE` in
`{SENATOR IN CONGRESS, REPRESENTATIVE IN CONGRESS DISTRICT 1,
REPRESENTATIVE IN CONGRESS DISTRICT 2}`. `DECLARATION` was `Valid` for all
12 rows — no invalid or pending filings among the federal rows.

## Operational navigation

`vote.sos.ri.gov/Candidates/CandidateSearch` is a "Candidates in Upcoming
Elections" page with a `<select>` for election date and, separately, a
static link labeled "Declared Candidates Report (Available in excel)". The
search page itself returned `HTTP 403` on a plain `WebFetch`/`curl` request
(same 403-on-non-browser-fetch symptom the Civix playbook documents, though
this portal is not Civix) — a real browser session (`mcp__claude-in-chrome__*`)
was needed just to load the page and read the report link's href via the
`find` tool. That href resolved to
`https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx` — a
**directly `curl`-fetchable static file, no browser session, no auth, no
403**. This was the single biggest time-saver: once the export URL was in
hand, no further browser automation was needed for the candidate data
itself.

The export is one sheet (`CandidateElection`, ~3,200 rows covering every RI
office — federal, state, and local) with 34 columns. The 12 relevant rows
were extracted by filtering `OFFICE` to the three federal values above.
Columns that mattered beyond name/party/office/district:
- `DECLARATION` — validity flag (`Valid` for all 12 federal rows).
- `ELECTION DATE - NAME` — which election cycle the Declaration of
  Candidacy was filed for (`09/09/2026 - STATEWIDE PRIMARY` vs.
  `11/03/2026 - STATEWIDE GENERAL ELECTION`); this is how the two
  Independent filers are distinguished from party primary filers in RI's
  single unified list. It is **not** a reliable signal for contested-vs-
  uncontested within the primary track — every primary-track federal filer
  shows the same primary-election value regardless of whether their
  primary will actually be held (see the RIGL § 17-15-11 rule above).
- `NEED N.P.` / `ON E.B.` — whether nomination-papers signature
  verification is still pending; both Independents show `Yes`/`No`
  respectively, consistent with `declared_general_ballot_intent` rather
  than a final general-ballot certification.
- `ON P.B` / `B.P.N` / `ON E.B` / `B.P.E` (primary/general ballot placement)
  and `W.P` / `W.E` (withdrawal flags) — all blank/`No` for every row at
  retrieval. This is expected, not a data gap: the state's own election
  calendar places the ballot-placement lottery for both ballots at July 17,
  2026, 5:00 p.m. — one day **after** this snapshot (retrieved on RI's own
  "deadline to certify nomination papers" day, July 16).

The RI 2026 Election Calendar
(`vote.sos.ri.gov/Forms/Elections/Guides/2026ElecCal.pdf`) is an 18-page PDF
with full statutory citations; `pypdf` text extraction worked directly (no
scanned/image pages encountered), no visual-render fallback needed.

Incumbency was cross-checked independently, never via this app's FEC-derived
table: `senate.gov`'s official "Contacting U.S. Senators" state list
(confirms Reed as RI's Class II senator). `house.gov/representatives`'s "By
State and District" tab — the same long, lazy-loading single page the Civix
playbook documents for Texas (rows don't populate in the DOM until scrolled
near) — required a `find` + `scroll_to` before a screenshot showed Amo
(District 1) and Magaziner (District 2), both confirmed Democrats.

## Governing dates (all sourced from RI's own 2026 Election Calendar,
`vote.sos.ri.gov/Forms/Elections/Guides/2026ElecCal.pdf`, retrieved
2026-07-16)

- **July 16, 2026** — deadline to certify nomination papers (federal/state
  offices); the day this build's snapshot was taken.
- **July 17, 2026, 5:00 p.m.** — ballot-placement lottery for both the
  primary and general election ballots (RIGL § 17-15-8, § 17-19-9.1).
- **July 17, 2026** — deadline for federal/state candidate withdrawals
  (RIGL § 17-14-15) — one day after this snapshot; not yet reflected.
- **July 20, 2026** — deadline for the State Board of Elections' decisions
  on eligibility/nomination-paper-sufficiency objections for federal/state
  offices (RIGL § 17-14-14(a)(b)).
- **September 9, 2026** — party primaries (RIGL § 17-15-1); resolves the
  three contested races above (Senate D, RI-2 D, RI-2 R).
- **September 10, 2026, 4:00 p.m.** — deadline to submit recount requests
  (RIGL § 17-15-34).
- **September 11, 2026** — deadline to fill a vacancy caused by a nominee's
  withdrawal/removal after the primary (RIGL § 17-15-38(a)); also local
  candidates' certification date.

A dated follow-up card ("Re-check official roster: Rhode Island (RI) —
after primary certification", `NOT BEFORE: 2026-09-11`) was opened in the
backlog per the epic's date-gate convention, covering both the primary
outcome and a check of the July 17/20 near-term dates.

## Known gaps / limitations

- This build is a same-day snapshot of RI's own certify-nomination-papers
  deadline (July 16, 2026); the July 17 withdrawal deadline and ballot
  lottery, and the July 20 objections-decision deadline, are all still
  ahead as of retrieval — the dated follow-up card covers the recheck.
- Names recorded exactly as printed in the official export; not
  cross-checked against a third document beyond the incumbency checks
  above.
- No `runoff_pending` rows — Rhode Island's federal primaries have no
  runoff mechanism (plurality wins).

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/ri-official-roster/docs/operations/rhode-island-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/rhode-island-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/ri-official-roster/scripts/congressional-rosters/ri-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ri-official-roster-2026.ts`
  once merged to main).
- **Official Rhode Island source URL(s) used:**
  - `https://vote.sos.ri.gov/Candidates/CandidateSearch` (RI Dept. of State
    "Candidates in Upcoming Elections" portal page)
  - `https://vote.sos.ri.gov/Forms/elections/Reports/Candidates.xlsx` (RI
    Dept. of State "Declared Candidates Report," retrieved 2026-07-16 —
    primary transcription source)
  - `https://vote.sos.ri.gov/Forms/Elections/Guides/2026ElecCal.pdf` (RI
    Dept. of State official "2026 Election Calendar" — every governing date
    cited above)
  - `https://law.justia.com/codes/rhode-island/title-17/chapter-17-15/section-17-15-11/`
    (RIGL § 17-15-11 — legal basis for the unopposed-primary-to-general
    promotion)
  - `https://www.senate.gov/senators/senators-contact.htm` (incumbency
    cross-check only — confirms Jack Reed as RI's sitting Class II Senator)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    "By State and District" tab confirms Gabe Amo (District 1) and Seth
    Magaziner (District 2))

## How this was verified

1. Fixture (`ri-official-roster-2026.ts`) built from the export above,
   importing shared types from `types.ts` only.
2. Registered in `scripts/ingest/official-roster.ts`'s `FIXTURES.RI`
   (house + senate blocks).
3. Test coverage added to `src/lib/server/officialRoster.test.ts`: district
   narrowing (RI-1, RI-2), senate narrowing, unopposed-vs-contested
   ballot-status assertions, incumbency checks (Amo, Magaziner, Reed), and
   `lookupChallengers` wiring for both districts + Senate — 207 tests pass.
4. `npx tsc --noEmit` clean — no type errors.
5. No migration needed — `db/schema.ts` unchanged since migration 0016.
6. Importer run against the isolated **staging** Neon branch
   (`ROSTER_STAGING_DATABASE_URL`, pulled via `vercel env pull
   --environment=preview`, explicitly — never the ambient `DATABASE_URL`
   and never persisted to a file left in the repo). Confirmed by a **direct
   row-count query** against `officialRosterCandidates` (12 rows,
   7 House + 5 Senate), then re-run to confirm **no duplication** on a
   second import (still 12 rows).
7. End-to-end: `lookupChallengers("RI", 1, 2026)`,
   `lookupChallengers("RI", 2, 2026)`, and the Senate rows returned by both,
   called directly against staging with `OFFICIAL_ROSTER_ENABLED=1` set
   inline (never persisted) — **0 mismatches** against the fixture:
   - RI-1: Amo correctly excluded as incumbent; Keenan (Republican) and
     DeSouza (Independent) render as challengers, `isRunoffPending: false`.
   - RI-2: Magaziner correctly excluded as incumbent; Dickinson (Democrat),
     Skoly (Republican), and Mellor (Republican) render, all
     `isRunoffPending: false`.
   - Senate: Reed correctly excluded as incumbent; Burbridge, Munoz
     (Democrat), McKay (Republican), and Bahry (Independent) render.
8. Prod was **never** touched — every database command used
   `ROSTER_STAGING_DATABASE_URL` explicitly, and `OFFICIAL_ROSTER_ENABLED`
   was only ever set inline for verification.

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete and pass
`npm run check` cleanly (typecheck clean, 207/207 tests pass in the
official-roster test file). The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag
on — are both done, with 0 mismatches. Per the epic's "MERGE PROMPTLY, NO
SEPARATE SIGN-OFF GATE" standing requirement, this branch would normally
merge directly after this self-vet — **for this run, per explicit
instruction, the branch is pushed and the PR opened non-draft, but left
unmerged for a separate babysit-PRs session to rebase/watch CI/merge/close
out.**

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for RI and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required no earlier than September 11,
   2026** (primary + recount-window settled) — opened on the backlog per
   the NOT BEFORE date-gate convention, and also covers a check of the
   July 17/20 near-term dates that fell just after this build.
