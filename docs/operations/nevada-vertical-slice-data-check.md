# Nevada vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Nevada (NV)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. Nevada's 2026 primary (June 9, 2026) is fully certified
(county canvass deadline June 19, 2026, per Clark County's official 2026
election calendar). The general election is November 3, 2026. Nevada has no
2026 US Senate contest (Cortez Masto's seat, Class III, runs to 2028;
Rosen's seat, Class I, runs to 2030).

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/nevada-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/nv-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Nevada source URLs used:
- `https://www.nvsos.gov/SOSelectionPages/results/2026StateWidePrimary/ElectionSummary.aspx` (Nevada SOS, official June 9, 2026 primary results by candidate)
- `https://www.nvsos.gov/elections/election-information/2026-election-information` (2026 Election Information landing page)
- `https://www.nvsos.gov/home/showpublisheddocument/20105/639179848915870000` (Nevada SOS "2026 General Election Statewide Certified List of Candidates" — covers NV-2/NV-4, the two multi-county districts that file with the SOS)
- `https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:fe5dbe41-e2b2-402e-a651-cbe5e6ea53bc/original/as/Contests-Candidates-All-26.pdf` (Clark County Election Dept, "Contests and Candidates in the 2026 Elections in Clark County, Nevada," dated 6/24/2026 — covers NV-1/NV-3, the two districts wholly within Clark County that file with the county)
- `https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:a5950eb8-cb6d-404e-a533-b4856da8aa86/original/as/2026-dates.pdf` (Clark County Election Dept, "Key Important Dates for the 2026 Elections," updated 11/26/2025 — source for the calendar dates in section (e) below)
- `https://www.house.gov/representatives` (incumbency cross-check)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for a fifteenth state.** All 4 NV House districts
render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — 0 mismatches across all 4 contests.

**Nevada is not Civix-vended.** It runs its own in-house ASP.NET
election-results system on `nvsos.gov`, plus a separate Imperva-protected
live filing portal (`silverstateelection.nv.gov`, not used for this build —
blocked to both automated fetch and browser rendering). Both `nvsos.gov` and
`clarkcountynv.gov` 403 automated (non-browser) fetches — every source above
was read via an actual browser session, same underlying requirement as a
Civix portal but for a different reason (bot-defense, not a JS SPA).

**A genuine structural finding, not a technical blocker — split filing
officer.** NV-1 and NV-3 are wholly within Clark County, so Nevada election
law makes the Clark County Election Dept the filing officer for those two
districts' candidates (major-party and independent alike) — not the
Secretary of State. NV-2 and NV-4 span multiple counties, so their
candidates file directly with the SOS. This means no single official
document lists all 4 districts' full candidate sets — NV-1/NV-3's
independents in particular only appear in Clark County's own "Contests and
Candidates" document, not the SOS's statewide list.

**NV-2 is an open seat.** Incumbent Mark Amodei (R) announced February 6,
2026 that he would not seek re-election and does not appear as a 2026
candidate on any official source read for this build. No row for district
`"02"` in this fixture carries `isIncumbent: true`.

**A live self-vet catch worth flagging explicitly:** this app's existing
`AIP` party code is Arizona-specific (`races.ts`'s `PARTY_NAMES` map ties it
to "Arizona Independent Party," confirmed by an AZ-build docblock). Nevada
also has a party literally named "Independent American Party" — reusing
`AIP` for it would have silently rendered "Arizona Independent Party" on a
real Nevada candidate. Caught during this build's own staging end-to-end
check (the rendered party name was visibly wrong), not from static review.
Fixed by adding a new `IAP` code to `scripts/congressional-rosters/types.ts`
and `races.ts`'s `PARTY_NAMES`, mirroring the AKP/NPP/PF/LPF/FFP
one-code-per-state precedent, rather than reusing a same-looking but
differently-scoped existing code.

**Six candidates recorded `declared_general_ballot_intent`, not
`qualified_for_general_ballot`.** Nevada's individual (non-party)
independent candidates must each file a signature petition under NRS
293.200; Clark County's own "Contests and Candidates" document explicitly
marks its NV-1/NV-3 individual petitioners "General\*" — its own legend
defines the asterisk as "will only appear in the 2026 General Election if
petition requirements are met." That document is dated 6/24/2026, two days
after the June 22, 2026 petition-filing deadline, and no later document
confirming signature sufficiency was found. Per the epic's SAFETY rule
(never promote a nominee from a partial/pending signal), all six — Khan, St
John, Thomas Jr., Willert (NV-1); Anderson David J. (NV-3); Johnson William
(NV-4, inferred by the same underlying NRS 293.200 process even though the
SOS's statewide list carries no comparable status column) — are recorded
`declared_general_ballot_intent`. By contrast, Independent American Party
nominees (Chapman/NV-2, Johnson Patrick D./NV-3, Best/NV-4) carry no
petition requirement (a recognized party's own nomination process instead)
and are recorded `qualified_for_general_ballot`.

**No `runoff_pending` rows** — Nevada has no runoff mechanism for
congressional primaries; the June 9 primary decided every contested
major-party nomination by plurality, fully certified.

## How this was verified

1. Confirmed via `WebSearch` + a direct `nvsos.gov` browser session that
   Nevada's official source is not Civix-vended (no
   `<subdomain>.<state>elections.civixapps.com` pattern, no "IvisCbpUi"
   title, no "POWERED BY gocivix.com" footer) — it's Nevada's own ASP.NET
   `.aspx` results pages, plus an Imperva-protected filing portal not used
   here.
2. Read the official June 9, 2026 primary results page
   (`nvsos.gov/SOSelectionPages/results/2026StateWidePrimary/ElectionSummary.aspx`)
   via `mcp__claude-in-chrome__get_page_text` — a real browser session was
   required, `WebFetch` 403s this domain. Confirmed exact vote
   totals/percentages for every contested US House primary (NV-1 D/R, NV-2
   D/R, NV-3 D/R, NV-4 R only — NV-4's Democratic primary is absent from
   this page because Horsford ran unopposed, confirmed against Clark
   County's own candidate list showing him directly at "General" stage).
3. Found and read the SOS's "2026 General Election Statewide Certified List
   of Candidates" (a 14-page PDF, linked from the SOS's 2026 Election
   Information page) — downloaded via a browser session, rendered by the
   in-browser PDF viewer (`WebFetch` also 403s this domain; when it did
   return content for a *different* Clark County PDF later in this build,
   it saved the raw binary to disk, which `pypdf` then read directly).
   Confirmed this document only carries NV-2/NV-4 federal rows (the two
   multi-county districts that file with the SOS), each with a `Filing
   Office`/`Filed Date` column but no primary/general or petition-status
   column.
4. Searched for and found Clark County's own "Contests and Candidates in
   the 2026 Elections in Clark County, Nevada" PDF (`WebSearch`, since it's
   not directly linked from the SOS's pages) — fetched via `WebFetch`,
   which saved the raw PDF to disk on its first (unreadable-summary)
   attempt; read directly with `pypdf.PdfReader.extract_text()` per page.
   This is the only source with NV-1/NV-3's full candidate sets, including
   the "General\*" petition-pending marker explained in its own legend.
5. Searched for and found Clark County's "Key Important Dates for the 2026
   Elections" PDF (13 pages) — same `WebFetch`-saves-then-`pypdf`-reads
   pattern (`WebFetch`'s own markdown-conversion summary failed on this
   binary; the saved file's raw text extracted cleanly). This is the source
   for every calendar date in section (e) below, including the June 22,
   2026 independent-petition deadline and the June 19, 2026 primary canvass
   deadline.
6. Cross-checked incumbency against `house.gov`'s official "By State and
   District" member directory (`mcp__claude-in-chrome`, scrolled to the
   Nevada section — this table lazy-loads on scroll) — a second independent
   official source, separate from any Nevada source. Confirmed Titus
   (D-01), Amodei (R-02, not a 2026 candidate), Lee (D-03), and Horsford
   (D-04) as Nevada's four sitting members, matching this fixture's
   `isIncumbent` rows exactly.
7. Assembled `NV_HOUSE_ROSTER_2026` (17 rows across 4 districts) and
   registered it in `scripts/ingest/official-roster.ts`.
8. **Live self-vet catch:** the first staging end-to-end run (step 11 below)
   rendered "Arizona Independent Party" on Nevada's IAP nominees, because
   the fixture initially reused the existing `AIP` code. Traced to
   `races.ts`'s `PARTY_NAMES` map, which ties `AIP` specifically to
   Arizona's own identically-patterned party. Fixed by adding a new `IAP`
   code to `types.ts` and `PARTY_NAMES`, updating the fixture's 3 affected
   rows and the corresponding test assertion, then re-running the full
   verification loop (typecheck, tests, staging re-import, end-to-end
   re-check) from scratch — all clean on the second pass.
9. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   162 test files, 3,188 tests passed. 3 pre-existing failures in
   `scripts/design/capture-shared.test.ts` — a Playwright browser-launch
   test unrelated to this change — confirmed to be a sandbox restriction,
   not a real failure: the same 3 tests pass cleanly when run with the
   sandbox disabled (`browserType.launch: ... bootstrap_check_in ...
   Permission denied`, a mach-port permission the sandbox blocks, not a
   code defect).
10. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL`
    retrieved via a fresh `vercel env pull --environment=preview` (linked
    via a copy of the main checkout's `.vercel/project.json` into this
    worktree), read inline via a single `grep`/`cut` command substitution —
    never `source`d, never echoed — confirmed non-empty (177 characters)
    before use.
11. **Staging import: done, twice per fixture version (before and after the
    IAP fix), confirmed by direct row-count query every time — no
    ambient/production `DATABASE_URL` ever used.**
    - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
      --state NV` → `upserted=17`.
    - Re-ran the same import command a second time (pre-fix) →
      `upserted=17` again (idempotent upsert confirmed, not a duplicate
      insert).
    - Queried `SELECT count(*) FROM official_roster_candidates WHERE
      state='NV'` directly against staging (via a scratch `@neondatabase/
      serverless` script, deleted immediately after use) → `17`, with every
      row's `party`/`ballot_status`/`is_incumbent` matching the fixture.
    - After the IAP fix: re-ran the importer (upsert updates the existing
      rows' `party` column in place) → `upserted=17`, still 17 total rows.
12. **End-to-end check against staging, flag on:** called `lookupChallengers`
    directly (the real production code path, not a mock) for all 4 NV
    House districts, against staging with `OFFICIAL_ROSTER_ENABLED=1`, and
    compared the app's literal output candidate-by-candidate against the
    fixture — both before and after the IAP fix. **Result (post-fix): 0
    mismatches across all 4 districts** — every challenger name matched
    exactly, every row carried `rosterProvenance.sourceKind ===
    "official_state_roster"`, every party rendered its correct display name
    (including "Independent American Party," not "Arizona Independent
    Party"), and both sitting incumbents excluded from their own district
    (NV-2's open seat correctly excluded no one, since no incumbent row
    exists there). The staging `DATABASE_URL` and `OFFICIAL_ROSTER_ENABLED`
    flag were both set inline for this verification command only, never
    written to a persisted env file, and the scratch verification script
    was deleted immediately after use (not committed).
13. Added 8 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — NV narrowing`, `isIncumbentSeekingReelection —
    NV`, `lookupChallengers — NV wiring`), mirroring the existing
    Indiana/Arizona house-only coverage pattern, including an explicit
    open-seat case for NV-2. 152/152 tests pass in that file alone.

## Standing calendar dates (per the plan doc's requirement (e))

Pulled directly from Clark County's official "Key Important Dates for the
2026 Elections" PDF
(`https://www.clarkcountynv.gov/adobe/assets/urn:aaid:aem:a5950eb8-cb6d-404e-a533-b4856da8aa86/original/as/2026-dates.pdf`,
updated 11/26/2025):

- **March 24, 2026** — last day to withdraw a non-city, non-judicial
  candidacy (NRS 293.202). Pre-primary; already passed by this fixture's
  transcription date and does not affect any row here.
- **June 19, 2026** — canvass deadline for the June 9, 2026 primary (on or
  before the tenth day after Election Day; NRS 293.387(1)). This is the
  date Nevada's primary results became fully official/certified — already
  passed, all major-party nominations in this fixture are final.
- **June 22, 2026** — last day for independent candidates to file petitions
  containing signatures (NRS 293.200(4), NRS 293.1275) — the deadline
  governing this fixture's six `declared_general_ballot_intent` rows. This
  date has already passed as of the 2026-07-15 transcription date, but no
  document confirming petition-signature sufficiency (as opposed to mere
  filing) was found for any of the six. **This is the date the dated
  re-check card below is scoped around.**
- **November 24, 2026** — Nevada Supreme Court's statewide canvass (NRS
  293.395(2)), covering US Congress among other offices. This certifies
  election *results*, not ballot *content* — it falls after the general
  election itself and is not a roster-lock date.

**Known gap, not guessed:** no distinct post-primary/pre-general
candidate-withdrawal deadline was found anywhere in Clark County's full
13-page 2026 dates calendar — every "Last Day to Withdraw" entry in that
document is pre-filing-close (i.e. pre-primary). This may mean Nevada
genuinely has no separate post-primary withdrawal window for a certified
congressional nominee, or that this Clark-county-scoped document simply
doesn't cover it. Recorded here as an open gap per the epic's SAFETY rule,
not assumed either way. Similarly, no single named "ballot-content
certification" milestone (of the kind CO/DE/FL each have) was found for
Nevada in any source read this build; the closest identified anchors are
the June 22 petition deadline above and the November 24 post-election
canvass, neither of which is a pre-election roster-lock date in the same
sense.

**Dated re-check card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): scoped narrowly to re-verify whether the six
`declared_general_ballot_intent` independents' petition-signature
sufficiency has since been confirmed (the June 22 filing deadline has
already passed with no later sufficiency confirmation found) — see the
backlog card added alongside this build.

## Files changed

- `scripts/congressional-rosters/nv-official-roster-2026.ts` (new)
- `scripts/congressional-rosters/types.ts` (new `IAP` party code)
- `src/lib/server/races.ts` (new `IAP` entry in `PARTY_NAMES`)
- `scripts/ingest/official-roster.ts` (NV import + FIXTURES entry)
- `src/lib/server/officialRoster.test.ts` (NV test coverage)
- `docs/operations/voter-choice-backlog.md` (STATUS flip, done as a separate
  commit before this build per the claim-safely protocol; dated re-check
  card added as part of this build)
- This doc (new)

No database migration — `ballot_status` remains a plain `text` column with
no CHECK constraint (unchanged since migration 0016). No production
mutation. `OFFICIAL_ROSTER_ENABLED` was never set anywhere persistent —
only inline, for the staging verification commands in steps 11-12 above.
