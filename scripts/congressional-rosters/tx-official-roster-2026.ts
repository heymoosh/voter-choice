/**
 * scripts/congressional-rosters/tx-official-roster-2026.ts
 *
 * Texas's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 38 US House districts and the US Senate
 * race. Built through the same manual official-source pipeline as Arizona
 * (card 637c2583, epic c5a813bb); this is Texas's build (card 8530a468),
 * chosen specifically because it has an active 2026 US Senate race, which
 * exercises the office:"senate" (statewide) code path AZ's House-only
 * roster never touched.
 *
 * TEXAS-SPECIFIC OPERATIONAL NOTES (see also the per-portal playbook this
 * session wrote up - search the nationwide roster plan doc for "Civix
 * portal operational playbook" - before repeating this for another state):
 *   - Unlike Arizona's PDF publications, Texas's official candidate source
 *     (goelect.txelections.civixapps.com, a Civix-vended SPA) had NOT
 *     published a distinct "2026 NOVEMBER GENERAL ELECTION" candidate
 *     bucket as of the retrieval date below - only primary/runoff/special
 *     election filing records existed in the Candidate Information system.
 *     The general-ballot nominee for each seat was therefore DERIVED, not
 *     directly read: certified vote totals from the Election Night Results
 *     system (same Civix stack, a different sub-app -
 *     ivis-enr-ui/races) identify each party's primary/runoff WINNER per
 *     district, which becomes that party's general-ballot nominee.
 *   - Neither of the portal's own incumbency signals proved reliable: the
 *     Election Night Results "(I)" marker and the Candidate Information
 *     system's explicit "INCUMBENT: YES/NO" field both failed to flag a
 *     sitting member (Rep. Al Green, TX-9) who ran in a DIFFERENT district
 *     (TX-18) that election. isIncumbent below is instead cross-referenced
 *     against the U.S. House's own official member directory
 *     (house.gov/representatives, "By State and District" > Texas),
 *     matched by district number + surname - never guessed, never taken
 *     from this app's own FEC-derived data (which is exactly the kind of
 *     stale/inaccurate source this roster feature exists to route around).
 *   - Independent candidates: sourced from the Secretary of State's
 *     official "2026 Independent Declarations of Intent" tracking PDF
 *     (https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf),
 *     which is a DECLARATION-stage document - filers here still need
 *     petition-signature verification before final general-ballot
 *     certification. Recorded as ballotStatus "declared_general_ballot_intent"
 *     rather than "qualified_for_general_ballot" to keep that distinction
 *     honest.
 *
 * Sources:
 *   - https://goelect.txelections.civixapps.com/ivis-enr-ui/races
 *     (Election Night Results - certified vote totals for the 2026
 *     Democratic/Republican primary and primary-runoff elections; the
 *     source of each party's general-ballot nominee per seat)
 *   - https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf
 *     (official independent declarations of intent, all offices)
 *   - https://www.house.gov/representatives (119th Congress Texas
 *     delegation - incumbency cross-check only, not a candidate-roster
 *     source)
 *
 * Coverage: all 38 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - No official "general ballot" certification document exists yet at
 *     transcription time; major-party nominees are derived from certified
 *     primary/runoff results, not a final SoS-published general slate.
 *   - Libertarian and Green Party congressional nominees (TX nominates
 *     minor parties by convention, not primary) could NOT be located
 *     through any official Secretary of State document this session -
 *     omitted here rather than guessed. The prior TX Senate research (card
 *     c5a813bb / PR #296, docs/operations/candidate-roster-source-decision-report.md)
 *     included a Libertarian Senate candidate (Ted Brown) sourced only from
 *     Ballotpedia as a comparison oracle, with no official corroboration
 *     found either then or in this session - deliberately excluded here
 *     pending an official source. Flag to Muxin for a call on whether to
 *     reconcile that gap before this data is used.
 *   - The independent-declarations PDF (fetched 2026-07-15) lists 5 US
 *     Senate independents (Simmons, Evans, Coster, Garza, Harper). PR
 *     #296's Ballotpedia-sourced comparison instead listed 7 (also
 *     including Cain, Ford, Truelson, and explicitly excluding Evans as
 *     "withdrawn or disqualified"). This fixture follows the official PDF
 *     as the higher-trust source and does not include Cain/Ford/Truelson
 *     or exclude Evans - an open discrepancy between two sources, not
 *     resolved here, consistent with the AZ fixture's precedent of
 *     recording rather than silently adjudicating such conflicts.
 *   - TX-23 (Gonzales, Tony) is listed as a vacancy by house.gov as of the
 *     retrieval date - no incumbent row is set for either party's TX-23
 *     nominee.
 *   - Names are recorded as displayed by the certified Election Night
 *     Results / independent-declarations sources; not independently
 *     re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const TX_STATE = "TX";
export const TX_ELECTION_YEAR = 2026;
export const TX_STAGE = "general" as const;
export const TX_HOUSE_SOURCE_URLS = [
  "https://goelect.txelections.civixapps.com/ivis-enr-ui/races",
  "https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf",
];
export const TX_SENATE_SOURCE_URLS = [
  "https://goelect.txelections.civixapps.com/ivis-enr-ui/races",
  "https://www.sos.texas.gov/elections/forms/2026-independent-declaration-tracking.pdf",
];
export const TX_RETRIEVED_AT = "2026-07-15";

// Districts whose sitting incumbent (per house.gov) is not on the 2026
// general nominee list for either party in that same district - either they
// didn't seek re-election in their own seat, or lost their primary/runoff.
// TX-23 is separately a house.gov-listed vacancy (no incumbent to check).
export const TX_OPEN_SEAT_DISTRICTS = [
  "02", "08", "09", "10", "19", "21", "30", "32", "33", "35", "37", "38",
];
export const TX_VACANCY_DISTRICTS = ["23"];

export const TX_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  { district: "01", name: "YOLANDA R. PRINCE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "01", name: "NATHANIEL MORAN", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "01", name: "NATHAN LEVIN JACKSON", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-02 — open seat: Crenshaw, Dan (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "02", name: "SHAUN FINNIE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "02", name: "STEVE TOTH", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "03", name: "EVAN HUNT", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "03", name: "KEITH SELF", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "03", name: "ANTHONY MICHAEL DEATS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "04", name: "JASON PEARCE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "04", name: "PAT FALLON", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "05", name: "CHELSEY HOCKETT", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "05", name: "LANCE GOODEN", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "05", name: "DEADRA ANN MARSH-FOY", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "06", name: "DANNY MINTON", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "06", name: "JAKE ELLZEY", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "07", name: "LIZZIE PANNILL FLETCHER", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "07", name: "ALEXANDER HALE", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "07", name: "ROBERTO CONRADO CENTENO", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "07", name: "ROYCE DONALD BROUGH JR.", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-08 — open seat: Luttrell, Morgan (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "08", name: "LAURA JONES", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "08", name: "JESSICA HART STEINMANN", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  // TX-09 — open seat: Green, Al (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "09", name: "LETICIA GUTIERREZ", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "09", name: "ALEX MEALER", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "09", name: "ROGELIO MORALES JR.", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-10 — open seat: McCaul, Michael (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "10", name: "CAITLIN ROURK", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "10", name: "CHRIS GOBER", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "10", name: "CASEY W MALISH", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "10", name: "ROBERT DOUGLAS MILLS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "11", name: "CLAIRE REYNOLDS", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "11", name: "AUGUST PFLUGER", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "11", name: "JOHN PATRICK FARDAL", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "11", name: "SEAN MICHAEL BENSON", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "12", name: "ANGELA \"HELI\" RODRIGUEZ PRILLIMAN", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "12", name: "CRAIG GOLDMAN", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "13", name: "MARK NAIR", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "13", name: "RONNY JACKSON", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "14", name: "THURMAN BILL BARTIE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "14", name: "RANDY WEBER", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "15", name: "BOBBY PULIDO", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "15", name: "MONICA DE LA CRUZ", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "16", name: "VERONICA ESCOBAR", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "16", name: "ADAM BAUMAN", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "16", name: "RENE NICHOLAS FIERRO", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "17", name: "CASEY SHEPARD", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "17", name: "PETE SESSIONS", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "17", name: "STANTON JOSEPH MICHAEL COLLINS JR.", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "18", name: "CHRISTIAN DASHAUN MENEFEE", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "18", name: "RONALD DWAYNE WHITFIELD", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "18", name: "VALENCIA LANA WILLIAMS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-19 — open seat: Arrington, Jodey (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "19", name: "KYLE RABLE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "19", name: "TOM SELL", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "19", name: "MICHAEL ISMAEL GARCIA", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "20", name: "JOAQUIN CASTRO", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "20", name: "EDGARDO RAFAEL BAEZ", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "20", name: "ADAM NEIL JONASZ", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "20", name: "GERARD ANTHONY VILLALOBOS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-21 — open seat: Roy, Chip (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "21", name: "KRISTIN HOOK", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "21", name: "MARK TEIXEIRA", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "21", name: "ELDON DANIEL MCQUEEN", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "22", name: "MARQUETTE GREENE-SCOTT", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "22", name: "TREVER NEHLS", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  // TX-23 — vacant seat per house.gov (Gonzales, Tony no longer serving); no incumbent to match
  { district: "23", name: "KATY PADILLA STOUT", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "23", name: "BRANDON HERRERA", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "23", name: "BENJAMIN E. MENDOZA", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "23", name: "MATTHEW HAMILTON SCHAUB", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "23", name: "PATTI ANN HALE-ASHE", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "23", name: "VERONICA WILLIAMS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "24", name: "KEVIN BURGE", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "24", name: "BETH VAN DUYNE", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "25", name: "DIONE SIMS", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "25", name: "ROGER WILLIAMS", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "26", name: "STEVEN SHOOK", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "26", name: "BRANDON GILL", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "27", name: "TANYA LLOYD", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "27", name: "MICHAEL CLOUD", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "27", name: "TRAVIS DANIEL MCQUEEN", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "28", name: "HENRY CUELLAR", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "28", name: "TANO E. TIJERINA", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "28", name: "ADRIEL VENTURA LOPEZ", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "28", name: "FRANCISCO JAVIER MARTINEZ", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "29", name: "SYLVIA GARCIA", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "29", name: "MARTHA FIERRO", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  // TX-30 — open seat: Crockett, Jasmine (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "30", name: "FREDERICK D. HAYNES III", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "30", name: "EVERETT JACKSON", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "31", name: "JUSTIN EARLY", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "31", name: "JOHN CARTER", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "31", name: "LARICE NATASHIA WOODS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-32 — open seat: Johnson, Julie (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "32", name: "DAN BARRIOS", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "32", name: "JACE YARBROUGH", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  // TX-33 — open seat: Veasey, Marc (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "33", name: "COLIN ALLRED", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "33", name: "PATRICK DAVID GILLESPIE", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "33", name: "BRENT ALAN BROWN", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "33", name: "PAYTON KARLEY JACKSON", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "33", name: "WILLIAM BRADLEY TUCKER", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "34", name: "VICENTE GONZALEZ", party: "DEM", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "34", name: "ERIC FLORES", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  // TX-35 — open seat: Casar, Greg (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "35", name: "JOHNNY C. GARCIA", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "35", name: "CARLOS DE LA CRUZ", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "35", name: "ANTHONY RICHARD SISSINE JR.", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "35", name: "RAFAEL ALCOSER III", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "35", name: "SUZANNE L. WYNN", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "36", name: "RHONDA HART", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "36", name: "BRIAN BABIN", party: "REP", isIncumbent: true, ballotStatus: "qualified_for_general_ballot" },
  { district: "36", name: "HAL JUSTIN RIDLEY JR.", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-37 — open seat: Doggett, Lloyd (D), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "37", name: "GREG CASAR", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "37", name: "LAUREN B. PEÑA", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "37", name: "JAME NICHOLAS KINNEY", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  // TX-38 — open seat: Hunt, Wesley (R), the sitting member, is not on this district's 2026 general nominee list per house.gov cross-check
  { district: "38", name: "MELISSA MCDONOUGH", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "38", name: "JON BONCK", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: "38", name: "SCOTT RALSTON CUBBLER", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: "38", name: "WILLIAM MISKEY TAGGART IV", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
];

export const TX_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  { district: null, name: "JAMES TALARICO", party: "DEM", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: null, name: "KEN PAXTON", party: "REP", isIncumbent: false, ballotStatus: "qualified_for_general_ballot" },
  { district: null, name: "JADE SMALLS SIMMONS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: null, name: "RONALD DEMETRIUS EVANS", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: null, name: "ROBERT DANIEL COSTER", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: null, name: "JONATHAN ANTHONY GARZA", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
  { district: null, name: "WILLIAM JEFFREY HARPER", party: "IND", isIncumbent: false, ballotStatus: "declared_general_ballot_intent" },
];
