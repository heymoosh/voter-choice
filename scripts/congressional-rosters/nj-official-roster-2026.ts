/**
 * scripts/congressional-rosters/nj-official-roster-2026.ts
 *
 * New Jersey's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 12 US House districts and the US Senate
 * race (NJ's Class II seat; the Class I seat, held by Andy Kim, is not up
 * until 2030). Built through the same manual official-source pipeline as
 * Arizona (card 637c2583), Texas (card 8530a468), Oklahoma (card
 * d9b1ef86), Alabama, Alaska, Colorado, Connecticut, California, Arkansas,
 * Delaware, Florida, Hawaii, Maine, and Indiana, epic c5a813bb; this is
 * New Jersey's build (card "[P0] Import + verify official roster: New
 * Jersey (NJ)").
 *
 * NEW-JERSEY-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/new-jersey-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. New Jersey's Department of State, Division of Elections
 *     (nj.gov/state/elections) publishes static PDF candidate lists at
 *     nj.gov/state/elections/assets/pdf/election-results/2026/ - no JS
 *     portal, no *.civixapps.com domain; the Civix portal playbook does
 *     not apply here.
 *   - TWO DIFFERENT PDFs answer two different questions, and neither alone
 *     is the full general-ballot roster:
 *     (1) "2026 Official Primary Election Candidates" (US House / US
 *         Senate, dated 04/02/2026) - a real text-layer PDF listing every
 *         candidate who filed for the June 2, 2026 primary, by district
 *         and party, with a "*" marking sitting incumbents as of the
 *         filing deadline. This is the FIELD of primary candidates, not
 *         the nominees - most NJ districts had multiple filers per party.
 *     (2) "2026 Unofficial General Election Candidates" (dated 06/12/2026,
 *         published 10 days after the primary) - a real text-layer PDF,
 *         but it turned out to list ONLY independent/minor-party
 *         petition-filers who file directly onto the general ballot (13
 *         US House filers across 8 districts, 2 US Senate filers) - ZERO
 *         Democratic or Republican rows appear anywhere in this document.
 *         This matches New Jersey's actual ballot-access law (N.J.S.A.
 *         19:13-3): a party primary's winner becomes the general-ballot
 *         nominee automatically, with no separate post-primary filing, so
 *         the "general candidates" list the state publishes only ever
 *         needed to cover the OTHER path onto that same ballot -
 *         independent and minor-party candidates, who file nominating
 *         petitions (visible in this PDF as a "Petition Signatures" count
 *         per candidate) after the primary. Do not mistake this document
 *         for a complete general-ballot list - it structurally excludes
 *         every major-party nominee by design, not by omission.
 *   - MAJOR-PARTY NOMINEES had to be DERIVED for every contested primary
 *     (i.e. every district/party with more than one filer in PDF #1
 *     above), because New Jersey's official "Certification of Primary
 *     Election Nominees" PDF - the document that would directly answer
 *     this - is a SCANNED/IMAGE-ONLY PDF (confirmed: WebFetch and direct
 *     PDF text extraction both returned only image-compression artifacts,
 *     no extractable text; see the plan doc's scanned/image-only PDF
 *     gotcha). No New Jersey equivalent of Oklahoma's
 *     results.okelections.gov (a live official election-night-results
 *     portal) was found. In its place, each contested primary's winner
 *     was determined from independent New Jersey political journalism
 *     reporting AP-called results with vote totals/percentages (New
 *     Jersey Globe, New Jersey Monitor, WHYY, Patch/NBC citing the
 *     Associated Press) - NOT from the state's own certification document,
 *     which could not be read. This is a materially different sourcing
 *     path than every prior state in this track and is flagged here and
 *     in KNOWN LIMITATIONS accordingly; the FIELD of candidates per
 *     district/party (who was even eligible to win) is still sourced
 *     solely from the state's own official PDF #1 above.
 *   - INCUMBENCY was cross-checked two ways, never guessed from either NJ
 *     source or this app's own FEC-derived `candidates` table:
 *     (1) the official primary-candidates PDF's own "*" incumbent marker
 *     (present for Norcross, Van Drew, Conaway, Smith, Gottheimer,
 *     Pallone, Kean Jr., Menendez, Pou, McIver, and Booker);
 *     (2) https://www.house.gov/representatives ("By State and District")
 *     for the CURRENT (2026-07-15) House delegation, and
 *     https://bioguide.congress.gov for Senate confirmation.
 *   - NJ-11 TIMING NUANCE: Analilia Mejia carries NO "*" in the official
 *     primary-candidates PDF (dated 04/02/2026), because as of that filing
 *     deadline she had won only the Feb 5, 2026 special PRIMARY for the
 *     open NJ-11 seat (Mikie Sherrill's resignation to become NJ Governor)
 *     - not yet the special GENERAL election, which did not occur until
 *     April 16, 2026. By the time of this fixture's build (2026-07-15),
 *     she is the sitting NJ-11 Representative per house.gov and is
 *     recorded here as `isIncumbent: true` - the state's frozen
 *     April-2-snapshot asterisk undercounts incumbency for this one seat,
 *     an artifact of timing, not a data error.
 *   - NJ-12 IS AN OPEN SEAT: Bonnie Watson Coleman (D), the sitting
 *     Representative as of this build, did not file for re-election
 *     (confirmed absent from the official primary-candidates filing list
 *     for NJ-12, and independently confirmed via her November 2025
 *     not-seeking-re-election announcement) - no incumbent row for NJ-12
 *     below, mirroring the OK-1 open-seat precedent.
 *   - NJ-8 HAS NO REPUBLICAN NOMINEE: no Republican candidate filed for
 *     the NJ-8 primary at all (confirmed absent from the official
 *     primary-candidates PDF) - the Democratic incumbent's general-ballot
 *     opponents are three independent/minor-party petition filers only.
 *   - INDEPENDENT/MINOR-PARTY CANDIDATES: New Jersey's post-2020
 *     "office-block" ballot design requires every candidate outside the
 *     two major parties to select a ballot "Party" label, which is often
 *     just a self-chosen campaign slogan rather than a real party name
 *     (e.g. "SAVE OUR BABIES", "WE THE PEOPLE", "HOPE FOR TOMORROW") -
 *     these are recorded as `party: "IND"` below, with the literal chosen
 *     label preserved in an inline comment for traceability. Two entries
 *     use a REAL, nationally-recognized minor party name appearing
 *     identically across multiple unrelated candidates/races (Green Party,
 *     Libertarian Party - both already in the shared type enum from prior
 *     states) and Socialist Workers Party (added to types.ts by this
 *     build - see that file's `SWP` comment). Since the general-candidates
 *     PDF is explicitly titled "Unofficial List" and does not confirm
 *     final petition-signature sufficiency, all independent/minor-party
 *     rows are recorded as `declared_general_ballot_intent`, not
 *     `qualified_for_general_ballot`, matching the AZ/OK/TX conservative
 *     posture for this exact situation.
 *   - New Jersey does not hold primary runoffs (plurality wins) - no
 *     `runoff_pending` rows anywhere in this fixture.
 *
 * Sources:
 *   - https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-house.pdf
 *     (official field of June 2, 2026 primary filers, US House, with "*"
 *     incumbent marker - PRIMARY source for candidate names/party/incumbency)
 *   - https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-senate.pdf
 *     (same, US Senate)
 *   - https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-house-0612.pdf
 *     (official independent/minor-party petition filers for the general
 *     ballot, US House - does NOT include major-party nominees, see above)
 *   - https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-senate-0612.pdf
 *     (same, US Senate)
 *   - https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-certification-of-primary-nominees.pdf
 *     (the state's own primary-nominee certification - exists, but is a
 *     scanned/image-only PDF that could not be text-extracted this
 *     session; see KNOWN LIMITATIONS)
 *   - https://www.house.gov/representatives (current House delegation,
 *     "By State and District" - incumbency cross-check only)
 *   - https://bioguide.congress.gov (Senate incumbency cross-check only)
 *   - Independent journalism used ONLY to determine each contested
 *     primary's winner (never candidate eligibility/party, which comes
 *     solely from the official PDFs above): New Jersey Globe
 *     (newjerseyglobe.com), New Jersey Monitor (newjerseymonitor.com),
 *     WHYY (whyy.org), and AP-called results as reported by Patch/NBC News
 *     - see docs/operations/new-jersey-vertical-slice-data-check.md for
 *     the full per-district citation list.
 *
 * Coverage: all 12 US House districts + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Every contested primary's WINNER (as opposed to the field of
 *     candidates) is sourced from independent journalism reporting
 *     AP-called results, not from New Jersey's own certification document
 *     (scanned/image-only, unreadable this session) - a materially
 *     different sourcing path than prior states in this track. Flagged for
 *     Muxin same as AZ's/OK's/TX's equivalent open items.
 *   - Independent/minor-party filers' final petition-signature sufficiency
 *     as of this list's "Unofficial" publication date could not be
 *     confirmed from the official sources read this session - recorded as
 *     "declared_general_ballot_intent" (see above).
 *   - Names are recorded as they appear in the official filing lists; not
 *     independently re-verified against a third document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NJ_STATE = "NJ";
export const NJ_ELECTION_YEAR = 2026;
export const NJ_STAGE = "general" as const;
export const NJ_HOUSE_SOURCE_URLS = [
  "https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-house.pdf",
  "https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-house-0612.pdf",
];
export const NJ_SENATE_SOURCE_URLS = [
  "https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-official-primary-candidates-us-senate.pdf",
  "https://www.nj.gov/state/elections/assets/pdf/election-results/2026/2026-unofficial-general-candidates-us-senate-0612.pdf",
];
export const NJ_RETRIEVED_AT = "2026-07-15";

// NJ-12 is an open seat: Bonnie Watson Coleman, the sitting representative,
// did not file for re-election (confirmed absent from the official
// primary-candidates filing list; confirmed independently via her November
// 2025 retirement announcement). No other NJ House district lost its
// incumbent.
export const NJ_OPEN_SEAT_DISTRICTS = ["12"];

export const NJ_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — both incumbent parties' primaries were unopposed.
  {
    district: "01",
    name: "DONALD NORCROSS",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "DAMON GALDO",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — Van Drew (incumbent) unopposed; Mullock won a 4-way
  // Democratic primary (Alexander, Mullock, Reese, Winder all filed).
  {
    district: "02",
    name: "JEFF VAN DREW",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "ZACK MULLOCK",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "INDEPENDENT".
  {
    district: "02",
    name: "RAMON MORA JR.",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 03 — Conaway (incumbent) unopposed; McGuire won a 3-way
  // Republican primary (Barbera, Cullen, McGuire all filed).
  {
    district: "03",
    name: "HERB CONAWAY",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "MICHAEL P. MCGUIRE",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "AFFORDABILITY,
  // ACCOUNTABILITY, PEOPLE" (self-chosen slogan, not a real party).
  {
    district: "03",
    name: "RYAN MICHAEL KELLY",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "03",
    name: "STEVEN WELZER",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 04 — Smith (incumbent) unopposed; Peace won a 2-way
  // Democratic primary (Blake, Peace both filed).
  {
    district: "04",
    name: "CHRISTOPHER H. SMITH",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "RACHEL PEACE",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 — both incumbent parties' primaries were unopposed.
  {
    district: "05",
    name: "JOSH GOTTHEIMER",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "SEAN KIRRANE",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "HUMANE SUSTAINABLE FUTURE"
  // (self-chosen slogan, not a real party).
  {
    district: "05",
    name: "ADAM RUEDA",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 06 — Herzig (R) unopposed; Pallone (incumbent) won a 3-way
  // Democratic primary (Pallone 67%, Hsu 26%, Bansil 8% per New Jersey
  // Globe/Patch AP-called results).
  {
    district: "06",
    name: "FRANK PALLONE JR.",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "HILLARY HERZIG",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — Kean Jr. (incumbent) unopposed; Bennett won a 4-way
  // Democratic primary (Bennett, Roth, Shah, Varela all filed).
  {
    district: "07",
    name: "THOMAS H. KEAN JR.",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "REBECCA BENNETT",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "LANA LEGUÍA",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // Independent petition filer, ballot label "STOP ISRAEL'S GENOCIDE"
  // (self-chosen slogan, not a real party).
  {
    district: "07",
    name: "SEAMUS PATRICK O'TOOLE",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 08 — NO Republican filed for this seat (confirmed absent
  // from the official primary-candidates list). Menendez (incumbent) won
  // a 2-way Democratic primary 69.8%-30.2% over Ali (New Jersey Globe /
  // New Jersey Monitor AP-called results).
  {
    district: "08",
    name: "ROB MENENDEZ",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "ARISTOTLE ELIOPOULOS",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "08",
    name: "CRAIG HONTS",
    party: "SWP",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // Independent petition filer, ballot label "WE THE PEOPLE" (self-chosen
  // slogan, not a real party).
  {
    district: "08",
    name: "DA'SHONE HUGHEY",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 09 — Pou (incumbent) unopposed; Pino won a 2-way Republican
  // primary over Burress, called by AP June 12, 2026 (per US News/WDBO).
  {
    district: "09",
    name: "NELIDA POU",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "ROSIE PINO",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "SAVE OUR BABIES" (self-
  // chosen slogan, not a real party).
  {
    district: "09",
    name: "TERRISA BUKOVINAC",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 10 — Bucco (R) unopposed; McIver (incumbent) won a 2-way
  // Democratic primary 86%-14% over Poster (New Jersey Monitor/Patch
  // AP-called results).
  {
    district: "10",
    name: "LAMONICA R. MCIVER",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "CARMEN BUCCO",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 11 — Hathaway (R) unopposed. Mejia won a 4-way Democratic
  // primary 82% over Cresitello, Lewis, and Strickland (New Jersey
  // Globe/Morristown Green AP-called results). See the docblock's "NJ-11
  // TIMING NUANCE" above — Mejia carries no "*" in the official filing
  // PDF (dated before her April 16, 2026 special-election win) but is
  // the sitting incumbent as of this build (2026-07-15).
  {
    district: "11",
    name: "ANALILIA MEJIA",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "JOE HATHAWAY",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "HOPE FOR TOMORROW" (self-
  // chosen slogan, not a real party).
  {
    district: "11",
    name: "ALAN B. BOND",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // DISTRICT 12 — OPEN SEAT (Watson Coleman not seeking re-election; see
  // NJ_OPEN_SEAT_DISTRICTS above). Mele (R) unopposed. Hamawy won a
  // 13-candidate Democratic primary (per US News: "bested 12 other
  // candidates").
  {
    district: "12",
    name: "ADAM HAMAWY",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "GREGG MELE",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "ANDRES JINETE",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  // Independent petition filer, ballot label "GET MONEY OUT" (self-chosen
  // slogan, not a real party).
  {
    district: "12",
    name: "WINSTON JORDAN",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

export const NJ_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Booker (incumbent) unopposed in the Democratic primary.
  {
    district: null,
    name: "CORY BOOKER",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Murphy won a 4-way Republican primary: Murphy 33.3%, Tabor 29.4%,
  // Zdan 27%, Lebovics 10.7% (WHYY/Phillyvoice AP-called results).
  {
    district: null,
    name: "JUSTIN MURPHY",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // Independent petition filer, ballot label "END THE CORRUPTION!" (self-
  // chosen slogan, not a real party).
  {
    district: null,
    name: "VERONICA FERNANDEZ",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: null,
    name: "JOANNE KUNIANSKY",
    party: "SWP",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];
