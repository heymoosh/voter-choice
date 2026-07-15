# Alaska vertical slice — built and verified in code; staging import BLOCKED (credential failure)

Card: "[P0] Import + verify official roster: Alaska (AK)", parent epic
`c5a813bb` (nationwide official-source congressional roster). Fourth state
built through this pipeline, after Arizona, Texas, and Oklahoma.

Date: 2026-07-15. Alaska's 2026 top-four nonpartisan primary is **August 18,
2026 — 34 days in the future as of this build.** The general election is
November 3, 2026.

## Bottom line

**Code, fixture, and tests are complete and pass `npm run check` (162 test
files, 3080 tests, 0 failures).** The at-large US House seat and the 2026 US
Senate race are both covered. **However, this build could NOT complete the
GOAL_CONDITION's staging-import and end-to-end verification steps** — the
`ROSTER_STAGING_DATABASE_URL` credential (both the one already in
`.env.local` and a freshly re-pulled copy via `vercel env pull`) fails
Postgres password authentication against the Neon staging branch, tried
through every combination of driver (raw `pg` and the project's own
`@neondatabase/serverless` HTTP driver) and endpoint (pooled and direct). See
"Verification performed" below for the full investigation. **This is a
genuine external blocker, not a data or code problem** — per the card's own
instruction to stop and report rather than guess or merge unverified work,
no PR has been opened and nothing has been merged.

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
- **Staging import: BLOCKED — could not complete.** Investigated as follows,
  in order, without ever falling back to the ambient/production
  `DATABASE_URL`:
  1. `ROSTER_STAGING_DATABASE_URL` IS set in `.env.local` (symlinked from
     the main checkout into this worktree) — confirmed present, not empty.
  2. Running the importer against it
     (`DATABASE_URL="$ROSTER_STAGING_DATABASE_URL" npx tsx
     scripts/ingest/official-roster.ts --state AK`, and a direct row-count
     check via the project's own `db/client.ts` / drizzle path) failed with
     `password authentication failed for user 'neondb_owner'`.
  3. Re-pulled the credential fresh from Vercel itself
     (`vercel link` + `vercel env pull .env.local --environment=development
     --yes`, after first confirming `vercel whoami` was authenticated) —
     Vercel is the authoritative source, not a possibly-stale local file.
     The freshly-pulled value **still fails the identical
     `password authentication failed` error.**
  4. Ruled out URL-parsing/quoting artifacts (the `vercel env pull` output
     wraps values in double quotes, which the extraction command now
     strips) and ruled out a driver-specific SSL/channel-binding quirk by
     testing **both** the project's own `@neondatabase/serverless` HTTP
     driver (`db/client.ts`'s actual code path) **and** a raw `pg` Postgres
     connection, and **both** the pooled endpoint
     (`...-pooler.c-8.us-east-1.aws.neon.tech`) **and** the direct endpoint
     (same host with `-pooler` stripped) — all four combinations fail with
     the exact same password-authentication error, never a network/DNS/TLS
     error. This rules out a tool-sandbox or connection-string-format
     artifact; the credential itself does not authenticate against this
     Neon branch right now.
  5. **A tool error transiently echoed the full connection string
     (including the password) into this session's own transcript** — the
     `@neondatabase/serverless` driver's "not a valid URL" error message
     includes the raw input string, and this happened once before the
     quoting bug was found. This is flagged here for Muxin's awareness so
     the credential can be rotated out of an abundance of caution; the
     value was not written to any file, committed, or repeated after being
     noticed, and no other party had access to this session.
  6. **A concrete diagnostic clue for whoever picks this up next:**
     `vercel env ls` shows `ROSTER_STAGING_DATABASE_URL` (Development +
     Preview) was last updated **"5h ago"** relative to this build
     (2026-07-15 afternoon) — i.e. it was rotated earlier today, by someone
     or something outside this session. That strongly suggests the Vercel
     value and the actual Neon branch's current password are out of sync
     (the rotation didn't fully propagate, or a different rotation
     happened on the Neon side after Vercel's was set), rather than this
     being a stale-file problem on this session's end.
  - Per the card's explicit instruction, this is reported as a genuine
    blocker rather than guessed around. **No fixture data was imported to
    staging; no row-count or idempotency check was possible.**
- **End-to-end check against staging, flag on: BLOCKED for the same
  reason** — this step requires the staging import above to have succeeded
  first. Not attempted.
- Confirmed (by reading `db/schema.ts` directly, not by querying staging)
  that `official_roster_candidates_seat_name_uidx` already carries the
  `NULLS NOT DISTINCT` fix from migration `0016` — no new migration is
  needed for Alaska's null-district Senate row; Alaska's House rows use
  district `"00"` (a real, non-null string) so they never depend on that
  fix at all.
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was never
  set anywhere persistent (not `.env.local`, not Vercel, not any committed
  file) — it was never even set transiently, since no end-to-end run
  against staging was possible.

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **Staging import and end-to-end verification are incomplete** — see
  "Verification performed" above. This must be finished before this
  fixture/PR can be considered done per the card's GOAL_CONDITION. Likely
  next step: rotate/regenerate the Neon staging branch's password (or
  confirm with Muxin whether the branch itself was recently reset) and
  re-run the two blocked steps.
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

**NO-GO — BLOCKED, not a data or design problem.** The fixture, importer
registration, and tests are complete, reviewed, and pass `npm run check`
cleanly. But the card's GOAL_CONDITION explicitly requires a direct
row-count-verified staging import and an end-to-end `lookupChallengers`
check against staging with the flag on — neither is possible right now
because the `ROSTER_STAGING_DATABASE_URL` credential (both the existing one
and a freshly Vercel-repulled one) fails Postgres authentication against the
Neon staging branch, reproduced across two drivers and two endpoints. No PR
has been opened; nothing has been merged; no code beyond this worktree has
changed.

What's needed to finish:

1. **Someone with Neon console access needs to check/rotate the staging
   branch's `neondb_owner` password**, or confirm whether the branch itself
   was reset/recreated recently, then update Vercel's `development`/
   `preview` environment variable so the next `vercel env pull` picks up a
   working credential. `vercel env ls` shows this value was last updated
   "5h ago" relative to this build — it was rotated earlier today by
   something outside this session, and whatever did that rotation likely
   holds the answer to why it doesn't authenticate. (Flag out of caution:
   this session's transcript briefly contained the current — apparently
   non-working — password verbatim, via a tool error message; worth
   rotating regardless once a human looks at this.)
2. Once staging access is restored: run the importer, confirm the 31-row
   import (15 House + 16 Senate) via a direct row-count query, re-run to
   confirm idempotency, then run the end-to-end `lookupChallengers` check
   with the flag on and diff against this fixture.
3. Only after step 2 passes: open the PR, self-vet, and merge per the
   card's standing auto-merge authorization.
