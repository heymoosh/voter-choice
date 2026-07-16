/**
 * scripts/congressional-rosters/sd-official-roster-2026.ts
 *
 * South Dakota's 2026 official congressional roster for the November 3,
 * 2026 general election — covers the single at-large US House seat and the
 * 2026 US Senate race (Class II). Built through the same manual
 * official-source pipeline as Arizona (card 637c2583), Texas (card
 * 8530a468), Oklahoma (card d9b1ef86), and Alaska, epic c5a813bb; this is
 * South Dakota's build.
 *
 * SOUTH-DAKOTA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/south-dakota-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - South Dakota's official candidate source is the Secretary of State's
 *     "VIP" portal (`vip.sdsos.gov`), an ASP.NET/Telerik RadGrid data grid —
 *     NOT a Civix-vended portal (no `.civixapps.com` subdomain, no
 *     "POWERED BY gocivix.com" footer). Unlike the Civix portals documented
 *     in the plan doc's Civix playbook, this grid does NOT 403 a
 *     non-browser fetch — `WebFetch` reads its rendered candidate table
 *     directly, no browser automation needed.
 *   - South Dakota's June 2, 2026 primary has already occurred and been
 *     certified: the general-election candidate list (eid=774) reflects
 *     the two major parties' certified nominees plus one independent
 *     petition filer, so SD_STAGE = "general" and every row below is
 *     "qualified_for_general_ballot" — no runoff_pending contest exists for
 *     either federal seat this cycle.
 *   - US House (at-large) is an OPEN SEAT: incumbent Dusty Johnson (R) did
 *     not file for re-election — he is running for Governor instead (per
 *     the general candidate list showing only Marty Jackley and Nicole
 *     "Nikki" Gronli, neither of whom is Johnson). Cross-checked against
 *     South Dakota's own official elected-officials page
 *     (sdsos.gov/elections-voting/election-resources/current-elected-officials.aspx),
 *     which independently confirms Dustin "Dusty" Johnson (R) as the
 *     sitting Representative — corroborating he is not a candidate on
 *     either the primary or general candidate list, i.e. the seat is
 *     genuinely open, not a transcription gap. `isIncumbent: false` for
 *     both House rows.
 *   - US Senate (Class II) has an incumbent seeking re-election: Mike
 *     Rounds (R). Cross-checked against the same official
 *     current-elected-officials page, which lists "Mike Rounds (R) — term
 *     expires 2027" (Class II terms run through January 2027) — matching
 *     the general list's Rounds filing. Never sourced from this app's own
 *     FEC-derived `candidates` table.
 *   - Independent candidate: Brian L. Bengs filed for US Senate as an
 *     "Independent" per the SoS's own party-column label — recorded as
 *     "IND" (John Thune's seat is Class III, not up until 2028; not
 *     relevant to this cycle).
 *   - District/office wiring: South Dakota's US House is a single at-large
 *     seat — mirrors Alaska/Delaware's existing `district: "00"` convention
 *     (races.ts's lookupChallengers zero-pads a numeric district of 0 to
 *     districtKey "00"; a `district: null` House row would never match that
 *     lookup). Senate rows use `district: null` (statewide, no House-style
 *     district key), matching the existing AK/OK/TX Senate rows.
 *   - No write-in filers appear on the general-election candidate list.
 *
 * Sources:
 *   - https://vip.sdsos.gov/candidatelist.aspx?eid=774
 *     (SoS VIP portal — "2026 General Election Candidate List"; the US
 *     SENATE and US HOUSE OF REPRESENTATIVES rows are this fixture's
 *     source of record)
 *   - https://vip.sdsos.gov/candidatelist.aspx?eid=773
 *     (SoS VIP portal — "2026 Primary Election Candidate List," dated
 *     6/2/2026; used only for provenance — confirms Rounds/Jackley won
 *     their respective primaries and that Justin McNeal (R, Senate) and
 *     James Bialota (R, House) did not advance)
 *   - https://sdsos.gov/elections-voting/election-resources/current-elected-officials.aspx
 *     (SoS's own current-officeholders page — the independent cross-check
 *     source for incumbency, separate from the candidate-list portal)
 *   - https://sdsos.gov/elections-voting/upcoming-elections/general-information/2026/2026-candidate-withdrawal-info.aspx
 *     and https://sdsos.gov/elections-voting/assets/2026%20Documents/2026ElectionCALENDAR.pdf
 *     (governing calendar dates — see the verification doc's
 *     operational-navigation section for the full list)
 *
 * Coverage: the single at-large US House seat + the US Senate (Class II)
 * race.
 *
 * KNOWN LIMITATIONS:
 *   - None identified: the June 2, 2026 primary has already been certified,
 *     both federal contests have a determined nominee set, and no pending
 *     runoff or unresolved ballot-eligibility dispute was found for South
 *     Dakota's 2026 federal races (unlike Alaska's Sullivan-name dispute or
 *     Oklahoma's pending runoffs).
 *   - The general-election candidate withdrawal deadline (August 4, 2026)
 *     is still in the future as of this fixture's retrieval date — see the
 *     verification doc's governing-calendar-dates section and its
 *     accompanying dated follow-up card.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const SD_STATE = "SD";
export const SD_ELECTION_YEAR = 2026;
// South Dakota's June 2, 2026 primary has already been certified — every
// row below is the determined general-election nominee/filer.
export const SD_STAGE = "general" as const;
export const SD_HOUSE_SOURCE_URLS = [
  "https://vip.sdsos.gov/candidatelist.aspx?eid=774",
  "https://vip.sdsos.gov/candidatelist.aspx?eid=773",
];
export const SD_SENATE_SOURCE_URLS = [
  "https://vip.sdsos.gov/candidatelist.aspx?eid=774",
  "https://vip.sdsos.gov/candidatelist.aspx?eid=773",
];
export const SD_RETRIEVED_AT = "2026-07-16";

// South Dakota's US House is a single at-large seat — races.ts's
// lookupChallengers zero-pads a numeric district of 0 to districtKey "00"
// (see docblock's district/office wiring note); every House row uses this
// district key, never null.
export const SD_HOUSE_DISTRICT = "00";

export const SD_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // OPEN SEAT — incumbent Dusty Johnson (R) did not file; running for
  // Governor instead. Neither filer below is the sitting Representative.
  {
    district: SD_HOUSE_DISTRICT,
    name: 'Nicole "Nikki" Gronli',
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: SD_HOUSE_DISTRICT,
    name: "Marty Jackley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const SD_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Julian Beaudion",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Brian L. Bengs",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Mike Rounds",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
];
