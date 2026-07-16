# Kansas vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Kansas (KS)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Twelfth state
built through this manual track, after AZ, TX, OK, AL, AK, CO, CT, CA, AR,
DE, and FL.

Date: 2026-07-15. Kansas's 2026 candidate-filing deadline (noon, June 1, 2026) has already passed; **the August 4, 2026 primary has NOT happened yet
as of this build** — 20 days in the future. The general election is
November 3, 2026.

## Bottom line

**GO on the approach for a twelfth state.** All 4 KS House districts plus
the Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED`
is on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches, all 35 rows (21 House + 14
Senate).

**Kansas is not Civix-vended** — its official source is a legacy ASP.NET
WebForms page at `sos.ks.gov`. The card's I06 rehearsal had flagged that the
deeper Candidate List path returned HTTP 403 on automated retrieval;
confirmed again this session, but a live `mcp__claude-in-chrome__*` browser
session loads it normally — the 403 is a bot-detection wall, not evidence
the page is broken.

**Kansas's primary is still upcoming**, the same situation Arizona's
original build, and more recently Delaware's, Florida's, and Hawaii's, were
in — every contested Democratic/Republican primary row is recorded
`qualified_for_primary_ballot`, no nominee guessed. Kansas has a genuine
wrinkle Delaware didn't: **Kansas does not cancel an uncontested primary**
(unlike Delaware's Sarah McBride case) — KS-2's sole Democratic filer, Don
Coover, still carries `qualified_for_primary_ballot`, not
`qualified_for_general_ballot`, because Kansas law requires every
Democratic/Republican filer to appear on and be decided by an actual primary
ballot regardless of opposition (see "How this was verified" below).
Libertarian filers, by contrast, bypass the primary entirely under Kansas
law and are recorded as determined general-ballot nominees.

**NO-GO on fan-out to further states in this same session** (per the epic's
one-state-per-session build scoping) and **NO-GO on flipping the flag for
real users** without Muxin's sign-off — same standing gate as every prior
state.

## How this was verified — an ASP.NET dropdown-driven page, browser

automation required for the fetch but not for anything more advanced

Kansas's Secretary of State publishes candidate lists through one page with
a "Choose an election" dropdown covering every election back to 2002:

1. **Candidate SET (who filed) — the same page, two different dropdown
   selections.** `https://sos.ks.gov/elections/elections_upcoming_candidate.aspx`:
   - Selecting **"2026 Primary"** (option value `35`) and submitting returns
     every Democratic and Republican filer for the August 4, 2026 primary —
     11 Senate Democrats, 2 Senate Republicans (including incumbent Roger
     Marshall), and each House district's contested field.
   - Selecting **"2026 General"** (option value `36`) and submitting returns
     every candidate who bypasses the primary entirely — one Libertarian per
     federal contest (Senate + all 4 House districts) plus a handful of
     state-office and judicial-retention rows (not relevant here). No
     Democratic or Republican rows appear on this page at all, confirming
     major-party nominees are genuinely not yet decided.
   - **Mechanical gotcha for future sessions:** this is an ASP.NET WebForms
     postback, not a bookmarkable query string — appending `?election=36` to
     the URL does nothing (confirmed by trying it). On this macOS Chrome
     build, sending `Up`/`Down` arrow keys to the closed `<select>` did NOT
     change its value, and single-character typeahead only advances one
     option per keypress (unreliable to count through 28 options). The
     reliable path was `mcp__claude-in-chrome__form_input` — set the
     select's value directly by its option value, confirmed via `read_page`'s
     option list — then click Submit.
2. **No results-derivation step was needed** (unlike Oklahoma/Arkansas) —
   Kansas's primary is still 20 days out at transcription time, so this
   fixture is a filing-list snapshot, not a post-primary result derivation.
3. **Whether Kansas cancels an uncontested primary was the one genuine
   research question this build had to resolve**, since it directly decides
   KS-2's Don Coover's `ballotStatus`. Resolved via three independent checks,
   none contradicting the others: (a) K.S.A. 25-306a and 25-306b (Kansas's
   own withdrawal statutes) both assume every nominee is printed on and
   decided by an actual primary ballot, with no unopposed-cancellation
   provision anywhere in Chapter 25; (b) Ballotpedia's "Primary election
   cancellations" comparison lists 14 states that cancel an unopposed
   primary (Alabama, Connecticut, Delaware, Florida, Kentucky, Louisiana,
   Nevada, New York, North Carolina, Oklahoma, South Carolina, South Dakota,
   Utah, Virginia) — Kansas is not among them; (c) Ballotpedia's "Primary
   elections in Kansas" page states plainly that "the winner of a primary
   election is the candidate who receives the greatest number of votes cast
   for that office," with no unopposed exception described. Recorded as
   `qualified_for_primary_ballot`, consistent with every other
   Democratic/Republican row in this fixture.
4. **Governing calendar dates** were pulled from Kansas's own official 2026
   election-dates page (`sos.ks.gov/elections/important-election-dates.html`)
   and, for the two statutes governing withdrawal, directly from the Kansas
   Office of Revisor of Statutes (`ksrevisor.gov`). See "Governing calendar
   dates" below for the full list.
5. **Incumbency cross-check**, never guessed from the candidate-list page:
   `https://www.house.gov/representatives` ("By State and District" →
   Kansas) confirms the sitting delegation is Mann (KS-1, R), Schmidt (KS-2,
   R), Davids (KS-3, D), Estes (KS-4, R) — matches this fixture's
   `isIncumbent` rows exactly, no correction needed.
   `https://www.senate.gov/senators/senators-contact.htm` confirms Roger
   Marshall (R-KS) as the sitting senator, also seeking re-election. **This
   app's own FEC-derived `candidates` table was deliberately never used for
   this cross-check** — same rule as every prior state.

**Independent candidates:** none appear in either candidate list as of this
build's retrieval date (2026-07-15). This is a **provisional finding, not a
closed one** — K.S.A. 25-303 sets Kansas's independent-nomination-petition
deadline at noon the day before the primary (August 3, 2026), a full two
months later than the June 1 party-filing deadline. A future independent
filer could still appear between now and then; see the re-check card opened
alongside this build.

**No write-in candidates** appear in either list — Kansas write-in filing is
a separate, distinct process this page does not surface, consistent with how
prior states have treated write-ins as out of scope when a source doesn't
publish them.

**Not used as a source, deliberately:** Ballotpedia was used only as a
secondary corroboration for the uncontested-primary question above (per the
epic's SAFETY rule: comparison/spot-check only, never a primary source of
record) — the actual determination rests on K.S.A. 25-306a/b, Kansas's own
statutes.

## Contest inventory

Kansas has **4 US House districts and 1 US Senate contest in 2026** (Roger
Marshall's Class 2 seat). All 4 House districts + the Senate race are
covered by the general election.

## Full candidate-by-candidate comparison (fixture vs. official source)

| Contest | Candidate               | Party       | Incumbent | Status                       |
| ------- | ----------------------- | ----------- | --------- | ---------------------------- |
| KS-1    | Colin McRoberts         | Democratic  |           | qualified_for_primary_ballot |
| KS-1    | Lauren Reinhold         | Democratic  |           | qualified_for_primary_ballot |
| KS-1    | Tracey Mann             | Republican  | ✓         | qualified_for_primary_ballot |
| KS-1    | Craig Musser            | Republican  |           | qualified_for_primary_ballot |
| KS-1    | Steven Jacob            | Libertarian |           | qualified_for_general_ballot |
| KS-2    | Don Coover              | Democratic  |           | qualified_for_primary_ballot |
| KS-2    | Derek Schmidt           | Republican  | ✓         | qualified_for_primary_ballot |
| KS-2    | Chad E Young            | Republican  |           | qualified_for_primary_ballot |
| KS-2    | John Hauer              | Libertarian |           | qualified_for_general_ballot |
| KS-3    | Sharice L. Davids       | Democratic  | ✓         | qualified_for_primary_ballot |
| KS-3    | Sarah Preu              | Democratic  |           | qualified_for_primary_ballot |
| KS-3    | Eric Jenkins            | Republican  |           | qualified_for_primary_ballot |
| KS-3    | Chase LaPorte           | Republican  |           | qualified_for_primary_ballot |
| KS-3    | Steven A Hohe           | Libertarian |           | qualified_for_general_ballot |
| KS-4    | Chris Carmichael        | Democratic  |           | qualified_for_primary_ballot |
| KS-4    | Cole Epley              | Democratic  |           | qualified_for_primary_ballot |
| KS-4    | Ryan Gilbert            | Democratic  |           | qualified_for_primary_ballot |
| KS-4    | Katy Tyndell            | Democratic  |           | qualified_for_primary_ballot |
| KS-4    | Ron Estes               | Republican  | ✓         | qualified_for_primary_ballot |
| KS-4    | Frank A. McCollum       | Republican  |           | qualified_for_primary_ballot |
| KS-4    | Drew Cranmer            | Libertarian |           | qualified_for_general_ballot |
| Senate  | Damon Anderson          | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Christy Davis           | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Adam Hamilton           | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Jason Hart              | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Kevin Latz              | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Erik Murray             | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Sandy Spidel Neumann    | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Anne Parelkar           | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Patrick C. Schmidt      | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Michael "Mike" Soetaert | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Noah Taylor             | Democratic  |           | qualified_for_primary_ballot |
| Senate  | Roger Marshall          | Republican  | ✓         | qualified_for_primary_ballot |
| Senate  | Pond Naramore           | Republican  |           | qualified_for_primary_ballot |
| Senate  | David C Graham          | Libertarian |           | qualified_for_general_ballot |

Every row above is a literal transcription from the live "2026 Primary" /
"2026 General" candidate-list pages — no name, party, or status was inferred
or guessed.

## What was built (delta from the prior-state pattern)

All of the prior states' infrastructure is state-agnostic and required **no
changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, `RepCard.tsx`, and the importer's array-shaped
`FIXTURES` map. No new party code was needed (`LIB` already existed).

**New for this build:**

- `scripts/congressional-rosters/ks-official-roster-2026.ts` (new) — 21
  House rows (all 4 districts) + 14 Senate rows. Full sourcing, methodology,
  and known limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `KS` in `FIXTURES` with
  separate house/senate entries, the same two-entry pattern as TX/OK/AL/AK/
  CO/AR/DE/FL.
- `src/lib/server/officialRoster.test.ts` — 9 new tests: `getOfficialRoster`
  narrowing across all 4 KS districts + the Senate contest, the KS-2
  uncontested-but-still-primary-stage finding, a blanket check that every
  Libertarian row is `qualified_for_general_ballot` and every DEM/REP row is
  `qualified_for_primary_ballot` with zero `runoff_pending` rows anywhere,
  `isIncumbentSeekingReelection` for all 5 seats, and `lookupChallengers`
  wiring (both chambers covered, FEC query skipped — 2 calls not 3; KS-2,
  KS-4, and the Senate race each verified candidate-by-candidate).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean. The
  only failures were 3 pre-existing, environment-caused Playwright/Chromium
  sandbox launch failures in `scripts/design/capture-shared.test.ts`
  (`mach_port_rendezvous... Permission denied`, a macOS sandbox restriction
  unrelated to this change — confirmed reproducible on a clean re-run, and
  confirmed those same 3 files/tests pass in isolation outside the full
  parallel suite). `officialRoster.test.ts`: 132/132 passing.
- KS's 35 rows (21 House + 14 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  `pg`-confirmed row-count query both times (35 total, 21 house / 14
  senate, house split 5/4/5/7 across districts 1-4 — not just the
  importer's own self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for KS-2, KS-4, and the
  Senate race, diffed against the fixture. **0 mismatches.** KS-2 correctly
  excludes incumbent Derek Schmidt and returns Don Coover (Democrat), Chad E
  Young (Republican), and John Hauer (Libertarian) as challengers, all with
  `isRunoffPending: false`. KS-4 correctly excludes incumbent Ron Estes and
  returns all 4 Democratic primary filers, the Republican primary filer, and
  the Libertarian general filer. The Senate race correctly excludes
  incumbent Roger Marshall and returns all 11 Democratic primary filers, the
  Republican primary filer (Pond Naramore), and the Libertarian general
  filer (David C Graham) — every returned challenger carried the correct
  mapped party name and `isRunoffPending: false`.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).
- **Operational note (not a code issue):** `.env.local`'s cached copy of
  `ROSTER_STAGING_DATABASE_URL` was stale (password authentication failed
  against the live staging branch) — the branch itself was never broken;
  Vercel's copy of the same variable (Preview/Development, updated ~9h
  before this build) was current. Recovered via `vercel link` + `vercel env
pull` inside the build worktree rather than any credential rotation. Flagged
  here since a future session hitting the same stale-`.env.local` symptom
  should try a fresh `vercel env pull` before assuming the branch itself is
  broken.

## Governing calendar dates (per the epic's standing requirement)

- **June 1, 2026, 12:00 p.m.** — deadline to file as a Democratic/Republican
  candidate; already passed as of this build. Also, per K.S.A. 25-306a, the
  deadline for a candidate to withdraw from an already-filed primary
  nomination (same day) — also already passed.
- **August 3, 2026, 12:00 p.m.** — deadline for independent nomination
  petitions (K.S.A. 25-303) — still open as of this build's retrieval date;
  see "Independent candidates" above and the re-check card opened alongside
  this build.
- **August 4, 2026** — Primary Election.
- **September 1, 2026** — last day for the State Board of Canvassers to
  certify official primary results; also K.S.A. 25-306b's deadline for a
  post-primary nominee to withdraw (permitted only for severe medical
  hardship or non-Kansas residency, certified to the Secretary of State).
- **November 3, 2026** — General Election.
- **December 1, 2026** — last day for the State Board of Canvassers to
  certify official general-election results.

(Source: `sos.ks.gov/elections/important-election-dates.html`;
`ksrevisor.gov/statutes/chapters/ch25/025_003_0006a.html` (25-306a);
`ksrevisor.gov/statutes/chapters/ch25/025_003_0006b.html` (25-306b);
`ksrevisor.gov/statutes/chapters/ch25/025_003_0003.html` (25-303); all
confirmed 2026-07-15.)

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every Democratic/Republican contest's nomination is undetermined**
  pending the August 4, 2026 primary — recorded as `qualified_for_primary_ballot`,
  not guessed. This fixture needs a follow-up update once the primary is
  certified (by September 1, 2026 at the latest); see the re-check card
  opened alongside this build.
- **Independent-candidate coverage is provisional, not closed** — Kansas's
  independent-petition deadline (noon, August 3, 2026) is still in the
  future as of this retrieval; a future filer could still appear.
- **No write-in candidates** are tracked by this fixture — Kansas write-in
  filing is a distinct process this page does not surface, consistent with
  how prior states have treated write-ins their own source doesn't publish.
- Names are recorded as they appear on the official candidate-list page; not
  independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/kansas-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ks-official-roster-2026.ts`.
- **Official Kansas source URLs used:**
  - `https://sos.ks.gov/elections/candidates.html` (candidates hub)
  - `https://sos.ks.gov/elections/elections_upcoming_candidate.aspx`
    (Candidate Lists — dropdown selected to "2026 Primary" and "2026
    General" in turn; both retrieved live via browser session, 2026-07-15)
  - `https://sos.ks.gov/elections/important-election-dates.html` (official
    2026 election calendar)
  - `https://ksrevisor.gov/statutes/chapters/ch25/025_003_0006a.html`
    (K.S.A. 25-306a)
  - `https://ksrevisor.gov/statutes/chapters/ch25/025_003_0006b.html`
    (K.S.A. 25-306b)
  - `https://ksrevisor.gov/statutes/chapters/ch25/025_003_0003.html`
    (K.S.A. 25-303)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Kansas source, cited because it materially confirmed the
    `isIncumbent` data)
  - `https://www.senate.gov/senators/senators-contact.htm` (Senate
    incumbency cross-check only)

## GO/NO-GO verdict

**GO on the approach for a twelfth state — the manual track continues to
generalize across another non-Civix ASP.NET source, and the
uncontested-primary-still-requires-a-ballot finding (Kansas's own genuine
wrinkle) is handled correctly without inventing new schema. NO-GO on
proceeding to more states in this same session or real users without
further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   prior state. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **A follow-up update to this fixture is needed after September 1,
   2026**, once the August 4 primary is certified — see the re-check card
   opened alongside this build (`NOT BEFORE: 2026-09-01`).
3. **The independent-petition window (through August 3, 2026) should be
   re-checked** for any late filer — folded into the same re-check card
   above rather than a separate one, since both dates resolve close enough
   together that one re-check pass covers both.
