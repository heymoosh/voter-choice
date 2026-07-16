# Florida vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Florida (FL)`
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). Ninth state built through
this manual track, after Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado,
Connecticut, California, and Arkansas.

Date: 2026-07-15. Florida's 2026 primary (2026-08-18) is still in the future
at retrieval — this is a **pre-primary build**, like AZ's and AK's: most
contested seats have undetermined nominees. The general election is
2026-11-03.

## Bottom line

**GO on the approach for a ninth state.** All 28 FL House districts plus the
US Senate special election render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across all 29 contests.**

**Florida is not Civix-vended.** Its official candidate-tracking system
(`dos.elections.myflorida.com/candidates/`) is a legacy server-rendered ASP
application — structurally the simplest source in this track so far: every
US House candidate (all 28 districts) returns in ONE static HTML page, and
every US Senate candidate in ONE more. No browser automation needed at all.

**A real mid-decade redistricting surfaced the same structural lesson TX's
Al Green case established, generalized well beyond Civix:** Gov. DeSantis
signed a new congressional map into law May 4, 2026 (upheld by the Florida
Supreme Court), shifting several incumbents to new district numbers.
Matching "district N on the portal" to "district N's current member" by
number alone is unreliable post-redistricting. Cross-checking every one of
Florida's 28 sitting Representatives by NAME against the full 2026 candidate
list (not just their prior district) surfaced **three corrections** to the
portal's own `*Incumbent` tag (Lois Frankel → new CD23, Jared Moskowitz → new
CD25, Debbie Wasserman Schultz → new CD20 — all omitted by the portal) and
**one overclaim**: Sheila Cherfilus-McCormick is tagged incumbent on the
portal's CD20 listing, but she **resigned from Congress on 2026-04-21**
(minutes before a House Ethics Committee vote to expel her over 25 ethics
violations) — independently confirmed via NBC News, CBS News, NPR, and CNN.
She is a 2026 candidate seeking to reclaim the seat, not a sitting member;
the portal's tag is stale. CD20 is therefore a genuine two-sitting-member
primary — Wasserman Schultz (true incumbent) and Cherfilus-McCormick
(former member, not incumbent) both running in the same Democratic primary.

**FL-10 (Maxwell Frost) is uniquely uncontested everywhere** — no other
candidate of any party filed. Under Florida law, a race with zero opposition
of any kind holds no primary or general election; Frost is elected outright.

**NO-GO on flipping the flag for real users** without Muxin's sign-off — same
standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source structure.** `https://dos.elections.myflorida.com/candidates/`
   is the Florida Division of Elections' "Candidate Tracking System," a
   legacy ASP application. Its `CanList.asp` endpoint takes `elecid` (the
   election cycle, `20261103-GEN` for the Nov 3, 2026 general) and
   `OfficeCode` (`USR` for US Representative, `USS` for US Senator) query
   parameters and returns **every candidate for that office, across every
   district, in a single page** — no per-district navigation, no "all
   districts" filter needed because there's no filter to begin with. This is
   the simplest source structure seen in this track (compare TX's Civix
   portal, which required a per-district query with no "all" option).
2. **Tooling.** `WebFetch` works on this site (plain server-rendered HTML,
   confirmed by an early exploratory fetch), but this build used `curl`
   directly (`curl -s -L -A "Mozilla/5.0 ..." <url> -o <file>`) to retrieve
   the raw HTML, then parsed it with a small Python script
   (`BeautifulSoup`, `html.parser`) rather than hand-transcribing ~196 rows
   across 28 districts + Senate. The table structure is trivial to parse:
   each `<tr>` has District / Candidate / Status / Primary / General `<td>`
   cells (Senate rows omit the District cell — 4 `<td>`s, not 5, a real trap
   if a parser hardcodes the column count). The candidate cell's raw text is
   `Surname, Given Middle (PARTY)` with an optional `&nbsp;*Incumbent` suffix
   — reversed to `Given Middle Surname` for display, matching the format
   other states' fixtures use.
3. **The one non-obvious trap: the `Primary` column's meaning depends on
   party.** A blank `Primary` cell means "still contested" ONLY for
   REP/DEM candidates (55 major-party district-party groups checked: exactly
   the 20 solo candidates are tagged `Unopposed`, the other 35 contested
   groups are correctly blank — zero inconsistencies found). NPA (No Party
   Affiliation) candidates ALWAYS show a blank `Primary` cell, even as the
   sole NPA filer — because NPA candidates don't participate in any party
   primary under Florida law; they qualify straight to the general
   regardless. Minor recognized parties (`LPF`, `FFP`) and the "Independent
   Party of Florida" (`IND`) DO get tagged `Unopposed` when they're the sole
   filer for that party, same as REP/DEM. Write-ins (`WRI`) always show blank
   — they don't participate in a primary at all. Getting this wrong would
   have wrongly marked every solo NPA/write-in filer as "still contested."
4. **FL-10 special case.** Maxwell Frost's row is the only one in the entire
   dataset with `Unopposed` in ALL THREE of Status/Primary/General columns —
   no primary, no general election held at all (Fla. Stat., no opposition of
   any kind). Recorded as `qualified_for_general_ballot`, `isIncumbent: true`.
5. **Party-code confirmation.** `LPF` and `FFP` (Libertarian Party of Florida,
   Florida Forward Party) were confirmed against
   `dos.fl.gov/elections/candidates-committees/political-parties/`'s
   official party legend, not guessed from context.
6. **Incumbency cross-check — by NAME, not district number.** Fetched
   `house.gov/representatives` directly via `curl` (a single large
   alphabetical-by-surname table across all 50 states) and searched every one
   of Florida's 28 current members against the FULL 2026 candidate list (all
   districts), not just their pre-redistricting district. This is what
   surfaced the three portal-omission corrections and the one stale-tag
   overclaim described above. Four members (Dunn, Webster [a different
   "Royal Webster" filed in new CD11 — namesake, not the same person],
   Buchanan, Wilson) do not appear anywhere in the 2026 list at all — not
   running for re-election. Donalds does not appear either — publicly running
   for Governor instead, not the House.
7. **Senate incumbency verification.** `senate.gov/senators/index.htm`'s own
   summary initially read as "neither FL seat is up in 2026" (a Class-based
   summary that doesn't surface special-election exceptions) — this was
   cross-checked against direct news reporting (Wikipedia's "2026 United
   States Senate special election in Florida," Florida Phoenix, NBC News,
   CBS Miami) confirming this IS a genuine special election: Rubio's seat
   (term through 2029) became vacant when he resigned to become Secretary of
   State in January 2025; DeSantis appointed Ashley Moody; the Nov 3, 2026
   special election decides who serves the remainder of the term. Never
   trusted a single source's summary at face value where it looked
   surprising.
8. **No separate CD20 special election.** Checked
   `dos.fl.gov/elections/for-voters/special-elections/` directly — it lists
   only state-legislative specials (State Senate 14/21, State House
   51/52/87), none for CD20. The vacancy is simply decided through the
   regular Aug 18 primary / Nov 3 general, same as every other 2026 House
   race.

## Contest inventory

28 US House districts + 1 US Senate special election. Incumbency column
reflects the NAME-based cross-check (item 6 above), not the portal's raw tag.

| District | Incumbent (if any) | Contested? |
|---|---|---|
| FL-01 | Jimmy Patronis (R) | Yes — 3-way REP primary |
| FL-02 | *(open — Dunn not running)* | Yes — 11-way primary |
| FL-03 | Kat Cammack (R, unopposed) | Dem/NPA only |
| FL-04 | Aaron Bean (R, unopposed) | Dem only |
| FL-05 | John H. Rutherford (R) | Yes — REP primary |
| FL-06 | Randy Fine (R) | Yes — REP primary |
| FL-07 | Cory Lee Mills (R) | Yes — REP primary |
| FL-08 | Mike Haridopolos (R, unopposed) | No (1 per party) |
| FL-09 | Darren Soto (D, unopposed) | REP only |
| FL-10 | Maxwell Alejandro Frost (D) | **No opposition at all — elected outright** |
| FL-11 | *(open — Webster not running)* | Yes — both primaries |
| FL-12 | Gus Michael Bilirakis (R, unopposed) | Dem only |
| FL-13 | Anna Paulina Luna (R, unopposed) | Dem only |
| FL-14 | Kathy Castor (D, unopposed) | Yes — REP primary |
| FL-15 | Laurel Lee (R, unopposed) | Dem only |
| FL-16 | *(open — Buchanan not running)* | Yes — both primaries |
| FL-17 | Greg Steube (R, unopposed) | Dem only |
| FL-18 | Scott Franklin (R, unopposed) | No (1 per party) |
| FL-19 | *(open — Donalds running for Governor)* | Yes — both primaries |
| FL-20 | **Debbie Wasserman Schultz (D)** — filed in this new district; Cherfilus-McCormick (D, resigned, NOT incumbent) also running | Yes — 6-way DEM primary |
| FL-21 | Brian Mast (R, unopposed) | Dem only |
| FL-22 | *(open — Frankel's old seat)* | Yes — both primaries |
| FL-23 | **Lois Frankel (D)** — filed in this new district | Yes — DEM primary |
| FL-24 | *(open — Wilson not running)* | Yes — DEM primary |
| FL-25 | **Jared Moskowitz (D)** — filed in this new district | Yes — both primaries |
| FL-26 | Mario Diaz-Balart (R, unopposed) | Dem/NPA only |
| FL-27 | Maria Elvira Salazar (R) | Yes — REP primary |
| FL-28 | Carlos A. Gimenez (R, unopposed) | Dem/NPA only |
| US Senate | Ashley Moody (R) — special election, filling Rubio's vacated seat | Yes — both primaries |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR pattern)

**Needed no changes:** `db/schema.ts` (no migration — `ballot_status`/`party`
are plain `text`, no CHECK constraint); `races.ts`'s runoff-pending UI path
(unused — Florida abolished the congressional second primary, no
`runoff_pending` rows in this fixture); the importer's core upsert logic.

**New / changed for this build:**
- `scripts/congressional-rosters/fl-official-roster-2026.ts` — new fixture,
  28 House districts (189 rows) + Senate (7 rows), house+senate two-array
  shape (mirrors CO/AL/AK/OK/TX/AR, not CT/CA's house-only shape).
- `scripts/congressional-rosters/types.ts` — added `LPF` (Libertarian Party
  of Florida) and `FFP` (Florida Forward Party) to the `party` union,
  confirmed against dos.fl.gov's official party legend.
- `src/lib/server/races.ts` — added `LPF`/`FFP` to `PARTY_NAMES`.
- `scripts/ingest/official-roster.ts` — registered the `FL` import block and
  two-object `FIXTURES` entry.
- `src/lib/server/officialRoster.test.ts` — added FL's import block,
  `flDbRow` helper, `FL_HOUSE_DB_ROWS`/`FL_SENATE_DB_ROWS`,
  `FL_INCUMBENT_SAMPLE`/`FL_OPEN_SEAT_DISTRICTS`, and three `describe`
  blocks (narrowing, incumbency, wiring) covering the FL-10 uncontested case
  and the FL-20 double-incumbent case explicitly.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3143 tests passing, 5 pre-existing `todo` (no failures).
  Two `prettier` formatting issues in the new test additions were caught by
  the lint step and fixed (`npx prettier --write`) before this run.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (from the main,
  Vercel-linked checkout — confirmed `.vercel/project.json`'s `projectName`
  reads `voter-choice`), confirmed non-empty (146 characters) before use.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Pre-import row count for `state = 'FL'`: **0**.
  2. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state FL` — importer reported `upserted=196`. Direct row-count query
     (`select office, count(*) ... where state = 'FL' group by office`, not
     just the importer's own log line): **189 house / 7 senate = 196**.
  3. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=196`. Direct row-count query again:
     **189/7/196 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 28 House districts
  and the Senate race, against staging with `OFFICIAL_ROSTER_ENABLED=1`.
  Diffed candidate-by-candidate against the fixture
  (`fl-official-roster-2026.ts`). **0 mismatches across all 29 contests**,
  including FL-10 (correctly renders zero challengers) and FL-20 (correctly
  excludes Wasserman Schultz as the incumbent while Cherfilus-McCormick
  renders as a challenger). Every challenger carried
  `rosterProvenance.sourceKind === "official_state_roster"`. Full literal
  output (one contest excerpted per notable case; the complete 29-contest
  output was captured during this build):

  ```
  FL-01 (incumbent Jimmy Patronis excluded):
    - Douglas Chico (Republican)
    - Tyler L. Davis (No Party Affiliation)
    - John Frankman (Republican)
    - Gay Valimont (Democrat)

  FL-10 (incumbent Maxwell Alejandro Frost excluded):
    (no challengers — uncontested/no opposition filed)

  FL-20 (incumbent Debbie Wasserman Schultz excluded):
    - Brent Andersen (Republican)
    - Luther "UncleLuke" Campbell (Democrat)
    - Sheila Cherfilus-McCormick (Democrat)
    - Dale V.C. Holness (Democrat)
    - Lateresa "LA" Jones (Republican)
    - Rod Joseph (Republican)
    - Elijah Manley (Democrat)
    - Kedner Maxime (Independent)
    - Carla Spalding (Republican)

  FL-23 (incumbent Lois Frankel excluded):
    - Deborah Adeimy (Republican)
    - Paola Branda (Republican)
    - Victoria Doyle (Democrat)
    - Mark Piper (Democrat)

  FL-25 (incumbent Jared Moskowitz excluded):
    - Dan Franzese (Republican)
    - Michaelangelo Hamilton (write-in, no party)
    - Raven Harrison (Republican)
    - Peter Jassenoff (Libertarian Party of Florida)
    - Joseph "Joe" Kaufman (Republican)
    - Oliver Adams Larkin (Democrat)
    - George R. Moraitis (Republican)
    - Scott Singer (Republican)

  US Senate (incumbent Ashley Moody excluded):
    - Neil J. Gillespie (No Party Affiliation)
    - Chris Gleason (Republican)
    - Angie Nixon (Democrat)
    - Neelam Taneja Perry (Republican)
    - Ernest "Ernie" Rivera (Republican)
    - Alex Vindman (Democrat)
  ```

- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every contested-primary row is undetermined until Aug 18, 2026.** This
  fixture is a pre-primary snapshot; the primary's outcome is not reflected
  and a dated re-check card is required to promote determined nominees (see
  "Governing calendar dates" below).
- **A qualified candidate can still withdraw before the primary.** This
  fixture does not capture any withdrawal after 2026-07-15 (retrieval date).
- **No separate FL-20 special election exists** (confirmed directly against
  dos.fl.gov) — the vacancy is folded into the regular Aug 18/Nov 3 cycle,
  not a distinct off-cycle process. If a future check of dos.fl.gov ever
  shows this changed, this fixture would need re-verification.
- **Minor-party assembly nominees, if Florida has an equivalent to CO's
  party-assembly process, were not separately searched for** — the portal's
  candidate list appears to be the single comprehensive source for all
  ballot-qualified candidates (LPF and FFP filers already appear directly in
  it), unlike Colorado where a genuinely separate, unpublished assembly
  process existed. Not flagged as a gap unless a future build finds
  otherwise.

## Governing calendar dates (per the plan doc's standing requirement, item e)

- **July 20, 2026** — voter registration (book-closing) deadline for the
  primary. (Source: `files.floridados.gov`'s official 2025-2026 election
  dates calendar.)
- **August 18, 2026** — Primary Election Day. Resolves every contested
  primary's nominee (this fixture's `qualified_for_primary_ballot` rows).
- **~August 28, 2026** — statutory county-canvassing-board certification
  deadline (Fla. Stat. § 102.112(1): noon on the 10th day after the
  election, absent a manual recount). This is the date after which
  contested-primary nominees become officially determined and this
  fixture's `qualified_for_primary_ballot` rows should be promoted to
  `qualified_for_general_ballot` for the certified winner. (A sample county,
  Manatee, published its own post-election canvassing-certification meeting
  for August 27, 2026 — one day ahead of the statutory deadline, consistent
  with counties sometimes certifying slightly early.) The statewide
  Elections Canvassing Commission's certification follows a few days after
  the county deadline per Fla. Stat. § 102.121, though this build did not
  find one single authoritative page stating that exact date — use the
  county-certification date above as the practical re-check trigger.
- **November 3, 2026** — General Election Day, and the Nov 3, 2026 special
  election for the US Senate seat (same date).
- **No FL-20 special-election dates** — confirmed none exist separately from
  the regular cycle above (see "Known gaps").

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the Aug 28, 2026 county
certification date above — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
Florida (FL) — after primary certification" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/fl-official-roster/docs/operations/florida-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/florida-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/fl-official-roster/scripts/congressional-rosters/fl-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/fl-official-roster-2026.ts`
  once merged to main).
- **Official Florida source URL(s) used:**
  - `https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USR`
    (all 28 US House candidates)
  - `https://dos.elections.myflorida.com/candidates/CanList.asp?elecid=20261103-GEN&OfficeCode=USS`
    (all 7 US Senate special-election candidates)
  - `https://dos.fl.gov/elections/candidates-committees/political-parties/`
    (official party-code legend — confirms LPF/FFP)
  - `https://dos.fl.gov/elections/for-voters/special-elections/` (confirms
    no separate CD20 special election)
  - `https://files.floridados.gov/media/708841/2025-2026-election-dates-activities-calendar-binder1-20250204-pm.pdf`
    (official election-dates calendar)
  - `https://www.house.gov/representatives` (member directory, incumbency
    cross-check)
  - `https://www.senate.gov/senators/index.htm` (senator directory,
    incumbency cross-check)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete, reviewed,
and pass `npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (196 rows, 189 house / 7 senate, no duplication on re-run), and
the real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for all 28 House districts and the Senate race,
with **0 mismatches** against the fixture. Prod was never touched — every
database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this self-vet.
