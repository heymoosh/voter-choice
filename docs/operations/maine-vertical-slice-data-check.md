# Maine vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Maine (ME)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Thirteenth
state built through this manual track, after AZ, TX, OK, AL, AK, CO, CT, CA,
AR, DE, FL, and HI.

Date: 2026-07-15. Maine's June 9, 2026 primary is already PAST at
transcription time — unlike AZ/DE's upcoming-primary builds, this is a
**general-stage** roster, with one significant exception (see "Bottom line").

## Bottom line

**GO on the approach for a thirteenth state, with one real, material
finding: the US Senate Democratic nominee slot is currently VACANT.**
Maine's 2 US House districts and its 2026 US Senate contest render correctly
end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against the real
Neon staging branch through the actual `lookupChallengers` code path — 0
mismatches against the official source, all 5 rows.

**Maine is not Civix-vended** — a set of static XLSX/PDF files on
`maine.gov`, same simple-download-and-parse mechanics as AZ/DE/FL: plain
HTTP fetch + `openpyxl`/`pypdf` parsing, no browser automation needed.

**Graham Platner (D) won the US Senate primary outright (72.1%, no RCV
needed) but formally withdrew on July 10, 2026** — four days before this
build, and confirmed by the Secretary of State's own post-primary withdrawal
document, corroborated by contemporaneous independent news reporting (NBC
News, Axios, The Hill, Maine Morning Star — see Sources). Under 21-A MRS
§374-A, the Maine Democratic Party has until **5 p.m., July 27, 2026** to
name a replacement (their nominating convention is scheduled for July 25).
**No replacement has been officially filed with the SoS as of this build's
retrieval date.** Per the epic's SAFETY rule (never guess an undetermined
nomination), this fixture carries **no Democratic row for the Senate
seat** — not a `runoff_pending` placeholder (there are no real filed
finalists to attach that status to, unlike Oklahoma's true two-candidate
runoffs), just an explicit, documented gap. A dated follow-up card is opened
for July 28, 2026 to add the actual nominee once filed.

**ME-2 is an open seat** — sitting Representative Jared Golden (D)
publicly announced in November 2025 that he would not seek re-election, and
is absent from both the primary filing list and the gubernatorial filing
list (he did not run for Governor either). No incumbent row exists for
ME-2, same convention as AZ-01/AZ-05's open seats.

## How this was verified — static XLSX/PDF downloads + primary-results

derivation, no browser automation

Maine's Secretary of State publishes candidate data as a mix of XLSX
workbooks (filing lists, per-race results) and PDFs (withdrawal notices,
the candidate's guide to ballot access) — all fetched with plain `curl`,
parsed with `openpyxl` (XLSX) and `pypdf` (PDF text extraction):

1. **Candidate SET (who originally filed) — 2026 Primary Candidate List**
   (`https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Primary%20Candidate%20List%20posting%20FINAL%203.16.26.xlsx`,
   posted 3/16/2026): one flat workbook, all offices, filtered to
   `Office in ('US', 'CG')` (`US` = US Senate, `CG` = Representative to
   Congress, with a numeric `Dist` column for CG rows). Found 4 Senate
   filers (1 REP unopposed, 3 DEM contested) and 8 House filers across both
   districts (3 in CD1, 5 in CD2).
2. **Because the primary is already past, winners had to be DERIVED from
   official per-race results workbooks, not read off the filing list** —
   the same derivation pattern Oklahoma's build established. Maine
   publishes one results workbook per contested race
   (`US Senate DEM/REP - FINAL.xlsx`, `Rep to Congress Dist 1/2 DEM/REP -
   FINAL.xlsx`), each a municipality-by-municipality vote-count grid.
   Summed directly (not eyeballed):
   - **Senate DEM** (3-way): Platner 467,656 / 648,393 = **72.1%** —
     outright first-round majority, no RCV needed.
   - **CD1 REP** (2-way): Russell 26,983 / 50,348 = **53.6%** — outright
     majority.
   - **Senate REP, CD1 DEM, CD2 REP**: each had exactly one filer (Collins,
     Pingree, LePage respectively) — unopposed, no results workbook needed
     to confirm the nominee.
   - **CD2 DEM** (4-way: Baldacci, Dunlap, Loud, Wood): no first-round
     majority — the SoS's own ranked-choice-tabulation announcement page
     (`https://www.maine.gov/sos/news/maine-secretary-states-office-announces-ranked-choice-tabulations`)
     names **Matthew Dunlap** the winner, eliminating Loud then Wood in
     successive rounds; the round-by-round detail CSV is linked from that
     page.
3. **The post-primary withdrawal document** (posted 7/13/2026,
   `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Post%20Primary%20withdrawals%2020260713.pdf`,
   a single-page table, `pypdf` text extraction — small enough to read the
   entire table in one pass, no OCR/scanned-page complications this state)
   is where Platner's withdrawal surfaced: `US · D · Graham C. Platner ·
   7/10/2026 · [no replacement listed]`. This is the one row in the entire
   document with federal-office scope (`Ofc.` column = `US`); every other
   row is a state-legislative (`SS`/`SR`) or county (`CT`/`RD`) withdrawal,
   out of scope. **Reading this document in full, not just skimming for
   familiar names, is what surfaced the Senate vacancy** — it would have
   been missed by cross-referencing the primary results alone.
4. **The 2026 Candidate's Guide to Ballot Access PDF**
   (`https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Candidates%20Guide%20to%20Ballot%20Access%20Final.pdf`,
   38 pages, `pypdf` text extraction) is where every governing date below
   was pulled from directly — it quotes the controlling statute (21-A MRS
   §374-A) verbatim for the replacement-nomination deadline.
5. **No independent/non-party candidate filed for US Senate or either US
   House district** — confirmed by the SoS's official 2026 Non-Party
   Candidate List (posted 6/1/2026, FINAL); every row was checked for
   `Office in ('US', 'CG')` and none matched.
6. **Incumbency cross-check**, never guessed from the filing list: Susan
   Collins confirmed via her own senate.gov domain
   (`https://www.collins.senate.gov/`). Chellie Pingree confirmed via
   govtrack.us/congress.gov (an independent congressional-data aggregator,
   not this app's own FEC table) — `pingree.house.gov` and
   `congress.gov`'s direct member page both returned HTTP 403 this session,
   the same failure mode Delaware's build hit against `clerk.house.gov`.
   Jared Golden's non-candidacy was cross-checked against multiple
   independent news sources (see Sources), not inferred from his absence
   alone.

## Contest inventory

Maine has **2 US House districts and 1 US Senate contest in 2026** (Susan
Collins's Class II seat). Districts recorded as `"01"`/`"02"`; the Senate
contest uses `district: null`.

## What was built (delta from the DE/HI pattern)

All of the existing pipeline infrastructure is state-agnostic and required
**no changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, `races.ts`'s
`lookupChallengers` wiring, `RepCard.tsx`, the importer's array-shaped
`FIXTURES` map, and `scripts/congressional-rosters/types.ts` (no new party
code needed — every ME filer is `DEM`/`REP`).

**New for this build:**

- `scripts/congressional-rosters/me-official-roster-2026.ts` (new) — 4
  House rows (both districts, both parties, all determined nominees) + 1
  Senate row (Collins only — the DEM slot is intentionally absent, see
  "Bottom line"). Full sourcing, methodology, and the Senate-vacancy
  finding are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `ME` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as DE/FL/AR.
- `src/lib/server/officialRoster.test.ts` — 10 new tests: `getOfficialRoster`
  narrowing for both House districts and the null-district Senate contest
  (asserting exactly 1 row, not the 2+ shape every prior multi-chamber state
  had), `isIncumbentSeekingReelection` for Pingree (true), Golden (false —
  no row), and Collins (true), and `lookupChallengers` wiring for both
  chambers (FEC query skipped — 2 calls not 3; incumbent exclusion; the
  open-seat CD2 case; and an explicit assertion that the Senate challenger
  list is empty rather than containing a guessed/phantom DEM candidate).

## Verification performed

- `npm run check`: lint clean (0 errors; pre-existing complexity warnings in
  unrelated files only), `tsc --noEmit` clean, full vitest suite passing —
  3169 tests passing (3 failures in
  `scripts/design/capture-shared.test.ts` are a pre-existing sandbox
  artifact — Playwright/Chromium cannot launch inside this session's
  sandbox `bootstrap_check_in ... Permission denied`; confirmed by
  re-running that one file with the sandbox disabled, where all 3 pass
  cleanly — unrelated to this change, no file this build touched).
- Confirmed via `db/schema.ts` that no new migration was needed — nothing
  has needed a migration since 0016 for any state in this track.
- ME's 5 rows (4 House + 1 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`). Pre-import row count for `state = 'ME'`: **0**.
  Importer reported `upserted=5`. Direct row-count query (`select office,
  count(*) ... where state = 'ME' group by office`, not just the
  importer's own log line): **4 house / 1 senate = 5**. Re-ran the
  identical import a second time (idempotency check) — importer again
  reported `upserted=5`; direct row-count query again: **4/1/5 — not
  doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for both House districts
  and the Senate seat, against staging with `OFFICIAL_ROSTER_ENABLED=1`.
  Diffed candidate-by-candidate against the fixture. **0 mismatches across
  all three contests.** Full literal output (incumbent excluded from their
  own seat's challenger list, per the standing contract):

  ```
  ME-01 House (incumbent Chellie Pingree excluded):
    - Ronald C. Russell (Republican)

  ME-02 House (open seat — no incumbent to exclude):
    - Matthew Dunlap (Democrat)
    - Paul R. LePage (Republican)

  US Senate (incumbent Susan Collins excluded):
    (empty — no Democratic nominee filed yet; not a guessed/phantom row)
  ```

  Every returned challenger carried the correct party mapping (`REP` →
  "Republican", `DEM` → "Democrat") and `sourceKind:
  "official_state_roster"`. Separately confirmed
  `isIncumbentSeekingReelection("ME", "house", "01", 2026, "Chellie
  Pingree")` returns `true`, `isIncumbentSeekingReelection("ME", "house",
  "02", 2026, "Jared Golden")` returns `false` (no row for that seat), and
  `isIncumbentSeekingReelection("ME", "senate", null, 2026, "Susan
  Collins")` returns `true`.
- Prod database untouched throughout. Every database command used
  `ROSTER_STAGING_DATABASE_URL` explicitly (pulled via a fresh `vercel env
  pull --environment=preview` from the Vercel-linked project, confirmed
  non-empty — 146 characters — and confirmed by hostname
  (`ep-aged-cake-aqhinavd...`) to be the staging branch, not the production
  `ep-silent-dew-aqnmly1g...` branch); `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above — not set anywhere
  persistent (not `.env.local`, not Vercel, not any committed file).

## Governing calendar dates (per the plan doc's item (e) requirement)

Pulled directly from Maine's official 2026 Candidate's Guide to Ballot
Access
(`https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Candidates%20Guide%20to%20Ballot%20Access%20Final.pdf`)
and the SoS's Upcoming Elections page:

- **June 9, 2026** — State Primary Election (already past at build time).
- **July 10, 2026** — Graham Platner's (D, US Senate) withdrawal, per the
  SoS's official post-primary withdrawal document. Already happened;
  recorded here because it is the trigger event for the next date.
- **July 13, 2026, 5 p.m. (2nd Monday in July)** — deadline for a primary
  nominee to withdraw and still be eligible for party replacement (Platner's
  7/10 withdrawal falls inside this window, confirming his seat IS eligible
  for replacement, not permanently vacant).
- **July 25, 2026** — Maine Democratic Party's nominating convention
  (per independent news reporting, not an SoS-published date, but directly
  relevant to when the Senate vacancy is expected to resolve).
- **July 27, 2026, 5 p.m. (4th Monday in July)** — statutory deadline (21-A
  MRS §374-A) for the Maine Democratic Party to file a replacement nominee
  for the US Senate seat. **This is the single most important date for this
  fixture** — the Senate roster cannot be considered complete until this
  date passes (or a replacement files earlier). See the dated follow-up
  card below.
- **August 25, 2026, 5 p.m.** — write-in candidate filing deadline for the
  November 3, 2026 general election (70 days before the election).
- **August 25, 2026, 5 p.m.** — general-election candidate withdrawal
  deadline (70 days before the election, 21-A MRS §355) — after this date,
  a withdrawal notice no longer removes the candidate's name from the
  printed ballot (though local officials still post/distribute notices).
  This is Maine's practical ballot-content lock date for this cycle; no
  separate "certification" date beyond this was found in the SoS's
  published materials.
- **November 3, 2026** — General Election.

Two dated follow-up cards have been opened per the epic's "NOT BEFORE
DATE-GATE CONVENTION" — see `voter-choice-backlog.md`:

1. "Re-check official roster: Maine (ME) — US Senate DEM replacement
   nominee," `NOT BEFORE: 2026-07-28` (the day after the statutory filing
   deadline) — adds the actual replacement nominee's row once officially
   filed.
2. "Re-check official roster: Maine (ME) — post-withdrawal-deadline
   sweep," `NOT BEFORE: 2026-08-26` — re-checks for any late withdrawals or
   write-in filings against the August 25 deadlines.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The US Senate Democratic nominee slot has no row.** This is the build's
  central finding, not an oversight — see "Bottom line" and the fixture's
  own docblock. Re-check after July 27, 2026 (or sooner, if a replacement
  files earlier — worth an ad hoc check given the visibility of this race).
- **No general-election candidate has withdrawn** among the 4 determined
  nominees as of transcription time (checked the same 7/13/2026 withdrawal
  document that surfaced Platner's Senate withdrawal — no other `US`/`CG`
  row appears in it) — but the withdrawal window stays open through August
  25, 2026, so any of the 4 recorded rows could still change before then.
- **No write-in candidate has filed** for the general election — the
  filing deadline (August 25, 2026) is still in the future; no row guessed.
- **No independent/non-party candidate filed for US Senate or either House
  district** — confirmed absent from the official Non-Party Candidate List,
  not omitted; Maine's non-party petition deadline (June 1, 2026) has
  already passed, so this is now closed (barring a future declared
  write-in).
- Names are recorded exactly as printed on the official primary-results
  workbooks; not independently re-verified against a third document beyond
  the incumbency cross-checks above.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/me-official-roster/docs/operations/maine-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/maine-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/me-official-roster/scripts/congressional-rosters/me-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/me-official-roster-2026.ts`
  once merged to main).
- **Official Maine source URL(s) used:**
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Primary%20Candidate%20List%20posting%20FINAL%203.16.26.xlsx`
    (SoS official 2026 Primary Candidate List, filing-stage roster, posted
    3/16/2026)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/US%20Senate%20DEM%20-%20FINAL.xlsx`
    and
    `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/US%20Senate%20REP%20-%20FINAL.xlsx`
    (official June 9, 2026 primary results, US Senate, by municipality)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dist%201%20FINAL.xlsx`
    and
    `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dis%201%20REP%20-%20FINAL.xlsx`
    (official June 9, 2026 primary results, CD1, by municipality)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dis%202%20REP%20-%20FINAL.xlsx`
    (official June 9, 2026 primary results, CD2 Republican, by
    municipality)
  - `https://www.maine.gov/sos/news/maine-secretary-states-office-announces-ranked-choice-tabulations`
    and
    `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026-06-19_02-21-13_summary%20DEMCG2.csv`
    (SoS official CD2 Democratic ranked-choice-voting tabulation
    announcement + round-by-round summary)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Post%20Primary%20withdrawals%2020260713.pdf`
    (SoS official "Candidate Withdrawals and Replacement Candidate
    Nominations after the June 9, 2026 Primary," as of 7/13/2026 — the
    source for Platner's withdrawal)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Candidates%20Guide%20to%20Ballot%20Access%20Final.pdf`
    (SoS official 2026 Candidate's Guide to Ballot Access — every governing
    date cited above, including the statutory §374-A replacement-nomination
    deadline)
  - `https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Non-Party%20Candidate%20List-%20FINAL%20posting%206.2.xlsx`
    (SoS official 2026 Non-Party Candidate List, posted 6/1/2026 — confirms
    no independent/non-party federal filer)
  - `https://www.collins.senate.gov/` (incumbency cross-check only —
    confirms Susan Collins as Maine's sitting Senator)
  - Incumbency/non-candidacy cross-checks (news, not primary sources, used
    only to corroborate): govtrack.us / congress.gov (Pingree),
    themainemonitor.org, CNN, rollcall.com (Golden's retirement), NBC News,
    Axios, The Hill, Maine Morning Star (Platner's withdrawal).

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete and pass
`npm run check` cleanly (excluding one pre-existing, unrelated sandbox
artifact — see "Verification performed"). The card's GOAL_CONDITION's
remaining requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag on — are
both done: the importer ran against staging twice, confirmed by direct
row-count query both times (5 rows, 4 House + 1 Senate, no duplication on
re-run), and the real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for both House districts and the Senate race,
with **0 mismatches** against the fixture. Prod was never touched — every
database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this
self-vet.

Still open, same standing gate as every other state built through this
pipeline, plus one Maine-specific item:

1. **Flag flip (prod cutover for ME and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **The US Senate DEM nominee is not yet in the fixture** — this is not a
   defect in this build, it is an accurate reflection of Maine's ballot as
   of 2026-07-15. The dated follow-up card (`NOT BEFORE: 2026-07-28`) adds
   it once officially filed.
3. **A second dated follow-up re-check is required after August 25, 2026**
   (write-in filing + general-election withdrawal deadlines) — opened on
   the backlog per the NOT BEFORE date-gate convention.
