/**
 * scripts/congressional-rosters/md-official-roster-2026.ts
 *
 * Maryland's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 8 US House districts. Maryland has NO US
 * Senate contest in 2026 (Angela Alsobrooks's seat, elected 2024, runs
 * through 2031; Chris Van Hollen's seat, elected 2022, runs through 2029 —
 * confirmed via the official candidate list, which lists no "U.S. Senator"
 * office for 2026), so this fixture is house-only, mirroring HI/CT/CA's
 * shape. Built through the same manual official-source pipeline as
 * AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI, epic c5a813bb; this is Maryland's
 * build (card "[P0] Import + verify official roster: Maryland (MD)").
 *
 * MARYLAND-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/maryland-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Maryland's official election authority is the State Board
 *     of Elections (elections.maryland.gov), a static server-rendered site;
 *     `WebFetch` alone worked for every page (candidate lists, results
 *     pages, election calendar PDF) — no browser automation needed.
 *   - MD_STAGE = "general": Maryland's 2026 primary was held June 23, 2026 —
 *     already in the past as of this fixture's transcription (2026-07-15).
 *     Primary results (per elections.maryland.gov's official results
 *     dashboard, last refreshed 2026-07-10 with ALL PRECINCTS REPORTING)
 *     determine each party's nominee for every one of the 8 districts. The
 *     State Board of Canvassers' formal statewide certification of these
 *     results is not due until 2026-07-23 (per the official 2026 Election
 *     Calendar) — 8 days after this build — so, mirroring the TX/OK/AL/CO/
 *     CA/AR precedent (certified per official election-night results, no
 *     distinct post-canvass certification document exists yet at
 *     transcription time), every major-party nominee below is recorded
 *     `qualified_for_general_ballot` based on the results dashboard's
 *     all-precincts-reporting numbers, not a guess ahead of the primary.
 *   - District 5 is an OPEN SEAT: incumbent Steny Hoyer (per house.gov's "By
 *     State and District" directory, fetched 2026-07-15) is NOT a candidate
 *     in any of the 24 Democratic primary filings for CD5 — confirmed by
 *     name-search across the full candidate list, not inferred. This
 *     explains the unusually large, fragmented CD5 Democratic field (primary
 *     winner Adrian Boafo took only 32.74% of the vote). No CD5 row below
 *     carries `isIncumbent: true`.
 *   - Every other district's primary winner's surname matches its current
 *     sitting member's surname per house.gov, confirmed by name (not by
 *     district number alone, per the TX Al Green / FL redistricting
 *     lesson): CD1 Harris, CD2 Olszewski, CD3 Elfreth, CD4 Ivey, CD6 McClain
 *     Delaney, CD7 Mfume, CD8 Raskin — each marked `isIncumbent: true` for
 *     their party's nominee row.
 *   - Non-principal-party (Green) and Unaffiliated/independent candidates, per
 *     the official per-office CSV (more authoritative than the HTML
 *     candidate-list page — see below): Maryland's own calendar draws two
 *     separate, STILL-OPEN tracks for these as of 2026-07-15: (a) a
 *     recognized non-principal party's Declaration of Intent (deadline
 *     already passed, 2026-07-06) must be followed by a Certificate of
 *     Nomination and Candidacy, due 2026-08-03 5pm — NOT yet filed/certified
 *     at transcription time; (b) an Unaffiliated candidate's nomination
 *     petition + Certificate of Candidacy is also due 2026-08-03 5pm. Per
 *     the SAFETY rule against inferring ahead of what the official source
 *     certifies, any candidate in either track who has not yet completed
 *     the final Aug 3 filing is recorded `declared_general_ballot_intent`,
 *     not `qualified_for_general_ballot` — mirroring Colorado's
 *     UAF-petition precedent. Two Green Party filers (CD6's Moshe Y.
 *     Landman, CD8's Nancy Wallace) carry CSV `Candidate Status = "Seeking
 *     the Nomination"` — recorded `declared_general_ballot_intent`, party
 *     `GRE`. Two Unaffiliated petition filers (CD5's Brian S. Jordan and
 *     Jonathan Burruss) carry `Candidate Status = "Declaration of Intent"`
 *     — same `declared_general_ballot_intent` treatment, party `IND`. No
 *     Libertarian congressional filer exists in any MD district (confirmed
 *     by grep against the raw CSV — zero matches).
 *   - Write-in filers: CD1's Edward Shlikas and CD5's Mildred Marie Hall
 *     each carry an ACTIVE (non-withdrawn) `Filing Type = "Write-In"` row —
 *     recorded `write_in_qualified`. Shlikas's CSV party is explicitly
 *     `Unaffiliated` (party `IND`, not nulled — the source does disclose
 *     it, unlike FL's blank write-in party column); Hall's CSV party is the
 *     catch-all `"Other Candidates"` bucket, not a real party (party
 *     `null`, matching the FL precedent for an undisclosed write-in party).
 *   - Jonathan Burruss (CD5) has TWO CSV rows for the same person (same
 *     address/phone/email): an original Write-In filing (2026-02-03),
 *     WITHDRAWN 2026-02-19 the same day he filed the Petition/Declaration
 *     of Intent recorded above — a track switch, not two candidates. Only
 *     his current Declaration-of-Intent row is in this fixture.
 *   - Two Unaffiliated CD6 filers (Hajra Kirmani, Chris Hyser) are
 *     WITHDRAWN with no active counterpart row anywhere — excluded
 *     entirely, not on the ballot.
 *   - Several district/party-switch pairs in the raw CSV (Felix M. Seier:
 *     D→R within CD3; Elldwnia English: CD4→CD5 Democratic; Jennifer
 *     Cross: CD5→CD3 Democratic) are all PRIMARY-LOSING candidates under
 *     their final filing — none is a party's certified primary winner per
 *     the official results dashboard, so none appears in this fixture
 *     regardless of the switch. This fixture's major-party rows are built
 *     from the CERTIFIED RESULTS page, not the raw candidate-filing list,
 *     which sidesteps this whole class of switch/withdrawal confusion for
 *     the determined contests.
 *   - Maryland also has a post-primary "Declination of Nomination" window
 *     (2026-08-04) during which any of the 8 major-party nominees above
 *     could still decline — this is materially different from a withdrawal
 *     before the primary (EL Section 5-801(b)(2)(i)); see the plan doc's
 *     candidate-withdrawal-deadline standing requirement and the dated
 *     re-check card opened alongside this build.
 *
 * Sources:
 *   - https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_representativeincongressbydistrict_candidatelist.csv
 *     (official per-office raw CSV — 91 candidate rows across all 8
 *     districts, confirmed complete by row-count; the authoritative source
 *     for minor-party/Unaffiliated/write-in/withdrawn candidate detail,
 *     retrieved 2026-07-15)
 *   - https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_statewide_candidatelist.html
 *     (2026 candidate list HTML page — Representative in Congress, all 8
 *     districts, retrieved 2026-07-15)
 *   - https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4.html
 *     (2026 primary election results — Representative in Congress overview,
 *     all 8 districts, "Last refreshed: 07/10/2026 10:08:37 AM", all
 *     precincts reporting, retrieved 2026-07-15)
 *   - https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4_<N>.html
 *     for N = 1..8 (per-district results detail)
 *   - https://elections.maryland.gov/candidacy/ballot.html (confirms
 *     "Representatives in Congress" is the only federal office up in 2026 —
 *     no US Senate contest)
 *   - https://elections.maryland.gov/elections/2026/2026_Election_Calendar.pdf
 *     (official 2026 Election Calendar — primary/general dates, filing,
 *     withdrawal, declination-of-nomination, and certification deadlines)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check, retrieved 2026-07-15)
 *
 * Coverage: all 8 US House districts, 22 total rows. No US Senate contest
 * in 2026. Major-party nominees are `qualified_for_general_ballot`;
 * still-pending non-principal-party/Unaffiliated filers are
 * `declared_general_ballot_intent`; active write-in filers are
 * `write_in_qualified`. No `runoff_pending` rows — Maryland has no
 * primary-runoff mechanism.
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the official source as of 2026-07-15. The
 *     August 3, 2026 non-principal-party/Unaffiliated filing deadline, the
 *     August 4, 2026 declination-of-nomination window, the August 7, 2026
 *     vacancy-in-nomination deadline, the August 31, 2026 general-ballot
 *     certification, and the October 15, 2026 write-in filing deadline are
 *     all still open as of this build; see the dated re-check card.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MD_STATE = "MD";
export const MD_ELECTION_YEAR = 2026;
export const MD_STAGE = "general" as const;
export const MD_HOUSE_SOURCE_URLS = [
  "https://elections.maryland.gov/elections/2026/primary_results/gen_results_2026_4.html",
  "https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_representativeincongressbydistrict_candidatelist.csv",
  "https://elections.maryland.gov/elections/2026/primary_candidates/2026_GP_statewide_candidatelist.html",
];
export const MD_RETRIEVED_AT = "2026-07-15";

export const MD_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Andy Harris (REP, incumbent), Dan Schwartz (DEM)
  {
    district: "01",
    name: "Dan Schwartz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Andy Harris",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD1 write-in: Edward Shlikas, active (non-withdrawn) Write-In filing,
  // party disclosed as Unaffiliated in the source CSV.
  {
    district: "01",
    name: "Edward Shlikas",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  // District 02 — John "Johnny O" Olszewski, Jr. (DEM, incumbent), Dave
  // Wallace (REP)
  {
    district: "02",
    name: 'John "Johnny O" Olszewski, Jr.',
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Dave Wallace",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 03 — Sarah Elfreth (DEM, incumbent), Berney Flowers (REP)
  {
    district: "03",
    name: "Sarah Elfreth",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Berney Flowers",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 04 — Glenn F. Ivey (DEM, incumbent), George E. McDermott (REP)
  {
    district: "04",
    name: "Glenn F. Ivey",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "George E. McDermott",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 05 — OPEN SEAT (incumbent Steny Hoyer not seeking re-election —
  // absent from all 24 Democratic primary filers, confirmed by name-search
  // against house.gov). Adrian Boafo (DEM), Chris Chaffee (REP).
  {
    district: "05",
    name: "Adrian Boafo",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Chris Chaffee",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD5 Unaffiliated petition filers — Aug 3, 2026 final Certificate of
  // Candidacy deadline not yet passed at transcription time, so still
  // declared_general_ballot_intent, not qualified_for_general_ballot.
  {
    district: "05",
    name: "Brian S. Jordan",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // Jonathan Burruss: withdrew an earlier Write-In filing (2026-02-03) on
  // 2026-02-19, the same day he filed this Declaration of Intent/Petition —
  // a track switch, not two candidates. Only this current row is included.
  {
    district: "05",
    name: "Jonathan Burruss",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // CD5 write-in: Mildred Marie Hall, active (non-withdrawn) Write-In
  // filing; source CSV lists her party as the catch-all "Other Candidates"
  // bucket, not a real party code — party left null, matching FL precedent.
  {
    district: "05",
    name: "Mildred Marie Hall",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  // District 06 — April McClain Delaney (DEM, incumbent), Robin Ficker (REP)
  {
    district: "06",
    name: "April McClain Delaney",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Robin Ficker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD6 Green Party filer, "Seeking the Nomination" (non-principal-party
  // Certificate of Nomination due Aug 3, 2026, not yet filed) — still
  // declared_general_ballot_intent. (Two Unaffiliated CD6 filers, Hajra
  // Kirmani and Chris Hyser, are WITHDRAWN with no active counterpart —
  // excluded entirely, not on the ballot.)
  {
    district: "06",
    name: "Moshe Y. Landman",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // District 07 — Kweisi Mfume (DEM, incumbent), Scott M. Collier (REP)
  {
    district: "07",
    name: "Kweisi Mfume",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Scott M. Collier",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // District 08 — Jamie Raskin (DEM, incumbent), Cheryl Riley (REP)
  {
    district: "08",
    name: "Jamie Raskin",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Cheryl Riley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD8 Green Party filer, "Seeking the Nomination" — same treatment as
  // CD6's Landman above.
  {
    district: "08",
    name: "Nancy Wallace",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];
