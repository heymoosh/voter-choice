# Mississippi vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Mississippi (MS)", parent epic
`c5a813bb` (nationwide official-source congressional roster).

Date: 2026-07-15. Mississippi's 2026 congressional primary (March 10, 2026)
is fully certified. Every contested federal race cleared an outright
majority, so Mississippi's April 7, 2026 runoff was never triggered for any
US House or US Senate contest. The general election is November 3, 2026.
Mississippi has a 2026 US Senate race (Cindy Hyde-Smith's Class 2 seat).

## Deliverable-requirement summary (per the plan doc's standing requirement)

**(a)** Full absolute path to this doc:
`/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/mississippi-vertical-slice-data-check.md`

**(b)** Full absolute path to the fixture file:
`/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/ms-official-roster-2026.ts`

**(c)** Exact, full, untruncated official Mississippi source URLs used:
- `https://sos.ms.gov/content/CandidateQualifying/default.aspx` (official Candidate Qualifying List — every candidate who filed for the March 10, 2026 federal primary, by office/district/party)
- `https://www.sos.ms.gov/content/documents/elections/2026/republican%20primary%202026.pdf` (Official Recapitulation, Republican Federal Primary Election, 9-page county-by-county results PDF, all 82 counties)
- `https://www.sos.ms.gov/content/documents/elections/2026/Recap%20report%20Democratic%20Primary%202026.pdf` (Official Recapitulation, Democratic Federal Primary Election, 17-page county-by-county results PDF, all 82 counties — NOT the naive `democratic%20primary%202026.pdf` URL, which 404s)
- `https://www.house.gov/representatives` (incumbency cross-check, "By State and District" tab, Mississippi section)
- `https://www.senate.gov/senators/senators-contact.htm` (incumbency cross-check, confirms Cindy Hyde-Smith (R-MS) as the sitting senator for the Class 2 seat up in 2026)
- `https://www.sos.ms.gov/sites/default/files/elections/2026%20Elections%20Calendar.pdf` (official 2026 Mississippi Elections Calendar, 16 pages — source for the calendar dates in section (e) below)

**(d)** Operational-navigation section — see below.

**(e)** Every still-governing calendar date — see below.

## Bottom line

**GO on the approach for a fifteenth state.** All 4 MS House districts plus
the US Senate race render correctly end-to-end when
`OFFICIAL_ROSTER_ENABLED` is on, verified against the real Neon staging
branch through the actual `lookupChallengers` code path — 0 mismatches
across all 5 contests.

**Mississippi is not Civix-vended.** Its Secretary of State runs its own
static `.gov` candidate-qualifying app (ASP.NET) plus PDF county-by-county
results reports — no `*.civixapps.com` portal, the Civix playbook does not
apply. The site does sit behind a WAF that returns HTTP 403 to a bare
`curl`/`WebFetch` request (including the results PDFs fetched directly) — a
real rendered Chrome session was required throughout, for a different
reason than TX's Civix 403 (JS SPA) but the same practical consequence
(browser automation, not a plain fetch tool).

**Post-primary nominees had to be DERIVED from image-only results PDFs, not
read directly.** Both the Republican and Democratic county-recapitulation
PDFs are canvas/image-rendered — confirmed via both `get_page_text`
(returns nothing) and a direct `pypdf` extraction attempt on a locally
saved copy (no text layer). Every contested primary's statewide winner was
read visually (zoomed screenshots across all 82 counties per party) and
cross-verified against each PDF's own printed statewide TOTAL row on the
final data page — spot-checked by hand-summing one candidate's 82 county
cells against that printed total (Sarah Adlakha, US Senate REP: matched
exactly, 30,344).

**No `runoff_pending` rows** — every contested congressional primary
cleared an outright majority on March 10, 2026 (closest: US House D2
Republican, Ron Eller 51.1% vs. Kevin Wilson 48.9%), so Mississippi's April
7, 2026 runoff was never triggered for any federal race.

## How this was verified

1. Fetched the official Candidate Qualifying List
   (`sos.ms.gov/content/CandidateQualifying/default.aspx`) via a rendered
   browser session (a bare `WebFetch` of the parent
   `/elections-voting/candidate-qualifying-list` page returns only the
   static shell, not the list itself) — this gave the full pre-primary
   filer set for all 4 House districts and the Senate race, by party.
2. Determined the actual general-ballot nominee for every CONTESTED
   primary by reading the official county-recapitulation PDFs (image-only,
   no text layer — see Bottom line above) via zoomed browser screenshots
   across all 82 counties, for both the Republican and Democratic PDFs.
   Every contested race's own printed statewide TOTAL row (present on the
   final data page after all counties) was used as the authoritative
   figure, spot-verified by an independent hand-sum of one full candidate
   column. Uncontested primary seats (MS House D1 REP/Trent Kelly, D3
   REP/Michael Guest, D3 DEM/Michael A. Chiaradio) and no-primary
   Libertarian/Independent filers needed no vote tally — the sole filer is
   the nominee.
3. Statewide vote totals for every contested federal race (winner in
   **bold**):

   | Race | Candidate | Votes | % |
   |---|---|---:|---:|
   | US Senate (R) | **Cindy Hyde-Smith** | 127,852 | 80.8% |
   | | Sarah Adlakha | 30,344 | 19.2% |
   | US Senate (D) | **Scott Colom** | 109,817 | 72.9% |
   | | Priscilla W. Till | 28,075 | 18.6% |
   | | Albert R. Littell | 12,749 | 8.5% |
   | US House D1 (D) | **Cliff Johnson** | 18,051 | 63.4% |
   | | Kelvin Buck | 10,426 | 36.6% |
   | US House D2 (R) | **Ron Eller** | 12,881 | 51.1% |
   | | Kevin Wilson | 12,337 | 48.9% |
   | US House D2 (D) | **Bennie G. Thompson** | 64,334 | 86.4% |
   | | Evan Littleton Turnage | 9,249 | 12.4% |
   | | Pertis Herman Williams III | 917 | 1.2% |
   | US House D4 (R) | **Mike Ezell** | 39,564 | 84.1% |
   | | Sawyer Walters | 7,484 | 15.9% |
   | US House D4 (D) | **Jeffrey Hulum III** | 11,046 | 57.7% |
   | | Paul James Blackman | 5,309 | 27.7% |
   | | D. Ryan Grover | 2,799 | 14.6% |

4. Cross-checked incumbency against two independent official sources,
   never guessed from either MS source or this app's FEC-derived
   `candidates` table: `house.gov`'s "By State and District" member
   directory (Mississippi section — Kelly D1, Thompson D2, Guest D3, Ezell
   D4) and `senate.gov`'s senator-contact directory (Hyde-Smith, Class 2
   seat). **Result: a clean case**, like Indiana's — every one of
   Mississippi's 4 sitting US Representatives and its sitting senator
   filed for and won their own party's primary in the same seat they
   currently hold. No cross-district or redistricting complications.
5. Assembled `MS_HOUSE_ROSTER_2026` (12 rows: 4 districts × 3 filers each
   — one per major party plus one minor-party/independent) and
   `MS_SENATE_ROSTER_2026` (3 rows: REP, DEM, IND) and registered both in
   `scripts/ingest/official-roster.ts`'s `FIXTURES["MS"]`.
6. **`npm run check` (lint + `tsc --noEmit` + full vitest suite): clean.**
   162 test files, 3,186 of 3,189 tests passed; the 3 failures
   (`scripts/design/capture-shared.test.ts`) are a pre-existing
   Playwright/Chromium headless-launch permission issue caused by this
   session's sandbox — confirmed unrelated by re-running that file with
   the sandbox disabled, where all 3 pass cleanly. No MS/official-roster
   code touches that file.
7. **Credential confirmed working.** `ROSTER_STAGING_DATABASE_URL`
   retrieved via a fresh `vercel env pull --environment=preview` (project
   linkage copied from the main checkout's existing `.vercel/project.json`
   into this worktree), read inline via a single `grep`/`cut` command
   substitution — never `source`d, never echoed — confirmed non-empty
   (147 characters) before use.
8. **Staging import: done, twice, confirmed by direct row-count query both
   times — no ambient/production `DATABASE_URL` ever used.**
   - Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state MS` → `upserted=15`.
   - Queried `SELECT office, count(*) FROM official_roster_candidates
     WHERE state='MS' GROUP BY office` directly against staging →
     `house=12, senate=3` (15 total, matching the fixture exactly).
   - Re-ran the same import command a second time → `upserted=15` again,
     then re-queried the row count → still `house=12, senate=3`
     (idempotent upsert confirmed, not a duplicate insert).
9. **End-to-end check against staging, flag on:** called
   `lookupChallengers` directly (the real production code path, not a
   mock) for all 4 MS House districts and the Senate race, against
   staging with `OFFICIAL_ROSTER_ENABLED=1`, and compared the app's
   literal output candidate-by-candidate against the fixture. **Result: 0
   mismatches across all 5 contests** — every challenger name matched
   exactly, every sitting incumbent was correctly excluded from their own
   seat's challenger list (Kelly/D1, Thompson/D2, Guest/D3, Ezell/D4,
   Hyde-Smith/Senate). The staging `DATABASE_URL` and
   `OFFICIAL_ROSTER_ENABLED` flag were both set inline for this
   verification command only, never written to a persisted env file, and
   both scratch verification scripts plus the pulled `.env.preview.ms`
   credential file were deleted immediately after use (not committed).
10. Added 12 new test cases to `src/lib/server/officialRoster.test.ts`
    (`getOfficialRoster — MS narrowing`, `isIncumbentSeekingReelection —
    MS`, `lookupChallengers — MS wiring`), mirroring the existing
    TX/OK/ME two-chamber coverage pattern. 153/153 tests pass in that
    file alone.

## Operational-navigation section (per item (d))

Mississippi's official source is NOT a single portal but three distinct
pieces, each needing a different navigation approach:

1. **Candidate Qualifying List** — `sos.ms.gov/content/CandidateQualifying/default.aspx`,
   an older ASP.NET app embedded under the newer `sos.ms.gov` Drupal site.
   The modern-looking parent page
   (`/elections-voting/candidate-qualifying-list`) is just a wrapper —
   fetching it directly (or via a markdown-conversion fetch tool) returns
   only static boilerplate text ("This list is updated once daily after
   5:00 p.m.") with no actual candidate data; the real content only
   renders inside a live browser session. Once rendered, the list is
   organized by office (US Senate, US House D1-D4) and, within each
   office, by party — straightforward to read directly, no filters or
   pagination needed.
2. **County-recapitulation results PDFs** — found via the results landing
   page (`elections-voting/election-results/2026/march-10-2026-republican-primary-results`
   and the equivalent `-democratic-` page), each of which embeds a link
   labeled "2026 Republican/Democratic Primary Election Results" leading
   to the actual PDF. **The naive URL pattern doesn't hold across
   parties** — the Republican file is
   `.../elections/2026/republican%20primary%202026.pdf` but the
   Democratic file is `.../elections/2026/Recap%20report%20Democratic%20Primary%202026.pdf`,
   a materially different filename; the real URL had to be captured via
   `read_network_requests` after clicking the link in a live browser
   session, not guessed. Both PDFs 403 on a bare `curl`/`WebFetch`
   request (WAF-protected) and are canvas/image-rendered once loaded (no
   extractable text layer, unlike Oklahoma's candidate-list PDF) — every
   county's vote totals had to be read visually via zoomed screenshots,
   not parsed as text. This is a materially heavier lift than a
   text-layer PDF or a server-rendered HTML results page (OK's pattern);
   flagging it here so a future MS re-check or a similarly-structured
   state's build doesn't re-discover this cold.
3. **Incumbency cross-check** — `house.gov/representatives`'s "By State
   and District" tab and `senate.gov/senators/senators-contact.htm`, both
   standard patterns already used by prior states' builds; no MS-specific
   navigation quirks.
4. **Election calendar** — `sos.ms.gov/sites/default/files/elections/2026%20Elections%20Calendar.pdf`,
   linked from the `sos.ms.gov/yall-vote` page (not from the elections
   results/FAQ sections directly — had to be found via the SOS site's own
   search). Unlike the two results PDFs above, this document DOES carry a
   real, `pypdf`-extractable text layer, making a full-text keyword search
   across all 16 pages straightforward once downloaded.

## Standing calendar dates (per the plan doc's requirement (e))

Pulled directly from the official 2026 Mississippi Elections Calendar
(`https://www.sos.ms.gov/sites/default/files/elections/2026%20Elections%20Calendar.pdf`),
searched in full across all 16 pages:

- **No candidate-withdrawal-deadline entry exists anywhere in this
  calendar** — a genuine negative finding after a full-text,
  case-insensitive search for "withdraw", "declin-", "resign", "vacanc-",
  and "removed from the ballot" across all 16 pages, confirmed by two
  independent read attempts. Unlike Indiana/Alaska/Delaware's builds,
  which each found an explicit statutory withdrawal window, Mississippi's
  own official calendar simply does not name one. Recorded here so a
  future re-check doesn't waste time re-deriving this.
- **September 9, 2026** — General Election Sample Ballot Deadline: MSOS
  publishes a sample of the official November General Election Ballot in
  SEMS (Miss. Code Ann. § 23-15-367(3)).
- **September 19, 2026** — statutory absentee-ballot-availability date:
  absentee ballots must be available in the Circuit Clerk's offices, and
  must be mailed to all voters who applied before ballots become available
  (Miss. Code Ann. § 23-15-715(b)). This is the closest MS equivalent to
  the ~45-days-before-general UOCAVA milestone other states' calendars
  label more explicitly, and is used as this build's `NOT BEFORE` re-check
  trigger date.

**Dated re-check card opened** (per the epic's NOT-BEFORE date-gate
convention, `c5a813bb`): "[P2] Re-check official roster: Mississippi (MS)
— after absentee-ballot-availability date", `NOT BEFORE: 2026-09-19`.

## Files changed

- `scripts/congressional-rosters/ms-official-roster-2026.ts` (new)
- `scripts/ingest/official-roster.ts` (MS import + FIXTURES entry, both
  chambers)
- `src/lib/server/officialRoster.test.ts` (MS test coverage)
- `docs/operations/voter-choice-backlog.md` (STATUS flip, done as a
  separate commit before this build per the claim-safely protocol; plus
  the new dated re-check card added as part of this build)
- This doc (new)

No database migration — `ballot_status` remains a plain `text` column with
no CHECK constraint (unchanged since migration 0016). No new party code or
`OfficialBallotStatus` value was needed (Mississippi's contested field used
only existing REP/DEM/LIB/IND codes and `qualified_for_general_ballot`). No
production mutation. `OFFICIAL_ROSTER_ENABLED` was never set anywhere
persistent — only inline, for the staging verification command in step 9
above.
