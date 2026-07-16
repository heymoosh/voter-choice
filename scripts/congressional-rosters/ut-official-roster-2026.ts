/**
 * scripts/congressional-rosters/ut-official-roster-2026.ts
 *
 * Utah's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 4 US House districts. Utah has no 2026 US
 * Senate race: Mike Lee's seat (Class 3) was last elected 2022, next up
 * 2028; confirmed both by the 2028-class fact itself and by vote.utah.gov's
 * own 2026 Federal Offices candidate-filing table, which lists ONLY "U.S.
 * House District 1-4" rows and zero "U.S. Senate" rows. Built through the
 * same manual official-source pipeline as Arizona, Texas, Oklahoma, Alabama,
 * Alaska, Colorado, Connecticut, California, Arkansas, Delaware, Florida,
 * Hawaii, Louisiana, Maine, Indiana, Georgia, Iowa, Kansas, Idaho, Maryland,
 * Kentucky, Nebraska, and Missouri, epic c5a813bb; this is Utah's build
 * (card "[P0] Import + verify official roster: Utah (UT)").
 *
 * UTAH-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/utah-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Utah's Lieutenant Governor's Office / Elections Office
 *     (vote.utah.gov) runs its own in-house candidate-filing and
 *     election-results system — a plain WordPress page for the filing
 *     table (with an XLSX download) and a separate JS-rendered results
 *     dashboard (electionresults.utah.gov) for primary/general results.
 *     Both rendered cleanly enough for a plain WebFetch/curl (filing page,
 *     calendar PDF) or light browser automation (results dashboard,
 *     house.gov cross-check) — no 403/bot-wall issues anywhere.
 *   - GENUINELY NOVEL CASE: A COURT-ORDERED MID-DECADE REDISTRICTING
 *     changed all 4 Utah district boundaries for 2026 (a Utah judge struck
 *     down the legislature's map in Aug 2025 for violating a voter-approved
 *     2018 anti-gerrymandering ballot measure; the court-imposed
 *     replacement map, upheld through appeal, creates one Salt Lake
 *     County-centered Democratic-leaning district). As a direct result,
 *     3 of Utah's 4 sitting US Representatives are running in DIFFERENT
 *     district numbers than the ones they currently hold — a materially
 *     different case from an ordinary "incumbent lost renomination" open
 *     seat. `isIncumbent` below is recorded per this fixture's actual 2026
 *     race (i.e., true for the sitting member's NEW 2026 district), cross-
 *     checked against house.gov by NAME, not by matching old-to-new
 *     district numbers (which would be actively wrong given the full
 *     remap) — this mirrors how prior redistricting-affected builds
 *     (CO/GA/FL) resolved incumbency by name rather than district identity.
 *   - Utah's June 23, 2026 primary is held. This fixture reflects the
 *     POST-PRIMARY determined nominee set. Every congressional primary
 *     result showed 100% of localities reporting as of transcription
 *     (2026-07-16); Utah's own official calendar's primary-canvass window
 *     closed July 6, 2026 (i.e., before this fixture's retrieval date) even
 *     though electionresults.utah.gov's page banner still read "UNOFFICIAL
 *     RESULTS" at transcription time — see the data-check doc's calendar
 *     section for why this fixture still treats the primary winners as
 *     determined nominees (same "certified primary winner, no distinct
 *     later SoS document" precedent already documented in
 *     OfficialBallotStatus's own docblock).
 *   - District 4 had NO primary — both parties' nominees were decided
 *     outright at their party conventions (neither party's convention race
 *     produced a top-two split requiring a primary), confirmed by the
 *     absence of any "Primary" status row for District 4 on vote.utah.gov's
 *     candidate-filing table.
 *   - District-by-district determined nominee set, all `Election Candidate`
 *     status (i.e. already-qualified general-ballot filers with no further
 *     stage — either sole party filers, convention nominees who cleared the
 *     60%-of-delegates threshold outright, or unaffiliated/minor-party
 *     signature-path filers) or PRIMARY WINNERS (`Primary` status on the
 *     filing table, confirmed a winner via electionresults.utah.gov):
 *     - UT-01 (new Salt Lake County-centered district, no incumbent
 *       running here): Riley Owen (R, sole convention nominee), Ben McAdams
 *       (D, primary winner, 51.90% / 29,737 votes over Liban Mohamed, Nate
 *       Blouin, Michael Farrell — McAdams previously represented Utah's
 *       OLD 4th District 2019-2021 but is NOT a current sitting US
 *       Representative, confirmed absent from house.gov's current list),
 *       Elias Henry Montgomery (Unaffiliated), Jesse West (Libertarian).
 *     - UT-02: Blake D. Moore (R, sole primary winner, 56.67% / 52,673
 *       votes over Karianne Lisonbee — Moore is the CURRENT sitting US
 *       Representative for Utah's OLD 1st District per house.gov, running
 *       here in the new 2nd District for 2026: isIncumbent true), Peter
 *       Crosby (D, sole convention nominee — the only Democratic filer to
 *       clear convention outright; 3 other Democratic filers were
 *       eliminated in convention), Daniel Cottam (Libertarian), Carlton E.
 *       Bowen (Independent American Party).
 *     - UT-03: Celeste Maloy (R, primary winner, 65.71% / 67,135 votes over
 *       Phil Lyman — Maloy is the CURRENT sitting US Representative for
 *       Utah's OLD 2nd District per house.gov, running here in the new 3rd
 *       District for 2026: isIncumbent true), Kent S. Udell (D, sole
 *       convention nominee), Cassie Easley (Constitution), Adonis Hooslyn
 *       (Unaffiliated), Ayden Scott (Unaffiliated — a second, separate
 *       unaffiliated signature-path filer in the same district; Utah's
 *       unaffiliated-candidacy path is an individual petition process, not
 *       a single-slot nomination, so multiple unaffiliated filers on one
 *       district's general ballot is expected, not a data error), Michael
 *       R. Stoddard (Libertarian).
 *     - UT-04: Mike Kennedy (R, sole convention nominee, no primary needed
 *       — Kennedy is the CURRENT sitting US Representative for Utah's OLD
 *       3rd District per house.gov, running here in the new 4th District
 *       for 2026 after Burgess Owens (the OLD 4th District's sitting
 *       Representative) did not file for re-election: isIncumbent true),
 *       Jonny Larsen (D, sole convention nominee), Steven Burt
 *       (Unaffiliated), Taylor Wright (Libertarian). Burgess Owens does NOT
 *       appear anywhere in Utah's 2026 candidate-filing table for any
 *       office — confirmed a genuine retirement, not a transcription gap.
 *   - "Unaffiliated" (Utah's official filing-table label for a signature-
 *     path independent candidate, Utah Code 20A-9-502) maps to the existing
 *     generic IND code — Utah's own recognized-parties list (8 parties:
 *     Constitution, Democratic, Forward, Green, Independent American,
 *     Libertarian, Peoples' Freedom, Republican) does NOT include
 *     "Unaffiliated" as a party, confirming it is a non-party independent-
 *     candidacy label like TX/OK's IND usage, not a distinct minor party
 *     needing its own code (unlike AK's NPA, which is a voter-registration
 *     status, not a declared candidacy — see NPA's own docblock note).
 *   - Every Democratic, Libertarian, Constitution, and Independent American
 *     Party candidate's status/party/district was transcribed verbatim
 *     from vote.utah.gov's Federal Offices candidate-filing table (last
 *     updated 7/6/2026 4 PM per the page itself, read live 2026-07-16); the
 *     3 contested primary results (UT-01 DEM, UT-02 REP, UT-03 REP) were
 *     read directly off electionresults.utah.gov's per-race result cards
 *     (candidate name, party, percentage, vote count, "Localities
 *     reporting X/X" — all three races showed full reporting).
 *   - INCUMBENCY was cross-checked against house.gov's "By State and
 *     District" member directory (via `claude-in-chrome` browser
 *     automation — scroll-to the Utah section, screenshot the rendered
 *     table; a plain WebFetch/get_page_text does not reliably render this
 *     lazy-loaded table, consistent with every prior state's build using
 *     this same source), never guessed from Utah's own filing table or
 *     this app's FEC-derived `candidates` table. house.gov confirms the
 *     CURRENT (pre-2026-election, old-map) Utah delegation as: Blake Moore
 *     (1st), Celeste Maloy (2nd), Mike Kennedy (3rd), Burgess Owens (4th) —
 *     all four names matched by NAME (not old district number) against
 *     the 2026 candidate-filing table above to determine `isIncumbent` for
 *     each 2026 race, per this fixture's redistricting-handling note above.
 *
 * Sources:
 *   - https://vote.utah.gov/2026-candidate-filings/ (Utah Lieutenant
 *     Governor's Office / Elections Office, "2026 Candidate Filings" —
 *     Federal Offices table, last updated 7/6/2026 4 PM per the page,
 *     retrieved 2026-07-16)
 *   - https://vote.utah.gov/wp-content/uploads/2026/01/Candidate-Filing-2026.xlsx
 *     (same data, downloadable spreadsheet, linked from the page above)
 *   - https://electionresults.utah.gov/results/public/Utah/elections/Primary06232026
 *     (Utah 2026 Primary Election official results dashboard — UT-01 DEM,
 *     UT-02 REP, UT-03 REP US House primary results, retrieved 2026-07-16)
 *   - https://vote.utah.gov/wp-content/uploads/2026/01/2026-Utah-Election-Calendar.pdf
 *     (2026 Utah Election Calendar for Voters & Candidates, State of Utah
 *     Office of the Lieutenant Governor — source for the standing calendar
 *     dates recorded in the data-check doc, retrieved 2026-07-16)
 *   - https://vote.utah.gov/more-information-on-utah-political-parties/
 *     (Utah's 8 officially recognized political parties for 2026,
 *     retrieved 2026-07-16 — used to confirm the UIAP/CST party-code
 *     mapping and that "Unaffiliated" is not itself a recognized party)
 *   - https://www.house.gov/representatives ("By State and District" tab,
 *     Utah section — incumbency cross-check, retrieved 2026-07-16 via
 *     browser automation)
 *
 * Coverage: all 4 US House districts, 19 candidates. No US Senate contest
 * in 2026. Every row is `qualified_for_general_ballot` — Utah's primary is
 * fully decided (all 3 contested primaries at 100% locality reporting) and
 * District 4's convention-only nominations are final; no `runoff_pending`
 * rows (Utah has no runoff mechanism for congressional primaries — SB54's
 * convention/signature system resolves to a single primary, decided by
 * plurality, not a runoff), no `declared_general_ballot_intent` rows (no
 * pending unaffiliated/petition sufficiency review remains open — Utah's
 * unaffiliated-candidate declaration period closed June 16, 2026, before
 * this fixture's retrieval date, and every unaffiliated filer already
 * carries "Election Candidate" status on the official filing table).
 *
 * KNOWN LIMITATIONS:
 *   - electionresults.utah.gov's page banner still read "UNOFFICIAL
 *     RESULTS" as of this fixture's retrieval (2026-07-16), even though
 *     Utah's own official election calendar's primary-canvass window
 *     (June 29 - July 6, 2026) had already closed. This fixture treats the
 *     primary winners as determined per the same precedent already
 *     established in OfficialBallotStatus's own docblock (a certified
 *     election-night/full-reporting result counts as a determined nominee
 *     even absent a separate later "certification" document) — see the
 *     data-check doc for the full reasoning.
 *   - Utah Code 20A-9-202(6) permits a candidate to withdraw "by filing a
 *     written affidavit with the clerk" but does not itself state a
 *     standalone numeric withdrawal deadline distinct from the ballot-
 *     printing timeline; see the data-check doc's calendar-dates section
 *     for how this was handled (the September 16, 2026 UOCAVA
 *     ballot-transmission deadline is used as the practical ballot-content
 *     lock point).
 *   - A dated re-check follow-up card (NOT BEFORE 2026-09-17) has been
 *     opened to reconfirm no late withdrawal occurred before Utah's ballot
 *     content had to be finalized for UOCAVA transmission.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const UT_STATE = "UT";
export const UT_ELECTION_YEAR = 2026;
// Utah's June 23, 2026 primary is held and fully decided (all 3 contested
// primaries at 100% locality reporting); District 4's convention-only
// nominations are also final. Every row below is a determined
// general-ballot nominee, not a primary-stage filer.
export const UT_STAGE = "general" as const;
export const UT_HOUSE_SOURCE_URLS = [
  "https://vote.utah.gov/2026-candidate-filings/",
  "https://electionresults.utah.gov/results/public/Utah/elections/Primary06232026",
];
export const UT_RETRIEVED_AT = "2026-07-16";

export const UT_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — new Salt Lake County-centered district, no incumbent
  // running here (Blake Moore, the sitting rep for OLD District 1, is
  // running in NEW District 2 for 2026 — see below).
  {
    district: "01",
    name: "Riley Owen",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Ben McAdams",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Elias Henry Montgomery",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Jesse West",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — Blake D. Moore (REP, current sitting Rep for Utah's OLD
  // 1st District, running here for 2026 due to redistricting: incumbent).
  {
    district: "02",
    name: "Blake D. Moore",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Peter Crosby",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Daniel Cottam",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Carlton E. Bowen",
    party: "UIAP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Robert M. Moesinger",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Celeste Maloy (REP, current sitting Rep for Utah's OLD
  // 2nd District, running here for 2026 due to redistricting: incumbent).
  {
    district: "03",
    name: "Celeste Maloy",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Kent S. Udell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Cassie Easley",
    party: "CST",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Adonis Hooslyn",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Ayden Scott",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Michael R. Stoddard",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 04 — Mike Kennedy (REP, current sitting Rep for Utah's OLD 3rd
  // District, running here for 2026 due to redistricting: incumbent).
  // Burgess Owens, the OLD 4th District's sitting Rep, did not file for
  // re-election anywhere on the 2026 ballot — a genuine open-seat
  // retirement for the OLD 4th District, but not relevant to this NEW 4th
  // District's own incumbency (Kennedy is the incumbent here).
  {
    district: "04",
    name: "Mike Kennedy",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Jonny Larsen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Steven Burt",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Taylor Wright",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
