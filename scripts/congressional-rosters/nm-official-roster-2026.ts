/**
 * scripts/congressional-rosters/nm-official-roster-2026.ts
 *
 * New Mexico's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 3 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), Alabama
 * and Kentucky (epic c5a813bb); this is New Mexico's build.
 *
 * NEW MEXICO-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/new-mexico-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - New Mexico's official candidate source is the SOS's SERVIS candidate
 *     portal (`candidateportal.servis.sos.state.nm.us`) - NOT Civix-vended
 *     (no `*.civixapps.com` domain, no "Powered by gocivix.com" branding
 *     found). It is a plain server-rendered ASP.NET page (`CandidateList.aspx`),
 *     not a JS SPA - no browser automation was needed, unlike TX's Civix
 *     portal.
 *   - CRITICAL: the portal has no visible election-picker UI in the
 *     rendered HTML - the election is selected entirely via an `eid` query
 *     parameter with no documented mapping. `eid=2917` was confirmed (by
 *     the page's own title text, "2026 General Election Contest/Candidate
 *     List") to be the 2026 GENERAL election list, distinct from
 *     `eid=2911` (2026 Primary). The `eid` sequence is NOT purely
 *     chronological across election types (Local/Primary/General
 *     interleave) - always confirm by the page title, never by assuming
 *     the next sequential id. Some `eid` guesses 500 rather than returning
 *     an empty table.
 *   - The `eid=2917` list already reflects POST-primary, settled
 *     general-ballot status (each row carries a Qualified/Disqualified
 *     status) - every contested race shows exactly one Democratic and one
 *     Republican filer, both "Qualified". No runoff derivation was needed -
 *     New Mexico's Primary Election Law (NMSA 1978, Chapter 1, Article 8)
 *     has no runoff provision for state/federal primaries; the only NM
 *     runoff mechanism (NMSA 1978 Section 1-22-16) is scoped to municipal
 *     elections only. Plurality winners are the automatic nominees.
 *   - INCUMBENCY was cross-checked against senate.gov (house.gov and
 *     clerk.house.gov both returned HTTP 403 to WebFetch this session -
 *     JS-rendered/bot-blocked, could not be verified directly by design
 *     doc's preferred source) plus two independent secondary sources
 *     (NM Political Report's 2026-03-09 candidate roundup and Wikipedia's
 *     "2026 United States Senate election in New Mexico" / "List of United
 *     States representatives from New Mexico"), both agreeing:
 *     - senate.gov/states/NM/intro.htm confirms the sitting senators are
 *       Martin Heinrich and Ben Ray Luján; Luján holds the Class II seat up
 *       in 2026 and is running for re-election (not retiring, not seeking
 *       another office) - a genuine incumbent-defends race, not an open
 *       seat.
 *     - All three sitting Representatives (Stansbury NM-1, Vasquez NM-2,
 *       Leger Fernandez NM-3) are running for re-election in their OWN
 *       district - no NM House incumbent ran for Senate, retired, or was
 *       defeated in the June 2, 2026 primary. No open House seats this
 *       cycle.
 *   - Only DEM and REP filers reached the qualified general ballot for
 *     these four races - no new party code was needed in types.ts. Two
 *     minor-party/independent US Senate filers appear on the SOS's own
 *     `eid=2917` table but are recorded there as "Disqualified"
 *     (insufficient valid nominating-petition signatures, per NMSA 1978
 *     Section 1-8-51's 14,200-signature statewide independent threshold /
 *     the Forward Party's newly-qualified-minor-party threshold) and are
 *     deliberately NOT included as roster entries here, consistent with
 *     this track's convention of recording only qualified/declared/write-in
 *     filers, never disqualified ones:
 *     - Mira O'Connell (party code on the portal: "DTS", New Mexico's
 *       official label for "Declined To State" / independent) -
 *       disqualified.
 *     - Bob Perls (party code "FWD", Forward Party - a newly SOS-qualified
 *       NM minor party in 2026) - disqualified; Perls and four other
 *       Forward Party candidates filed a federal lawsuit on 2026-07-15
 *       challenging the signature requirement as applied to a certified
 *       minor party's own nominees. UNRESOLVED as of this build - if the
 *       lawsuit succeeds before the ballot-content certification deadline
 *       (see the data-check doc), this Senate race could gain a third
 *       qualified candidate and this fixture would need updating. A
 *       secondary source (Wikipedia / Rhett Trappman's own campaign site)
 *       also describes a Libertarian Senate petitioner, but he does not
 *       appear anywhere on the official `eid=2917` list at all (not even
 *       as "Disqualified") - not included, flagged as a source discrepancy
 *       rather than guessed at.
 *   - Names are transcribed from the SOS portal's own display, which
 *     prints legal names in all caps with no diacritics (e.g. "BEN R
 *     LUJAN"); the Senator's officially used name carries an accent
 *     ("Luján", confirmed via senate.gov) - recorded here with the
 *     diacritic restored, matching how the officeholder's name is
 *     rendered on his own official government page, not the portal's
 *     ASCII-only rendering.
 *
 * Sources:
 *   - https://candidateportal.servis.sos.state.nm.us/CandidateList.aspx?eid=2917&cty=99
 *     (New Mexico Secretary of State's official 2026 General Election
 *     candidate list - all offices, statewide; used for US House
 *     districts 1-3 and US Senate)
 *   - https://www.senate.gov/states/NM/intro.htm (New Mexico's current
 *     senators - incumbency cross-check only)
 *   - https://nmpoliticalreport.com/2026/03/09/heres-everyone-running-for-congress-in-new-mexico-this-year/
 *     (secondary incumbency/roster cross-check)
 *   - https://en.wikipedia.org/wiki/2026_United_States_Senate_election_in_New_Mexico
 *     (secondary cross-check; also source of the Trappman discrepancy note
 *     above)
 *   - https://www.sos.nm.gov/wp-content/uploads/2026/04/2026-General-Election-Proclamation-English.pdf
 *     (2026 General Election Proclamation - general election date)
 *   - see docs/operations/new-mexico-vertical-slice-data-check.md for the
 *     full calendar-date citations (withdrawal/certification deadlines)
 *
 * Coverage: all 3 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - house.gov / clerk.house.gov both blocked WebFetch with HTTP 403 this
 *     session; incumbency was cross-checked via senate.gov (which worked
 *     for the Senate seat) plus two independent secondary sources for the
 *     House delegation rather than the plan's preferred house.gov
 *     directory - flagged as a gap consistent with this track's
 *     conservative-disclosure posture.
 *   - The Forward Party's ballot-access lawsuit (filed 2026-07-15,
 *     unresolved as of this build) could still add a third Senate
 *     candidate before the ballot-content certification deadline - see
 *     the data-check doc's calendar-dates section and the dated
 *     follow-up card.
 *   - Names are recorded as they appear in the official SOS filing list
 *     (diacritic restored for Luján per senate.gov, see above); not
 *     independently re-verified against a third document beyond the two
 *     secondary sources cited.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NM_STATE = "NM";
export const NM_ELECTION_YEAR = 2026;
export const NM_STAGE = "general" as const;
export const NM_HOUSE_SOURCE_URLS = [
  "https://candidateportal.servis.sos.state.nm.us/CandidateList.aspx?eid=2917&cty=99",
];
export const NM_SENATE_SOURCE_URLS = [
  "https://candidateportal.servis.sos.state.nm.us/CandidateList.aspx?eid=2917&cty=99",
];
export const NM_RETRIEVED_AT = "2026-07-16";

export const NM_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 - Stansbury (incumbent) is the Democratic nominee;
  // Okpareke is the Republican nominee. No independent, minor-party, or
  // write-in filer qualified for this race.
  {
    district: "01",
    name: "Melanie Ann Stansbury",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Ndidiamaka Ekwua Charlene Okpareke",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 - Vasquez (incumbent) is the Democratic nominee;
  // Cunningham is the Republican nominee.
  {
    district: "02",
    name: "Gabriel Vasquez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Gregory G. Cunningham",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 - Leger Fernandez (incumbent) is the Democratic nominee;
  // Zamora is the Republican nominee.
  {
    district: "03",
    name: "Teresa Leger Fernandez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Martin Zamora",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const NM_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Incumbent-defends race: Ben Ray Luján (sitting Class II Senator) is
  // running for re-election, not retiring or seeking another office.
  // Two minor-party/independent filers (Mira O'Connell - DTS, Bob Perls -
  // FWD) appeared on the SOS's official list but were both marked
  // "Disqualified" for insufficient petition signatures - not included
  // here; see the docblock above for the live, unresolved Forward Party
  // ballot-access lawsuit that could still change this race's candidate
  // count before ballot certification.
  {
    district: null,
    name: "Ben Ray Luján",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Larry E. Marker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
