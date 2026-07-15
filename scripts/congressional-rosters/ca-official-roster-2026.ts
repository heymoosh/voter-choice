/**
 * scripts/congressional-rosters/ca-official-roster-2026.ts
 *
 * California's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 52 US House districts. No US Senate race
 * appears on California's 2026 ballot (Padilla's term runs to 2029, Schiff's
 * to 2031 — confirmed absent from both the Notice to Candidates and the
 * Statement of Vote, and from the CA SoS's own statewide-election-results
 * office list). Built through the same manual official-source pipeline as
 * Arizona (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86),
 * and Alaska (card 8dd3c1b3), epic c5a813bb; this is California's build.
 *
 * CALIFORNIA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/california-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - California runs a nonpartisan top-two "jungle primary" (not a
 *     party-primary system like AZ/TX/OK/AL, and not AK's top-four): every
 *     candidate for a seat, regardless of party, runs on ONE combined June
 *     2, 2026 primary ballot, and the top TWO vote-getters by raw count —
 *     regardless of party — advance to November. The primary is already
 *     certified (2026-07-10), so every district's top-two is fully
 *     determined; `runoff_pending` does not apply anywhere in this fixture.
 *   - NINE districts have two same-party advancers (vote-splitting on the
 *     other side, not a data error): CD-04, CD-07, CD-11, CD-12, CD-14,
 *     CD-29, CD-34, CD-37 (all two-Democrat), and CD-40 (two-Republican —
 *     see the CD-40 correction below). Two districts are razor-thin:
 *     CD-01 (Gallagher 92,975 vs McGuire 92,121) and CD-27 (Gibbs 62,758 vs
 *     Whitesides 62,214).
 *   - **CD-40 CORRECTION (found during this build's own verification, not
 *     present in the initial precomputed research handed off for this
 *     build):** the certified Statement of Vote gives Ken Calvert (REP)
 *     75,811 votes and Young Kim (REP) 44,818 votes — both ahead of Esther
 *     Kim-Varet (DEM), who received 36,072. The true top-two for CD-40 is
 *     therefore Calvert + Kim (both Republican), NOT Calvert + Kim-Varet as
 *     an earlier hand-transcription pass had it. Verified independently by
 *     summing each candidate's county-level subtotals (Orange + Riverside)
 *     against the PDF's own "District Totals" row and cross-checking the
 *     printed percentages — exact match. This fixture reflects the
 *     corrected result: Kim carries `qualified_for_general_ballot`,
 *     Kim-Varet carries `qualified_for_primary_ballot`. See the data-check
 *     doc for the full arithmetic.
 *   - Write-in vote tallies for names not on the printed Notice to
 *     Candidates ballot are excluded entirely (not real qualified filers,
 *     no status invented for them): Mark Stewart Greenstein DEM (W/I, 5
 *     votes, CD-44), Steve Slauson REP (W/I, 279 votes, CD-12), Deborah
 *     Kristianto NPP (W/I, 27 votes — confirmed during this build's SoV
 *     re-verification to actually be in CD-35, not CD-32 as an earlier
 *     research note had it; excluded either way since write-ins are never
 *     transcribed as rows), Frances Yasmeen Motiwalla DEM (W/I, 1,010
 *     votes, CD-52), Tony S. Castro DEM (W/I, 49 votes, CD-46), Renee
 *     Longshore / Robert Matthew Riter (W/I, single digits, CD-23), Michael
 *     A Petrelis GRN (W/I, 7 votes, CD-11).
 *   - Party-code judgment calls (two new codes added to
 *     scripts/congressional-rosters/types.ts): (1) "NPP" ("No Party
 *     Preference," Cal. Elec. Code § 2151) — a distinct legal ballot
 *     designation, not the generic declared-independent "IND" already in
 *     the enum, mirroring why Alaska's build added "NPA" instead of reusing
 *     IND. (2) "PF" (Peace and Freedom, a real CA-recognized minor party —
 *     Helena Pasquarella, CD-24; John Thompson Parker, CD-37) — mirrors the
 *     AIP/AKP precedent for a state's own recognized minor party. (3) Green
 *     Party candidate (Chris Richardson, CD-03) is recorded with the
 *     EXISTING `GRE` code rather than adding a new `GRN` to match CA's own
 *     printed ballot abbreviation letter-for-letter — unlike NPP/PF, this is
 *     not a distinct legal concept, just a different two-letter
 *     abbreviation for the same real-world Green Party already represented
 *     in the enum (see AK's Richard Grayson, US Senate, also coded `GRE`);
 *     adding a near-duplicate code for the identical party would fragment
 *     the enum without capturing any real distinction.
 *   - Incumbency was cross-checked against the official US House Clerk's
 *     member data feed (clerk.house.gov/xml/lists/MemberData.xml, a
 *     house.gov-domain source), NEVER from a candidate's own self-described
 *     occupation line in the Notice to Candidates PDF (many CA incumbents
 *     self-describe as "Member of Congress," "United States
 *     Representative," etc. — treated as a hint only). This surfaced a
 *     major, non-obvious structural fact: **California's district NUMBERS
 *     shifted for a subset of seats between the current Congress and this
 *     2026 ballot** (e.g. Ami Bera: old CA-06 -> new CD-03; Kevin Kiley:
 *     old CA-03 -> new CD-06; Linda Sánchez: old CA-38 -> new CD-41; Ken
 *     Calvert: old CA-41 -> new CD-40). Matching by raw district number
 *     between the Clerk feed and this ballot would have silently produced
 *     wrong incumbency flags across a dozen-plus districts; every
 *     incumbent below was instead matched by full name against the WHOLE
 *     52-district candidate list, then assigned to whichever new district
 *     that name actually appears in.
 *   - **FIVE open seats** (no sitting member of Congress, per the Clerk
 *     feed, filed anywhere in the 52-district candidate list): CD-11
 *     (Nancy Pelosi), CD-14 (already vacant under the old map), CD-26
 *     (Julia Brownley), CD-38 (no current incumbent maps here — Hilda
 *     Solis, a past-but-not-current member, is a candidate but not flagged
 *     incumbent), and CD-48 (Darrell Issa). Confirmed absent, not omitted —
 *     none of these three names (Pelosi/Brownley/Issa) appears anywhere in
 *     either source PDF.
 *   - **CD-40 is a real incumbent-vs-incumbent collision**, a direct
 *     consequence of the district renumbering above: sitting Representative
 *     Ken Calvert (old CA-41) and sitting Representative Young Kim (old
 *     CA-40) were drawn into the SAME new district and both filed there.
 *     Both are flagged `isIncumbent: true` — `isIncumbentSeekingReelection`
 *     (src/lib/server/officialRoster.ts) only checks whether ANY roster row
 *     for the seat is flagged incumbent, so two incumbent rows in one
 *     contest doesn't break that function; the name-mismatch check inside
 *     it is a log-only cross-check, never a gate. Kim won the primary
 *     outright (see the CD-40 correction above); Calvert placed first.
 *     Kim-Varet, the non-incumbent Democrat, lost.
 *
 * Sources:
 *   - https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf
 *     (CA SoS "Notice to Candidates, June 2, 2026 Primary Election" — party
 *     designation per candidate, all 52 districts, dated per-district
 *     March 21-24, 2026)
 *   - https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/76-us-rep.pdf
 *     (CA SoS certified "Statement of Vote, United States Representative by
 *     District," certified 2026-07-10 — vote totals used to determine
 *     top-two for every district)
 *   - https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/primary-election-june-2-2026/statement-vote
 *     (Statement of Vote landing page — confirms no US Senate contest this
 *     cycle)
 *   - https://clerk.house.gov/xml/lists/MemberData.xml (incumbency
 *     cross-check only — the source of the redistricting/open-seat/CD-40
 *     collision findings above)
 *
 * Coverage: all 52 US House districts. No Senate race this cycle.
 *
 * KNOWN LIMITATIONS:
 *   - Names are recorded as they appear in the official Notice to
 *     Candidates / Statement of Vote; not independently re-verified against
 *     a third document beyond the incumbency cross-check above.
 *   - Independent petition-signature verification status (if any candidate
 *     here ran via that path rather than a party) was not separately
 *     tracked — California's top-two system means every candidate,
 *     independent or not, is simply "qualified_for_primary_ballot" or
 *     "qualified_for_general_ballot" per the same certified vote count, so
 *     this fixture has no `declared_general_ballot_intent` rows (unlike
 *     TX/OK's separate independent-declaration tracking).
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const CA_STATE = "CA";
export const CA_ELECTION_YEAR = 2026;
// California's June 2, 2026 primary is fully certified (2026-07-10) — every
// row below reflects a determined top-two outcome, never a pending stage.
export const CA_STAGE = "general" as const;
export const CA_HOUSE_SOURCE_URLS = [
  "https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/76-us-rep.pdf",
  "https://elections.cdn.sos.ca.gov/statewide-elections/2026-primary/congress.pdf",
  "https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/primary-election-june-2-2026/statement-vote",
];
export const CA_RETRIEVED_AT = "2026-07-15";

export const CA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // CD-01
  {
    district: "01",
    name: "Audrey Denney",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Janice Karrman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Mike McGuire",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "James Gallagher",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Timothy Sean Kelly",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Richard T. Minner",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-02
  {
    district: "02",
    name: "Jared Huffman",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Rose Penelope Yee",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Tim Geist",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Robin Littau",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Paul Saulsbury",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Angelita Valles",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Gregory Burgess",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Nicolette Hahn Niman",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-03
  {
    district: "03",
    name: "Chris Bennett",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Ami Bera",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: 'Lyndon "Pacey" Cervantes',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Heidi Hall",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Christine Bish",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Laura Koscki",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Robb Tucker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Chris Richardson",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-04
  {
    district: "04",
    name: "Eric Jones",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Mike Thompson",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Sharon Brown",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Mandy Ghusar",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jimih Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "John Mackenzie",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Ray Riehle",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Chuck Uribe",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Thomas M Roach",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-05
  {
    district: "05",
    name: 'Michael J. "Mike" Barkley',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Michael Masuda",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Dan Stroud",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Tom McClintock",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-06
  {
    district: "06",
    name: "Lauren Babb Tomlinson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Martha Guerrero",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Thien Ho",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Richard Pan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Tyler Vandenberg",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Michael Stansfield",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Kevin Kiley",
    party: "NPP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-07
  {
    district: "07",
    name: "Doris Matsui",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Robby Morin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Enayat Nazhat",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Mai Vang",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Ralph Nwobi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Zachariah Wooden",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-08
  {
    district: "08",
    name: "Nicolas Carjuzaa",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "John Garamendi",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Aaron Rowden",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Rudy Recile",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-09
  {
    district: "09",
    name: "Josh Harder",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Khalid Jeffrey Jafri",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "John McBride",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: 'Parminder "Happy" Singh',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: 'Martin "Vmann" Veprauskas',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-10
  {
    district: "10",
    name: "Mark DeSaulnier",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Joshua Hamilton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Mitchell Maisler",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Bob Rowland",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Jeff Frese",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Angela Griffiths",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "10",
    name: "Katherine Piccinini",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-11 — open seat (Nancy Pelosi not seeking re-election; absent from
  // both source PDFs)
  {
    district: "11",
    name: 'John "Gus" Buffler',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Saikat Chakrabarti",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Connie Chan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Keith Freedman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Omed Hamid",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Gregory M Haynes",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Marie Hurabiell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Scott Wiener",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "David Ganezer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Jingchao Xiong",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "11",
    name: "Nathan Deer",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-12
  {
    district: "12",
    name: "Jamie Joyce",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Lateefah Simon",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-13
  {
    district: "13",
    name: "Daniel Garibay Rodriguez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "Adam Gray",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Vin Kruttiventi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "13",
    name: "Kevin Lincoln",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-14 — open seat (already vacant under the prior district map)
  {
    district: "14",
    name: "Victor Aguilar, Jr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Carin Elam",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Melissa Hernandez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Matt Ortega",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Rakhi Israni Singh",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Aisha Wahab",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Wendy Huang",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Dena Maldonado",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "14",
    name: "Suzanne Chenault",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-15
  {
    district: "15",
    name: "Anthony Van Dang",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "15",
    name: "Mantosh Kumar",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "15",
    name: "Kevin Mullin",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Charles Hoelter",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Jim Garrity",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-16
  {
    district: "16",
    name: "Sam Liccardo",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Kevin Johnson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "16",
    name: "Peter Sundin Soulé",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Jotham Stein",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-17
  {
    district: "17",
    name: "Ethan Agarwal",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "17",
    name: "Mike Katz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "17",
    name: "Ro Khanna",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Jennie Ha Phan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "17",
    name: "Ritesh Tandon",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Joe Dehn",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-18
  {
    district: "18",
    name: "Luis Arreguín",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "18",
    name: "Zoe Lofgren",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "18",
    name: "Shane Lewis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "18",
    name: "Chris Demers",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-19
  {
    district: "19",
    name: "Sean Dougherty",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Jimmy Panetta",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "19",
    name: "Tuka Gafari",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Peter Coe Verbica",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "19",
    name: "Lars Mapstead",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Ana Luz Acevedo-Cabrera",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "19",
    name: "Thomas Coxe",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-20
  {
    district: "20",
    name: "Sandra Van Scotter",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "20",
    name: "Vince Fong",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "20",
    name: "Ben Dewell",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "20",
    name: "Jeremy Fox",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-21
  {
    district: "21",
    name: "Jim Costa",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "21",
    name: "Eric Garcia",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "21",
    name: "Lourin Hubbard",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "21",
    name: "Kyle Kirkland",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "21",
    name: "Lorenzo Rios",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "21",
    name: "Lance Kruse",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-22
  {
    district: "22",
    name: "Jasmeet Bains",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "22",
    name: "Randy Villegas",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "22",
    name: "David G. Valadao",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-23
  {
    district: "23",
    name: "Tessa Lynn Hodge",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "23",
    name: "Karsten Scott Nicholson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Pat Wallis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Jay Obernolte",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "23",
    name: "Karen Leigh Matthews",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "23",
    name: "Eli C. Owens",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-24
  {
    district: "24",
    name: "Sarah Bacon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "24",
    name: "Salud Carbajal",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "24",
    name: "Bob Smith",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "24",
    name: "Helena Pasquarella",
    party: "PF",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-25
  {
    district: "25",
    name: "Raul Ruiz",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "25",
    name: "Ceci Andrade Truman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Ronald Huffman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "25",
    name: "Joe Males",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-26 — open seat (Julia Brownley not seeking re-election; absent from
  // both source PDFs)
  {
    district: "26",
    name: "Chris Espinosa",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: "Liam Andres O'Neill Hernandez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: "Jacqui Irwin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "26",
    name: "Sonia Kacker",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: "Sasan Samadzadeh",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: "Sam Gallucci",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "26",
    name: "Michael S. Koslow",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: "Daniel Miller",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "26",
    name: 'William "Bill" Scott',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-27 — razor-thin (Gibbs 62,758 vs Whitesides 62,214)
  {
    district: "27",
    name: "Caleb Norwood",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "27",
    name: "Roberto Ramos",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "27",
    name: "George Whitesides",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "27",
    name: "Jason Gibbs",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-28
  {
    district: "28",
    name: "Judy Chu",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "28",
    name: "Peter Roybal",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "28",
    name: "April A. Verlato",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-29 — two-Democrat district (Rudy Melendez REP was 3rd, 29,362 votes)
  {
    district: "29",
    name: "Angélica María Dueñas",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "29",
    name: "Luz Maria Rivas",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "29",
    name: "Rudy Melendez",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-30
  {
    district: "30",
    name: "Laura Friedman",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "30",
    name: "Pini Herman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "30",
    name: "Joel Lava",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "30",
    name: "Cameron Tennyson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "30",
    name: "Dennis Feitosa",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "30",
    name: "Scott Alan Meyers",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "30",
    name: "John Armenian",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-31
  {
    district: "31",
    name: "Gil Cisneros",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "31",
    name: "Eric Ching",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "31",
    name: "Erskine Levi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-32
  {
    district: "32",
    name: "Chris Ahuja",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Dory Benami",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Jake Levine",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Marena Lin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Josh Sautter",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Brad Sherman",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "32",
    name: "Anna Wilding",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "32",
    name: "Larry Thompson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "32",
    name: "Doug Smith",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-33
  {
    district: "33",
    name: "Pete Aguilar",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "33",
    name: "Antonis P. Christodoulou",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "33",
    name: "Tom Herman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "33",
    name: 'Ernest "Ernie" Richter',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "33",
    name: "Stephanie M. Vargas",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "33",
    name: "Eugene Weems",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "33",
    name: "Ling Ling Shi",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-34 — two-Democrat district (Calvin Lee REP was 3rd, 16,321 votes)
  {
    district: "34",
    name: "Arthur Dixon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "34",
    name: "Jimmy Gomez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "34",
    name: "Angela Gonzales-Torres",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "34",
    name: "Robert George Lucero Jr.",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "34",
    name: "Calvin Lee",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "34",
    name: "Loren Colin",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-35
  {
    district: "35",
    name: "Norma J. Torres",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "35",
    name: "Mike Cargile",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-36
  {
    district: "36",
    name: "Rustin Knudtson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "36",
    name: "Ted W. Lieu",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "36",
    name: "Frederick Reardon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "36",
    name: "Marianne Shamma",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "36",
    name: "Houston Brignano",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "36",
    name: "Melissa Toomim",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "36",
    name: "Claire Ragge Anderson",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-37 — two-Democrat district (Baltazar Fedalizo REP was 3rd, 13,773 votes)
  {
    district: "37",
    name: "Ryan Duckett",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "Elizabeth Fenner",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "Sydney Kamlager-Dove",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "37",
    name: "Todd Lombardo",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "Samantha Mota",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "37",
    name: "Baltazar Fedalizo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "John Thompson Parker",
    party: "PF",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "Steve Hill",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "37",
    name: "Juan Rey",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-38 — open seat (no current sitting member of Congress filed here;
  // Hilda Solis is a past, not current, member)
  {
    district: "38",
    name: "Erik Lutz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "38",
    name: "Monica M. Sanchez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "38",
    name: "Hilda Solis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "38",
    name: "Pedro Antonio Casas",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-39
  {
    district: "39",
    name: "Mark Takano",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "39",
    name: "Steve Manos",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-40 — two-Republican district (SEE CD-40 CORRECTION ABOVE: Calvert
  // 75,811 and Kim 44,818 are the true top-two; Kim-Varet placed 3rd with
  // 36,072 and does not advance). Incumbent-vs-incumbent collision: both
  // Calvert (old CA-41) and Kim (old CA-40) were redrawn into this seat.
  {
    district: "40",
    name: "Esther Kim-Varet",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "40",
    name: "Joe Kerr",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "40",
    name: "Claude M Keissieh",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "40",
    name: "Francis Xavier Hoffman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "40",
    name: "Lisa Ramirez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "40",
    name: "Ken Calvert",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "40",
    name: "Young Kim",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "40",
    name: "Nina Linh",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-41 (Linda Sánchez redrawn here from old CA-38)
  {
    district: "41",
    name: "Hector De La Torre",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "41",
    name: "Linda Sánchez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "41",
    name: "Shonique Williams",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "41",
    name: "Mitch Clemmons",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-42
  {
    district: "42",
    name: "Robert Garcia",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "42",
    name: "Brian Burley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "42",
    name: "Long Pham",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "42",
    name: "Noah Von Blom",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "42",
    name: "Larisa Vermeulen",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-43
  {
    district: "43",
    name: "Myla Rahman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "43",
    name: "David Sedlik",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "43",
    name: "Maxine Waters",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "43",
    name: "Cristian Morales",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-44
  {
    district: "44",
    name: "Nanette Diaz Barragan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "44",
    name: "Genevieve Angel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-45
  {
    district: "45",
    name: "Derek Tran",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "45",
    name: "Mark Leonard",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "45",
    name: 'Chi "Charlie" Nguyen',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "45",
    name: "Chuong V. Vo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "45",
    name: "Tom Vo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "45",
    name: "Amy Phan West",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-46
  {
    district: "46",
    name: "Frank Bahena",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "46",
    name: "Lou Correa",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "46",
    name: "Christian Mendez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "46",
    name: 'Armando "Mando" Perez-Serrato',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "46",
    name: "David Pan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-47
  {
    district: "47",
    name: "Dave Min",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "47",
    name: "Hunter Garcia Miranda",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Bill Brough",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Christopher J. Gonzales",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Jenny Rae Le Roux",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "47",
    name: "Michael Maxsenti",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Derrick Michael Reid",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Jesus Patino",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "47",
    name: "Eric Troutman",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-48 — open seat (Darrell Issa not seeking re-election; absent from
  // both source PDFs)
  {
    district: "48",
    name: "Ammar Campa-Najjar",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Abel Chavez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Stephen Clemons",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Corinna Contreras",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Ferguson Porter",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Brandon Riker",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Mike Schaefer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Eric Shaw",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Marni von Wilpert",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "48",
    name: "Jim Desmond",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "48",
    name: "Kevin Patrick O'Neil",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "48",
    name: "Luis F. Reyna",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-49
  {
    district: "49",
    name: "Armen Kurdian",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "49",
    name: "Mike Levin",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "49",
    name: "Star Parker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-50
  {
    district: "50",
    name: "Tim Arnous",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "50",
    name: 'Aishwarya "Sparky" Mitra',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "50",
    name: "Scott Peters",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "50",
    name: "Steve Cohen",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "50",
    name: 'Joseph "Joe" Shea',
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "50",
    name: "Lucinda KWH Jahn",
    party: "NPP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // CD-51
  {
    district: "51",
    name: "Stan Caplan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "51",
    name: "David W Engel",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "51",
    name: "Sara Jacobs",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "51",
    name: "Ricardo Cabrera",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD-52
  {
    district: "52",
    name: "Deborah Calhoun Rhodes",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "52",
    name: "Juan Vargas",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "52",
    name: "Jeff Belle",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
