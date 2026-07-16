/**
 * scripts/congressional-rosters/mn-official-roster-2026.ts
 *
 * Minnesota's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 8 US House districts and the 2026 US
 * Senate race (Tina Smith's Class 2 seat). Built through the same manual
 * official-source pipeline as Arizona, Texas, Oklahoma, Alabama, Alaska,
 * Colorado, Connecticut, California, Arkansas, and Florida (epic
 * c5a813bb); this is Minnesota's build (card "[P0] Import + verify
 * official roster: Minnesota (MN)").
 *
 * MINNESOTA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/minnesota-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix — Minnesota's official candidate-filing system is a
 *     state-hosted ASP.NET WebForms application at
 *     candidates.sos.mn.gov/CandidateFilingResults.aspx. The Civix
 *     portal playbook in the nationwide roster plan doc does not apply
 *     here. The host sits behind Radware bot-management (a raw
 *     non-browser fetch redirects to validate.perfdrive.com), so a real
 *     rendered browser session (not curl/WebFetch) is required — but once
 *     loaded, every federal filer (US Senate + all 8 US House districts)
 *     renders on ONE page, no filters/pagination/JS-driven navigation
 *     needed, materially simpler than TX's Civix SPA or CA/FL's scale.
 *   - MN_STAGE = "primary": Minnesota's Aug 11, 2026 state primary is
 *     still in the future as of this fixture's transcription (2026-07-15).
 *     The candidate-filing period (May 19 – June 2, 2026) has closed and
 *     the withdrawal deadline for filed candidates (June 4, 2026) has also
 *     passed, so the full candidate SET is known and closed — no further
 *     candidates can be added this cycle — but almost every party's
 *     nominee is still undetermined pending the primary.
 *   - PARTY-BY-PARTY DETERMINATION LOGIC (mirrors FL/CA's pending-primary
 *     pattern, not OK's post-primary-runoff pattern): for each seat, a
 *     party fielding MORE THAN ONE filer has a genuinely contested primary
 *     — every filer in that primary is recorded `qualified_for_primary_ballot`
 *     (nominee undetermined, per the epic's SAFETY rule against inferring
 *     a winner from filing alone). A party fielding EXACTLY ONE filer for a
 *     seat has no primary contest — Minnesota does not hold a primary for
 *     an unopposed candidate — so that sole filer IS the nominee already;
 *     recorded `qualified_for_general_ballot`.
 *   - INDEPENDENT / MINOR-PARTY FILERS recorded `qualified_for_general_ballot`,
 *     NOT `declared_general_ballot_intent` (unlike OK/TX's more
 *     conservative posture for undocumented petition-verification status)
 *     — the candidates.sos.mn.gov portal's own published notice states
 *     "Candidates filing using petitions are added after their petitions
 *     are reviewed" (i.e., appearing on this list already confirms
 *     completed petition review), so no further verification-pending
 *     caveat applies. This covers Marisa Simonetti (Independent, US
 *     Senate) and DeVelle L. Jackson (Independent, MN-05); Rebecca Whiting
 *     (Libertarian, US Senate) is the sole Libertarian Senate filer, so no
 *     Libertarian primary exists for that seat either.
 *   - DFL party code: Minnesota's Democratic affiliate is the
 *     Democratic-Farmer-Labor party; the portal lists it verbatim as
 *     "Democratic-Farmer-Labor", never "Democratic". Added `DFL` to
 *     types.ts's party union and to races.ts's PARTY_NAMES map, mirroring
 *     the AIP/AKP/NPP/PF/LPF/FFP precedent for a state's own recognized
 *     party rather than flattening to generic "DEM".
 *   - OPEN SEATS: the US Senate seat is open — Sen. Tina Smith announced
 *     (Feb 2025) she will not seek reelection and does not appear anywhere
 *     in the Senate filing list. MN-02 is ALSO an open House seat: sitting
 *     Rep. Angie Craig (MN-02) filed for the open US Senate seat instead of
 *     re-election to her House seat — confirmed absent from the MN-02
 *     filing list, confirmed present in the Senate filing list under DFL.
 *   - INCUMBENCY was cross-checked against Congress.gov's official 119th
 *     Congress member list (congress.gov/members, filtered to Minnesota),
 *     which independently confirms all 8 sitting US Representatives (by
 *     name AND district) and both sitting Senators — Amy Klobuchar (Class
 *     1, NOT up in 2026) and Tina Smith (Class 2, up in 2026, not seeking
 *     reelection). Every incumbent below who filed appears in the SAME
 *     district shown on Congress.gov, with no district-mismatch surprises
 *     like TX's Al Green case or FL's mid-decade redistricting — Minnesota
 *     did not redistrict for this cycle.
 *   - No write-in candidates appear in the official portal's Federal
 *     Offices section for either chamber — not omitted, verified absent
 *     (the portal shows no separate write-in bucket under Federal
 *     Offices at all, unlike AZ/FL/IN which listed write-ins inline).
 *   - No Green Party filings found for any MN federal seat this cycle —
 *     not omitted, verified absent from the full Federal Offices listing.
 *
 * Sources:
 *   - https://candidates.sos.mn.gov/CandidateFilingResults.aspx?county=0&municipality=0&schooldistrict=0&hospitaldistrict=0&level=1&party=0&federal=True&judicial=True&executive=True&senate=True&representative=True&title=&office=0&candidateid=0
 *     (Minnesota Secretary of State's official candidate-filing results —
 *     the candidate SET for all federal offices, fetched via a rendered
 *     browser session)
 *   - https://www.congress.gov/members?q=%7B%22congress%22%3A%22119%22%2C%22member-state%22%3A%22Minnesota%22%7D
 *     (119th Congress Minnesota delegation — incumbency cross-check only,
 *     not a candidate-roster source)
 *
 * Coverage: all 8 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Nearly every contested-primary party nomination is undetermined
 *     pending Minnesota's August 11, 2026 primary (see `runoff_pending`'s
 *     sibling status `qualified_for_primary_ballot` used throughout below
 *     — this is NOT a runoff state; Minnesota's primary is a single round,
 *     plurality-wins, no runoff mechanism). This fixture will need a
 *     follow-up update once the primary is certified — see the dated
 *     "NOT BEFORE" re-check card opened alongside this build (per the
 *     epic's NOT-BEFORE date-gate convention).
 *   - Minnesota's post-primary/pre-general "vacancy in nomination"
 *     mechanism (M.S. 204B.13, covering a nominee's death or withdrawal
 *     after winning the primary) is event-triggered, not governed by a
 *     fixed calendar date — the official 2026 Minnesota Counties Calendar
 *     (sos.mn.gov) records only the pre-primary withdrawal deadline
 *     (June 4, 2026, already passed) as a fixed date; no separate
 *     universal post-primary withdrawal deadline exists to record.
 *   - Names are recorded as they appear in the official filing list; not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MN_STATE = "MN";
export const MN_ELECTION_YEAR = 2026;
export const MN_STAGE = "primary" as const;
export const MN_HOUSE_SOURCE_URLS = [
  "https://candidates.sos.mn.gov/CandidateFilingResults.aspx?county=0&municipality=0&schooldistrict=0&hospitaldistrict=0&level=1&party=0&federal=True&judicial=True&executive=True&senate=True&representative=True&title=&office=0&candidateid=0",
];
export const MN_SENATE_SOURCE_URLS = [
  "https://candidates.sos.mn.gov/CandidateFilingResults.aspx?county=0&municipality=0&schooldistrict=0&hospitaldistrict=0&level=1&party=0&federal=True&judicial=True&executive=True&senate=True&representative=True&title=&office=0&candidateid=0",
];
export const MN_RETRIEVED_AT = "2026-07-15";

// MN-02 is an open seat: sitting Rep. Angie Craig filed for the open US
// Senate seat instead of re-election to her House seat (confirmed absent
// from the MN-02 filing list; confirmed present in the Senate DFL primary
// field below).
export const MN_OPEN_SEAT_DISTRICTS = ["02"];

// Every contested-primary contest below (more than one filer for a party
// in a given seat) is undetermined pending Minnesota's August 11, 2026
// primary as of this fixture's retrieval date (2026-07-15) — see KNOWN
// LIMITATIONS. Minnesota has no runoff mechanism; the primary is single-
// round, plurality-wins.
export const MN_CONTESTED_PRIMARY_CONTESTS = [
  { office: "senate" as const, district: null, party: "REP" as const },
  { office: "senate" as const, district: null, party: "DFL" as const },
  { office: "house" as const, district: "01", party: "REP" as const },
  { office: "house" as const, district: "01", party: "DFL" as const },
  { office: "house" as const, district: "02", party: "DFL" as const },
  { office: "house" as const, district: "03", party: "REP" as const },
  { office: "house" as const, district: "04", party: "REP" as const },
  { office: "house" as const, district: "04", party: "DFL" as const },
  { office: "house" as const, district: "05", party: "REP" as const },
  { office: "house" as const, district: "05", party: "DFL" as const },
  { office: "house" as const, district: "06", party: "REP" as const },
  { office: "house" as const, district: "07", party: "DFL" as const },
  { office: "house" as const, district: "08", party: "REP" as const },
  { office: "house" as const, district: "08", party: "DFL" as const },
];

export const MN_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — Finstad (incumbent) faces a contested Republican
  // primary; Democratic-Farmer-Labor primary also contested.
  {
    district: "01",
    name: "Brad Finstad",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Gregory A. Goetzman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Oliver R. Morlan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Alex Eaton",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jake Johnson",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 02 — open seat (Craig running for US Senate instead). Sole
  // Republican filer is the automatic nominee; DFL primary contested
  // 6-way.
  {
    district: "02",
    name: "Eric Pratt",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Abdi Abdulle",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Kaela Berg",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Matthew D. Klein",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Matt Little",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Hugh McTavish",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Christopher Mosel",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 03 — Republican primary contested 2-way; Morrison (incumbent)
  // is the sole DFL filer, automatic nominee.
  {
    district: "03",
    name: "Tyler Bass",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Quentin Wittrock",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Kelly Morrison",
    party: "DFL",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — McCollum (incumbent) faces a contested DFL primary;
  // Republican primary also contested 3-way.
  {
    district: "04",
    name: "Gene Rechtzigel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Paul Wikstrom",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Paul Xiong",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Betty McCollum",
    party: "DFL",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Aswar Rahman",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 05 — Omar (incumbent) faces a contested 5-way DFL primary;
  // Republican primary contested 4-way; sole Independent filer is the
  // automatic nominee for that line.
  {
    district: "05",
    name: "DeVelle L. Jackson",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Dalia Al-Aqidi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "John Nagel",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Angie Windhauser",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Abbey Zieska",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Julie Trang Le",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Abena A. McKenzie",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Ilhan Omar",
    party: "DFL",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Latonya T. Reeves",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Nate Schluter",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 06 — Emmer (incumbent) faces a contested 3-way Republican
  // primary; sole DFL filer is the automatic nominee.
  {
    district: "06",
    name: "Chris Corey",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Tom Emmer",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Mike Foley",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Doug Chapin",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — Fischbach (incumbent), sole Republican filer, automatic
  // nominee; DFL primary contested 2-way.
  {
    district: "07",
    name: "Michelle Fischbach",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Steve Carlson",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Erik Osberg",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // DISTRICT 08 — Stauber (incumbent) faces a contested 2-way Republican
  // primary; DFL primary contested 3-way.
  {
    district: "08",
    name: "Anthony Hamilton",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Pete Stauber",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Luke Gulbranson",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "John Munter",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Trina Swanson",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

export const MN_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Open seat: Sen. Tina Smith (Class 2, sitting) announced Feb 2025 she
  // will not seek reelection — does not appear anywhere in this filing
  // list — no incumbent below. Republican primary contested 9-way; DFL
  // primary contested 6-way (includes sitting MN-02 Rep. Angie Craig, who
  // filed here instead of for reelection to her House seat).
  {
    district: null,
    name: 'Bob "Again" Carney Jr.',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Cynthia Gail",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Ahmad R. (Raafat) Hassan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Joyce Lacey",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Patrick Munro",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Adam Schwarze",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Michele Tafoya",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Tom Weiler",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Royce White",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Kurt Michael Anderson",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Angie Craig",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Peggy Flanagan",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "George H Kalberer",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Peter John Murgic",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "Billy Nord",
    party: "DFL",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Sole Independent filer — automatic nominee, no primary held.
  {
    district: null,
    name: "Marisa Simonetti",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Sole Libertarian filer — automatic nominee, no primary held.
  {
    district: null,
    name: "Rebecca Whiting",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
