# Maryland vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Maryland (MD)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Thirteenth
state built through this manual track, after Arizona, Texas, Oklahoma,
Alabama, Alaska, Colorado, Connecticut, California, Arkansas, Delaware,
Florida, and Hawaii.

Date: 2026-07-15. Maryland's 2026 primary (June 23, 2026) has **already
occurred** — this is a **post-primary build**, like TX/OK/AL/CO/CA/AR's. The
general election is 2026-11-03. Maryland has **no US Senate contest in
2026**.

## Bottom line

**GO on the approach for a thirteenth state.** All 8 MD US House districts
render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — **0 mismatches across all 8 contests.**

**Maryland is NOT Civix-vended.** Its official election authority
(`elections.maryland.gov`) is a static, server-rendered site — every page
(candidate lists, per-district results, the election calendar PDF) was
fetched successfully with plain `WebFetch`; no browser automation was
needed.

**Maryland's primary has already happened**, so — mirroring the TX/OK/AL/
CO/CA/AR precedent — every major-party nominee is recorded
`qualified_for_general_ballot` per the official results dashboard's
all-precincts-reporting numbers (refreshed 2026-07-10), not a guess ahead of
a still-pending primary. Formal statewide certification of these results
isn't due until 2026-07-23 (8 days after this build) — no distinct
post-canvass certification document exists yet at transcription time, same
gap every "general"-stage state in this track has already handled.

**CD5 is Maryland's sole open seat**: incumbent Steny Hoyer is NOT a
candidate in any of the 24 Democratic primary filings for CD5 (confirmed by
name-search against house.gov's member directory, not inferred) — this
explains the unusually fragmented CD5 Democratic primary field (winner
Adrian Boafo took only 32.74% of the vote).

**A genuinely non-final roster, even post-primary**: Maryland runs TWO
still-open post-primary tracks as of this build — a non-principal party
(Green)/Unaffiliated candidate's final Certificate of Nomination or
Candidacy Petition filing (due August 3, 2026) and a post-primary
"Declination of Nomination" window (August 4, 2026) during which any
already-determined nominee could still decline. Two Green Party filers and
two Unaffiliated petition filers are recorded `declared_general_ballot_intent`
rather than `qualified_for_general_ballot`, mirroring Colorado's
UAF-petition precedent.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** `https://elections.maryland.gov` links to
   `/elections/2026/index.html` (2026 election hub), which links to
   `/elections/2026/primary_candidates/index.html` (candidate lists) and
   `/elections/2026/2026_Election_Calendar.pdf` (the full official election
   calendar). All static server-rendered HTML/PDF — no JS portal, no login
   wall, no pagination trap. `WebFetch` worked cleanly on every page,
   including the calendar PDF (read directly via the `Read` tool once
   fetched, all 9 pages).
2. **Major-party nominees were sourced from the RESULTS page, not the raw
   candidate-filing list — this sidesteps a whole class of confusion.**
   `elections.maryland.gov/candidacy/ballot.html` confirmed "Representatives
   in Congress" is the only federal office up in 2026 (no US Senate). The
   official primary RESULTS dashboard
   (`elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4.html`,
   discovered via web search after the direct `results.elections.maryland.gov`
   subdomain redirected to the main domain) lists each district's
   Democratic and Republican winner with vote totals, "Last refreshed:
   07/10/2026 10:08:37 AM," all precincts reporting for all 8 districts.
   Per-district detail pages follow the pattern
   `gen_results_2026_4_<N>.html` for N = 1..8. Building the 16 major-party
   rows directly from these CERTIFIED WINNERS (rather than trying to derive
   the winner from the raw candidate-filing list) avoided several
   district/party-switch traps found in the raw data (see finding 5 below)
   — none of those switched/withdrawn candidates is a certified winner, so
   none affects this fixture regardless.
3. **Incumbency cross-check — house.gov, by name, not district number.**
   `https://www.house.gov/representatives` returns HTTP 403 to a direct
   fetch (the same block every prior state's build has hit); its "By State
   and District" tab was driven via `mcp__claude-in-chrome__*` instead —
   click the tab, `find` the Maryland heading, `scroll_to` it (the table
   lazy-loads on scroll, the same trap DE/FL/HI's builds already
   documented), then `read_page` the scrolled-into-view table. Maryland's 8
   rows resolve to a surname via each representative's `.house.gov` link
   (`harris.house.gov`, `olszewski.house.gov`, `elfreth.house.gov`,
   `ivey.house.gov`, `hoyer.house.gov`, `mcclaindelaney.house.gov`,
   `mfume.house.gov`, `raskin.house.gov`) since the visible name text itself
   didn't render in the accessibility tree snapshot — the href was the
   reliable signal. 7 of 8 districts' primary winner's surname matched;
   CD5's winner (Boafo) did not match the CD5 incumbent surname (Hoyer) —
   confirmed as a genuine open seat, not an omission, by separately
   searching Hoyer's name against the full CD5 Democratic candidate list (24
   names) and finding no match.
4. **Minor-party/independent/write-in detail — the raw HTML candidate-list
   page undersells the real data; the official per-office CSV is the
   authoritative source.** The statewide candidate-list HTML page
   (`2026_GP_statewide_candidatelist.html`) is a UI wrapper; Maryland
   separately publishes a dedicated per-office raw CSV
   (`2026_GP_representativeincongressbydistrict_candidatelist.csv`) that is
   the actual underlying data and more reliable than the HTML rendering. It
   was fetched and its row count independently confirmed complete (92 lines
   incl. header = 91 candidate rows; per-district counts CD1=7, CD2=4,
   CD3=11, CD4=7, CD5=33, CD6=14, CD7=5, CD8=10 all sum correctly against
   the file). A first AI-summarized read of the HTML page (not the CSV)
   hallucinated a duplicate "Mildred Marie Hall" write-in row under BOTH
   CD4 and CD5 — the raw CSV confirmed she appears only once, in CD5. This
   is exactly the class of error the CSV cross-check was meant to catch;
   the fixture reflects the CSV, not the first HTML-summarized pass.
5. **District/party-switch pairs in the raw CSV — confirmed immaterial to
   this fixture.** The CSV's 9 "Withdrawn" rows include several same-person
   switches (same address/phone/email each time): Felix M. Seier withdrew
   as a CD3 Democratic primary filer and re-filed as CD3 Republican the
   same day; Elldwnia English withdrew from CD4 Democratic and is active in
   CD5 Democratic; Jennifer Cross withdrew from CD5 Democratic and is
   active in CD3 Democratic. None of the three is their district's
   certified primary WINNER (Seier lost the CD3 Republican primary to
   Berney Flowers; English and Cross were unsuccessful CD5/CD3 Democratic
   primary entrants respectively) — because this fixture's major-party rows
   are sourced from the certified-results page (finding 2), not the raw
   filing list, none of these switches required any special handling.
6. **Jonathan Burruss (CD5) — a genuine track switch, not a duplicate.** The
   CSV carries two rows for him (same contact info both times): an original
   Write-In filing (2026-02-03), WITHDRAWN 2026-02-19 the same day he filed
   a Petition/Declaration-of-Intent for the Unaffiliated track instead. Only
   his current (non-withdrawn) Declaration-of-Intent row is in this
   fixture, recorded `declared_general_ballot_intent`.
7. **Two Unaffiliated CD6 filers, WITHDRAWN, no active counterpart —
   excluded entirely.** Hajra Kirmani (withdrew 2025-10-17) and Chris Hyser
   (withdrew 2025-10-20) each have exactly one CSV row, both Withdrawn, no
   matching active row anywhere in the file — straightforward dropouts, not
   on the ballot, not included.
8. **Write-in filers — party disclosed vs. undisclosed.** CD1's Edward
   Shlikas carries an ACTIVE Write-In filing with party explicitly
   `Unaffiliated` in the CSV — recorded `write_in_qualified`, party `IND`
   (the source does disclose a party here, unlike FL's blank write-in party
   column, so it isn't nulled). CD5's Mildred Marie Hall carries an ACTIVE
   Write-In filing under the CSV's catch-all `"Other Candidates"` party
   bucket, which is not a real party code — recorded `write_in_qualified`,
   party `null`, matching the FL precedent for an undisclosed write-in
   party.
9. **Green Party filers — "Seeking the Nomination," not yet certified.**
   CD6's Moshe Y. Landman and CD8's Nancy Wallace each carry CSV `Candidate
   Status = "Seeking the Nomination"`, `Filing Type = "Party Designated"` —
   Maryland's non-principal-party track (Declaration of Intent already
   passed July 6, 2026; the final Certificate of Nomination and Candidacy is
   due August 3, 2026, not yet filed at transcription time). Recorded
   `declared_general_ballot_intent`, party `GRE`. No Libertarian
   congressional filer exists in any of Maryland's 8 districts (confirmed
   by grepping the raw CSV — zero matches for "Libertarian").
10. **Declaration-of-Intent vs. Petition — page research came up empty, not
    guessed.** `elections.maryland.gov/candidacy/qualifications.html` and
    `/candidacy/requirements.html` were read via raw DOM `textContent`
    (their qualification/requirement data lives in tables that a naive
    summarized read misses) — neither page uses the terms "Declaration of
    Intent" or "Petition" at all; this distinction is documented nowhere on
    either official candidacy page. The election calendar PDF's own
    line-item descriptions (`EL § 5-703(c)(3)(i)` for non-principal-party
    Declaration of Intent, `EL § 5-703(d)&(f)` for independent Candidacy
    Petition) were the actual source for the two-track distinction used in
    this fixture, plus the raw CSV's own `Candidate Status` field values
    (`"Seeking the Nomination"` + `Party Designated` filing type for
    non-principal parties vs. `"Declaration of Intent"` + `Petition` filing
    type for Unaffiliated candidates) as directly observed confirmation.

## Contest inventory

8 US House districts. No US Senate contest.

| District | Primary winners (D/R) | Incumbent | Other rows | Open seat? |
|---|---|---|---|---|
| MD-01 | Dan Schwartz (D) / Andy Harris (R) | Andy Harris (R) | Edward Shlikas (IND, write-in) | No |
| MD-02 | John "Johnny O" Olszewski, Jr. (D) / Dave Wallace (R) | Olszewski (D) | — | No |
| MD-03 | Sarah Elfreth (D) / Berney Flowers (R) | Elfreth (D) | — | No |
| MD-04 | Glenn F. Ivey (D) / George E. McDermott (R) | Ivey (D) | — | No |
| MD-05 | Adrian Boafo (D) / Chris Chaffee (R) | none | Brian S. Jordan (IND, DGBI), Jonathan Burruss (IND, DGBI), Mildred Marie Hall (write-in) | **Yes** (Hoyer not running) |
| MD-06 | April McClain Delaney (D) / Robin Ficker (R) | McClain Delaney (D) | Moshe Y. Landman (GRE, DGBI) | No |
| MD-07 | Kweisi Mfume (D) / Scott M. Collier (R) | Mfume (D) | — | No |
| MD-08 | Jamie Raskin (D) / Cheryl Riley (R) | Raskin (D) | Nancy Wallace (GRE, DGBI) | No |

(DGBI = `declared_general_ballot_intent`)

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI pattern)

**Needed no changes:** `db/schema.ts` (no migration needed); `scripts/congressional-rosters/types.ts`
(`DEM`/`REP`/`GRE`/`IND` all already exist in the party union — Maryland
introduced no new state-specific party code); `src/lib/server/races.ts`'s
`PARTY_NAMES` map (already wired); the importer's core upsert logic; the
`runoff_pending`/`isRunoffPending` UI path (unused — Maryland has no
primary-runoff mechanism).

**New for this build:**

- `scripts/congressional-rosters/md-official-roster-2026.ts` (new) — 22
  rows across 8 districts, house-only shape (mirrors CT/CA/HI, not FL/DE's
  two-array house+senate shape, since MD has no senate contest in 2026).
  Full sourcing, methodology, and every finding above are in the file's own
  header docblock.
- `scripts/ingest/official-roster.ts` — registered `MD` in `FIXTURES` with
  a single house entry, same one-entry pattern as CT/CA/HI.
- `src/lib/server/officialRoster.test.ts` — added MD's import block,
  `mdDbRow` helper, `MD_HOUSE_DB_ROWS`, `MD_INCUMBENTS`, and three
  `describe` blocks (narrowing, incumbency, wiring) covering all 8
  districts, the no-senate-contest case, the open-seat (CD5) case, the two
  `declared_general_ballot_intent` Green/Unaffiliated cases, and the two
  `write_in_qualified` cases (one with a disclosed party, one without).

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean for
  this build's files.** `officialRoster.test.ts`: 132/132 passing (up from
  126 pre-MD). Full repo suite: 3165 passing, 5 pre-existing `todo`, 3
  pre-existing failures in `scripts/design/capture-shared.test.ts`
  (`chromium.launch()` — Playwright browser automation blocked by this
  session's sandbox; last touched by an unrelated design PR, `742863ac`,
  entirely unrelated to congressional rosters). `tsc --noEmit`: zero errors.
  `eslint` on all three changed/new files: zero errors (two pre-existing
  `prettier` formatting issues in this session's own test-file edits were
  caught by lint and fixed with `npx prettier --write` before this run).
- **Credential confirmed working, after a stale-.env.local trap.** The
  worktree's `.env.local` (a symlink to the main checkout's) had a
  quote-wrapped `ROSTER_STAGING_DATABASE_URL` value that, once unwrapped,
  turned out to be a STALE/rotated credential — `password authentication
  failed for user 'neondb_owner'`. Re-linked the worktree to the Vercel
  project (`vercel link --yes --team team_wcZcXmcIrl0BMLBcn3UzI397
  --project prj_6lbWH8MbpN66FNhgagoOweqXB6ou`, matching the main checkout's
  `.vercel/project.json`) and pulled a fresh credential via `vercel env pull
  --environment=development` to a scratch file (never `.env.local`,
  never `source`d), confirmed non-empty (146 characters) and
  `postgres`-prefixed before use. The fresh credential connected
  successfully; the scratch file was deleted immediately after use.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state MD` — importer reported `upserted=22`. Direct row-count query
     (`select district, office, name, party, is_incumbent, ballot_status
     from official_roster_candidates where state = 'MD'`, not just the
     importer's own log line) returned exactly **22 rows**, matching the
     fixture row-for-row (verified name/party/incumbency/ballotStatus for
     every row).
  2. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=22`. Direct row-count query again:
     **22 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 8 MD House
  districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`. Diffed
  candidate-by-candidate against the fixture. **0 mismatches across all 8
  contests.** Full literal output:

  ```
  MD-01 (incumbent Andy Harris excluded):
    - Dan Schwartz (Democrat)
    - Edward Shlikas (Independent)
  MD-02 (incumbent John "Johnny O" Olszewski, Jr. excluded):
    - Dave Wallace (Republican)
  MD-03 (incumbent Sarah Elfreth excluded):
    - Berney Flowers (Republican)
  MD-04 (incumbent Glenn F. Ivey excluded):
    - George E. McDermott (Republican)
  MD-05 (open seat — no incumbent excluded):
    - Adrian Boafo (Democrat)
    - Chris Chaffee (Republican)
    - Brian S. Jordan (Independent)
    - Jonathan Burruss (Independent)
    - Mildred Marie Hall (no party)
  MD-06 (incumbent April McClain Delaney excluded):
    - Robin Ficker (Republican)
    - Moshe Y. Landman (Green)
  MD-07 (incumbent Kweisi Mfume excluded):
    - Scott M. Collier (Republican)
  MD-08 (incumbent Jamie Raskin excluded):
    - Cheryl Riley (Republican)
    - Nancy Wallace (Green)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Every district's senate-challenger count
  returned 0 (no MD senate fixture rows registered — correctly, no MD
  senate contest exists in 2026).
- Prod database untouched throughout — every command that touched a
  database used the freshly-pulled `ROSTER_STAGING_DATABASE_URL`
  explicitly, never the ambient `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED`
  was only ever set inline for the verification commands above; it is not
  set anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats found and none possible — Maryland has no
congressional primary-runoff mechanism; primary nominees are decided by
plurality in a single round (confirmed via the official election calendar,
which lists no runoff date or procedure for federal office).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Formal statewide certification of the June 23 primary is not due until
  July 23, 2026** — 8 days after this build. This fixture's
  `qualified_for_general_ballot` rows reflect the results dashboard's
  all-precincts-reporting numbers (refreshed July 10), not a distinct
  post-canvass certification document, which does not yet exist.
- **Two Green Party filers and two Unaffiliated petition filers are NOT yet
  certified nominees** — their final Certificate of Nomination/Candidacy
  Petition deadline (August 3, 2026) has not yet passed. Recorded
  `declared_general_ballot_intent`; a re-check is required after that date.
- **Any of the 8 major-party nominees could still decline their nomination**
  through the August 4, 2026 "Declination of Nomination" window (EL §
  5-801(b)(2)(i)) — a materially different risk than a pre-primary
  withdrawal, since it would REMOVE an already-`qualified_for_general_ballot`
  row rather than resolve an open one.
- **A vacancy-in-nomination fill is possible through August 7, 2026** if any
  nominee dies, is disqualified, or declines by August 4.
- **Write-in candidates can still file through October 15, 2026** — this
  fixture's two write-in rows (Shlikas, Hall) reflect only what had already
  filed as of 2026-07-15; more may file before the deadline.
- **General-ballot content is not fully locked until August 31, 2026**
  (SBE's statutory ballot-certification deadline) — the true final-lock
  date for this cycle's Maryland roster.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled directly from Maryland's own official 2026 Election Calendar PDF
(`elections.maryland.gov/elections/2026/2026_Election_Calendar.pdf`,
retrieved 2026-07-15):

- **February 24, 2026, 9pm** — candidate filing deadline (Certificate of
  Candidacy) for the primary ballot. Already passed.
- **March 6, 2026, close of business** — **pre-primary candidate-withdrawal
  deadline** (EL § 5-502(a)). Already passed; does not affect this fixture
  (built post-primary).
- **June 23, 2026** — **Primary Election Day.** Resolves all 8 districts'
  major-party nominees (this fixture's `qualified_for_general_ballot` rows).
- **July 6, 2026, 5pm** — Declaration of Intent deadline for non-principal
  party (Green/Libertarian) candidates seeking nomination. Already passed;
  Landman and Wallace's status reflects having cleared this step.
- **July 23, 2026** — State Board of Canvassers' formal statewide
  certification of primary results. **Not yet passed as of this build** —
  the earliest point a distinct post-canvass certification document (rather
  than the results dashboard's election-night numbers) will exist.
- **August 3, 2026, 5pm — non-principal-party Certificate of Nomination AND
  Unaffiliated Candidacy Petition/Certificate of Candidacy deadline** (EL §§
  5-703(d)&(f), 5-703.1(d)). **Not yet passed.** This is the date Landman,
  Wallace, Jordan, and Burruss's `declared_general_ballot_intent` status
  should be re-checked and, if certified, promoted to
  `qualified_for_general_ballot`.
- **August 4, 2026 — Declination of Nomination deadline** (EL §
  5-801(b)(2)(i)) — Maryland's equivalent of a post-primary
  candidate-withdrawal window; **not yet passed.** Per the epic's
  candidate-withdrawal-deadline standing requirement, a re-check after this
  date must confirm none of the 8 major-party nominees declined.
- **August 7, 2026, close of business — vacancy-in-nomination fill
  deadline** (EL §§ 5-1002(b)(1), 5-1003(b)(4), 5-1004(b)). **Not yet
  passed.**
- **August 31, 2026 — general-ballot content certification** (EL §
  9-207(a)(2)). **Not yet passed** — Maryland's true final-lock date for
  this cycle's roster; after this date, no further nomination-side change
  is possible.
- **October 15, 2026, 5pm — write-in candidate filing deadline** (EL §
  5-303(c)). **Not yet passed** — new write-in filers may still appear.
- **November 3, 2026 — General Election Day.**

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," anchored to the August 4, 2026 Declination of
Nomination date (the earliest date by which BOTH the August 3
non-principal-party/Unaffiliated certification AND the declination window
have resolved) — see `docs/operations/voter-choice-backlog.md`'s "[P2]
Re-check official roster: Maryland (MD) — after declination/certification
window" card, which also flags the August 31 final-lock and October 15
write-in dates for a later check if anything remains open on August 4.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/md-official-roster/docs/operations/maryland-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/maryland-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/md-official-roster/scripts/congressional-rosters/md-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/md-official-roster-2026.ts`
  once merged to main).
- **Official Maryland source URL(s) used:**
  - `https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4.html`
    (primary election results — Representative in Congress, all 8
    districts, "Last refreshed: 07/10/2026 10:08:37 AM," all precincts
    reporting)
  - `https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4_1.html`
    through
    `https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4_8.html`
    (per-district results detail, districts 1–8)
  - `https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_representativeincongressbydistrict_candidatelist.csv`
    (official per-office raw CSV — 91 candidate rows, the authoritative
    source for minor-party/Unaffiliated/write-in/withdrawn detail)
  - `https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_statewide_candidatelist.html`
    (candidate list HTML page — cross-reference only)
  - `https://elections.maryland.gov/candidacy/ballot.html` (confirms
    "Representatives in Congress" is the only federal office up in 2026 —
    no US Senate contest)
  - `https://elections.maryland.gov/candidacy/qualifications.html` and
    `https://elections.maryland.gov/candidacy/requirements.html` (checked
    for the Declaration-of-Intent-vs-Petition distinction — confirmed
    neither page covers it, not a summarization miss)
  - `https://elections.maryland.gov/elections/2026/2026_Election_Calendar.pdf`
    (official 2026 Election Calendar — every governing date above)
  - `https://www.house.gov/representatives` (member directory, incumbency
    cross-check, retrieved 2026-07-15 via browser automation — direct
    fetch returns HTTP 403)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete,
reviewed, and pass `npm run check` cleanly (aside from the 3 pre-existing,
unrelated `capture-shared.test.ts` Playwright/chromium failures — see
Verification above). The card's GOAL_CONDITION's remaining requirements — a
direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (22 rows, no duplication on re-run), and the real code path was
called directly against staging with `OFFICIAL_ROSTER_ENABLED=1` for all 8
MD House districts, with **0 mismatches** against the fixture. Prod was
never touched — every database command used a freshly-pulled
`ROSTER_STAGING_DATABASE_URL`, and `OFFICIAL_ROSTER_ENABLED` was only ever
set inline for verification, never persisted anywhere. Per the epic's
"MERGE PROMPTLY, NO SEPARATE SIGN-OFF GATE" standing requirement, this
branch merges directly after this self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for MD and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after August 4, 2026**
   (Declination of Nomination window close, coinciding with the August 3
   non-principal-party/Unaffiliated certification deadline) — opened on the
   backlog per the NOT BEFORE date-gate convention, also flagging the
   August 31 final-lock and October 15 write-in dates for later attention.
