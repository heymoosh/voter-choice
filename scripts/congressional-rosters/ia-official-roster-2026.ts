/**
 * scripts/congressional-rosters/ia-official-roster-2026.ts
 *
 * Iowa's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 4 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), and
 * Alabama (epic c5a813bb); this is Iowa's build (card at
 * docs/operations/voter-choice-backlog.md, "[P0] Import + verify official
 * roster: Iowa (IA)").
 *
 * IOWA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/iowa-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Iowa's official candidate source is a static HTML hub
 *     (sos.iowa.gov/general-election), confirming the I06 rehearsal's
 *     sourceFormat "html" / parserFamily "not_applicable" - NOT Civix. The
 *     hub's generic "news-resources/complete-list-state-and-federal-
 *     candidate-filings" URL the I06 rehearsal flagged turned out to be a
 *     STALE 2016 news article, not a live 2026 data source - confirmed
 *     stale during this build, per the card's own ORIGIN instruction not
 *     to assume the rehearsal URL is still current. The real, live
 *     candidate list is linked from sos.iowa.gov/general-election under a
 *     "Candidate List" heading as a PDF, refreshed throughout the filing
 *     period.
 *   - The candidate-list PDF (see Sources below) required browser
 *     rendering to read (WebFetch and the sandboxed network layer both
 *     returned HTTP 403 on every sos.iowa.gov path, including the static
 *     PDF itself - not just the SPA-style protection seen on Civix
 *     portals). Read via mcp__claude-in-chrome__* (navigate + zoomed
 *     screenshots of the PDF's native table), not text extraction - the
 *     Chrome PDF viewer's text layer did not expose extractable text via
 *     get_page_text (canvas-rendered), and the viewer's own page-jump
 *     controls (page-number box, thumbnail double-click) were unreliable
 *     mid-session; the thumbnail-zoom + fresh-tab pattern was the reliable
 *     path.
 *   - Iowa's June 2, 2026 primary has ALREADY OCCURRED as of this
 *     fixture's retrieval date (2026-07-15). The candidate-list PDF
 *     (last updated 2026-07-09 per its own footer) shows exactly ONE
 *     candidate per party per race for every federal contest - no
 *     multi-candidate fields remain - confirming every nomination is
 *     DETERMINED, not primary-stage. Unlike Alabama's mid-decade-
 *     redistricting special primary or Oklahoma's runoff, Iowa's 2026
 *     federal cycle has no pending primary/runoff/convention contest as
 *     of this build; every row here is "qualified_for_general_ballot".
 *   - TWO OPEN HOUSE SEATS, confirmed by cross-checking the candidate list
 *     against house.gov's official "By State and District" directory
 *     (Iowa section, current 119th Congress delegation: Miller-Meeks
 *     IA-1, Hinson IA-2, Nunn IA-3, Feenstra IA-4 - all Republicans):
 *       - IA-2: sitting Rep. Ashley Hinson is NOT a candidate for IA-2
 *         re-election - she instead filed for, and is the Republican
 *         nominee for, US Senate (see below). Joe Mitchell is the new
 *         Republican nominee for IA-2, confirmed absent from the House
 *         delegation - open seat.
 *       - IA-4: sitting Rep. Randy Feenstra is NOT a candidate for IA-4
 *         re-election - Chris McGowan is the Republican nominee for IA-4
 *         instead, confirmed absent from the House delegation - open
 *         seat. (Feenstra's own further plans were not independently
 *         confirmed this session beyond his absence from the IA-4 filer
 *         list - not needed for this fixture's scope.)
 *   - IA-1 (Miller-Meeks) and IA-3 (Nunn) are both incumbents seeking
 *     re-election, confirmed present as filers for their own districts on
 *     the candidate list and as sitting members on house.gov.
 *   - US SENATE IS AN OPEN SEAT: cross-checked against senate.gov's Iowa
 *     page, which lists the sitting Iowa senators as Chuck Grassley (R)
 *     and Joni Ernst (R) - NEITHER appears as a 2026 Senate candidate on
 *     the official candidate list (Hinson/Turek/Laehn instead). Ernst's
 *     seat is the one up in the 2026 cycle; she is not seeking
 *     re-election. isIncumbent: false for all three Senate filers.
 *   - PARTY LABEL: Iowa's own candidate-list PDF prints "No Party" (not
 *     "Independent") as the Party column value for nomination-by-petition
 *     filers (Bridgford in IA-1, Bushaw in IA-2). Per the AIP/AKP/NPP/
 *     LPF/FFP precedent of preserving a state's own literal ballot-label
 *     wording rather than collapsing it into the generic IND bucket, a
 *     new "NPI" code was added to types.ts's party union for this.
 *   - Independent/write-in candidates: none beyond the "No Party" filers
 *     already listed on the official candidate-list PDF (Bridgford,
 *     Bushaw) - no separate SoS declaration-of-intent document (like
 *     Texas's) was found or needed; Iowa's single candidate-list PDF
 *     already covers NPPO/petition filers alongside party nominees.
 *   - No Green Party filing was found for any Iowa 2026 congressional or
 *     Senate race in the official candidate list reviewed this session
 *     (verified absent, not simply unresearched).
 *
 * Sources:
 *   - https://sos.iowa.gov/general-election
 *     (Iowa Secretary of State's 2026 general election hub - links the
 *     candidate list PDF below; also confirms US Senator + US
 *     Representative, all districts, are on the Nov 3, 2026 ballot)
 *   - https://sos.iowa.gov/sites/default/files/2026-07/2026%20General%20-%20Candidate%20List%20Database%20-%20All%20Elections_1.pdf
 *     (Iowa Secretary of State's official 2026 General Election candidate
 *     list database, last updated 2026-07-09 per its own footer - primary
 *     source for every candidate name/party/district recorded here)
 *   - https://www.house.gov/representatives (119th Congress Iowa
 *     delegation, "By State and District" - incumbency cross-check only,
 *     confirms the IA-2/IA-4 open-seat findings above)
 *   - https://www.senate.gov/states/IA/intro.htm (Iowa's current senators
 *     - incumbency cross-check only, confirms the open Senate seat)
 *
 * Coverage: all 4 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - The exact reason Rep. Feenstra (IA-4) is not seeking re-election to
 *     his House seat was not independently confirmed this session beyond
 *     his absence from the IA-4 candidate list - out of scope for this
 *     fixture (only the roster/incumbency fact matters here).
 *   - Iowa's official candidate-withdrawal-adjacent deadline: the
 *     candidate-list PDF's own footer states "Ballot vacancies occuring
 *     after the Primary Election may be filled by convention until
 *     August 19 at 5:00 p.m." - this is corroborated by Iowa Code
 *     section 44.9's 76-days-before-the-election withdrawal cutoff for
 *     nominations filed under section 44.4(1)(b) (Nov 3, 2026 minus 76
 *     days = August 19, 2026), confirmed via legis.iowa.gov. Recorded in
 *     the deliverable doc's governing-dates section; a dated NOT BEFORE
 *     follow-up card was opened per the epic's standing requirement.
 *   - No independent second-source cross-check (e.g. a county auditor's
 *     parallel candidate list or a certified election-night-results
 *     export) was located distinct from the SoS's own single candidate-
 *     list PDF - house.gov/senate.gov served as the independent
 *     incumbency cross-check per the epic's SAFETY rule, but no second
 *     document corroborates the candidate NAMES themselves the way OK's
 *     build had a parallel CSV/XML export. Flagged as a known gap, not
 *     fabricated corroboration.
 *   - Names are recorded as they appear in the official candidate list's
 *     "Ballot Name(s)" column; not independently re-verified against a
 *     third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const IA_STATE = "IA";
export const IA_ELECTION_YEAR = 2026;
export const IA_STAGE = "general" as const;
export const IA_HOUSE_SOURCE_URLS = [
  "https://sos.iowa.gov/sites/default/files/2026-07/2026%20General%20-%20Candidate%20List%20Database%20-%20All%20Elections_1.pdf",
];
export const IA_SENATE_SOURCE_URLS = [
  "https://sos.iowa.gov/sites/default/files/2026-07/2026%20General%20-%20Candidate%20List%20Database%20-%20All%20Elections_1.pdf",
];
export const IA_RETRIEVED_AT = "2026-07-15";

// IA-2 (Hinson filed for US Senate instead) and IA-4 (Feenstra not
// seeking re-election) are open seats - confirmed by cross-checking the
// candidate list against house.gov's current Iowa delegation (Miller-
// Meeks IA-1, Hinson IA-2, Nunn IA-3, Feenstra IA-4, all sitting
// Republicans). IA-1 and IA-3 are not open - their sitting incumbents are
// the Republican filers for their own districts.
export const IA_OPEN_SEAT_DISTRICTS = ["02", "04"];

export const IA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 - incumbent Mariannette Miller-Meeks (R) seeking
  // re-election, confirmed as the district's Republican filer and as the
  // sitting IA-1 representative on house.gov.
  {
    district: "01",
    name: "Mariannette Miller-Meeks",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Christina Bohannan",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Michael Bridgford",
    party: "NPI",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 - open seat: sitting Rep. Ashley Hinson (R) filed for US
  // Senate instead of re-election to her House seat (confirmed absent
  // from the IA-2 filer list; see the US Senate roster below). Joe
  // Mitchell is the new Republican nominee.
  {
    district: "02",
    name: "Joe Mitchell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Lindsay James",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Rick Stewart",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Dave Bushaw",
    party: "NPI",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 - incumbent Zach Nunn (R) seeking re-election, confirmed
  // as the district's Republican filer and as the sitting IA-3
  // representative on house.gov.
  {
    district: "03",
    name: "Zach Nunn",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Sarah Trone Garriott",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 - open seat: sitting Rep. Randy Feenstra (R) is not a
  // candidate for IA-4 re-election (confirmed absent from the IA-4 filer
  // list). Chris McGowan is the new Republican nominee.
  {
    district: "04",
    name: "Chris McGowan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Dave Dawson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// US Senate - open seat: neither sitting Iowa senator (Chuck Grassley or
// Joni Ernst, per senate.gov) is a 2026 candidate; Ernst's seat is the
// one up this cycle and she is not seeking re-election. Ashley Hinson,
// IA-2's sitting House incumbent, is the Republican nominee instead (see
// IA-2's open-seat note above).
export const IA_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Ashley Hinson",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Josh Turek",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
  {
    district: null,
    name: "Thomas Laehn",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
    office: "senate",
  },
];
