/**
 * scripts/congressional-rosters/in-official-roster-2026.ts
 *
 * Indiana's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 9 US House districts. Indiana has no 2026
 * US Senate race (both IN Senate seats are Class 1 / Class 3; Class 2 is
 * not up in 2026). Built through the same manual official-source pipeline
 * as Arizona (card 637c2583), Texas (card 8530a468), Oklahoma (card
 * d9b1ef86), Alabama, Alaska, Colorado, Connecticut, California, Arkansas,
 * Delaware, and Florida, epic c5a813bb; this is Indiana's build (card
 * "[P0] Import + verify official roster: Indiana (IN)").
 *
 * INDIANA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/indiana-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Indiana's Secretary of State Election Division publishes
 *     two XLSX exports at www.in.gov/sos/elections/candidate-information/:
 *     a "2026 Primary Candidate List" (all primary filers, contested and
 *     uncontested) and a "2026 General Election Candidate List" (intended
 *     to be the post-primary certified roster).
 *   - CRITICAL FINDING — the "General Election Candidate List" XLSX
 *     (dated 7-6-26, fetched 2026-07-15) carries a disclaimer that the
 *     Indiana Recount Commission is actively engaged in recounts in three
 *     STATE LEGISLATIVE districts, and that federal/statewide/state-
 *     legislative/judicial candidate lists "will be incomplete" on in.gov
 *     until that recount work is certified. In practice this file's
 *     `US REPRESENTATIVE` rows (8 of them) contain ONLY write-in and
 *     Libertarian filers — zero Democratic or Republican rows for any of
 *     the 9 House districts, even though Indiana's May 5, 2026 primary was
 *     fully certified over a month earlier (see below). This export is a
 *     genuine PUBLICATION GAP for the major-party congressional nominees,
 *     not evidence those nominees don't exist — do not treat the absence
 *     of DEM/REP rows in this file as meaning no nominee was determined.
 *   - RESOLUTION: Indiana's own Election Night Reporting portal
 *     (enr.indianavoters.in.gov, vendor Quest Information Systems /
 *     "First Tuesday", NOT Civix) hosts the certified May 5, 2026 primary
 *     results, confirmed 100.0% of 5,067 precincts reporting, last updated
 *     June 1, 2026 — a full county-canvass-certified count, not
 *     election-night-partial data. This is the authoritative source for
 *     each district's Democratic and Republican nominee (the top
 *     vote-getter per party per district); the General Candidate List XLSX
 *     remains the authoritative source for Libertarian (convention-
 *     nominated, no primary) and write-in filers, which the recount-linked
 *     gap does not affect.
 *   - INCUMBENCY was cross-checked against a second independent official
 *     source, never guessed from either Indiana source or this app's
 *     FEC-derived `candidates` table: house.gov's "By State and District"
 *     member directory (fetched directly via `curl`, then isolated to the
 *     `id="state-indiana"` table section), confirmed 2026-07-15. Every one
 *     of Indiana's 9 sitting US Representatives filed for and won their own
 *     party's primary in the SAME district they currently hold — a clean
 *     case with no redistricting or cross-district filing complications
 *     (unlike TX's Al Green or FL's 2026 map): Mrvan (D-01), Yakym (R-02),
 *     Stutzman (R-03), Baird (R-04), Spartz (R-05), Shreve (R-06), Carson
 *     (D-07), Messmer (R-08), Houchin (R-09). IN-01 and IN-07 are the only
 *     two Democratic-held seats; all other Republican primary winners are
 *     the sitting incumbent, all Democratic primary winners in the other 7
 *     districts are challengers.
 *   - No `runoff_pending` rows — Indiana has no runoff system for
 *     congressional primaries; the May 5, 2026 primary decided every
 *     contested nomination by plurality, and 100% of precincts are
 *     certified reporting.
 *   - Write-in candidates (`Write-In (Independent)` / `Write-In (Other)` in
 *     the General Candidate List's party column, 4 rows) are recorded with
 *     `party: null` and `ballotStatus: "write_in_qualified"`, matching the
 *     AZ/OK/FL precedent — the sub-label ("Independent" vs "Other") is not
 *     a real party affiliation, so no party code is guessed from it.
 *   - Libertarian nominees (4 rows, one each in CD02, CD03 [as a write-in,
 *     see below], CD07, CD09) are convention-nominated (no LIB primary in
 *     Indiana), recorded `ballotStatus: "qualified_for_general_ballot"`
 *     directly, using the existing `LIB` party code (already defined in
 *     types.ts, confirmed as a generic Libertarian Party code applicable
 *     here — Indiana's Libertarian Party is state-recognized, no new code
 *     needed).
 *   - CD03's Phillip D. "Phil" Beachy filed as a write-in Independent
 *     (`party: null`, not LIB), distinct from CD03's two major-party
 *     nominees.
 *
 * Sources:
 *   - https://www.in.gov/sos/elections/files/2026-General-Candidate-List.7-6-26.pm.xlsx
 *     (Indiana SOS Election Division, "2026 General Election Candidate
 *     List" — write-in + Libertarian filers for all 9 US House districts,
 *     downloaded 2026-07-15; see docblock above for the federal-office
 *     publication-gap finding)
 *   - https://www.in.gov/sos/elections/files/Primary-Candidate-List-3.25.26.xlsx
 *     (Indiana SOS Election Division, "2026 Primary Candidate List" — full
 *     pre-primary field of Democratic/Republican filers, used to confirm
 *     the primary field/spelling of names, downloaded 2026-07-15)
 *   - https://enr.indianavoters.in.gov/site/index.html (Indiana Election
 *     Division's certified May 5, 2026 primary results portal, Quest
 *     Information Systems "First Tuesday" software — Federal > US
 *     Representative > Democrat/Republican views, confirmed 100.0% of
 *     5,067 precincts reporting, last updated June 1, 2026 8:03:54 AM;
 *     retrieved 2026-07-15)
 *   - https://www.in.gov/sos/elections/candidate-information/ (candidate
 *     information landing page linking both XLSX exports)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check, retrieved 2026-07-15)
 *   - https://www.in.gov/sos/elections/files/2026-Election-Calendar-Election-Administrators-Edition.FINAL.pdf
 *     (official 2026 Indiana Election Calendar, Election Administrator's
 *     Edition — source for the standing calendar dates recorded in the
 *     data-check doc)
 *
 * Coverage: all 9 US House districts. No US Senate contest in 2026. Every
 * major-party row is `qualified_for_general_ballot` (post-primary,
 * certified nominee); Libertarian rows are `qualified_for_general_ballot`
 * (convention-nominated, no primary); write-in rows are
 * `write_in_qualified`. No `qualified_for_primary_ballot` or
 * `runoff_pending` rows — Indiana's primary is fully certified and has no
 * runoff mechanism.
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the certified primary-nominee set as of
 *     2026-07-15. Indiana's own general-election candidate withdrawal
 *     deadline (IC 3-8-7-28) is noon, July 15, 2026 — the SAME DAY this
 *     fixture was transcribed; a withdrawal filed later that day would not
 *     be captured here. See the data-check doc's calendar-dates section
 *     for the dated re-check card opened to confirm no eleventh-hour
 *     withdrawal occurred.
 *   - Ballot content is not fully locked until noon, September 4, 2026 (IC
 *     3-11-2-2.1 / IC 3-8-8-7) — a qualification challenge or disqualifying
 *     event before that date could still change a nominee. See the
 *     data-check doc for the corresponding dated re-check card.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const IN_STATE = "IN";
export const IN_ELECTION_YEAR = 2026;
// Indiana's May 5, 2026 primary is fully certified (100% of 5,067
// precincts, last updated June 1, 2026) — every nomination is determined.
export const IN_STAGE = "general" as const;
export const IN_HOUSE_SOURCE_URLS = [
  "https://enr.indianavoters.in.gov/site/index.html",
  "https://www.in.gov/sos/elections/files/2026-General-Candidate-List.7-6-26.pm.xlsx",
  "https://www.in.gov/sos/elections/files/Primary-Candidate-List-3.25.26.xlsx",
];
export const IN_RETRIEVED_AT = "2026-07-15";

export const IN_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Frank J. Mrvan (DEM, incumbent)
  {
    district: "01",
    name: "Frank J. Mrvan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Barb Regnitz",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Alexander R. (Alex) Degman",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "01",
    name: "Prescription Dope Deaths Johnson, Jr.",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 02 — Rudy Yakym (REP, incumbent)
  {
    district: "02",
    name: "Rudy Yakym",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Jamee Decio",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "William Eric Henry",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Marlin A. Stutzman (REP, incumbent)
  {
    district: "03",
    name: "Marlin A. Stutzman",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Kelly Thompson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Phillip D. (Phil) Beachy",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 04 — Jim Baird (REP, incumbent)
  {
    district: "04",
    name: "Jim Baird",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Drew Cox",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "David E. Bokash",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // District 05 — Victoria Spartz (REP, incumbent)
  {
    district: "05",
    name: "Victoria Spartz",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "J.D. Ford",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 06 — Jefferson Shreve (REP, incumbent)
  {
    district: "06",
    name: "Jefferson Shreve",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: 'Cynthia ("Cinde") Wirth',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 07 — André Carson (DEM, incumbent)
  {
    district: "07",
    name: "André Carson",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Patrick McAuley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "James M. Sceniak",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 08 — Mark Messmer (REP, incumbent)
  {
    district: "08",
    name: "Mark Messmer",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Mary Allen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 09 — Erin Houchin (REP, incumbent)
  {
    district: "09",
    name: "Erin Houchin",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Brad A. Meyer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Floyd Michael Taylor",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "09",
    name: "Tonya L. Hudson",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
