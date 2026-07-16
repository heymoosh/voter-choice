/**
 * scripts/congressional-rosters/mo-official-roster-2026.ts
 *
 * Missouri's 2026 official congressional roster for the August 4, 2026
 * primary election — covers all 8 US House districts. Missouri has no 2026
 * US Senate race: Josh Hawley (Class 1) was re-elected November 2024 (term
 * to January 2031, next up 2030); Eric Schmitt (Class 3) was elected 2022
 * (next up 2028). Neither Missouri Senate seat is on the 2026 ballot. Built
 * through the same manual official-source pipeline as Arizona, Texas,
 * Oklahoma, Alabama, and Indiana (epic c5a813bb); this is Missouri's build
 * (card "[P0] Import + verify official roster: Missouri (MO)").
 *
 * MISSOURI-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/missouri-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Missouri's Secretary of State runs its own in-house
 *     "CandidatesOnWeb" system (s1.sos.mo.gov/candidatesonweb/), a
 *     database-backed ASP.NET application (.aspx pages, query-string driven
 *     by ElectionCode/OfficeCode) — dynamic HTML tables, no XLSX/JSON
 *     export. Unlike TX's Civix portal, this source rendered cleanly via a
 *     plain fetch; no browser automation was needed for the SOS pages
 *     (house.gov's member directory did require it — see below).
 *   - PRIMARY-STAGE ROSTER, not post-primary. Candidate filing closed
 *     March 31, 2026 (list final — no new filers possible), and the primary
 *     ballot was certified/locked May 26, 2026, but the August 4, 2026
 *     primary itself has NOT yet been held as of this fixture's retrieval
 *     date (2026-07-15). Missouri has no runoff system for congressional
 *     primaries, so every filed, non-withdrawn candidate here is recorded
 *     `qualified_for_primary_ballot` — none are `qualified_for_general_ballot`
 *     (the general-election nominee per district/party isn't determined
 *     until the primary) and none are `runoff_pending` (no such mechanism
 *     exists in Missouri).
 *   - Missouri's Libertarian Party fields its own primary ballot on the SAME
 *     August 4, 2026 date (confirmed via county election-authority notices,
 *     e.g. St. Charles County's "August 4, 2026 Libertarian Party Ballot")
 *     — Libertarian filers are therefore recorded `qualified_for_primary_ballot`
 *     like the major-party rows, not `qualified_for_general_ballot` via
 *     convention nomination (unlike Indiana's Libertarian rows, which ARE
 *     convention-nominated with no primary).
 *   - No independent or NPA filers and no write-in filers appear on the
 *     source as of retrieval — Missouri's write-in declaration window
 *     typically opens closer to the election and was not yet populated.
 *   - Candidate-count cross-check: the source page's own summary table
 *     reports 61 total "United States Representative" filers across all 8
 *     districts (28 Republican / 25 Democratic / 8 Libertarian) — this
 *     fixture's 61 rows match that total exactly.
 *   - WITHDRAWN CANDIDATES (excluded from this fixture, per the SOS's own
 *     CandidatesRemoved.aspx list, verbatim office labels confirmed):
 *     Sam Graves (R) — District 6, withdrawn 3/27/2026 (see incumbency note
 *     below); Nathanael Schultz (R) — District 1, withdrawn 3/31/2026 (a
 *     same-named candidate remains an ACTIVE District 6 Republican filer —
 *     the SOS's own active/withdrawn lists are internally consistent on
 *     this, so recorded as two distinct filings, not resolved further);
 *     Sean Smith (R) — District 5, withdrawn 3/31/2026; Mike Conner (D) —
 *     District 3, withdrawn 4/8/2026; Clayton Christopher Harbison (D) —
 *     District 8, withdrawn 5/15/2026; Nick Vivio (D) — District 2,
 *     withdrawn 5/18/2026. None of these six names appear in the active
 *     placement list fetched the same session, confirming the source's
 *     active roster already excludes them.
 *   - INCUMBENCY was cross-checked against a second independent official
 *     source, never guessed from either Missouri source or this app's
 *     FEC-derived `candidates` table: house.gov's "By State and District"
 *     member directory (via `claude-in-chrome` browser automation — this
 *     page 403s on a plain WebFetch, same lazy-loads-on-scroll behavior
 *     noted in the Indiana build), confirmed 2026-07-15: Bell (D-01),
 *     Wagner (R-02), Onder (R-03), Alford (R-04), Cleaver (D-05), Graves
 *     (R-06), Burlison (R-07), Smith (R-08).
 *   - DISTRICT 6 IS AN OPEN SEAT: Sam Graves is Missouri's 6th District's
 *     CURRENTLY SITTING representative per house.gov, but he WITHDREW his
 *     2026 candidacy (per the SOS withdrawn-candidates list, 3/27/2026) and
 *     does not appear anywhere in the active District 6 filer list. No
 *     candidate in District 6 is recorded `isIncumbent: true` — this is a
 *     genuine open-seat finding, not an omission.
 *   - Every other district's primary winner-to-be is contested between the
 *     sitting incumbent (running for re-election in their own district, no
 *     cross-district filing complications observed) and multiple
 *     challengers, following the same pattern as Indiana's clean case.
 *
 * Sources:
 *   - https://s1.sos.mo.gov/candidatesonweb/DisplayCandidatesPlacement.aspx?ElectionCode=750006905
 *     (Missouri SOS "CandidatesOnWeb" — cumulative certified candidate list
 *     with ballot placement, 2026 Primary Election, ElectionCode 750006905;
 *     retrieved 2026-07-15)
 *   - https://s1.sos.mo.gov/candidatesonweb/CandidatesRemoved.aspx?ElectionCode=750006905
 *     (Missouri SOS "CandidatesOnWeb" — withdrawn/removed candidates for the
 *     same election, used to confirm the six US House withdrawals listed
 *     above; retrieved 2026-07-15)
 *   - https://www.sos.mo.gov/elections/candidates (candidate-filing hub,
 *     "Primary Election August 4, 2026")
 *   - https://www.sos.mo.gov/elections/calendar/2026cal (2026 Missouri
 *     election calendar — source for the standing calendar dates recorded
 *     in the data-check doc, including the March 31 filing close, May 26
 *     primary ballot-certification deadline, and general-election dates)
 *   - https://www.house.gov/representatives ("By State and District" tab,
 *     Missouri section — incumbency cross-check, retrieved 2026-07-15 via
 *     browser automation)
 *
 * Coverage: all 8 US House districts, 61 candidates. No US Senate contest
 * in 2026. Every row is `qualified_for_primary_ballot` (Missouri's August 4,
 * 2026 primary has not yet occurred). No `runoff_pending` rows — Missouri
 * has no congressional runoff system. No write-in rows — none published as
 * of retrieval.
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the certified PRE-PRIMARY filer set as of
 *     2026-07-15. It does NOT yet reflect the August 4, 2026 primary's
 *     outcome — a dated follow-up card (NOT BEFORE 2026-08-05) has been
 *     opened to capture the general-election roster once the primary is
 *     certified.
 *   - Missouri's own general-election candidate-withdrawal deadline (RSMo
 *     115.359 — eleventh Tuesday before the general election, i.e. August
 *     18, 2026 for the November 3, 2026 general) and general-ballot
 *     certification deadline (August 25, 2026, per the SOS election
 *     calendar) both still lie ahead and only become relevant once the
 *     primary has produced nominees; see the data-check doc's calendar-
 *     dates section.
 *   - The Nathanael Schultz District 1 (withdrawn) vs District 6 (active)
 *     duplication noted above was not further investigated (e.g. whether
 *     it is one person who re-filed in a different district, or two
 *     distinct people) — recorded as observed, not resolved.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MO_STATE = "MO";
export const MO_ELECTION_YEAR = 2026;
// Missouri's August 4, 2026 primary has not yet occurred as of retrieval —
// every filed, non-withdrawn candidate here is a primary-ballot filer, not
// yet a determined general-election nominee.
export const MO_STAGE = "primary" as const;
export const MO_HOUSE_SOURCE_URLS = [
  "https://s1.sos.mo.gov/candidatesonweb/DisplayCandidatesPlacement.aspx?ElectionCode=750006905",
  "https://s1.sos.mo.gov/candidatesonweb/CandidatesRemoved.aspx?ElectionCode=750006905",
];
export const MO_RETRIEVED_AT = "2026-07-15";

export const MO_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Wesley Bell (DEM, incumbent) vs. a Cori Bush comeback bid
  {
    district: "01",
    name: "Paul Berry III",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Andrew Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Alissa Murphy",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Carl E. Harris Sr",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Cori Bush",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Wesley Bell",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Carl Earnest Henderson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Tom Schmitz",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 02 — Ann Wagner (REP, incumbent)
  {
    district: "02",
    name: "Peter A. Pfeifer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Brandon Wilkinson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Ann Wagner",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Matthew R. Grant",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Elizabeth Sparks-Holmes",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Timothy D. Bilash",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Joan VonDras",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Fred Wellman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Brandon Coulter Daugherty",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 03 — Bob Onder (REP, incumbent)
  {
    district: "03",
    name: "John G Fraser",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Bob Onder",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Bethany E Mann",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Paul T. Wilson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Tommy Holstein",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Jim Higgins",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 04 — Mark Alford (REP, incumbent)
  {
    district: "04",
    name: "Mark Alford",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Heather Shelton",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Scott Vincent Vera",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jordan Herrera",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Wayne Russell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Hartzell Gray 3rd",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "G Rick",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jeanette Cass",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Ashleigh Rogers",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Randy Miller",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Thomas Holbrook",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 05 — Emanuel Cleaver, II (DEM, incumbent)
  {
    district: "05",
    name: "Brad Patty",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Brett Hueffmeier",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Taylor Burks",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Rick Brattin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Berton A. Knox",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Micah Beebe",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Emanuel Cleaver, II",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Randall (Randy) Langkraehr",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 06 — OPEN SEAT: Sam Graves (sitting incumbent) withdrew
  // 3/27/2026; no candidate here is recorded as incumbent.
  {
    district: "06",
    name: "Jim Ingram",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Chris Stigall",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Nathan Hall Willett",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Cody J. Oshel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Nathanael Schultz",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Josh Smead",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Scot Pondelick",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Matt Levine",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Andy Maidment",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 07 — Eric Burlison (REP, incumbent)
  {
    district: "07",
    name: "John Casey",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Grayson Hunt",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Eric W. Burlison",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Missi Hesketh",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Kevin Craig",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // District 08 — Jason T. Smith (REP, incumbent)
  {
    district: "08",
    name: "Jason T. Smith",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Gordon Heslop",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Chris Reichard",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Frank A. Barnitz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Rebecca Sharpe Lombard",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];
