# South Dakota vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: South Dakota (SD)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Same
authorized scope as the AZ/TX/OK/AL/AK/.../MO cards already built through
this manual track.

Date: 2026-07-16. South Dakota's 2026 primary (2026-06-02) is already
certified. The general election is 2026-11-03.

## Bottom line

**GO on the approach.** South Dakota's single at-large US House seat and the
US Senate (Class II) race both render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — **0 mismatches
across both contests**.

**South Dakota is not Civix-vended.** Its official candidate source is the
Secretary of State's own "VIP" portal (`vip.sdsos.gov`), an ASP.NET/Telerik
RadGrid data grid — no `.civixapps.com` subdomain, no "POWERED BY
gocivix.com" footer. Unlike the Civix portals documented in the plan doc's
Civix playbook, this grid does **not** 403 a non-browser fetch: `WebFetch`
reads its rendered candidate table directly, no browser automation needed —
the operationally easiest source of the states built so far.

**Both federal contests already have determined nominees** — SD's June 2,
2026 primary is certified, so no `runoff_pending` row is needed for either
seat.

**A real, non-obvious open-seat finding surfaced during the official
cross-check:** South Dakota's sitting US Representative, Dusty Johnson (R),
did **not** file for re-election to his House seat — he is running for
Governor instead. Neither general-ballot filer (Marty Jackley, Nicole
"Nikki" Gronli) is the incumbent, making the House race a genuine open seat.
See "A cross-check finding" below.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every other state in this track.

## How this was verified — a directly-fetchable SoS grid, no browser
automation needed

South Dakota's official candidate source is the Secretary of State's "VIP"
portal, at:

1. **General-election candidate list (nominees, source of record):**
   `https://vip.sdsos.gov/candidatelist.aspx?eid=774` — "2026 General
   Election Candidate List." A dynamic ASP.NET/Telerik data grid (sortable
   columns, column-filter operators, pagination — 703 total candidate rows
   across every office on the 2026 ballot), but unlike Civix's Angular SPA,
   `WebFetch` reads its rendered table directly in one call — no 403, no
   virtualized-scroll workaround, no per-office filter form required to get
   at the US Senate and US House rows.
2. **Primary candidate list (provenance only):**
   `https://vip.sdsos.gov/candidatelist.aspx?eid=773` — "2026 Primary
   Election Candidate List," dated 6/2/2026. Confirms Mike Rounds (R) beat
   Justin McNeal (R) for the Senate nomination and Marty Jackley (R) beat
   James Bialota (R) for the House nomination — cross-checked against
   public reporting (South Dakota News Watch's primary-night coverage:
   Jackley won 79.2% of the primary vote) for an independent sanity check on
   the primary outcome, not used as a roster source itself.
3. **Incumbency cross-check**, never guessed from the candidate-list portal
   or this app's own FEC-derived `candidates` table: South Dakota's own
   current-elected-officials page,
   `https://sdsos.gov/elections-voting/election-resources/current-elected-officials.aspx`
   — a document separate from the candidate-list portal — lists "Mike
   Rounds (R) — term expires 2027" (confirming the Class II Senate seat is
   up in 2026 and Rounds is the incumbent seeking re-election) and "Dustin
   'Dusty' Johnson (R)" as the sitting Representative (confirming he is not
   a candidate on either the primary or general House list — i.e., the
   House seat is genuinely open, not a transcription gap).

**Independent/write-in candidates:** Brian L. Bengs filed for US Senate with
the party label "Independent" printed directly on the SoS's own candidate
list — recorded as party code `IND`, an existing code (no new state-specific
party code was needed, unlike AZ's AIP or AK's AKP). No write-in filers
appear on the general-election list.

**Not used as a source, deliberately:** Ballotpedia (cross-check/spot-check
context only, e.g. confirming the primary-night vote share); this app's own
FEC-derived `candidates` table (never used for incumbency).

## A cross-check finding this build made (not a bug — a real, non-obvious
open-seat fact caught by the independent-source rule)

The card's own ORIGIN note gave no specific expectation about incumbency for
South Dakota's House seat. The official cross-check (never skipped, per the
epic's SAFETY rule against guessing incumbency) surfaced that Dusty Johnson,
South Dakota's sitting at-large Representative, did **not** file for
re-election — he is running for Governor in 2026 instead (South Dakota's
2026 gubernatorial primary went to a July 28, 2026 runoff, per public
reporting, since incumbent Governor Larry Rhoden did not clear 35% in the
first round — a separate, state-office race, out of scope for this federal
roster but explaining why Johnson is on neither list). Neither Marty Jackley
nor Nicole "Nikki" Gronli is the incumbent, so the House race is a genuine
open seat with `isIncumbent: false` on both rows. Had this build relied on
an assumption that the sitting member always runs for re-election, it would
have silently guessed at an incumbency signal that does not exist this
cycle — exactly why the independent cross-check rule exists.

## Contest inventory

South Dakota has **1 at-large US House seat and 1 US Senate contest
(Class II) in 2026.** Both are covered by the general election, both already
have a determined nominee/filer set.

## What was built (delta from the AZ/TX/OK pattern)

All of the existing vertical-slice infrastructure is state-agnostic and
required **no changes**: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, and the importer's
array-shaped `FIXTURES` map. No new `OfficialBallotStatus` value or party
code was needed.

**New / changed for this build:**

- `scripts/congressional-rosters/sd-official-roster-2026.ts` (new) — 2
  House rows (at-large, district `"00"`, both `isIncumbent: false` — open
  seat) + 3 Senate rows (Rounds-R incumbent, Beaudion-D, Bengs-Independent).
  Full sourcing, methodology, and known limitations are in the file's own
  header docblock.
- `scripts/ingest/official-roster.ts` — registered `SD` in `FIXTURES` with
  separate house/senate entries, mirroring the existing two-chamber
  registration pattern (e.g. OK, AK, MO's Senate-covered peers).
- `src/lib/server/officialRoster.test.ts` — 7 new tests across three
  `describe` blocks: `getOfficialRoster` narrowing (at-large district key
  `"00"`, the 3-row Senate contest, and confirming every row is
  `qualified_for_general_ballot`), `isIncumbentSeekingReelection` (false for
  the open House seat, true for Rounds' Senate seat), and `lookupChallengers`
  wiring (both chambers covered so the FEC query is skipped — 2 calls, not
  3; both House filers render as challengers since neither is an incumbent;
  Rounds is excluded from the Senate challenger list while Beaudion and
  Bengs render with correctly mapped party names).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.
  162 test files, 3257 tests passing, 5 pre-existing `todo` (no failures).
  The only test-run failures encountered were 3 pre-existing, unrelated
  `scripts/design/capture-shared.test.ts` cases that fail solely from a
  local sandbox blocking headless-Chromium process launch (`Permission
  denied` on `bootstrap_check_in`) — confirmed unrelated by (a) `git diff`
  showing zero changes to that file on this branch, and (b) the same file
  passing cleanly (3/3) when re-run with the sandbox restriction lifted.
- Confirmed staging already has migration `0016`'s `NULLS NOT DISTINCT` fix
  applied to `official_roster_candidates_seat_name_uidx` (inspecting
  `db/schema.ts:142-178`) — no new migration was needed for this build.
- SD's 5 rows (2 House + 3 Senate) imported to the isolated Neon **staging**
  branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the ambient
  `DATABASE_URL`), re-imported, and confirmed idempotent by a direct
  row-count query against `official_roster_candidates` (5 rows both times —
  not just the importer's own self-reported count).
- **End-to-end check against staging, flag on:** called `lookupChallengers("SD", 0, 2026)`
  directly — the real code path a request hits. **0 mismatches across both
  contests.** Full literal output (candidate name, party, and provenance as
  the app would render it):

  ```
  SD-AT-LARGE (House) — open seat (Dusty Johnson did not file for re-election)
    - Marty Jackley (Republican)
    - Nicole "Nikki" Gronli (Democrat)

  U.S. SENATE (Class II) — incumbent Mike Rounds, seekingReelection2026=true
    - Julian Beaudion (Democrat)
    - Brian L. Bengs (Independent)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Rounds (the incumbent) is correctly excluded
  from the Senate challenger list; both House filers render since neither is
  an incumbent.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **No Libertarian, Green, or minor-party candidate filed for either federal
  seat this cycle** — verified absent from the general-election candidate
  list (703 total rows spanning every 2026 SD office), not omitted.
- **The candidate-withdrawal deadline (August 4, 2026, 5:00 PM local time)
  is still in the future** as of this build — a nominated candidate could
  still withdraw before the general election, which would remove a
  candidate already recorded `qualified_for_general_ballot` rather than
  resolve an undetermined one. See the governing calendar dates below and
  the accompanying dated follow-up card.
- Names are recorded as they appear on the official SoS candidate list; not
  independently re-verified against a third document beyond the
  cross-checks described above.

## Governing calendar dates (per the plan doc's standing requirement, item
(e))

All dates below are from South Dakota's own official 2026 election calendar
(`https://sdsos.gov/elections-voting/assets/2026%20Documents/2026ElectionCALENDAR.pdf`)
and the SoS's candidate-withdrawal-information page
(`https://sdsos.gov/elections-voting/upcoming-elections/general-information/2026/2026-candidate-withdrawal-info.aspx`),
confirmed 2026-07-16:

- **April 2, 2026, 5:00 PM** — deadline to withdraw from the June 2, 2026
  primary election. Already past; does not affect this fixture's general-
  ballot rows.
- **June 2, 2026** — primary election date. Already certified (source of
  this fixture's determined nominees).
- **August 4, 2026, 5:00 PM** — deadline to withdraw from the November 3,
  2026 general election. **Still in the future.** A nominated candidate
  withdrawing before this date would remove them from the roster — a
  materially different risk than an undetermined nomination (per the plan
  doc's AK/DE-derived standing note), since it un-does an already-determined
  row rather than resolving one still open.
- **August 11, 2026, 5:00 PM** — deadline for a party's central committee to
  fill a vacancy (e.g., one created by an August 4 withdrawal).
- **November 3, 2026** — general election date.

**Dated follow-up card opened** (per the epic's "NOT BEFORE DATE-GATE
CONVENTION," `c5a813bb`) to re-check for any withdrawal or committee-filled
vacancy once both windows above have closed — see
`docs/operations/voter-choice-backlog.md`, card "[P2] Re-check South Dakota
official roster for withdrawal/vacancy", `NOT BEFORE: 2026-08-12`.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/south-dakota-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/sd-official-roster-2026.ts`.
- **Official South Dakota source URLs used:**
  - `https://vip.sdsos.gov/candidatelist.aspx?eid=774` (SoS VIP portal —
    2026 General Election Candidate List; source of record for this
    fixture's rows)
  - `https://vip.sdsos.gov/candidatelist.aspx?eid=773` (SoS VIP portal —
    2026 Primary Election Candidate List; provenance only)
  - `https://sdsos.gov/elections-voting/election-resources/current-elected-officials.aspx`
    (incumbency cross-check — the source of the Dusty Johnson open-seat
    finding above)
  - `https://sdsos.gov/elections-voting/assets/2026%20Documents/2026ElectionCALENDAR.pdf`
    and
    `https://sdsos.gov/elections-voting/upcoming-elections/general-information/2026/2026-candidate-withdrawal-info.aspx`
    (governing calendar dates)

## GO/NO-GO verdict

**GO on the approach — South Dakota's official source is the operationally
easiest of the states built so far (a directly-fetchable, non-Civix SoS
grid), and both federal contests verify with 0 mismatches end-to-end.
NO-GO on flipping the flag for real users without further sign-off.**

What remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for SD or any other built state)** — human
   sign-off required, same as every other state in this track. Nothing in
   this build enables `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A follow-up check is needed on/after August 12, 2026** — see the dated
   follow-up card above — to confirm no candidate withdrew and no vacancy
   was filled before the general-election ballot locks.
