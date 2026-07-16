# Washington vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Washington (WA)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-16. Washington's 2026 top-two primary (2026-08-04) has **NOT
happened yet as of this build** — 19 days in the future. The general
election is 2026-11-03.

## Bottom line

**GO on the approach.** All 10 WA House districts render correctly
end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified against the real
Neon staging branch through the actual `lookupChallengers` code path — **0
mismatches across all 10 districts**.

**Washington is not Civix-vended** — its official candidate-filing source is
a plain server-rendered ASP.NET grid at `voter.votewa.gov` (the WA SoS's own
"VoteWA" system), reachable with a normal browser session; no JS SPA, no
virtualized scroll, no 403 on the rendered page. This is a materially
easier source than Texas's Civix portal or even Oklahoma's PDF-plus-results
pattern — the entire candidate list loaded in a single page fetch.

**Washington's top-two primary is entirely PRE-primary at transcription
time**, unlike California's already-certified top-two build. Every filed
candidate below is `qualified_for_primary_ballot`; there are no
`qualified_for_general_ballot` or `runoff_pending` rows — a top-two system
has no runoff finalists to represent pre-primary, since the general-ballot
nominees are wholly undetermined until the primary happens.

**Six new WA-specific party-preference codes were added**
(`CAS`/`SNP`/`TRR`/`FTR`/`SWP`/`UNP`) to `types.ts` — Washington's top-two
law (I-872; RCW 29A.24.030-.050) lets any candidate self-designate ANY party
preference (up to 16 characters), not just a legally-recognized party. See
"What was built" below.

**A real, non-obvious incumbency finding surfaced during the official
cross-check:** WA-4's sitting incumbent, Dan Newhouse (R), is **not seeking
re-election** — announced December 17, 2025, confirmed via his own press
release and three independent news sources. CD-4 is a genuine open seat
(11 filers, no incumbent). See "A cross-check finding" below.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every other state in this track.

## How this was verified — a plain server-rendered ASP.NET grid, no Civix,
no browser-automation workaround needed for the pull itself

1. **Candidate SET (who filed):** the WA Secretary of State's own "VoteWA"
   candidate-filing portal, reached via `sos.wa.gov/elections/candidates` →
   "Candidates Who Have Filed" →
   `https://voter.votewa.gov/CandidateList.aspx?e=898` (election `e=898` =
   "PRIMARY 2026"). This is a plain server-rendered `<table>` grid (ASP.NET
   Web Forms/GridView style) — a single `get_page_text` call after
   navigating returned the **entire first page of results**, which turned
   out to already contain every Congressional row (District Type sorts
   alphabetically before Legislative, so all 10 congressional districts —
   71 filers total — were captured in one page load, before the grid's
   pagination cut into the Legislative section). No filter form, no
   virtualized scroll, no scripted Playwright pass was needed. The page
   also exposes per-column filter textboxes (District Type / District /
   Race / Name); used only to confirm no US Senate race exists (see below),
   not needed for the House pull itself.
2. **Withdrawn filers excluded, not included as "on the ballot":** two
   candidates carry an explicit "Withdrawn" Election Status in the SoS
   grid — Raymond Pelletti (CD-2, REPUBLICAN, filed 5/5/2026) and Mike
   Gahvarehchee (CD-5, DEMOCRATIC, filed 5/8/2026). Both withdrew before the
   May 11, 2026 statutory withdrawal deadline (confirmed via the SoS's own
   election calendar, see "Contest inventory" below) and are recorded ONLY
   in this fixture's docblock, not as roster rows — they never appear on
   any ballot.
3. **No US Senate race confirmed two independent ways:** (a) both of WA's
   sitting US Senators have terms extending well past 2026 — Patty Murray
   (re-elected 2022, term to January 2029) and Maria Cantwell (re-elected
   2024, term to January 2031); (b) filtering the SoS grid's "Race" column
   for the literal string "Senator" returns only Legislative "State
   Senator" (WA state legislature) rows — zero "U.S. Senator" rows anywhere
   in the 1,108-candidate, 602-office statewide filing list.
4. **Incumbency cross-check**, never guessed from the SoS filing grid:
   `https://www.house.gov/representatives` ("By State and District" →
   Washington). **This app's own FEC-derived `candidates` table was
   deliberately never used for this cross-check** — same rule as every
   other state in this track.

**Party preference is Washington's own literal self-designated ballot
text, not a party registration.** Under RCW 29A.24.030-.050 (Initiative
872's top-two system), a candidate may state ANY preference of their
choosing on their declaration of candidacy. The SoS grid's "Party
Preference" column prints these strings verbatim — most are DEMOCRATIC /
REPUBLICAN / INDEPENDENT (mapped to the existing DEM/REP/IND codes), but six
distinct one-off or minor-party labels also appeared among the 69
non-withdrawn Congressional filers: CASCADE (a real WA-registered minor
party, 2 filers), STATES NO PARTY PREFERENCE (WA's own literal
no-preference ballot label, distinct from California's NPP — 4 filers),
TRUMP REPUBLICAN (self-designated, 1 filer), FIFTH REPUBLIC
(self-designated, 1 filer), SOCIALIST WORKERS (the real national Socialist
Workers Party, 1 filer), and UNION (self-designated, 1 filer). Each got its
own new `types.ts` code, per the same "preserve the official source's own
literal label" precedent as every prior state's minor-party additions — see
that file's comment block for the full rationale, including a note that a
future top-two-primary state build (Louisiana remains unbuilt) should
expect the same phenomenon.

**Not used as a source, deliberately:** Ballotpedia (comparison/spot-check
only, never primary).

## A cross-check finding this build made (not a bug — a real, non-obvious
incumbency fact caught by the independent-source rule)

WA-4's sitting incumbent is Dan Newhouse (R), still listed as the current
member on `house.gov/representatives` (he serves out his term through
January 2027) — but he does **not** appear anywhere in the SoS's CD-4 filing
list. A web search independently confirmed why: Newhouse announced December
17, 2025 that he would not seek re-election in 2026, ending 12 years in
Congress, per his own press release
(`newhouse.house.gov/media-center/press-releases/newhouse-announces-he-will-not-seek-reelection`)
and three independent outlets (Spokesman-Review, Washington State Standard,
Ballotpedia News) — the Spokesman-Review specifically reported "11
candidates vie to replace Dan Newhouse," matching this build's own count of
11 CD-4 filers exactly. CD-4 is therefore recorded as a genuine open seat
(`isIncumbent: false` for all 11 filers), not a data gap.

Had this build assumed Newhouse was still running (a natural assumption
absent the cross-check — house.gov still lists him as the sitting member),
`isIncumbent` would have silently defaulted to false for every CD-4
candidate anyway (none is named Newhouse), so the *output* would coincidentally
have been correct — but the open-seat *finding itself*, and the confidence
that no filer was missed, depended on doing the cross-check rather than
assuming.

## Contest inventory

Washington has **10 US House districts and 0 US Senate contests in 2026**.
All 10 House districts are covered, pre-primary (`stage: "primary"`).

**Still-governing calendar dates** (from `sos.wa.gov/elections/calendar`,
retrieved 2026-07-16):

- **May 4-8, 2026** — Official Candidate Filing Week (already closed; the
  filer list used for this fixture is final).
- **May 11, 2026** — Candidate withdrawal deadline (already passed; the 2
  withdrawn filers excluded from this fixture withdrew before this date, so
  their exclusion is final, not still-live risk).
- **May 12, 2026** — Last day for the Secretary of State to certify
  candidates to County Auditors (already passed; this is WA's effective
  primary-ballot content lock).
- **August 3, 2026** — Last day a void in candidacy causes an office to
  reopen filing (still ahead).
- **August 4, 2026** — PRIMARY (top-two; still ahead — this is the date
  that resolves which two candidates per district advance to the general).
- **August 18, 2026** — County Canvassing Boards certify and transmit
  primary results.
- **August 21, 2026** — Deadline for the Secretary of State to certify
  primary results — the date the top-two general-ballot nominees become
  official. **This is the target date for the follow-up card below.**
- **November 3, 2026** — GENERAL ELECTION.
- **December 3, 2026** — Last day for the Secretary of State to certify
  November General Election results — final ballot-content lock for the
  cycle.

A dated follow-up card ("NOT BEFORE 2026-08-21") should be opened to update
this fixture with the certified top-two general-ballot nominees once the
primary is certified — see the epic's "STANDING REQUIREMENT — NOT BEFORE
DATE-GATE CONVENTION" (`c5a813bb`) for the card format.

## What was built (delta from the AZ/TX/OK/CA pattern)

Most of the vertical slice's infrastructure is state-agnostic and required
**no changes**: `official_roster_candidates` table shape, `officialRoster.ts`
reader, `officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, `RepCard.tsx`, and the importer's array-shaped
`FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — six new `party` codes
  (`CAS`/`SNP`/`TRR`/`FTR`/`SWP`/`UNP`) preserving Washington's literal
  self-designated party-preference labels verbatim. No new
  `OfficialBallotStatus` value was needed — WA's pre-primary stage uses the
  existing `qualified_for_primary_ballot` only.
- `scripts/congressional-rosters/wa-official-roster-2026.ts` (new) — 69
  House rows across all 10 districts (9 incumbent-defended, 1 open seat).
  Full sourcing, methodology, withdrawn-filer accounting, and known
  limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `WA` in `FIXTURES` as a
  single house-only entry, mirroring the CA/MO/CT/HI/MD house-only pattern
  (no Senate entry — no 2026 WA Senate contest).
- `src/lib/server/officialRoster.test.ts` — 8 new tests: `getOfficialRoster`
  narrowing across all 10 WA districts, WA-01 (7 rows, incumbent present)
  and WA-04 (11 rows, open seat, no incumbent) spot checks, a house-only
  senate-empty check, `isIncumbentSeekingReelection` for the 9
  incumbent-defended districts + WA-04's open seat, and `lookupChallengers`
  wiring for both a determined-incumbent district (WA-01) and the open seat
  (WA-04).
- No DB migration needed — confirmed the table/index shape is unchanged
  since migration `0016` before writing any migration.

## Verification performed

- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run src/lib/server/officialRoster.test.ts`: **222 tests
  passing** (214 pre-existing + 8 new WA tests).
- Pre-import direct row-count query for `state = 'WA'` on staging: **0
  rows** (confirmed clean before import).
- WA's 69 rows imported to the isolated Neon **staging** branch
  (`ROSTER_STAGING_DATABASE_URL`, pulled via
  `vercel env pull --environment=preview`, explicitly — never the ambient
  `DATABASE_URL`). The importer self-reported `upserted=69` on both the
  first and a second, identical re-run.
- **Idempotency confirmed by a direct row-count query** (not the importer's
  self-reported count): `select office, count(*) ... where state='WA' group
  by office` returned `house: 69` after the first import, and the
  **identical** `house: 69` after the second re-run — no growth.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 10 WA House
  districts, diffed candidate-by-candidate against the fixture (excluding
  each district's incumbent, which `lookupChallengers` deliberately omits
  from its challenger list — confirmed by first running the raw diff
  un-adjusted, observing that every "mismatch" was exactly one missing name
  per district, and confirming that name was always the district's sitting
  incumbent per the fixture, before re-running with incumbents excluded
  from the expected set). **0 mismatches across all 10 districts**, every
  returned challenger carrying `rosterProvenance.sourceKind ===
  "official_state_roster"`:

  ```
  WA-01 — incumbent Suzan DelBene, seekingReelection2026=true (6 challengers)
    - Benjamin Kincaid (Democratic)
    - Bryce Nickel (Democratic)
    - James Etzkorn (Independent)
    - Hunter Gordon (Democratic)
    - Mary Silva (Republican)
    - Catherine Hildebrand (Democratic)

  WA-02 — incumbent Rick Larsen, seekingReelection2026=true (3 challengers)
    - Edwin H. Feller (Republican)
    - Tomas Scheel (Democratic)
    - Devin Hermanson (Democratic)

  WA-03 — incumbent Marie Gluesenkamp Perez, seekingReelection2026=true
  (8 challengers)
    - Brent Hennrich (Democratic)
    - John P. Roco (Republican)
    - John Saulie-Rohman (Independent)
    - Troy Rasband (Democratic)
    - John Braun (Republican)
    - Antony Barran (Cascade)
    - Austin Braswell (Democratic)
    - Lawrence Kellogg (Republican)

  WA-04 — OPEN SEAT (Newhouse not seeking re-election); 11 filers, no
  incumbent excluded
    - Jacek "Jack" Kobiesa (States No Party Preference)
    - Amanda McKinney (Republican)
    - John Duresky (Democratic)
    - John C. Hughs (Republican)
    - Favian Valencia (Independent)
    - Jerrod Sessler (Republican)
    - Devin Poore (Cascade)
    - Ken Vaz (Republican)
    - Zac Rossi (States No Party Preference)
    - Elpidia Saavedra (Republican)
    - Matt Boehnke (Republican)

  WA-05 — incumbent Michael Baumgartner, seekingReelection2026=true
  (11 challengers)
    - Nate Powell, Carmela Conroy, Matthew Hayes, Bajun R. Mavalwalla,
      Michael McGarr, Kevin Fagan, Kyle Usrey, Andrew Bartleson,
      Ann Marie Danimus, Richard Freudenberg, David Womack

  WA-06 — incumbent Emily Randall, seekingReelection2026=true (4 challengers)
    - Brian P. O'Gorman (Independent)
    - Teresa Fox (Republican)
    - Macy Jones (States No Party Preference)
    - Leon Lawson (Trump Republican)

  WA-07 — incumbent Pramila Jayapal, seekingReelection2026=true (3 challengers)
    - David W. Blomstrom (Fifth Republic)
    - Nirav Sheth (Republican)
    - Gwen Kirkland (Democratic)

  WA-08 — incumbent Kim Schrier, seekingReelection2026=true (5 challengers)
    - Trinh Ha, Spencer Meline, Keith Arnold, Andres Valleza, Bob Hagglund

  WA-09 — incumbent Adam Smith, seekingReelection2026=true (4 challengers)
    - Jacob Perasso (Socialist Workers)
    - Kshama Sawant (Independent)
    - Melissa Chaudhry (Democratic)
    - Doug Basler (Republican)

  WA-10 — incumbent Marilyn Strickland, seekingReelection2026=true
  (5 challengers)
    - Adam Arafat (Democratic)
    - Kurtis Engle (Union)
    - Alex Scheel (Democratic)
    - Derek Maynes (States No Party Preference)
    - Chris D. Chung (Republican)
  ```

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file). The staging credential and Vercel project link used to run the
  importer were pulled fresh into this worktree and never committed (both
  `.env*` and `.vercel/` are gitignored).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **All 69 rows are pre-primary filers** — none is a determined
  general-ballot nominee. This is expected and correct for Washington's
  stage (primary is August 4, 2026, still future) — not an omission. A
  dated follow-up (NOT BEFORE 2026-08-21) is needed to add the certified
  top-two nominees per district once the primary is certified.
- **Two withdrawn filers are excluded entirely, not represented with any
  status** (Raymond Pelletti, CD-2; Mike Gahvarehchee, CD-5) — they never
  appear on any ballot, so no `OfficialBallotStatus` value fit; recorded
  only in the fixture's docblock, per the "SAFETY" instruction that a
  withdrawal be recorded explicitly rather than silently omitted or
  guessed at.
- **Party-preference labels are self-designated, not verified party
  registrations** — Washington's top-two law does not require a candidate's
  stated preference to correspond to any real party, so a label like
  "Trump Republican" or "Fifth Republic" reflects only what the candidate
  wrote on their declaration of candidacy, not a legal party affiliation.
- Names are recorded as they appear in the official SoS filing grid; not
  independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/washington-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/wa-official-roster-2026.ts`.
- **Official Washington source URLs used:**
  - `https://www.sos.wa.gov/elections/candidates` (WA Secretary of State's
    Candidates page, linking to the filing list)
  - `https://voter.votewa.gov/CandidateList.aspx?e=898` (VoteWA's official
    2026 Primary candidate filing grid — the primary data source for this
    fixture)
  - `https://www.sos.wa.gov/elections/calendar` (WA SoS's official election
    calendar — source for every date in "Contest inventory" above)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Washington source, cited because it materially shaped the
    `isIncumbent` data and surfaced the WA-4 open-seat finding)

## Tracking pending elections going forward

Per the epic's standing requirement (added after the Oklahoma build), this
build checked Washington's own official election calendar for every
still-governing date, not just a pending-primary/runoff check, and recorded
all of them in "Contest inventory" above. A dated follow-up card (NOT BEFORE
2026-08-21) is needed once the primary is certified — see that section.

## GO/NO-GO verdict

**GO on the approach.** All 10 WA House districts render correctly,
verified live against staging. **NO-GO on flipping the flag for real users**
without Muxin's sign-off.

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   other state in this track. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A follow-up update to this fixture is needed after August 21, 2026**,
   once Washington's top-two primary is certified and the general-ballot
   nominees per district become determined — see the dated follow-up card
   above.
