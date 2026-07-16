/**
 * scripts/congressional-rosters/nc-official-roster-2026.ts
 *
 * North Carolina's 2026 official congressional roster for the November 3,
 * 2026 general election - covers all 14 US House districts and the US
 * Senate race. Built through the same manual official-source pipeline as
 * AZ/TX/OK/AL/AK/CO/CT/CA/AR/DE/FL/HI/KY (parent epic c5a813bb); this is
 * North Carolina's build.
 *
 * NORTH CAROLINA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/north-carolina-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - North Carolina's official candidate source is NOT Civix-vended
 *     (ncsbe.gov / a static S3-hosted PDF, not *.civixapps.com) - the Civix
 *     portal playbook in the nationwide roster plan doc does not apply
 *     here.
 *   - Source is the NC State Board of Elections' "CANDIDATE LIST GROUPED BY
 *     CONTEST" PDF for the 2026 General Election (federal + state offices),
 *     a real text-layer PDF (confirmed via pypdf layout-mode extraction,
 *     not a scanned image) - NOT a filing-stage list. This is the settled
 *     POST-PRIMARY general-ballot nominee list: every contested US House
 *     district and the US Senate race show exactly ONE filer per party (no
 *     two Republicans or two Democrats anywhere), confirming the primary
 *     (and, where triggered, the second/runoff primary) had already
 *     resolved before this list's retrieval date.
 *   - North Carolina's 2026 primary was March 3, 2026; state law (NCGS
 *     163-111) triggers a second/runoff primary on May 12, 2026 if no
 *     candidate cleared 30%+1 of their party's primary vote. Retrieval
 *     (2026-07-16) is well after both dates. NC-1's Republican primary (the
 *     most closely watched contest, a 5-candidate field) was independently
 *     confirmed via press coverage (WUNC, CBS News) to have been won
 *     outright by Laurie Buckhout, avoiding a runoff - consistent with the
 *     official list showing only one Republican filer for NC-1.
 *   - NO seat's nomination is undetermined: no `runoff_pending` entries in
 *     this fixture (both potential runoff triggers - the primary and the
 *     second primary - are already resolved as of retrieval).
 *   - INCUMBENCY was cross-checked against official/independent sources,
 *     never guessed from the candidate list itself: the sitting NC US House
 *     delegation (119th Congress, per house.gov's "By State and District"
 *     directory, cross-referenced against congress.gov and Wikipedia's
 *     "List of United States representatives from North Carolina") is
 *     Davis (NC-1, D), Ross (NC-2, D), Murphy (NC-3, R), Foushee (NC-4, D),
 *     Foxx (NC-5, R), McDowell (NC-6, R), Rouzer (NC-7, R), Harris (NC-8,
 *     R), Hudson (NC-9, R), Harrigan (NC-10, R), Edwards (NC-11, R), Adams
 *     (NC-12, D), Knott (NC-13, R), Moore (NC-14, R). ALL 14 sitting
 *     incumbents filed for re-election and appear as their district's
 *     same-party nominee in this list - NO open US House seat in North
 *     Carolina this cycle (unlike OK's/AL's/KY's builds, each of which had
 *     at least one open House seat).
 *   - US SENATE IS AN OPEN SEAT: the sitting senator whose Class II seat is
 *     up in 2026, Thom Tillis, announced (2025-06-29, per Axios/NBC News
 *     coverage) he would not seek re-election, and does not appear as a
 *     filer in this list - confirmed via senate.gov's North Carolina state
 *     page, which lists Tillis and Ted Budd (Budd's Class III seat is not
 *     up in 2026) as the state's current senators. Roy Cooper (D, former
 *     governor) and Michael Whatley (R, former RNC chair) are the major-
 *     party nominees.
 *   - ZERO unaffiliated/independent filers for any US House or Senate seat
 *     this cycle - verified absent, not omitted (the full candidate list
 *     for all 15 federal contests was read in full; only DEM/REP/LIB/GRE
 *     party codes appear anywhere in the federal section). This is
 *     consistent with North Carolina's unaffiliated-candidate petition
 *     deadline (NCGS 163-122 as amended: noon on the day of the primary,
 *     i.e. March 3, 2026) having already passed before this build - no
 *     unaffiliated candidate could newly qualify even if one wanted to at
 *     transcription time.
 *   - Two Green Party filers (US Senate: Michael Dublin; NC-8: Bo
 *     Whitehead) carry a materially later filing date (06/15/2026) than
 *     every other candidate in this list (all filed 12/01/2025-12/19/2025,
 *     the statewide candidate-filing window per NCSBE's official calendar).
 *     This is consistent with the Green Party's own late formal
 *     recognition by the NC State Board of Elections (voted 3-2 to
 *     recognize the party in 2025, per NC Newsline) and its stated 2026
 *     candidate-selection process running on a separate track from the
 *     unified Dec 2025 filing window - not a data anomaly. The Green Party
 *     is one of North Carolina's four officially recognized parties
 *     (Democratic, Green, Libertarian, Republican) as of this build, so its
 *     nominees are recorded `qualified_for_general_ballot`, same as any
 *     other recognized-party nominee - no new party code needed (`GRE`
 *     already exists in types.ts from a prior state's build).
 *   - No write-in candidate found on this contest-grouped list for any US
 *     House or Senate seat. North Carolina does permit a write-in
 *     candidacy via a separate "Declaration of Intent for a Write-in
 *     Candidate" petition process (NCSBE's write-in candidate petitions
 *     page), but the specific 2026 general-election filing deadline for
 *     that process was not found in the official sources read this
 *     session - see KNOWN LIMITATIONS.
 *
 * Sources:
 *   - https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/2026_general_candidate_list_by_contest_federal_and_state.pdf
 *     (NC State Board of Elections' official 2026 General Election
 *     candidate list, grouped by contest - the settled post-primary
 *     nominee roster used for both US House and US Senate below)
 *   - https://www.ncsbe.gov/results-data/candidate-lists (landing page
 *     hosting the above PDF and its companion detail-list PDF)
 *   - https://www.house.gov/representatives (119th Congress North Carolina
 *     delegation, "By State and District" - incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://www.senate.gov/states/NC/intro.htm (North Carolina's current
 *     senators - incumbency cross-check only, confirms the Tillis open
 *     seat)
 *   - https://www.ncsbe.gov/candidates/withdrawal-candidacy and NCGS
 *     163-114 (general-election nominee withdrawal deadline - see the data-
 *     check doc's "Governing calendar dates" section)
 *
 * Coverage: all 14 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - The specific 2026 general-election write-in candidate filing deadline
 *     was not found in the official sources read this session (NCSBE's
 *     "Candidate Deadlines" page had not yet published a 2026-general-
 *     specific date for that process at retrieval time) - if a write-in
 *     candidate later qualifies for any NC federal contest, this fixture
 *     will need a follow-up update. See the data-check doc's dated re-check
 *     card.
 *   - Names are recorded as they appear in the official candidate list's
 *     "NAME ON BALLOT" column (the list's own designated ballot-name
 *     field, distinct from its "CANDIDATE NAME" legal-name column); not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NC_STATE = "NC";
export const NC_ELECTION_YEAR = 2026;
export const NC_STAGE = "general" as const;
export const NC_HOUSE_SOURCE_URLS = [
  "https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/2026_general_candidate_list_by_contest_federal_and_state.pdf",
];
export const NC_SENATE_SOURCE_URLS = [
  "https://s3.amazonaws.com/dl.ncsbe.gov/Elections/2026/Candidate%20Filing/2026_general_candidate_list_by_contest_federal_and_state.pdf",
];
export const NC_RETRIEVED_AT = "2026-07-16";

// US Senate only: Thom Tillis (sitting Class II senator, up in 2026)
// announced 2025-06-29 he would not seek re-election - confirmed absent
// from the Senate filing list below. No US House district lost its
// incumbent - all 14 sitting representatives filed for re-election.
export const NC_OPEN_SEAT_DISTRICTS: string[] = [];

// No undetermined nominations: North Carolina's March 3, 2026 primary and
// (where triggered) May 12, 2026 second primary are both already resolved
// as of this fixture's retrieval date (2026-07-16) - every contest below
// shows exactly one filer per party. See KNOWN LIMITATIONS for the one
// still-open process (write-in candidacy) this fixture cannot yet rule out.
export const NC_RUNOFF_PENDING_CONTESTS: {
  office: "house" | "senate";
  district: string | null;
  party: "DEM" | "REP" | "LIB" | "GRE";
}[] = [];

export const NC_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Don Davis (incumbent) seeking re-election, unopposed in
  // his own primary; Buckhout won a 5-candidate Republican primary outright
  // (no runoff needed, confirmed via WUNC/CBS News primary-night coverage).
  {
    district: "01",
    name: "Don Davis",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Laurie Buckhout",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Tom Bailey",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Deborah K. Ross (incumbent) seeking re-election.
  {
    district: "02",
    name: "Eugene F. Douglass",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Deborah K. Ross",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Matthew Laszacs",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — Greg Murphy (incumbent) seeking re-election.
  {
    district: "03",
    name: "Daniel Cavender",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Raymond Smith",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Greg Murphy",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — Valerie P. Foushee (incumbent) seeking re-election.
  {
    district: "04",
    name: "Valerie P. Foushee",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Guy Meilleur",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Mahesh (Max) Ganorkar",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 — Virginia Foxx (incumbent) seeking re-election.
  {
    district: "05",
    name: "Virginia Foxx",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Robert B. Luffman",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Chuck Hubbard",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 — Addison McDowell (incumbent) seeking re-election. No
  // Libertarian filer.
  {
    district: "06",
    name: "Addison McDowell",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Cyril Jefferson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — David Rouzer (incumbent) seeking re-election.
  {
    district: "07",
    name: "Maad Abu-Ghazalah",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "David Rouzer",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Kimberly Hardy",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 08 — Mark Harris (incumbent) seeking re-election. Bo
  // Whitehead is one of two Green Party filers statewide (see header note
  // on the later 06/15/2026 filing date).
  {
    district: "08",
    name: "Bo Whitehead",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Colby Watson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Mark Harris",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 09 — Richard Hudson (incumbent) seeking re-election. No
  // Libertarian filer.
  {
    district: "09",
    name: "Richard N. Ojeda II",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Richard Hudson",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 10 — Pat Harrigan (incumbent) seeking re-election.
  {
    district: "10",
    name: "Steven Feldman",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Ashley Bell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Pat Harrigan",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 11 — Chuck Edwards (incumbent) seeking re-election.
  {
    district: "11",
    name: "Chuck Edwards",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Jamie Ager",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Travis Groo",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 12 — Alma S. Adams (incumbent) seeking re-election. No
  // Libertarian filer.
  {
    district: "12",
    name: "Jack Codiga",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Alma S. Adams",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 13 — Brad Knott (incumbent) seeking re-election.
  {
    district: "13",
    name: "Paul Barringer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Steven Swinton",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Brad Knott",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 14 — Tim Moore (incumbent) seeking re-election. No
  // Libertarian filer.
  {
    district: "14",
    name: "Lakesha Womack",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Tim Moore",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const NC_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: the sitting senator (Thom Tillis) announced 2025-06-29 he
  // would not seek re-election - no incumbent below.
  {
    district: null,
    name: "Michael Dublin",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Roy Cooper",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Shannon W. Bray",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Michael Whatley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
