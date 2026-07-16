# Vermont vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Vermont (VT)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Built through
the same manual track proven for AZ, TX, OK, AL, AK, CO, CA, AR, DE, MO, and
other states.

Date: 2026-07-16. Vermont's 2026 primary election is **August 11, 2026 — not
yet held as of this build**, 26 days in the future. The general election is
November 3, 2026.

## Bottom line

**GO on the approach.** Vermont's single at-large US House district renders
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — 0 mismatches against the official source, all 4 rows.

**Vermont is not Civix-vended and not a static-HTML/PDF source** — its
official source is two live `.xlsx` spreadsheet exports linked from the
Secretary of State's candidate page. No SPA, no login wall, no rate limit
encountered, but `WebFetch` couldn't reach either the landing page (403) or
usefully parse the spreadsheet files, so both were retrieved via browser
automation and parsed locally with `openpyxl` — a source-mechanics pattern
not seen in any prior state built through this pipeline.

**Vermont has no 2026 US Senate contest at all** — both of its Senate seats
(Sanders, Welch) are mid-term. This is a House-only fixture, like Missouri's.

**Vermont's primary is still upcoming**, same situation Arizona/Delaware's
original builds were in. Unlike Delaware, Vermont's own source does **not**
draw an "unopposed → general" line the way Delaware's did — see "How this was
verified" below for why the sole Democratic filer (incumbent Becca Balint,
unopposed within her own party) is still recorded `qualified_for_primary_
ballot`, not promoted to general, faithfully following Vermont's own
document split rather than assuming Delaware's convention transfers.

## How this was verified — two live XLSX exports, requiring browser automation

## to retrieve

Vermont's Secretary of State publishes candidate filing data as two Excel
spreadsheet downloads, not HTML or PDF:

1. **`WebFetch` returns HTTP 403 on the landing page itself**
   (`https://sos.vermont.gov/elections/election-info-resources/candidates`)
   — bot-blocked. The page's two download links were found via
   `mcp__claude-in-chrome__navigate` + `find`/`read_page` (browser-rendered,
   not a JS SPA — a plain server-rendered page that simply blocks
   non-browser fetches).
2. **The `.xlsx` files themselves are hosted on a different domain**
   (`outside.vermont.gov`, not `sos.vermont.gov`) and don't render usefully
   through `WebFetch` either (returns garbled binary, since `WebFetch`
   converts HTML to markdown and has no xlsx-parsing path). Navigating to
   each URL directly in the browser triggers Chrome's normal file-download
   behavior; the downloaded file was then copied out of `~/Downloads/` (Chrome
   writes an in-progress download as a hidden dotfile,
   `.com.google.Chrome.<random>`, until it completes — confirmed complete via
   `file` + `unzip -l` showing a well-formed xlsx zip structure) and parsed
   locally with Python's `openpyxl`.
3. **The two exports are NOT split the way Delaware's two pages were.**
   Delaware's site split "unopposed → general ballot" vs. "contested →
   primary ballot" across its two pages. Vermont's split is structurally
   different:
   - `2026_statewide_primary_qualified_candidates.xlsx` — every **major-party**
     (Democratic/Progressive/Republican) filer for the August 11 primary,
     each party on its own sheet, **regardless of whether their primary is
     contested**. Becca Balint (D) appears here as the sole Democratic filer,
     even though she has no primary opponent — Vermont's own primary-list
     export does not "graduate" an unopposed candidate onto a separate
     general-ballot list the way Delaware's did.
   - `2026_general_election_qualified_candidates.xlsx` — **only** independent
     and minor-party filers who nominate through a wholly separate legal
     pathway (petition signatures verified sufficient, filed directly for the
     general ballot, no primary involved at all). Adam Ortiz (Independent)
     appears only here.
   Recorded faithfully per this distinction: Balint stays
   `qualified_for_primary_ballot` (the official source's own categorization),
   not `qualified_for_general_ballot` — a deliberate departure from Delaware's
   precedent, since the two states' sources draw the primary/general line in
   different places. See the plan doc's "no universal approach across
   states" note.
4. **The Republican primary is genuinely contested** — both Mark Coester and
   Gerald Malloy filed for the same US House seat's Republican primary,
   nominee undetermined at transcription time. Both recorded
   `qualified_for_primary_ballot`.
5. **Adam Ortiz's independent filing uses `qualified_for_general_ballot`, not
   `declared_general_ballot_intent`** — a deliberate contrast with Texas's
   precedent (where the equivalent PDF was explicitly titled "Declarations of
   Intent," a pre-verification filing stage). Vermont's export is titled
   "qualified_candidates" (present tense) and its "Financial Disclosure"
   column shows a filed form — signaling the SoS has already verified his
   petition-signature sufficiency, not merely logged an intent to file.
6. **No Progressive Party filer for US House** — the PROGRESSIVE sheet's
   `REPRESENTATIVE TO CONGRESS` rows are empty. No new party code was
   needed; Vermont's own "INDEPENDENT" label maps directly onto the existing
   generic `IND` code.
7. **Governing calendar dates** were pulled from Vermont's official 2026
   Elections Calendar PDF
   (`https://outside.vermont.gov/dept/sos/Elections_Division/town_clerks_local_elections/election_procedure/elections_calendar.pdf`,
   v1.2, July 1, 2026) — fetched via `WebFetch`, which returned garbled
   binary directly but **did save the raw PDF bytes to disk**, letting
   `pypdf` extract clean text locally from all 28 pages (a real text-layer
   PDF, no OCR needed). See "Governing calendar dates" below.
8. **Incumbency cross-check**, never guessed from the filing exports:
   `https://www.house.gov/representatives` ("By State and District" table,
   confirmed via screenshot after scrolling the lazy-loaded table into view)
   shows Becca Balint (D) as Vermont's sole sitting At-Large Representative.
   **This app's own FEC-derived `candidates` table was deliberately never
   used for this cross-check** — same rule as every prior state.

## Contest inventory

Vermont has **1 at-large US House district and 0 US Senate contests in
2026** — Sanders's Class I seat (won 2024) isn't up until 2030; Welch's Class
III seat (won 2022) isn't up until 2028; no VT seat is Class II. District is
recorded as `"00"` — the established at-large convention (same as
Alaska/Delaware), never `null` (a null district would silently never match
`races.ts`'s `lookupChallengers`, which zero-pads a numeric district of `0`
to `"00"`).

## What was built (delta from the DE/MO pattern)

All of the existing pipeline infrastructure is state-agnostic and required
**no changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, `races.ts`'s
`lookupChallengers` wiring, `RepCard.tsx`, the importer's array-shaped
`FIXTURES` map, and `scripts/congressional-rosters/types.ts` (no new party
code needed — Vermont's "INDEPENDENT" label maps onto the existing generic
`IND` code).

**New for this build:**

- `scripts/congressional-rosters/vt-official-roster-2026.ts` (new) — 4 House
  rows: incumbent Becca Balint (D, unopposed primary filer), Mark Coester and
  Gerald Malloy (R, contested primary), Adam Ortiz (Independent, qualified
  general-ballot filer). No Senate rows — no 2026 VT Senate contest exists.
  Full sourcing, methodology, and known limitations are in the file's own
  header docblock.
- `scripts/ingest/official-roster.ts` — registered `VT` in `FIXTURES` with a
  single house entry, same house-only pattern as Missouri.
- `src/lib/server/officialRoster.test.ts` — 8 new tests: `getOfficialRoster`
  narrowing for the at-large House district key (`[]` for a bogus numbered
  district, `[]` for the uncovered Senate query), explicit coverage of the
  mixed `ballotStatus` split (3 `qualified_for_primary_ballot` rows vs.
  Ortiz's `qualified_for_general_ballot`), `isIncumbentSeekingReelection` for
  Balint, and `lookupChallengers` wiring (house-only, FEC-fallback senate
  query still issued per the house-only contract — 3 calls not 2; incumbent
  exclusion; party-name mapping for REP/IND challengers; `isRunoffPending:
  false`).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean except
  for 3 pre-existing, unrelated failures in
  `scripts/design/capture-shared.test.ts` (headless Chromium fails to launch
  under this session's sandboxed environment — `mach_port_rendezvous`
  permission denial; confirmed unrelated to this change and passing when
  re-run with the sandbox disabled). All 219 tests in
  `officialRoster.test.ts`, including the 8 new VT tests, pass.
- Confirmed via `db/schema.ts` that no new migration was needed — the
  `official_roster_candidates` table (migration 0015) and its
  `NULLS NOT DISTINCT` null-district uniqueness fix (migration 0016) already
  cover this pipeline; nothing has needed a migration since 0016 for any
  state in this track.
- VT's 4 rows (House only) imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, pulled via `vercel env pull`, verified
  non-empty before use, explicitly — never the ambient `DATABASE_URL`),
  confirmed by a direct row-count query (4), then re-imported and
  re-queried — **4 both times, not 8.** No duplicate rows from the re-run;
  every row's `state`/`office`/`district`/`name`/`party`/`ballotStatus`
  matched the fixture exactly on direct inspection.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for the at-large House seat
  (district `0`), against staging with `OFFICIAL_ROSTER_ENABLED=1`. Diffed
  candidate-by-candidate against the fixture. **0 mismatches.** Full literal
  output (incumbent excluded from their own seat's challenger list, per the
  standing contract):

  ```
  VT at-large House (incumbent Becca Balint excluded):
    - Adam Ortiz (Independent)
    - Gerald Malloy (Republican)
    - Mark Coester (Republican)

  US Senate: [] (no 2026 VT Senate contest)
  ```

  Every returned challenger carried the correct party mapping (`REP` →
  "Republican", `IND` → "Independent") and `isRunoffPending: false` (Vermont
  has no runoff mechanism for federal primaries — a plurality wins).
  Separately confirmed: `isIncumbentSeekingReelection("VT", "house", "00",
  2026, "Becca Balint")` returns `true`.
- Prod database untouched throughout. Every database command used
  `ROSTER_STAGING_DATABASE_URL` explicitly; `OFFICIAL_ROSTER_ENABLED` was
  only ever set inline for the verification commands above — not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). The two ad-hoc verification scripts used for the row-count and
  end-to-end checks were scratch files, deleted before committing — not part
  of this PR's diff.

## Governing calendar dates (per the plan doc's item (e) requirement)

Pulled directly from Vermont's official 2026 Elections Calendar PDF
(`https://outside.vermont.gov/dept/sos/Elections_Division/town_clerks_local_elections/election_procedure/elections_calendar.pdf`,
v1.2, July 1, 2026):

- **August 6, 2026, 5:00 p.m.** — three deadlines converge on this date: (1)
  last day for independent candidates for statewide office/Congress to turn
  in petition and consent forms for the November general ballot (17 V.S.A. §
  2402 et seq.); (2) last day for minor-party candidates to file party
  nomination and consent-of-candidate forms for the general ballot; (3) last
  day for a primary-election write-in candidate to file the affirmation form
  ("the Thursday prior to the primary," 17 V.S.A. §§ 2370, 2472(b)(5)).
- **August 11, 2026** — Primary Election. Determines the Republican US House
  nominee (Coester vs. Malloy); Balint, unopposed, is affirmed as the
  Democratic nominee.
- **August 17, 2026, 5:00 p.m.** — last day for a political party committee
  to nominate a candidate for any office its primary produced no nominee for
  (six days after the primary) — not expected to apply here, since both
  parties already have a primary filer for this seat, but recorded as a
  standing possibility.
- **August 18, 2026, 10:00 a.m.** — Secretary of State canvassing committee
  for statewide and congressional offices meets to tally and certify primary
  returns (one week after the primary, 17 V.S.A. § 2368). **This is the date
  the Republican primary result becomes official** and the currently
  primary-stage rows in this fixture resolve to a determined general-ballot
  nominee.
- **August 21, 2026, 5:00 p.m.** — last day for a validly nominated candidate
  to withdraw their name from the ballot by filing written notice with the
  Secretary of State (10 days after the primary, 17 V.S.A. § 2682). Any row
  in this fixture that survives the primary could still be withdrawn before
  this date.
- **October 29, 2026** — last day for a write-in candidate in the general
  election to file the affirmation form for their votes to be individually
  counted (rather than aggregated as "Other Write-Ins").
- **November 3, 2026** — General Election.
- **November 10, 2026, 10:00 a.m.** — statewide, county, senatorial, and
  representative canvassing committees meet to tally and certify general
  election returns (7 days after the election, 17 V.S.A. § 2592(g), (h),
  (m)). This is Vermont's final ballot-content lock date for the cycle.

A dated follow-up card ("Re-check official roster: Vermont (VT) — after
primary certification," `NOT BEFORE: 2026-08-18`) has been opened per the
epic's "NOT BEFORE DATE-GATE CONVENTION" — see `voter-choice-backlog.md`.
2026-08-18 (not the later withdrawal/write-in dates) is the earliest date the
Republican nomination is actually determined; the recheck itself should also
account for the 2026-08-21 withdrawal deadline if it lands close to that
date.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The Republican primary nominee (Coester vs. Malloy) is undetermined
  pending the August 11, 2026 primary** — recorded `qualified_for_primary_
  ballot` for both, not guessed. The dated follow-up card above re-derives
  the fixture once results are certified (August 18).
- **Becca Balint's Democratic nomination, while functionally certain
  (unopposed), is still technically pending the same August 11 primary per
  Vermont's own official categorization** — recorded `qualified_for_primary_
  ballot`, not promoted early. See "How this was verified" above for why
  this differs from Delaware's "unopposed → general" convention.
- **The candidate-withdrawal window (through August 21, 2026, 5:00 p.m.) is
  open through and past the primary** — any row in this fixture could still
  be withdrawn before that date.
- **No independent or minor-party filer other than Adam Ortiz has qualified**
  for US House as of transcription time — confirmed against the complete
  general-qualified export, not omitted. Vermont's minor-party/independent
  filing deadline (August 6, 2026) had not yet passed at build time, so this
  could still change before the dated follow-up.
- Names are recorded exactly as printed in the official exports' "Name On
  Ballot" column; not independently re-verified against a third document
  beyond the house.gov incumbency cross-check above.
- Both source exports carry an internal "Last Updated: 7/14/2026" stamp two
  days before this build's own transcription date (2026-07-16) — no
  indication of staleness, but flagged per the fixture's own docblock.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/vt-official-roster/docs/operations/vermont-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/vermont-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/vt-official-roster/scripts/congressional-rosters/vt-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/vt-official-roster-2026.ts`
  once merged to main).
- **Official Vermont source URL(s) used:**
  - `https://sos.vermont.gov/elections/election-info-resources/candidates`
    (VT SoS "General Election Candidates" landing page — links to both XLSX
    exports below)
  - `https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_statewide_primary_qualified_candidates.xlsx`
    (VT SoS "2026 Primary Election Candidate Listing," DEMOCRATIC/
    PROGRESSIVE/REPUBLICAN sheets, "Last Updated: 7/14/2026")
  - `https://outside.vermont.gov/dept/sos/Elections_Division/election_info_resources/candidates/2026_general_election_qualified_candidates.xlsx`
    (VT SoS "2026 General Election Candidate Listing," "Last Updated:
    7/14/2026")
  - `https://outside.vermont.gov/dept/sos/Elections_Division/town_clerks_local_elections/election_procedure/elections_calendar.pdf`
    (VT SoS official "2026 Elections Calendar," v1.2, July 1, 2026 — every
    governing date cited above)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    "By State and District" table confirming Becca Balint as VT's sitting
    at-large Representative)

## Self-vet verdict

**GO.** The fixture, importer registration, and tests are complete and pass
`npm run check` cleanly (modulo the 3 pre-existing, unrelated,
sandbox-caused Playwright failures noted above). The card's GOAL_CONDITION's
remaining requirements — a direct row-count-verified staging import and an
end-to-end `lookupChallengers` check against staging with the flag on — are
both done: the importer ran against staging twice, confirmed by direct
row-count query both times (4 rows, no duplication on re-run), and the real
code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for the at-large House seat, with **0
mismatches** against the fixture. Prod was never touched — every database
command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere.

Diff-vs-card check: the diff is faithful to the card's IN SCOPE items
(source-format check done first per ORIGIN's instruction; fixture +
FIXTURES registration + tests + staging verification + this doc all
present); nothing out-of-scope touched (no other jurisdiction, no
production writes, no persistent flag flip, no non-congressional races); low
risk and fully reversible (additive-only fixture + registration, no schema
change); no secrets in the diff (the staging credential was pulled to a
scratch file outside the repo and never committed).

**Per this task's explicit instructions, this PR is opened non-draft with
this self-vet verdict but is NOT merged, rebased, or marked Done by this
build** — a separate babysit-PRs session owns rebase/CI-watch/merge/closeout
for this card, overriding the card's own "MERGE DIRECTLY" ATTENDED line for
this particular run.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for VT and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after August 18, 2026** (primary
   certification) — opened on the backlog per the NOT BEFORE date-gate
   convention.
