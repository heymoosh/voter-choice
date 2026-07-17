/**
 * scripts/congressional-rosters/nh-official-roster-2026.ts
 *
 * New Hampshire's 2026 official congressional roster - covers both US House
 * districts (NH-1, NH-2) and the US Senate race. Built through the same
 * manual official-source pipeline as Arizona, Texas, Oklahoma, Alabama,
 * Alaska, Colorado, Connecticut, California, Arkansas, Delaware, Florida,
 * Hawaii, Louisiana, Maine, and Indiana (epic c5a813bb); this is New
 * Hampshire's build (card "Import + verify official roster: New Hampshire
 * (NH)").
 *
 * NEW-HAMPSHIRE-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/new-hampshire-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - New Hampshire's official candidate/election source is the Secretary
 *     of State (sos.nh.gov / mm.nh.gov media-manager subdomain) - NOT
 *     Civix-vended (no *.civixapps.com anywhere in this pipeline); the
 *     Civix portal playbook in the nationwide roster plan doc does not
 *     apply here.
 *   - sos.nh.gov (and files served under its /sites/g/files/... path) 403s
 *     on any non-browser fetch (WebFetch, curl with a browser user-agent) -
 *     an Akamai/edgesuite bot wall, confirmed via the literal "Access
 *     Denied ... errors.edgesuite.net" response body. mm.nh.gov (the
 *     state's separate media-manager CDN, used for some PDF links) does
 *     NOT show this block. Every PDF used below was retrieved by driving
 *     an actual Chrome session (mcp__claude-in-chrome__navigate, then an
 *     in-page `fetch(window.location.href)` + blob-download, since Chrome's
 *     native PDF viewer does not expose extractable text through
 *     get_page_text/read_page) - not by direct tool fetch.
 *   - NEW HAMPSHIRE'S STATE PRIMARY IS SEPTEMBER 8, 2026 - still in the
 *     future as of this fixture's retrieval date (2026-07-15). This is a
 *     PRE-PRIMARY build, same posture as Arizona's and Delaware's: every
 *     Democratic and Republican filer below is recorded as
 *     `qualified_for_primary_ballot`, NOT `qualified_for_general_ballot` -
 *     no nominee has been determined for any of the 6 partisan federal
 *     contests (US Senate x2 parties, NH-1 x2 parties, NH-2 x2 parties),
 *     and every one of those 6 contests is genuinely CONTESTED (2+ filers),
 *     so there is no "sole filer, automatic nominee" case here the way
 *     Delaware's McBride was.
 *   - CANDIDATE SET came from the Secretary of State's official "Cumulative
 *     Filings" PDF (candidates who filed a Declaration of Candidacy for the
 *     Sept 8, 2026 state primary, June 3-12, 2026 filing window), retrieved
 *     as of its 06/29/2026 posting date - the most recent cumulative
 *     filing list published as of this build. The filing window closed
 *     June 12, 2026, so this list is final for major-party candidates
 *     (RSA 655:30 - no withdrawal is accepted after the filing deadline,
 *     except the narrow RSA 655:31 straw-candidate-challenge and RSA 655:34
 *     candidate-death exceptions, both of which have their own now-passed
 *     deadlines - see the calendar dates below).
 *   - INDEPENDENT/MINOR-PARTY CANDIDATES bypass the primary entirely under
 *     New Hampshire law: they file a Declaration of Intent (also within the
 *     June 3-12 window) and then must separately gather nomination-paper
 *     signatures (3,000 for US Senate - 1,500 per congressional district;
 *     1,500 for Representative in Congress, from the respective district)
 *     to actually qualify for the November 3, 2026 general-election ballot.
 *     The SoS's "Declarations of Intent - Qualified" list (candidates who
 *     have ALREADY cleared signature verification) contains ZERO federal
 *     filers as of this build - only one State Representative candidate.
 *     The SoS's unfiltered "Declarations of Intent Filed" list (everyone
 *     who filed intent, signature verification still pending) DOES show 4
 *     US Senate filers and 3 NH-2 US House filers - all recorded below as
 *     `declared_general_ballot_intent` (mirroring Oklahoma's convention for
 *     filed-but-unverified independents), never promoted further, since
 *     the nomination-paper certification deadline (September 2, 2026 - see
 *     calendar dates) has not yet passed. No NH-1 declaration-of-intent
 *     filers were found (verified absent, not omitted). None of these
 *     filers state a party on the SoS list, so `party: "IND"` is used per
 *     the same OK/TX convention (generic declared-independent candidacy,
 *     not a state-recognized minor party).
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from the filing list alone:
 *     (1) house.gov's "By State and District" directory (New Hampshire
 *     section) confirms the sitting House delegation is Chris Pappas
 *     (NH-1) and Maggie Goodlander (NH-2).
 *     (2) senate.gov's New Hampshire state page confirms the Class II
 *     Senate seat on the 2026 ballot is currently held by Jeanne Shaheen.
 *     Cross-referencing those two names against the full cumulative-filing
 *     list: Shaheen does NOT appear in either party's Senate filing list
 *     (confirmed OPEN SEAT - she is not seeking re-election). Chris Pappas
 *     does NOT appear in either party's NH-1 filing list; instead he filed
 *     for US SENATE (Democratic primary) - so NH-1 is ALSO an open seat,
 *     not an incumbent-defends race, even though its sitting representative
 *     is on the 2026 ballot (just for a different office). Maggie
 *     Goodlander DOES appear in the Democratic NH-2 filing list - she is
 *     seeking re-election to her current seat, so NH-2 IS an
 *     incumbent-defends race.
 *   - No third-party (Libertarian, Green, etc.) candidate filed a
 *     Declaration of Candidacy for any New Hampshire federal office in
 *     this cycle - verified absent from the cumulative filing list, not
 *     omitted (only DEM and REP sections contain any federal-office
 *     entries; no other party section does).
 *   - Zero withdrawals: the SoS's official "Withdrawals - 2026" list (1
 *     page, Democratic + Republican sections) contains only State
 *     Representative and county-office withdrawals - no US House or US
 *     Senate withdrawal for any candidate recorded below.
 *
 * Sources:
 *   - https://www.sos.nh.gov/sites/g/files/ehbemt561/files/docs/cumulative-filings-6.29.26.pdf
 *     (Secretary of State's official cumulative Declaration-of-Candidacy
 *     filing list as of 06/29/2026 - candidate set + party for the Sept 8,
 *     2026 state primary; source of every qualified_for_primary_ballot row
 *     below)
 *   - https://mm.nh.gov/files/uploads/sos/docs/declarations-of-intent-list-2026.pdf
 *     (Secretary of State's unfiltered Declarations of Intent Filed list -
 *     source of every declared_general_ballot_intent row below; signature
 *     verification still pending for all of them)
 *   - https://www.sos.nh.gov/sites/g/files/ehbemt561/files/inline-documents/sonh/declarations-of-intent-list-2026-qualified.pdf
 *     (Secretary of State's Declarations of Intent - QUALIFIED list -
 *     confirms zero federal candidates have cleared signature verification
 *     as of this build)
 *   - https://mm.nh.gov/files/uploads/sos/docs/withdrawals-2026.pdf
 *     (Secretary of State's official Withdrawals - 2026 list - confirms no
 *     federal withdrawal)
 *   - https://www.sos.nh.gov/sites/g/files/ehbemt561/files/inline-documents/sonh/filing-for-office-2026.pdf
 *     (Secretary of State's "Filing for Office 2026" summary - signature
 *     requirements + the full nomination-paper filing-deadline calendar
 *     used for the standing calendar dates below)
 *   - https://www.house.gov/representatives (119th Congress New Hampshire
 *     delegation, "By State and District" - incumbency cross-check only,
 *     not a candidate-roster source)
 *   - https://www.senate.gov/states/NH/intro.htm (New Hampshire's current
 *     Class II senator - incumbency cross-check only, not a
 *     candidate-roster source)
 *
 * Coverage: both US House districts (NH-1, NH-2) + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - No nominee is determined for any of the 6 partisan federal contests -
 *     the Sept 8, 2026 primary has not happened yet. This fixture will need
 *     a follow-up post-primary update; a dated NOT-BEFORE re-check card was
 *     opened for Sept 8, 2026 (see the vertical-slice data-check doc).
 *   - The 7 declared-intent independent filers' nomination-paper signature
 *     verification is unresolved as of this build (certification deadline
 *     September 2, 2026, still future) - recorded as
 *     `declared_general_ballot_intent`, an open item flagged for Muxin same
 *     as OK's/TX's equivalent gap.
 *   - Names are recorded as they appear in the official filing lists; not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NH_STATE = "NH";
export const NH_ELECTION_YEAR = 2026;
export const NH_STAGE = "primary" as const;
export const NH_HOUSE_SOURCE_URLS = [
  "https://www.sos.nh.gov/sites/g/files/ehbemt561/files/docs/cumulative-filings-6.29.26.pdf",
  "https://mm.nh.gov/files/uploads/sos/docs/declarations-of-intent-list-2026.pdf",
];
export const NH_SENATE_SOURCE_URLS = [
  "https://www.sos.nh.gov/sites/g/files/ehbemt561/files/docs/cumulative-filings-6.29.26.pdf",
  "https://mm.nh.gov/files/uploads/sos/docs/declarations-of-intent-list-2026.pdf",
];
export const NH_RETRIEVED_AT = "2026-07-15";

// Both NH-1 and the US Senate seat are open seats: Chris Pappas (sitting
// NH-1 representative) filed for Senate instead of re-election, and Jeanne
// Shaheen (sitting senator) did not file for re-election at all. NH-2 is
// NOT an open seat - Maggie Goodlander (sitting representative) filed for
// re-election.
export const NH_OPEN_SEAT_DISTRICTS = ["01"];
export const NH_SENATE_OPEN_SEAT = true;

export const NH_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — open seat (Pappas running for Senate instead); both
  // party nominations undetermined pending the Sept 8, 2026 primary.
  {
    district: "01",
    name: "Carleigh Beriont",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Sarah E. Chadzynski",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Bill Conlin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Matthew Emerson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Heath Howard",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Stefany Shaheen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Sarah Bella Spinosa",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Maura C. Sullivan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Christian Urrutia",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Lindsey Anderson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Melissa Bailey",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Brian D. Cole",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Anthony DiLorenzo",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Hollie Noveletsky",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 02 — Goodlander (incumbent) filed for re-election; both party
  // nominations undetermined pending the Sept 8, 2026 primary. Three
  // declared-intent independents (signature verification pending) also
  // filed for this district.
  {
    district: "02",
    name: "Paige Beauchemin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Maggie Goodlander",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Michael Anthony Callis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Dan Nicholson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Victor Orlando",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Lily Tang Williams",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Scott Matthew Black",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "02",
    name: "Robbie Mahrou",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "02",
    name: "Sterling Thomas Sykes",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

export const NH_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: the sitting senator (Jeanne Shaheen) did not file for
  // re-election - no incumbent below. Both party nominations undetermined
  // pending the Sept 8, 2026 primary.
  {
    district: null,
    name: "David Jarvis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Karishma Manzur",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Chris Pappas",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Maxwell L. Saal",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "John Vail",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Tom Alciere",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Scott P. Brown",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Sky Danley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Andy Martin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Mary Maxwell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Richard A. McMenamon II",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Sabrina Ann Smith",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "John E. Sununu",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Tim Harris",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "Edmond Laplante",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "Jeanne Logan Morrow",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "Christine Lopez",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];
