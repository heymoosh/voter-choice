# North Carolina vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: North Carolina (NC)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Built after
Arizona, Texas, Oklahoma, Alabama, Alaska, California, Colorado, Connecticut,
Arkansas, Delaware, Florida, Hawaii, and Kentucky (built off origin/main
including all of the above).

Date: 2026-07-16. North Carolina's 2026 primary (2026-03-03) and, where
triggered, its second/runoff primary (2026-05-12) are both already past —
**this is a post-primary, general-election-stage build**, like OK's/AL's/
KY's, not a pre-primary snapshot like AZ/DE/FL/HI. The general election is
2026-11-03.

## Bottom line

**GO on the approach for this state.** All 14 NC US House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 15 contests.**

**North Carolina is not Civix-vended.** Its official candidate source
(`ncsbe.gov`) is a static site hosting a real text-layer PDF on S3
(`dl.ncsbe.gov`) — no browser automation, no JS SPA, no per-district filter
requirement. This is one of the easiest sources mechanically of any state
built so far, comparable to OK's static PDF + results portal.

**A load-bearing discovery, same shape as Kentucky's:** the official
"CANDIDATE LIST GROUPED BY CONTEST" PDF for the 2026 General Election already
reflects the SETTLED post-primary nominee set, not the pre-primary filer
field — every one of NC's 15 federal contests shows exactly one filer per
party (never two Republicans or two Democrats), and NC-1's own contested
5-candidate Republican primary (the most closely watched federal primary in
the state, per WUNC/CBS News coverage) resolved outright without a runoff,
consistent with only one Republican filer appearing for NC-1 in this list.

**No open US House seat in North Carolina this cycle** — all 14 sitting
representatives (119th Congress) filed for re-election and are their
district's nominee. This is a materially simpler case than OK/AL/KY, each of
which had at least one open House seat.

**US Senate is a fully open seat:** Thom Tillis (the sitting senator whose
Class II seat is up in 2026) announced 2025-06-29 he would not seek
re-election, confirmed via `senate.gov`'s North Carolina state page — he
does not appear as a filer. Roy Cooper (D) and Michael Whatley (R) are the
major-party nominees, joined by Shannon W. Bray (LIB) and Michael Dublin
(GRE).

**Zero unaffiliated/independent filers for any US House or Senate seat** —
verified absent (the full candidate list for all 15 federal contests was
read in full; only DEM/REP/LIB/GRE party codes appear anywhere in the
federal section), consistent with North Carolina's unaffiliated-candidate
petition deadline (noon on primary day, 2026-03-03) having already passed
before this build.

**No new party code needed** — DEM, REP, LIB, and GRE were all already
present in `scripts/congressional-rosters/types.ts` from prior states'
builds. North Carolina's Green Party is one of the state's four officially
recognized parties (Democratic, Green, Libertarian, Republican) as of a 2025
NC State Board of Elections vote.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** `https://www.ncsbe.gov/results-data/candidate-lists`
   is a plain landing page linking to two S3-hosted PDFs for the 2026
   General Election: a "CANDIDATE DETAIL LIST" and a "CANDIDATE LIST GROUPED
   BY CONTEST" (the one used here — pre-grouped by office/district, no
   client-side filtering needed).
2. **Tooling — a plain static PDF, no browser automation required.** The PDF
   was fetched directly via `curl` (WebFetch's own fetch returned only raw
   PDF binary/structure markers, not readable text, matching every prior
   state's PDF-handling experience) and parsed locally with `pypdf`'s
   `extract_text(extraction_mode="layout")`, which — unlike default-mode
   extraction — preserves the PDF's fixed-width column layout as whitespace,
   letting a `re.split(r"\s{2,}", line)` per-line parse cleanly separate the
   CANDIDATE NAME / NAME ON BALLOT / PARTY / FILING DATE / ADDRESS columns.
   Contest sections were bounded by matching the document's own all-caps,
   zero-indent section-header lines (`US SENATE`, `US HOUSE OF
   REPRESENTATIVES DISTRICT NN`, and non-federal headers used only as the
   next boundary) rather than a fixed row count per section, since section
   lengths vary (2-3 rows per US House district depending on whether a
   Libertarian filed).
3. **Confirming these ARE the settled post-primary nominees, not a filing-
   stage list.** Resolved three ways, same posture as Kentucky's build: (a)
   every contested district's filer count by party is exactly 1-per-party,
   never 2+ of the same party (the empirical signature of a settled field);
   (b) North Carolina's own primary calendar (March 3 primary, May 12
   second primary if triggered by NCGS 163-111's 30%+1 threshold) places
   both possible nomination-determining events well before this build's
   2026-07-16 retrieval; (c) independently verified against real news
   coverage for the one district with the most closely watched primary
   field, NC-1 — Buckhout won her 5-candidate Republican primary outright
   (confirmed via WUNC's and CBS News's primary-night coverage), and
   Buckhout (not any of her four primary opponents) is the sole Republican
   filer on this list, confirming the list already reflects the primary's
   real outcome.
4. **Incumbency cross-check**, never guessed from the candidate list or this
   app's FEC-derived `candidates` table: `https://www.house.gov/
   representatives` ("By State and District" → North Carolina), cross-
   referenced against congress.gov and Wikipedia's "List of United States
   representatives from North Carolina" (confirmed 2026-07-16), lists the
   sitting delegation as Davis (NC-1), Ross (NC-2), Murphy (NC-3), Foushee
   (NC-4), Foxx (NC-5), McDowell (NC-6), Rouzer (NC-7), Harris (NC-8),
   Hudson (NC-9), Harrigan (NC-10), Edwards (NC-11), Adams (NC-12), Knott
   (NC-13), Moore (NC-14) — every one of whom appears as their district's
   same-party nominee in the official list. `https://www.senate.gov/states/
   NC/intro.htm` confirms the sitting senators are Thom Tillis and Ted Budd
   (Budd's Class III seat is not up in 2026); Tillis's 2025-06-29 retirement
   announcement (Axios, NBC News) was independently confirmed and matches
   his absence from the Senate filing list.
5. **Green Party filing-date anomaly, investigated and explained, not
   ignored.** Two Green Party filers (Michael Dublin — Senate; Bo Whitehead
   — NC-8) carry a filing date of 06/15/2026, materially later than every
   other candidate's 12/01/2025-12/19/2025 filing date. Traced to the Green
   Party's own late formal recognition by the NC State Board of Elections (a
   2025 3-2 board vote, per NC Newsline) and its stated separate 2026
   candidate-selection process — not a data anomaly or a sign the list is
   incomplete. The Green Party is a fully recognized party (not a petition-
   based independent), so both filers are recorded
   `qualified_for_general_ballot`, same as any DEM/REP/LIB nominee.
6. **Unaffiliated/independent candidate posture.** North Carolina's
   unaffiliated-candidate petition deadline for a US House or Senate seat is
   noon on primary day (NCGS 163-122, confirmed via NCSBE's own
   "Unaffiliated Candidate Petitions" page) — 2026-03-03, already past at
   this build's 2026-07-16 retrieval. Combined with the empirical finding
   that zero UNA-coded filers appear anywhere in the federal section of the
   official list, this is recorded as a verified-absent finding: no
   unaffiliated candidate qualified, and none can newly qualify for this
   cycle.
7. **Write-in candidates.** North Carolina does permit a write-in candidacy
   via a separate "Declaration of Intent for a Write-in Candidate" petition
   process (per NCSBE's write-in candidate petitions page), but no write-in
   filer appears on the contest-grouped candidate list for any US House or
   Senate seat, and the specific 2026 general-election filing deadline for
   that process was not published on NCSBE's "Candidate Deadlines" page as
   of this build's retrieval — see Known gaps.
8. **Candidate-withdrawal and ballot-lock deadline research.** NCSBE's
   "Withdrawal of Candidacy" page (fetched directly, not a PDF) states that
   a general-election nominee's withdrawal deadline is governed by NCGS
   §163-114 and falls **before the first day military and overseas
   absentee ballots are transmitted to voters** — NCSBE's own
   voter-facing calendar states that date is **Friday, September 4, 2026**.
   This single date functions as both North Carolina's candidate-withdrawal
   cutoff and its practical ballot-content lock date for this cycle (a
   materially different structure from Kentucky's, where KRS 118.212 has no
   fixed withdrawal deadline at all).

## Contest inventory

North Carolina has **14 US House districts and 1 US Senate contest in
2026** (the Class II seat, currently held by Thom Tillis, not seeking
re-election). All 14 House districts + the Senate race are covered by the
general election.

| District | Incumbent | Nominee(s) | Open seat? |
|---|---|---|---|
| NC-1 | Don Davis (D) | Davis (D, seeking re-election), Laurie Buckhout (R), Tom Bailey (LIB) | No |
| NC-2 | Deborah K. Ross (D) | Ross (D, seeking re-election), Eugene F. Douglass (R), Matthew Laszacs (LIB) | No |
| NC-3 | Greg Murphy (R) | Murphy (R, seeking re-election), Raymond Smith (D), Daniel Cavender (LIB) | No |
| NC-4 | Valerie P. Foushee (D) | Foushee (D, seeking re-election), Mahesh (Max) Ganorkar (R), Guy Meilleur (LIB) | No |
| NC-5 | Virginia Foxx (R) | Foxx (R, seeking re-election), Chuck Hubbard (D), Robert B. Luffman (LIB) | No |
| NC-6 | Addison McDowell (R) | McDowell (R, seeking re-election), Cyril Jefferson (D) | No |
| NC-7 | David Rouzer (R) | Rouzer (R, seeking re-election), Kimberly Hardy (D), Maad Abu-Ghazalah (LIB) | No |
| NC-8 | Mark Harris (R) | Harris (R, seeking re-election), Colby Watson (D), Bo Whitehead (GRE) | No |
| NC-9 | Richard Hudson (R) | Hudson (R, seeking re-election), Richard N. Ojeda II (D) | No |
| NC-10 | Pat Harrigan (R) | Harrigan (R, seeking re-election), Ashley Bell (D), Steven Feldman (LIB) | No |
| NC-11 | Chuck Edwards (R) | Edwards (R, seeking re-election), Jamie Ager (D), Travis Groo (LIB) | No |
| NC-12 | Alma S. Adams (D) | Adams (D, seeking re-election), Jack Codiga (R) | No |
| NC-13 | Brad Knott (R) | Knott (R, seeking re-election), Paul Barringer (D), Steven Swinton (LIB) | No |
| NC-14 | Tim Moore (R) | Moore (R, seeking re-election), Lakesha Womack (D) | No |
| US Senate | Thom Tillis (R) | **OPEN** — Tillis not seeking re-election; Roy Cooper (D), Michael Whatley (R), Shannon W. Bray (LIB), Michael Dublin (GRE) | Yes |

## What was built (delta from the AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI/KY pattern)

**Needed no changes:** `db/schema.ts` (no migration — the existing
`official_roster_candidates` table already covers North Carolina's shape);
`scripts/congressional-rosters/types.ts` (DEM/REP/LIB/GRE were all already
present — no new party code); `src/lib/server/races.ts`'s `PARTY_NAMES` map
(same reason); the importer's core upsert logic; the
`runoff_pending`/`isRunoffPending` UI path (unused — every NC contest is
settled, no undetermined nomination exists).

**New for this build:**

- `scripts/congressional-rosters/nc-official-roster-2026.ts` (new) — 38
  House rows (all 14 districts) + 4 Senate rows, house+senate shape (mirrors
  OK/AL/AR/DE/FL/KY, not CT/CA/HI's house-only shape). Full sourcing,
  methodology, and the Green Party filing-date and open-Senate-seat findings
  are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `NC` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as OK/AL/AR/DE/FL/KY.
- `src/lib/server/officialRoster.test.ts` — added NC's import block,
  `ncDbRow` helper, `NC_HOUSE_DB_ROWS`/`NC_SENATE_DB_ROWS`,
  `NC_INCUMBENT_SAMPLE`, and three `describe` blocks (narrowing, incumbency,
  wiring) covering all 14 districts, the Senate contest, the Green Party
  code, and the fully-open Senate seat.

## Verification performed

- **`npm run check`: prettier + `tsc --noEmit` clean; full vitest suite
  3238 passing, 5 pre-existing `todo`, 0 failures attributable to this
  change.** One prettier formatting issue in the new test additions was
  caught by the lint step and fixed (`npx prettier --write`) before this
  final run, per the known CI-includes-prettier gotcha. Three failures in
  `scripts/design/capture-shared.test.ts` (a pre-existing Playwright-based
  test unrelated to this change) are caused by this sandboxed environment
  refusing to spawn a Chromium subprocess (`Permission denied` on a macOS
  mach-port rendezvous check) — not a regression from this build; that file
  was not touched.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` retrieved
  via a fresh `vercel env pull --environment=preview` (worktree linked to
  the same Vercel project as the main checkout via `.vercel/project.json`,
  `projectName: "voter-choice"`), confirmed non-empty (146 characters)
  before use, deleted from disk immediately after each use — never
  `source`d, never left in a committed file.
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state NC` — importer reported `upserted=42`. Direct row-count query
     (`select office, count(*) ... where state = 'NC' group by office`, not
     just the importer's own log line): **38 house / 4 senate = 42.**
  2. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=42`. Direct row-count query again:
     **38 house / 4 senate = 42 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 14 NC House
  districts and the Senate race, against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture. **0 mismatches across all 15 contests.** Full literal output:

  ```
  NC-01 — incumbent Don Davis, seekingReelection2026=true
    - Laurie Buckhout (Republican)
    - Tom Bailey (Libertarian)

  NC-02 — incumbent Deborah K. Ross, seekingReelection2026=true
    - Eugene F. Douglass (Republican)
    - Matthew Laszacs (Libertarian)

  NC-03 — incumbent Greg Murphy, seekingReelection2026=true
    - Raymond Smith (Democrat)
    - Daniel Cavender (Libertarian)

  NC-04 — incumbent Valerie P. Foushee, seekingReelection2026=true
    - Mahesh (Max) Ganorkar (Republican)
    - Guy Meilleur (Libertarian)

  NC-05 — incumbent Virginia Foxx, seekingReelection2026=true
    - Chuck Hubbard (Democrat)
    - Robert B. Luffman (Libertarian)

  NC-06 — incumbent Addison McDowell, seekingReelection2026=true
    - Cyril Jefferson (Democrat)

  NC-07 — incumbent David Rouzer, seekingReelection2026=true
    - Kimberly Hardy (Democrat)
    - Maad Abu-Ghazalah (Libertarian)

  NC-08 — incumbent Mark Harris, seekingReelection2026=true
    - Colby Watson (Democrat)
    - Bo Whitehead (Green)

  NC-09 — incumbent Richard Hudson, seekingReelection2026=true
    - Richard N. Ojeda II (Democrat)

  NC-10 — incumbent Pat Harrigan, seekingReelection2026=true
    - Ashley Bell (Democrat)
    - Steven Feldman (Libertarian)

  NC-11 — incumbent Chuck Edwards, seekingReelection2026=true
    - Jamie Ager (Democrat)
    - Travis Groo (Libertarian)

  NC-12 — incumbent Alma S. Adams, seekingReelection2026=true
    - Jack Codiga (Republican)

  NC-13 — incumbent Brad Knott, seekingReelection2026=true
    - Paul Barringer (Democrat)
    - Steven Swinton (Libertarian)

  NC-14 — incumbent Tim Moore, seekingReelection2026=true
    - Lakesha Womack (Democrat)

  U.S. SENATE — OPEN SEAT (Tillis not seeking re-election)
    - Roy Cooper (Democrat)
    - Michael Whatley (Republican)
    - Shannon W. Bray (Libertarian)
    - Michael Dublin (Green)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"` and `isRunoffPending: false`. All 14 incumbents
  were correctly excluded from their own district's challenger list; all 4
  Senate filers rendered, none incorrectly excluded (no incumbent on this
  open seat).
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the
  verification commands above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats. North Carolina's federal primary is decided
outright unless no candidate clears NCGS 163-111's 30%+1 threshold, in which
case a second/runoff primary follows — but that second-primary date
(2026-05-12) is already past as of this build's 2026-07-16 retrieval, and
the official general-election candidate list shows exactly one filer per
party for every one of the 15 federal contests, confirming every nomination
is settled. NC-1's own contested 5-candidate Republican primary (the race
most likely to need a runoff) resolved outright, independently confirmed via
news coverage. Every row in this fixture is `qualified_for_general_ballot`.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The 2026 general-election write-in candidate filing deadline was not
  found** in the official sources read this session — NCSBE's "Candidate
  Deadlines" page had not published a 2026-general-specific date for that
  process at retrieval time. No write-in filer currently appears on the
  official candidate list for any NC federal contest, but this fixture
  cannot yet rule out a future write-in filing before whatever that deadline
  turns out to be. A dated re-check card is required either way (see below).
- **No Constitution Party, or other minor-party filer for any US House or
  Senate seat this cycle** beyond the Green Party's two filers — not
  omitted, verified absent from the official filing list (checked by
  reading every row of both office listings in full).
- Names are recorded as they appear in the official candidate list's "NAME
  ON BALLOT" column; not independently re-verified against a third
  document.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled from NCSBE's own official candidate-deadlines and voter-dates-and-
deadlines pages (`ncsbe.gov`, retrieved 2026-07-16), and NCGS §163-114 (the
general-election nominee withdrawal statute, via NCSBE's own "Withdrawal of
Candidacy" page):

- **December 1, 2025 (noon) – December 19, 2025 (noon)** — statewide
  candidate-filing window for the 2026 primary. Already passed at this
  build's retrieval — this is the window every regular party filer in this
  fixture met (every non-Green-Party filing date observed in the
  transcribed data falls in this range).
- **December 16, 2025 (5:00 PM)** — primary-stage candidate-withdrawal
  deadline (distinct from the general-election withdrawal deadline below).
  Already passed.
- **March 3, 2026** — primary election day; also North Carolina's
  unaffiliated-candidate petition filing deadline (noon, same day, NCGS
  163-122). Already passed — this is why zero unaffiliated federal filers
  can appear on this fixture even if one existed at build time.
- **May 12, 2026** — second/runoff primary, held only for a contest where no
  candidate cleared 30%+1 of their party's primary vote (NCGS 163-111).
  Already passed. No federal contest's fixture entry shows evidence of
  having needed this (every contest has exactly one filer per party in the
  general list).
- **Friday, September 4, 2026** — the date NC's absentee ballots begin
  transmission to military and overseas voters, and thus (per NCGS §163-114)
  North Carolina's practical **general-election candidate-withdrawal
  deadline and ballot-content lock date** for this cycle. A still-future
  date at this build's 2026-07-16 retrieval — a general-ballot nominee could
  still withdraw before this date, changing this fixture's roster.
- **November 3, 2026** — General Election Day.

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," triggered by the September 4, 2026
withdrawal/ballot-lock date above — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
North Carolina (NC) — after general-election ballot lock" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nc-official-roster/docs/operations/north-carolina-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/north-carolina-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/nc-official-roster/scripts/congressional-rosters/nc-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/nc-official-roster-2026.ts`
  once merged to main).
- **Official North Carolina source URL(s) used:**
  - `https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/2026_general_candidate_list_by_contest_federal_and_state.pdf`
    (NC State Board of Elections' official 2026 General Election candidate
    list, grouped by contest — the settled post-primary nominee roster used
    for both US House and US Senate)
  - `https://www.ncsbe.gov/results-data/candidate-lists` (landing page
    hosting the above PDF and its companion detail-list PDF)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a North Carolina source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/states/NC/intro.htm` (North Carolina's current
    senators — incumbency cross-check only, confirms the Tillis open seat)
  - `https://www.ncsbe.gov/candidates/withdrawal-candidacy` (NCGS §163-114
    general-election nominee withdrawal deadline)
  - `https://www.ncsbe.gov/event-terms/voter-dates-deadlines` (September 4,
    2026 absentee-ballot-transmission date, cited for the withdrawal/ballot-
    lock finding above)
  - `https://www.ncsbe.gov/candidates/petitions/unaffiliated-candidate-petitions`
    (unaffiliated-candidate petition deadline — cited for the zero-
    independent-filers finding)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete,
reviewed, and pass `npm run check` cleanly (modulo the pre-existing,
sandbox-caused Playwright failures noted above, unrelated to this change).
The card's GOAL_CONDITION's remaining requirements — a direct
row-count-verified staging import and an end-to-end `lookupChallengers`
check against staging with the flag on — are both done: the importer ran
against staging twice, confirmed by direct row-count query both times (42
rows, 38 house / 4 senate, no duplication on re-run), and the real code path
was called directly against staging with `OFFICIAL_ROSTER_ENABLED=1` for all
14 NC House districts and the Senate race, with **0 mismatches** against the
fixture. Prod was never touched — every database command used
`ROSTER_STAGING_DATABASE_URL` explicitly, and `OFFICIAL_ROSTER_ENABLED` was
only ever set inline for verification, never persisted anywhere.

**Self-vet (four-point, per this repo's auto-merge policy):**
1. *Faithful to spec* — every IN SCOPE item on the card is delivered: source
   format confirmed (not Civix), fixture transcribed with shared types,
   registered in `FIXTURES`, no migration needed, tests mirroring the prior
   states' coverage, end-to-end staging verification with the flag on, this
   data-check doc with the operational-navigation writeup, and the
   runoff-pending / governing-calendar-date standing requirements checked
   (found: no runoff-pending seats; found and recorded every governing
   date).
2. *Low-risk and reversible* — purely additive: a new fixture file, one new
   `FIXTURES` entry, new tests, and a new doc. No existing code path
   changed. `OFFICIAL_ROSTER_ENABLED` stays unset everywhere persistent, so
   this has zero effect on production behavior until a separate, explicitly
   gated flag-flip decision.
3. *No secrets, no destructive code* — the staging credential was pulled
   fresh, used inline, and deleted immediately after each use; never
   committed, never echoed to a log. No destructive database operation was
   run (upsert-only importer, isolated staging branch, prod never touched).
4. *Tests green* — `npm run check`: 3238 passing / 5 pre-existing `todo` / 0
   failures attributable to this change (the 3 unrelated failures are a
   pre-existing sandboxed-Chromium-launch limitation in an untouched test
   file).

Per this repo's self-vetted-safe auto-merge policy, this PR is opened
non-draft with this self-vet verdict — merge, rebase, and STATUS-to-Done are
intentionally left to a separate babysit-PRs session per this session's own
task instructions.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for NC and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after September 4, 2026**
   (the general-election withdrawal/ballot-lock date) — opened on the
   backlog per the NOT BEFORE date-gate convention.
