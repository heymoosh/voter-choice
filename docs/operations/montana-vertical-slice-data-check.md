# Montana vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Montana (MT)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. Montana's 2026 primary (2026-06-02) is already past and
fully certified. **Montana has no primary-runoff mechanism**
(`src/data/states/MT.json`'s `runoffRules.hasRunoff: false`) — every
nomination below is fully determined; there is no `runoff_pending` contest
in this build. The general election is 2026-11-03.

## Bottom line

**GO on the approach for another state.** Both MT House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is
on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 3 contests**.

**Montana is not Civix-vended** (`sosmt.gov` / `candidatefiling.mt.gov` /
`electionresults.mt.gov`, not `*.civixapps.com`). `sosmt.gov` itself 403s on
a plain fetch, but two other official `mt.gov` subdomains it links out to do
not — both rendered as plain server-side HTML on a single page load, no JS
SPA, no virtualized scroll, no per-district filter form. This is a
materially easier source than Texas's Civix portal, and easier even than
Oklahoma's PDF-plus-results-portal pattern, because Montana's own candidate
filing system already carries a live, explicit per-candidate status field
(`NOMINATED` / `FILED` / `Withdrawn` / `PENDING PETITION`) — no vote-total
derivation was required to identify each party's nominee, only
cross-verification against the separate results portal.

**Two real, non-obvious open-seat findings surfaced from the mandatory
independent incumbency cross-check** — both districts' second-hand framing
would have been wrong if trusted at face value:

- **U.S. Senate:** sitting Senator **Steve Daines** (Class II seat, elected
  2014, re-elected 2020) withdrew from the Republican primary **minutes
  before the March 4, 2026 filing deadline** and endorsed Kurt Alme, who
  filed the same day. Daines does not appear anywhere in the 2026 Senate
  candidate filings. Alme went on to win the Republican primary outright
  (76.1%). This is an open seat, not an incumbent-defends race.
- **MT-01 (Western District):** sitting Representative **Ryan Zinke**
  announced March 2, 2026 that he would not seek re-election. He does not
  appear anywhere in the 2026 congressional filings (not MT-01, not
  Senate). This is also an open seat.
- **MT-02 (Eastern District)** is the one seat of the three where the
  sitting officeholder, **Troy Downing**, did file for re-election — he was
  the sole Republican primary filer in his own district (unopposed,
  automatic nominee).

Had this build trusted the card's own framing (which named no specific
incumbent and simply said "the 2026 US Senate race, if one exists")
without the independent cross-check, there would have been no natural
signal to catch either retirement — the cross-check against `congress.gov`
/ GovTrack / `senate.gov` was what surfaced both, exactly the reason the
epic's SAFETY rule requires it every time.

**A real, non-obvious independent-candidate finding also surfaced:** three
2026 Montana congressional candidates filed as independents and needed to
clear a signature-petition threshold to reach the general ballot. The
Secretary of State's office **publicly certified that only two of the three
actually qualified** — Seth Bodnar (Senate, ~21,284 signatures accepted
against 13,327 required) and Michael D Eisenhauer (MT-02, met his
7,274-signature threshold) both made the ballot; Kimberly A Persico (MT-01)
fell far short (562 of 6,742 required accepted) and is **not** on the
November ballot. Persico is deliberately omitted from the fixture entirely
— not recorded with any status — the same treatment prior builds gave a
candidate who is a real filer but does not appear on the final ballot.
Because Montana's own certification (not just a filed declaration) is
already public for Bodnar and Eisenhauer, both are recorded
`qualified_for_general_ballot` — a stronger status than several prior
states' independents warranted.

**NO-GO on fan-out to further states** until the manual track continues per
the epic's own pacing, and **NO-GO on flipping the flag for real users**
without Muxin's sign-off — same standing gate as every prior state in this
track.

## How this was verified — two non-Civix, non-JS mt.gov subdomains, one
candidate-status list and one results portal

Montana's official election apparatus sits under `sosmt.gov`, which itself
403s on a plain fetch (same symptom several prior states hit — it needs a
real browser session/referer). Two other official state subdomains
`sosmt.gov` itself links out to, however, are plain server-rendered pages
that fetch cleanly:

1. **Candidate SET and STATUS (who filed, and their exact current
   standing):** `candidatefiling.mt.gov`'s live "FEDERAL PRIMARY 2026
   Candidate List"
   (`https://candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928`)
   — every federal filer, grouped by office and party, each carrying an
   explicit status: `NOMINATED`, `FILED` (lost the primary), `Withdrawn`, or
   `PENDING PETITION` (independent, signature verification outstanding at
   the time the system's own label was last set). This is a materially
   better source than a static filing-period PDF, because it already
   reflects post-primary outcome directly, not just who filed in February.
2. **Confirmation / vote totals:** `electionresults.mt.gov`'s official June
   2, 2026 primary results
   (`https://electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY`) —
   full statewide vote totals for every candidate in every federal race, one
   page load, no pagination. Used to independently confirm every
   `NOMINATED` status from source (1) actually corresponds to the
   plurality/majority winner of that race — full agreement on every
   contest, no discrepancy found.
3. **Incumbency cross-check**, never guessed from the filing system or the
   results portal: `congress.gov/member/troy-downing/D000634` and
   `govtrack.us/congress/members/troy_downing/457000` confirmed Troy
   Downing's current MT-02 service; `govtrack.us/congress/members/ryan_zinke/412640`
   confirmed Zinke's retirement (corroborated independently by multiple news
   outlets — Daily Montanan, NBC Montana, Ballotpedia); `govtrack.us/congress/members/steve_daines/412549`
   and `senate.gov/states/MT/intro.htm` confirmed Daines's Senate service
   and the seat's class (Class II, up in 2026), plus that Daines does not
   appear as a 2026 candidate (corroborated independently by Axios,
   Washington Post, and Fox News reporting on the March 4-5, 2026
   withdrawal). **This app's own FEC-derived `candidates` table was
   deliberately never used for any of this cross-check.**

**Independent candidates:** Montana requires a nominating petition (4% of
the votes cast for the winner of that office's previous election —
13,327 signatures for Senate, 6,742 for MT-01, 7,274 for MT-02) submitted to
county election offices by May 26, 2026. The Secretary of State's office
publicly announced certification of the two candidates who cleared their
threshold (Bodnar, Eisenhauer); the candidate filing system's own status
field for both had not yet been updated off `PENDING PETITION` as of this
build's retrieval (a lag between the public certification announcement and
the filing system's own label refresh, not a discrepancy in the underlying
fact) — this build trusted the public certification, not the
not-yet-refreshed system label, and recorded both `qualified_for_general_ballot`.
Persico's non-qualification was independently confirmed via her own public
acknowledgment (reported she knew she fell short before the deadline) and
the same certification announcement's implicit omission of her name.

**Not used as a source, deliberately:** Ballotpedia (comparison/spot-check
only, never primary).

## Contest inventory

Montana has **2 US House districts and 1 US Senate contest in 2026** (the
Class II seat, currently held by Steve Daines through the end of this term).
Both House districts + the Senate race are covered by the general election.

## What was built (delta from the AZ/TX/OK pattern)

Most of the AZ/TX/OK vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, the
`runoff_pending`/`isRunoffPending` mechanism (unused here — Montana has no
runoff), and the importer's array-shaped `FIXTURES` map. **No new
`OfficialBallotStatus` or party code was needed** — Montana's contests use
only `qualified_for_general_ballot` and the pre-existing `DEM`/`REP`/`LIB`/
`IND` party codes.

**New / changed for this build:**

- `scripts/congressional-rosters/mt-official-roster-2026.ts` (new) — 7 House
  rows (District 01: 3 major-party/minor-party nominees, no independent —
  Persico excluded, did not qualify; District 02: incumbent Downing + 3
  challengers including the certified independent Eisenhauer) + 4 Senate
  rows (Alme-R, Bankhead-D, Austin-Libertarian, Bodnar-Independent, all
  open-seat / non-incumbent). Full sourcing, methodology, and known
  limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `MT` in `FIXTURES` with
  separate house/senate entries, the same two-entry pattern as TX/OK/AL.
- `src/lib/server/officialRoster.test.ts` — 11 new tests: `getOfficialRoster`
  narrowing across both MT districts + the Senate contest (including an
  explicit assertion that the disqualified independent Persico is absent
  from the MT-01 rowset), `isIncumbentSeekingReelection` for MT-02
  (incumbent-defended) + MT-01 + the open Senate seat (both false, no
  incumbent row), and `lookupChallengers` wiring (both chambers covered,
  FEC query skipped — 2 calls not 3; MT-02's incumbent Downing correctly
  excluded from challengers while the other 3 filers render; both open
  contests render every nominee).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): the new
  `officialRoster.test.ts` tests (154 total in that file) pass cleanly.
  Full-suite run: 161 of 162 test files passed, 3 failures — all three are
  pre-existing `scripts/design/capture-shared.test.ts` Playwright/Chromium
  launch failures (`EPERM`/`bootstrap_check_in ... Permission denied`, a
  macOS sandbox restriction on spawning a headless-Chromium process from
  this shell), in a file this build never touched — confirmed unrelated via
  `git status`/`git diff` showing zero changes to that file. Lint: 0 errors
  (only pre-existing `complexity` warnings across the codebase, none in any
  file this build touched, plus 2 pre-existing unused-eslint-disable
  warnings elsewhere).
- Confirmed no migration was needed: `db/schema.ts`'s
  `officialRosterCandidates.ballotStatus` is a plain `text` column with no
  CHECK constraint (same as every prior state in this track since migration
  0016).
- MT's 11 rows (7 House + 4 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, retrieved via
  `vercel env pull --environment=preview` after linking this worktree's
  `.vercel/project.json` to the same Vercel project as the main checkout;
  read inline via a single `grep`/`cut` substitution, never `source`d,
  never echoed in full — confirmed non-empty, 147 characters, and prefixed
  `postgresql:` before use), re-imported, and confirmed idempotent by
  **direct row-count SQL query** (`SELECT count(*) FROM
  official_roster_candidates WHERE state='MT'` → 11 both times, full row
  contents also compared and identical) — never the importer's
  self-reported count alone.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for both MT House
  districts and the Senate race, diffed against the fixture. **0 mismatches
  across all 3 contests.** Full literal output (candidate name, party, and
  provenance as the app would render it):

  ```
  MT-01 — open seat (Zinke not seeking re-election)
    - Aaron Flint (Republican)
    - Sam Forstag (Democrat)
    - Nick Sheedy (Libertarian)

  MT-02 — incumbent Troy Downing, seekingReelection2026=true
    - Brian J Miller (Democrat)
    - Patrick McCracken (Libertarian)
    - Michael D Eisenhauer (Independent)

  U.S. SENATE — open seat (sitting Senator Daines withdrew before filing)
    - Kurt Alme (Republican)
    - Alani Bankhead (Democrat)
    - Kyle Austin (Libertarian)
    - Seth Bodnar (Independent)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Troy Downing (MT-02's incumbent) was correctly
  excluded from the challenger list.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). `.env.staging.local` (holding the pulled staging credential) is
  gitignored (`.env*` pattern) and was never committed.

## Governing calendar dates found (per the plan doc's item (e))

- **August 5, 2026, 5:00 p.m.** — Montana's candidate-withdrawal deadline
  (MCA 13-1-403(1)/(3): "a candidate may not withdraw after the candidate
  filing deadline," which the statute and the Secretary of State's own 2026
  Candidate Calendar both place at 90 days before the general election).
  Any nominee recorded `qualified_for_general_ballot` in this fixture could,
  in principle, still withdraw before this date. Source:
  `https://mca.legmt.gov/bills/mca/title_0130/chapter_0010/part_0040/section_0030/0130-0010-0040-0030.html`
  (13-1-403), corroborated by the Secretary of State's
  `https://sosmt.gov/wp-content/uploads/wpfd/preview_files/2026-Candidate-Calendar(55f1fb611e846600d35d26e19097be29).pdf`.
- **August 20, 2026** — Montana's ballot-content certification deadline (MCA
  13-12-201: "seventy-five days before a general election, the secretary of
  state shall certify to the election administrators the name and party or
  other designation of each candidate"). This is the point after which no
  further change to the 2026 congressional roster is possible. Source:
  `https://mca.legmt.gov/bills/mca/title_0130/chapter_0120/part_0020/section_0010/0130-0120-0020-0010.html`
  (13-12-201).

A dated re-check follow-up card (`NOT BEFORE: 2026-08-21` — the day after
the ballot-content certification deadline, which also gives the August 5
withdrawal window time to fully resolve first) has been added to
`docs/operations/voter-choice-backlog.md` per the epic's "NOT BEFORE
DATE-GATE CONVENTION" standing requirement.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/mt-official-roster/docs/operations/montana-vertical-slice-data-check.md`
  (will land at `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/montana-vertical-slice-data-check.md`
  once merged to `main`).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/mt-official-roster/scripts/congressional-rosters/mt-official-roster-2026.ts`
  (will land at `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/mt-official-roster-2026.ts`
  once merged to `main`).
- **Official Montana source URLs used:**
  - `https://candidatefiling.mt.gov/candidatefiling/CandidateList.aspx?e=450002928`
    (Secretary of State's live 2026 federal candidate filing/status list)
  - `https://electionresults.mt.gov/resultsSW.aspx?type=FED&map=CTY`
    (Secretary of State's official June 2, 2026 primary election results)
  - `https://sosmt.gov/wp-content/uploads/wpfd/preview_files/2026-Candidate-Calendar(55f1fb611e846600d35d26e19097be29).pdf`
    (Secretary of State's 2026 Candidate Calendar — governing dates)
  - `https://mca.legmt.gov/bills/mca/title_0130/chapter_0010/part_0040/section_0030/0130-0010-0040-0030.html`
    (MCA 13-1-403, candidate-withdrawal deadline statute)
  - `https://mca.legmt.gov/bills/mca/title_0130/chapter_0120/part_0020/section_0010/0130-0120-0020-0010.html`
    (MCA 13-12-201, ballot-content certification deadline statute)
  - `https://congress.gov/member/troy-downing/D000634`,
    `https://www.govtrack.us/congress/members/troy_downing/457000`,
    `https://www.govtrack.us/congress/members/ryan_zinke/412640`,
    `https://www.govtrack.us/congress/members/steve_daines/412549`, and
    `https://www.senate.gov/states/MT/intro.htm` (incumbency cross-check
    only — not Montana state sources, cited because they materially shaped
    the `isIncumbent` data and surfaced both open-seat findings)

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The candidate-withdrawal deadline (August 5, 2026) and ballot-content
  certification deadline (August 20, 2026) are both still in the future** as
  of this fixture's retrieval date (2026-07-15) — see the "Governing
  calendar dates found" section above and the dated re-check card opened in
  the backlog.
- **The candidate filing system's own `PENDING PETITION` label for Bodnar
  and Eisenhauer had not yet been refreshed to reflect their public
  certification** as of this build's retrieval — this build trusted the
  Secretary of State's separate certification announcement over the
  not-yet-updated system label; a future re-check should confirm the
  filing system's label has since caught up (informational only, does not
  change either candidate's recorded status here).
- Names are recorded as they appear in the official candidate filing
  system; not independently re-verified against a third document.

## GO/NO-GO verdict

**GO on the approach for another state — a third distinct non-Civix source
shape (a live per-candidate status list plus a separate results portal, no
PDF, no derivation math required), and a real double open-seat/independent-
qualification finding caught cleanly by the existing cross-check rules. Both
open seats resolved with zero guessing; the disqualified independent was
correctly excluded, not guessed into a lesser status.**

**NO-GO on flipping the flag for real users without Muxin's sign-off** —
same standing gate as every state in this track.

What remains before this reaches real users:

1. **Flag flip (prod cutover for MT and/or any other built state)** — human
   sign-off required, same as every prior state. Nothing in this build
   enables `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **The dated re-check card** (`NOT BEFORE: 2026-08-21`) will confirm no
   withdrawal occurred in the August 5 window and that the roster is
   ballot-content-locked as of August 20.
