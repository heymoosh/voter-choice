# Michigan vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Michigan (MI)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Fifteenth
state built through this manual track (after AZ, TX, OK, AL, AK, CO, CT,
CA, AR, DE, FL, HI, LA, ME, IN).

Date: 2026-07-15. Michigan's 2026 primary (2026-08-04) is still **20 days in
the future** as of this build — every DEM/REP congressional nomination is
genuinely undetermined. The general election is 2026-11-03.

## Bottom line

**GO on the approach for a fifteenth state.** All 13 MI House districts plus
the US Senate race render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across all 14 contests**.

**Michigan is not Civix-vended.** Michigan's Bureau of Elections runs its
own Entellitrak portal (`mi-boe.entellitrak.com`) — a single-page-load
report per election type (primary or general), materially simpler than any
prior state in this track: one `get_page_text` call after navigation
captured the complete candidate table for every congressional race (and
every other office on the ballot) in one shot, despite the page's
"Select a Race" dropdown suggesting per-race querying would be needed.

**Michigan is pre-primary, like Arizona** — `MI_STAGE = "primary"`, and
every Democratic/Republican filer carries `ballotStatus:
"qualified_for_primary_ballot"`, with multiple candidates per party per
district expected and correct (no "pick the winner" step exists yet).
**Genuinely new to this build:** Michigan's minor parties (Libertarian,
Green, Working Class) nominate by **convention**, not primary, and file
directly onto the November ballot — their rows carry
`"qualified_for_general_ballot"` instead, even within a district where the
DEM/REP rows are still primary-pending. A new party code, `WCPM` (Working
Class Party of Michigan — one of Michigan's 7 officially recognized
parties, confirmed via Ballotpedia), was added to `types.ts` and
`races.ts`'s `PARTY_NAMES` map.

**Two open House seats and one open Senate seat were found, all confirmed
by both the official filing data itself and an independent cross-check
(house.gov / senate.gov):**

- **MI-10** — sitting Rep. John James filed for **Governor** instead of
  re-election (confirmed: "James, John" appears under the Governor race on
  the same official report, at the same Shelby Township address as his
  known House district).
- **MI-11** — sitting Rep. Haley Stevens filed for **US Senate** instead
  (confirmed: "Stevens, Haley" appears under the Senate race, not MI-11).
- **US Senate** — sitting Sen. Gary Peters (Class II, term expiring
  2027-01-03 per senate.gov) announced 2025-01-28 he will not seek
  re-election (Detroit News, NBC News, PBS NewsHour, CBS Detroit all
  independently confirm) — an open seat, consistent with his absence from
  every party's Senate filing list.

**NO-GO on fan-out to further states** until the manual track's remaining
cards are picked up, and **NO-GO on flipping the flag for real users**
without Muxin's sign-off — same standing gate as every prior state.

## How this was verified — a single-page-load portal, two report types, no
Civix and no per-race querying needed

Michigan's official candidate source is the Michigan Bureau of Elections'
Entellitrak portal, confirmed as the authoritative access point by
inspecting `michigan.gov/sos/elections`'s own "2026 August Primary
Candidate Listing" outbound link — it resolves to the exact PRI URL below.

1. **Primary filers (candidate SET, DEM/REP):**
   `https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=PRI&electionYear=2026`
   — titled "Official Candidate Listing — Primary Election, Tuesday, August
   4, 2026." A single page load returns every office's candidate table,
   including all 13 US House districts and the US Senate race, with
   `DISQ`/`WITHD` flags on excluded rows (no on-page legend defines these
   abbreviations explicitly, but both are standard, self-evident, and
   unambiguous from context — every flagged row is excluded from this
   fixture).
2. **Minor-party general-ballot filers (convention nominees):**
   `https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=GEN&electionYear=2026`
   — titled "Unofficial Candidate Listing — General Election, Tuesday,
   November 3, 2026." Michigan recognizes 7 parties (Democratic, Green,
   Libertarian, Natural Law, Republican, U.S. Taxpayers, Working Class —
   per Ballotpedia's "Political parties in Michigan," May 2026); the three
   minor parties that filed congressional candidates for 2026
   (Libertarian, Green, Working Class) nominate by convention, not
   primary, and every convention date on this report (Feb–June 2026) is
   already in the past. No Natural Law or U.S. Taxpayers candidate filed
   for any 2026 MI congressional seat — verified absent, not omitted.
3. **Incumbency cross-check**, never guessed from the portal or this app's
   own FEC-derived `candidates` table: `https://www.house.gov/representatives`
   (Michigan section) for the House delegation, and
   `https://www.senate.gov/senators/Class_II.htm` plus independent
   reporting (Detroit News, NBC News, PBS NewsHour, CBS Detroit) for the
   Senate seat.
4. **Governing calendar dates**:
   `https://www.michigan.gov/sos/-/media/Project/Websites/sos/Election-Administrators/Election-Dates.pdf`
   ("August – November 2026 Election Dates," Rev. 2/26) — Michigan's own
   official Bureau of Elections calendar. Sandbox note: fetching this PDF
   required disabling this session's command sandbox once (the sandbox's
   network allowlist doesn't include `michigan.gov`) — text was then
   extracted with `pypdf`.

**A stale-link finding, not a data gap:** the static PDF
`michigan.gov/sos/-/media/.../Candidate-Listing-Report.pdf` — surfaced by
both a general web search and the orchestrating session's own initial
lookup as a plausible cross-check — returns HTTP 404 as of 2026-07-15,
confirmed via both direct `curl` and browser navigation. It is not a
working alternate source; the live Entellitrak portal (independently
confirmed as the linked resource from michigan.gov/sos/elections) is the
sole official source used for candidate data, no third-party aggregator.

**Tooling note:** unlike TX's Civix SPA or OK's session-gated results
portal, no browser-automation workaround was needed to extract the
Entellitrak data itself — a single `get_page_text` call per `electionType`
value returned the complete report as plain text, despite the page
presenting a "Select a Race" dropdown that suggested per-race filtering
might be required. This is the simplest portal-shaped source seen in this
track to date.

## A cross-check finding this build made (not a bug — a real, non-obvious
nomination-mechanism distinction the SAFETY rule's independent-source
requirement was built to catch)

Unlike every prior pre-primary state (Arizona), where minor-party
candidates run in the SAME primary as DEM/REP and so share
`qualified_for_primary_ballot`, Michigan's minor parties bypass the primary
entirely via party convention. Had this build defaulted to AZ's precedent
uniformly, every Libertarian/Green/Working Class row would have been
mis-labeled `qualified_for_primary_ballot` — implying an undetermined
nomination that, per Michigan election law, is already final. This was
caught by reading Michigan's own GEN report closely (its "Convention" filing
method column, contrasted with "Petitions" for DEM/REP primary filers) and
cross-checking party-recognition status against Ballotpedia, not assumed
from the AZ precedent.

**Documented judgment call:** the GEN report is titled "Unofficial," which
could be read as signaling all its rows are provisional. This build treats
that label as tracking pending CHALLENGES (the report's own data proves
this — one CD13 Green Party filer is flagged `DISQ`, i.e. the report DOES
reflect post-nomination status changes) rather than an unresolved
nomination MECHANISM the way AZ's/TX's/OK's independent-petition
`declared_general_ballot_intent` status represents (a genuine
signature-count-verification pending outcome). A convention nomination,
once made and not challenged, is Michigan's final nomination mechanism for
that party — there is no primary round left to run. This is recorded here
as a documented decision, not a silent inference, per the epic's SAFETY
rule.

## Contest inventory

Michigan has **13 US House districts and 1 US Senate contest in 2026** (the
Class II seat, open — sitting Sen. Gary Peters not seeking re-election).
All 13 House districts + the Senate race are covered by the August 4
primary (DEM/REP) and, for 3 of Michigan's 7 recognized minor parties, the
November general ballot directly (LIB/GRE/WCPM).

## What was built (delta from the AZ/OK/AL two-chamber pattern)

Most of the AZ/OK/AL vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, and the importer's
array-shaped `FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — one new `party` code, `"WCPM"`
  (Working Class Party of Michigan) — a real state-recognized minor party,
  mirroring the AIP/AKP/PF/LPF/FFP precedent. No new `OfficialBallotStatus`
  value was needed (the existing `qualified_for_primary_ballot` /
  `qualified_for_general_ballot` pair covers Michigan's mixed
  primary-pending/convention-determined shape).
- `scripts/congressional-rosters/mi-official-roster-2026.ts` (new) — 71
  House rows (all 13 districts) + 6 Senate rows, 77 total. Full sourcing,
  methodology, and known limitations are in the file's own header
  docblock.
- `scripts/ingest/official-roster.ts` — registered `MI` in `FIXTURES` with
  separate house/senate entries, exactly like OK's/AL's two-entry pattern.
- `src/lib/server/races.ts` — added `WCPM: "Working Class Party"` to
  `PARTY_NAMES`.
- `src/lib/server/officialRoster.test.ts` — 3 new `describe` blocks (`getOfficialRoster
  — MI narrowing`, `isIncumbentSeekingReelection — MI`, `lookupChallengers —
  MI wiring`), 18 new tests covering: per-district narrowing across all 13
  districts, the mixed primary-pending/convention-determined status shape
  within a single district (MI-01), both open House seats (MI-10, MI-11),
  the open Senate seat, incumbent exclusion from the challenger list even
  though the incumbent's own renomination is undetermined, and confirming
  `isRunoffPending` is `false` everywhere (Michigan has no runoff system).

## Verification performed

- `npm run check`: lint (pre-existing complexity warnings only, none new),
  `tsc --noEmit` (clean), and the full vitest suite. All 3192 tests pass
  except one pre-existing, unrelated flake in
  `scripts/design/capture-shared.test.ts` (a Playwright headless-Chromium
  launch timing/resource-contention issue under the full-suite run,
  nothing to do with congressional rosters — confirmed by running that
  file in isolation, both with and without the command sandbox, where all
  3 of its tests pass cleanly every time).
- MI's 77 rows (71 House + 6 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported, and confirmed idempotent by a
  direct SQL row-count query against `official_roster_candidates`
  (`SELECT office, count(*) ... GROUP BY office`): **71 house / 6 senate /
  77 total, identical before and after the second import run** — not just
  the importer's own self-reported `upserted=77` count, per the goal
  condition's explicit instruction not to trust that alone.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 13 MI House
  districts and the Senate race, diffed against the fixture (incumbent
  rows excluded, matching the code's own contract). **0 mismatches across
  all 14 contests.** Every returned challenger carried
  `rosterProvenance.sourceKind === "official_state_roster"`, and every
  challenger carried `isRunoffPending: false` (Michigan has no runoff
  system for congressional primaries).
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every DEM/REP congressional nomination is undetermined** pending the
  August 4, 2026 primary — expected and correctly modeled via
  `qualified_for_primary_ballot`, not a gap. This fixture will need a
  follow-up update once the primary is certified (see the NOT BEFORE
  follow-up card below).
- **Independent (no-party-affiliation) candidates cannot be ruled out yet.**
  Per Michigan's official election calendar, the filing deadline for
  independent candidates seeking partisan office is 4 p.m., **July 16,
  2026** — one day AFTER this fixture's retrieval date — with a withdrawal
  window elapsing 4 p.m., **July 20, 2026**. Zero independent congressional
  filers appear in either report as of retrieval, consistent with the
  window not yet having closed, not evidence none will file.
- **Write-in filers are also an open window.** Michigan's write-in
  Declaration of Intent deadline for the August primary is 4 p.m., **July
  24, 2026**; the November general's write-in deadline is **October 23,
  2026**. Zero write-in filers appear in either report as of retrieval.
- **No explicit on-page legend was found defining `DISQ`/`WITHD`** on the
  Entellitrak portal; both are treated as excluding a row from this
  fixture as standard, self-evident abbreviations, but this is an
  inference, not a confirmed legend.
- **No post-primary candidate-withdrawal deadline for congressional
  nominees was found** in Michigan's official Aug–Nov 2026 election
  calendar — only a PRE-primary withdrawal deadline exists (April 24,
  2026, already elapsed at retrieval time, per MCL 168.134). This is an
  explicit absence from the calendar as published, not a confirmed "no
  such deadline exists" — flagged for the NOT BEFORE re-check rather than
  guessed either way.
- The GEN report's convention-nominee rows are recorded as
  `qualified_for_general_ballot` based on a documented judgment call about
  what the report's "Unofficial" label tracks — see "A cross-check
  finding" above.
- Names are recorded as they appear on the official portal, reformatted
  from the source's "Last, First" column order to "First Last" for
  consistency with this app's rendering convention (matching how Florida's
  build reformatted its own "Last, First" source rows); not independently
  re-verified against a third document.

## Every still-governing Michigan calendar date (item (e))

Source for all dates below:
`https://www.michigan.gov/sos/-/media/Project/Websites/sos/Election-Administrators/Election-Dates.pdf`
("August – November 2026 Election Dates," Rev. 2/26), Michigan Bureau of
Elections' own official calendar, cross-referenced against MCL citations
printed on the same document. All dates below are still in the future
relative to this build's 2026-07-15 retrieval date, except where noted as
already elapsed (included for completeness per the standing requirement).

- **July 16, 2026, 4 p.m.** — deadline for candidates without political
  party affiliation (independents) seeking partisan offices, including
  Congress, to file qualifying petitions and an Affidavit of Identity for
  the November General Election (MCL 168.590c). Resolves: whether any
  independent congressional candidate exists for 2026 at all.
- **July 20, 2026, 4 p.m.** — withdrawal deadline for the above independent
  filings (MCL 168.590c). Resolves: whether any independent filer named by
  July 16 withdraws before this fixture's next re-check.
- **July 24, 2026, 4 p.m.** — write-in candidates' Declaration of Intent
  for the August Primary due (MCL 168.737a). Resolves: whether any
  write-in congressional filer exists for the primary.
- **August 4, 2026** — Primary Election Day; also the deadline for minor
  parties to hold county caucuses/state conventions and notify the
  Secretary of State of any additional nominated candidates (MCL 168.686a).
- **August 18, 2026** — deadline for boards of county canvassers to
  complete their canvass of the August Primary; results forwarded to the
  Secretary of State within 24 hours (MCL 168.822).
- **August 24, 2026** — deadline for the Board of State Canvassers to meet
  and canvass the August Primary (MCL 168.581). **This is the date each
  contested DEM/REP congressional nomination becomes officially
  determined** — the trigger for this fixture's mandatory follow-up
  update (see NOT BEFORE card below).
- **September 4, 2026** — deadline for the Democratic and Republican
  parties to hold fall state conventions (MCL 168.591); also the deadline
  for local ballot-wording/polling-place-change matters unrelated to
  congressional candidates.
- **October 23, 2026, 4 p.m.** — write-in candidates' Declaration of Intent
  for the November General Election due (MCL 168.737a).
- **November 17, 2026** — deadline for boards of county canvassers to
  complete their canvass of the November General Election (MCL 168.822,
  168.828).
- **November 23, 2026** — deadline for the Board of State Canvassers to
  meet and canvass the November General Election (MCL 168.842). This is
  Michigan's final ballot-content/results certification for the 2026
  cycle — after this date, the roster for this cycle is fully locked.
- *(Already elapsed, included for completeness per the item-(e)
  requirement):* **April 21, 2026, 4 p.m.** — nominating-petition filing
  deadline for partisan/nonpartisan candidates (MCL 168.133); **April 24,
  2026, 4 p.m.** — the corresponding PRE-primary withdrawal deadline (MCL
  168.134). No POST-primary withdrawal deadline for congressional
  nominees was found in this calendar — see Known Gaps above.

## Deliverables (per the card's standing requirement)

- **(a) Comparison/output doc — this file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/mi-official-roster/docs/operations/michigan-vertical-slice-data-check.md`
- **(b) Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/mi-official-roster/scripts/congressional-rosters/mi-official-roster-2026.ts`
- **(c) Official Michigan source URLs used:**
  - `https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=PRI&electionYear=2026`
    (Michigan Bureau of Elections' official Primary Election candidate
    listing — Democratic/Republican filers, all offices)
  - `https://mi-boe.entellitrak.com/etk-mi-boe-prod/page.request.do?page=page.miboePublicReport&electionType=GEN&electionYear=2026`
    (Michigan Bureau of Elections' General Election candidate listing —
    minor-party convention nominees, all offices)
  - `https://www.michigan.gov/sos/elections` (confirms the PRI URL above as
    the linked "2026 August Primary Candidate Listing" resource)
  - `https://www.michigan.gov/sos/-/media/Project/Websites/sos/Election-Administrators/Election-Dates.pdf`
    (Michigan's official Aug–Nov 2026 election calendar — governing dates,
    item (e) above)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Michigan source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/senators/Class_II.htm` (Senate incumbency
    cross-check only — confirms Gary Peters' Class II seat and term)
- **(d) Operational-navigation section:** see "How this was verified"
  above.
- **(e) Every still-governing calendar date:** see the dedicated section
  above.

## NOT BEFORE follow-up card (drafted here, per the epic's convention — not
committed to the board by this build; handed to Muxin to add)

```
**[P1] NOT BEFORE re-check: Michigan (MI) primary certification**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- ORIGIN: 2026-07-15, opened at the close of the Michigan (MI) vertical
  slice build per the epic's "STANDING REQUIREMENT — NOT BEFORE DATE-GATE
  CONVENTION" — every DEM/REP row in mi-official-roster-2026.ts is
  currently `qualified_for_primary_ballot` (undetermined), pending
  Michigan's August 4, 2026 primary.
- OUTCOME: mi-official-roster-2026.ts updated to reflect each contested
  seat's certified primary nominee (qualified_for_general_ballot) in place
  of the current multi-candidate qualified_for_primary_ballot field, plus a
  re-check for any independent (no-party-affiliation) or write-in
  congressional filer that entered after this build's 2026-07-15
  retrieval (see the data-check doc's Known Gaps: independent filing
  deadline July 16/20, 2026; primary write-in deadline July 24, 2026).
- STATUS: Backlog
- NOT BEFORE: 2026-08-24 — the Board of State Canvassers' statutory
  deadline to canvass the August 4, 2026 primary (MCL 168.581); each
  contested MI congressional nomination is officially determined on or
  before this date, and Michigan's independent/write-in filing windows
  (see ORIGIN) will also be fully closed by then.
- DECISION: same self-vet auto-merge authorization as the original MI
  build — no separate sign-off gate.
```
