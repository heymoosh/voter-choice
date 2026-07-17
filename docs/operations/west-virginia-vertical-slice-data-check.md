# West Virginia vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: West Virginia (WV)"
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). No `DEPENDS ON` another
state card — the manual track scopes each *session* to one state, not the
backlog.

Date: 2026-07-16. West Virginia's 2026 primary (2026-05-12) is already past.
The general election is 2026-11-03. West Virginia has no runoff mechanism
for congressional races — every federal nomination is determined.

**Why West Virginia, specifically:** the alphabetically/sequence-next state
in the manual vertical-slice track, per the card's ORIGIN note — not chosen
for a specific technical gap.

## Bottom line

**GO on the approach for this state.** Both US House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is
on, verified against the real Neon staging branch through the actual
`lookupChallengers` code path — **0 mismatches across all 3 contests.**

**West Virginia is not Civix-vended** (`candidates.wvsos.gov`, a
WVSOS-branded candidate lookup tool — no `*.civixapps.com` host, no "Powered
by gocivix.com" footer) — the Civix portal playbook does not apply.

**The card's own ORIGIN note flagged a stale caveat** from an earlier I11
source-inventory rehearsal: at that time the portal loaded but showed zero
populated candidate rows. Re-checked live at this build's retrieval date
(2026-07-16): the portal is now fully populated — 235 candidates across all
West Virginia offices for the 2026 General Election, 7 of them federal. The
caveat no longer applies; this is simply the calendar catching up (WV's
candidate-filing period ran January–August 2026, well after the earlier
rehearsal).

**This is the simplest state built through this pipeline so far**: both
House seats and the Senate seat have a defending incumbent running for
re-election, no open seats, and — unlike AZ/TX/OK's pre-primary filing
documents — the official source's "Regular Candidates" listing is explicitly
titled "2026 General Election" and already reflects the POST-primary nominee
set (exactly one Democratic and one Republican filer per federal seat), so
no primary-results derivation was needed. No `runoff_pending` rows exist —
West Virginia has no congressional runoff mechanism, and the May 12, 2026
primary has already happened.

**One open item, conservatively flagged rather than guessed:** West
Virginia's Constitution Party US Senate candidate (S. Marshall Wilson) is
recorded as `declared_general_ballot_intent`, not `qualified_for_general_ballot`
— see "How this was verified" below for the reasoning and the exact
governing dates.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — a WVSOS-branded candidate portal, no browser
automation needed for the pull itself, an official 2026 Elections Calendar
PDF for the governing dates

West Virginia's official candidate source, `candidates.wvsos.gov`, is a
plain server-rendered lookup tool (not a JS SPA like Texas's Civix portal) —
`get_page_text` after navigating to `/regular` returned all 235 candidates
(all WV offices, 7 federal) in one page load after setting "Rows per page"
to 1000; no virtualized scroll, no per-district filter form, no scripted
Playwright pass needed. A plain `WebFetch` was not attempted against this
tool (based on the Civix/OK precedent of non-browser fetches 403ing on
similar portals — not separately re-verified, since the browser path worked
cleanly on the first try).

1. **Candidate SET + general-ballot nominees (already resolved, not
   derived):** `https://candidates.wvsos.gov/regular` — the official 2026
   General Election "Regular Candidates" listing. Exactly one Democratic and
   one Republican filer appears per federal seat (Senate, WV-1, WV-2) — this
   is the already-decided post-primary nominee set, not a pre-primary filing
   list requiring vote-total derivation (unlike AZ/TX/OK).
2. **Write-in candidates:** a separate tab,
   `https://candidates.wvsos.gov/write-in` — one federal write-in filer: Rio
   Phillips (US Senate, filed 06/05/2026, listed under "No Party
   Affiliation"). Recorded with `party: null` and `ballotStatus:
   "write_in_qualified"`, matching the AZ/FL/OK precedent — a write-in's
   party label is not preserved as a real party affiliation.
3. **Incumbency cross-check**, never guessed from the candidate portal or
   this app's own FEC-derived `candidates` table:
   `https://www.house.gov/representatives` ("By State and District" → West
   Virginia section) confirms Carol Miller (WV-1) and Riley Moore (WV-2) as
   the sitting House delegation — both running for re-election, both
   matching their portal filings exactly, no open seat.
   `https://www.senate.gov/states/WV/intro.htm` confirms Shelley Moore
   Capito (R) as a sitting senator, running for re-election in 2026 (her
   colleague James C. Justice's seat is a different Senate class, not on
   the 2026 ballot — out of scope for this fixture).
4. **Governing dates**, pulled from the official 2026 Elections Calendar PDF
   (`https://sos.wv.gov/media/467/download`, 52 pages, fetched and read via
   `pdftotext -layout` after `WebFetch` returned only binary PDF content it
   couldn't parse):
   - **August 3, 2026** — deadline for "No Party Organization/Unaffiliated
     Candidates to File Nominating Petitions, Certificate of Announcements
     and Pay Filing Fee" (W. Va. Code §§ 3-5-23, 3-5-24). The statutory
     deadline is August 1, but that falls on a Saturday in 2026, so it rolls
     to the next business day per W. Va. Code § 2-2-2. **This is the
     governing deadline for West Virginia's non-major-party federal
     candidates** — West Virginia has no convention-based minor-party
     nomination path (searched the calendar PDF for "convention" /
     "recognized party" / "minor party" — no hits); every non-major-party
     candidate, including Constitution Party filers, goes through this same
     certificate/petition process.
   - **August 11, 2026** — last day for a candidate to withdraw from the
     General Election (W. Va. Code § 3-5-11(b)(2)).
   - **August 24, 2026** — Secretary of State transmits the certified list
     of General Election candidates to county clerks (71st day before the
     election, W. Va. Code § 3-5-18). This matches the card's own ORIGIN
     note's "~Aug 24, 2026 certify/transmit deadline" reference exactly.
   - **August 25, 2026, 9:00 a.m.** — drawing for order of names on the
     General Election ballot (W. Va. Code § 3-6-2(d)).

**S. Marshall Wilson's (Constitution, US Senate) ballot status —
`declared_general_ballot_intent`, not `qualified_for_general_ballot`:** at
this fixture's retrieval date (2026-07-16), the nominating-petition filing
window for non-major-party candidates does not even close until August 3,
2026 (still in the future), and the Secretary of State's CERTIFIED candidate
list isn't transmitted to county clerks until August 24, 2026. The candidate
portal itself exposes no separate "sufficient"/"certified" flag
distinguishing an accepted filing from a certified one — Wilson's "View
Details" modal shows only his filing date (06/15/2026), office, and party,
nothing resembling a certification status. Per the same conservative posture
Colorado's UAF petition candidates used (filed but not yet
certified-sufficient => `declared_general_ballot_intent`, never guessed as
qualified), Wilson is recorded the same way. **A re-check after August 24,
2026 is warranted** — see "Follow-up card" below.

**Party code:** Wilson's party is printed as "CONSTITUTION" by the portal.
Reused the existing `CST` code (added building Idaho, "the Constitution
Party of Idaho") rather than minting a new WV-specific code — `CST` already
represents the national Constitution Party's state-level ballot presence
generically, and West Virginia's Constitution Party is the same national
party, per Muxin's explicit direction during this build.

**Known pre-existing display gap, not introduced by this build:** `CST` is
not present in `src/lib/server/races.ts`'s `PARTY_NAMES` display-name map
(it has `CON: "Constitution"` but not `CST`), so `partyName("CST")` falls
back to the raw code — a WV Senate `/api/delegation` response would show
Wilson's party as literally `"CST"`, not `"Constitution"`. This gap already
existed before this build (Idaho's `CST` filer has the identical issue,
confirmed via `officialRoster.test.ts`'s existing Idaho coverage, which
itself asserts the raw `"CST"` value rather than a mapped display name) —
left as-is per "touch only what the pattern requires"; flagged here rather
than silently worked around.

**Not used as a source, deliberately:** Ballotpedia; GoVoteWV.com (hit a
TLS/certificate error mid-session and was not pursued further once the
`sos.wv.gov` Elections Calendar PDF supplied the needed dates directly).

## Contest inventory

West Virginia has **2 US House districts and 1 US Senate contest in 2026**
(Shelley Moore Capito's seat; James C. Justice's seat is a different Senate
class, not on the 2026 ballot). Both House districts + the Senate race are
covered by the general election.

## What was built (delta from the AZ/TX/OK/AL pattern)

All of the AZ/TX/OK/AL vertical slice's infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `races.ts`'s
`lookupChallengers` wiring, `RepCard.tsx`, and the importer's array-shaped
`FIXTURES` map. No new `OfficialBallotStatus` value, no database migration,
no UI/CSS/i18n change (no `runoff_pending` rows exist for this state).

**New / changed for this build:**

- `scripts/congressional-rosters/wv-official-roster-2026.ts` (new) — 4 House
  rows (both districts: major-party nominees) + 4 Senate rows (Wilson-CST
  declared-intent, Anderson-DEM, Capito-REP incumbent, Phillips write-in).
  Full sourcing, methodology, and known limitations are in the file's own
  header docblock.
- `scripts/congressional-rosters/types.ts` — `CST`'s existing comment
  expanded to note West Virginia also uses it (no new party code minted).
- `scripts/ingest/official-roster.ts` — registered `WV` in `FIXTURES` with
  separate house/senate entries, exactly like OK's/AL's two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 10 new tests: `getOfficialRoster`
  narrowing across both WV districts + the Senate contest, explicit
  coverage for Wilson's `declared_general_ballot_intent` status and
  Phillips's `write_in_qualified` status (neither promoted to
  `qualified_for_general_ballot`), `isIncumbentSeekingReelection` for both
  House districts + the Senate seat (all three `true` — no open seats),
  `lookupChallengers` wiring (both chambers covered, FEC query skipped — 2
  calls not 3; per-district challenger rendering; the Senate case confirms
  none of the three non-incumbent challengers carry `isRunoffPending`).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.
  162 test files, 3259 tests passing, 5 pre-existing `todo` (no failures).
- Confirmed the import ran cleanly against staging on two consecutive runs
  with no unique-constraint errors on the null-district Senate rows —
  migration `0016`'s `NULLS NOT DISTINCT` fix is already applied; no new
  migration needed for this build.
- WV's 8 rows (4 House + 4 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, pulled via `vercel env
  pull` and passed inline as `DATABASE_URL` for each command — never the
  ambient `DATABASE_URL`, never sourced/eval'd into the shell), re-imported,
  and confirmed idempotent by a direct row-count query against the table
  (8 both times — 4 house / 4 senate — not just the importer's own
  self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for both WV House
  districts and the Senate race, diffed against the fixture. **0 mismatches
  across all 3 contests.** Full literal output (candidate name, party, and
  provenance as the app would render it):

  ```
  WV-01 — incumbent CAROL MILLER, seekingReelection2026=true
    - VINCE GEORGE (Democrat)

  WV-02 — incumbent RILEY MOORE, seekingReelection2026=true
    - ACE PARSI (Democrat)

  U.S. SENATE — incumbent SHELLEY MOORE CAPITO, seekingReelection2026=true
    - S. MARSHALL WILSON (CST) [declared_general_ballot_intent — petition
      not yet certified]
    - RACHEL FETTY ANDERSON (Democrat)
    - RIO PHILLIPS (write-in, no party)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. `isRunoffPending` was `false` for all three
  Senate challengers, including Wilson — `declared_general_ballot_intent`
  correctly does not map to the runoff-pending CTA, which is reserved
  specifically for `ballotStatus: "runoff_pending"`.

- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline (`process.env.OFFICIAL_ROSTER_ENABLED = "1"` inside a
  throwaway verification script, deleted after use) for the verification
  commands above; it is not set anywhere persistent (not `.env.local`, not
  Vercel, not any committed file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **S. Marshall Wilson's (Constitution, US Senate) petition-signature
  sufficiency has not been certified by the Secretary of State** as of this
  fixture's retrieval date (2026-07-16) — recorded as
  `declared_general_ballot_intent`, an open item flagged for Muxin same as
  prior states' equivalent petition-pending gaps. A re-check after August
  24, 2026 (SoS certified-list transmittal) is warranted — see "Follow-up
  card" below.
- **`CST` is not in `races.ts`'s `PARTY_NAMES` display map** — a
  pre-existing gap from the Idaho build, not introduced or fixed here (see
  "How this was verified" above). A WV Senate delegation response currently
  shows Wilson's party as the raw code `"CST"` rather than "Constitution".
- Names are recorded as they appear in the official candidate portal; not
  independently re-verified against a third document.

## Follow-up card (dated, not-before-date convention per epic `c5a813bb`)

Per the epic's "STANDING REQUIREMENT — NOT BEFORE DATE-GATE CONVENTION"
bullet, a follow-up card should be opened (not started here) to re-check
this fixture after West Virginia's SoS certified-candidate-list
transmittal date:

```
**[P2] Re-check West Virginia official roster after SoS certification (Aug 24, 2026)**
- PARENT: c5a813bb-9223-4dc1-95aa-65637eb6940b
- NOT BEFORE: 2026-08-24
- ORIGIN: 2026-07-16, West Virginia vertical-slice build
  (docs/operations/west-virginia-vertical-slice-data-check.md) — S. Marshall
  Wilson's (Constitution, US Senate) nominating-petition sufficiency was not
  yet certified by the Secretary of State at build time; the SoS transmits
  its certified candidate list to county clerks on the 71st day before the
  election (W. Va. Code § 3-5-18), 2026-08-24.
- OUTCOME: Confirm whether Wilson's petition was certified sufficient; if
  so, promote his fixture row from `declared_general_ballot_intent` to
  `qualified_for_general_ballot` and re-import to staging. Also re-check for
  any late withdrawal (W. Va. Code § 3-5-11(b)(2) deadline was 2026-08-11,
  already past by this card's NOT BEFORE date) or any newly-certified
  write-in filer.
- IN SCOPE: candidates.wvsos.gov re-check only; no other state.
- SAFETY: same posture as the rest of this epic.
- STATUS: Backlog
- DEPENDS ON: none
```

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/west-virginia-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/wv-official-roster-2026.ts`.
- **Official West Virginia source URLs used:**
  - `https://candidates.wvsos.gov/regular` (WVSOS's official 2026 General
    Election "Regular Candidates" listing)
  - `https://candidates.wvsos.gov/write-in` (WVSOS's official 2026 General
    Election "Write-In Candidates" listing)
  - `https://sos.wv.gov/media/467/download` (official 2026 Elections
    Calendar PDF — governing dates)
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a West Virginia source)
  - `https://www.senate.gov/states/WV/intro.htm` (Senate incumbency
    cross-check only)

## GO/NO-GO verdict

**GO on the approach for this state — the simplest build in this pipeline
so far (no runoffs, no open seats, post-primary nominee set already
resolved by the source). NO-GO on flipping the flag for real users or
merging without self-vet, per the epic's standing merge-promptly-after-
self-vet policy.**

What remains before this reaches real users:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   prior state. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **A follow-up update to this fixture is needed after August 24, 2026**,
   once West Virginia's Secretary of State certifies its candidate list —
   see "Follow-up card" above.
