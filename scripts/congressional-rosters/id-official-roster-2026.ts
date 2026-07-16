/**
 * scripts/congressional-rosters/id-official-roster-2026.ts
 *
 * Idaho's 2026 official congressional roster for the November 3, 2026
 * general election — covers both US House districts and the 2026 US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86), Alabama,
 * Alaska, Colorado, Connecticut, California, Arkansas, Delaware, and Florida,
 * epic c5a813bb; this is Idaho's build (card "[P0] Import + verify official
 * roster: Idaho (ID)").
 *
 * IDAHO-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/idaho-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Idaho's official candidate-filing system is
 *     run.voteidaho.gov/search — a "ReFrame"-vended JS single-page app
 *     (returns an empty HTML shell to a non-browser fetch, same category of
 *     problem as TX/OK's Civix portals but a different vendor). Driven with
 *     `mcp__claude-in-chrome__*` browser automation, not WebFetch/curl.
 *   - CRITICAL: the filing portal only lists CANDIDATES WHO FILED for the
 *     May 19, 2026 primary — it has no "general election" bucket and does
 *     not indicate who won a contested primary. Idaho's official PRIMARY
 *     RESULTS live on a separate system, results.voteidaho.gov (the
 *     Secretary of State's statewide results portal), marked "OFFICIAL
 *     RESULTS" with 44/44 (or district-scoped 19/19, 26/26) counties
 *     reporting, last updated 2026-07-13. The primary was certified by the
 *     Idaho State Board of Canvassers on June 9, 2026 with no changes to any
 *     outcome. Every contested Republican/Democratic primary below is
 *     transcribed from this official results system, not inferred or
 *     sourced from Ballotpedia/Wikipedia (those were used only as an
 *     informal spot-check before pulling the official numbers).
 *   - ID_STAGE = "general": unlike FL (built pre-primary, still primary-
 *     stage), Idaho's May 19 primary is fully certified, so this fixture
 *     records determined general-ballot nominees only — primary-round
 *     candidates who did NOT win their party's nomination (e.g. Andy Briner
 *     and Joseph P Morrison, both R, lost ID-1's Republican primary to Russ
 *     Fulcher) are omitted entirely, not carried as
 *     `qualified_for_primary_ballot` rows. Idaho's primary is decided by
 *     plurality with no runoff mechanism, so no `runoff_pending` rows apply
 *     anywhere in this fixture.
 *   - INDEPENDENT AND MINOR-PARTY (Constitution) CANDIDATES DO NOT PRIMARY:
 *     the filing portal shows Independent and Constitution Party filers for
 *     both House districts and the Senate race, but results.voteidaho.gov's
 *     official primary-results system has NO Independent or Constitution
 *     Party contest for any federal race (only Democratic/Republican/
 *     Libertarian primary contests appear) — confirmed by their absence from
 *     the complete Federal section of the official results page. Under
 *     Idaho's nomination process, each Independent or Constitution Party
 *     filer petitions directly onto the general ballot without competing in
 *     a primary against same-label filers, so every "Approved" Independent/
 *     Constitution filer is recorded here as `qualified_for_general_ballot`
 *     directly, not as a primary-stage row.
 *   - Libertarian contests DID appear in the official results where a
 *     Libertarian filed (Senate: Matt Loesby; ID-2: Will Johanson), each
 *     unopposed within their party and confirmed "Winner" at 100% — recorded
 *     as `qualified_for_general_ballot`.
 *   - New party code added to `types.ts` for this build: `CST` = Constitution
 *     Party of Idaho (Brendan J. Gomez, ID-1; C. Sierra - ID Law - Idaho
 *     Lorax, ID-2) — a real state-recognized minor party under Idaho law,
 *     distinct from generic `IND`.
 *   - INCUMBENCY was cross-checked against two independent official sources,
 *     never guessed from the portal's own signals or this app's FEC-derived
 *     `candidates` table: (1) house.gov's "By State and District" member
 *     directory (fetched via browser, 2026-07-15/16) confirms Russ Fulcher
 *     (ID-1) and Mike Simpson (ID-2) as Idaho's two sitting Representatives;
 *     (2) Jim Risch's sitting-Senator status is independently well-
 *     established and further confirmed by his own re-election filing and
 *     primary win under his existing seat.
 *   - WITHDRAWAL CHECK: the filing portal's "Filing Status" filter
 *     (Approved / Withdrawn) was left with both boxes checked when pulling
 *     the Federal candidate list; all 26 federal filings returned status
 *     "Approved" — zero "Withdrawn" federal candidates as of retrieval
 *     (2026-07-15/16).
 *   - GOVERNING CALENDAR DATES (item (e) of the plan doc's standing
 *     verification-deliverable requirement), all from voteidaho.gov's
 *     official 2026 Election Calendar (calendar list view) and Idaho Code
 *     §34-717 (legislature.idaho.gov):
 *     - 2026-06-09: Idaho State Board of Canvassers certified the May 19
 *       primary results statewide, no outcomes changed.
 *     - 2026-09-04, 5:00 p.m.: candidate-withdrawal deadline for the Nov 3
 *       general election (Idaho Code §34-717 — the 9th Friday before a
 *       general election; voteidaho.gov's calendar independently lists this
 *       same Sept 4, 2026 date as "Candidate Withdrawal Deadline: Last day
 *       partisan and nonpartisan candidates can withdraw from the Nov. 3
 *       election"). STILL OPEN as of this build (2026-07-15/16) — a
 *       qualified nominee below could still withdraw before this date.
 *     - 2026-09-04: Secretary of State candidate-certification deadline for
 *       the general election ("Secretary of State certifies candidates for
 *       the general election") — this is the date Idaho's 2026 federal
 *       roster becomes fully locked; also the write-in filing deadline and
 *       sample-ballot-layout deadline (same date, per voteidaho.gov's
 *       calendar).
 *     - 2026-11-03: general election day.
 *     - 2026-11-24: State Canvass — Secretary of State issues certificates
 *       to the candidates with the highest votes (post-election).
 *
 * Sources:
 *   - https://run.voteidaho.gov/search (Idaho Candidate Filing Portal — all
 *     26 federal filers for the May 19, 2026 primary, retrieved via browser
 *     2026-07-15/16)
 *   - https://results.voteidaho.gov/results/public/id/elections/may2026
 *     (Idaho Secretary of State's OFFICIAL primary election results —
 *     United States Senator, United States Representative District 1, and
 *     United States Representative District 2, each broken out by party;
 *     "Last Updated Monday, July 13, 2026", retrieved 2026-07-15/16)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check for ID-1/ID-2, retrieved 2026-07-15/16)
 *   - https://voteidaho.gov/calendar/list/ (official 2026 election calendar,
 *     withdrawal/certification dates, retrieved 2026-07-15/16)
 *   - https://legislature.idaho.gov/statutesrules/idstat/title34/t34ch7/sect34-717/
 *     (Idaho Code §34-717, candidate withdrawal deadlines, retrieved
 *     2026-07-15/16)
 *
 * Coverage: both US House districts (ID-1, ID-2) + the 2026 US Senate race.
 * Every entry below is a determined general-ballot contestant —
 * `qualified_for_general_ballot` — per the certified May 19 primary results
 * (Republican/Democratic/Libertarian nominees) or direct Independent/
 * Constitution Party petition access (no primary held for those filers).
 *
 * KNOWN LIMITATIONS:
 *   - This fixture reflects the certified-primary/filed-candidate roster as
 *     of 2026-07-15/16. The Sept 4, 2026 withdrawal window is still open — a
 *     dated re-check follow-up card is opened alongside this build per the
 *     NOT BEFORE convention.
 *   - Independent/Constitution Party filers are recorded as
 *     `qualified_for_general_ballot` on the strength of their "Approved"
 *     filing status in the official portal; this build did not separately
 *     verify petition-signature sufficiency counts, only the portal's own
 *     Approved/Withdrawn status field.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const ID_STATE = "ID";
export const ID_ELECTION_YEAR = 2026;
// Idaho's May 19, 2026 primary is certified (2026-06-09); every nomination
// below is determined. See docblock for the withdrawal-window caveat.
export const ID_STAGE = "general" as const;
export const ID_HOUSE_SOURCE_URLS = [
  "https://run.voteidaho.gov/search",
  "https://results.voteidaho.gov/results/public/id/elections/may2026",
];
export const ID_SENATE_SOURCE_URLS = [
  "https://run.voteidaho.gov/search",
  "https://results.voteidaho.gov/results/public/id/elections/may2026",
];
export const ID_RETRIEVED_AT = "2026-07-16";

export const ID_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Republican primary winner: Russ Fulcher, 78.24%
  // (100,104 votes) over Andy Briner (11.28%) and Joseph P Morrison
  // (10.48%); Democratic primary winner: Kaylee Peterson, 87.09%
  // (18,907 votes) over Kenneth Brungardt (12.91%); Independent and
  // Constitution Party filers go straight to the general (no primary).
  {
    district: "01",
    name: "Russ Fulcher",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Kaylee Peterson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Sarah Zabel",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Brendan J. Gomez",
    party: "CST",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — Republican primary winner: Mike Simpson, 63.31%
  // (63,448 votes) over Brian Keene (20.93%) and Perry Shumway (15.77%);
  // Democratic primary winner: Ellie Gilbreath, 72.48% (19,523 votes) over
  // Julie Wiley (27.52%); Libertarian primary: Will Johanson unopposed,
  // 100.00% (336 votes); Independent and Constitution Party filers go
  // straight to the general (no primary).
  {
    district: "02",
    name: "Mike Simpson",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Ellie Gilbreath",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Will Johanson",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "C. Sierra - ID Law - Idaho Lorax",
    party: "CST",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Emre Houser",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Tripp Charles Hutchinson",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const ID_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Republican primary winner: Jim Risch, 67.26% (156,140 votes) over Josh
  // Roy (14.30%), Joe Evans (14.06%), and Denny LaVe (4.39%); Democratic
  // primary winner: David Roth, 61.86% (29,534 votes) over Brad Moore
  // (31.13%) and Nickolas 007 Bonds (7.00%); Libertarian primary: Matt
  // Loesby unopposed, 100.00% (855 votes); Independent filers go straight
  // to the general (no primary).
  {
    district: null,
    name: "Jim Risch",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "David Roth",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Matt Loesby",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Natalie M Fleming",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Todd Achilles",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
