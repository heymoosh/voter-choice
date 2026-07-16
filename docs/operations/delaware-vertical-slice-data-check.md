# Delaware vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Delaware (DE)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Eighth state
built through this manual track, after AZ, TX, OK, AL, AK, CO, CA, and AR.

Date: 2026-07-15. Delaware's 2026 major-party candidate filing deadline
(noon, Tuesday, July 14, 2026) has already passed; **the September 15, 2026
primary has NOT happened yet as of this build** — 62 days in the future. The
general election is November 3, 2026.

## Bottom line

**GO on the approach for an eighth state.** Delaware's at-large US House seat
and its single 2026 US Senate contest both render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — 0 mismatches
against the official source, all 11 rows.

**Delaware is not Civix-vended** — a static HTML site
(`elections.delaware.gov`), simpler than any prior state's source
mechanics: `WebFetch` reads it directly, no browser automation needed at all.

**Delaware's primary is still upcoming**, same situation Arizona's original
build was in — every contested-primary row is recorded
`qualified_for_primary_ballot`, no nominee guessed. Unlike Arizona, Delaware
also has an unopposed candidate (Sarah McBride, House) who skips straight to
`qualified_for_general_ballot` because she drew no primary opponent in her
own party — the fixture is a genuine mix of both statuses, driven directly by
which of the site's two candidate-list pages a name appears on.

## How this was verified — a static two-page HTML site, the simplest source

mechanics of any state built through this pipeline so far

Delaware's Department of Elections publishes its candidate lists as plain
server-rendered HTML — no PDF parsing, no SPA, no login wall, no rate limit
encountered:

1. **Candidate SET (who filed) — split across two pages by primary
   contestedness**, which is the one non-obvious structural fact this build
   surfaced:
   - `https://elections.delaware.gov/candidates/candidatelist/prim_fcddt_2026.html`
     ("Primary Election Candidates," last updated 7/14/2026 7:56 PM) — every
     candidate currently in a _contested_ party primary. Both US Senate
     party primaries (4 Democrats, 2 Republicans) and the sole US House
     Republican primary (4 filers) are here.
   - `https://elections.delaware.gov/candidates/candidatelist/genl_fcddt_2026.html`
     ("General Election Candidates," last updated 7/14/2026) — candidates
     with no primary opponent, going straight to the November 3 general
     ballot. Only one federal row appears here: Sarah McBride (D, House),
     the sole Democratic House filer.
   - Both pages were fetched twice, independently, minutes apart, and
     returned the identical candidate set both times — treated as the
     stable, current filing list as of each page's own last-updated
     timestamp.
2. **No results-derivation step was needed** (unlike Oklahoma/Arkansas) —
   Delaware's primary is still 62 days out at transcription time, so this
   fixture is a filing-list snapshot, not a post-primary result derivation.
   Every contested-primary row is recorded `qualified_for_primary_ballot`,
   consistent with the AZ upcoming-primary pattern.
3. **Governing calendar dates** were pulled directly from Delaware's own
   official 2026 election calendar PDF
   (`https://elections.delaware.gov/public/calendar/pdfs/2026ElectionCalendar.pdf`,
   Ver. 12/11/2025) — a real, machine-readable text-layer PDF (`pypdf`
   extraction, no OCR needed) enumerating every statutory deadline for the
   cycle. See "Governing calendar dates" below for the full list.
4. **Incumbency cross-check**, never guessed from the candidate-list pages:
   `https://www.senate.gov/senators/senators-contact.htm` confirms Chris
   Coons as one of Delaware's two sitting Senators (the seat up in 2026 —
   the Schedule of Elections table confirms only one "U.S. Senator 6 Year
   Term" row for 2026; Blunt Rochester's seat isn't up until 2030). The US
   House Clerk's `MemberData.xml` feed used for prior states' incumbency
   cross-check returned HTTP 403 this session; `https://mcbride.house.gov/`
   (an official house.gov-domain source) was used instead to confirm Sarah
   McBride as Delaware's sitting at-large Representative. **This app's own
   FEC-derived `candidates` table was deliberately never used for this
   cross-check** — same rule as every prior state.

**No independent/minor-party candidate appears on either page** for House or
Senate as of transcription time — no new party code was needed; every
confirmed filer is `DEM` or `REP`.

**A residual discrepancy, investigated and not resolved by this
fixture:** a general web search surfaced a secondary/aggregator snippet
naming a fourth Republican House filer, "Donyale Hall." The official primary
page was re-fetched a second time, verbatim, specifically checking for this
name — absent both times. Per the epic's SAFETY rule against treating an
aggregator as a primary source, this fixture follows the official DoE page
and does not include a Hall row. Flagged in "Known gaps" below for the
dated follow-up recheck.

## Contest inventory

Delaware has **1 at-large US House district and 1 US Senate contest in
2026** (Chris Coons's 6-year seat). District is recorded as `"00"` — the
established at-large convention (same as Alaska), never `null` (a null
district would silently never match `races.ts`'s `lookupChallengers`, which
zero-pads a numeric district of `0` to `"00"`).

## What was built (delta from the AZ/AK pattern)

All of the existing pipeline infrastructure is state-agnostic and required
**no changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, `races.ts`'s
`lookupChallengers` wiring, `RepCard.tsx`, the importer's array-shaped
`FIXTURES` map, and `scripts/congressional-rosters/types.ts` (no new party
code needed — every DE filer is `DEM`/`REP`).

**New for this build:**

- `scripts/congressional-rosters/de-official-roster-2026.ts` (new) — 5 House
  rows (McBride unopposed-general + 4 contested REP primary filers) + 6
  Senate rows (4 contested DEM primary filers including incumbent Coons + 2
  contested REP primary filers). Full sourcing, methodology, and known
  limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `DE` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as AK/CO/AR.
- `src/lib/server/officialRoster.test.ts` — 9 new tests: `getOfficialRoster`
  narrowing for the at-large House district key and the null-district
  Senate contest, explicit coverage of the mixed `ballotStatus` split
  (McBride's `qualified_for_general_ballot` vs. every other row's
  `qualified_for_primary_ballot`), `isIncumbentSeekingReelection` for both
  McBride (House) and Coons (Senate), and `lookupChallengers` wiring (both
  chambers covered, FEC query skipped — 2 calls not 3; incumbent exclusion
  for both seats; party-name mapping for REP/DEM challengers).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.
  162 test files, 3138 tests passing, 5 pre-existing `todo` (no failures).
- Confirmed via `db/schema.ts` that no new migration was needed — the
  `official_roster_candidates` table (migration 0015) and its
  `NULLS NOT DISTINCT` null-district uniqueness fix (migration 0016) already
  cover Delaware's null-district Senate rows; nothing has needed a migration
  since 0016 for any state in this track.
- DE's 11 rows (5 House + 6 Senate) imported to the isolated Neon **staging**
  branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`), confirmed by a direct row-count query (11), then
  re-imported and re-queried — **11 both times, not 22.** No duplicate rows
  from the re-run; every row's `state`/`office`/`district`/`name`/`ballotStatus`
  matched the fixture exactly on direct inspection.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for the at-large House seat
  (district `0`) and the Senate race, against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture. **0 mismatches across both contests.** Full literal output
  (incumbent excluded from their own seat's challenger list, per the
  standing contract):

  ```
  DE at-large House (incumbent Sarah McBride excluded):
    - Joseph "Dr. Joe" Arminio (Republican)
    - Earl Cooper (Republican)
    - Lee Murphy (Republican)
    - John J. Whalen (Republican)

  US Senate (incumbent Chris Coons excluded):
    - Jeff Appelhans (Democrat)
    - E. No-Trump Hansen (Democrat)
    - Mary Louve (Democrat)
    - Michael "Dr. Mike" Katz (Republican)
    - John Shulli (Republican)
  ```

  Every returned challenger carried the correct party mapping
  (`REP` → "Republican", `DEM` → "Democrat") and `isRunoffPending: false`
  (Delaware has no runoff mechanism for federal primaries — a plurality
  wins). Separately confirmed both incumbency checks return `true`:
  `isIncumbentSeekingReelection("DE", "house", "00", 2026, "Sarah McBride")`
  and `isIncumbentSeekingReelection("DE", "senate", null, 2026, "Chris Coons")`.

- Prod database untouched throughout. Every database command used
  `ROSTER_STAGING_DATABASE_URL` explicitly; `OFFICIAL_ROSTER_ENABLED` was
  only ever set inline for the verification commands above — not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Governing calendar dates (per the plan doc's item (e) requirement)

Pulled directly from Delaware's official 2026 Election Calendar PDF
(`https://elections.delaware.gov/public/calendar/pdfs/2026ElectionCalendar.pdf`,
Ver. 12/11/2025):

- **July 14, 2026, noon** — major-party candidate filing deadline (already
  passed as of this build).
- **July 15, 2026** — deadline for independent/unaffiliated candidates'
  nominating petitions to be circulated and executed (15 Del. C. § 3002(d)).
  No independent candidate had filed as of this build.
- **July 17, 2026, 4:30 p.m.** — deadline for filed candidates to withdraw
  without forfeiting their filing fee (15 Del. C. §§ 3101(2), 3106(c)). Still
  open at transcription time (2 days away) — any row in this fixture could
  still be withdrawn before this date.
- **August 1, 2026** — deadline for minor political parties to hold their
  nominating convention (15 Del. C. § 3301(e)). No minor party has fielded a
  federal candidate as of this build.
- **August 25, 2026** — deadline for minor political parties to meet the
  registered-voter threshold required to place candidates on the November 3
  general ballot (15 Del. C. § 3001).
- **September 1, 2026, 4:30 p.m.** — deadline for unaffiliated candidates to
  submit their sworn declaration of non-affiliation and nominating petitions
  (15 Del. C. § 3002(b)); also the deadline for major-party officials to
  certify a nominee for any office where no party member filed (15 Del. C.
  § 3303).
- **September 15, 2026** — State Primary Election (determines the DEM/REP
  nominees for both contested Senate primaries and the House Republican
  primary).
- **September 18, 2026** — Department of Elections certifies the primary
  results, per county (15 Del. C. § 3172). This is the date the currently
  primary-stage rows in this fixture become determined general-ballot
  nominees.
- **September 21, 2026, 4:30 p.m.** — deadline for a write-in candidate
  declaration for the November 3 general election (15 Del. C. § 3402(c)).
- **November 3, 2026** — General Election.
- **November 5, 2026, 10 a.m.** — Boards of Canvass certify the general
  election results, per county (Del. Const. Art. V § 6; 15 Del. C. § 5701).
  This is Delaware's final ballot-content lock date for the cycle.

A dated follow-up card ("Re-check official roster: Delaware (DE) — after
primary certification," `NOT BEFORE: 2026-09-18`) has been opened per the
epic's "NOT BEFORE DATE-GATE CONVENTION" — see `voter-choice-backlog.md`.

## Post-merge independent revalidation (2026-07-15/16, after Muxin's own review)

Muxin independently visited the primary candidate-list page herself, found
it hard to read (a single giant table mixing federal, state legislative, and
county races under one "Office" column), and asked for a re-check of whether
any candidate was missing. This prompted a re-verification using **two
additional, independent extraction methods** beyond the original build's
`WebFetch` pull:

1. **A raw HTML fetch** (`curl -sk`, bypassing TLS verification per the same
   known cert-chain gap documented for Alaska — bypassing `WebFetch`'s
   AI-summarization layer entirely, reading the literal page source): the
   primary page's `<table>` parses to exactly the same 6 U.S. Senator rows +
   4 Representative in Congress rows already in the fixture. The general
   page parses to exactly 1 Representative in Congress row (McBride) and
   zero U.S. Senator rows. **0 discrepancies.**
2. **The site's own Excel export** — a "Download the candidate list Excel
   file" link on the page (not used in the original build; surfaced by
   Muxin's own screenshot). This is a genuinely better source than the HTML
   page for future builds: it's structured (one row per candidate, stable
   column names), and carries two fields the HTML page doesn't cleanly
   expose — an explicit `Withdrawal Date` column and a `DisplayedStatus`
   column. Read directly with `openpyxl`
   (`/Users/Muxin/Downloads/prim_fcddt_2026.xlsx`, downloaded by Muxin):
   81 total candidate rows across every office on the primary ballot;
   filtering to `Office in ('U.S. Senator', 'Representative in Congress')`
   returns exactly the same 10 rows, every one `DisplayedStatus: Qualified`
   and `Withdrawal Date: None`. Confirmed no alternate spelling of either
   office label exists in the file (checked every distinct `Office` value).

**Result: three independent extraction methods (AI-summarized fetch, raw
HTML parse, official Excel export) all agree exactly — no candidate is
missing from this fixture, and none of the 10 primary-stage filers has
withdrawn.** The "Donyale Hall" name from a secondary aggregator (see "How
this was verified" above) is confirmed absent from Delaware's official
source by all three methods, not a gap in this build.

**Operational note for future sessions:** every Delaware candidate-list page
has this Excel export — worth using directly (via `openpyxl` or similar)
instead of parsing the HTML table, since it's structured and includes the
`Withdrawal Date` field the HTML page doesn't expose as a clean column. Also
worth remembering for future states: `WebFetch` summarizes page content
through a small model rather than returning literal text — fine for a quick
read, but for an exhaustive candidate-by-candidate list, prefer a raw fetch
or a structured export when one exists, and cross-check with a second method
before treating a page read as final.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every contested-primary row is undetermined pending the September 15,
  2026 primary** — recorded `qualified_for_primary_ballot`, not guessed. The
  dated follow-up card above re-derives the fixture once results are
  certified (September 18).
- **The withdrawal window (through July 17, 2026, 4:30 p.m.) was still open
  at transcription time** — any row here could still be withdrawn before
  that date without forfeiting the filer's fee.
- **The "Donyale Hall" discrepancy** (see "How this was verified" above) is
  now **resolved** — see "Post-merge independent revalidation" below. Three
  independent extraction methods of the primary page (an AI-summarized
  fetch, a raw-HTML parse, and the site's own Excel export) all agree: she
  is not a Delaware filer. Confirmed a stale/wrong aggregator snippet, not a
  gap in this fixture.
- **No independent or minor-party candidate has filed for House or Senate**
  as of transcription time — confirmed absent from both official
  candidate-list pages, not omitted. Delaware's independent
  declaration/petition deadline (September 1, 2026) had not passed at build
  time, so this could still change.
- Names are recorded exactly as printed on the official candidate-list
  pages; not independently re-verified against a third document beyond the
  incumbency cross-checks above.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/de-official-roster/docs/operations/delaware-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/delaware-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/de-official-roster/scripts/congressional-rosters/de-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/de-official-roster-2026.ts`
  once merged to main).
- **Official Delaware source URL(s) used:**
  - `https://elections.delaware.gov/candidates/candidatelist/prim_fcddt_2026.html`
    (DE Dept. of Elections official "Primary Election Candidates" list,
    contested-primary filers, last updated 7/14/2026 7:56 PM)
  - `https://elections.delaware.gov/candidates/candidatelist/genl_fcddt_2026.html`
    (DE Dept. of Elections official "General Election Candidates" list,
    unopposed-nominee filers, last updated 7/14/2026)
  - `https://elections.delaware.gov/public/calendar/pdfs/2026ElectionCalendar.pdf`
    (DE Dept. of Elections official "2026 State of Delaware Election
    Calendar," Ver. 12/11/2025 — every governing date cited above)
  - `https://www.senate.gov/senators/senators-contact.htm` (incumbency
    cross-check only — confirms Chris Coons as one of DE's two sitting
    Senators)
  - `https://mcbride.house.gov/` (incumbency cross-check only — an official
    house.gov-domain source confirming Sarah McBride as DE's sitting
    at-large Representative)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete and pass
`npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (11 rows, 5 House + 6 Senate, no duplication on re-run), and the
real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for both the at-large House seat and the Senate
race, with **0 mismatches** against the fixture. Prod was never touched —
every database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for DE and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after September 18, 2026**
   (primary certification) — opened on the backlog per the NOT BEFORE
   date-gate convention.
