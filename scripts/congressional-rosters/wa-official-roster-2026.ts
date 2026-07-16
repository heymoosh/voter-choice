/**
 * scripts/congressional-rosters/wa-official-roster-2026.ts
 *
 * Washington's 2026 official congressional roster — covers all 10 US House
 * districts. Built through the same manual official-source pipeline as
 * Arizona, Texas, Oklahoma, California, etc. (epic c5a813bb); this is
 * Washington's build.
 *
 * WASHINGTON-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/washington-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Washington's official candidate-filing source is NOT Civix-vended —
 *     it's a plain server-rendered ASP.NET grid at
 *     voter.votewa.gov/CandidateList.aspx?e=898 (WA SoS's own "VoteWA"
 *     system), reachable directly via a normal browser session; no JS SPA,
 *     no virtualized scroll, no 403 on a rendered page load. The Civix
 *     portal playbook in the nationwide roster plan doc does not apply.
 *   - Washington runs a nonpartisan "Top Two" primary (I-872; RCW
 *     29A.24.030-.050): every candidate regardless of party appears on one
 *     shared primary ballot, and the top two vote-getters (regardless of
 *     party) advance to the general. Washington's August 4, 2026 primary
 *     had NOT yet happened at transcription time (2026-07-16) — so, unlike
 *     California's already-certified top-two build (which has real
 *     `qualified_for_general_ballot` winners), every filed WA candidate
 *     below is `qualified_for_primary_ballot`. This is the AZ-style
 *     "upcoming primary" case, not OK's "pending runoff" case — there are
 *     no runoff finalists to represent, since the general nominees are
 *     entirely undetermined pre-primary in a top-two system.
 *   - Washington's top-two law lets a candidate self-designate ANY party
 *     preference (up to 16 characters) — it need not be a registered party.
 *     Six new WA-specific party codes were added to types.ts to preserve
 *     these literal self-designated labels verbatim (CAS/SNP/TRR/FTR/SWP/
 *     UNP) — see that file's comment block for the full rationale.
 *   - TWO CANDIDATES WITHDREW before the May 11, 2026 statutory withdrawal
 *     deadline and are EXCLUDED from this roster entirely (never appeared
 *     on any ballot, so recording them as `qualified_for_primary_ballot`
 *     would be wrong): Raymond Pelletti (CD-2, REPUBLICAN, filed
 *     5/5/2026, status "Withdrawn") and Mike Gahvarehchee (CD-5,
 *     DEMOCRATIC, filed 5/8/2026, status "Withdrawn"). Both are recorded
 *     here in this comment, not in the roster array, per the same
 *     with drawal-tracking discipline the plan doc's calendar-date
 *     requirement calls for.
 *   - OPEN SEAT FINDING (cross-check against house.gov): CD-4's sitting
 *     incumbent, Dan Newhouse (R), announced December 17, 2025 that he
 *     would NOT seek re-election in 2026 (confirmed via his own press
 *     release at newhouse.house.gov and three independent news sources —
 *     Spokesman-Review, Washington State Standard, Ballotpedia News).
 *     house.gov/representatives still lists Newhouse as WA-4's current
 *     sitting member (he serves out his term through January 2027), but he
 *     is NOT a 2026 candidate and does not appear in the SoS filing list.
 *     CD-4 is therefore an open seat — isIncumbent: false for all 11 CD-4
 *     filers below, which matches the "11 candidates vie to replace Dan
 *     Newhouse" count independently reported by the Spokesman-Review.
 *   - Incumbency for the other 9 districts was cross-checked against
 *     house.gov/representatives ("By State and District" tab) by name +
 *     district match: WA-1 Suzan DelBene (D), WA-2 Rick Larsen (D), WA-3
 *     Marie Gluesenkamp Perez (D), WA-5 Michael Baumgartner (R), WA-6 Emily
 *     Randall (D), WA-7 Pramila Jayapal (D), WA-8 Kim Schrier (D), WA-9
 *     Adam Smith (D), WA-10 Marilyn Strickland (D) — all confirmed filed
 *     for re-election in the SoS list.
 *   - NO US SENATE RACE in 2026: confirmed both ways — (a) WA's two US
 *     Senators, Patty Murray (re-elected 2022, term to Jan 2029) and Maria
 *     Cantwell (re-elected 2024, term to Jan 2031), have terms extending
 *     well past 2026; (b) filtering the SoS candidate list's Race column
 *     for "Senator" returns only Legislative "State Senator" (WA state
 *     legislature) races, zero "U.S. Senator" rows.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const WA_STATE = "WA";
export const WA_ELECTION_YEAR = 2026;
// Washington's August 4, 2026 top-two primary had not yet occurred at
// transcription time (2026-07-16) — every row below is a primary filer,
// never a determined general-ballot nominee.
export const WA_STAGE = "primary" as const;
export const WA_HOUSE_SOURCE_URLS = [
  "https://voter.votewa.gov/CandidateList.aspx?e=898",
  "https://www.sos.wa.gov/elections/candidates",
];
export const WA_RETRIEVED_AT = "2026-07-16";

// CD-4 is an open seat (incumbent Dan Newhouse not seeking re-election —
// see docblock above).
export const WA_OPEN_SEAT_DISTRICTS = ["04"];

export const WA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // CD-01 (7 filers)
  {
    district: "01",
    name: "Benjamin Kincaid",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Suzan DelBene",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Bryce Nickel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "James Etzkorn",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Hunter Gordon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Mary Silva",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Catherine Hildebrand",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-02 (5 filers; Raymond Pelletti withdrew — excluded, see docblock)
  {
    district: "02",
    name: "Edwin H. Feller",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Tomas Scheel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Devin Hermanson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Rick Larsen",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-03 (9 filers)
  {
    district: "03",
    name: "Marie Gluesenkamp Perez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Brent Hennrich",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "John P. Roco",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "John Saulie-Rohman",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Troy Rasband",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "John Braun",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Antony Barran",
    party: "CAS",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Austin Braswell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Lawrence Kellogg",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-04 (11 filers; open seat — Newhouse not seeking re-election)
  {
    district: "04",
    name: 'Jacek "Jack" Kobiesa',
    party: "SNP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Amanda McKinney",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "John Duresky",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "John C. Hughs",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Favian Valencia",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jerrod Sessler",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Devin Poore",
    party: "CAS",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Ken Vaz",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Zac Rossi",
    party: "SNP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Elpidia Saavedra",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Matt Boehnke",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-05 (12 filers; Mike Gahvarehchee withdrew — excluded, see docblock)
  {
    district: "05",
    name: "Nate Powell",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Carmela Conroy",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Matthew Hayes",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Bajun R. Mavalwalla",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Michael McGarr",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Kevin Fagan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Michael Baumgartner",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Kyle Usrey",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Andrew Bartleson",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Ann Marie Danimus",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Richard Freudenberg",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "David Womack",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-06 (5 filers)
  {
    district: "06",
    name: "Emily Randall",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Brian P. O'Gorman",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Teresa Fox",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Macy Jones",
    party: "SNP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Leon Lawson",
    party: "TRR",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-07 (4 filers)
  {
    district: "07",
    name: "David W. Blomstrom",
    party: "FTR",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Pramila Jayapal",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Nirav Sheth",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Gwen Kirkland",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-08 (6 filers)
  {
    district: "08",
    name: "Kim Schrier",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Trinh Ha",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Spencer Meline",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Keith Arnold",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Andres Valleza",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Bob Hagglund",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-09 (5 filers)
  {
    district: "09",
    name: "Jacob Perasso",
    party: "SWP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Kshama Sawant",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Melissa Chaudhry",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Doug Basler",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Adam Smith",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // CD-10 (6 filers)
  {
    district: "10",
    name: "Adam Arafat",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Marilyn Strickland",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Kurtis Engle",
    party: "UNP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Alex Scheel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Derek Maynes",
    party: "SNP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Chris D. Chung",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];
