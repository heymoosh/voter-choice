# Idaho vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Idaho (ID)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15/16. Idaho's 2026 primary (May 19, 2026) is already certified
(2026-06-09, no outcomes changed by the State Board of Canvassers). The
general election is 2026-11-03. **Every 2026 federal nomination in Idaho is
determined** — no pending runoff or primary, unlike Oklahoma's build.

## Bottom line

**GO on the approach.** Both ID House districts plus the Senate race render
correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against
the real Neon staging branch through the actual `lookupChallengers` code
path — 0 mismatches across all 3 contests.

**Idaho is not Civix-vended.** Its official candidate-filing system,
`run.voteidaho.gov/search`, is a "ReFrame"-vended JS single-page app (returns
an empty HTML shell to a non-browser fetch — the same category of problem as
Texas's Civix portal, but a different vendor with different mechanics; see
"How this was verified" below).

**A structural gotcha this build had to work around: the filing portal only
lists who FILED for the primary, not who WON.** Idaho's portal has exactly
one "Election Date-Name" bucket — `May 19, 2026 - 2026 PRIMARY` — no general-
election view and no won/lost indicator. Every one of the 26 federal filers
this session pulled from the portal carried the same `Approved` filing
status regardless of whether they won their party's primary. Determining
actual November nominees required a **second, separate official system**:
`results.voteidaho.gov`, the Secretary of State's statewide results portal,
marked "OFFICIAL RESULTS," 44/44 (or district-scoped 19/19, 26/26) counties
reporting. Every contested Republican/Democratic/Libertarian primary in this
fixture is transcribed from that official results system, not inferred.

**No new `ballotStatus` value or party-code surprise beyond one addition:**
`CST` (Constitution Party of Idaho) was added to `types.ts`'s party
allowlist — a real Idaho-recognized minor party, confirmed by its two 2026
federal filers (Brendan J. Gomez, ID-1; C. Sierra - ID Law - Idaho Lorax,
ID-2) each bypassing a primary entirely (see below).

**Independent and Constitution Party candidates do not primary in Idaho** —
a distinct nomination mechanic from Oklahoma's/Texas's/Florida's states.
The filing portal shows Independent and Constitution Party filers for both
House districts and the Senate race, but the official results system has
**no Independent or Constitution Party contest anywhere in the Federal
section** — confirmed by their absence across the complete list of 8 federal
primary contests (Senate ×3 parties, ID-1 ×2, ID-2 ×3). Each Independent/
Constitution filer instead petitions directly onto the general ballot. This
build recorded every "Approved" Independent/Constitution filer as
`qualified_for_general_ballot` directly (on the strength of the portal's own
Approved/Withdrawn status field — see Known Gaps).

**No incumbency surprises** — unlike Florida's redistricting-driven finding
or Oklahoma's Armstrong/Mullin discovery, Idaho's incumbency cross-check
(house.gov's member directory) matched the portal's own signal exactly:
Russ Fulcher (ID-1) and Mike Simpson (ID-2) are both sitting Representatives
seeking re-election, and Jim Risch is the sitting Senator seeking
re-election, each confirmed as the certified primary winner.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every other state in this track.

## How this was verified — two separate official systems, one for filings and one for results

1. **Candidate SET (who filed):** `run.voteidaho.gov/search`, Idaho's
   official Candidate Filing Portal (a "ReFrame"-vended JS SPA — 403-style
   empty shell on `WebFetch`, needed real browser automation via
   `mcp__claude-in-chrome__*`). Filtered to `District Type: Federal`, all 26
   candidates (US Senate + US Representative) returned in one page via the
   accessibility tree — no per-district filter form, no virtualized-scroll
   workaround needed (unlike Civix's Election Night Results page). District
   number for House candidates is **not shown in the results table** — it
   only appears in each candidate's own "View Details" modal, so all 16
   House filers' modals had to be opened individually to get district
   assignment.
2. **General-ballot NOMINEES had to be derived from a second, separate
   official system**, since Idaho's May 19 primary already happened by
   build time: `results.voteidaho.gov/results/public/id/elections/may2026`,
   the Secretary of State's official statewide results portal (marked
   "OFFICIAL RESULTS," last updated 2026-07-13). Read via the accessibility
   tree in one pass — every federal contest (Senate/ID-1/ID-2, broken out by
   party) rendered on a single page with no pagination needed once the
   Federal section was reached; Chrome's built-in PDF viewer (used
   separately for the election calendar, see below) was the one component
   that resisted automation, not this results page.
3. **Incumbency cross-check**, never guessed from the portal or this app's
   FEC-derived `candidates` table: `https://www.house.gov/representatives`
   ("By State and District" → Idaho) confirmed Russ Fulcher (1st) and Mike
   Simpson (2nd) as Idaho's two sitting Representatives — matching the
   portal's own signal exactly, no correction needed.
4. **Withdrawal check:** the filing portal's "Filing Status" filter
   (`Approved` / `Withdrawn`, both checked) returned all 26 federal filings
   as `Approved` — zero `Withdrawn` federal candidates as of retrieval.
5. **Governing calendar dates** (Idaho Code §34-717, via
   `legislature.idaho.gov`, and `voteidaho.gov/calendar/list/`'s official
   2026 calendar — see "Governing calendar dates" below): the Sept 4, 2026
   election calendar PDF (`archive.voteidaho.gov/download/2026-election-
   calendar.pdf`) was consulted directly for the primary-stage deadlines
   (page 1: primary withdrawal deadline March 6, 2026) but its Chrome-viewer
   pagination could not be advanced past page 1 by this session's browser
   automation despite multiple approaches (scroll, arrow keys, page-jump,
   URL `#page=` fragment) — a genuine tooling limitation, not a source
   access problem. The post-primary dates (general-election withdrawal,
   SoS candidate certification) were instead confirmed via
   `voteidaho.gov/calendar/list/`, the same Secretary of State's official
   calendar in a plain HTML list view, and cross-checked against the exact
   statutory rule at `legislature.idaho.gov`'s Idaho Code §34-717 — both
   independently agree on September 4, 2026.

**Not used as a source, deliberately:** Ballotpedia and Wikipedia (used only
as an informal spot-check of the primary-winner roster before pulling the
official results numbers — every figure recorded in the fixture is from
`results.voteidaho.gov`, not from either secondary source).

## Contest inventory

Idaho has **2 US House districts and 1 US Senate contest in 2026** (Jim
Risch's Class II seat). Both House districts + the Senate race are covered
by the general election.

## What was built (delta from the AZ/TX/OK/FL pattern)

Most of the existing vertical-slice infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
`RepCard.tsx`, and the importer's array-shaped `FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — one new party code, `CST`
  (Constitution Party of Idaho), added with a provenance comment mirroring
  the AIP/AKP/NPP/PF/LPF/FFP precedent.
- `scripts/congressional-rosters/id-official-roster-2026.ts` (new) — 10
  House rows (both districts: certified R/D primary nominees, one
  Libertarian, and every Independent/Constitution Party petition-access
  filer) + 5 Senate rows (Risch-R, Roth-D, Loesby-Libertarian, 2 declared
  independents). `ID_STAGE = "general"` — unlike FL's still-pending
  `"primary"` stage, every row here is a determined general-ballot
  contestant; primary-round losers (e.g. Andy Briner, Joseph P Morrison) are
  omitted entirely, not carried as primary-stage rows. Full sourcing,
  methodology, and known limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `ID` in `FIXTURES` with
  separate house/senate entries, exactly like FL's two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 8 new tests: `getOfficialRoster`
  narrowing across both ID districts + the Senate contest (including a
  dedicated check that the new `CST` party code round-trips correctly),
  `isIncumbentSeekingReelection` for both incumbent-defended districts + the
  Senate seat, and `lookupChallengers` wiring (both chambers covered, FEC
  query skipped — 2 calls not 3; ID-2's 6-filer race — the most crowded
  Idaho contest — renders every non-incumbent filer correctly).

No migration was needed — `official_roster_candidates` and the 0016 `NULLS
NOT DISTINCT` unique index already exist and cover Idaho's `district: null`
Senate rows without any schema change.

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean exit
  code 0. 162 test files, 3160 tests passing, 5 pre-existing `todo` (no
  failures), 3165 total.
- Confirmed via a direct query that staging already has migration `0016`'s
  `NULLS NOT DISTINCT` fix applied to `official_roster_candidates_seat_name_
  uidx` — no new migration was needed for this build.
- Pre-import direct row-count query for `state = 'ID'` on staging: **0
  rows** (confirmed clean before import).
- ID's 15 rows (10 House + 5 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, pulled via
  `vercel env pull --environment=preview`, explicitly — never the ambient
  `DATABASE_URL`, which staging's own `.env` carries empty). The importer
  self-reported `upserted=15` on both the first and a second, identical
  re-run.
- **Idempotency confirmed by a direct row-count query** (not the importer's
  self-reported count): `select office, count(*) ... where state='ID' group
  by office` returned `house: 10, senate: 5` after the first import, and the
  **identical** `house: 10, senate: 5` after the second re-run — no growth.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for both ID House
  districts (the Senate race renders alongside every House call), diffed
  candidate-by-candidate against the fixture. **0 mismatches across all 3
  contests.** Full literal output:

  ```
  ID-01 — incumbent Russ Fulcher, seekingReelection2026=true
    - Kaylee Peterson (Democratic)
    - Sarah Zabel (Independent)
    - Brendan J. Gomez (Constitution)

  ID-02 — incumbent Mike Simpson, seekingReelection2026=true
    - Ellie Gilbreath (Democratic)
    - Will Johanson (Libertarian)
    - C. Sierra - ID Law - Idaho Lorax (Constitution)
    - Emre Houser (Independent)
    - Tripp Charles Hutchinson (Independent)

  U.S. SENATE — incumbent Jim Risch, seekingReelection2026=true
    - David Roth (Democratic)
    - Matt Loesby (Libertarian)
    - Natalie M Fleming (Independent)
    - Todd Achilles (Independent)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Fulcher, Simpson, and Risch were each correctly
  excluded from their own seat's challenger list.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). All scratch verification scripts used for the staging check were
  deleted before this build was finalized — nothing throwaway is committed.

## Governing calendar dates (item (e), standing verification-deliverable requirement)

- **2026-06-09:** Idaho State Board of Canvassers certified the May 19
  primary results statewide; no outcomes changed
  (source: contemporaneous news reporting of the certification, cross-
  checked against `results.voteidaho.gov`'s own "OFFICIAL RESULTS" label and
  44/44 counties reporting).
- **2026-09-04, 5:00 p.m.:** candidate-withdrawal deadline for the November
  3 general election — Idaho Code §34-717 (the 9th Friday before a general
  election; source: `legislature.idaho.gov/statutesrules/idstat/title34/
  t34ch7/sect34-717/`), independently confirmed by `voteidaho.gov/calendar/
  list/`'s own entry: "Candidate Withdrawal Deadline: Last day partisan and
  nonpartisan candidates can withdraw from the Nov. 3 election." **STILL
  OPEN as of this build (2026-07-15/16)** — any nominee above could still
  withdraw before this date. See the `NOT BEFORE` follow-up card below.
- **2026-09-04:** Secretary of State candidate-certification deadline for
  the general election ("Secretary of State certifies candidates for the
  general election," same source as above) — this is the date Idaho's 2026
  federal roster becomes fully locked for the cycle; the write-in filing
  deadline and sample-ballot-layout deadline fall on the same date.
- **2026-11-03:** general election day.
- **2026-11-24:** State Canvass — Secretary of State issues certificates to
  the candidates with the highest votes (post-election; not a roster-
  determination date).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The Sept 4, 2026 withdrawal window is still open** — see above. A
  `NOT BEFORE` follow-up card is opened alongside this build per the epic's
  standing convention.
- **Independent/Constitution Party filers are recorded as
  `qualified_for_general_ballot` on the strength of the filing portal's own
  `Approved` filing-status field** — this build did not separately verify
  each filer's underlying nominating-petition signature-sufficiency count,
  only the portal's own Approved/Withdrawn status. Consistent with how
  every other state in this track has treated an "Approved" portal status,
  but recorded here as an explicit limitation rather than a hard guarantee.
- **The official 2026 election calendar PDF's post-page-1 content could not
  be browsed by this session's tooling** (see "How this was verified" #5) —
  the specific dates needed were independently obtained from
  `voteidaho.gov/calendar/list/`'s plain HTML calendar and cross-checked
  against Idaho Code §34-717 directly, so the deliverable's dates are not
  weaker for it, but a future session should note the PDF-viewer pagination
  issue if it recurs.
- Names are recorded as they appear in the official filing portal / results
  system; not independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/idaho-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/id-official-roster-2026.ts`.
- **Official Idaho source URLs used:**
  - `https://run.voteidaho.gov/search` (Idaho Candidate Filing Portal — all
    26 federal filers for the May 19, 2026 primary)
  - `https://results.voteidaho.gov/results/public/id/elections/may2026`
    (Idaho Secretary of State's OFFICIAL primary election results)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not an Idaho source, cited because it materially confirmed the
    `isIncumbent` data)
  - `https://voteidaho.gov/calendar/list/` (official 2026 election calendar,
    withdrawal/certification dates)
  - `https://legislature.idaho.gov/statutesrules/idstat/title34/t34ch7/sect34-717/`
    (Idaho Code §34-717, candidate withdrawal deadlines)

## GO/NO-GO verdict

**GO on the approach for Idaho — the manual track generalizes to a fifth
non-Civix vendor pattern (ReFrame), and the "filing portal ≠ results" split
is now a documented, reusable lesson for any future state whose portal
behaves the same way. NO-GO on flipping the flag for real users without
Muxin's sign-off.**

What remains before this reaches real users:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   other state in this track. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A `NOT BEFORE` re-check follow-up card** is opened on the backlog,
   dated after the Sept 4, 2026 withdrawal/certification deadline.
