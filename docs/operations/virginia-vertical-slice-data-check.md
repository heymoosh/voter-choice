# Virginia vertical slice — built and verified live (partial, by design — see finding)

Card: "[P0] Import + verify official roster: Virginia (VA)", parent epic
`c5a813bb-9223-4dc1-95aa-65637eb6940b`.

Date: 2026-07-16. Virginia's 2026 primary (August 4, 2026) has **not yet
happened** as of this build — 19 days in the future.

## Bottom line

**GO on the approach, with a real, non-obvious scope limitation this build
surfaced rather than papered over.** Only **2 of Virginia's 11 US House
districts (05, 08)** are imported — the 9 remaining House districts and the
2026 US Senate race (Mark Warner's seat) are **deliberately omitted**, not
missing by oversight. Both imported districts verify end-to-end against
staging with zero mismatches.

**The central finding:** Virginia's official candidate authority (ELECT,
`elections.virginia.gov`) publishes contested-primary filers now (complete,
current), but has **not yet published its "non-primary nominee" list** — the
roster of candidates who are already-determined general-ballot nominees
because only one candidate qualified for their party/district (no primary
required by VA law) or because a party nominated by convention/mass meeting.
That list's statutory certification deadline for the Senate/statewide track
(June 22, 2026) has already passed — by about 3.5 weeks as of this build —
and ELECT's own bulletin PDFs promise posting "within three weeks" of that
date, a promise already broken. This is a real administrative-posting lag on
Virginia's own side, not a search gap on this build's part (see "How this was
verified" for the exhaustive list of paths checked to rule that out).

**Why this matters for the fixture, concretely:** for 9 of VA's 11 House
districts and the Senate race, the *sitting incumbent's own party* has no
primary and its nominee isn't yet published — e.g. District 1's incumbent Rob
Wittman (R) faces no Republican primary, so his status as the 2026 nominee is
simply not yet a matter of public record on ELECT's site, even though it is
overwhelmingly likely he is running. Importing only the *known* side (the
opposing party's real, contested primary filers) for those districts would
have made this app's `isIncumbentSeekingReelection` check
(`src/lib/server/officialRoster.ts`) and the `/api/delegation` open-seat
override (`src/app/api/delegation/route.ts`) **actively assert Wittman isn't
seeking re-election** — a false, misleading signal, not a neutral gap. Per
this epic's SAFETY rule against inferring an undetermined status, this build
omits those 9 districts and the Senate race entirely rather than risk that
false signal. This mirrors the precedent set by Louisiana's House omission
(`la-official-roster-2026.ts`) — omit a seat entirely when the alternative is
guessing or misrepresenting it, letting it fall through cleanly to the
pre-existing FEC-derived path.

**The 2 districts that ARE included are safe from this problem** because the
sitting incumbent's own status IS confirmed within the published data:
District 5's Republican primary (contested, 2 filers) includes incumbent John
J. McGuire III, flagged `Incumbent: Yes` directly in ELECT's own spreadsheet;
District 8's Democratic primary (contested, 5 filers) includes incumbent
Donald S. Beyer, Jr., likewise flagged. Both were independently cross-checked
against `house.gov`.

**NO-GO on fan-out to further states** until the manual track has covered a
few more (same standing gate as prior builds), and **NO-GO on flipping the
flag for real users** without Muxin's sign-off.

## How this was verified — a static XLSX/PDF site, no Civix, and a real
publication gap ruled out five different ways

Virginia's official candidate source runs no Civix or other vendor SPA — a
plain static site at `elections.virginia.gov`, every document a direct
`elections.virginia.gov/media/...` PDF or XLSX link. No browser automation
was needed to fetch text-layer PDFs (`pdftotext -layout` worked directly);
the XLSX candidate lists downloaded silently as hidden dotfiles in Chrome
rather than a normal visible download and were parsed with `openpyxl` after
locating them via `ls -lat ~/Downloads`.

1. **Candidate SET (who filed for the Aug 4 primary):** ELECT's official Aug
   4, 2026 Democratic and Republican primary candidate-list XLSX files
   (linked from `casting-a-ballot/candidate-list/`) — every candidate who
   qualified for a *contested* party primary, cross-tabulated against
   ELECT's own authoritative "which offices actually have a primary" table
   (`2026-August-Primary-Elections-(rev-5-28-26)-(for-web).pdf`), which
   independently confirmed the exact same 7 of 22 party/district
   combinations as contested (District 5 both parties; Districts 1, 2, 8, 9
   Democratic only; Districts 7, 10 Republican only; US Senate Republican
   only; Districts 3, 4, 6, 11 and the Senate Democratic primary: none).
2. **The non-primary/unopposed-nominee roster (who's already determined
   without a primary) does NOT exist yet as a published document** — this
   was actively, exhaustively ruled out, not assumed:
   - Read all 6 "One Pager" PDFs (Senate/House × Non-Primary/Independent/
     Primary) in full: confirmed generic, undated filing-instruction
     templates with **zero candidate names**, reused every cycle — not a
     roster despite the name.
   - Site-searched ELECT's own search tool for "certified candidates 2026",
     "Mark Warner 2026 candidate", and "posted within three weeks" — no
     relevant hits.
   - Checked `casting-a-ballot/previous-candidate-lists/` — past cycles
     only; confirmed this is ELECT's normal practice (e.g. the "2024
     November US Senate/House Candidates List" only appears there *after*
     that cycle concluded), not evidence something is missing for 2026.
   - Checked the State Board of Elections' board-meeting-information page
     (`elections.virginia.gov/board-meeting-information`) for a
     certification-meeting attachment — found it served from a stale,
     orphaned CMS staging host showing only January 2019 meetings, not a
     current index.
   - Checked `data.virginia.gov` for an open-data/API candidate endpoint —
     404, none exists.
   - Checked the COMET campaign-finance database
     (`cfreports.elections.virginia.gov`) as a possible cross-reference —
     **structurally cannot help**: COMET tracks Virginia state/local
     candidates only; federal candidates file with the FEC, not VA COMET.
   - Checked ELECT's News Releases page directly — most recent post (June
     18, 2026, "Early voting for 2026 primaries has begun") predates any
     candidate-certification announcement.
   - Found the exact governing text, verbatim, in ELECT's own bulletin
     PDFs (repeated on pages 11-13 of the US Senate General Bulletin, and
     the parallel House bulletin): *"The list of candidates that qualified
     for ballot access will be posted on ELECT's website
     (https://www.elections.virginia.gov/casting-a-ballot/candidate-list/)
     within three weeks after the candidate filing deadline. Contact ELECT
     at ea@elections.virginia.gov to confirm your status before then."*
     Measured from the June 22, 2026 Senate/local non-primary certification
     date, that three-week promise had already lapsed by roughly 3.5 weeks
     as of this build's 2026-07-16 retrieval, with nothing posted.
3. **Incumbency cross-check**, never guessed from the primary XLSX's own
   "Incumbent" column or this app's own FEC-derived `candidates` table:
   `https://www.house.gov/representatives` ("By State and District,"
   Virginia section) for all 11 House districts, and
   `https://www.senate.gov/senators/index.htm` for the Senate seat (confirms
   Mark R. Warner holds VA's Class II seat, up in 2026 on an ordinary 6-year
   cycle — not a special/appointed-seat situation).

**Independent candidates:** VA's "Independent One Pager" PDFs are the same
kind of nameless, generic filing-instruction template as the non-primary
one-pagers — no live independent-declaration list was found. Not a confirmed
absence of independent filers, the same unpublished-source posture as the
non-primary-nominee gap above; no independent rows are included in this
fixture.

**Not used as a source, deliberately:** Ballotpedia, VPAP, or any other
aggregator — every fact in the fixture traces to `elections.virginia.gov`,
`house.gov`, or `senate.gov`.

## Candidate-by-candidate comparison

### District 05 (both parties fully known, contested)

| Name | Party | Incumbent | Source |
|---|---|---|---|
| John J. McGuire III | Republican | **Yes** (house.gov-confirmed) | ELECT Republican primary XLSX |
| Melanie V. Lucero | Republican | No | ELECT Republican primary XLSX |
| Rob W. "T-ski" Tracinski | Democratic | No | ELECT Democratic primary XLSX |
| Suzanne K. "Dr. K" Krzyzanowski | Democratic | No | ELECT Democratic primary XLSX |
| Tom S. P. Perriello | Democratic | No | ELECT Democratic primary XLSX |

App output (`lookupChallengers("VA", 5, 2026)`, flag on, against staging):
McGuire correctly excluded (shown as the seat's own incumbent card
elsewhere); the other 4 render as challengers with correctly mapped party
names (`Republican`/`Democrat`). `isIncumbentSeekingReelection("VA", "house",
"05", 2026, "John McGuire")` returns `true`. **0 mismatches.**

### District 08 (Democratic side only — no Republican primary/nominee published)

| Name | Party | Incumbent | Source |
|---|---|---|---|
| Donald S. Beyer, Jr. | Democratic | **Yes** (house.gov-confirmed) | ELECT Democratic primary XLSX |
| Mo Seifeldein | Democratic | No | ELECT Democratic primary XLSX |
| Michael Christian Duffin | Democratic | No | ELECT Democratic primary XLSX |
| Adam M. Dunigan | Democratic | No | ELECT Democratic primary XLSX |
| Lorena Thorne Bruner | Democratic | No | ELECT Democratic primary XLSX |
| *(Republican side)* | — | — | **unpublished — not guessed, not included** |

App output: Beyer correctly excluded; the other 4 render as challengers, all
`Democrat`. `isIncumbentSeekingReelection("VA", "house", "08", 2026, "Donald
Beyer")` returns `true`. **0 mismatches on the known side; the Republican
side is honestly absent, not misrepresented.**

### Omitted seats (9 House districts + Senate) — verification of the omission itself

`lookupChallengers("VA", 1, 2026)` (District 1, a representative omitted
seat) returns `{ house: [], senate: [] }` from the official-roster path
(falls through to the unchanged FEC-derived path, same as any other
uncovered seat) — confirmed live against staging. `isIncumbentSeekingReelection("VA",
"house", "01", 2026, "Robert Wittman")` and `isIncumbentSeekingReelection("VA",
"senate", null, 2026, "Mark Warner")` both return `null` — "no roster covers
this seat," which correctly means **no override happens** at
`/api/delegation`, rather than the false `false` ("not seeking re-election")
that would have resulted from importing only a partial roster. This was the
central design goal of the omission and is confirmed working as intended.

## Operational-navigation summary

- Not Civix. Confirmed by inspecting both `candidatepac-info/candidate-bulletins/`
  and `casting-a-ballot/candidate-list/` — every document URL is a first-party
  `elections.virginia.gov/media/...` link, no vendor SPA redirect or embed.
- PDF documents: `WebFetch` returns raw/garbled bytes for any PDF (as with
  every prior state's build), but the fetch tool also persists the binary to
  a local tool-results path; `pdftotext -layout` against that path extracted
  clean text for every PDF that has a real text layer. One document
  (`2026-August-Primary-Order.pdf`) is a scanned image with no text layer —
  not needed since its companion `2026-August-Primary-Elections...pdf` has
  the same information as clean text.
- XLSX documents: neither Chrome's built-in viewer nor Google Docs
  Viewer/Office Online Viewer render an XLSX from this host — the browser
  instead silently downloads it as a **hidden dotfile**
  (`~/Downloads/.com.google.Chrome.<random>`), not a normal visible
  download. Located via `ls -lat ~/Downloads`, confirmed file type with
  `file`, then parsed with Python's `openpyxl`.
- `house.gov/representatives`'s "By State and District" table did not expose
  candidate names/parties through its accessibility tree for a plain
  `get_page_text` read in this session (unlike some prior states) — read via
  a direct screenshot of Virginia's table section instead.
- Direct `curl`/Bash-level network access to `elections.virginia.gov` is
  blocked by this environment's sandbox even with the sandbox override flag
  — only the actual Chrome browser process could reach the site; all PDF/XLSX
  retrieval had to go through `mcp__claude-in-chrome__*` navigation, not a
  scripted fetch.
- The single biggest time cost was chasing the non-primary-nominee gap
  itself — five independent paths (site search, previous-candidate-lists
  archive, SBE meeting-minutes page, `data.virginia.gov`, and — in a
  dedicated follow-up pass — the COMET campaign-finance database and
  ELECT's News Releases page) were checked before concluding this is a
  genuine, currently-unpublished gap in Virginia's own official source, not
  an incomplete search. See "How this was verified" above for the full list.

## Governing calendar dates (source: ELECT's official 2026 Deadlines
Calendar, `elections.virginia.gov/media/castyourballot/deadlines-calendars/2026-Deadlines-Calendar-(6-10-26).xlsx`,
unless noted)

- **Candidate filing deadlines (primary track):** Senate & local — April 2,
  2026, 5:00 pm; House of Representatives — May 26, 2026, 5:00 pm. (Already
  past; governs the primary-XLSX candidate set used in this fixture.)
- **Party certification of primary candidates** (locks who's on the Aug 4
  primary ballot): Senate/local — April 7, 2026; House — May 27, 2026.
  (Already past.)
- **Non-primary/independent filing deadline:** Senate & local — June 16,
  2026, 7:00 pm; House — August 4, 2026, 7:00 pm (same day as the primary
  itself). (Senate/local side already past; House side is the reason
  Districts 3, 4, 6, 11 genuinely cannot have published data yet — it isn't
  due.)
- **Party certification of non-primary nominees:** Senate/local — June 22,
  2026 (already past — this is the deadline ELECT has not yet honored the
  posting of, per the central finding above); House — August 7, 2026 (not
  yet due).
- **Candidate-withdrawal window (pre-primary):** a notarized withdrawal
  filed between 44 and 7 days before the primary that leaves exactly one
  candidate causes that candidate to be declared the nominee and the primary
  to be cancelled (Va. Code § 24.2-612.2, cited in both the Senate and House
  general bulletins). Still open for VA-05 and VA-08 as of this build — if
  either of District 5's two Republican filers or District 8's five
  Democratic filers withdraws before the primary, this fixture would need a
  re-check.
- **August 4, 2026 — the primary election itself** (Va. Code §§ 24.2-503,
  24.2-522, 24.2-524). Governs Districts 5 and 8's contested primaries in
  this fixture.
- **August 18, 2026 — State Board of Elections meets to certify primary
  results** (Va. Code § 24.2-534; local abstract-of-votes deadline August
  14, 2026). This is the date District 5's and District 8's rows become
  fully determined general-ballot nominees, promotable from
  `qualified_for_primary_ballot` to `qualified_for_general_ballot`.
- **Post-primary withdrawal / vacancy-replacement window:** per Va. Code §§
  24.2-539–541, a new filing window opens (60 days before the general) if a
  nominee dies, withdraws, or is set aside — effectively ~September 4, 2026
  for the November 3 general.
- **November 3, 2026 — general election.**
- **December 7, 2026 (first Monday in December) — SBE must meet to certify
  general-election results** (§ 24.2-679; local abstract-of-votes deadline
  November 13, 2026).
- **Recount deadlines:** local-office primary recount petitions due August
  21/28, 2026; US Senate/House general-election recount petitions due
  December 17, 2026.
- No distinct independent petition-signature-verification deadline separate
  from the filing deadlines themselves was found in this calendar.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **9 of 11 House districts (01, 02, 03, 04, 06, 07, 09, 10, 11) and the 2026
  US Senate race are entirely omitted from this fixture** — the central
  finding of this build. These seats fall through to the pre-existing
  FEC-derived path, unchanged by this build. A re-check is needed once
  Virginia's non-primary nominee list is published (see the dated follow-up
  card).
- **District 8 has no Republican-side row** — unlike the 9 fully-omitted
  districts, District 8's known Democratic side IS included (safe, because
  incumbent Beyer's own row is present), so this one district's roster is
  intentionally partial rather than absent.
- **No independent or write-in candidates anywhere in this fixture** —
  Virginia's independent-declaration roster is unpublished, same posture as
  the non-primary-nominee gap; not confirmed absent.
- **The candidate-withdrawal window is still open** for both included
  districts (through roughly 7 days before the Aug 4 primary) — see governing
  dates above.
- Names recorded exactly as printed in the XLSX files; not independently
  re-verified against a third document beyond the incumbency cross-checks.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/virginia-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/va-official-roster-2026.ts`.
- **Official Virginia source URLs used:**
  - `https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Democratic-Primary-Federal-6-3-2026.xlsx`
  - `https://elections.virginia.gov/media/castyourballot/candidatelist/2026/2026-August-Republican-Primary-6-3-2026.xlsx`
  - `https://elections.virginia.gov/media/castyourballot/2026-August-Primary-Elections-(rev-5-28-26)-(for-web).pdf`
  - `https://elections.virginia.gov/media/castyourballot/2026-August-Called-Primary-Elections-(rev-3-9-26).pdf`
  - `https://elections.virginia.gov/media/castyourballot/deadlines-calendars/2026-Deadlines-Calendar-(6-10-26).xlsx`
  - `https://elections.virginia.gov/candidatepac-info/candidate-bulletins/`
  - `https://elections.virginia.gov/casting-a-ballot/candidate-list/`
  - `https://elections.virginia.gov/casting-a-ballot/previous-candidate-lists/`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_Sen_Gen_Bulletin_(2-23-26).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_House_Gen_Bulletin_(2-23-26).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_Sen_Non-Prim_One_Pager_(12-29-25).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_Sen_Ind_One_Pager_(12-29-25).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_House_Non-Prim_One_Pager_(2-23-26).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_House_Ind_One_Pager_(2-23-26).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-11-03_US_Sen_Prim_One_Pager_(2-23-26).pdf`
  - `https://elections.virginia.gov/media/candidatesandpacs/2026-candidate-bulletins/2026-08-4_US_House_Prim_One_Pager_(2-23-26).pdf`
  - `https://elections.virginia.gov/board-meeting-information` (checked, found stale — ruling out this path, not a source of data)
  - `https://cfreports.elections.virginia.gov/` (checked, structurally excludes federal candidates — ruling out this path, not a source of data)
  - `https://www.house.gov/representatives` (incumbency cross-check only)
  - `https://www.senate.gov/senators/index.htm` (incumbency cross-check only)

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean. 162
  test files, 3262 tests passing, 5 pre-existing `todo` (no failures), 3267
  total — 226 tests in `officialRoster.test.ts` alone (16 new VA tests
  added).
- Confirmed via a direct `pg`/drizzle connection that staging already has
  migration `0016`'s `NULLS NOT DISTINCT` fix applied — no new migration was
  needed for this build (also confirmed by inspecting `db/schema.ts:142-178`
  directly first).
- VA's 10 rows (all House, District 05 + District 08) imported to the
  isolated Neon **staging** branch (`ROSTER_STAGING_DATABASE_URL`,
  explicitly — never the ambient `DATABASE_URL`), re-imported, and confirmed
  idempotent by a direct SQL row-count query (10 both times — 5 in District
  05, 5 in District 08 — not just the importer's own self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  and `isIncumbentSeekingReelection` directly — the real code paths a
  request hits — for District 5, District 8, District 1 (a representative
  omitted seat), and the Senate race. **0 mismatches** against the ELECT
  sources for both covered districts; the omitted seats correctly return
  empty/`null` (no false override), confirming the central design goal
  actually works as intended, not just in theory.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## GO/NO-GO verdict

**GO on the approach for this state, with an explicit, documented, and
verified-safe scope reduction (2 of 11 House districts) rather than a full
build — the correct call given what Virginia's official source actually
publishes as of 2026-07-16. NO-GO on proceeding to more states or real users
without further sign-off**, same standing gate as every prior build in this
epic.

What remains before this reaches real users or a fuller VA roster:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   prior state. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **A follow-up rebuild is needed** once Virginia's non-primary nominee list
   is published and/or the August 4 primary is certified (August 18, 2026) —
   see the dated follow-up card in `docs/operations/voter-choice-backlog.md`.
   At that point all 11 House districts and the Senate race should be
   buildable in one pass.
