# Arkansas vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Arkansas (AR)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Sixth state
built through this pipeline, after Arizona, Texas, Oklahoma, Alabama, and
Alaska.

Date: 2026-07-15. Arkansas's 2026 preferential primary (March 3, 2026) and
primary runoff (March 31, 2026) had **already occurred** by this build's
retrieval date. The general election is November 3, 2026.

## Bottom line

**GO — code, fixture, tests, staging import, and end-to-end verification are
all complete.** `npm run check` passes (162 test files, 3101 tests, 5
pre-existing `todo`, 0 failures). All 4 US House districts and the 2026 US
Senate race are covered. The importer ran twice against the isolated staging
Neon branch (13 rows both times — 10 House + 3 Senate, confirmed by direct
row-count query, not just the importer's own log line) and the real
`lookupChallengers`/`isIncumbentSeekingReelection` code path was called
directly against staging with `OFFICIAL_ROSTER_ENABLED=1` — **0 mismatches**
across all 5 contests. See "Verification performed" below for the full
output.

**Arkansas's official candidate source is NOT Civix-vended.**
`candidates.arkansas.gov` is a WordPress site (Elementor page builder +
wpDataTables + a custom "metl" plugin) with a server-processed "Search
Candidate Filings" form backed by a DataTables-protocol REST endpoint
(`/wp-json/metl/v1/all`) — confirmed by inspecting the page's loaded scripts
and network requests, not assumed from any prior state's pattern.

**Because Arkansas's primary and runoff had already happened, the filings
portal already reflects the post-primary nominee roster, not raw filings** —
a materially different situation from AL's and OK's builds, where the
primary was either still pending or the results portal had to be queried
separately. This was confirmed, not assumed: the full unfiltered
candidates.arkansas.gov table (195 rows, all offices) was cross-checked
against the official March 3, 2026 primary election-night results
(`enr.totalresults.com`, Federal category) — every primary loser (GOP Senate
runners-up Micah Ashby and Jeb Little, GOP AR-2 runner-up Chase McDowell) was
confirmed absent from the filings table, and every primary winner present.
The March 31 runoff's own "Federal" category filter returned zero contests,
confirming no federal race needed it (every contested federal primary was
won by an outright majority: Cotton 82%, Hill 77%, Jones 93%, Shoffner 78%,
Russell 53%).

**No `runoff_pending` rows in this fixture** — unlike AL and OK, every
Arkansas federal nomination is determined. All four House incumbents
(Crawford, Hill, Womack, Westerman) and the sitting Class II senator (Cotton)
filed for re-election and are on the general-election roster.

## How this was verified — operational-navigation write-up

**Site structure.** `https://candidates.arkansas.gov/` presents a "Search
Candidate Filings" form (Candidate Name / Position / PartyAffiliation) over a
results table, labeled "2026 Preferential Primary and Nonpartisan Judicial
General Election." The Position/Office field is a **plain text input, not a
dropdown, and matches EXACTLY** — typing "United States" against the actual
stored value "U.S. Senate" / "U.S. Congress District 0N" returns "No data
available in table" every time; this cost real time until the exact string
was recovered by inspecting the underlying data directly rather than guessing
more query variants.

**Recovering the exact filter values and the full dataset.** Submitting the
form with all fields blank does NOT return "all records" — it also returns
"No data available in table." The actual mechanism: this table is a
DataTables instance (`window.jQuery('#metl-2941-resultTable').DataTable()`)
wired to a REST endpoint at `/wp-json/metl/v1/all`, driven by an in-page
`getData()` closure not accessible from outside. Rather than reverse-
engineering the endpoint's query-string contract, the DataTables client API
itself was driven directly from the browser console
(`mcp__claude-in-chrome__javascript_tool`): `dt.page.len(100).draw()` +
`dt.page('next').draw('page')` paged through all **195 total filings**
(confirmed via `dt.page.info().recordsTotal`), which were then filtered
client-side (`r.Descript.startsWith("U.S.")`) to recover the 13 federal rows
and their exact `Descript` values — "U.S. Senate", "U.S. Congress District
01" through "04" — the values that should have been typed into the
Position/Office filter from the start.

**Cross-checking against the primary results, to confirm the filings table
was already post-primary.** `https://enr.totalresults.com/arkansas/` is a
separate election-night-reporting vendor (not Civix, not the same system as
the SoS's candidate-filings site). Its hamburger menu's "Past Elections" list
switches between the state's 2026 elections (Special Primary, 2026
Preferential Primary [03/03/2026], 2026 Primary Runoff [03/31/2026], etc.);
selecting an election and filtering the "Federal" category shows every
contested federal primary's certified vote totals candidate-by-candidate.
This is what confirmed both (a) the candidates.arkansas.gov table already
excludes primary losers, and (b) no federal race went to the March 31 runoff.

**Independent candidates.** The 2026 Election Calendar
(`sos.arkansas.gov/uploads/elections/2026_Election_Calendar_Rev._6-2025_.pdf`)
sets the deadline for independent (no-party) candidates to file petitions for
federal office at **May 1, 2026** — already past as of this build's
retrieval date (2026-07-15). The candidates.arkansas.gov federal roster (13
rows) contains zero `PartyAffiliation: "Independent"` entries for any US
House or US Senate race, even though "Independent" is a valid value in that
field's dropdown elsewhere on the site. A secondary source (Talk Business &
Politics, an archived candidate list dated 2025-11-14) named a "Jason Gaines
(I)" as an AR-1 independent filer; he is verified ABSENT from the official
post-deadline roster — checked directly, not assumed omitted by
transcription — consistent with a petition that was filed but never
certified with sufficient signatures. Not guessed onto this fixture.

**Libertarian Party of Arkansas.** Three Libertarian nominees (Jeff Wadlin —
Senate, Steve G. Parsons — AR-1, Bobby Wilson — AR-3) all filed on
2026-03-03, the Preferential Primary date itself — matching the Election
Calendar's "new political party" certificate-of-nomination deadline (Ark.
Code § 7-7-205(c)(2)(B-C): filed no later than noon on the Preferential
Primary date, in lieu of running a primary). This is a determined
nomination, recorded as `qualified_for_general_ballot`, not a pending
petition.

**Incumbency cross-check** (never trusted from this app's own FEC-derived
`candidates` table, per SAFETY): `house.gov`'s "By State and District"
directory confirms Arkansas's sitting House delegation is Crawford (AR-1),
Hill (AR-2), Womack (AR-3), Westerman (AR-4) — all Republican, all present in
the filings table as the GOP nominee for their own seat.
`senate.gov`'s senator list confirms Arkansas's senators are Boozman (R,
Class III, not up until 2028) and Cotton (R, Class II, the seat on the 2026
ballot) — Cotton is present in the filings table as the GOP Senate nominee,
confirming a straightforward incumbent-defends race, not an open seat.

**Tooling used:** `WebSearch` (initial source discovery), `WebFetch` (the
2026 Election Calendar PDF, read via the local saved copy after WebFetch's
own PDF text extraction came back empty on the compressed stream),
`mcp__claude-in-chrome__*` (navigate/computer/find/javascript_tool — the
DataTables client-API approach above; `read_network_requests` to recover the
underlying REST endpoint's query-string shape once the Chrome extension
briefly disconnected and reconnected mid-session). No Civix-style browser-
automation obstacles (no 403-on-fetch JS SPA, no virtualized scroll, no
required-field-blocks-blank-query trap beyond the exact-match Position/Office
field) — this source was closer to AL's plain-HTML pattern than TX's Civix
portal, once the DataTables mechanics were understood.

## Contest inventory

Arkansas has **4 US House districts and 1 US Senate contest in 2026** (the
Class II seat, currently held by Tom Cotton). All 5 contests are fully
determined for the November 3, 2026 general election.

- **US House District 1:** 3 nominees (R, D, L).
- **US House District 2:** 2 nominees (R, D) — no Libertarian or independent
  filer for this seat.
- **US House District 3:** 3 nominees (R, D, L).
- **US House District 4:** 2 nominees (R, D) — no Libertarian or independent
  filer for this seat.
- **US Senate:** 3 nominees (R, D, L).

Total: 13 candidates across 5 contests, matching the candidates.arkansas.gov
federal-filings count exactly.

## What was built (delta from the AZ/TX/OK/AL/AK pattern)

Most of the existing vertical-slice infrastructure is state-agnostic and
required no changes: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, the `runoff_pending` /
`isRunoffPending` mechanism (not needed here — every AR nomination is
determined), and the importer's array-shaped `FIXTURES` map. No new
`OfficialBallotStatus` or `party` union values were needed — Arkansas's
Libertarian nominees map directly to the existing `"LIB"` code.

**New / changed for this build:**

- `scripts/congressional-rosters/ar-official-roster-2026.ts` (new) — 10
  House rows (4 districts) + 3 Senate rows, all
  `"qualified_for_general_ballot"`. Full sourcing, methodology, and known
  limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `AR` in `FIXTURES` with
  separate house/senate entries, matching the AL/AK two-entry pattern.
- `src/lib/server/officialRoster.test.ts` — 10 new tests: `getOfficialRoster`
  narrowing per district, Senate narrowing, a check that every AR row is
  `"qualified_for_general_ballot"`, a Libertarian-party-code check,
  `isIncumbentSeekingReelection` for all 4 House incumbents plus the Senate
  incumbent, and `lookupChallengers` wiring confirming both chambers are
  covered (FEC query skipped, 2 calls not 3), incumbents excluded from
  challenger lists, and no candidate is ever flagged `isRunoffPending`.

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3101 tests passing, 5 pre-existing `todo` (no failures).
  One `prettier` formatting issue in the new test additions was caught by
  the lint step and fixed before this run.
- **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL` (the
  credential that blocked earlier builds today, since resolved by Muxin
  reprovisioning the Neon staging branch) was retrieved via a fresh
  `vercel env pull` against this worktree (after linking
  `.vercel/project.json` to confirm `projectName` reads `voter-choice`, not a
  mis-linked project) and confirmed non-empty. A direct `select 1` connected
  successfully via the project's own `@neondatabase/serverless` driver
  (`db/client.ts`'s actual code path).
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Pre-import row count for `state = 'AR'`: **0**.
  2. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state AR` — importer reported `upserted=13`. Direct row-count query
     (`select count(*) from official_roster_candidates where state = 'AR'`,
     not just the importer's own log line): **13**.
  3. Re-ran the identical import a second time (idempotency check, per the
     card's goal condition) — importer again reported `upserted=13`. Direct
     row-count query again: **13 — not 26.** No duplicate rows from the
     re-run; the `NULLS NOT DISTINCT` fix from migration `0016` (already
     present in `db/schema.ts`, applied to this staging branch) covers
     Arkansas's null-district Senate rows correctly.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly — the real code path a request hits — for all 4 House districts
  and the Senate race, against staging with `OFFICIAL_ROSTER_ENABLED=1`.
  Diffed candidate-by-candidate against the fixture
  (`ar-official-roster-2026.ts`). **0 mismatches across all 5 contests.**
  Full literal output:

  ```
  AR-1 (incumbent Crawford excluded):
    - Terri Yarbrough Green (Democrat)
    - Steve G. Parsons (Libertarian)

  AR-2 (incumbent Hill excluded):
    - Chris Jones (Democrat)

  AR-3 (incumbent Womack excluded):
    - Robb Ryerse (Democrat)
    - Bobby Wilson (Libertarian)

  AR-4 (incumbent Westerman excluded):
    - James "Rus" Russell, III (Democrat)

  Senate (incumbent Cotton excluded):
    - Hallie Shoffner (Democrat)
    - Jeff Wadlin (Libertarian)
  ```

  Every incumbent is correctly excluded from their own challenger list (same
  contract as AZ/TX/OK/AL/AK), and the Libertarian party code renders
  correctly as "Libertarian" for all three L-party nominees.
- Confirmed (by reading `db/schema.ts` directly, and now proven live against
  staging) that `official_roster_candidates_seat_name_uidx` carries the
  `NULLS NOT DISTINCT` fix from migration `0016` — Arkansas's null-district
  Senate rows deduped correctly across the two import runs.
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for
  the verification command above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Names are recorded as they appear in the official
  candidates.arkansas.gov filing table**, including title prefixes some
  incumbents' filings carry verbatim ("Congressman Rick Crawford", "Senator
  Tom Cotton") rather than normalized to plain names; not independently
  re-verified against a third document beyond the two official sources
  above.
- **A secondary news source (Talk Business & Politics) named an AR-1
  independent filer ("Jason Gaines (I)") not present in the official
  post-deadline roster** — investigated and confirmed absent from the
  official source (see "How this was verified" above), not silently
  dropped.
- **No write-in filers appear in this fixture** — none were present in the
  candidates.arkansas.gov federal rows as of the retrieval date; Arkansas's
  write-in process (if any, for federal office) was not separately
  researched, consistent with every other state built through this
  pipeline so far only recording what the official candidate source
  itself lists.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ar-official-roster/docs/operations/arkansas-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/arkansas-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/ar-official-roster/scripts/congressional-rosters/ar-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ar-official-roster-2026.ts`
  once merged to main).
- **Official Arkansas source URL(s) used:**
  - `https://candidates.arkansas.gov/` (Arkansas Secretary of State's
    official "Search Candidate Filings" tool — the post-primary federal
    candidate roster, this fixture's primary source of record)
  - `https://enr.totalresults.com/arkansas/#election=7f77a178-af02-40ec-92db-c5cc50882c68`
    (Arkansas Secretary of State's official 2026 Preferential Primary
    election-night-reporting results, Federal category — used to confirm
    the filings table already reflects post-primary nominees and that no
    federal race needed the March 31 runoff)
  - `https://www.sos.arkansas.gov/uploads/elections/2026_Election_Calendar_Rev._6-2025_.pdf`
    (2026 Election Calendar — independent-candidate petition deadline,
    new-political-party certificate-of-nomination deadline)
  - `https://www.house.gov/representatives` ("By State and District" tab,
    Arkansas section — incumbency cross-check only, not a candidate-roster
    source)
  - `https://www.senate.gov/senators/senators-contact.htm` (Arkansas
    senators list — incumbency cross-check only)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete, reviewed,
and pass `npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (13 rows, 10 House + 3 Senate, no duplication on re-run), and the
real code path was called directly against staging with
`OFFICIAL_ROSTER_ENABLED=1` for all 4 House districts and the Senate race,
with **0 mismatches** against the fixture. Prod was never touched — every
database command used `ROSTER_STAGING_DATABASE_URL` explicitly, and
`OFFICIAL_ROSTER_ENABLED` was only ever set inline for verification, never
persisted anywhere. Per the epic's "MERGE PROMPTLY, NO SEPARATE SIGN-OFF
GATE" standing requirement, this branch merges directly after this self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for AR and/or the other built states)** — human
   sign-off required. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
