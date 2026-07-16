# Pennsylvania vertical slice — built and verified live (official-source pipeline)

Card: `[P0] Import + verify official roster: Pennsylvania (PA)`, parent epic
`c5a813bb` (nationwide official-source congressional roster). Nineteenth
state built through this manual track, after Arizona, Texas, Oklahoma,
Alabama, Alaska, Colorado, Connecticut, California, Arkansas, Delaware,
Florida, Hawaii, Louisiana, Maine, Indiana, Georgia, Iowa, Kansas, Idaho,
Maryland, and Kentucky. No prior F03/I06/I11 rehearsal covered Pennsylvania —
this build's source research started cold, exactly as AZ/TX/OK originally
did.

Date: 2026-07-16. Pennsylvania's 2026 primary (May 19, 2026) has **already
occurred, and is already formally certified** — the Secretary of the
Commonwealth's press release "Secretary of the Commonwealth Certifies 2026
Primary Election Results" is dated June 17, 2026 (a full month before this
build). The general election is 2026-11-03. Pennsylvania has **no US Senate
contest in 2026**.

## Bottom line

**GO on the approach for a nineteenth state.** All 17 PA US House districts
render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on, verified
against the real Neon staging branch through the actual `lookupChallengers`
code path — **0 mismatches across all 17 contests.**

**Pennsylvania is NOT Civix-vended.** Its official election authority is the
Department of State's Bureau of Elections. The results portal
(`electionreturns.pa.gov`) is a Commonwealth-branded Angular-ish SPA (raw
HTML carries unrendered `{{electionDate}}`-style template placeholders, but
renders cleanly via browser automation) and the candidate database
(`pavoterservices.pa.gov/ElectionInfo`) is an older ASP.NET/DataTables site —
neither matches the `<subdomain>.<state>elections.civixapps.com` URL pattern
or "POWERED BY gocivix.com" footer from the Civix playbook. Direct `WebFetch`
worked for every static `pa.gov` calendar/PDF page; the two dynamic sites
above needed browser automation (`mcp__claude-in-chrome__*`).

**Pennsylvania's primary results are already formally certified** (unlike
most prior "general"-stage states in this track, which recorded nominees
per unofficial election-night numbers because no distinct certification
document existed yet) — every major-party nominee below is recorded
`qualified_for_general_ballot` on that stronger basis.

**CD3 is Pennsylvania's sole open seat, and its sole district without a
Republican nominee**: incumbent Dwight Evans is NOT a candidate in any of
CD3's Democratic primary filings (confirmed by name-search against
house.gov's member directory, not inferred) — and no Republican ever filed
for CD3 at all (confirmed: zero CD3 Republican rows across all 48
"Representative in Congress" candidate-database entries, and the official
write-in report shows only "Scattered" Republican write-in votes for CD3, no
named candidate qualifying). CD3's general ballot is Chris Rabb (D)
unopposed by a major party.

**Two seats flipped party in the 2024 cycle, and the CURRENT sitting member
(not who held the seat previously) is the correct incumbent**: CD7 (Ryan
Mackenzie, R, unseated Susan Wild in 2024) and CD8 (Rob Bresnahan Jr., R,
unseated Matt Cartwright in 2024) — both confirmed via house.gov's
directory and marked `isIncumbent: true` on their own 2026 unopposed
primary row, not their Democratic predecessor.

**No independent, minor-party, or write-in candidate has qualified for the
general ballot in any district yet** — Pennsylvania's own election calendar
sets August 3, 2026 as the deadline to file nomination papers (the
independent/minor-party route), still in the future as of this build. This
was cross-checked three ways (candidate database, official write-in PDF,
official post-primary withdrawal list), not just checked for absence — see
the operational write-up below.

**NO-GO on flipping the flag for real users** without Muxin's sign-off —
same standing gate as every prior state in this track.

## How this was verified — operational-navigation write-up

1. **Source discovery.** `vote.pa.gov`'s old URL structure 302-redirects to
   the new `pa.gov` Department of State site
   (`https://www.pa.gov/agencies/dos`). From there, "Voting & Elections" →
   "Election Results" links to `https://www.electionreturns.pa.gov/`, the
   official statewide results portal — its "Offices" menu lists
   "Representative in Congress" but no US Senate office for 2026, an
   independent confirmation (beyond `src/data/states/PA.json`'s own notes)
   that PA has no 2026 Senate race. This portal is a rendered SPA (its raw
   HTML has `{{electionDate}}`/`{{electionName}}` template placeholders
   unrendered when fetched statically) but loads cleanly with browser
   automation and carries no Civix branding anywhere — "COPYRIGHT © 2026
   COMMONWEALTH OF PENNSYLVANIA. ALL RIGHTS RESERVED." in the footer, no
   `gocivix.com` reference.
2. **Certified primary results, one page for all 17 districts.** Clicking
   "Offices" → "Representative in Congress" on the results portal navigated
   to a single `OfficeResults` page
   (`?officeId=11&ElectionID=117&ElectionType=P&IsActive=1`) listing every
   one of the 17 districts, both parties, with exact vote percentages —
   unusually convenient compared to prior Civix-vended states, which needed
   per-district queries. `get_page_text` captured the full page in one call.
3. **CD3's discrepancy resolved candidate-by-candidate, not assumed.** The
   certified results showed only 4 CD3 Democratic candidates (Stanford,
   Street, Rabb, Griffith) summing to exactly 100% of the vote, but PA's
   separate candidate database (`pavoterservices.pa.gov/ElectionInfo`,
   filtered to Office = "Representative in Congress") listed 5 additional
   CD3 Democratic names with no primary-win flag. Each of the 5 was checked
   individually via its own `CandidateInfo.aspx?ID=<n>` detail page:
   Jamillah Naderah Griffin (`Candidate-Status: Withdrawn`, "Candidate
   Withdrew," 2026-03-25), Dave Oxman (same, 2026-03-25), Karl Morris
   (`Withdrawal Reason: Removed from Ballot`, 2026-03-31), Cole Carter
   (same reason, 2026-04-06), and Morgan B Cephas (`Withdrawal Reason:
   Withdrawn by Petition`, 2026-04-14) — all five withdrew or were removed
   from the ballot before the May 19 primary, none appears in the certified
   results, and none is a general-ballot candidate. This is the mechanism
   the epic's SAFETY rule about not guessing exists for: a raw filing list
   is not a certified roster, and the discrepancy had to be resolved
   candidate-by-candidate rather than assumed away.
4. **Confirming zero independent/minor-party/write-in qualifiers, three
   independent ways** (not just "checked the obvious place and stopped"):
   (a) the candidate database's "Representative in Congress" filter returns
   exactly 48 total rows (43 who appear in the certified results + the 5
   CD3 withdrawals/removals above) — every single row has `Candidate Type:
   Petition` (PA's primary-ballot route) and Party = Democratic or
   Republican; zero `Nomination Papers` filings (PA's distinct
   independent/minor-party route) exist yet. (b) The official "2026 Primary
   Election Write-In Votes" PDF
   (`write-in votes_2026 primary for website .pdf`, extracted via `pypdf`
   after `WebFetch` couldn't parse the raw PDF binary) shows a dedicated "US
   Congress" page with only "Scattered" vote totals for both parties in
   every one of the 17 districts — no named write-in candidate crossed the
   threshold for individual reporting, including CD3 (145 Democratic /
   519 Republican scattered write-ins, still no named GOP candidate). (c)
   The official "2026 Post-Primary Candidate Withdrawal List" PDF (report
   dated 6/29/2026) lists exactly 2 withdrawn candidates statewide, both
   state Senate seats (26th and 46th Senatorial Districts) — zero
   congressional withdrawals after the primary.
5. **Incumbency cross-checked against house.gov, not the app's own FEC
   table.** `https://www.house.gov/representatives` → "By State and
   District" tab (a long, lazy-loading single page — had to `scroll_to` an
   element reference near Pennsylvania's section before its rows populated
   the DOM, the same lazy-load behavior noted in the Civix playbook for a
   different reason). Every PA row was read directly from this table and
   matched to the certified-results winner by surname, not by district
   number alone (per the TX Al Green / FL redistricting lesson) — this is
   what surfaced Dwight Evans's absence from CD3 and confirmed the CD7/CD8
   party-flip incumbents.
6. **Governing calendar dates**, pulled from
   `https://www.pa.gov/agencies/vote/elections/upcoming-elections`'s "2026
   Election Important Dates to Remember" table (plain HTML, no PDF needed
   for the summary version) — see the dedicated section below.
7. **Fixture built**, `scripts/congressional-rosters/pa-official-roster-2026.ts`,
   33 rows (17 districts, all `qualified_for_general_ballot`; CD3 has only
   one row — no Republican). Registered in
   `scripts/ingest/official-roster.ts`'s `FIXTURES` map. No migration
   needed — `db/schema.ts`'s `official_roster_candidates.ballot_status` is
   plain `text`, no CHECK constraint, and no migration has been needed since
   0016.
8. **Tests added**, mirroring the AZ/TX/OK/AL/.../MD/KY coverage in
   `src/lib/server/officialRoster.test.ts`: `getOfficialRoster` district
   narrowing across all 17 districts, the CD3 open-seat/no-Republican case,
   `isIncumbentSeekingReelection` for all 16 incumbents plus the CD3
   false-case, and `lookupChallengers` wiring for CD1 (incumbent excluded)
   and CD3 (open seat, sole filer renders). 203 tests pass.
9. **Staging import + direct row-count verification** (never production —
   see Verification below).
10. **End-to-end verification**: `lookupChallengers` called directly — the
    real code path a request hits — for all 17 PA House districts, against
    staging with `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate
    against the fixture.

## Verification

- **Credential**: worktree linked fresh to the Vercel project
  (`vercel link --yes --team team_wcZcXmcIrl0BMLBcn3UzI397 --project prj_6lbWH8MbpN66FNhgagoOweqXB6ou`,
  matching the main checkout's `.vercel/project.json`, since this worktree
  had no prior link) and pulled a fresh credential via `vercel env pull
  --environment=development` to a scratch file outside `.env.local`,
  confirmed non-empty (146 characters) and `postgresql:`-prefixed before
  use; the scratch file was deleted immediately after use.
- **`npm run check` equivalent**: `npx tsc --noEmit` clean (0 errors);
  `npx eslint` on all three changed/new files clean (0 errors); `npx
  prettier --write` on all three files reported "unchanged" (already
  correctly formatted); `npx vitest run src/lib/server/officialRoster.test.ts`
  — **203 tests passed, 0 failed.**
- **Staging import: done, twice, confirmed by direct row-count query both
  times — no ambient/production `DATABASE_URL` ever used.**
  1. Ran `DATABASE_URL=<staging> npx tsx scripts/ingest/official-roster.ts
     --state PA` — importer reported `upserted=33`. Direct row-count query
     (`select district, office, name, party, is_incumbent, ballot_status
     from official_roster_candidates where state = 'PA'`, via a scratch
     script using the same Neon client the app uses — not just the
     importer's own log line) returned exactly **33 rows**, matching the
     fixture row-for-row (verified name/party/incumbency/ballotStatus for
     every row).
  2. Re-ran the identical import a second time (idempotency check) —
     importer again reported `upserted=33`. Direct row-count query again:
     **33 — not doubled.**
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly for all 17 PA House districts, against staging with
  `OFFICIAL_ROSTER_ENABLED=1`. Diffed candidate-by-candidate against the
  fixture. **0 mismatches across all 17 contests.** Full literal output:

  ```
  PA-01 (incumbent Brian Fitzpatrick excluded): Bob Harvie
  PA-02 (incumbent Brendan F. Boyle excluded): Jessica Arriaga
  PA-03 (incumbent none — open seat): Chris Rabb
  PA-04 (incumbent Madeleine Dean excluded): Aurora Stuski
  PA-05 (incumbent Mary Gay Scanlon excluded): Nick Manganaro
  PA-06 (incumbent Chrissy Houlahan excluded): Marty Young
  PA-07 (incumbent Ryan Mackenzie excluded): Bob Brooks
  PA-08 (incumbent Rob Bresnahan Jr. excluded): Paige Cognetti
  PA-09 (incumbent Dan Meuser excluded): Rachel Wallace
  PA-10 (incumbent Scott Perry excluded): Janelle Stelson
  PA-11 (incumbent Lloyd K. Smucker excluded): Nancy Mannion
  PA-12 (incumbent Summer Lee excluded): James Hayes
  PA-13 (incumbent John Joyce excluded): Beth Farnham
  PA-14 (incumbent Guy Reschenthaler excluded): Alan Bradstock
  PA-15 (incumbent Glenn "GT" Thompson excluded): Ray Bilger
  PA-16 (incumbent Mike Kelly excluded): Justin Wagner
  PA-17 (incumbent Chris Deluzio excluded): Tony Guy
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`. Every district's Senate-challenger count
  returned 0 (no PA Senate fixture rows registered — correctly, no PA
  Senate contest exists in 2026).
- Prod database untouched throughout — every command that touched a
  database used the freshly-pulled staging credential explicitly, never
  the ambient `DATABASE_URL`. `OFFICIAL_ROSTER_ENABLED` was only ever set
  inline for the verification commands above; it is not set anywhere
  persistent (not `.env.local`, not Vercel, not any committed file).

## Runoff-pending check (standing requirement, every state)

No `runoff_pending` seats found and none possible — Pennsylvania has no
congressional primary-runoff mechanism; primary nominees are decided by
plurality in a single round (confirmed via the official 2026 Election
Calendar, which lists no runoff date or procedure for federal office; CD3's
4-way Democratic primary and CD7's 4-way Democratic primary were both
resolved by plurality, per the certified results).

## Known gaps (explicit, not guessed — per the epic's SAFETY rule)

- **The August 3, 2026 nomination-papers deadline has not yet passed** —
  Pennsylvania's independent/minor-party route onto the general ballot is
  still open. This fixture reflects zero such filers as of 2026-07-16;
  a late filer for any of the 17 districts (including a Republican
  candidate for CD3, still theoretically possible via this route) would
  not yet appear here.
- **The August 10, 2026 objections-to-nomination-papers deadline has not
  yet passed** — any nomination-papers filer who does appear by August 3
  could still be successfully challenged and removed before this date.
- **The August 10, 2026 candidate-withdrawal deadline (both tracks) has not
  yet passed** — per the epic's 2026-07-16 candidate-withdrawal-deadline
  standing requirement, any of this fixture's 33 major-party nominees could
  still withdraw without a court order up to this date. This is a
  materially different risk than an undetermined nomination: it would
  REMOVE an already-`qualified_for_general_ballot` row, not resolve one
  still open.
- **Pennsylvania's calendar names no distinct later "ballot content
  certification" date** beyond August 10 — county boards begin final
  ballot preparation once the post-nomination-papers withdrawal window
  closes, so August 10 functions as PA's practical lock date for this
  cycle's roster.

## Governing calendar dates (per the plan doc's standing requirement, item e)

Pulled directly from Pennsylvania's official "2026 Election Important Dates
to Remember" table
(`https://www.pa.gov/agencies/vote/elections/upcoming-elections`, retrieved
2026-07-16):

- **May 19, 2026 — Primary Election Day.** Resolves all 17 districts'
  major-party nominees (this fixture's `qualified_for_general_ballot` rows).
  Already passed.
- **June 17, 2026 — Secretary of the Commonwealth Certifies 2026 Primary
  Election Results** (per the Department of State's own press release).
  Already passed — this is the formal certification basis for this
  fixture's nominee rows, stronger than most prior "general"-stage states
  in this track had available.
- **August 3, 2026 — last day to circulate and file nomination papers**
  (Pennsylvania's independent/minor-party route onto the general ballot).
  **Not yet passed** — see Known Gaps above.
- **August 10, 2026 — last day to file objections to nomination papers.**
  **Not yet passed.**
- **August 10, 2026 — last day for withdrawal by candidates nominated by
  nomination papers, without a court order.** **Not yet passed.**
- **August 10, 2026 — last day for withdrawal by candidates nominated at
  the primary, without a court order.** This is the candidate-withdrawal
  deadline for all 33 major-party nominees in this fixture. **Not yet
  passed** — see Known Gaps above.
- **October 19, 2026 — last day to register before the November election.**
- **October 27, 2026 — last day to apply for a mail-in or absentee
  ballot.**
- **November 3, 2026 — General Election Day.**

**A dated re-check card was opened** in the backlog per the epic's "NOT
BEFORE DATE-GATE CONVENTION," anchored to **August 11, 2026** (the day
after every one of the still-open dates above — nomination papers,
objections, and both withdrawal tracks — has passed) — see
`docs/operations/voter-choice-backlog.md`'s "[P2] Re-check official roster:
Pennsylvania (PA) — after nomination-papers/withdrawal window" card.

## Deliverables (per the card's standing requirement)

- **This doc:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/pa-official-roster/docs/operations/pennsylvania-vertical-slice-data-check.md`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/pennsylvania-vertical-slice-data-check.md`
  once merged to main).
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/.claude/worktrees/pa-official-roster/scripts/congressional-rosters/pa-official-roster-2026.ts`
  (will live at
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/pa-official-roster-2026.ts`
  once merged to main).
- **Official Pennsylvania source URL(s) used:**
  - `https://www.electionreturns.pa.gov/Home/OfficeResults?officeId=11&ElectionID=117&ElectionType=P&IsActive=1`
    (official certified 2026 General Primary results — Representative in
    Congress, all 17 districts, both parties)
  - `https://www.pavoterservices.pa.gov/ElectionInfo/electioninfo.aspx`
    (2026 General Election candidate database, filtered to "Representative
    in Congress" — 48 total rows, used to resolve CD3's withdrawn/removed
    filers and confirm zero Nomination Papers filings exist yet)
  - `https://www.pavoterservices.pa.gov/ElectionInfo/CandidateInfo.aspx?ID=24039`,
    `?ID=22897`, `?ID=23876`, `?ID=23800`, `?ID=22717` (individual candidate
    detail pages confirming each of CD3's 5 withdrawn/removed filers'
    status and dates)
  - `https://www.pa.gov/agencies/vote/elections/upcoming-elections`
    ("2026 Election Important Dates to Remember" — full election calendar)
  - `https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/voting-and-elections/running-for-office/2026/petition-filing-2026/2026%20post-primary%20candidate%20withdrawal%20listing.pdf`
    (2026 Post-Primary Candidate Withdrawal List, report dated 6/29/2026 —
    0 congressional withdrawals)
  - `https://www.pa.gov/content/dam/copapwp-pagov/en/dos/programs/voting-and-elections/running-for-office/2026/write-in%20votes_2026%20primary%20%20for%20website%20.pdf`
    (2026 Primary Election Write-In Votes — "Scattered" only for US Congress
    in every district, both parties)
  - `https://www.pa.gov/agencies/dos` (Department of State newsroom —
    "Secretary of the Commonwealth Certifies 2026 Primary Election
    Results," dated June 17, 2026)
  - `https://www.house.gov/representatives` (member directory, incumbency
    cross-check, via browser automation — a long lazy-loading page)

## GO/NO-GO verdict

**GO.** The fixture, importer registration, and tests are complete,
reviewed, and pass cleanly: `npx tsc --noEmit` (0 errors), `npx eslint` (0
errors), `npx prettier --write` (unchanged — already correctly formatted),
and `npx vitest run src/lib/server/officialRoster.test.ts` (203 tests
passed, 0 failed). The card's GOAL_CONDITION's remaining requirements — a
direct row-count-verified staging import and an end-to-end
`lookupChallengers` check against staging with the flag on — are both done:
the importer ran against staging twice, confirmed by direct row-count query
both times (33 rows, no duplication on re-run), and the real code path was
called directly against staging with `OFFICIAL_ROSTER_ENABLED=1` for all 17
PA House districts, with **0 mismatches** against the fixture. Prod was
never touched — every database command used a freshly-pulled staging
credential, and `OFFICIAL_ROSTER_ENABLED` was only ever set inline for
verification, never persisted anywhere. Per the epic's "MERGE PROMPTLY, NO
SEPARATE SIGN-OFF GATE" standing requirement, this build is ready for
direct merge after self-vet.

Still open, same standing gate as every other state built through this
pipeline:

1. **Flag flip (prod cutover for PA and/or the other built states)** —
   human sign-off required. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A dated follow-up re-check is required after August 11, 2026**
   (the day after PA's nomination-papers filing, objections, and both
   withdrawal-deadline dates have all passed) — opened on the backlog per
   the NOT BEFORE date-gate convention.
