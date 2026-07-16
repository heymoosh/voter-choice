/**
 * scripts/congressional-rosters/il-official-roster-2026.ts
 *
 * Illinois's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 17 US House districts and the 2026 US
 * Senate race (Dick Durbin's open seat). Built through the same manual
 * official-source pipeline as Arizona, Texas, Oklahoma, Alabama, Alaska,
 * Colorado, Connecticut, California, Arkansas, and Florida (epic c5a813bb);
 * this is Illinois's build (card "[P0] Import + verify official roster:
 * Illinois (IL)").
 *
 * ILLINOIS-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/illinois-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Illinois's official candidate-tracking system is a legacy
 *     ASP.NET WebForms application at elections.il.gov (AJAX UpdatePanels
 *     and __doPostBack postbacks under the hood, but no browser automation
 *     was actually needed — see the data-check doc for the exact navigation
 *     path through "Candidate Filing and Results" > "Candidate Filing
 *     Search" > "REPRESENTATIVE IN CONGRESS" office type > "All Candidates"
 *     > Page Size "All", which returns every one of the 38 congressional
 *     filers on one page).
 *   - IL_STAGE = "general": Illinois's March 17, 2026 primary is already
 *     PAST as of this fixture's transcription (2026-07-15) — unlike
 *     Florida's still-pending Aug 18 primary, every major-party nominee
 *     here is already determined. All 17 House districts show exactly one
 *     Democratic and one Republican nominee (no contested-primary rows, no
 *     `runoff_pending`).
 *   - CRITICAL FINDING — five sitting members are NOT on the 2026 general
 *     ballot at all, despite Illinois having no mid-decade redistricting
 *     (district lines/numbers are unchanged from the prior cycle, so this
 *     is NOT a TX Al Green-style district-hop): Robin Kelly (IL-2), Jesús
 *     "Chuy" García (IL-4), Danny K. Davis (IL-7), Raja Krishnamoorthi
 *     (IL-8), and Jan Schakowsky (IL-9). Each was searched by full name
 *     across ALL 17 districts' candidate lists AND the Senate list — none
 *     appear anywhere on the Nov 3, 2026 ballot. These five seats are
 *     recorded as open (`isIncumbent: false` for every candidate in that
 *     contest). Per the plan doc's SAFETY rule, no reason for their absence
 *     is asserted here beyond the observed fact (not on the ballot) — this
 *     build did not independently confirm retirement vs. primary defeat
 *     for each.
 *   - THE NEAR-MISS THIS FINDING GUARDS AGAINST: IL-4's Democratic nominee
 *     is "Patty Garcia" — a surname match for sitting member Jesús García,
 *     but a different person (confirmed by full first name against
 *     house.gov). Matching incumbency by district + surname alone, without
 *     checking the full name, would have incorrectly tagged Patty Garcia
 *     `isIncumbent: true`. Incumbency here was cross-checked by full NAME
 *     against house.gov's member directory for every one of Illinois's 17
 *     sitting representatives, not by district number or surname alone.
 *   - The US Senate race is Dick Durbin's OPEN seat (Durbin is retiring;
 *     not on the 2026 candidate list under any office). No incumbent on
 *     this contest. Four candidates filed: Juliana Stratton (DEM, sitting
 *     Lieutenant Governor), Don Tracy (REP), Whitfield Harrington Jr.
 *     (American Center Party), and Tyrone F. Muhammad (Independent) — the
 *     last of whom carries `Status: Removed` on the SBE portal (removed
 *     7/14/2026) and is therefore EXCLUDED from this fixture; he is not on
 *     the general-election ballot.
 *   - TWO INDEPENDENT IL-4 FILERS CARRY AN ACTIVE, UNRESOLVED BALLOT-ACCESS
 *     OBJECTION: Mayra Macias and Byron Sigcho Lopez (both filed 5/26/2026
 *     as IL-4 independents) each show `Objection Pending: Yes` on their
 *     individual SBE candidate-detail pages, tied to an identical objection
 *     ("Rivera, Munoz, Mendez v. [name]") filed 6/2/2026, still marked
 *     PENDING as of this build's live check (2026-07-15) — six weeks past
 *     the SBE's own "Procedures on Objections" timeline, which specifies an
 *     electoral board meeting 3-5 days after an objection is received. Per
 *     the plan doc's SAFETY rule against inferring a determined status from
 *     an ambiguous signal, these two rows are recorded as
 *     `declared_general_ballot_intent` (filed, not yet finally certified),
 *     NOT `qualified_for_general_ballot` — their SBE filing `Status` field
 *     itself still reads "Active", but that field does not reflect the
 *     live, unresolved legal challenge to their ballot access. The third
 *     IL-4 independent, Chris Getty, carries `Objection Pending: No` on his
 *     own detail page and is recorded as `qualified_for_general_ballot`.
 *   - New party codes added to `types.ts` for this build: `WCP` (Working
 *     Class Party, IL-4's Ed Hershey) and `ACP` (American Center Party,
 *     Senate candidate Whitfield Harrington Jr.) — both read verbatim from
 *     the SBE's own official candidate-filing "Party" field, which is
 *     itself the official record (unlike AIP/PF/NPP/LPF/FFP, no separate
 *     state party-list page needed checking, since the filing system IS
 *     that authority for Illinois).
 *   - GOVERNING CALENDAR DATES (from the State Board of Elections' 2026
 *     Election & Campaign Finance Calendar, "General Election" section):
 *     Friday, August 21, 2026 — SBE ballot certification (last day the SBE
 *     certifies established-party, new-party, independent, and
 *     vacancy-filling candidates for the General Election ballot; this is
 *     Illinois's ballot-content-locked date) AND the SBE candidate
 *     Withdrawal-of-Candidacy deadline (same date, same source); Monday,
 *     October 19, 2026 — last day a vacancy in nomination may occur AND be
 *     filled for the General Election (the true final
 *     candidate-substitution cutoff — a nominee who dies or withdraws after
 *     this date cannot be replaced on the printed ballot). See the
 *     data-check doc's deliverable-requirement section for the full
 *     citation and the dated follow-up card opened alongside this build.
 *
 * Sources:
 *   - https://elections.il.gov/ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d
 *     (Illinois State Board of Elections — Candidate Filing Search, General
 *     Election 11/3/2026, "REPRESENTATIVE IN CONGRESS" office type, "All
 *     Candidates" status, Page Size "All" — retrieved 2026-07-15)
 *   - https://elections.il.gov/ElectionOperations/CandidatesFiled.aspx
 *     (Candidates Filed list, sorted by Office — used to confirm the full
 *     United States Senator field, 4 total filers, retrieved 2026-07-15)
 *   - https://elections.il.gov/ElectionOperations/CandidateDetailEO.aspx
 *     (individual candidate detail pages — Write-In / Objection Pending
 *     fields — for the two IL-4 independents with a pending objection and
 *     for Chris Getty, retrieved 2026-07-15)
 *   - https://www.house.gov/representatives (member directory, "By State
 *     and District", incumbency cross-check by full name, retrieved
 *     2026-07-15)
 *   - Illinois State Board of Elections, 2026 Election & Campaign Finance
 *     Calendar (elections.il.gov/RunningForOffice.aspx, "2026 Election and
 *     Campaign Finance Calendar" PDF), General Election dates section,
 *     retrieved 2026-07-15
 *
 * Coverage: all 17 US House districts + the 2026 US Senate race. Every
 * major-party nominee is `qualified_for_general_ballot` (primary already
 * settled); the two IL-4 independents with a pending ballot-access
 * objection are `declared_general_ballot_intent`; no `runoff_pending` rows
 * (no runoff mechanism applies here — Illinois primaries are decided by
 * plurality).
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the qualified/filed candidate list as of
 *     2026-07-15. The two pending IL-4 objections (Macias, Sigcho Lopez)
 *     could resolve either way after this date; see the dated re-check card
 *     opened alongside this build for the Aug 21, 2026 ballot-certification
 *     re-check.
 *   - This build did not independently confirm the specific reason (
 *     retirement vs. primary defeat vs. running for a different office) for
 *     any of the five sitting members absent from the 2026 ballot.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const IL_STATE = "IL";
export const IL_ELECTION_YEAR = 2026;
// Illinois's March 17, 2026 primary is already past — every major-party
// nominee below is determined. See docblock for the two IL-4 independents
// whose ballot access remains contested by a pending objection.
export const IL_STAGE = "general" as const;
export const IL_HOUSE_SOURCE_URLS = [
  "https://elections.il.gov/ElectionOperations/CandidateFilingSearch.aspx?ID=sejIrI%2bQmww%3d",
];
export const IL_SENATE_SOURCE_URLS = [
  "https://elections.il.gov/ElectionOperations/CandidatesFiled.aspx",
];
export const IL_RETRIEVED_AT = "2026-07-15";

export const IL_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Jonathan Jackson (DEM, incumbent)
  {
    district: "01",
    name: "Jonathan L. Jackson",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Christian Maxwell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — open seat; sitting member Robin Kelly is not on the 2026
  // ballot for any federal office.
  {
    district: "02",
    name: "Donna Miller",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Michael Scott Noack",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Delia Ramirez (DEM, incumbent)
  {
    district: "03",
    name: "Delia Ramirez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Angel Oakley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 04 — open seat; sitting member Jesús "Chuy" García is not on
  // the 2026 ballot (Patty Garcia, this district's DEM nominee, is a
  // different person — see docblock). Two independents (Macias, Sigcho
  // Lopez) carry a pending, unresolved ballot-access objection.
  {
    district: "04",
    name: "Patty Garcia",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Lupe Castillo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Ed Hershey",
    party: "WCP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Chris Getty",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Mayra Macias",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "04",
    name: "Byron Sigcho Lopez",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // District 05 — Mike Quigley (DEM, incumbent)
  {
    district: "05",
    name: "Mike Quigley",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Tommy Hanson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 06 — Sean Casten (DEM, incumbent)
  {
    district: "06",
    name: "Sean Casten",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Niki Conforti",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 07 — open seat; sitting member Danny K. Davis is not on the
  // 2026 ballot.
  {
    district: "07",
    name: "La Shawn K. Ford",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Chad Koppie",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 08 — open seat; sitting member Raja Krishnamoorthi is not on
  // the 2026 ballot for any federal office (including the Senate race).
  {
    district: "08",
    name: "Melissa L. Bean",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Jennifer Davis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 09 — open seat; sitting member Jan Schakowsky is not on the
  // 2026 ballot.
  {
    district: "09",
    name: "Daniel Biss",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "John Elleson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 10 — Brad Schneider (DEM, incumbent)
  {
    district: "10",
    name: "Brad Schneider",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Carl Lambrecht",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 11 — Bill Foster (DEM, incumbent)
  {
    district: "11",
    name: "Bill Foster",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Jeff Walter",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 12 — Mike Bost (REP, incumbent)
  {
    district: "12",
    name: "Julie Fortier",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Mike Bost",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 13 — Nikki Budzinski (DEM, incumbent)
  {
    district: "13",
    name: "Nikki Budzinski",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Jeff Wilson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 14 — Lauren Underwood (DEM, incumbent)
  {
    district: "14",
    name: "Lauren Underwood",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: 'James T. "Jim" Marter',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 15 — Mary Miller (REP, incumbent)
  {
    district: "15",
    name: "Jennifer Todd",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Mary E. Miller",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 16 — Darin LaHood (REP, incumbent)
  {
    district: "16",
    name: "Paul Nolley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Darin LaHood",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 17 — Eric Sorensen (DEM, incumbent)
  {
    district: "17",
    name: "Eric Sorensen",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Dillan S. Vancil",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// Dick Durbin's open seat (retiring) — no incumbent in this contest. Tyrone
// F. Muhammad (Independent) filed but carries SBE Status: Removed
// (7/14/2026) and is excluded — not on the general-election ballot.
export const IL_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Juliana Stratton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Don Tracy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Whitfield Harrington Jr.",
    party: "ACP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
