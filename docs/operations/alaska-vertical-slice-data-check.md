# Alaska vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Alaska (AK)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Fourth state
built through this pipeline, after Arizona, Texas, and Oklahoma.

Date: 2026-07-15. Alaska's 2026 top-four nonpartisan primary is **August 18,
2026 — 34 days in the future as of this build.** The general election is
November 3, 2026.

## Bottom line

**GO — code, fixture, tests, staging import, and end-to-end verification are
all complete.** `npm run check` passes (162 test files, 3080 tests, 0
failures). The at-large US House seat and the 2026 US Senate race are both
covered. The `ROSTER_STAGING_DATABASE_URL` credential that blocked this build
earlier today has been resolved — Muxin reprovisioned a new Neon staging
branch and updated the Vercel env var; a fresh `vercel env pull` against this
worktree's `.vercel/project.json` (confirmed pointed at the `voter-choice`
Vercel project) connects cleanly. The importer ran twice against staging
(31 rows both times — 15 House + 16 Senate, confirmed by direct row-count
query, not just the importer's own log line) and the real
`lookupChallengers`/`isIncumbentSeekingReelection` code path was called
directly against staging with `OFFICIAL_ROSTER_ENABLED=1` — **0 mismatches**
across both contests. See "Verification performed" below for the full
output. PR opened and self-vet auto-merged per the card's standing
authorization.

**Alaska's official source is a single server-rendered HTML page, not
Civix and not a PDF** — confirms the F03 rehearsal's `sourceFormat: "html"` /
`parserFamily: "html_table"` finding. There is no JS SPA, no virtualized
scroll, no per-district query: every office is listed on one page, grouped
by heading. The one real access obstacle was a broken TLS certificate chain
on `elections.alaska.gov` itself (see below), not the data's structure.

**The card's own drafted fixture shape (`district: null` for the at-large
House seat) was wrong, and this build did not follow it.** Tracing
`races.ts`'s `lookupChallengers` shows a numeric district of `0` (Census
at-large convention, confirmed live for Alaska by
`src/app/api/delegation/route.ts`'s `isNonVotingArea` check) gets zero-padded
to district key `"00"` before the official-roster lookup runs — already
proven for Wyoming's own at-large FEC rows in `races.test.ts` ("zero-pads
the district key (at-large = 00)"). A `district: null` House row would
silently never match that lookup and the whole House side of this slice
would render nothing. This fixture uses `district: "00"` for every House
row instead.

**No new `ballotStatus` was needed, and `runoff_pending` does not apply to
Alaska's situation as it exists today.** That status means two already-
decided primary finalists awaiting a runoff between just the two of them
(Oklahoma's case). Alaska's Aug 18, 2026 top-four primary had not yet
happened at transcription time — every certified filer is simply
`"qualified_for_primary_ballot"`, the same status Arizona used for its own
pre-primary build. Promoting anyone to `"qualified_for_general_ballot"` now
would mean guessing which four candidates per office the primary will
advance, which the plan doc's SAFETY rule forbids.

**Two new party codes were added** (`NPA`, `AKP`) to
`scripts/congressional-rosters/types.ts` — see "What was built" below.

## How this was verified — operational-navigation write-up

**Site structure.** `https://www.elections.alaska.gov/candidates/` is a
landing page with an election picker and a "Search Candidates" form
(Election / Contest / Candidate Name). Selecting "2026 Primary Election" and
submitting (or just navigating directly to
`?election=26prim`) returns **one long page** listing every office —
Governor/Lt. Governor, US Senator, US Representative, then every state
Senate and House district in turn — each as its own heading with a flat list
of candidates underneath. No pagination, no per-district query required, no
JavaScript rendering needed to see the data (confirmed both via a Wayback
Machine snapshot and a direct `curl` — see below). Each candidate row shows:
name (as it will appear on the ballot), a parenthetical registration/party
label — `(Registered Republican)`, `(Registered Democrat)`,
`(Registered Libertarian)`, `(Registered Green)`, `(Registered Alaskan
Party)`, `(Nonpartisan)`, or `(Undeclared)` — a `(Certified)` /
`(Denied)` / `Withdrawn` status marker, an `Incumbent` tag where applicable,
campaign address/contact, and links to any filed candidate statement. The
page footer states "Page last updated July 10, 2026" and "Updates will occur
as they are received and processed" — this is a live, continuously-updated
official document, not a static one-time PDF snapshot.

**The real obstacle: a broken TLS certificate chain on
`elections.alaska.gov` itself**, not the data. Both `WebFetch` and a normal
Chrome navigation to the live page failed outright (Chrome silently
reverted to a blank tab rather than showing a clickable "unsafe" warning). A
direct `curl -v` reproduced this outside any tool sandbox with a precise
diagnosis: `SSL certificate problem: unable to get local issuer
certificate` — the server isn't sending its intermediate certificate, a
common state-.gov misconfiguration, not a data-integrity concern. This was
resolved two ways, cross-checked against each other for confidence: (1) a
Wayback Machine snapshot of the exact same URL
(`https://web.archive.org/web/20260711042527/https://www.elections.alaska.gov/candidates/?election=26prim`,
captured 2026-07-11, valid TLS via archive.org) read via
`mcp__claude-in-chrome__get_page_text`; (2) a direct `curl -sk` (TLS
verification bypassed for this one read-only GET only, to the live page, on
2026-07-15). **Both reads returned candidate-by-candidate identical Senate
and House sections** — same 16 Senate filers, same 15 House filers, same
`(Certified)`/`Withdrawn` markers, same `Incumbent` tags — giving high
confidence the transcription below is both accurate and current as of the
build date, not stale.

**Resolved discrepancy (the card's own explicit ask):** the ORIGIN note's
`https://www.elections.alaska.gov/wp-content/uploads/2026/06/Final-Determination-6.15.2026-DOE.pdf`
is **not** the candidate-list source. A web search resolved exactly what it
is: a June 15, 2026 Division of Elections ruling disqualifying one specific
US Senate filer, Daniel J. Sullivan Jr. of Petersburg, for filing under a
name confusingly similar to incumbent Sen. Dan S. Sullivan. That ruling was
**overturned on appeal** — the Alaska Superior Court (June 26, 2026) and the
Alaska Supreme Court (June 29, 2026) both ordered the Division to place him
on the ballot. The live candidate list already reflects the final,
court-ordered outcome: "Sullivan, Daniel J. Jr." appears as `(Registered
Republican) (Certified)`, not excluded. This fixture follows the live,
current HTML roster (which already incorporates the court's ruling), not
the superseded PDF the ORIGIN note pointed at — resolving the card's
"sourceFormat says html but the URL ends in .pdf" discrepancy: the PDF is a
real document, just not the candidate-roster source; the F03 rehearsal's
`sourceFormat: "html"` was correct all along.

**Incumbency cross-check** (never trusted from the portal's own `Incumbent`
tag or this app's own FEC-derived table, per SAFETY): `house.gov` /
`clerk.house.gov` confirm Nicholas J. Begich III (R) is Alaska's sitting
at-large Representative since January 2025. `senate.gov`'s "States in the
Senate" page confirms Alaska's Class II seat (up in 2026) is held by Dan
Sullivan (R); the other seat, Class III (Murkowski), isn't up until 2028 —
matching the card's own background note. Both cross-checks agree with the
candidate list's own tags — no discrepancy found.

**Tooling used:** `WebSearch` (to find and confirm the Sullivan-v-Sullivan
litigation history and the incumbency facts), `mcp__claude-in-chrome__*`
(navigate/get_page_text, against the Wayback Machine snapshot), and `curl`
(both to reproduce/diagnose the TLS failure with `-v`, and once with `-sk`
for a live cross-check read). No browser automation beyond simple
navigation + text extraction was needed — unlike Texas's Civix portal, there
was no virtualized scroll, no required-field search form blocking a
district-by-district query, and no JS-rendering dependency for the data
itself.

## Contest inventory

Alaska has **1 at-large US House seat and 1 US Senate contest in 2026** (the
Class II seat, currently held by Dan Sullivan). Both are covered by the
November 3, 2026 general election, contingent on the Aug 18, 2026 top-four
nonpartisan primary determining which four candidates per office advance.

- **US House (at-large):** 15 certified primary-ballot filers (1 withdrawn
  filer excluded — Gerald L. Heikes, who remains separately certified for
  the Senate race below).
- **US Senate:** 16 certified primary-ballot filers (1 withdrawn filer
  excluded — William L. Hunt).

## What was built (delta from the AZ/TX/OK pattern)

Most of the AZ/TX/OK vertical slice's infrastructure is state-agnostic and
required no changes: `official_roster_candidates` table shape,
`officialRoster.ts` reader, `officialRosterFlag.ts`, `rosterProvenance.ts`,
the delegation open-seat-badge wiring, `RepCard.tsx`, the `runoff_pending` /
`isRunoffPending` mechanism (built but not needed here — see above), and the
importer's array-shaped `FIXTURES` map.

**New / changed for this build:**

- `scripts/congressional-rosters/types.ts` — two new `party` union values:
  `"NPA"` ("No Party Affiliation" — collapses Alaska's "Nonpartisan" and
  "Undeclared" registration labels into one existing FEC-side code, already
  mapped in `races.ts`'s `PARTY_NAMES`, rather than inventing two
  near-duplicate codes for a distinction this app has no other use for) and
  `"AKP"` ("Registered Alaskan Party" — a real state-recognized minor party
  under Alaska law, mirroring how `"AIP"` was added for Arizona's own state
  party). Also clarified the `district` field's doc comment to spell out the
  at-large `"00"` convention (see below) so a future state doesn't repeat
  the same mistaken assumption.
- `src/lib/server/races.ts` — added `AKP: "Alaskan Party"` to `PARTY_NAMES`
  (`NPA: "No Party Affiliation"` already existed, used by FEC-sourced data).
- `scripts/congressional-rosters/ak-official-roster-2026.ts` (new) — 15
  House rows (district `"00"`, at-large) + 16 Senate rows, all
  `"qualified_for_primary_ballot"`. Full sourcing, methodology, and known
  limitations are in the file's own header docblock, including the
  district-key and ballotStatus judgment calls summarized above.
- `scripts/ingest/official-roster.ts` — registered `AK` in `FIXTURES` with
  separate house/senate entries, exactly like TX's and OK's two-entry
  pattern.
- `src/lib/server/officialRoster.test.ts` — 8 new tests: `getOfficialRoster`
  narrowing on the at-large district key `"00"` (and confirming a bogus
  numbered district returns nothing), Senate narrowing, a check that every
  AK row is `"qualified_for_primary_ballot"`, `isIncumbentSeekingReelection`
  for both the House and Senate incumbents, and `lookupChallengers` wiring
  driven with a **numeric district of `0`** (exercising the exact zero-pad
  path a real Alaska request takes) — confirming both chambers are covered
  (FEC query skipped, 2 calls not 3), the sitting incumbents are excluded
  from the challenger lists, the litigated same-name Senate filer and the
  Alaskan Party filer both render with correctly mapped party names, and
  `NPA`-coded (Nonpartisan/Undeclared) filers render as "No Party
  Affiliation".

## Verification performed

- **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
  162 test files, 3080 tests passing, 5 pre-existing `todo` (no failures).
  One `prettier` formatting issue in the new test additions was caught by
  the lint step and fixed before this run.
- **Credential resolved.** The `ROSTER_STAGING_DATABASE_URL` failure that
  originally blocked this build was a broken/reset Neon staging branch,
  unrelated to this build's code — Muxin reprovisioned a new Neon branch and
  updated the Vercel `development`/`preview` env var. A fresh
  `vercel env pull` (after confirming this worktree's `.vercel/project.json`
  `projectName` reads `voter-choice`, not a mis-linked project) retrieved a
  working credential; a direct `select 1` connected successfully via the
  project's own `@neondatabase/serverless` driver (`db/client.ts`'s actual
  code path).
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Pre-import row count for `state = 'AK'`: **0**.
  2. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state AK` — importer reported `upserted=31`. Direct row-count query
     (`select count(*) from official_roster_candidates where state = 'AK'`,
     not just the importer's own log line): **31**.
  3. Re-ran the identical import a second time (idempotency check, per the
     card's goal condition) — importer again reported `upserted=31`. Direct
     row-count query again: **31 — not 62.** No duplicate rows from the
     re-run; the `NULLS NOT DISTINCT` fix from migration `0016` (already
     present in `db/schema.ts`, applied to this staging branch) covers
     Alaska's null-district Senate rows correctly.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  and `isIncumbentSeekingReelection` directly — the real code path a request
  hits — for Alaska's at-large House seat (passed as a **numeric district
  `0`**, exactly as a real request would, letting the zero-pad-to-`"00"`
  logic inside `races.ts` do its own work rather than pre-computing the
  string) and the Senate race, both against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture (`ak-official-roster-2026.ts`). **0 mismatches across both
  contests.** Full literal output:

  ```
  AK-00 (at-large House) — incumbent NICK BEGICH, seekingReelection2026=true
    - DAVID R. AMBROSE II (No Party Affiliation)
    - LADY DONNA DUTCHESS (No Party Affiliation)
    - JOHN E. FODDRILL SR. (Libertarian)
    - EDDIE GOLDFARB (Republican)
    - ERIC HAFNER (Democrat)
    - BILL HILL (No Party Affiliation)
    - JAMES C. "JIM" MCDERMOTT (Libertarian)
    - YAQUELIN REYNOSO (Democrat)
    - DAVID RICHEY (No Party Affiliation)
    - MELANIE A. SALAZAR (No Party Affiliation)
    - MATT SCHULTZ (Democrat)
    - CLAY STRICKLAND (Republican)
    - JOHN B. WILLIAMS (Democrat)
    - MATTHEW "BRONCO" WILLIAMS (No Party Affiliation)

  AK Senate — incumbent DAN S. SULLIVAN, seekingReelection2026=true
    - DUSTIN THOMAS HOUSE DARDEN (Republican)
    - FRED C. GRAUBERGER (Republican)
    - RICHARD GRAYSON (Green)
    - CAROL "KITTY" HAFNER (Democrat)
    - GERALD L. HEIKES (Republican)
    - SIDNEY "SID" HILL (No Party Affiliation)
    - SCOTT A. KOHLHAAS (Libertarian)
    - DAVID B. LESLIE (Democrat)
    - RICHARD B. MAYERS (Republican)
    - HEATHER MCELWAIN (Republican)
    - MARY PELTOLA (Democrat)
    - REECE J. ROBERTS (No Party Affiliation)
    - SHIRLEY A. SAUCERMAN (No Party Affiliation)
    - EARL D. "SKIP" SOUTHWORTH (Alaskan Party)
    - DANIEL J. SULLIVAN JR. (Republican)
  ```

  Both incumbents (Begich, Dan S. Sullivan) are correctly excluded from
  their own challenger lists (same contract as AZ/TX/OK), both party-code
  mappings render correctly (`NPA` → "No Party Affiliation", `AKP` →
  "Alaskan Party"), and the litigated same-name Senate filer (Daniel J.
  Sullivan Jr.) renders distinctly from the incumbent with no collision.
- Confirmed (by reading `db/schema.ts` directly, and now proven live against
  staging) that `official_roster_candidates_seat_name_uidx` carries the
  `NULLS NOT DISTINCT` fix from migration `0016` — Alaska's null-district
  Senate rows deduped correctly across the two import runs; Alaska's House
  rows use district `"00"` (a real, non-null string) so they never depended
  on that fix at all.
- Prod database untouched throughout — every command that touched a
  database used `ROSTER_STAGING_DATABASE_URL` explicitly, never the ambient
  `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set inline for
  the verification command above; it is not set anywhere persistent (not
  `.env.local`, not Vercel, not any committed file).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Every AK row is `qualified_for_primary_ballot`** — the Aug 18, 2026
  top-four primary determines which four candidates per office advance to
  the Nov 3 ranked-choice general. This fixture will need a follow-up
  update once that primary is certified, per the epic's standing
  requirement to track in-progress elections (mandatory rule established
  during the Oklahoma build, `docs/operations/nationwide-congressional-roster-plan.md`).
- **"Nonpartisan"/"Undeclared" filers are recorded as party `"NPA"`**
  (collapsing a real distinction in Alaska's own voter-registration
  categories) rather than inventing two separate codes — an intentional
  simplification (see the fixture's docblock), not a transcription gap.
- **Two Senate filers share strikingly similar names by design of the
  litigated dispute** (incumbent "Dan S. Sullivan" and "Daniel J. Sullivan
  Jr.") — both are real, separately certified candidates per the Alaska
  Supreme Court's ruling, not a transcription duplicate.
- **Write-in filers, if any qualify closer to the election, are not yet
  reflected** — none appeared on the list as of retrieval (Alaska's
  write-in process is a later, separate filing window).
- Names are recorded as they appear in the official candidate list; not
  independently re-verified against a third document.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/roster-ak/docs/operations/alaska-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/alaska-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice-worktrees/roster-ak/scripts/congressional-rosters/ak-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ak-official-roster-2026.ts`
  once merged to main).
- **Official Alaska source URL(s) used:**
  - `https://www.elections.alaska.gov/candidates/?election=26prim`
    (Division of Elections' live, continuously-updated 2026 primary
    candidate list — the US SENATOR and UNITED STATES REPRESENTATIVE
    sections are this fixture's source of record)
  - `https://www.elections.alaska.gov/candidates/` (landing page / search
    form, not itself a candidate list)
  - `https://www.elections.alaska.gov/wp-content/uploads/2026/06/Final-Determination-6.15.2026-DOE.pdf`
    (the ORIGIN note's cited document — NOT a candidate-list source; a
    since-overturned ballot-eligibility ruling on one Senate filer, cited
    here only to document the resolved discrepancy above)
  - `https://www.house.gov/representatives` and
    `https://clerk.house.gov/members/B001323` (incumbency cross-check only
    — not an Alaska source)
  - `https://www.senate.gov/states/AK/intro.htm` (incumbency cross-check
    only — not an Alaska source)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete, reviewed,
and pass `npm run check` cleanly. The card's GOAL_CONDITION's remaining
requirements — a direct row-count-verified staging import and an end-to-end
`lookupChallengers`/`isIncumbentSeekingReelection` check against staging with
the flag on — are both done: the importer ran against staging twice,
confirmed by direct row-count query both times (31 rows, 15 House + 16
Senate, no duplication on re-run), and the real code path was called
directly against staging with `OFFICIAL_ROSTER_ENABLED=1` for both the
at-large House seat and the Senate race, with **0 mismatches** against the
fixture. Prod was never touched — every database command used
`ROSTER_STAGING_DATABASE_URL` explicitly, and `OFFICIAL_ROSTER_ENABLED` was
only ever set inline for verification, never persisted anywhere. PR opened
and merged per the card's standing self-vet auto-merge authorization.

Still open, same standing gates as AZ/TX/OK (unaffected by this build):

1. **Flag flip (prod cutover for AK and/or the other built states)** — human
   sign-off required. Nothing in this build enables `OFFICIAL_ROSTER_ENABLED`
   anywhere.
2. **Every AK row is `qualified_for_primary_ballot`** — this fixture will
   need a follow-up update once Alaska's Aug 18, 2026 top-four primary is
   certified (see "Known gaps" above).
