# Iowa vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Iowa (IA)"
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). One of many states built
in parallel through the manual track alongside AZ, TX, OK, AL, AK, CO, CT,
CA, AR, DE, FL, HI, and others.

Date: 2026-07-15. Iowa's 2026 primary (June 2, 2026) has **already
occurred** by this build's retrieval date. Every US House and US Senate
nomination is determined — no pending primary, runoff, or convention contest
was found. The general election is November 3, 2026.

**Why Iowa is not a purely mechanical "next state" build:** the I06
rehearsal's `sourceFormat: "html"` finding turned out to be only half-right
— Iowa's official source IS static HTML, but the specific URL the rehearsal
cited (`sos.iowa.gov/news-resources/complete-list-state-and-federal-
candidate-filings`) is a **stale 2016 news article**, not a live 2026 data
source. The real, current candidate list lives at `sos.iowa.gov/general-
election` and is a PDF, refreshed throughout the filing period — confirmed
live during this build, per the card's own instruction not to assume the
rehearsal is still current.

## Bottom line

**GO on the approach.** All 4 IA House districts plus the Senate race render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — **0 mismatches across all 5 contests**, all fully determined.

**Two open House seats, confirmed by cross-checking house.gov, not
assumed:** the sitting Iowa House delegation (per house.gov's "By State and
District" directory) is Miller-Meeks (IA-1), Hinson (IA-2), Nunn (IA-3), and
Feenstra (IA-4) — all Republicans. The official candidate list shows Hinson
filed for **US Senate** instead of IA-2 re-election (Joe Mitchell is the new
Republican IA-2 nominee), and Feenstra is absent from the IA-4 filer list
entirely (Chris McGowan is the new Republican IA-4 nominee). IA-1
(Miller-Meeks) and IA-3 (Nunn) are both incumbents seeking re-election.

**US Senate is an open seat**, confirmed against senate.gov: sitting
senators Chuck Grassley and Joni Ernst are both absent from the 2026 Senate
candidate list (Hinson/Turek/Laehn instead) — Ernst's seat is the one up
this cycle and she is not seeking re-election.

**No pending nomination or runoff-style status was needed for Iowa.** The
official candidate list (last updated 2026-07-09, more than five weeks
after the June 2 primary) shows exactly one candidate per party per race for
every federal contest — every nomination is `qualified_for_general_ballot`.

## How this was verified — a static HTML hub whose PDF required browser
rendering, not text extraction

Iowa's official source (`sos.iowa.gov/general-election`) is static HTML —
confirmed **not** Civix-vended, matching the I06 rehearsal's
`sourceFormat: "html"` finding. The live candidate list is a single PDF
linked from that hub under a "Candidate List" heading. Both `WebFetch` and
the sandboxed network layer returned **HTTP 403 on every sos.iowa.gov path
tried, including the static PDF file itself** — a broader block than the
SPA-specific protection the Civix playbook describes, since this is a plain
static HTML/PDF site, not a JS portal. The only way through was
`mcp__claude-in-chrome__*` browser automation, exactly as the Civix
playbook prescribes for JS portals, even though Iowa's site isn't one.

Reading the PDF itself was its own obstacle: the Chrome PDF viewer's text
layer did not expose extractable text via `get_page_text` (canvas-rendered,
not a text-layer DOM), so the candidate table was read via zoomed
screenshots of the rendered PDF page instead. The viewer's own page-jump
controls (the page-number input box, double-clicking a thumbnail) proved
unreliable mid-session — repeatedly dropping into a blank/unresponsive
state that required opening a fresh tab to recover. The reliable path that
emerged: open a fresh tab per PDF, then zoom directly into the left-sidebar
thumbnail rather than fighting the main viewport's page-jump controls.

Incumbency was cross-checked against two independent official sources,
never guessed: `house.gov`'s "By State and District" directory (Iowa
section) and `senate.gov`'s Iowa state page — both confirm the sitting
delegation and directly support the IA-2/IA-4 open-seat and open-Senate-seat
findings above.

## A cross-check finding this build made (not a bug — a real, non-obvious
data point)

Two of Iowa's four sitting House Republicans are not seeking re-election to
their own seats: Ashley Hinson (IA-2) is instead running for the open US
Senate seat, and Randy Feenstra (IA-4) is absent from the IA-4 filer list
entirely (his own further plans were not independently confirmed this
session — out of scope for this fixture, which only needed the roster/
incumbency fact). Both are exactly the same shape as prior builds'
sitting-officeholder-not-seeking-re-election findings (OK's Hern/Armstrong,
AL's Moore/Tuberville) — confirmed present in the official source, not
inferred.

## Contest inventory

| Office | District | Candidates | Status |
| --- | --- | --- | --- |
| US Senate | — | Hinson (R), Turek (D), Laehn (L) | Determined, open seat |
| US House | IA-1 | Miller-Meeks (R, incumbent), Bohannan (D), Bridgford (No Party) | Determined |
| US House | IA-2 | Mitchell (R), James (D), Stewart (L), Bushaw (No Party) | Determined, open seat |
| US House | IA-3 | Nunn (R, incumbent), Trone Garriott (D) | Determined |
| US House | IA-4 | McGowan (R), Dawson (D) | Determined, open seat |

## What was built (delta from the AZ/TX/OK/AL pattern)

- `scripts/congressional-rosters/ia-official-roster-2026.ts` — new fixture,
  house + senate, mirroring AL's shape (`IA_HOUSE_ROSTER_2026`,
  `IA_SENATE_ROSTER_2026`, `IA_OPEN_SEAT_DISTRICTS`).
- `scripts/congressional-rosters/types.ts` — added a new `"NPI"` party code
  for Iowa's own "No Party" ballot designation (the official candidate list
  literally prints "No Party", not "Independent"), following the same
  precedent as AIP/AKP/NPP/PF/LPF/FFP — a state's own literal ballot-label
  wording is preserved rather than collapsed into the generic `IND` bucket.
- `src/lib/server/races.ts` — added `NPI: "No Party"` to the `PARTY_NAMES`
  display map alongside the new type.
- `scripts/ingest/official-roster.ts` — registered `IA` in the `FIXTURES`
  map (house + senate entries).
- `src/lib/server/officialRoster.test.ts` — 8 new tests: district-narrowing
  (all 4 districts + Senate), ballot-status coverage, incumbency (IA-1/IA-3
  true, IA-2/IA-4 false), and `lookupChallengers` wiring for all 4 districts
  plus Senate.
- No migration needed — `db/schema.ts`'s `official_roster_candidates` table
  (0015) plus the null-district uniqueness fix (0016) already cover a new
  state fixture; `ballot_status` and `party` are plain `text`, no CHECK
  constraint.
- No `SeatChallenger`/`RepCard`/translation changes — Iowa has no pending
  nomination, so the `isRunoffPending`/"Runoff pending" plumbing is never
  exercised by this fixture.

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + `vitest run`) — **all 3168 tests
  pass** (162 test files), including the 8 new Iowa tests, zero regressions.
- Fixture imported to the isolated staging Neon branch via
  `DATABASE_URL=$ROSTER_STAGING_DATABASE_URL npx tsx
  scripts/ingest/official-roster.ts --state IA` — importer reported
  `upserted=14` (11 House + 3 Senate rows).
- **Idempotency verified**: re-ran the importer a second time — reported
  `upserted=14` again, no duplication (upsert key is `(state, office,
  district, election_year, name, stage)`).
- **Direct row-count query against staging** (not just the importer's
  self-reported count), grouped by office: `house` → 11, `senate` → 3 — an
  exact match to the fixture's 11 House + 3 Senate entries.
- Candidate-by-candidate comparison against the official PDF (all 14 names,
  parties, districts) — 0 mismatches. Incumbency cross-checked against
  house.gov/senate.gov independently of the candidate-list PDF.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **No independent second-source cross-check of the candidate names
  themselves.** house.gov/senate.gov served as the independent incumbency
  cross-check per the SAFETY rule, but unlike Oklahoma's parallel CSV/XML
  export, no second document was located that independently corroborates
  the candidate list's names/parties/districts — only the SoS's single
  candidate-list PDF. Flagged as a known gap, not fabricated corroboration.
- **The exact reason Rep. Feenstra (IA-4) is not seeking re-election** to
  his House seat was not independently confirmed beyond his absence from
  the IA-4 filer list — out of scope for this fixture (only the roster/
  incumbency fact matters here).
- **Governing calendar date found:** the candidate-list PDF's own footer
  states "Ballot vacancies occuring after the Primary Election may be
  filled by convention until August 19 at 5:00 p.m." This is corroborated
  by Iowa Code section 44.9's 76-days-before-the-election withdrawal cutoff
  for nominations filed under section 44.4(1)(b) — November 3, 2026 minus
  76 days is August 19, 2026 exactly — confirmed via `legis.iowa.gov`. As
  of this build (2026-07-15), that window is still open (over a month
  away). A dated `NOT BEFORE` re-check follow-up card was opened per the
  epic's standing requirement (see the backlog).
- No Green Party filing was found for any Iowa 2026 congressional or Senate
  race in the official candidate list reviewed this session (verified
  absent, not simply unresearched).

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ia-official-roster/docs/operations/iowa-vertical-slice-data-check.md`
  (will land at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/iowa-vertical-slice-data-check.md`
  once merged).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ia-official-roster/scripts/congressional-rosters/ia-official-roster-2026.ts`
  (will land at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ia-official-roster-2026.ts`
  once merged).
- **Official Iowa source URL(s) used:**
  - `https://sos.iowa.gov/general-election`
    (Iowa Secretary of State's 2026 general election hub — links the
    candidate list PDF below; confirms US Senator + US Representative, all
    districts, are on the Nov 3, 2026 ballot)
  - `https://sos.iowa.gov/sites/default/files/2026-07/2026%20General%20-%20Candidate%20List%20Database%20-%20All%20Elections_1.pdf`
    (Iowa Secretary of State's official 2026 General Election candidate
    list database, last updated 2026-07-09 — primary source for every
    candidate name/party/district recorded here)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    confirms the IA-2/IA-4 open-seat findings above)
  - `https://www.senate.gov/states/IA/intro.htm` (Senate incumbency
    cross-check only — confirms the open Senate seat)
- **Operational-navigation section:** see "How this was verified" above —
  the static-HTML-hub-with-403-blocked-PDF mechanics, and the Chrome PDF
  viewer's unreliable page-jump controls / thumbnail-zoom workaround, are
  new to this build (not covered by the Civix playbook or any prior
  state's write-up).
- **Governing calendar dates:** August 19, 2026 — last day a ballot vacancy
  may be filled by convention (also Iowa Code §44.9's NPPO/petition
  withdrawal cutoff, 76 days before Nov 3, 2026), source: the official
  candidate-list PDF's own footer, corroborated via `legis.iowa.gov`,
  confirmed 2026-07-15.

## GO/NO-GO verdict

**GO on the approach — Iowa is a fully-determined, no-pending-contest
state; the existing fixture/importer/test pattern covers it with no new
schema or UI code, only one new party code (`NPI`) for a state-specific
ballot label. NO-GO on flipping the flag for real users** without Muxin's
sign-off — same standing gate as every prior state.

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for any built state, including Iowa)** —
   human sign-off required, unaffected by this build.
2. **A dated re-check** is due around August 19, 2026, once Iowa's ballot-
   vacancy-fill-by-convention window closes (see "Known gaps" and the
   dated follow-up card opened on the backlog).
