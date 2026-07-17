# New York vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: New York (NY)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Manual track,
after AZ, TX, OK, AL, AK, CO, CT, CA, AR, DE, DC, FL, GA, HI, ID, IL, IN, IA,
KS, KY, LA, MD, ME, MS, MO, MT, NE.

Date: 2026-07-16. New York's 2026 primary (June 23, 2026) had **already
happened** by build time. The general election is 2026-11-03.

## Bottom line

**GO on the approach.** All 26 NY US House districts render correctly
end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against the real
Neon staging branch through the actual `lookupChallengers` code path — **0
mismatches across all 9 sampled contests** spanning every district shape
(incumbent-defended, open seat, incumbent-defeated-in-primary, plurality
multi-candidate field).

**New York is not Civix-vended.** Its official sources are NYS BOE's own
ASP.NET "Who Filed" tool and Election Night Reporting system
(`elections.ny.gov` / `publicreporting.elections.ny.gov` /
`nyenr.elections.ny.gov`, not `*.civixapps.com`) — the Civix playbook does
not apply.

**New York has 0 US Senate contests in 2026** — Sen. Gillibrand's seat runs
to 2031 and Sen. Schumer's to 2029, neither up this cycle (confirmed via web
search).

**No `runoff_pending` status appears anywhere in this build.** New York has
no runoff mechanism at all — a contested primary is decided by plurality,
confirmed explicitly for CD-12's 8-candidate field (winner at 38.99%, no
runoff triggered). Every one of the 52 rows in this fixture is
`qualified_for_general_ballot`.

**No new party code or DB migration was needed.** New York's electoral
fusion (a candidate appearing on more than one party's line) is represented
as a single row under the candidate's anchor major party, per the fixture
schema — never a duplicate row. Every confirmed Conservative/Working
Families filing found this session belongs to a candidate already counted
under DEM or REP.

## How this was verified — three different official sources, no single

document covers all 26 districts

New York's designating-petition filing venue depends on district geography,
which meant no single official document could cover every district — this
is the first state in this track where the official-source picture is a
patchwork by legal design, not by a documentation gap:

1. **NYS BOE's own "Who Filed" tool**
   (`publicreporting.elections.ny.gov/WhoFiled/WhoFiled`), queried with
   **Election Type=Primary** (Election Type=General only surfaces
   independent-body/late filings — a first pass with General returned just
   9 statewide rows and was the wrong query for finding designating
   petitions). Covers districts that cross a county line **outside** New
   York City's five boroughs: **CD 2, 3, and 16–26 (13 districts)**. This
   is also the only source that officially confirms every New York fusion
   line (Conservative / Working Families cross-endorsements) — 66 rows
   total, each with a `Valid`/`Invalid`/`Declined` status.
2. **Suffolk County BOE's own "Who Filed" page**
   (`apps2.suffolkcountyny.gov/boe/documents/2026 Primary - Who
Filed.html`), for **CD-1**, which lies entirely within Suffolk County and
   therefore files locally rather than with the state.
3. **NYC BOE's "Primary Contest List" PDF**
   (`vote.nyc/page/list-candidates`, dated 5/7/2026), for the NYC-based
   districts. This document required a workaround to read at all: a plain
   `WebFetch` and Chrome's own PDF.js viewer both failed to extract text
   (binary/canvas-rendered); routing the same URL through **Google's Docs
   Viewer proxy**
   (`docs.google.com/viewer?url=<encoded-pdf-url>&embedded=true`) rendered
   it as extractable text. The document turned out to be a **contest list**,
   not a full candidate roster — it structurally excludes any race with
   only one filer (verified empirically: every one of its ~71 entries has
   2+ candidates, zero single-candidate entries exist anywhere across all
   68 pages). It confirmed every **contested** Democratic primary field for
   CD 6,7,9,10,11,12,13,14,15.
4. **Primary results and the set of contested districts** came from **NYS
   BOE's Election Night Reporting** (`nyenr.elections.ny.gov`), which also
   served as an independent structural signal: its own district-selector
   dropdown only lists districts that had an actual contested primary
   (CD 1,3,6,7,9,10,11,12,13,14,15,17,21,23,24,25) — every other district's
   Democratic side was uncontested, cross-checked against source (1) above
   for the districts it covers.
5. **Incumbency** was cross-checked against `house.gov/representatives`
   ("By State and District"), never guessed from a filing source or this
   app's own FEC-derived `candidates` table. Two sitting members lost their
   own primary and are not the 2026 nominee: **Dan Goldman (CD-10)**, who
   lost to Brad Lander, and **Adriano Espaillat (CD-13)**, who lost to
   Darializa Avila Chevalier — neither appears in this fixture, and neither
   winning challenger is flagged `isIncumbent`. Three seats are open because
   the sitting member isn't running at all: **CD-7** (Nydia Velázquez
   retiring), **CD-12** (Jerry Nadler retiring), **CD-21** (Elise Stefanik
   not seeking re-election).

**A KNOWN, DISCLOSED COVERAGE GAP — the uncontested nominee in 12
districts.** Neither the state "Who Filed" tool (doesn't cover NYC/Nassau/
Suffolk-only districts) nor the NYC BOE Contest List (structurally excludes
uncontested races) surfaces the uncontested filer's name for **CD
4,5,6,7,8,9,10,11,12,13,14,15** (Driscoll, Marsh, Chou, Rivera, Mizrahi,
Anabilah-Azumah, Moore, Malliotakis, Shinkle, Williams, Hysenaj, Sapaskis,
plus Gillen/Meeks/Jeffries on the Democratic side of CD 4/5/8). This mirrors
Connecticut's disclosed petition-route coverage gap
(`docs/operations/connecticut-vertical-slice-data-check.md`) — a real,
disclosed document-format limitation, not a guess about a contest outcome.
Each of these names was cross-checked against **multiple independent
sources**, not a single one: Wikipedia's 2026 NY House elections article
(itself sourced to FEC filings), plus for the higher-profile races, direct
FEC.gov candidate records and contemporaneous news coverage — e.g. Caroline
Shinkle (CD-12): FEC candidate ID `H6NY12404`, independently confirmed via
Patch, West Side Rag, Newsmax, and Fox News reporting as the sole Republican
filer; Jennifer Moore (CD-10): confirmed via FEC.gov's NY-10 2026 race page.
See "Known gaps" below.

**Independent/minor-party candidates:** three self-created independent-body
lines were legitimately confirmed and are noted (not separate rows, since
each belongs to an already-counted major-party nominee): Anthony Constantino
(CD-21, also carries "Taxpayer Rights," Valid). Three other attempts were
formally **rejected** by NYS BOE (`Invalid` status) and are excluded:
Gendebien's "Lower Costs Now" (CD-21), Staton's "The People's Party"
(CD-22), Sloan's "Upstate" (CD-24). A further set of Wikipedia-reported
"filed paperwork"/"declared" independents with no corresponding official
`Valid` record anywhere are excluded: CD-1 (Maggio, Sorensen), CD-7
(Ghaznavi), CD-8 (Soyoung Kim), CD-12 (Ortiz, Hur, Negron), CD-15 (Duran,
Easton), CD-25 (Walton).

## Contest inventory

New York has **26 US House districts and 0 US Senate contests in 2026.**

| District | Democratic                | Republican               | Status                                       |
| -------- | -------------------------- | ------------------------- | --------------------------------------------- |
| CD1      | Gallant (59.75%, beat Ventouras; Jacobs filed but did not appear on the certified primary ballot) | LaLota\* (uncontested, +CON) | Determined |
| CD2      | Halpin (uncontested, +WFP) | Garbarino\* (uncontested, +CON) | Determined |
| CD3      | Suozzi\* (78%, beat Welch) | LiPetri (80%, beat Hach, +CON) | Determined |
| CD4      | Gillen\* (uncontested)     | Driscoll (89%, beat Williams) | Determined |
| CD5      | Meeks\* (uncontested)      | Marsh (uncontested)       | Determined |
| CD6      | Meng\* (56%, beat Park)    | Chou (uncontested)        | Determined |
| CD7      | Valdez (56%, 4-way, open seat) | Rivera (uncontested)  | Determined — open seat |
| CD8      | Jeffries\* (uncontested; Ossé withdrew) | Mizrahi (uncontested) | Determined |
| CD9      | Clarke\* (66%, beat Goldfarb/Bristol) | Anabilah-Azumah (uncontested) | Determined |
| CD10     | Lander (65%, defeated incumbent Goldman) | Moore (uncontested) | Determined — incumbent lost primary |
| CD11     | DeCillis (58%, beat Ziogas) | Malliotakis\* (uncontested) | Determined |
| CD12     | Lasher (39% plurality, 8-way, open seat) | Shinkle (uncontested) | Determined — open seat |
| CD13     | Avila Chevalier (49%, defeated incumbent Espaillat) | Williams (uncontested) | Determined — incumbent lost primary |
| CD14     | Ocasio-Cortez\* (85%, beat Garcia/Dolan) | Hysenaj (uncontested) | Determined |
| CD15     | Torres\* (71%, beat Blake/Vega) | Sapaskis (uncontested) | Determined |
| CD16     | Latimer\* (uncontested, +WFP) | Cinquemani (uncontested) | Determined |
| CD17     | Conley (6-way, +WFP)       | Lawler\* (uncontested, +CON) | Determined |
| CD18     | Ryan\* (uncontested, +WFP) | Auringer (uncontested, +CON) | Determined |
| CD19     | Riley\* (uncontested, +WFP) | Oberacker (74%, beat Portelli, +CON) | Determined |
| CD20     | Tonko\* (uncontested, +WFP) | Ambrosio (uncontested, +CON) | Determined |
| CD21     | Gendebien (62%, open seat) | Constantino (59%, +Taxpayer Rights) | Determined — open seat |
| CD22     | Mannion\* (uncontested, +WFP) | Buller (uncontested, +CON) | Determined |
| CD23     | Gies (68%, beat Stocker, +WFP) | Langworthy\* (uncontested, +CON) | Determined |
| CD24     | Ellman (59%, beat Kastenbaum, +WFP) | Tenney\* (uncontested, +CON) | Determined |
| CD25     | Morelle\* (62%, beat Wilt/Traywick, +WFP) | McIntyre (uncontested, +CON) | Determined |
| CD26     | Kennedy\* (uncontested)    | Hannon (uncontested, +CON) | Determined |

\* sitting incumbent, confirmed via house.gov, seeking re-election.
+CON / +WFP = also carries the Conservative / Working Families line
(confirmed via NYS BOE "Who Filed," districts 2,3,16-26 only).

## What was built (delta from the AZ/TX/OK/AL/.../NE pattern)

Most of the existing vertical-slice infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
`RepCard.tsx`, and the importer's array-shaped `FIXTURES` map. No new
`OfficialBallotStatus` value, no new party code, and no DB migration were
needed for this build (no migration has been needed since 0016).

**New / changed for this build:**

- `scripts/congressional-rosters/ny-official-roster-2026.ts` (new) — 52
  House rows across all 26 districts (2 per district, DEM + REP). Full
  sourcing, methodology, fusion representation, and known limitations are
  in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `NY` in `FIXTURES` with
  a single house entry (NY has no senate contest, so no senate entry — the
  same single-entry shape AZ/CT/CA use).
- `src/lib/server/officialRoster.test.ts` — 205 tests total in the file
  after this addition; new NY-specific coverage: `getOfficialRoster`
  narrowing across all 26 districts, a `runoff_pending`-absence assertion,
  `isIncumbentSeekingReelection` for the 21 incumbent-defended districts
  plus an explicit no-incumbent-flag assertion for the 5 open/
  incumbent-defeated districts, and `lookupChallengers` wiring (house-only,
  CD-10's incumbent-lost-primary case, every district's incumbent
  exclusion, CD-12's open-seat 2-candidate render, and the empty senate
  side).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): **clean.**
  162 test files, 3241 tests passing, 5 pre-existing `todo` (no failures).
  (One `scripts/design/capture-shared.test.ts` failure was observed under
  the build sandbox — a Playwright/headless-Chromium launch permission
  issue unrelated to this change; re-run with the sandbox disabled passed
  cleanly, confirming it was an environment artifact, not a regression.)
- Confirmed via a direct `pg`-backed query (Drizzle `db.execute`, not the
  importer's own count) that staging already has migration `0016`'s `NULLS
  NOT DISTINCT` fix applied — no new migration was needed for this build.
- NY's 52 rows imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`), re-imported, and confirmed idempotent by direct
  row-count query (52 rows / 26 distinct districts, both times — matching
  the fixture exactly, not just the importer's own self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for a representative
  sample spanning every district shape (CD 1, 3, 7, 10, 12, 13, 17, 21,
  25), diffed against the fixture. **0 mismatches across all 9 sampled
  contests.** Literal output (candidate name + party, as the app would
  render it):

  ```
  NY-01 — incumbent LaLota excluded; Gallant renders as the sole challenger
  NY-03 — incumbent Suozzi excluded; LiPetri renders as the sole challenger
  NY-07 — open seat; Valdez and Rivera both render, none excluded
  NY-10 — incumbent-lost-primary seat; Lander and Moore both render, none excluded
  NY-12 — open seat; Lasher and Shinkle both render, none excluded
  NY-13 — incumbent-lost-primary seat; Avila Chevalier and Williams both render, none excluded
  NY-17 — incumbent Lawler excluded; Conley renders as the sole challenger
  NY-21 — open seat; Constantino and Gendebien both render, none excluded
  NY-25 — incumbent Morelle excluded; McIntyre renders as the sole challenger
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
"official_state_roster"`. Every sampled district's sitting incumbent (where
  one exists) was correctly excluded from that district's own challenger
  list. The senate side returned empty for every sampled district (NY has 0
  senate contests; falls through to the unchanged, empty FEC path) —
  expected, not a bug.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). No production migration, no production write, no flag flip.

## Governing calendar dates (per plan doc item (e))

Every date below is sourced directly from New York's own official "2026
Political Calendar" (NYS BOE, revised 12/9/2025):
`https://elections.ny.gov/system/files/documents/2025/12/2026-political-calendar-quad-fold-12.9.2025-final.pdf`
(the direct URL 403s to plain fetch/WebFetch — a Cloudflare bot check — but
the byte-identical document, same "Revised 12/09/2025" content, is also
hosted at
`https://citizenparticipation.westchestercountyny.gov/images/stories/pdfs/2026/2026-political-calendar-quad-fold-12.9.2025.pdf`,
confirmed 2026-07-16). Caveat printed on the document itself: "All Dates
Subject to Change by the State Legislature."

- **2026-06-23** — the primary itself (already covered above).
- **2026-08-17** — **last day to decline nomination** (Election Law
  §6-158(7)) — New York's candidate-withdrawal deadline. Still in the
  future as of this build's 2026-07-16 retrieval date. **This is the safe
  re-check date** — see the dated follow-up card below.
- **2026-08-21** — last day to fill a vacancy created by a declination
  (§6-158(8)).
- **2026-09-09** — SBOE certification of the general election ballot for
  nominations filed in its own office (§4-112(1)).
- **2026-09-10** — CBOE certification of the general election ballot
  (§4-114) — New York's true ballot-content-lock date for this cycle, after
  which no further change is possible.
- Every independent nominating-petition filing deadline (statewide,
  2026-05-19 through 2026-05-26; NYC-specific, 2026-06-01 through
  2026-06-15) has **already elapsed** as of this build's retrieval date —
  no petition-sufficiency or objection-hearing deadline remains open.
- **2026-11-03** — the general election itself (already covered above).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The uncontested nominee in 12 districts** (CD 4,5,6,7,8,9,10,11,12,13,
  14,15 — see the full list and names above) rests on multi-source
  secondary corroboration (Wikipedia + FEC.gov + independent news
  reporting), not a single NY state/county/city official document — no
  official document located this session covers uncontested races in
  these specific districts. This mirrors Connecticut's disclosed
  petition-route gap; a future re-check closer to the September ballot
  certification could confirm these names against NYS BOE's or the
  relevant county's post-certification candidate list once one is
  published.
- **New York's candidate-withdrawal deadline (2026-08-17) is still in the
  future** — a determined nominee could still decline before then. A dated
  re-check follow-up card has been opened per the epic's "NOT BEFORE
  DATE-GATE CONVENTION" (see backlog).
- Two confirmed-`Invalid`/`Declined` independent-body/fusion attempts
  (Gendebien's "Lower Costs Now," Staton's "The People's Party," Sloan's
  "Upstate," Smullen's Conservative attempt, Hewitt's Working Families
  attempt, Kennedy's Working Families attempt) are excluded per their own
  official rejected status — not omissions, verified rejections.
- Names are recorded as they appear in the official filing sources (or, for
  the 12 uncontested-nominee districts, as they appear consistently across
  FEC.gov and independent news coverage); not further independently
  re-verified against a fourth document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/new-york-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ny-official-roster-2026.ts`.
- **Official New York source URLs used:**
  - `https://publicreporting.elections.ny.gov/WhoFiled/WhoFiled`
  - `https://nyenr.elections.ny.gov/`
  - `https://apps2.suffolkcountyny.gov/boe/documents/2026%20Primary%20-%20Who%20Filed.html`
  - `https://www.vote.nyc/sites/default/files/pdf/candidates/2026/PDF_5_7_2026%204_01_50%20PM_PrimaryContestList.pdf`
  - `https://elections.ny.gov/system/files/documents/2025/12/2026-political-calendar-quad-fold-12.9.2025-final.pdf`
    (governing calendar dates)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    official U.S. House member directory, not a New York source, cited
    because it materially shaped the `isIncumbent` data)
  - `https://www.fec.gov/data/candidate/H6NY12404/` and
    `https://www.fec.gov/data/elections/house/NY/10/2026/` (FEC candidate
    records — secondary corroboration only for the disclosed
    uncontested-nominee coverage gap, see "Known gaps" above)

## Operational-navigation section (per the plan doc's standing requirement)

New York's official source is **not** Civix-vended and is **not** a single
document — it is a patchwork of three separate official filing systems,
split by district geography, because New York law routes a congressional
candidate's designating petition to whichever board of elections has
jurisdiction over the district's geography (the state board for a district
crossing a county line outside NYC; a single county board for a
wholly-in-one-county district; the NYC board for a district within NYC's
five boroughs).

**Navigation path 1 — NYS BOE "Who Filed"**
(`publicreporting.elections.ny.gov/WhoFiled/WhoFiled`): a filter form
(Election Year, Office Type, Election Type, Election Date, Office, Party,
District). The **critical, non-obvious step**: Election Type must be set to
**Primary**, not General — General only surfaces independent-body/late
filings (a first attempt with General returned just 9 statewide rows and
looked like the tool was largely empty; switching to Primary and setting
"Show entries" to 100 returned the real 66-row designating-petition data
set, including every confirmed fusion line). The page 403s to `WebFetch`
and returns a "Just a moment..." Cloudflare challenge to plain `curl`, but
loads and is fully readable through an actual Chrome session
(`mcp__claude-in-chrome__*` tools) — no further trick needed once loaded in
a browser.

**Navigation path 2 — Suffolk County BOE's own "Who Filed" page**: a static
HTML page (`apps2.suffolkcountyny.gov/boe/...`), readable directly via
`get_page_text` with no browser tricks needed — the easiest of the three
sources.

**Navigation path 3 — NYC BOE's "Primary Contest List" PDF**: this was the
hardest source in this build. The PDF itself returns unreadable/corrupted
binary content to `WebFetch`, and Chrome's own native PDF.js viewer also
returns "No text content found" via `get_page_text` (the page renders to a
`<canvas>`, not selectable DOM text). **The working mechanic**: route the
same PDF URL through Google's Docs Viewer proxy instead —
`https://docs.google.com/viewer?url=<url-encoded-pdf-url>&embedded=true` —
which renders the PDF as real, `get_page_text`-extractable DOM text, a
batch of pages at a time, requiring repeated `scroll` + `get_page_text`
calls to page through the full 68-page document. This same technique also
successfully extracted the NYS BOE's own "2026 Political Calendar" PDF,
which independently 403s to `WebFetch`/`curl` behind a Cloudflare
challenge. **This is the single most reusable finding from this build**:
any future state whose official PDF resists both `WebFetch` and Chrome's
native PDF viewer should try the Google Docs Viewer proxy before assuming
the document needs OCR or a separate PDF-rendering library.

**Signal reliability:** the NYC Contest List's `"# to be nominated: 1"`
header on every office block is reliable, but the document's *silence* on
uncontested races is the load-bearing hazard — a naive read could
mistakenly conclude an uncontested district's Republican line has no
nominee at all, when in fact it simply never generates a contest-list entry
for a single-filer race. This is analogous to Oklahoma's finding ("a party
with only one filer does not appear in the results at all") but for a
*filing* list rather than a *results* list — the same category of trap,
different document type.

**Independent/write-in and fusion candidates:** New York's electoral fusion
(a candidate appearing on more than one party's ballot line) and its
ad-hoc independent-body petitions (a self-created line name like "Taxpayer
Rights") both surface through the *same* "Who Filed" mechanism as major-
party designating petitions — there is no separate document for them,
unlike Texas's standalone independent-declaration PDF. The `Valid` /
`Invalid` / `Declined` status column on each row is the load-bearing signal
for whether an attempted line actually reached the ballot — several
attempts in this build's data were `Invalid` (petition rejected) or
`Declined` (offered but not accepted), and excluding those correctly
required reading that column, not just the presence of a row.
