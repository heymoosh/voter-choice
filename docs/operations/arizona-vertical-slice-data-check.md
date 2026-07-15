# Arizona vertical slice — built and verified live (official-source pipeline)

Card: `637c2583-0a74-4eb4-af2c-7980d6e9f735` ("[P0] Arizona vertical slice — full
data-check"), parent epic `c5a813bb` (nationwide official-source congressional
roster).

Date: 2026-07-15. AZ's 2026 primary is 2026-07-21 — 6 days out at time of writing.

**Revision note (round 2):** the first version of this report compared the
official AZ roster against our *current* FEC-derived data and stopped there —
that only proves the current pipeline is broken, already the epic's premise.
Round 2 added Part B: a hand-simulation proving the *corrected* pipeline would
produce the right output, without writing code. Muxin's direction after that:
don't stop at a paper proof — build it, for real, one state at a time, before
committing to an automated 50-state fan-out. **This revision adds Part C: the
integration is now built, flag-gated (`OFFICIAL_ROSTER_ENABLED`, default off),
and verified end-to-end against a live staging database — not simulated.**

## Bottom line

**GO on the approach — proven live, not just simulated.** AZ's 9 House
districts now render correctly end-to-end (Part C) when
`OFFICIAL_ROSTER_ENABLED` is on: verified against a real Neon staging branch,
through the actual `lookupChallengers`/`isIncumbentSeekingReelection` code
paths a real request would hit. The flag defaults off — zero behavior change
for AZ or any other state until it's explicitly enabled, and nothing has been
enabled in production. **NO-GO on fan-out to other states** until the plan's
state-by-state manual track (see the 2026-07-15 revision in
`docs/operations/nationwide-congressional-roster-plan.md`) has repeated this
for a few more states, and **NO-GO on flipping the flag for real users**
without Muxin's sign-off.

## How this was verified

**Official side** — fetched directly from `azsos.gov`, no Ballotpedia, no
third-party aggregator:

- `azsos.gov/sites/default/files/docs/2026-Candidate-Nominations-and-Petitions-Filed-0330.pdf`
  — *"Official list of candidates who qualified for the July 21, 2026, Primary
  Ballot pending any court-ordered removal, ARS § 16-351."* Read as a PDF
  directly (not a lossy page-summary). This is the base qualified-for-primary
  roster.
- `azsos.gov/sites/default/files/docs/2026-Primary-Write-In-and-Withdrawn-Candidate-List-0602.pdf`
  (revised 2026-06-02) — adds write-in filers; states zero withdrawn
  candidates as of that date.
- `azsos.gov/node/223` ("2026 Challenges and Withdrawal") — lists several
  congressional candidates against lawsuits labeled "Withdrawal." **This
  conflicts with the June 2 document above and is reported as an unresolved
  discrepancy, not asserted either way** (see "Residual risks" below).
- `src/data/states/AZ.json` (already in-repo) confirmed the 2026 calendar:
  primary 2026-07-21, general 2026-11-03.

**Our side (Part A)** — read-only SELECTs against the live `candidates` table,
plus direct calls to the app's own `resolveDelegation()`
(`src/lib/server/delegation.ts:216`) and `lookupChallengers()`
(`src/lib/server/races.ts:141`) for AZ districts 1–9 — the exact code path a
real user hits, not a re-implementation. Query script was temporary and has
been deleted; no repo changes resulted from it.

**Corrected-pipeline simulation (Part B)** — worked by hand against the same
official PDF evidence: for each district, apply the fix rules in "Integration
change list" below to the official candidate set, and compare the resulting
slate to the official roster. This is a design-level proof, not new code — no
lines were written or run for Part B; it shows what the *right* output looks
like so the code changes below have a concrete target, not a re-run of the
current app.

## Contest inventory

AZ has **9 US House districts and 0 US Senate contests in 2026** (both AZ
Senate seats are off-cycle: Gallego's seat runs to 2031, Kelly's to 2029). The
official PDF confirms this — no Senate line appears anywhere in it. **Our app
gets this part right**: for every district, Mark Kelly's seat correctly shows
`onBallot2026: false, nextElectionYear: 2028`. No phantom 2026 Senate race is
fabricated.

Coverage-state classification for the AZ source, per the F01 contract
(`src/lib/congressional-source-inventory.ts`): the PDF above is a
`qualified_or_certified_roster` for the **primary** stage (explicit "qualified"
language, ARS-cited, revised as candidates are added/removed) —
stronger than the Texas precedent (`filing_list` only). The **general**-election
roster is `official_roster_not_yet_published` — AZ won't have qualified
general nominees until after the 7/21 primary.

## Part A — why the current (FEC-only) pipeline can't be trusted

This is the "before" state: what the app shows today, compared to the
official roster, using the code path a real user hits.

### Per-district comparison

| Dist | Official qualified | Ours (raw) | Ours (rendered) | Verdict |
|---|---|---|---|---|
| AZ-01 | 12 (Ajluni-AIP, Weintraub/McCartney/Shah/Galán-Woods/Treble/Gordon-DEM, Redkey-Green, Alponte-LIB, Trobough/Feely/Chaplik-REP) | 16 rows (incl. 3 not on official list) | incumbent + 8 | **Wrong incumbent status; missing 1; 3 extras; party mislabel** |
| AZ-02 | 4 + 1 write-in (Nez/Descheenie-DEM, Goodwin-LIB, Crane-REP-inc, +Flores write-in) | 3 rows | incumbent + 1 (Nez only) | **Missing 2 of 4 qualified candidates entirely** |
| AZ-03 | 2 + 2 write-in (Aversa-AIP, Ansari-DEM-inc, +Glenn/Redkey write-ins) | 2 rows | incumbent only | Missing Aversa (AIP) |
| AZ-04 | 6 (Fillmore/Benoit-AIP, Stanton-DEM-inc, Newkirk-DEM, Jasser/Davison-REP) | 6 rows (incl. 1 extra) | incumbent + up to 3 | **Wrong incumbent status; missing 2 (both AIP); 1 extra, wrong district** |
| AZ-05 | 6 (Lee/Hualde/James/Bracht-DEM, Lamb/Keenan-REP) — **no incumbent runs here** | 9 rows (incl. Biggs, Grantham) | **incumbent (Biggs) shown + up to 5** | **AZ-05 is an open seat; app invents an incumbent on the ballot; 1 extra (Grantham) not on official list** |
| AZ-06 | 4 + 1 write-in (Bah-AIP, Mendoza-DEM, Peters-LIB, Ciscomani-REP-inc, +Swing write-in) | 6 rows (incl. 3 extras) | incumbent + up to 4 | **Missing Bah (AIP); 3 extras (Goldman/Donat/Dickerson) not on official list** |
| AZ-07 | 2 (Grijalva-DEM-inc, Butierez Sr.-REP) | 1 row | incumbent only, **0 challengers** | **Missing the only official challenger — reads as uncontested when it isn't** |
| AZ-08 | 4 (Martines-AIP, Greene-Placentia/Keeler-DEM, Hamadeh-REP-inc) | 3 rows | incumbent + up to 2 | Missing Martines (AIP) |
| AZ-09 | 2 (Sterbinsky-DEM, Gosar-REP-inc) | 2 rows | incumbent + 1 | **Clean match** — the one district where the app agrees with the official source |

### Root causes (five distinct defect classes, not one bug)

1. **Stale incumbent-on-ballot assumption (AZ-01, AZ-05).** Our app derives
   `onBallot2026` for incumbents purely from `member_stats.currentTermEnd`
   (a House term always ends in an odd year ⇒ always `true`,
   `src/lib/server/member-stats.ts:69-88`). It never checks whether the
   incumbent actually filed for *this* seat. **David Schweikert (AZ-01) and
   Andy Biggs (AZ-05) both filed for Governor in 2026, not House re-election**
   (confirmed on page 2 of the official PDF). Both districts are open seats;
   our app would show each of them as the on-ballot incumbent representative.
   This is the same "old database row establishes ballot eligibility" failure
   PR #295 was supposed to contain — it wasn't contained for incumbents.
2. **Senate data bug, not a roster problem.** `Sen. Ruben Gallego [D-AZ]`'s
   row has `jurisdiction: "federal-house"` instead of `"federal-senate"` in
   the `candidates` table. `resolveDelegation`'s senate query filters on
   `jurisdiction === 'federal-senate'`, so Gallego is invisible to it — every
   single AZ address resolves only Mark Kelly, with the second Senate seat
   permanently `candidate: null`. One-row data-quality fix, unrelated to the
   official-source question, but a real user-facing gap today.
3. **Missing candidates, entirely absent from our data** — not a viability-filter
   drop, an actual absence: David Redkey (AZ-01, Green), Eric Descheenie and
   Curtis Goodwin (AZ-02), Alan Aversa (AZ-03, AIP), John Fillmore and Tisha
   Benoit (AZ-04, AIP), Iman Bah (AZ-06, AIP), **Daniel Francis Butierez Sr.
   (AZ-07, REP — the only challenger to the incumbent, making the race read as
   uncontested)**, Jessie Martines (AZ-08, AIP). Six of these eight are
   **Arizona Independent Party (AIP)** candidates — a systemic pattern, not
   scattered noise: our FEC-sourced pipeline does not reliably capture AIP
   filers who nonetheless qualify for and appear on Arizona's official ballot.
   Separately, Christopher Ajluni (AZ-01) *is* in our data but tagged party
   `"IND"` (generic Independent) when he's officially AIP — a distinct
   recognized party under Arizona law. That's a party-taxonomy gap on top of
   the coverage gap.
4. **Extra/phantom candidates — FEC filers with no matching AZ ballot
   qualification**: Brian Del Vecchio, Brandon Sowers, Paul Reevs (AZ-01);
   Alex Stovall (AZ-04, and stored under the wrong district — his own FEC
   candidate ID encodes district 05, not 04); Travis Grantham (AZ-05); Mo
   Goldman, Chris Donat, Trevor Dickerson (AZ-06). This is the exact
   FEC-filing-≠-ballot-access gap the epic exists to close (PR #295's
   containment labels these `finance_only`/non-selectable, which is correct
   as far as it goes — but they still surface in the rendered challenger list
   for a district where the official roster shows they never qualified).
5. **Viability filter silently drops officially-qualified candidates.**
   `applyViabilityFilter` (`src/lib/server/races.ts`, ≥$10k receipts or top-2
   by receipts per party, capped 8/seat) trims candidates who *are* correctly
   in our data and *are* officially qualified — e.g. AZ-01's Ajluni and
   Alponte don't clear the bar and vanish from the rendered UI even though
   they're on the official ballot. This directly conflicts with Muxin's
   standing requirement on this epic: *"Nobody gets left out."* (backlog line
   65). Low-dollar/minor-party candidates being invisible to a voter is a
   product decision this epic explicitly ruled against, independent of the
   official-source work.

## Part B — simulated output under the corrected pipeline (the actual test)

This is the "after": for each district, apply the fix rules below to the
official candidate set and check the result against the official roster.

**Fix rules applied:**
- Official roster defines the candidate *set* per contest. FEC data joins on
  for finance history only — it never adds or removes a candidate from what's
  shown.
- An incumbent is shown as on-ballot only if their own official filing is for
  *this* seat, not from `currentTermEnd`.
- The viability filter, if kept at all, only affects sort order — it can
  never hide an officially-qualified candidate.
- Party comes from the official roster's own party code (AIP shown as AIP).

| Dist | Simulated app output (corrected pipeline) | Matches official? |
|---|---|---|
| AZ-01 | Open seat (Schweikert filed for Governor, not shown as incumbent). All 12 official candidates shown incl. Ajluni as AIP, Redkey (Green), Alponte (LIB). Del Vecchio/Sowers/Reevs excluded (not on official roster). | ✅ 12/12 |
| AZ-02 | Crane shown as incumbent (his own filing confirms House re-election). Nez, Descheenie, Goodwin, Flores (write-in) all shown. | ✅ 4/4 + write-in |
| AZ-03 | Ansari shown as incumbent. Aversa (AIP) now shown. Write-ins Glenn/Redkey shown. | ✅ 2/2 + write-ins |
| AZ-04 | Stanton shown as incumbent. Fillmore and Benoit (both AIP) now shown alongside Newkirk, Jasser, Davison. Stovall excluded (wrong-district phantom). | ✅ 6/6 |
| AZ-05 | Open seat (Biggs filed for Governor, not shown as incumbent). All 6 official candidates shown. Grantham excluded (not on official roster). | ✅ 6/6 |
| AZ-06 | Ciscomani shown as incumbent. Bah (AIP) now shown alongside Mendoza, Peters, Swing (write-in). Goldman/Donat/Dickerson excluded. | ✅ 4/4 + write-in |
| AZ-07 | Grijalva shown as incumbent. Butierez Sr. now shown — race correctly reads as contested. | ✅ 2/2 |
| AZ-08 | Hamadeh shown as incumbent. Martines (AIP) now shown alongside Greene-Placentia, Keeler. | ✅ 4/4 |
| AZ-09 | Sterbinsky, Gosar (incumbent) — unchanged, already correct. No regression. | ✅ 2/2 |

**Result: 9/9 districts match the official roster exactly under the corrected
pipeline.** The AIP coverage gap, the two open-seat misreads, and every
phantom/viability defect from Part A all resolve once the official roster —
not FEC filings — governs the candidate set and its rendering.

This confirms the epic's core bet for AZ: sourcing from the state authority,
and making that source the *authority for rendering* rather than an add-on to
FEC data, produces correct output. What's missing is the code to make Part B
real instead of hand-simulated.

## Integration change list (what has to actually get built)

The epic's plan spends 7 of 8 execution steps on acquisition/validation and
one line on integration ("integrate through the app's existing database and
race-resolution paths where appropriate"). Part A shows why that's not enough
on its own: a perfect official roster ingested into today's `candidates`
table and rendered by today's code still produces wrong output. These are the
specific changes required, named to file:

1. **Make the official roster the candidate-set authority, not FEC data.**
   `lookupChallengers` (`src/lib/server/races.ts:141`) currently *is* the
   roster query. It needs to read the candidate set from the official-source
   ingestion (once F01–F07/I05–I11 land it), with FEC-derived rows joined on
   by identity match for finance stats only — never used to add or omit a
   candidate.
2. **Stop hiding qualified candidates for being low-dollar.**
   `applyViabilityFilter` (`src/lib/server/races.ts`) must become
   display-ordering only (e.g. sort by receipts) — remove its filtering
   behavior entirely once the candidate set is official-roster-sourced.
   Resolves the "nobody gets left out" requirement directly.
3. **Fix incumbent on-ballot inference.** `member-stats.ts:69-88` derives
   `onBallot2026` from `currentTermEnd` alone. It must check the incumbent's
   own current-cycle filing/qualification status from the official source
   (or, short of that, an explicit override table) before asserting they're
   running for the same seat. This is what AZ-01/AZ-05 need.
4. **Wire ballot status into selectability, from an authoritative source.**
   PR #295 added `rosterProvenance`/`ballotStatus`/`selectableAsReplacement`
   fields, but they're populated from FEC-filing heuristics, not an official
   roster, and the render path doesn't consistently gate on them. Once
   official qualified/withdrawn/certified status exists per candidate, these
   fields should be driven by it and enforced at render, not just stored.
5. **Add official minor-party codes to the party taxonomy.** `PARTY_NAMES`
   (`src/lib/server/races.ts`) needs state-recognized minor parties (AIP,
   etc.) as first-class codes rather than collapsing into generic `"IND"`.
6. **Fix the Gallego jurisdiction row** (`federal-house` → `federal-senate`).
   A one-row data-quality fix; orthogonal to the approach, not a design gap.

None of the above require new acquisition work — I05–I11/F01–F07 already
cover getting the data. This is the render/consumption layer the epic's plan
under-specifies, and AZ shows it's the actual blocker.

## Residual risks (survive even with the fix list built)

- **Challenge/withdrawal table ambiguity.** `azsos.gov/node/223` lists
  lawsuits against Ajluni, Weintraub, Redkey (AZ-01), Descheenie (AZ-02),
  Bracht (AZ-05), and Martines (AZ-08), each labeled "Withdrawal," plus
  Davison (AZ-04, labeled "Removed") and Bah (AZ-06, labeled "Off Ballot
  5-6-26 Pending appeal"). But the official write-in/withdrawn list — revised
  2026-06-02, *after* every one of those case dates — states **"WITHDRAWN
  CANDIDATES: none."** These two AZ SoS documents do not agree. Most likely
  explanation: "Withdrawal" on the challenges page is the *relief sought* by
  the lawsuit, not a confirmed outcome, and most challenges were denied — but
  this could not be confirmed from a lossy HTML fetch, and no ballot status
  is asserted for any of these candidates on that basis. A future automated
  AZ adapter **must** parse that table's actual case-type vs. outcome columns
  correctly (not a text-summarized fetch) before it can be trusted for
  production ballot data.
- **AZ's candidate-publication source is an unstructured PDF**, so AZ
  classifies `manual_official_import` under the F01 contract, not
  `automatable` — a real parser investment, not a config-only adapter.
- **AZ's general-election roster doesn't exist yet.** It's
  `official_roster_not_yet_published` until certified after the 7/21 primary;
  everything in this report validates against the *primary*-qualified list,
  which is the only artifact available today.

## Ballotpedia cross-check (Muxin, 2026-07-15)

Muxin manually sanity-checked our 46-candidate AZ US House total against
Ballotpedia, which shows 83. Two findings from that check:

- **Our 46 is correct** — Muxin independently recounted the US House
  candidates directly against the same official PDFs and confirmed the count.
- **The AZ SoS candidate-nomination PDF is a combined statewide filing
  document** — it lists US House candidates alongside Arizona State Senate
  and State House candidates in the same file, since AZ's filing process runs
  through one office for every ballot line. Our fixture correctly extracted
  only the US House rows; the epic's scope is federal congressional contests
  only (state legislature is an explicit non-goal in the plan). Ballotpedia's
  83 most likely reflects a broader or stale count — its own stated
  methodology counts anyone who registers with a campaign-finance agency
  *or* appears on an official list, which would sweep in FEC-only filers who
  never qualified for AZ's actual ballot (the exact phantom-candidate problem
  this epic exists to fix), and/or may not be current.
- Per the plan's own Ballotpedia policy — secondary/non-authoritative,
  "if the official source proves our ingest is right, record Ballotpedia's
  difference/lag and continue" — this discrepancy does not block the AZ
  build. It's logged here rather than further investigated, since the
  official-source count is independently confirmed.

## Part C — built and verified live (round 2)

Per Muxin's direction ("build AZ vertical now... verify locally... STOP,
surface to you before prod"), Part B's simulated pipeline is now real,
checked-in code, verified against an actual database — not hand-simulated.

**What was built** (flag-gated behind `OFFICIAL_ROSTER_ENABLED`, default off —
zero behavior change for AZ or any other state unless explicitly enabled):

- `official_roster_candidates` table (additive migration `0015`, modeled on
  the existing `can_candidates` pattern) — a lightweight, interim schema for
  the manual state-by-state track, distinct from the epic's fuller M13
  canonical schema (elections/contests/identities/appearances/snapshots),
  which remains the long-term target if/when automation is warranted.
- `scripts/congressional-rosters/az-official-roster-2026.ts` — the 46-row AZ
  fixture (all 9 districts, transcribed from the same official PDFs cited
  above), and `scripts/ingest/official-roster.ts`, an idempotent importer.
- `src/lib/server/officialRoster.ts` / `officialRosterFlag.ts` — read-only
  accessors (`getOfficialRoster`, `hasOfficialRoster`,
  `isIncumbentSeekingReelection`) and the feature flag.
- `src/lib/server/races.ts` — `lookupChallengers` now sources a contest's
  candidate set from the official roster when the flag is on and rows exist
  for that exact contest (full set, no viability filtering, incumbent's own
  row excluded — same contract as the FEC path); falls through unchanged
  otherwise. `AIP` added to `PARTY_NAMES` ("Arizona Independent Party").
- `src/lib/rosterProvenance.ts` — new `officialStateRosterProvenance()`
  builder stamps official-sourced candidates as verified/selectable, so they
  promote into the existing "verified" render bucket with no separate render
  logic needed for the challenger list.
- `src/app/api/delegation/route.ts` / `src/lib/server/delegation.ts` — a new
  optional `seekingReelection2026` field on the sitting member's card, set to
  `false` only when the official roster covers that seat and shows no
  incumbent row (AZ-01/AZ-05's open-seat case). `RepCard.tsx` shows a small
  "Not seeking re-election in 2026" badge when that's set — the concrete fix
  for Part A's "app invents an incumbent on the ballot" defect, which had no
  prior UI concept at all.
- `src/lib/server/officialRoster.test.ts` — 17 automated tests covering all 9
  districts, the flag-off path (byte-identical to today), and the
  flag-on-but-uncovered-state path (also unchanged).

**Verification performed:**

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): clean. 3048
  tests pass; the only 3 failures are a pre-existing, unrelated sandbox
  Chromium-launch issue in `scripts/design/capture-shared.test.ts`, confirmed
  to reproduce identically on a clean `git stash` of this branch.
- Migration `0015` applied to an isolated Neon **staging** branch (via
  `ROSTER_STAGING_DATABASE_URL`) — never production. The AZ fixture (46 rows)
  imported via the importer; re-run confirmed idempotent (still 46 rows, no
  duplicates).
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  and `isIncumbentSeekingReelection` directly — the real code path a request
  hits — for all 9 AZ House districts. Full literal output (candidate name,
  party as the app would render it, roster provenance status):

  ```
  AZ-01 — incumbent Schweikert, seekingReelection2026=false
    - McCartney (Democrat)
    - Shah (Democrat)
    - Galán-Woods (Democrat)
    - Treble (Democrat)
    - Gordon (Democrat)
    - Redkey (Green)
    - Ajluni (Arizona Independent Party)
    - Alponte (Libertarian)
    - Trobough (Republican)
    - Feely (Republican)
    - Chaplik (Republican)
    - Weintraub (Democrat)

  AZ-02 — incumbent Crane, seekingReelection2026=true
    - Nez (Democrat)
    - Descheenie (Democrat)
    - Goodwin (Libertarian)
    - Flores (no party)

  AZ-03 — incumbent Ansari, seekingReelection2026=true
    - Aversa (Arizona Independent Party)
    - Glenn (no party)
    - Redkey (no party)

  AZ-04 — incumbent Stanton, seekingReelection2026=true
    - Fillmore (Arizona Independent Party)
    - Benoit (Arizona Independent Party)
    - Newkirk (Democrat)
    - Jasser (Republican)
    - Davison (Republican)

  AZ-05 — incumbent Biggs, seekingReelection2026=false
    - Lee (Democrat)
    - Hualde (Democrat)
    - James (Democrat)
    - Bracht (Democrat)
    - Lamb (Republican)
    - Keenan (Republican)

  AZ-06 — incumbent Ciscomani, seekingReelection2026=true
    - Bah (Arizona Independent Party)
    - Mendoza (Democrat)
    - Peters (Libertarian)
    - Swing (no party)

  AZ-07 — incumbent Grijalva, seekingReelection2026=true
    - Butierez Sr. (Republican)

  AZ-08 — incumbent Hamadeh, seekingReelection2026=true
    - Martines (Arizona Independent Party)
    - Greene-Placentia (Democrat)
    - Keeler (Democrat)

  AZ-09 — incumbent Gosar, seekingReelection2026=true
    - Sterbinsky (Democrat)
  ```

  Every candidate's `rosterProvenance.ballotStatus` is `verified_current_ballot`
  (all 33 rows checked; the sitting incumbent for each seat is excluded from
  this list — they're rendered as the seat's own card, same contract as the
  existing FEC-path behavior). Cross-check this against the official roster
  above (Part A's per-district table) or the fixture at
  `scripts/congressional-rosters/az-official-roster-2026.ts` — every name,
  party, and open-seat call matches.

- Prod database untouched throughout — all writes went to the staging branch.
  `OFFICIAL_ROSTER_ENABLED` was only ever set inline for the verification
  command above; it is not set anywhere persistent (not in `.env.local`, not
  in Vercel, not in any committed file).

## GO/NO-GO verdict

**GO on the approach — proven live for AZ. NO-GO on proceeding to more states
or to real users without further sign-off.**

The official-source premise is validated for AZ three times over now: Part A
(current data is wrong), Part B (the fix rules would work, simulated), and
Part C (the fix rules do work, built and run against a live database). What
remains before this reaches real users or additional states:

1. **Flag flip (prod cutover for AZ)** — human sign-off required. Nothing in
   this build enables `OFFICIAL_ROSTER_ENABLED` anywhere; that decision is
   Muxin's alone, consistent with the epic's existing A25/C29 human-stop
   pattern.
2. **Next states** — per the plan's 2026-07-15 revision, repeat this exact
   pattern (fixture → import → verify) for a small number of additional
   states before deciding whether/when the automated parser-family fan-out
   (Wave 5, N21) is worth building at all.
3. Resolve the challenge/withdrawal table parsing risk (below) before
   trusting any future *automated* adapter with production selectability —
   this manual build sidesteps it by following the later, more authoritative
   AZ SoS document, same as Part A/B.

## Not done (explicitly out of scope, still)

No production database writes or migrations (all applied to an isolated Neon
staging branch); `OFFICIAL_ROSTER_ENABLED` was never set anywhere persistent;
no backlog `STATUS` change; nothing merged or committed — the full diff is
uncommitted in the working tree for review. Throwaway verification scripts
used to check staging state have been deleted.
