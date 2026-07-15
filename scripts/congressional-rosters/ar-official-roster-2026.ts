/**
 * scripts/congressional-rosters/ar-official-roster-2026.ts
 *
 * Arkansas's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 4 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), Alabama,
 * and Alaska (epic c5a813bb); this is Arkansas's build (card at
 * docs/operations/voter-choice-backlog.md, "[P0] Import + verify official
 * roster: Arkansas (AR)").
 *
 * ARKANSAS-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/arkansas-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Arkansas's official candidate source, candidates.arkansas.gov, is a
 *     WordPress site (Elementor + wpDataTables + a custom "metl" plugin,
 *     NOT Civix-vended) with a server-processed search form ("Search
 *     Candidate Filings") backed by a DataTables-protocol REST endpoint
 *     (`/wp-json/metl/v1/all`). Position/Office is an exact-match filter,
 *     not substring - searching "United States" returns nothing; the
 *     stored value is literally "U.S. Senate" / "U.S. Congress District 0N".
 *   - Arkansas's March 3, 2026 preferential primary and March 31, 2026
 *     primary runoff had ALREADY OCCURRED by this fixture's retrieval date
 *     (2026-07-15), so unlike a cold-start build, the candidate-filings
 *     portal reflects the POST-PRIMARY roster, not raw filings: primary
 *     losers (e.g. GOP Senate primary runners-up Micah Ashby and Jeb Little,
 *     GOP AR-2 runner-up Chase McDowell) are already absent from the table -
 *     confirmed by cross-checking the full unfiltered candidate list (195
 *     rows total, all offices) against the primary election-night results
 *     (enr.totalresults.com, "2026 Preferential Primary", Federal category)
 *     rather than assuming the filing list alone was authoritative.
 *   - No federal race needed the March 31 runoff: every contested federal
 *     primary was won by an outright majority (Cotton 82%, Hill 77%, Jones
 *     93%, Shoffner 78%, Russell 53%) - confirmed by checking the March 31
 *     runoff election's own "Federal" category, which returned zero
 *     contests, not by assuming Arkansas's majority-to-avoid-runoff rule
 *     applied without checking.
 *   - Libertarian Party of Arkansas candidates (Wadlin, Parsons, Wilson)
 *     filed party certificates of nomination on 2026-03-03 (the primary
 *     election date itself), matching the "new political party" filing
 *     deadline in the 2026 Election Calendar (Ark. Code 7-7-205(c)(2)(B-C):
 *     nominations by a new political party filed no later than noon on the
 *     Preferential Primary date) rather than running in a primary - a
 *     determined nomination, not a pending petition.
 *   - Independent (no-party) candidates: the 2026 Election Calendar's
 *     deadline for independent candidates to file petitions for federal
 *     office was May 1, 2026 - already past as of this fixture's retrieval
 *     date. The candidates.arkansas.gov federal roster (13 filings total)
 *     contains zero "Independent" PartyAffiliation entries for any US House
 *     or US Senate race. A secondary news source (Talk Business & Politics,
 *     archived list dated 2025-11-14) named a "Jason Gaines (I)" as an AR-1
 *     independent filer; he is verified ABSENT from the official post-
 *     deadline roster (not omitted by this transcription - checked and
 *     confirmed missing), consistent with a petition that was filed but
 *     never certified with sufficient signatures. Not guessed onto the
 *     roster.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the filing table or this app's own FEC-derived
 *     `candidates` table:
 *     (1) house.gov's "By State and District" directory confirms the
 *     sitting House delegation is Crawford (AR-1), Hill (AR-2), Womack
 *     (AR-3), Westerman (AR-4) - all Republican, all filed for re-election.
 *     (2) senate.gov's senator list confirms Arkansas's Class II Senate seat
 *     (the one on the 2026 ballot) is held by Tom Cotton (R) - the other AR
 *     seat, Boozman's, is Class III and not up until 2028.
 *
 * Sources:
 *   - https://candidates.arkansas.gov/ (Arkansas Secretary of State's
 *     official "Search Candidate Filings" tool - post-primary federal
 *     roster, Position/Office = "U.S. Senate" / "U.S. Congress District 0N")
 *   - https://enr.totalresults.com/arkansas/#election=7f77a178-af02-40ec-92db-c5cc50882c68
 *     (Arkansas Secretary of State's official 2026 Preferential Primary
 *     election-night-reporting results, Federal category - used to confirm
 *     the filings table already reflects post-primary nominees and that no
 *     federal race needed the March 31 runoff)
 *   - https://www.house.gov/representatives ("By State and District" tab,
 *     Arkansas section - incumbency cross-check only, not a candidate-
 *     roster source)
 *   - https://www.senate.gov/senators/senators-contact.htm (Arkansas
 *     senators list - incumbency cross-check only)
 *
 * Coverage: all 4 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Names are recorded as they appear in the official candidates.arkansas.gov
 *     filing table (e.g. "Congressman Rick Crawford" retains that prefix
 *     verbatim, rather than being normalized to "Rick Crawford"); not
 *     independently re-verified against a third document beyond the two
 *     official sources above.
 *   - No party has more than one nominee per seat, and no seat's nomination
 *     is undetermined - unlike AL/OK, this fixture has no
 *     `runoff_pending` rows.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const AR_STATE = "AR";
export const AR_ELECTION_YEAR = 2026;
export const AR_STAGE = "general" as const;
export const AR_HOUSE_SOURCE_URLS = [
  "https://candidates.arkansas.gov/",
  "https://enr.totalresults.com/arkansas/#election=7f77a178-af02-40ec-92db-c5cc50882c68",
];
export const AR_SENATE_SOURCE_URLS = [
  "https://candidates.arkansas.gov/",
  "https://enr.totalresults.com/arkansas/#election=7f77a178-af02-40ec-92db-c5cc50882c68",
];
export const AR_RETRIEVED_AT = "2026-07-15";

export const AR_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Crawford (incumbent) unopposed in the GOP primary; Green
  // won the Democratic primary; Parsons is the Libertarian Party nominee.
  {
    district: "01",
    name: "Congressman Rick Crawford",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Terri Yarbrough Green",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Steve G. Parsons",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Hill (incumbent) won the GOP primary outright (77%,
  // defeating Chase McDowell); Jones won the Democratic primary outright
  // (93%). No Libertarian or independent filer for this seat.
  {
    district: "02",
    name: "Congressman French Hill",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Chris Jones",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — Womack (incumbent) unopposed in the GOP primary; Ryerse
  // won the Democratic primary; Wilson is the Libertarian Party nominee.
  {
    district: "03",
    name: "Congressman Steve Womack",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Robb Ryerse",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Bobby Wilson",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — Westerman (incumbent) unopposed in the GOP primary;
  // Russell won the Democratic primary outright (53%, defeating Steven
  // Layne O'Donnell). No Libertarian or independent filer for this seat.
  {
    district: "04",
    name: "Congressman Bruce Westerman",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: 'James "Rus" Russell, III',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const AR_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Cotton (incumbent, Class II seat) won the GOP primary outright (82%,
  // defeating Micah Ashby and Jeb Little); Shoffner won the Democratic
  // primary outright (78%, defeating Ethan N. Dunbar); Wadlin is the
  // Libertarian Party nominee.
  {
    district: null,
    name: "Senator Tom Cotton",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Hallie Shoffner",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Jeff Wadlin",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
