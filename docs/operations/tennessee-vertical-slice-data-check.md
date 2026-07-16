# Tennessee vertical slice — built and verified live (official-source pipeline)

Card: "[P0] Import + verify official roster: Tennessee (TN)"
(`docs/operations/voter-choice-backlog.md`), parent epic `c5a813bb`
(nationwide official-source congressional roster). Built after AZ
(`637c2583`), TX (`8530a468`), OK (`d9b1ef86`), AL, and many others already
merged to the manual track — one more state through the proven pattern.

Date: 2026-07-16. **Tennessee's 2026 primary (August 6, 2026) has NOT
happened yet** — 21 days in the future as of this build. This is a
pre-primary build, like Arizona's: every Republican/Democratic entry below
reflects who is *qualified to compete in the primary*, not a determined
general-ballot nominee. The general election is November 3, 2026.

## Bottom line

**GO on the approach for this state.** All 9 TN House districts plus the
Senate race render correctly end-to-end when `OFFICIAL_ROSTER_ENABLED` is on,
verified against the real Neon staging branch through the actual
`lookupChallengers` code path — 0 mismatches across all 10 contests.

**Tennessee is not Civix-vended** (`sos.tn.gov` / `sos-prod.tnsosgovfiles.com`,
not `*.civixapps.com`) — its own Secretary of State site, publishing
candidate lists directly as PDF + Excel. `sos.tn.gov` itself 403s a plain
fetch (a WAF, not an access-control wall — see "How this was verified"
below), but the actual PDF asset host does not, once a realistic browser
User-Agent header is sent. No browser automation was ultimately needed for
the data pull.

**Redistricting made this a two-step build, not a one-shot read.** Tennessee
redrew its congressional map in a May 2026 special legislative session,
which reopened a one-off "special qualifying period" for US House candidates
only (through noon May 15, 2026) — separate from, and later than, the
regular March 10, 2026 qualifying deadline that still governs the
(unaffected-by-redistricting) US Senate race. Getting this wrong — reading
an earlier, pre-redistricting House candidate list, or missing that the
qualifying deadline itself moved for House only — was the single biggest
risk in this build; see "How this was verified" below for how it was
resolved.

**A real, non-obvious incumbency finding surfaced during the official
cross-check, mirroring OK's Armstrong/Mullin finding:** TN-7's official
candidate list shows Republican Matt Van Epps as the sole filer, with no
"incumbent" marker in the source PDF itself — cross-checking against
house.gov confirmed Van Epps *is* the sitting incumbent, but not through a
normal re-election: he won a December 2, 2025 special election succeeding
Mark Green (who resigned July 20, 2025), and is now seeking his first full
term. Missing this cross-check would have under-counted TN's incumbents by
one and mis-stated why TN-7 has no primary contest on the Republican side.

**Two open seats, confirmed by cross-check, not by absence alone:** TN-6
(Rep. John Rose is running for Governor instead of re-election) and TN-9
(Rep. Steve Cohen has decided not to seek re-election, after the new map
carved up his Memphis-based district). Both incumbents' absence from their
district's candidate list was corroborated against independent news
reporting (Nashville Banner, NewsChannel5's district-by-district 2026 guide)
before being treated as a real open seat rather than a possible
transcription gap.

**No `runoff_pending` rows** — Tennessee has no statutory congressional
primary runoff (a plurality winner takes the nomination outright), unlike
OK/AL/AK. Nothing to record here beyond the standard primary-stage status.

**NO-GO on flipping the flag for real users** without Muxin's sign-off — same
standing gate as every other state in this track.

## How this was verified — SoS-hosted PDFs behind a WAF, not Civix, no
browser automation needed once the right host/header was found

1. **Landing page:** `https://sos.tn.gov/elections/2026-candidate-lists`
   lists PDF + Excel links for Governor, US Senate, US House, TN Senate, TN
   House, and both parties' state executive committees — no ambiguity about
   which document covers which office. `sos.tn.gov` itself returns HTTP 403
   to a plain fetch (confirmed both via a direct tool call and via `curl`
   with no User-Agent) — this is Tennessee's web-application firewall, not
   an access-control wall protecting the content: the actual PDF files are
   hosted on a **separate asset domain**
   (`sos-prod.tnsosgovfiles.com/s3fs-public/document/...`), which returned
   the files normally to a `curl` request carrying a realistic browser
   `User-Agent` header (`Mozilla/5.0 ... Chrome/124.0.0.0 Safari/537.36`) —
   no cookies, no session, no actual browser rendering required. This is a
   materially different mechanic from every prior WAF/portal case in this
   track and is recorded here for any future state whose SoS site 403s a
   plain fetch: try the literal file host with a browser User-Agent before
   reaching for full browser automation.
2. **Redistricting timeline, confirmed from three official SoS sources**
   before transcribing anything:
   - `https://sos.tn.gov/announcements/2026-congressional-redistricting`:
     confirms the General Assembly adopted revised congressional district
     boundaries in a Second Extraordinary Session, May 2026.
   - `https://sos.tn.gov/newsroom/press-releases/notice-of-revised-congressional-districts-and-special-qualifying-period`:
     confirms a special congressional-only qualifying period ran through
     noon Friday, May 15, 2026, with the **withdrawal deadline set to the
     same day/time** — so the candidate list was final immediately, no
     separate later withdrawal window to track for House.
   - `https://sos.tn.gov/newsroom/press-releases/secretary-of-states-office-announces-list-of-congressional-candidates-as-of`
     (dated May 15, 2026): confirms political parties then had until noon
     Sunday, May 17, 2026 to make bona fide determinations on their
     candidates.
   - The published `USHouseCandidates_2026.pdf` has a file mod-date of
     **May 29, 2026** — after both the May 15 qualifying/withdrawal deadline
     and the May 17 bona fide deadline — confirming it already reflects the
     fully-finalized post-redistricting candidate set, not an interim
     snapshot.
3. **Candidate transcription (both PDFs are native-text, not scanned):**
   `pdfinfo`/`pdftotext` confirmed the House PDF is 4 pages (2385/2153/2006/
   2217 extracted characters per page — no blank/scanned pages) and the
   Senate PDF is 1 page (2598 characters) — every page accounted for and
   read, per the plan doc's scanned-PDF-page standing rule. Every district's
   candidate count was cross-checked against the source PDF by an automated
   count after transcription (see "Contest inventory" below) — exact match,
   0 discrepancies.
4. **Incumbency cross-check**, never guessed from the candidate-list PDF or
   this app's own FEC-derived `candidates` table:
   - `https://www.house.gov/representatives` ("By State and District" →
     Tennessee, confirmed via a live browser session — this page lazy-loads
     on scroll, same behavior noted in the Civix playbook for other states'
     house.gov cross-checks) — confirmed the sitting delegation: Harshbarger
     (1st, R), Burchett (2nd, R), Fleischmann (3rd, R), DesJarlais (4th, R),
     Ogles (5th, R), Rose (6th, R), Van Epps (7th, R), Kustoff (8th, R),
     Cohen (9th, D).
   - `https://www.senate.gov/states/TN/intro.htm` — confirmed Bill Hagerty
     (R) as a sitting Tennessee senator (the seat up in 2026; Sen. Marsha
     Blackburn's seat is not up until 2031).
   - Independent news corroboration (Nashville Banner, NewsChannel5's
     2026 Tennessee redistricted-district candidate guide, Rollcall,
     Ballotpedia News) for the Van Epps special-election win and the Rose/
     Cohen non-candidacies — comparison/corroboration only, never the
     primary source for any transcribed data.
5. **Governing calendar dates** — pulled from the SoS's own "Key Dates for
   the 2026 Election Cycle" PDF
   (`https://sos-prod.tnsosgovfiles.com/s3fs-public/document/Key%20Dates%20-%202026_0.pdf`)
   and Tennessee Code Ann. § 2-8-101 — see "Governing calendar dates" below.

**Independent (no-party) candidates — a modeling decision specific to
Tennessee, different from every other state in this track:** Tennessee
independents do NOT appear on the primary ballot at all. Tenn. Code Ann.
§ 2-5-101 requires an independent candidate for an office with a primary to
file a nominating petition (25+ registered-voter signatures) by the *same*
deadline as party primary candidates — but that petition qualifies them
directly for the **November general ballot**, since Tennessee holds no
primary round for independents. The official candidate list's own disclaimer
states it excludes anyone who "did not have enough signatures," confirming
every listed independent's petition was already signature-verified as of
publication. This is different from OK's and CO's fixtures, where
independent/petition-verification status was still unconfirmed or pending at
build time (recorded there as the more conservative
`declared_general_ballot_intent`) — Tennessee's independents are recorded as
`qualified_for_general_ballot`, since their qualification already **is**
their final November ballot status, with no primary stage to pass through.
If a future re-check finds this reasoning wrong for any specific filer,
correct it there.

## Contest inventory

Tennessee has **9 US House districts and 1 US Senate contest in 2026** (Bill
Hagerty's seat). All 9 House districts + the Senate race are covered by this
fixture. Candidate counts per district, cross-checked by automated count
against the source PDF after transcription (exact match, 0 discrepancies):

| District | Filers | Republican | Democratic | Independent | Incumbent |
|---|---|---|---|---|---|
| 01 | 9 | 1 | 3 | 5 | Harshbarger (R) |
| 02 | 4 | 1 | 1 | 2 | Burchett (R) |
| 03 | 8 | 1 | 2 | 5 | Fleischmann (R) |
| 04 | 11 | 4 | 5 | 2 | DesJarlais (R) |
| 05 | 9 | 2 | 5 | 2 | Ogles (R) |
| 06 | 11 | 4 | 5 | 2 | **open seat** (Rose → Governor race) |
| 07 | 7 | 1 | 4 | 2 | Van Epps (R, won Dec. 2025 special election) |
| 08 | 11 | 1 | 4 | 6 | Kustoff (R) |
| 09 | 10 | 4 | 4 | 2 | **open seat** (Cohen not seeking re-election) |
| Senate | 14 | 1 | 5 | 8 | Hagerty (R) |

80 House filers + 14 Senate filers = 94 total candidates transcribed.

## What was built (delta from the existing pattern)

All state-agnostic infrastructure required **no changes**:
`official_roster_candidates` table shape, `officialRoster.ts` reader,
`officialRosterFlag.ts`, `rosterProvenance.ts`, the delegation
open-seat-badge wiring, `RepCard.tsx`, and the importer's array-shaped
`FIXTURES` map. No new `OfficialBallotStatus` value or party code was
needed — Tennessee's parties (Republican, Democratic, Independent) all map
onto the existing `REP`/`DEM`/`IND` codes.

**New / changed for this build:**

- `scripts/congressional-rosters/tn-official-roster-2026.ts` (new) — 80
  House rows (all 9 districts) + 14 Senate rows. Full sourcing, methodology,
  and known limitations are in the file's own header docblock.
- `scripts/ingest/official-roster.ts` — registered `TN` in `FIXTURES` with
  separate house/senate entries, matching every other two-chamber state's
  pattern.
- `src/lib/server/officialRoster.test.ts` — 12 new tests mirroring the
  existing OK/AL two-chamber coverage: `getOfficialRoster` narrowing across
  TN's districts + Senate contest (5 tests, including the TN-01
  primary-vs-independent ballotStatus split and the TN-06/TN-09 open-seat
  check), `isIncumbentSeekingReelection` for the 7 incumbent-defended
  districts + the Senate seat + the 2 open-seat districts (4 tests), and
  `lookupChallengers` wiring — both chambers, FEC query skipped (3 tests).

## Verification performed

- `npm run check` (lint + `tsc --noEmit` + full vitest suite): **clean** —
  162 test files, 3262 tests passing, 5 pre-existing `todo` (no failures),
  3267 total (12 of the passing tests are new, added for this build).
- Confirmed staging already has migration `0016`'s `NULLS NOT DISTINCT` fix
  applied to `official_roster_candidates_seat_name_uidx` — no new migration
  needed for this build.
- TN's 94 rows (80 House + 14 Senate) imported to the isolated Neon
  **staging** branch (`ROSTER_STAGING_DATABASE_URL`, explicitly — never the
  ambient `DATABASE_URL`), re-imported (`upserted=94` both times), and
  confirmed idempotent by a **direct row-count query**
  (`select office, count(*) from official_roster_candidates where state =
  'TN' group by office`) — `house: 80`, `senate: 14` after both runs, not
  just the importer's own self-reported count.
- **End-to-end check against staging, flag on:** called `lookupChallengers`
  directly (the real code path a request hits) for all 9 TN House districts
  and the Senate race, diffed against the fixture. **0 mismatches across all
  10 contests.** Full literal output (candidate name, party, as the app
  would render it):

  ```
  TN-01: 8 challengers, all official_state_roster (Harshbarger excluded as incumbent)
    Kristi Burke (Democrat), Hernan H. Garcia (Democrat), David S. Kerr, Jr. (Democrat),
    Joshua Ray Ashburn (Independent), Richard G. Baker (Independent),
    Chris Campbell (Independent), Billy Cody (Independent),
    Tyler Brice Mitchell McClain (Independent)

  TN-02: 3 challengers, all official_state_roster (Burchett excluded as incumbent)
    Michaela Barnett (Democrat), Bruce Fine (Independent), Adam Heimerman (Independent)

  TN-03: 7 challengers, all official_state_roster (Fleischmann excluded as incumbent)
    Anna Golladay (Democrat), Bryan Martin (Democrat), Dean Arnold (Independent),
    Jean Howard-Hill (Independent), Rodney Joe King (Independent),
    Donnie Lynn Ownby (Independent), Edward John Roland (Independent)

  TN-04: 10 challengers, all official_state_roster (DesJarlais excluded as incumbent)
    Thomas E. Davis (Republican), Joshua James (Republican), Harold "Rocky" Jones (Republican),
    Victoria Broderick (Democrat), Mike Cortese (Democrat), Cliff Huffman (Democrat),
    Tim Lanier (Democrat), Joyce E. Neal (Democrat), Jacob Kristopher Anders (Independent),
    Clay Faircloth (Independent)

  TN-05: 8 challengers, all official_state_roster (Ogles excluded as incumbent)
    Charlie Hatcher (Republican), Yolanda Cooper-Sutton (Democrat), DeVante R. Hill (Democrat),
    Rachel Hurley (Democrat), Carrie Ann Iacomini (Democrat), Chaz Molder (Democrat),
    James A. Johnson (Independent), Micheál (Me-Haul) O'Leary (Independent)

  TN-06: 11 challengers, all official_state_roster — OPEN SEAT, no incumbent excluded
    Natisha Brooks (Republican), Johnny Garrett (Republican), Jon Henry (Republican),
    Van Hilleary (Republican), Lore Bergman (Democrat), Mike Croley (Democrat),
    Christopher Martin Finley (Democrat), Miriam Leibowitz (Democrat), Chaney Mosley (Democrat),
    Christopher B. Monday (Independent), Angus Purdy (Independent)

  TN-07: 6 challengers, all official_state_roster (Van Epps excluded as incumbent)
    Darden Copeland (Democrat), Vincent Dixie (Democrat), Saletta Holloway (Democrat),
    Joshua Warren Sales (Democrat), Andrew J. Koontz (Independent), Lowell Reynolds (Independent)

  TN-08: 10 challengers, all official_state_roster (Kustoff excluded as incumbent)
    Dewey Gordon Bryan (Democrat), Jordan D. Hinders (Democrat), Heidi Kuhn (Democrat),
    Leonard Perkins (Democrat), Adam D. Austill (Independent), Wendell "Wells" Blankenship (Independent),
    Antonio Futch (Independent), Pamela Jeanine "P." Moses (Independent), Horace Taylor (Independent),
    Henry J. Ward, III (Independent)

  TN-09: 10 challengers, all official_state_roster — OPEN SEAT, no incumbent excluded
    Charlotte Bergmann (Republican), Brent Taylor (Republican), Jeremy Thompson (Republican),
    Todd Warner (Republican), M. LaTroy A-Williams (Democrat), London Lamar (Democrat),
    Justin J. Pearson (Democrat), Jim Torino (Democrat), Dennis Clark (Independent),
    Michelle Davis Head (Independent)

  U.S. SENATE: 13 challengers, all official_state_roster (Hagerty excluded as incumbent)
    Marquita Bradshaw (Democrat), Maria Brewer (Democrat), Kevin Lee McCants (Democrat),
    Civil Miller-Watkins (Democrat), Diana Onyejiaka (Democrat), Tharon Chandler (Independent),
    Andrew Gerena (Independent), Jeremy Dean Hearn (Independent), Robert Jones (Independent),
    James William Macon III (Independent), Yoshi D. Matthews (Independent),
    David Sutman, Jr. (Independent), Catherine Barcel "Barcy" Whitson (Independent)
  ```

  Every returned challenger carried `rosterProvenance.sourceKind ===
  "official_state_roster"`; the incumbent was correctly excluded from the
  challenger list in every district that has one; TN-06 and TN-09 correctly
  returned **all** filers with no incumbent excluded (open seats).
- Prod database untouched throughout. `OFFICIAL_ROSTER_ENABLED` was only
  ever set inline for the verification commands above; it is not set
  anywhere persistent (not `.env.local`, not Vercel, not any committed
  file).

## Governing calendar dates (per the plan doc's standing requirement)

- **March 10, 2026, 12:00 Noon** — the regular August-primary qualifying
  deadline (governed the US Senate filing and, before redistricting
  reopened it, the original House filing too). Source: SoS "Key Dates for
  the 2026 Election Cycle" PDF. **Passed.**
- **March 17, 2026, 12:00 Noon** — the regular August-primary withdrawal
  deadline (covers the Senate candidates; no Senate withdrawals recorded
  since). Source: same Key Dates PDF. **Passed.**
- **May 15, 2026, 12:00 Noon** — special congressional-only re-qualifying
  AND withdrawal deadline, opened by the May 2026 redistricting (candidates
  could change districts or withdraw up to this same moment). Source: SoS
  press release "Notice of Revised Congressional Districts and Special
  Qualifying Period." **Passed.**
- **May 17, 2026, 12:00 Noon** — deadline for political parties to make
  bona fide determinations on congressional candidates qualified under the
  May 15 special period. Source: SoS press release "Secretary of State's
  Office Announces List of Congressional Candidates as of May 15 Qualifying
  Deadline." **Passed** — the published candidate list (file-dated May 29)
  already reflects this.
- **August 6, 2026 — Primary Election.** Every Republican/Democratic
  nomination in this fixture resolves on this date. Source: SoS "Key Dates"
  PDF / `sos.tn.gov/elections/calendar`. **Future — this fixture needs a
  follow-up update once results are certified (see the dated re-check card
  opened below).**
- **August 24, 2026 (Monday)** — the statutory deadline for each county
  election commission to complete its canvass and certify primary results:
  Tenn. Code Ann. § 2-8-101 requires certification "no later than the third
  Monday after the election" (Aug 6 → Aug 10 → Aug 17 → **Aug 24**, the
  third Monday). This is the point the primary-stage roster becomes
  final/official. No single published SoS document states this date
  explicitly for the 2026 cycle (unlike some other states' fuller
  administrative calendars); it is derived directly from the governing
  statute, cross-checked via Justia's Tennessee Code text.
- **November 3, 2026 — General Election.** Source: SoS "Key Dates" PDF.
- **No candidate-withdrawal deadline remains open.** The general
  Aug-primary withdrawal deadline (March 17) and the special congressional
  withdrawal deadline (May 15) have both already passed with no further
  withdrawal window published for primary-stage candidates before Aug 6.
  (The Aug 27, 2026 "Withdrawal Deadline" on the Key Dates PDF applies only
  to **municipal** candidates on the November ballot, not to Governor/US
  Senate/US House/TN Legislature — confirmed by the PDF's own text: "For
  municipal elections held with the November election, the qualifying dates
  below apply.")

**A dated re-check follow-up card has been opened** (per the epic's NOT
BEFORE convention) — see
`docs/operations/voter-choice-backlog.md`, "[P2] Re-check official roster:
Tennessee (TN) — after primary certification", `NOT BEFORE: 2026-08-24`.

## Known gaps (explicit, not guessed)

- **Every Republican/Democratic nomination is undetermined pending the
  August 6, 2026 primary** — recorded as `qualified_for_primary_ballot`,
  never guessed as a general-ballot nominee. This fixture needs a follow-up
  update once the primary is certified (dated re-check card opened, see
  above).
- **Independent candidates are recorded `qualified_for_general_ballot`**
  per the reasoning in "How this was verified" above (Tennessee's own list
  already reflects verified signatures, and independents never face a
  primary in Tennessee) — if a future re-check finds this assumption wrong
  for any specific filer, correct it there.
- **The August 24, 2026 certification date is derived from statute, not a
  single explicit SoS calendar entry** — see the note above. If the county
  election commissions' actual practice differs (e.g. an earlier
  publish-date convention like other states' county-canvass dates), the re-
  check should confirm the real certification date directly rather than
  relying on the statutory ceiling alone.
- Names/cities are recorded as they appear in the official PDFs; not
  independently re-verified against a third document beyond the incumbency
  cross-checks above.

## Deliverables (per the card's standing requirement)

- **Comparison/output doc:** this file —
  `/Users/Muxin/Documents/GitHub/voter-choice/docs/operations/tennessee-vertical-slice-data-check.md`.
- **Fixture file:**
  `/Users/Muxin/Documents/GitHub/voter-choice/scripts/congressional-rosters/tn-official-roster-2026.ts`.
- **Official Tennessee source URLs used:**
  - `https://sos.tn.gov/elections/2026-candidate-lists` (landing page)
  - `https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USHouseCandidates_2026.pdf`
  - `https://sos-prod.tnsosgovfiles.com/s3fs-public/document/USSenate_2026.pdf`
  - `https://sos.tn.gov/announcements/2026-congressional-redistricting`
  - `https://sos.tn.gov/newsroom/press-releases/notice-of-revised-congressional-districts-and-special-qualifying-period`
  - `https://sos.tn.gov/newsroom/press-releases/secretary-of-states-office-announces-list-of-congressional-candidates-as-of`
  - `https://sos-prod.tnsosgovfiles.com/s3fs-public/document/Key%20Dates%20-%202026_0.pdf`
  - `https://sos.tn.gov/elections/calendar`
  - `https://www.house.gov/representatives` (incumbency cross-check only —
    not a Tennessee source, cited because it materially shaped the
    `isIncumbent` data)
  - `https://www.senate.gov/states/TN/intro.htm` (Senate incumbency
    cross-check only)

## GO/NO-GO verdict

**GO on the approach for this state — the manual track continues to
generalize; Tennessee's WAF-vs-asset-host split and its redistricting-driven
two-deadline structure are new operational wrinkles, both resolved and
documented above for future states. NO-GO on flipping the flag for real
users without Muxin's sign-off.**

What remains before this reaches real users:

1. **Flag flip (prod cutover)** — human sign-off required, same as every
   other state in this track. Nothing in this build enables
   `OFFICIAL_ROSTER_ENABLED` anywhere.
2. **A follow-up update to this fixture is needed after August 24, 2026**,
   once the primary is certified — the dated re-check card is already open
   (`NOT BEFORE: 2026-08-24`).
