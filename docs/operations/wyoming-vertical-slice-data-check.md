# Wyoming vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Wyoming (WY)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16. Wyoming's 2026 primary (Aug 18, 2026) has **not** happened
yet as of this build — 33 days in the future. The general election is
2026-11-03.

## Bottom line

**GO on the approach for another state.** Both of Wyoming's 2026 federal
contests — the single at-large US House seat and the Class II US Senate
seat — render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across both contests.

**Wyoming's official source is a static PDF, not Civix** — confirmed live
(HTTP 200, `Content-Type: application/pdf`) before assuming any prior
state's pattern applied, per the card's explicit instruction. This is the
simplest source pattern the manual track has seen (mirrors Arizona's
two-static-PDF build): a single 24-page statewide candidate roster, all
pages native-text (no scanned/image pages — the CT scanned-page-
enumeration gotcha does not apply), federal offices entirely on pages 1-2.

**A real, non-obvious finding: BOTH of Wyoming's federal seats are open in
2026, and they are linked to each other.** Sitting Sen. Cynthia Lummis
announced 2025-12-19 she will not seek re-election. Sitting at-large Rep.
Harriet Hageman is not seeking House re-election either — she filed for the
open Senate seat instead (she appears in this fixture's own source PDF
under "UNITED STATES SENATOR - REPUBLICAN", not under the House section).
So neither chamber's roster carries an incumbent this cycle; this was
independently cross-checked against senate.gov and house.gov, never
inferred from the PDF's layout (which carries no incumbency marker at all)
or from this app's own FEC-derived `candidates` table.

**This is a pre-primary build**, matching Arizona's, Alaska's, and several
other states' own pre-primary builds: every filed candidate is recorded
`ballotStatus: "qualified_for_primary_ballot"`, none promoted to
`qualified_for_general_ballot` — promoting any would mean guessing the
Aug 18, 2026 primary's outcome, exactly what the plan doc's SAFETY rule
forbids. Wyoming has no runoff mechanism (a plurality primary decides each
party's nominee outright), so `runoff_pending` is not used anywhere in this
fixture.

**No new `party` union code was needed** — all 19 federal filers are REP or
DEM, both already in `scripts/congressional-rosters/types.ts`.

**NO-GO on fan-out to further states** until the manual track has covered a
few more, and **NO-GO on flipping the flag for real users** without Muxin's
sign-off — same standing gate as every prior state in this track.

## How this was verified — a single static PDF, no browser automation
## needed

1. **Confirmed the source format before assuming any prior state's pattern
   applied**, per the card's explicit instruction: a direct `curl -sI`
   against the I11 rehearsal's landing/artifact URL returned HTTP 200,
   `Content-Type: application/pdf`, confirming `sourceFormat: "pdf"` /
   `parserFamily: "text_pdf"` — not Civix, not an HTML/JS portal.
2. Fetched the PDF and ran `pypdf` text extraction on all 24 pages. Every
   page returned well over 1,000 characters of extractable native text (the
   smallest was 1,509 characters) — no page fell under the CT-gotcha's
   blank-text threshold, so no visual/OCR fallback pass was needed. The
   federal offices (`UNITED STATES SENATOR`, `UNITED STATES REPRESENTATIVE`)
   are entirely contained on pages 1-2, each candidate a repeating
   `<Party> <Name> <Address> <Date Filed> <Phone> <Email>` block under a
   `"<OFFICE> - <PARTY>"` section header.
3. Transcribed all 19 federal candidates directly from the extracted text
   (5 Senate REP, 2 Senate DEM, 10 House REP, 2 House DEM) into
   `scripts/congressional-rosters/wy-official-roster-2026.ts`.
4. Cross-checked incumbency against two independent official sources (never
   the roster PDF's own layout, which has no incumbency field, and never
   this app's own FEC-derived data): senate.gov's "States in the Senate"
   page (Wyoming's Class II seat, up in 2026, held by Lummis — confirmed
   retiring via NBC News/Roll Call, not among the Senate filers) and
   house.gov/representatives (Wyoming's at-large seat, Hageman — confirmed
   she is a Senate filer in this fixture's own source, not a House filer).
5. Pulled Wyoming's own official election-calendar documents (SoS's
   `2026_Key_Election_Dates.pdf` and the legislature's statutory
   `07-202505084-032026DRAFTElectionCalendar.pdf`) for the governing dates
   in the Deliverables section below, and the SoS's own published 2025
   Wyoming Election Code (`ElectionCode.pdf`) for the exact withdrawal
   statutes (W.S. 22-5-220, 22-5-401).
6. `npm run check` (tsc + lint/prettier) passes clean — no new errors; only
   pre-existing complexity warnings unrelated to this change.
7. Imported to the isolated Neon staging branch (`ROSTER_STAGING_DATABASE_URL`,
   pulled via `vercel env pull`, never the ambient `DATABASE_URL`, never
   production):
   ```
   DATABASE_URL="$ROSTER_STAGING_DATABASE_URL" OFFICIAL_ROSTER_ENABLED=1 \
     npx tsx scripts/ingest/official-roster.ts --state WY
   ```
   Result: `[official-roster] done state=WY upserted=19`.
8. **Idempotency confirmed**: re-ran the same import command — same
   `upserted=19`, no duplicate rows (upsert key: state, office, district,
   electionYear, name, stage).
9. **Direct row-count query** (not just the importer's self-reported
   count) against `official_roster_candidates` for `state = 'WY'`:
   ```
   office | district | count
   house  | 00       | 12
   senate | (null)   | 7
   TOTAL: 19
   ```
   Matches the fixture exactly (12 House rows, 7 Senate rows).
10. **End-to-end verification**: called `lookupChallengers("WY", 0, 2026)`
    directly against the staging branch with `OFFICIAL_ROSTER_ENABLED=1`,
    comparing the literal output candidate-by-candidate against the source
    PDF (see Contest inventory below) — all 12 House filers and all 7
    Senate filers render, correct party mapping (`REP` → "Republican",
    `DEM` → "Democrat"), correct `official_state_roster` provenance on
    every row, 0 mismatches.

## Contest inventory

**US House (at-large, district "00") — 12 filers, open seat, primary
pending:**

| Name | Party |
|---|---|
| Bo Biteman | REP |
| Chuck Gray | REP |
| David Giralt | REP |
| Frank Chapman | REP |
| Jillian Balow | REP |
| Keith B. Goodenough | REP |
| Kevin Christensen | REP |
| Reid Rasner | REP |
| Richard Dodson | REP |
| Steve Friess | REP |
| Elena Del Real | DEM |
| Lisa Kinney | DEM |

**US Senate (Class II, statewide) — 7 filers, open seat, primary pending:**

| Name | Party |
|---|---|
| Harriet Hageman | REP |
| Jill M Edwards | REP |
| Jimmy Skovgard | REP |
| John Holtz | REP |
| Sam Mead | REP |
| Billy Benavidez | DEM |
| James Byrd | DEM |

No withdrawals appear on the source roster (the PDF's "Date Withdrawn"
column is blank for every federal row). No minor-party, independent, or
write-in federal filer appears yet — see Known gaps below.

## What was built

- `scripts/congressional-rosters/wy-official-roster-2026.ts` — `WY_STATE`,
  `WY_ELECTION_YEAR`, `WY_STAGE = "primary"`, source-URL/retrieved-at
  consts, `WY_HOUSE_DISTRICT = "00"`, `WY_HOUSE_ROSTER_2026` (12 entries),
  `WY_SENATE_ROSTER_2026` (7 entries).
- `scripts/ingest/official-roster.ts` — WY import block + `WY: [...]`
  entry in the `FIXTURES` map (house + senate fixtures).
- `src/lib/server/officialRoster.test.ts` — WY fixture import, `wyDbRow`
  helper, `WY_HOUSE_DB_ROWS`/`WY_SENATE_DB_ROWS`, and three new `describe`
  blocks (`getOfficialRoster — WY narrowing`, `isIncumbentSeekingReelection
  — WY`, `lookupChallengers — WY wiring`), 7 new test cases, all passing.
  The pre-existing placeholder assertions (`hasOfficialRoster("WY") ===
  false`, `isIncumbentSeekingReelection("WY", ...) === null`) both mock an
  explicitly empty DB return value, so they test the empty-DB code path
  regardless of which state string is passed — confirmed they still hold
  unchanged after WY's fixture landed (both still pass).
- No DB migration needed — `ballot_status` remains plain `text`, no CHECK
  constraint, and no new party code was required.

## Verification performed

- `npm run check`: **passes clean.** No new tsc errors, no new lint errors
  (one pre-existing-pattern prettier fix applied to my own new test code
  during this build); only pre-existing cyclomatic-complexity warnings in
  unrelated files remain, same as every prior state's build.
- `npx vitest run src/lib/server/officialRoster.test.ts`: **221/221 tests
  pass** (7 new WY tests + 214 pre-existing, 0 failures).
- Staging import: `upserted=19`, idempotent on re-run.
- Direct row-count query against staging: 12 house (district "00") + 7
  senate (district null) = 19, matching the fixture.
- End-to-end `lookupChallengers("WY", 0, 2026)` against staging with the
  flag on: all 19 candidates render with `official_state_roster`
  provenance, correct names/parties, 0 mismatches against the source PDF.
- Production: **untouched** — every write went to the isolated staging
  branch only; `OFFICIAL_ROSTER_ENABLED` was set inline for this
  verification session only, never persisted anywhere.

## Known gaps (explicit, not guessed)

- Every row is pre-primary (`qualified_for_primary_ballot`) — Wyoming's
  Aug 18, 2026 primary determines each party's actual nominee. This
  fixture needs a follow-up update after certification (see the dated
  follow-up card below).
- No minor-party, independent, or write-in federal filer appears yet. Two
  filing windows are still open as of this build: the Minor and
  Provisional Party Candidate Deadline (Aug 17, 2026) and the Independent
  Candidate Deadline (per the SoS's own 2026 Key Election Dates PDF: Aug
  24, 2026; W.S. 22-5-307 independently computes to 70 days before the
  Nov 3 general, i.e. Aug 25, 2026 — a one-day discrepancy between the
  SoS's published calendar and my own statute-derived date; the SoS's
  published date governs). The general-ballot roster is not complete
  until after both deadlines pass.
- No candidate-withdrawal deadline is a single fixed date under Wyoming
  law: W.S. 22-5-220 allows pre-primary withdrawal at any time up to the
  primary itself (Aug 18, 2026) by filing a written withdrawal in the
  filing office; W.S. 22-5-401 (major-party) / 22-5-403 (minor/provisional
  party) govern a POST-primary vacancy (death, disqualification, or
  withdrawal) via a certificate process from the party's central
  committee, with no single statutory cutoff date found beyond the
  practical constraint of ballots being finalized/printed for the general
  election. This is recorded as an ongoing risk window, not a fixed date
  to re-check against.

## Deliverables (per the card's standing requirement)

(a) Comparison doc (this file), full absolute path:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/wyoming-vertical-slice-data-check.md`

(b) Fixture file, full absolute path:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/wy-official-roster-2026.ts`

(c) Official source URLs (full, untruncated):
- Candidate roster (source of record for all 19 federal rows):
  `https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf`
- Key election dates calendar:
  `https://sos.wyo.gov/Elections/Docs/2026/2026_Key_Election_Dates.pdf`
- Full statutory election calendar (county canvass / state canvassing
  board dates):
  `https://wyoleg.gov/InterimCommittee/2025/07-202505084-032026DRAFTElectionCalendar.pdf`
- 2025 Wyoming Election Code (withdrawal statutes W.S. 22-5-220,
  22-5-401, 22-5-403):
  `https://sos.wyo.gov/Forms/Publications/ElectionCode.pdf`

(d) Operational-navigation section (static-PDF pattern, no Civix involved):

Wyoming's official source is a single, statewide, all-office PDF served
directly from `sos.wyo.gov` (`/Elections/Docs/2026/...`), not gated behind
any portal or search form — a plain `curl` GET returns it directly (HTTP
200, `Content-Type: application/pdf`), no browser automation or session
cookies required for the fetch itself (the server does set some tracking
cookies in its response headers, but they are irrelevant to a stateless
GET of a static file). The roster lists every office on the 2026 primary
ballot — federal, state, and local — as one continuous list, grouped under
`"<OFFICE> - <PARTY>"` section headers (e.g. `UNITED STATES SENATOR -
REPUBLICAN`), each candidate a fixed-format block: name, mailing address,
filing date, phone, email. The federal offices happen to be the very first
two sections in the document (pages 1-2 of 24), so no scrolling/pagination
logic was needed to locate them — a straightforward `pypdf` text
extraction pass over all pages, confirming true page count (24) and
verifying no page fell below a reliable-extraction threshold, was
sufficient. The only meaningfully non-obvious step was confirming Hageman
appeared under the Senate section rather than assuming (per the card's own
prior-state-pattern-check requirement) she was still a House filer — a
plain visual read of the extracted text page 1 settled this immediately.
The separate key-election-dates PDF and the legislature's own multi-page
statutory calendar PDF were fetched the same way (plain `curl`, `pypdf`
extraction, grep for date-bearing lines) to assemble the governing-dates
list in (e) below.

(e) Every governing calendar date found, with what each resolves:

- **May 14 – May 29, 2026** — Candidate Filing Period (closed; every
  filer's "Date Filed" on the source roster falls inside this window).
- **Aug 17, 2026** — Minor and Provisional Party Candidate Deadline (source:
  SoS 2026 Key Election Dates PDF).
- **Aug 18, 2026** — Primary Election. Determines each party's actual
  federal nominee; this fixture is entirely pre-primary as of build time.
- **Aug 20, 2026** — Deadline to Request Write-In Votes (source: statutory
  calendar, W.S. 22-16-106c).
- **Aug 21, 2026** — County Canvassing / Ballot Audit (source: statutory
  calendar, W.S. 22-16-106b).
- **Aug 24, 2026** — (i) Deadline to Request Recount (W.S. 22-16-110); (ii)
  Independent Candidate Deadline per the SoS's own published 2026 Key
  Election Dates calendar (statute W.S. 22-5-307 independently computes to
  Aug 25, 2026 — 70 days before the Nov 3 general; the SoS's published date
  governs for this purpose).
- **Aug 26, 2026** — Primary State Canvassing Board (source: statutory
  calendar, W.S. 22-16-118). This is the point the primary results become
  official/certified — the date this fixture's re-check follow-up card is
  gated on (see below).
- **Sept 4, 2026** — City and State Certify Candidates for General (source:
  statutory calendar, W.S. 22-6-101). This is Wyoming's ballot-content
  certification deadline — after this date, the 2026 general-election
  roster is fully locked for this cycle.
- **Ongoing (no single fixed date)** — candidate-withdrawal risk window:
  pre-primary withdrawal is available any time up to Aug 18, 2026 (W.S.
  22-5-220); a post-primary nominee vacancy (death, disqualification, or
  withdrawal) is handled via a party-certificate process (W.S. 22-5-401 /
  22-5-403) with no single statutory cutoff beyond the practical
  constraint of the general-election ballots being finalized/printed —
  recorded as an explicit ongoing gap, not a fixed re-check date.

A dated `NOT BEFORE: 2026-08-26` follow-up card ("re-check Wyoming's
official roster post-primary-certification, promote determined nominees
from `qualified_for_primary_ballot` to `qualified_for_general_ballot`, and
check for any post-primary withdrawal per W.S. 22-5-401/22-5-403") is
opened in the backlog alongside this PR, per the epic's NOT-BEFORE
date-gate convention — recording these dates here is not the finish line.
