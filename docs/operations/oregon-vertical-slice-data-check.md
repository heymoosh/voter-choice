# Oregon vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Oregon (OR)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16. Oregon's 2026 primary (May 19, 2026) is already certified
(Secretary of State canvassed and certified June 25, 2026 — see "Governing
calendar dates" below). The general election is November 3, 2026. **Every
2026 federal nomination in Oregon is determined** — no pending runoff, no
open seat, no primary-stage roster (unlike Kansas's or Florida's still-open
builds).

## Bottom line

**GO on the approach.** All 6 OR House districts plus the Senate race render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` /
`getOfficialRoster` code path — **0 mismatches across all 7 contests.**

**Oregon is ORESTAR-vended, and — unlike the task brief's starting
assumption — the specific public endpoint this build needed (the Candidate
Filing Search) was NOT WAF-blocked.** The donor-ingest script's own comment
(`scripts/ingest/or-orestar-donors.ts`) describes a different ORESTAR
endpoint (contribution/donor search) that needs a rendered, non-headless
Playwright session because of a WAF. This build's endpoint —
`secure.sos.state.or.us/orestar/CFSearchPage.do` (Candidate Filing Search) —
rendered cleanly for a plain `WebFetch` too (spot-checked directly, see
below); browser automation (`mcp__claude-in-chrome__*`) was still used for
the actual data pull, not to defeat a WAF but because the search form's
"Election" and "Filing for Office of" dropdowns are AJAX-cascading (selecting
one repopulates the other's option list and invalidates prior element
references), which needed a real DOM read-after-each-set loop.

**No new party code, no ambiguous nomination, no open seat.** Every one of
the 14 rows below is `DEM` or `REP`; no independent, minor-party, or
write-in candidate had filed for any Oregon federal contest as of this
build's 2026-07-16 retrieval date — confirmed directly from ORESTAR's own
post-certification candidate list (12 US Representative filings + 2 US
Senator filings, exactly 2 major-party nominees per contest, no more), not
inferred from an absence in the primary-results abstract alone. The
certificate-of-nomination filing window for a nonaffiliated/minor-party
candidate is **still open** (opened June 3, 2026; runs through August 18,
2026 for an elected incumbent, August 25, 2026 for anyone else) — a future
recheck after that date could surface additional general-ballot rows; a
dated follow-up card is opened for that recheck (see "Known gaps" below).

## How this was navigated — ORESTAR + the Secretary of State's own results archive

1. **Primary RESULTS (who won):** the Secretary of State's own
   `results.oregonvotes.gov` redirects to
   `sos.oregon.gov/elections/pages/historical-data.aspx` ("Election Results
   & History"), whose 5/19/2026 row links to
   `records.sos.state.or.us/ORSOSCMSearch/Search/RecordViewer.aspx?uri=16180585`
   — a real, text-layer PDF ("2026 May Primary Election Official Results.PDF",
   63 pages) rendered in a page-navigable web viewer. This is NOT an image
   scan: the browser tool's `get_page_text` extracted clean, structured
   county-by-county vote tables directly (no OCR needed). Every one of the 6
   US House district contests plus the US Senate contest (Democratic and
   Republican primary, broken out separately) was read directly off this
   abstract's `*Nominee`-marked winner column — the same convention Maine's
   and Idaho's builds used.
2. **Candidate SET / general-ballot list (independent corroboration):**
   ORESTAR's public "Candidate Filing Search"
   (`secure.sos.state.or.us/orestar/CFSearchPage.do` →
   `cfFilings.do` results), searched separately by `Filing for Office of` =
   "US Representative" (12 results) and "US Senator" (2 results), both
   scoped to `Election: 2026 General Election`. Every one of these 14 rows
   shows `Filing Method: Nominated`, `Filing Date: 06/25/2026`, `Qualified:
   Yes` — i.e. ORESTAR mechanically carries a certified primary winner onto
   the general-election candidate list on the Secretary of State's
   certification date, with no separate candidate action required. This
   second, independent official system agreeing exactly with the
   primary-results abstract (same 14 names, same districts, same parties) is
   stronger corroboration than either source alone, and is also how this
   build confirmed the ABSENCE of any independent/minor-party/write-in
   filer (a negative result that a single source's silence wouldn't
   establish as confidently).
3. **Incumbency cross-check**, never guessed from ORESTAR or this app's
   FEC-derived `candidates` table: `https://www.house.gov/representatives`
   ("By State and District" → Oregon) confirmed Bonamici (1st), Bentz
   (2nd), Dexter (3rd), Hoyle (4th), Bynum (5th), and Salinas (6th) as
   Oregon's six sitting Representatives — an exact match to every
   district's primary winner, confirming zero open seats. Separately,
   `https://www.senate.gov/states/OR/intro.htm` confirmed Jeff Merkley and
   Ron Wyden as Oregon's two sitting senators (Merkley holds the seat up in
   2026; Wyden's is not up).
4. **Governing calendar dates**: the Secretary of State's own 2026 Elections
   Calendar (`sos.oregon.gov/elections/Documents/current-elections-calendar.pdf`,
   17 pages) renders in Chrome's built-in canvas-based PDF viewer with **no
   accessible text layer** for the browser tool's page-text extraction (a
   different failure mode than the results abstract above, which uses a
   real PDF.js-style text-layer viewer) — and a `WebFetch` attempt against
   the same URL returned garbled/incorrect dates (its small summarizer
   model appears to have hallucinated a January-only excerpt rather than
   reading the full 17-page table). The reliable path: `WebFetch` downloads
   and locally caches the raw PDF bytes as a side effect even when its own
   summary is wrong; `poppler`'s `pdftotext -layout` was installed
   (`brew install poppler`) and run directly against that cached file, which
   extracted the complete, clean 17-page date table used for every date
   below.

**Reliable vs. unreliable signals encountered this session:**
- Reliable: the primary-results abstract's `*Nominee` marker; ORESTAR's
  `Filing Method: Nominated` + `Qualified: Yes` fields; `pdftotext -layout`
  against a real text-layer PDF.
- Unreliable: `WebFetch`'s own built-in summarization of a long, multi-page
  tabular PDF (silently wrong/truncated on the elections-calendar document —
  caught only by independently re-deriving the same dates via
  `pdftotext`, not by any error signal from the tool itself); Chrome's
  built-in PDF viewer's in-document Ctrl+F find bar, which crashed the
  `claude-in-chrome` extension's tab-automation bridge mid-session
  (`Cannot access a chrome-extension:// URL of different extension`) and
  required a fresh `tabs_context_mcp` call to recover — avoided for the rest
  of the session in favor of the page-number-jump navigation used
  successfully on the results-abstract viewer.

**Not used as a source, deliberately:** Ballotpedia, Wikipedia, and NPR's
election-results tracker (used only as an informal pre-primary spot-check
of the field before pulling the official results — every figure recorded in
the fixture is from the Secretary of State's own abstract / ORESTAR, not
from any secondary source). This mattered concretely for CD5: pre-primary
news coverage named four possible Republican contenders (Adair, Lockwood,
Perkins, Lehman); the official abstract shows only two names on the actual
CD5 Republican primary ballot (Adair, the winner, and Lockwood) — Perkins
ran in the separate Senate Republican primary instead, and Lehman does not
appear on any official 2026 Oregon federal primary ballot.

## Contest inventory

Oregon has **6 US House districts and 1 US Senate contest in 2026** (Jeff
Merkley's Class II seat). All 6 House districts + the Senate race are
covered by the general election.

## What was built (delta from the KY/MD/ID/KS pattern)

Most of the existing vertical-slice infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
`RepCard.tsx`, and the importer's array-shaped `FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/or-official-roster-2026.ts` (new) — 12
  House rows (all 6 districts: certified Democratic + Republican primary
  nominees, every one of them `qualified_for_general_ballot`) + 2 Senate
  rows (Merkley-D incumbent, Smith-R). `OR_STAGE = "general"` — every row
  here is a determined general-ballot contestant; primary-round losers
  (e.g. Jamil O Ahmad, Jonathan Lockwood, Jo Rae Perkins) are omitted
  entirely, not carried as primary-stage rows. Full sourcing, methodology,
  and the CD5 news-vs-official-ballot resolution are in the file's own
  header docblock.
- `scripts/ingest/official-roster.ts` — registered `OR` in `FIXTURES` with
  separate house/senate entries, exactly like ME's/KY's two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 8 new tests: `getOfficialRoster`
  narrowing across all 6 OR districts + the Senate contest (including a
  dedicated CD5 test confirming Adair, not Lockwood/Perkins, is the row),
  `isIncumbentSeekingReelection` for all 6 incumbent-defended districts +
  the Senate seat, and `lookupChallengers` wiring (both chambers covered,
  FEC query skipped — 2 calls not 3; CD2 and CD5 spot-checked
  candidate-by-candidate, Senate spot-checked with party-name mapping
  confirmed).
- **`scripts/congressional-rosters/types.ts` — NO CHANGE.** Every OR row is
  `DEM` or `REP`; this is the first build in the track (alongside a handful
  of others) that needed zero new party code.

No migration was needed — `official_roster_candidates` and the 0016
`NULLS NOT DISTINCT` unique index already exist and cover Oregon's
`district: null` Senate rows without any schema change (confirmed by
reading `db/schema.ts` directly: the table and its
`official_roster_candidates_seat_name_uidx` — `.nullsNotDistinct()` — are
already in place; no migration has been needed since 0016 across every
build in this track, and Oregon is no exception).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): with the
  sandbox enabled, 3 pre-existing, environment-caused Playwright/Chromium
  sandbox launch failures in `scripts/design/capture-shared.test.ts`
  (`mach_port_rendezvous... Permission denied`, a macOS sandbox restriction
  unrelated to this change) — confirmed both reproducible in isolation and
  **fully clean with the sandbox disabled**: **162 test files passed, 3241
  tests passed, 5 pre-existing `todo` (no failures), 3246 total.**
  `officialRoster.test.ts`'s new OR tests are part of that clean run.
- Staging credential pulled via `vercel env pull .env.staging.pull
  --environment=preview --yes` (the worktree's `.vercel/project.json` was
  copied over from the main checkout first, since a bare `vercel link`
  inside the worktree would otherwise create a new, unrelated Vercel
  project) — never `cat`/`echo`/`source`d; only its presence and byte
  length were confirmed (`grep -c` / `awk` length check, no value printed),
  and the value was substituted inline as `DATABASE_URL=$(...)` in each
  command that needed it, then the pulled file was deleted at the end of
  this build.
- **Pre-import direct row-count query** for `state = 'OR'` on staging:
  **0 rows** (confirmed clean before import).
- OR's 14 rows (12 House + 2 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`) via
  `runOfficialRosterImport` directly, then again via the actual CLI command
  (`npx tsx scripts/ingest/official-roster.ts --state OR`), then re-queried
  directly a final time — three total import invocations, all
  self-reporting `upserted=14`.
- **Idempotency confirmed by a direct row-count query** (not just the
  importer's self-reported count): `select office, count(*) ... where
  state='OR' group by office` returned `house: 12, senate: 2` after the
  first import, the **identical** `house: 12, senate: 2` after the second
  (direct-function) re-run, and the same `house: 12, senate: 2` again after
  the third invocation via the real CLI — no growth across any of the three
  runs.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  and `getOfficialRoster`/`isIncumbentSeekingReelection` directly — the
  real code path a request hits — for all 6 OR House districts plus the
  Senate race, diffed candidate-by-candidate against the fixture. **0
  mismatches across all 7 contests.** Full literal output:

  ```
  OR-01 — incumbent Suzanne Bonamici, seekingReelection2026=true
    - Barbara J Kahl (Republican)

  OR-02 — incumbent Cliff Bentz, seekingReelection2026=true
    - Chris Beck (Democrat)

  OR-03 — incumbent Maxine E Dexter, seekingReelection2026=true
    - Loran Ayles (Republican)

  OR-04 — incumbent Val Hoyle, seekingReelection2026=true
    - Monique DeSpain (Republican)

  OR-05 — incumbent Janelle S Bynum, seekingReelection2026=true
    - Patti Adair (Republican)

  OR-06 — incumbent Andrea Salinas, seekingReelection2026=true
    - David Russ (Republican)

  U.S. SENATE — incumbent Jeff Merkley, seekingReelection2026=true
    - David Brock Smith (Republican)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Bonamici, Bentz, Dexter, Hoyle, Bynum, Salinas,
  and Merkley were each correctly excluded from their own seat's challenger
  list.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). All scratch verification scripts used for the staging check
  (`scripts/ops/_or-import-verify.scratch.ts`) and the pulled credential
  file (`.env.staging.pull`) were deleted before this build was finalized —
  nothing throwaway is committed.

## Governing calendar dates (item (2), standing verification-deliverable requirement)

Source: `sos.oregon.gov/elections/Documents/current-elections-calendar.pdf`
("2026 Elections Calendar"), extracted via `pdftotext -layout` (see "How
this was navigated" #4 above).

- **2026-05-19:** Primary Election Day.
- **2026-06-03:** First day for a nonaffiliated or minor-party candidate to
  file a certificate of nomination for the general election.
- **2026-06-25:** Last day for the Secretary of State to canvass primary
  votes, prepare and deliver the register of nomination and certificates
  of election — Oregon's primary-certification date, and the exact date
  ORESTAR's own "Candidate Filing Search" shows as every 2026 general-race
  candidate's `Filing Date` (`Filing Method: Nominated`) — i.e. this is the
  date a primary winner is mechanically carried onto the general-election
  ballot list.
- **2026-08-05:** Last day to determine minor-political-party ballot
  access.
- **2026-08-18:** Last day for a nonaffiliated or minor-party **elected
  incumbent** candidate to file a certificate of nomination for the general
  election. **STILL OPEN as of this build (2026-07-16).**
- **2026-08-25:** Last day for a nonaffiliated or minor-party candidate
  (other than an elected incumbent) to file a certificate of nomination for
  the general election; also the last day for a district candidate to
  withdraw. **STILL OPEN as of this build.**
- **2026-08-28:** Last day for a candidate (other than a district
  candidate — i.e. this covers the congressional/statewide partisan
  candidates in this fixture) to withdraw. **STILL OPEN as of this build**
  — any nominee above could still withdraw before this date.
- **2026-11-03:** General Election Day.
- **2026-12-10:** Last day for the Secretary of State to canvass general
  votes, prepare and deliver certificates of election, and issue the
  proclamation declaring the election of candidates — Oregon's
  general-election certification date.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The certificate-of-nomination window for nonaffiliated/minor-party
  candidates is still open** (through Aug 18/25, 2026) and **the candidate
  withdrawal window is still open** (through Aug 28, 2026) — see above. A
  `NOT BEFORE` follow-up card is opened alongside this build per the
  epic's standing convention, dated after August 28, 2026.
- Names are recorded as they appear in the official primary-results
  abstract / ORESTAR filing list; not independently re-verified against a
  third document.
- The `WebFetch`-vs-`pdftotext` discrepancy on the elections-calendar PDF
  (see "How this was navigated" #4) is flagged here as a reusable lesson:
  a future session hitting a long tabular PDF should not trust `WebFetch`'s
  own summary at face value without spot-checking a few known dates against
  a `pdftotext -layout` extraction of the same cached file.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/oregon-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/or-official-roster-2026.ts`.
- **Official Oregon source URLs used:**
  - `https://records.sos.state.or.us/ORSOSCMSearch/Search/RecordViewer.aspx?uri=16180585`
    (Secretary of State's OFFICIAL 2026 May Primary Election Results
    abstract of votes)
  - `https://secure.sos.state.or.us/orestar/CFSearchPage.do` (ORESTAR
    Candidate Filing Search — 2026 General Election candidate list)
  - `https://sos.oregon.gov/elections/pages/historical-data.aspx` (Election
    Results & History index, links to the primary-results abstract)
  - `https://sos.oregon.gov/elections/Documents/current-elections-calendar.pdf`
    (official 2026 Elections Calendar, all governing dates above)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not an Oregon source, cited because it materially confirmed every
    `isIncumbent` value)
  - `https://www.senate.gov/states/OR/intro.htm` (incumbency cross-check
    only, Senate)

## GO/NO-GO verdict

**GO on the approach for Oregon — the manual track generalizes to a state
whose portal splits filing-set and results across two ORESTAR-adjacent
systems in a way that happened to agree exactly, and confirms that a
"nothing more filed" negative result can be established with confidence
when two independent official sources agree on the same closed set.
NO-GO on flipping the flag for real users without Muxin's sign-off.**

What remains before this reaches real users:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   other state in this track. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A `NOT BEFORE` re-check follow-up card** is opened on the backlog,
   dated after the August 28, 2026 withdrawal deadline (and after the
   August 18/25, 2026 minor-party/nonaffiliated filing deadlines), to catch
   any late-filed independent/minor-party candidate or withdrawal this
   build's retrieval date could not yet see.
