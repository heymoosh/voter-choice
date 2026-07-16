# Massachusetts vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Massachusetts (MA)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Fourteenth
state built through this manual track, after AZ, TX, OK, AL, AK, CO, CT, CA,
AR, DE, FL, HI, and ME.

Date: 2026-07-15. Massachusetts's September 1, 2026 State Primary is still
UPCOMING at transcription time — unlike Maine's already-past-primary
general-stage build, this is a **primary-stage** roster.

## Bottom line

**GO on the approach for a fourteenth state, with one real, material
finding: MA-06 is an open seat.** Massachusetts's 9 US House districts and
its 2026 US Senate contest (Ed Markey's Class II seat) render correctly
end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against the real
Neon staging branch through the actual `lookupChallengers` code path — 0
mismatches against the official source, all 28 rows (25 House + 3 Senate).

**Massachusetts is not Civix-vended** — a set of static HTML pages on
`sec.state.ma.us`, same simple-fetch-and-parse mechanics as AZ/DE/FL/HI:
plain `curl`/`WebFetch`, no browser automation needed.

**Seth Moulton (D), MA-06's sitting Representative, is running for US
Senate in 2026 instead of seeking House re-election** — announced
2025-10-15, confirmed by multiple independent sources (Ballotpedia News,
NBC News, CBS News Boston, Boston Magazine) and, decisively, directly
confirmed by the official source itself: his name is absent from CD6's
section of the Democratic primary filing list and instead appears under
"Senator in Congress," where he faces incumbent Ed Markey in a contested
Democratic primary. MA-06 has NO incumbent row below — 6 Democratic
primary filers and 1 Republican primary filer are recorded instead, same
convention as ME-2's and AZ-01/AZ-05's open seats (no incumbent filer = no
incumbent row, never inferred).

**Every other MA House seat's sitting Democratic incumbent filed for
re-election**, each independently cross-checked (see "How this was
verified"). **Republicans filed primary candidates in only 6 of 9 House
districts** (03, 04, 06, 08, 09) plus the Senate seat — confirmed directly
from the Republican candidate page's own "No Nominations" labels for
districts 01, 02, 05, and 07.

**No independent/non-party or write-in candidate has an official record
yet** — Massachusetts's own filing calendar sets the non-party
nomination-paper filing deadline at 5 p.m., August 25, 2026, over five
weeks after this build. A secondary/informal source (Ballotpedia) names
several declared independent hopefuls for Senate and a few House seats, but
per the epic's SAFETY rule, none of them has an official SoS filing yet, so
none appears as a row here. A dated follow-up card is opened for
2026-09-09 (the day after Massachusetts's own post-primary
nominee-replacement deadline) to re-check the primary outcome, any
non-party filers, and any nominee withdrawal/replacement all at once.

## How this was verified — static HTML pages, no browser automation, primary-

stage filing list (not yet a nominee list)

Massachusetts's Secretary of the Commonwealth publishes candidate data as
two long static HTML pages (one per party), each listing every office and
district in one page — fetched with plain `curl`, parsed by stripping HTML
tags and reading the literal text under each office/district heading:

1. **2026 Democratic State Primary Candidates**
   (`https://www.sec.state.ma.us/divisions/elections/research-and-statistics/dem-state-primary-candidates2026.htm`)
   — "Senator in Congress" (2 filers: Markey, Moulton) and "Representative
   in Congress" broken into 9 numbered district sections (17 filers total
   across the 9 districts).
2. **2026 Republican State Primary Candidates**
   (`https://www.sec.state.ma.us/divisions/elections/research-and-statistics/rep-state-primary-candidates2026.htm`)
   — "Senator in Congress" (1 filer: Deaton, unopposed) and "Representative
   in Congress" (6 filers across districts 03/04/06/08/09; districts 01,
   02, 05, and 07 explicitly labeled "No Nominations" — a direct official
   signal, not an inferred absence).
3. Both pages were downloaded via raw `curl` (not just the summarized
   `WebFetch` output) and parsed by stripping HTML tags to confirm the
   literal candidate/address text byte-for-byte, since transcription
   accuracy is the whole point of this pipeline — the tag-stripped text
   matched the earlier `WebFetch` summary exactly, with no discrepancies.
4. **Because Massachusetts's own September 1, 2026 primary has not
   happened yet, both pages are strictly primary-stage filing lists** — no
   separate "general ballot" pre-sort exists the way Delaware's official
   source splits candidates across a `prim_fcddt_2026.html` and a
   `genl_fcddt_2026.html` page. Every row in this fixture, including every
   unopposed candidate, is therefore `qualified_for_primary_ballot`, never
   promoted to `qualified_for_general_ballot` — that promotion is exactly
   what the dated 2026-09-09 follow-up card will do once the primary
   result is known.
5. **The official 2026 Candidate's Guide to Running for Office**
   (`https://www.sec.state.ma.us/divisions/elections/download/getting-on-the-ballot/Candidates-Guide-2026.pdf`,
   22 pages, all pages visually accounted for — no scanned/image-only pages,
   full native text layer) is where every governing date below was pulled
   from directly, plus the June 2, 2026, 5 p.m. party-candidate filing
   deadline that explains why both party pages are now stable/final (the
   post-filing objection window, May 29/June 5 and June 3/June 10 for
   district-vs-federal candidates respectively, has also already closed as
   of this build's 2026-07-15 retrieval date).
6. **Incumbency cross-check, never guessed from the filing list itself:**
   - Ed Markey (Senate) confirmed via his own senate.gov domain
     (`https://www.markey.senate.gov/`), with independent corroboration
     from govtrack.us, Wikipedia, and Ballotpedia race-rating coverage that
     his is the Class II seat up in 2026.
   - The other 8 House incumbents (Neal-01, McGovern-02, Trahan-03,
     Auchincloss-04, Clark-05, Pressley-07, Lynch-08, Keating-09) were each
     confirmed against Wikipedia's "List of United States representatives
     from Massachusetts"; Neal and McGovern were additionally confirmed
     directly via their own house.gov-subdomain sites (`neal.house.gov`,
     `mcgovern.house.gov`) reached via web search — `house.gov`'s own "By
     State and District" directory and `govtrack.us`'s member-listing pages
     both returned HTTP 403 this session, the same failure mode DE's and
     ME's builds hit against similar official aggregator endpoints.
   - Seth Moulton's non-candidacy for MA-06 re-election was cross-checked
     against 4 independent news sources (Ballotpedia News, NBC News, CBS
     News Boston, Boston Magazine) in addition to his direct absence from
     the official filing list's CD6 section (see "Bottom line").
   - Never sourced from this app's own FEC-derived `candidates` table for
     any of the above.
7. **A new Massachusetts law (2025 Mass. Acts ch. 34)** rewrites the
   post-primary nominee-withdrawal/replacement timeline specifically for
   2026 — surfaced via a Boston Globe article discussing exactly this
   mechanism in the context of Maine's Platner vacancy, which links directly
   to the session-law text
   (`https://malegislature.gov/Laws/SessionLaws/Acts/2025/Chapter34`).
   Confirmed as a real, citable governing date (not just news commentary)
   — see "Governing calendar dates" below.

## Contest inventory

Massachusetts has **9 US House districts and 1 US Senate contest in
2026** (Ed Markey's Class II seat). Districts recorded as `"01"`–`"09"`;
the Senate contest uses `district: null`. All 9 House seats are currently
Democratic-held; MA-06 is an open seat for 2026 (see "Bottom line").

## What was built (delta from the ME/HI pattern)

All existing pipeline infrastructure is state-agnostic and required **no
changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, `races.ts`'s
`lookupChallengers` wiring, `RepCard.tsx`, the importer's array-shaped
`FIXTURES` map, and `scripts/congressional-rosters/types.ts` (no new party
code needed — every MA filer is `DEM` or `REP`).

**New for this build:**

- `scripts/congressional-rosters/ma-official-roster-2026.ts` (new) — 25
  House rows (all 9 districts) + 3 Senate rows, every row
  `qualified_for_primary_ballot`. Full sourcing, methodology, and the
  MA-06 open-seat finding are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `MA` in `FIXTURES` with
  separate house/senate entries, same two-entry pattern as OK/AL/AR/DE/FL/ME.
- `src/lib/server/officialRoster.test.ts` — 143 tests now pass (up from
  ME's prior count); new coverage: `getOfficialRoster` narrowing across all
  9 House districts plus the 3-row Senate contest, `isIncumbentSeekingReelection`
  for all 8 seeking-re-election incumbents plus MA-06's false case (no
  incumbent row), and `lookupChallengers` wiring for both chambers (FEC
  query skipped — 2 calls not 3; incumbent exclusion; the 7-candidate
  MA-06 open-seat case with none excluded; and the 2-candidate Senate
  challenger list with only Markey excluded as the incumbent).

## Verification performed

- `npm run check`: `tsc --noEmit` clean, 0 lint errors (pre-existing
  `complexity` warnings in unrelated files only, none touching any file
  this build changed), full vitest suite — 3176 tests passing, 3 failures
  confined to `scripts/design/capture-shared.test.ts` (a pre-existing
  sandbox artifact: Playwright/Chromium cannot launch inside this
  session's default sandbox, `bootstrap_check_in ... Permission denied`;
  confirmed unrelated to this change by re-running that one file with the
  sandbox disabled, where all 3 pass cleanly — the same artifact every
  recent state's build has independently hit and documented, e.g. Maine's
  report).
- Confirmed via `db/schema.ts` that no new migration was needed — nothing
  has needed a migration since 0016 for any state in this track.
- MA's 28 rows (25 House + 3 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, pulled fresh via
  `vercel env pull --environment=preview` from the Vercel-linked main
  checkout, confirmed non-empty — 147 characters — and confirmed by
  hostname (`ep-aged-cake-aqhinavd...`) to be the staging branch, not the
  production `ep-silent-dew-aqnmly1g...` branch — explicitly, never the
  ambient `DATABASE_URL`). Importer reported `upserted=28`. Direct
  row-count query (`select office, count(*) ... where state = 'MA' group
  by office`, not just the importer's own log line): **25 house / 3
  senate = 28**. Re-ran the identical import a second time (idempotency
  check) — importer again reported `upserted=28`; direct row-count query
  again: **25/3/28 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 9 House districts
  and the Senate seat, against staging with `OFFICIAL_ROSTER_ENABLED=1`.
  Diffed candidate-by-candidate against the fixture. **0 mismatches across
  all 10 contests (9 House + Senate).** Full literal output (incumbents
  excluded from their own seat's challenger list, per the standing
  contract):

  ```
  MA-01 (incumbent Richard E. Neal excluded):
    - Jeromie Whalen (Democrat)

  MA-02 (incumbent James P. McGovern excluded, unopposed):
    (empty)

  MA-03 (incumbent Lori Loureiro Trahan excluded, unopposed within party):
    - Gary J. Grossi (Republican)

  MA-04 (incumbent Jake Auchincloss excluded):
    - Jason Poulos (Democrat)
    - Thomas Stalcup (Republican)

  MA-05 (incumbent Katherine M. Clark excluded):
    - Jonathan Paz (Democrat)
    - Tarik Samman (Democrat)

  MA-06 (open seat — no incumbent to exclude):
    - Bethany Andres-Beck (Democrat)
    - Dan Koh (Democrat)
    - Jamie Belsito (Democrat)
    - John A. Beccia, III (Democrat)
    - Mariah L. Lancaster (Democrat)
    - Micah Quinney Jones (Republican)
    - Tram T. Nguyen (Democrat)

  MA-07 (incumbent Ayanna S. Pressley excluded, unopposed):
    (empty)

  MA-08 (incumbent Stephen F. Lynch excluded):
    - Patrick Thomas Roath (Democrat)
    - Robert Gerald Burke (Republican)

  MA-09 (incumbent Bill Keating excluded):
    - Craig Swallow (Democrat)
    - R. Tyler MacAllister (Republican)

  US Senate (incumbent Edward J. Markey excluded):
    - Seth Moulton (Democrat)
    - John Deaton (Republican)
  ```

  Every returned challenger carried the correct party mapping (`DEM` →
  "Democrat", `REP` → "Republican") and `sourceKind:
  "official_state_roster"`. Separately confirmed
  `isIncumbentSeekingReelection` returns `true` for all 8 re-election-seeking
  incumbents, `false` for MA-06 (Moulton, no incumbent row on that seat),
  and `true` for the Senate seat (Markey).
- Prod database untouched throughout. Every database command used
  `ROSTER_STAGING_DATABASE_URL` explicitly; `OFFICIAL_ROSTER_ENABLED` was
  only ever set inline for the verification commands above — not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Governing calendar dates (per the plan doc's item (e) requirement)

Pulled directly from Massachusetts's official 2026 Candidate's Guide to
Running for Office
(`https://www.sec.state.ma.us/divisions/elections/download/getting-on-the-ballot/Candidates-Guide-2026.pdf`)
and, for the new post-primary replacement mechanism, the 2025 Massachusetts
session-law text:

- **March 3, 2026** — last day for a federal-office candidate to enroll in
  a party (to run in its primary) or to unenroll from a party (to run as
  non-party); also the cutoff for having switched parties since June 2,
  2025.
- **June 2, 2026, 5 p.m.** — last day to file nomination papers with the
  Secretary of the Commonwealth for federal/statewide **party** candidates
  (already past at build time — this is what produced the now-final
  primary candidate lists this fixture is built from).
- **June 5, 2026, 5 p.m.** — last day to file withdrawals of or objections
  to party-candidate nomination papers (already past; no such objection
  changed either party's federal list, confirmed by the lists' current
  stability).
- **June 10, 2026, 5 p.m.** — last day to fill a vacancy caused by a
  pre-primary party-candidate withdrawal (already past).
- **July 28, 2026, 5 p.m.** — last day for a **non-party** (independent)
  federal candidate to submit nomination papers to local election officials
  for signature certification — still in the future at build time.
- **August 25, 2026, 5 p.m.** — last day for a non-party federal candidate
  to file certified nomination papers with the Secretary of the
  Commonwealth — the date after which Massachusetts's non-party/independent
  congressional roster becomes knowable. Still in the future at build time;
  this is the trigger for the dated follow-up card below.
- **September 1, 2026** — State Primary Election. This is the trigger event
  that will convert every row in this fixture from `qualified_for_primary_ballot`
  to a determined general-ballot status (unopposed candidates already known;
  contested primaries' winners not yet known).
- **September 4, 2026, noon** — under the 2025 Mass. Acts ch. 34
  post-primary timeline
  (`https://malegislature.gov/Laws/SessionLaws/Acts/2025/Chapter34`), last
  day and hour for a primary-winning nominee to withdraw, or for an
  objection to be filed against a nominee.
- **September 8, 2026, 5 p.m.** — under the same 2025 law, last day and
  hour for a party to file a replacement nominee for a seat whose original
  nominee withdrew after the primary.
- **November 3, 2026** — State (General) Election.

One dated follow-up card has been opened per the epic's "NOT BEFORE
DATE-GATE CONVENTION" — see `voter-choice-backlog.md`:

1. "Re-check official roster: Massachusetts (MA) — post-primary general-
   ballot roster + non-party filers," `NOT BEFORE: 2026-09-09` (the day
   after the last of the cycle's remaining governing dates — the September
   8 replacement-nominee filing deadline — combining the primary-result
   promotion, the non-party/independent filer check (already resolved by
   Aug 25), and any nominee-withdrawal/replacement check into one pass).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every row in this fixture is primary-stage, not yet a determined
  general-ballot nominee.** This is not a defect — Massachusetts's own
  September 1, 2026 primary has not happened yet, and its official source
  does not pre-sort unopposed candidates onto a distinct general-ballot
  list (see "How this was verified," item 4). The dated follow-up card
  converts the fixture once the primary result — and the non-party filing
  window — are both known.
- **No independent/non-party candidate appears in this fixture** — the
  official filing deadline for that category (August 25, 2026) has not
  passed. A secondary/informal source names several declared hopefuls
  (see "Bottom line"), but none has an official SoS filing yet.
- **No write-in candidate appears in this fixture** — Massachusetts's own
  guidance describes write-in candidacy as requiring no advance filing at
  all (just an optional courtesy notice to election officials), so there is
  no fixed "deadline" to check against; write-in candidates are inherently
  unknowable in advance and are outside this fixture's scope by design, not
  omitted by oversight.
- Names are recorded exactly as printed on the official primary candidate
  pages; not independently re-verified against a third document beyond the
  incumbency cross-checks above.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/ma-official-roster/docs/operations/massachusetts-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/massachusetts-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/ma-official-roster/scripts/congressional-rosters/ma-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ma-official-roster-2026.ts`
  once merged to main).
- **Official Massachusetts source URL(s) used:**
  - `https://www.sec.state.ma.us/divisions/elections/research-and-statistics/dem-state-primary-candidates2026.htm`
    (SoS official 2026 Democratic State Primary Candidates — Senator in
    Congress + Representative in Congress, all 9 districts)
  - `https://www.sec.state.ma.us/divisions/elections/research-and-statistics/rep-state-primary-candidates2026.htm`
    (SoS official 2026 Republican State Primary Candidates — same offices)
  - `https://www.sec.state.ma.us/divisions/elections/research-and-statistics/candidates2026.htm`
    (SoS archive index linking both party lists)
  - `https://www.sec.state.ma.us/divisions/elections/download/getting-on-the-ballot/Candidates-Guide-2026.pdf`
    (SoS official "A Candidate's Guide to Running for Office in 2026" —
    every governing calendar date cited above)
  - `https://www.sec.state.ma.us/divisions/elections/recent-updates/upcoming-elections.htm`
    (SoS official upcoming-elections page — confirms September 1, 2026
    Primary / November 3, 2026 General dates)
  - `https://malegislature.gov/Laws/SessionLaws/Acts/2025/Chapter34`
    (Massachusetts General Court official session-law text — the 2025 law
    governing the September 4/September 8, 2026 post-primary
    withdrawal/replacement dates)
  - `https://www.markey.senate.gov/` (incumbency cross-check only —
    confirms Ed Markey as Massachusetts's sitting Class II Senator)
  - Incumbency cross-checks (secondary, corroboration only, never primary):
    Wikipedia's "List of United States representatives from Massachusetts,"
    `neal.house.gov`, `mcgovern.house.gov` (via web search); Moulton's
    non-candidacy for House re-election: Ballotpedia News, NBC News, CBS
    News Boston, Boston Magazine.

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete and
pass `npm run check` cleanly (excluding one pre-existing, unrelated
sandbox artifact — see "Verification performed"). The card's
GOAL_CONDITION's remaining requirements — a direct row-count-verified
staging import and an end-to-end `lookupChallengers` check against staging
with the flag on — are both done: the importer ran against staging twice,
confirmed by direct row-count query both times (28 rows, 25 House + 3
Senate, no duplication on re-run), and the real code path was called
directly against staging with `OFFICIAL_ROSTER_ENABLED=1` for all 9 House
districts and the Senate race, with **0 mismatches** against the fixture.
Prod was never touched — every database command used
`ROSTER_STAGING_DATABASE_URL` explicitly, and `OFFICIAL_ROSTER_ENABLED`
was only ever set inline for verification, never persisted anywhere.

Still open, same standing gate as every other state built through this
pipeline, plus one Massachusetts-specific item:

1. **Flag flip (prod cutover for MA and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **This fixture is primary-stage, not yet a general-ballot roster** —
   this is not a defect, it is an accurate reflection of Massachusetts's
   ballot as of 2026-07-15 (the state primary is still 48 days away). The
   dated follow-up card (`NOT BEFORE: 2026-09-09`) converts it once the
   primary result and the non-party filing window are both known.
