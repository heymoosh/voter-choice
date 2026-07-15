# Texas vertical slice — built and verified live (official-source pipeline)

Card: `8530a468-079a-4b00-8588-ce702050aea4` ("[P0] Import + verify official
roster: Texas (TX)"), parent epic `c5a813bb` (nationwide official-source
congressional roster). Depends on `637c2583` (Arizona vertical slice).

Date: 2026-07-15. Texas's 2026 primary (2026-03-03) and runoff (2026-05-26)
are already past; the general election is 2026-11-03.

**Why Texas, specifically:** Arizona has 0 US Senate contests in 2026, so the
`office: "senate"` (statewide) code path in `races.ts`/`officialRoster.ts` was
built but never exercised end-to-end. Texas has an active 2026 US Senate race
— this build is the sanity check that the Senate path actually works, not
just the House path.

## Bottom line

**GO on the approach for a second state, and the Senate code path is now
proven live, not just built.** All 38 TX House districts plus the Senate
race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against a real Neon staging branch through the actual
`lookupChallengers`/`isIncumbentSeekingReelection` code paths a real request
would hit — 0 mismatches across all 39 contests. The flag defaults off; zero
behavior change for any state until explicitly enabled, and nothing has been
enabled in production.

**A real, shared bug was found and fixed along the way:** the `official_roster_candidates`
unique index (migration `0015`) never actually enforced idempotency for
statewide (Senate) rows — see "A bug this build found" below. This is fixed
in migration `0016`, applied to staging. It would have silently duplicated
rows on every future state with a Senate race; AZ (house-only) never hit it.

**NO-GO on fan-out to further states** until the manual track has covered a
few more (per the plan's 2026-07-15 revision), and **NO-GO on flipping the
flag for real users** without Muxin's sign-off — same standing gate as AZ.

## How this was verified — multi-source, because Texas's official portal
doesn't publish a general-election candidate list yet

Unlike Arizona, whose official source was two static PDFs, Texas's official
candidate system (`goelect.txelections.civixapps.com`, a Civix-vended
single-page application) had **no `2026 NOVEMBER GENERAL ELECTION` bucket
published** as of the retrieval date — only primary, runoff, and special
election filing records existed. The general-ballot nominee for each seat
therefore had to be **derived from two official sub-systems, not read
directly from one**:

1. **Election Night Results** (`https://goelect.txelections.civixapps.com/ivis-enr-ui/races`)
   — certified vote totals for the 2026 Democratic/Republican primary and
   primary-runoff elections. For each district, the certified winner of the
   applicable primary or runoff becomes that party's general-ballot nominee.
   Confirmed 100% counties/polling-locations reporting (certified, not
   live/partial) for every election queried.
2. **U.S. House official member directory** (`https://www.house.gov/representatives`,
   "By State and District" → Texas) — the incumbency cross-check. Neither of
   the TX portal's own incumbency signals proved reliable: Election Night
   Results' `(I)` marker and Candidate Information's explicit
   `INCUMBENT: YES/NO` field both failed to flag Rep. Al Green (TX-9's
   actual sitting member) because he ran in a *different* district (TX-18)
   that cycle — house.gov's district-by-district roster, cross-matched by
   surname, is the only reliable source found. **This app's own FEC-derived
   `candidates` table was deliberately never used for this cross-check** —
   that data source is exactly the kind of stale/inaccurate roster this
   feature exists to route around (Muxin, 2026-07-15).
3. **Independent Declarations of Intent** (official SoS PDF,
   `https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf`)
   — every declared independent candidate for every office, including all 38
   US House districts and the Senate race. This is a *declaration*-stage
   document (petition-signature verification still pending), recorded with
   `ballotStatus: "declared_general_ballot_intent"` rather than
   `"qualified_for_general_ballot"` to keep that distinction honest.

**Not used as a source, deliberately:** Ballotpedia. The prior TX Senate
research (`docs/operations/candidate-roster-source-decision-report.md`, PR
#296) used Ballotpedia as a comparison oracle for the Senate race, including
a Libertarian candidate (Ted Brown) with no independent official
corroboration. This build could not find an official source for any
Libertarian or Green congressional nominee (Texas nominates minor parties by
convention, not primary) — see "Known gaps" below.

**Operational mechanics** (the parts that took the most work and are now
written up for reuse — see `docs/operations/nationwide-congressional-roster-plan.md`,
"Civix portal operational playbook", added by this session): the
Civix candidate portal is a JS single-page app that 403s on any non-browser
fetch and requires a real rendered browser session; its `Candidate Information`
form's Office Name filter is a required single-select (no bulk "all
districts" query); its Election Night Results page uses a virtualized
scrolling list that only renders ~3 races at a time to page-reading tools,
which is why the exhaustive 38-district pull for this build used a scripted
Playwright pass (`chromium.launch()`, real DOM cell extraction, incremental
scroll-and-collect) rather than manual GUI reading — a one-off scraping
script, not committed to the repo (this fixture file is the only durable
artifact of that pass).

## Contest inventory

Texas has **38 US House districts and 1 US Senate contest in 2026** (Cornyn's
seat). All 38 House districts + the Senate race are covered by the general
election.

## What was built (delta from the AZ pattern)

Most of the AZ vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader (already handled Senate via `district: null`),
`officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, and `RepCard.tsx`.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` (new) — `OfficialBallotStatus` and
  `OfficialRosterEntry` extracted out of the AZ fixture so state fixtures
  don't depend on each other. `district` widened to `string | null`
  (statewide contests). Two new `OfficialBallotStatus` values added:
  `qualified_for_general_ballot` (certified primary/runoff winner) and
  `declared_general_ballot_intent` (independent declaration, pre-petition-
  verification). `party` widened to include `"IND"`.
- `scripts/congressional-rosters/tx-official-roster-2026.ts` (new) — 111
  House rows (all 38 districts: major-party nominees + declared
  independents) + 7 Senate rows (Talarico-D, Paxton-R, 5 declared
  independents). Full sourcing, methodology, and known limitations are in
  the file's own header docblock.
- `scripts/ingest/official-roster.ts` — `FIXTURES` changed from one fixture
  per state to an array of fixtures per state (`Record<string,
  OfficialRosterFixture[]>`), so a state can register separate House and
  Senate fixtures under different `office`/`stage`/`sourceUrl` values. AZ's
  existing single fixture wrapped unchanged; byte-identical AZ behavior
  confirmed by the existing AZ test suite still passing.
- `db/migrations/0016_fix_official_roster_null_district_uniqueness.sql` (new)
  + `db/schema.ts` — see "A bug this build found" below.
- `src/prototype/VoterChoiceApp.tsx` — the "not seeking re-election" badge
  copy softened from "Not seeking re-election in 2026" to **"Not on the 2026
  ballot"** (EN + ES), because it now also covers a primary/runoff *loser*
  (e.g. TX-9's Al Green, TX-33's Marc Veasey), not just a chosen
  non-candidacy (AZ-01/AZ-05's Schweikert/Biggs case). Applies to both
  states' badges — the key is unchanged, `RepCard.tsx` needed no edit.
- `src/lib/server/officialRoster.test.ts` — 8 new tests covering the Senate
  path AZ never exercised: `getOfficialRoster` senate narrowing, both-
  chambers-covered `lookupChallengers` (confirms the FEC query is skipped —
  2 calls not 3), open-seat/vacancy `isIncumbentSeekingReelection`, and
  independent-party display-name mapping. The "uncovered state" control
  moved off `"TX"` (now a real, covered state) to `"WY"`.

## A bug this build found (not TX-specific — fixed for every state)

The importer's idempotency claim ("re-run safely after a transcription
fix") was **false** for any state with a Senate contest. Migration `0015`'s
unique index is a plain `CREATE UNIQUE INDEX` on `(state, office, district,
election_year, name, stage)`. In Postgres, `NULL` is never equal to `NULL`
for uniqueness purposes — and every statewide row has `district = NULL`.
Re-running the TX importer a second time (to test idempotency, per the
card's own goal condition) silently **doubled** all 7 Senate rows instead of
updating them; the 38 House districts (all non-null districts) deduped
correctly and masked nothing was wrong with the House side.

Fix: migration `0016` recreates the index `NULLS NOT DISTINCT` (Postgres 15+;
staging confirmed on PostgreSQL 17). `db/schema.ts` switched from
`uniqueIndex(...)` (which has no `nullsNotDistinct()` option in this
drizzle-orm version) to `unique(...).nullsNotDistinct()`, so the schema
source of truth matches the actual constraint. Non-destructive — no column,
table, or data-type change. Applied to staging only; the duplicate rows this
bug produced during this session's testing were deleted and TX was
re-imported cleanly. **This migration needs to ship to production whenever
the flag is eventually flipped for any state** — it's a correctness fix, not
optional polish, since without it every future re-import of a Senate-covered
state duplicates rows indefinitely.

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean, twice
  (once before the migration-0016 fix, once after the `schema.ts` change).
  162 test files, 3059 tests passing, 5 pre-existing `todo` (no failures).
- Migration `0016` applied to the isolated Neon **staging** branch (via
  `ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`, which is prod in this environment). TX's 118 rows (111
  House + 7 Senate) imported, re-imported, and confirmed idempotent by
  direct row-count query (118 both times, not just the importer's own
  self-reported count — the earlier duplicate-row bug would have passed a
  naive check of the importer's log line alone).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  and `isIncumbentSeekingReelection` directly — the real code path a request
  hits — for all 38 TX House districts and the Senate race, diffed against
  the fixture. **0 mismatches across all 39 contests.** Full literal output
  (candidate name, incumbency call, party as the app would render it):

  ```
  TX-01 — incumbent NATHANIEL MORAN, seekingReelection2026=true
    - YOLANDA R. PRINCE (Democrat)
    - NATHAN LEVIN JACKSON (Independent)

  TX-02 — incumbent Crenshaw, seekingReelection2026=false
    - SHAUN FINNIE (Democrat)
    - STEVE TOTH (Republican)

  TX-03 — incumbent KEITH SELF, seekingReelection2026=true
    - EVAN HUNT (Democrat)
    - ANTHONY MICHAEL DEATS (Independent)

  TX-04 — incumbent PAT FALLON, seekingReelection2026=true
    - JASON PEARCE (Democrat)

  TX-05 — incumbent LANCE GOODEN, seekingReelection2026=true
    - CHELSEY HOCKETT (Democrat)
    - DEADRA ANN MARSH-FOY (Independent)

  TX-06 — incumbent JAKE ELLZEY, seekingReelection2026=true
    - DANNY MINTON (Democrat)

  TX-07 — incumbent LIZZIE PANNILL FLETCHER, seekingReelection2026=true
    - ALEXANDER HALE (Republican)
    - ROBERTO CONRADO CENTENO (Independent)
    - ROYCE DONALD BROUGH JR. (Independent)

  TX-08 — incumbent Luttrell, seekingReelection2026=false
    - LAURA JONES (Democrat)
    - JESSICA HART STEINMANN (Republican)

  TX-09 — incumbent Green, seekingReelection2026=false
    - LETICIA GUTIERREZ (Democrat)
    - ALEX MEALER (Republican)
    - ROGELIO MORALES JR. (Independent)

  TX-10 — incumbent McCaul, seekingReelection2026=false
    - CAITLIN ROURK (Democrat)
    - CHRIS GOBER (Republican)
    - CASEY W MALISH (Independent)
    - ROBERT DOUGLAS MILLS (Independent)

  TX-11 — incumbent AUGUST PFLUGER, seekingReelection2026=true
    - CLAIRE REYNOLDS (Democrat)
    - JOHN PATRICK FARDAL (Independent)
    - SEAN MICHAEL BENSON (Independent)

  TX-12 — incumbent CRAIG GOLDMAN, seekingReelection2026=true
    - ANGELA "HELI" RODRIGUEZ PRILLIMAN (Democrat)

  TX-13 — incumbent RONNY JACKSON, seekingReelection2026=true
    - MARK NAIR (Democrat)

  TX-14 — incumbent RANDY WEBER, seekingReelection2026=true
    - THURMAN BILL BARTIE (Democrat)

  TX-15 — incumbent MONICA DE LA CRUZ, seekingReelection2026=true
    - BOBBY PULIDO (Democrat)

  TX-16 — incumbent VERONICA ESCOBAR, seekingReelection2026=true
    - ADAM BAUMAN (Republican)
    - RENE NICHOLAS FIERRO (Independent)

  TX-17 — incumbent PETE SESSIONS, seekingReelection2026=true
    - CASEY SHEPARD (Democrat)
    - STANTON JOSEPH MICHAEL COLLINS JR. (Independent)

  TX-18 — incumbent CHRISTIAN DASHAUN MENEFEE, seekingReelection2026=true
    - RONALD DWAYNE WHITFIELD (Republican)
    - VALENCIA LANA WILLIAMS (Independent)

  TX-19 — incumbent Arrington, seekingReelection2026=false
    - KYLE RABLE (Democrat)
    - TOM SELL (Republican)
    - MICHAEL ISMAEL GARCIA (Independent)

  TX-20 — incumbent JOAQUIN CASTRO, seekingReelection2026=true
    - EDGARDO RAFAEL BAEZ (Republican)
    - ADAM NEIL JONASZ (Independent)
    - GERARD ANTHONY VILLALOBOS (Independent)

  TX-21 — incumbent Roy, seekingReelection2026=false
    - KRISTIN HOOK (Democrat)
    - MARK TEIXEIRA (Republican)
    - ELDON DANIEL MCQUEEN (Independent)

  TX-22 — incumbent TREVER NEHLS, seekingReelection2026=true
    - MARQUETTE GREENE-SCOTT (Democrat)

  TX-23 — vacant seat (house.gov), no incumbent
    - KATY PADILLA STOUT (Democrat)
    - BRANDON HERRERA (Republican)
    - BENJAMIN E. MENDOZA (Independent)
    - MATTHEW HAMILTON SCHAUB (Independent)
    - PATTI ANN HALE-ASHE (Independent)
    - VERONICA WILLIAMS (Independent)

  TX-24 — incumbent BETH VAN DUYNE, seekingReelection2026=true
    - KEVIN BURGE (Democrat)

  TX-25 — incumbent ROGER WILLIAMS, seekingReelection2026=true
    - DIONE SIMS (Democrat)

  TX-26 — incumbent BRANDON GILL, seekingReelection2026=true
    - STEVEN SHOOK (Democrat)

  TX-27 — incumbent MICHAEL CLOUD, seekingReelection2026=true
    - TANYA LLOYD (Democrat)
    - TRAVIS DANIEL MCQUEEN (Independent)

  TX-28 — incumbent HENRY CUELLAR, seekingReelection2026=true
    - TANO E. TIJERINA (Republican)
    - ADRIEL VENTURA LOPEZ (Independent)
    - FRANCISCO JAVIER MARTINEZ (Independent)

  TX-29 — incumbent SYLVIA GARCIA, seekingReelection2026=true
    - MARTHA FIERRO (Republican)

  TX-30 — incumbent Crockett, seekingReelection2026=false
    - FREDERICK D. HAYNES III (Democrat)
    - EVERETT JACKSON (Republican)

  TX-31 — incumbent JOHN CARTER, seekingReelection2026=true
    - JUSTIN EARLY (Democrat)
    - LARICE NATASHIA WOODS (Independent)

  TX-32 — incumbent Johnson, seekingReelection2026=false
    - DAN BARRIOS (Democrat)
    - JACE YARBROUGH (Republican)

  TX-33 — incumbent Veasey, seekingReelection2026=false
    - COLIN ALLRED (Democrat)
    - PATRICK DAVID GILLESPIE (Republican)
    - BRENT ALAN BROWN (Independent)
    - PAYTON KARLEY JACKSON (Independent)
    - WILLIAM BRADLEY TUCKER (Independent)

  TX-34 — incumbent VICENTE GONZALEZ, seekingReelection2026=true
    - ERIC FLORES (Republican)

  TX-35 — incumbent Casar, seekingReelection2026=false
    - JOHNNY C. GARCIA (Democrat)
    - CARLOS DE LA CRUZ (Republican)
    - ANTHONY RICHARD SISSINE JR. (Independent)
    - RAFAEL ALCOSER III (Independent)
    - SUZANNE L. WYNN (Independent)

  TX-36 — incumbent BRIAN BABIN, seekingReelection2026=true
    - RHONDA HART (Democrat)
    - HAL JUSTIN RIDLEY JR. (Independent)

  TX-37 — incumbent Doggett, seekingReelection2026=false
    - GREG CASAR (Democrat)
    - LAUREN B. PEÑA (Republican)
    - JAME NICHOLAS KINNEY (Independent)

  TX-38 — incumbent Hunt, seekingReelection2026=false
    - MELISSA MCDONOUGH (Democrat)
    - JON BONCK (Republican)
    - SCOTT RALSTON CUBBLER (Independent)
    - WILLIAM MISKEY TAGGART IV (Independent)

  U.S. SENATE — incumbent Cornyn NOT on general ballot (lost the Republican
  runoff to Paxton)
    - JAMES TALARICO (Democrat)
    - KEN PAXTON (Republican)
    - JADE SMALLS SIMMONS (Independent)
    - RONALD DEMETRIUS EVANS (Independent)
    - ROBERT DANIEL COSTER (Independent)
    - JONATHAN ANTHONY GARZA (Independent)
    - WILLIAM JEFFREY HARPER (Independent)
  ```

  12 districts show `seekingReelection2026=false` (open seat: the sitting
  incumbent lost their primary/runoff or didn't run in their own district
  that cycle — TX-02, 08, 09, 10, 19, 21, 30, 32, 33, 35, 37, 38). TX-23 is
  separately a house.gov-listed vacancy, no incumbent to check at all. Every
  other district's winning nominee is confirmed the sitting incumbent
  (excluded from the challenger list, same contract as AZ/FEC).

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Libertarian and Green Party congressional nominees are not included.**
  Texas nominates minor parties by convention, not primary, and no official
  Secretary of State certification list for these conventions could be
  located this session (only a procedural filing-guidance page was found).
  The prior TX Senate research (PR #296) included a Libertarian Senate
  candidate (Ted Brown) sourced only from Ballotpedia as a comparison
  oracle, with no official corroboration found either then or now —
  deliberately excluded here. **Needs Muxin's call**: accept the
  Ballotpedia-oracle precedent for this one candidate, or hold until an
  official source is found.
- **TX Senate independent count differs from PR #296's prior research.** The
  official independent-declarations PDF (fetched 2026-07-15) lists 5 Senate
  independents (Simmons, Evans, Coster, Garza, Harper). PR #296's
  Ballotpedia-sourced comparison instead listed 7 — also including Cain,
  Ford, and Truelson, and explicitly excluding Evans as "withdrawn or
  disqualified." This build follows the official PDF as the higher-trust
  source and does not resolve the discrepancy — same posture as the AZ
  fixture's own recorded-but-unresolved challenge/withdrawal-table conflict.
- **No official "general ballot" certification document exists yet.**
  Major-party nominees are derived from certified primary/runoff results,
  not a final SoS-published general slate — the most reliable currently
  available official signal, but not literally the document description the
  card originally envisioned ("official general roster").
- **Independent filers carry `declared_general_ballot_intent`, not
  `qualified_for_general_ballot`** — the SoS document itself is titled
  "Declarations of Intent," a pre-petition-verification stage. All 30
  declared independents (25 House + 5 Senate) render in the app regardless
  (no volume/status gate on visibility, per product principle), but the
  status label is honest about the verification stage.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `docs/operations/texas-vertical-slice-data-check.md`.
- **Fixture file:** `scripts/congressional-rosters/tx-official-roster-2026.ts`.
- **Official Texas Secretary of State source URLs used:**
  - `https://goelect.txelections.civixapps.com/ivis-enr-ui/races` (Election
    Night Results — certified primary/runoff vote totals, the source of each
    party's general-ballot nominee)
  - `https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf`
    (official independent declarations of intent)
  - `https://www.sos.texas.gov/elections/laws/2026-november-general-election.shtml`
    (SoS general-election landing page, links to the Candidate Information
    portal)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Texas source, cited for completeness since it materially shaped
    the `isIncumbent` data)

## GO/NO-GO verdict

**GO on the approach for a second state — the Senate code path is proven
live, not just built. NO-GO on proceeding to more states or real users
without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for AZ and/or TX)** — human sign-off required,
   same as AZ. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **Migration `0016` needs to ship to prod before any state's flag ever
   flips** — without it, any Senate-covered state's re-import silently
   duplicates rows.
3. **Muxin's call on the Libertarian/independent-count gaps above** before
   this fixture is treated as final for TX.
4. **Next states** — per the plan's 2026-07-15 revision, continue the manual
   track. The Civix-portal operational playbook this session wrote up
   (`docs/operations/nationwide-congressional-roster-plan.md`) should
   materially speed up any future state whose SoS runs the same Civix
   software.
