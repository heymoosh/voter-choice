# New Mexico vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: New Mexico (NM)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Built after
Arizona, Texas, Oklahoma, Alabama, Alaska, California, Colorado, Connecticut,
Arkansas, Delaware, Florida, Hawaii, Kentucky (and others built off
origin/main), through this manual track.

Date: 2026-07-16. New Mexico's 2026 primary (2026-06-02) is already past —
**this is a post-primary, general-election-stage build**, like OK/AL/AR/KY,
not a pre-primary snapshot like AZ/DE/FL/HI. The general election is
2026-11-03.

## Bottom line

**GO on the approach for New Mexico.** All 3 NM US House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 4 contests.**

**New Mexico is not Civix-vended.** Its official candidate source
(`candidateportal.servis.sos.state.nm.us`) runs on the state's own SERVIS
platform (reportedly a customized BPro TotalVote deployment) — a plain
server-rendered ASP.NET page (`CandidateList.aspx`), not a JS SPA and not
`*.civixapps.com`. No "Powered by gocivix.com" branding or "IvisCbpUi" page
titles found anywhere. No browser automation was needed for the pull itself.

**A load-bearing discovery, mirroring Kentucky's: the portal already reflects
the settled POST-primary GENERAL-ballot filer set, selected entirely via an
opaque `eid` query parameter with no visible election-picker in the rendered
HTML.** `eid=2917` was confirmed (by the page's own title text, "2026 General
Election Contest/Candidate List") to be the correct election, distinct from
`eid=2911` (2026 Primary). The `eid` sequence is **not purely chronological
across election types** — Local/Primary/General interleave in the numeric
sequence (2907=2026 Local, 2911=2026 Primary, 2917=2026 General) — always
confirm by the page title, never by assuming the next sequential id. Some
`eid` guesses return HTTP 500 rather than an empty table.

**All 4 races (3 House + Senate) are simple incumbent-defends, two-candidate
(D vs. R) contests — no open seats, no runoff derivation needed.** New
Mexico's Primary Election Law (NMSA 1978, Chapter 1, Article 8) has no
runoff provision for state/federal primaries; the only NM runoff mechanism
(NMSA 1978 Section 1-22-16) is scoped to municipal elections only. Plurality
winners are the automatic nominees, confirmed both by statute and by the
portal's own settled filer pattern (exactly one D and one R per race, never
two of the same party).

**No new party code was needed** — every qualified general-ballot filer for
these four races carries party DEM or REP. Two minor-party/independent
Senate filers (Mira O'Connell — `DTS`, New Mexico's official label for
"Declined To State" / independent; Bob Perls — `FWD`, Forward Party) appear
on the SOS's own list but are both marked **"Disqualified"** for
insufficient nominating-petition signatures — deliberately excluded from
the fixture, consistent with this track's convention of recording only
qualified/declared/write-in filers, never disqualified ones.

**A live, unresolved legal risk to flag:** on 2026-07-15, Bob Perls and four
other Forward Party candidates filed a federal lawsuit in Albuquerque
challenging the state's signature-sufficiency requirement as applied to a
certified minor party's own nominees. Unresolved as of this build — if the
lawsuit succeeds before the ballot-content certification deadline (see
"Governing calendar dates" below), the Senate race could gain a third
qualified candidate and this fixture would need updating.

**NO-GO on flipping the flag for real users** without Muxin's sign-off — same
standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** New Mexico's official SOS candidate data lives on
   the state's SERVIS candidate portal
   (`https://candidateportal.servis.sos.state.nm.us/CandidateList.aspx`), a
   live server-rendered ASP.NET data table, not a static page or PDF.
   Distinct from `https://electionresults.sos.nm.gov/`, a separate
   results/tabulation system (as of this build only showing 2026 Primary
   turnout/results, not candidate-filing/party data) — do not conflate the
   two.
2. **The `eid` parameter is the only election selector, and it is opaque.**
   No dropdown of election years exists in the rendered HTML; `eid` values
   had to be discovered by search/increment. Confirmed: `eid=2911` = 2026
   Primary, `eid=2917` = 2026 General (used for this fixture), `cty=99` =
   statewide/all-counties filter (per-county filtering also exists via
   `cty=<county code>`, not needed for federal races).
3. **Confirming this IS the settled post-primary general-ballot roster.**
   The `eid=2917` page's own title text reads "2026 General Election
   Contest/Candidate List," distinct from the Primary list; every row
   carries a Qualified/Disqualified/Withdrawn status as of the general-ballot
   certification (not a raw primary-filing list). Every contested race in
   scope shows exactly one Democratic and one Republican "Qualified" filer —
   the empirical signature of a settled field, matching the Kentucky
   pattern.
4. **Incumbency cross-check.** `https://www.house.gov/representatives` and
   `https://clerk.house.gov/Members/StateDelegation?State=NM` both returned
   HTTP 403 to `WebFetch` this session (bot/JS-rendering block) — could not
   be verified directly against the plan's preferred house.gov source.
   Used `https://www.senate.gov/states/NM/intro.htm` (worked, confirms
   sitting senators Martin Heinrich and Ben Ray Luján, with Luján holding
   the Class II seat up in 2026) plus two independent secondary sources
   agreeing on the House delegation: NM Political Report's 2026-03-09
   candidate roundup and Wikipedia's "2026 United States Senate election in
   New Mexico" / "List of United States representatives from New Mexico."
   All three sitting Representatives (Stansbury NM-1, Vasquez NM-2, Leger
   Fernandez NM-3) are confirmed running for re-election in their own
   district; Luján is confirmed running for re-election to his own Senate
   seat (not retiring, not seeking another office) — a genuine
   incumbent-defends race across all four contests, no open seats.
5. **Disqualified filers, not guessed at.** Two non-major-party Senate
   filers (O'Connell — DTS/independent, Perls — FWD/Forward Party) appear on
   the official `eid=2917` list explicitly marked "Disqualified" —
   insufficient valid nominating-petition signatures per NMSA 1978 Section
   1-8-51 (statewide independent threshold: 14,200 signatures, ≈2% of votes
   cast statewide; Forward Party, as a newly-qualified minor party, faces a
   lower but still substantial 7,100-signature threshold). Neither is
   included in the fixture. A third minor-party petitioner described in
   secondary sources (Libertarian Rhett Trappman, per Wikipedia and his own
   campaign site) does **not** appear anywhere on the official list at all
   — not even as "Disqualified" — flagged as a source discrepancy rather
   than guessed at; not included.
6. **Runoff check.** Confirmed via NMSA 1978 Chapter 1, Article 8 (no runoff
   provision for state/federal primaries) and Article 22 Section 1-22-16
   (runoff mechanism scoped to municipal elections only) — plurality
   winners are the automatic general-ballot nominees. No `runoff_pending`
   row anywhere in this fixture.
7. **Live litigation risk, not guessed at.** The Forward Party's federal
   lawsuit (filed 2026-07-15, unresolved as of this build's retrieval)
   argues a certified minor party's own nominees shouldn't face a separate
   independent-style signature hurdle. This could still restore Perls (or
   others) to the Senate ballot before final certification — recorded as an
   explicit open risk, not resolved either way in the fixture.
8. **Calendar-date research.** New Mexico's own official 2026 election
   calendar/proclamation materials (`sos.nm.gov`) plus NMSA 1978 statutory
   citations were used to pull every still-governing date (see "Governing
   calendar dates" below). The 2026 General Election Proclamation PDF is a
   scanned image (not text-extractable by naive tools) — dates were
   triangulated from statute + proclamation + contemporaneous news coverage
   instead of relying on PDF text extraction.

## Contest inventory

New Mexico has **3 US House districts and 1 US Senate contest in 2026** (the
Class II seat, currently held by Ben Ray Luján). All 3 House districts + the
Senate race are covered by the general election, confirmed via the official
`eid=2917` list.

| District | Incumbent | Nominee(s) | Open seat? |
|---|---|---|---|
| NM-1 | Melanie Ann Stansbury (D) | Stansbury (D, seeking re-election), Ndidiamaka Ekwua Charlene Okpareke (R) | No |
| NM-2 | Gabriel Vasquez (D) | Vasquez (D, seeking re-election), Gregory G. Cunningham (R) | No |
| NM-3 | Teresa Leger Fernandez (D) | Leger Fernandez (D, seeking re-election), Martin Zamora (R) | No |
| US Senate | Ben Ray Luján (D) | Luján (D, seeking re-election), Larry E. Marker (R) | No |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI/KY pattern)

**Needed no changes:** `db/schema.ts` (no migration — the existing
`official_roster_candidates` table, `NULLS NOT DISTINCT` uniqueness fix
(migration 0016), and plain-text `party`/`ballot_status` columns already
cover New Mexico's shape); the importer's core upsert logic; the
`runoff_pending`/`isRunoffPending` UI path (unused — New Mexico has no
federal runoff primary, so no undetermined-nomination case exists);
`scripts/congressional-rosters/types.ts` (no new party code needed — every
qualified filer is DEM or REP).

**New for this build:**

- `scripts/congressional-rosters/nm-official-roster-2026.ts` (new) — 6 House
  rows (all 3 districts) + 2 Senate rows, house+senate shape (mirrors
  OK/AL/AR/DE/FL/KY). Full sourcing, methodology, and the
  disqualified-filer/litigation findings are in the file's own header
  docblock.
- `scripts/ingest/official-roster.ts` — registered `NM` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as OK/AL/AR/DE/FL/KY.
- `src/lib/server/officialRoster.test.ts` — added NM's import block,
  `nmDbRow` helper, `NM_HOUSE_DB_ROWS`/`NM_SENATE_DB_ROWS`,
  `NM_INCUMBENT_SAMPLE`, and three `describe` blocks (narrowing, incumbency,
  wiring) covering all 3 districts, the Senate contest, and confirming
  DEM/REP-only party coverage.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3240 tests passing, 5 pre-existing `todo` (no failures).
  A `prettier` formatting issue in the new test additions was caught by the
  lint step and fixed (`npx prettier --write`) before this run, per the
  known CI-includes-prettier gotcha. (One transient failure set — 3
  `scripts/design/capture-shared.test.ts` tests — was observed on the first
  sandboxed run due to a local sandbox Chromium-launch restriction
  unrelated to this change; re-run with the sandbox restriction lifted
  confirmed all 3 pass and are unaffected by this build.)
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (worktree linked to
  the same Vercel project as the main checkout by copying
  `.vercel/project.json`, `projectName: "voter-choice"`), confirmed
  non-empty (146 characters) before use, deleted from disk after use —
  never `source`d, never left in a committed file.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state NM` — importer reported `upserted=8`. Direct row-count query
     (`select * from official_roster_candidates where state = 'NM'`, not
     just the importer's own log line) confirmed **8 rows: 6 house / 2
     senate**, matching the fixture exactly (names, parties, incumbency,
     and ballot status all matched row-for-row).
  2. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=8`. Direct row-count query again:
     **8 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 3 NM House
  districts and the Senate race, against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture. **0 mismatches across all 4 contests.** Full literal output:

  ```
  NM-01 — incumbent Melanie Ann Stansbury, seekingReelection2026=true
    - Ndidiamaka Ekwua Charlene Okpareke (Republican)

  NM-02 — incumbent Gabriel Vasquez, seekingReelection2026=true
    - Gregory G. Cunningham (Republican)

  NM-03 — incumbent Teresa Leger Fernandez, seekingReelection2026=true
    - Martin Zamora (Republican)

  U.S. SENATE — incumbent Ben Ray Luján, seekingReelection2026=true
    - Larry E. Marker (Republican)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"` and `isRunoffPending: false`. All four incumbents
  (Stansbury, Vasquez, Leger Fernandez, Luján) were correctly excluded from
  their own district/seat's challenger list; each race's sole Republican
  challenger rendered correctly.
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats — New Mexico's federal primary is decided by
plurality in a single round (NMSA 1978, Chapter 1, Article 8), with no
runoff mechanism for state/federal office (the only NM runoff provision,
Section 1-22-16, applies solely to municipal elections). No seat's
nomination is ambiguous; every row in this fixture is a determined
`qualified_for_general_ballot` nominee.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **house.gov / clerk.house.gov incumbency cross-check could not be
  performed directly** — both returned HTTP 403 to `WebFetch` this session
  (bot/JS-rendering block). Substituted `senate.gov` (worked, for the
  Senate seat) plus two independent secondary sources (NM Political Report,
  Wikipedia) for the House delegation — both agree with each other and with
  the official SOS roster's incumbency implications, but this is a weaker
  cross-check than the plan's preferred house.gov directory.
- **A live, unresolved lawsuit could still change the Senate race.** Bob
  Perls's Forward Party ballot-access challenge (filed 2026-07-15) was
  unresolved as of this build — if it succeeds before ballot-content
  certification, a third Senate candidate could be added. Not guessed at
  either way; flagged as an explicit open risk requiring re-check.
- **A secondary-source discrepancy was found and deliberately not
  resolved by inclusion:** Libertarian petitioner Rhett Trappman is
  described in secondary sources (Wikipedia, his own campaign site) as
  seeking the Senate seat, but does not appear anywhere on the official
  SOS `eid=2917` list — not included in the fixture, since the official
  source is silent on him entirely (not even a "Disqualified" row).
- Names are recorded as they appear in the official SOS candidate list
  (all-caps, no diacritics); the Senator's diacritic ("Luján") was restored
  per his own official senate.gov page — not independently re-verified
  against a third document beyond the two secondary sources cited.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled from New Mexico's official 2026 election materials (`sos.nm.gov`) and
NMSA 1978 statutory citations, retrieved 2026-07-16:

- **June 2, 2026** — 2026 Primary Election. Already passed; this build's
  general-ballot roster reflects its settled outcome.
- **June 25, 2026** — independent/minor-party/write-in candidate filing
  deadline (23rd day after the primary), per NMSA 1978 Sections 1-8-45 /
  1-8-52. Already passed at this build's retrieval.
- **July 5, 2026** — petition-sufficiency challenge deadline (10 days after
  the June 25 filing deadline), per NMSA 1978 Section 1-8-45. Already
  passed at this build's retrieval — the disqualifications of O'Connell and
  Perls (see above) postdate this window per contemporaneous reporting.
- **August 25, 2026** — candidate-withdrawal deadline: a notarized
  withdrawal statement filed at least 70 days before the general election
  removes a name from the ballot, per NMSA 1978 Section 1-10-6(D). A
  still-future date at this build's 2026-07-16 retrieval — could still
  remove a currently-qualified nominee from this roster.
- **September 4, 2026** — county-level ballot-content certification (each
  county clerk certifies precinct ballot content), at least 60 days before
  the general election, per NMSA 1978 Section 1-10-4. This is New Mexico's
  true ballot-content lock date for this cycle. A still-future date at this
  build's retrieval — the Forward Party lawsuit (see above) and the
  withdrawal window above both remain open until this date.
- **November 3, 2026** — General Election Day, per the 2026 General
  Election Proclamation
  (`https://www.sos.nm.gov/wp-content/uploads/2026/04/2026-General-Election-Proclamation-English.pdf`).

**A dated re-check card is required** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the September 4, 2026
ballot-content certification date above — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
New Mexico (NM) — after final ballot certification" card (opened as part of
this build).

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nm-official-roster/docs/operations/new-mexico-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/new-mexico-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nm-official-roster/scripts/congressional-rosters/nm-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/nm-official-roster-2026.ts`
  once merged to main).
- **Official New Mexico source URL(s) used:**
  - `https://candidateportal.servis.sos.state.nm.us/CandidateList.aspx?eid=2917&cty=99`
    (New Mexico Secretary of State's official 2026 General Election
    candidate list — statewide, used for all 3 US House districts and US
    Senate)
  - `https://www.sos.nm.gov/wp-content/uploads/2026/04/2026-General-Election-Proclamation-English.pdf`
    (2026 General Election Proclamation — general election date)
  - `https://www.senate.gov/states/NM/intro.htm` (New Mexico's current
    senators — incumbency cross-check only, not a New Mexico SOS source)
  - `https://nmpoliticalreport.com/2026/03/09/heres-everyone-running-for-congress-in-new-mexico-this-year/`
    (secondary incumbency/roster cross-check)
  - `https://en.wikipedia.org/wiki/2026_United_States_Senate_election_in_New_Mexico`
    (secondary cross-check; also source of the Trappman discrepancy note)
  - NMSA 1978, Chapter 1 (Article 8 primary law, Article 10 withdrawal/
    certification, Article 22 Section 1-22-16 runoff scope) — statutory
    citations for the calendar-dates section above.

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete,
reviewed, and pass `npm run check` cleanly. The card's GOAL_CONDITION's
remaining requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag on — are
both done: the importer ran against staging twice, confirmed by direct
row-count query both times (8 rows, 6 house / 2 senate, no duplication on
re-run), and the real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for all 3 NM House districts and the Senate
race, with **0 mismatches** against the fixture. Prod was never touched —
every database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere.

Per this session's explicit instructions, this PR is opened **non-draft but
NOT merged** — a separate babysit-PRs session owns rebasing, watching CI,
merging, and closing out the card.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for NM and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after September 4, 2026**
   (county ballot-content certification) — a card for this must be opened
   on the backlog per the NOT BEFORE date-gate convention.
3. **The Forward Party's ballot-access lawsuit** (filed 2026-07-15,
   unresolved) could still add a third Senate candidate before September 4,
   2026 — worth checking independently of the dated re-check if news of a
   ruling surfaces sooner.
