/**
 * scripts/congressional-rosters/ny-official-roster-2026.ts
 *
 * New York's 2026 official congressional roster for the November 3, 2026
 * general election - covers all 26 US House districts. New York has NO
 * 2026 US Senate race (Gillibrand's seat runs to 2031, Schumer's to 2029 -
 * confirmed via web search, neither on this cycle's ballot). Built through
 * the same manual official-source pipeline as AZ/TX/OK/AL/... (epic
 * c5a813bb); this is New York's build (card for "[P0] Import + verify
 * official roster: New York (NY)").
 *
 * See also docs/operations/new-york-vertical-slice-data-check.md for the
 * full operational-navigation writeup.
 *
 * NEW YORK-SPECIFIC OPERATIONAL NOTES:
 *   - New York's official source is NOT Civix-vended (elections.ny.gov /
 *     publicreporting.elections.ny.gov, not *.civixapps.com) - the Civix
 *     playbook does not apply.
 *   - New York's June 23, 2026 primary already happened by build time
 *     (2026-07-16) - every row below is a determined general-ballot
 *     nominee, not a primary-stage filer. New York has NO runoff mechanism
 *     (a contested primary is decided by plurality, confirmed explicitly
 *     for CD-12's 8-candidate field) - no `runoff_pending` status appears
 *     anywhere in this fixture.
 *   - THREE DIFFERENT OFFICIAL SOURCES were needed to cover all 26
 *     districts, because New York's designating-petition filing venue
 *     depends on the district's geography, and no single document covers
 *     every district:
 *       (1) NYS BOE's own "Who Filed" tool
 *           (publicreporting.elections.ny.gov/WhoFiled/WhoFiled), queried
 *           with Election Type=Primary (not General - General only
 *           surfaces independent-body/late filings, not the designating
 *           petitions that determine each party's nominee), covers
 *           districts that cross a county line OUTSIDE New York City's 5
 *           boroughs: CD 2, 3, and 16-26 (13 districts). This is also the
 *           ONLY source that officially confirms New York's electoral
 *           FUSION lines (Conservative / Working Families cross-
 *           endorsements of the same DEM/REP nominee) for those districts.
 *       (2) Suffolk County BOE's own "Who Filed" page
 *           (apps2.suffolkcountyny.gov/boe/documents/2026 Primary - Who
 *           Filed.html) for CD-1, which lies entirely within one county
 *           (Suffolk) and therefore files locally, not with the state.
 *       (3) NYC BOE's "Primary Contest List" PDF
 *           (vote.nyc/page/list-candidates), for the 12 NYC-based
 *           districts (CD 6,7,9,10,11,12,13,14,15) that had a CONTESTED
 *           Democratic primary - this document is a PRIMARY CONTEST LIST,
 *           structurally limited to races with 2+ candidates; it does NOT
 *           list uncontested single-filer races at all (confirmed
 *           empirically: every one of its ~71 contested-race entries has
 *           2+ candidates, zero single-candidate entries exist anywhere in
 *           the 68-page document). It also only covers Manhattan/Bronx/
 *           Brooklyn/Queens/Staten Island Democratic and Bronx/Brooklyn/
 *           Queens Republican sections that actually had a contest that
 *           cycle - no Conservative or Working Families section exists in
 *           it at all (no contested race on those lines anywhere in NYC).
 *   - GENUINE COVERAGE GAP, disclosed rather than guessed around: the
 *     UNCONTESTED nominee in 12 districts (CD 4,5,6,7,8,9,10,11,12,13,14,15
 *     - Driscoll, Marsh, Chou, Rivera, Mizrahi, Anabilah-Azumah, Moore,
 *     Malliotakis, Shinkle, Williams, Hysenaj, Sapaskis, plus Gillen/Meeks/
 *     Jeffries on the Democratic side of 4/5/8) is NOT independently
 *     confirmable against any NY official document located this session -
 *     neither the state "Who Filed" tool (doesn't cover NYC/Nassau-
 *     Suffolk-only districts) nor the NYC BOE Contest List (structurally
 *     excludes uncontested races) surfaces these names. Each was
 *     cross-checked against **multiple independent sources** rather than
 *     a single one: Wikipedia's 2026 NY House elections article (itself
 *     sourced to FEC filings) plus, for the higher-profile races, direct
 *     FEC.gov candidate records and contemporaneous news coverage (e.g.
 *     Caroline Shinkle: FEC ID H6NY12404, confirmed via Patch/West Side
 *     Rag/Newsmax/Fox News reporting as the sole Republican filer in
 *     CD-12; Jennifer Moore: confirmed via FEC.gov's NY-10 2026 race page
 *     and Ballotpedia). This mirrors Connecticut's disclosed
 *     petition-route coverage gap (docs/operations/
 *     connecticut-vertical-slice-data-check.md) - a real, disclosed
 *     document-format limitation, not a guess about a contest OUTCOME
 *     (which the epic's SAFETY rule forbids). See "KNOWN LIMITATIONS"
 *     below and the data-check doc's "Known gaps" section.
 *   - ELECTORAL FUSION: New York allows a candidate to appear on more than
 *     one party's line (e.g. a Republican nominee also carrying the
 *     Conservative Party's line, or a Democratic nominee also carrying
 *     the Working Families line). Per this fixture's schema (one row per
 *     person, keyed on name/district/stage - see types.ts), a fusion
 *     candidate is recorded ONCE under their anchor major-party affiliation
 *     (the party whose primary determined their nomination), with any
 *     confirmed additional ballot line noted in an inline comment - never
 *     as a duplicate row. No NEW party code was needed in types.ts: every
 *     confirmed Conservative/Working Families filing found this session
 *     belongs to a candidate already counted under DEM or REP (no
 *     standalone minor-party-only nominee exists in any of the 26
 *     districts - the two ad-hoc independent-body attempts that WERE
 *     standalone, Gendebien's "Lower Costs Now" (CD-21) and Staton's "The
 *     People's Party" (CD-22) and Sloan's "Upstate" (CD-24), were all
 *     rejected (`Invalid` petition status per NYS BOE's own record) and
 *     are excluded below, not guessed into inclusion).
 *   - INCUMBENCY was cross-checked against house.gov's "By State and
 *     District" directory, never guessed from either filing source or
 *     this app's own FEC-derived `candidates` table. Two sitting members
 *     LOST their own primary and are NOT the 2026 nominee for their seat:
 *     Dan Goldman (CD-10, lost to Brad Lander) and Adriano Espaillat
 *     (CD-13, lost to Darializa Avila Chevalier) - neither appears in this
 *     fixture, and neither surviving nominee is flagged `isIncumbent`
 *     (Lander and Avila Chevalier are not the sitting representative).
 *     Three additional seats are open because the incumbent is not
 *     running at all: CD-7 (Nydia Velázquez retiring), CD-12 (Jerry Nadler
 *     retiring), CD-21 (Elise Stefanik not seeking re-election).
 *   - Independent/minor-party candidates who only "filed paperwork" or are
 *     "declared" per Wikipedia, with no corresponding Valid entry in any
 *     NY official source, are EXCLUDED (not guessed into inclusion):
 *     CD-1 (Maggio, Sorensen), CD-7 (Ghaznavi), CD-8 (Soyoung Kim), CD-12
 *     (Ortiz, Hur, Negron), CD-15 (Duran, Easton - Bronx-filed, could not
 *     be independently confirmed this session), CD-25 (Walton).
 *
 * Sources:
 *   - https://publicreporting.elections.ny.gov/WhoFiled/WhoFiled (NYS BOE
 *     "Who Filed," Election Year=2026, Office Type=Federal, Election
 *     Type=Primary, Office=Representative in Congress - covers CD 2, 3,
 *     16-26; also the source for all confirmed Conservative/Working
 *     Families fusion lines)
 *   - https://nyenr.elections.ny.gov/ (NYS BOE Election Night Reporting -
 *     June 23, 2026 primary results by district/party, used to derive
 *     every contested-primary nominee; also used to enumerate which
 *     districts had a contested Democratic primary at all - CD
 *     1,3,6,7,9,10,11,12,13,14,15,17,21,23,24,25 - since ENR only
 *     populates a district selector for contests that actually occurred)
 *   - https://apps2.suffolkcountyny.gov/boe/documents/2026%20Primary%20-%20Who%20Filed.html
 *     (Suffolk County BOE's own filing list - covers CD-1 completely,
 *     including the Republican/Conservative uncontested lines)
 *   - https://www.vote.nyc/sites/default/files/pdf/candidates/2026/PDF_5_7_2026%204_01_50%20PM_PrimaryContestList.pdf
 *     (NYC BOE's "Primary Contest List," printed 5/7/2026 - confirms every
 *     contested Democratic primary field for the NYC-based districts)
 *   - https://www.house.gov/representatives ("By State and District" -
 *     incumbency cross-check only, not a candidate-roster source)
 *   - https://www.fec.gov/data/candidate/H6NY12404/ and
 *     https://www.fec.gov/data/elections/house/NY/10/2026/ (FEC candidate
 *     records - secondary corroboration for uncontested nominees only,
 *     used because no single NY document covers them; see "GENUINE
 *     COVERAGE GAP" above)
 *
 * Coverage: all 26 US House districts. No US Senate race in 2026.
 *
 * KNOWN LIMITATIONS:
 *   - The uncontested nominee in 12 districts (see "GENUINE COVERAGE GAP"
 *     above) rests on multi-source secondary corroboration (Wikipedia +
 *     FEC.gov + news reporting), not a single NY state/county/city
 *     official document - disclosed explicitly, not guessed.
 *   - New York's candidate-withdrawal deadline (last day to decline a
 *     nomination) is 2026-08-17 - still in the future as of this build's
 *     2026-07-16 retrieval date. A dated re-check follow-up card has been
 *     opened per the epic's "NOT BEFORE DATE-GATE CONVENTION" - see the
 *     data-check doc's "Governing calendar dates" section.
 *   - Names are recorded as they appear in the official filing sources (or,
 *     for the 12 uncontested-nominee districts, as they appear
 *     consistently across FEC.gov and independent news coverage); not
 *     further independently re-verified against a fourth document.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NY_STATE = "NY";
export const NY_OFFICE = "house" as const;
export const NY_ELECTION_YEAR = 2026;
export const NY_STAGE = "general" as const;
export const NY_HOUSE_SOURCE_URLS = [
  "https://publicreporting.elections.ny.gov/WhoFiled/WhoFiled",
  "https://nyenr.elections.ny.gov/",
  "https://apps2.suffolkcountyny.gov/boe/documents/2026%20Primary%20-%20Who%20Filed.html",
  "https://www.vote.nyc/sites/default/files/pdf/candidates/2026/PDF_5_7_2026%204_01_50%20PM_PrimaryContestList.pdf",
];
export const NY_RETRIEVED_AT = "2026-07-16";

// Open seats: the sitting incumbent is not running for re-election at all
// (retiring or seeking other office) - distinct from CD-10/CD-13 below,
// where the incumbent ran and LOST their own primary.
export const NY_OPEN_SEAT_DISTRICTS = ["07", "12", "21"];

// The sitting incumbent lost their own party's June 23 primary and is NOT
// the 2026 nominee for this seat (not an open seat in the retirement
// sense, but also not an incumbent-favorable race): CD-10 (Dan Goldman
// lost to Brad Lander), CD-13 (Adriano Espaillat lost to Darializa Avila
// Chevalier). Neither loser appears in this fixture.
export const NY_INCUMBENT_DEFEATED_IN_PRIMARY_DISTRICTS = ["10", "13"];

export const NY_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // DISTRICT 01 — both parties determined. Suffolk County BOE confirms the
  // full field: Gallant won a 2-candidate Dem primary (59.75%, a third
  // filer, Jacobs, did not appear on the certified primary ballot per
  // ENR's full 561/561-EDs count); LaLota uncontested, also carries the
  // Conservative line (confirmed Valid). No Working Families filing exists
  // for this district at all.
  {
    district: "01",
    name: "Christopher J. Gallant",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Nicholas J. LaLota",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 02 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines plus full fusion: Halpin also carries Working Families,
  // Garbarino also carries Conservative.
  {
    district: "02",
    name: "Patrick Halpin",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Andrew R. Garbarino",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 03 — Suozzi (incumbent) won a 2-candidate Dem primary
  // (78.09%); LiPetri won a 2-candidate Rep primary (80.36%), also carries
  // the Conservative line. A "Common Sense" line reported for Suozzi by
  // Wikipedia (he used it in 2024) is NOT in the state's 2026 filings —
  // excluded.
  {
    district: "03",
    name: "Thomas R. Suozzi",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Michael J. LiPetri Jr",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 04 — Gillen (incumbent) uncontested; Driscoll won a
  // 2-candidate Rep primary (88.76%). See "GENUINE COVERAGE GAP" above for
  // Gillen's and Driscoll's sourcing (no NY document covers this district
  // at all — Nassau County, outside both the state list's and NYC BOE's
  // coverage).
  {
    district: "04",
    name: "Laura Gillen",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Jeanine Driscoll",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 05 — both uncontested (Meeks incumbent). Same coverage-gap
  // note as CD-04.
  {
    district: "05",
    name: "Gregory Meeks",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "George Marsh",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 06 — Meng (incumbent) won a 2-candidate Dem primary
  // (55.72%), confirmed via NYC BOE's Contest List (Queens–Democratic:
  // Meng, Park). Chou (Rep) uncontested — coverage-gap note as above.
  {
    district: "06",
    name: "Grace Meng",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Joseph Chou",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 07 — OPEN SEAT (Velázquez retiring). Valdez won a 4-candidate
  // Dem primary (55.5%, beat Reynoso/Won/Kumar), confirmed via NYC BOE's
  // Contest List (Kings and Queens–Democratic, identical roster both
  // times — the district spans both counties). Rivera (Rep) uncontested —
  // coverage-gap note as above.
  {
    district: "07",
    name: "Claire Valdez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Melvin Rivera",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 08 — both uncontested. Jeffries (incumbent) had one opponent,
  // Ossé, who withdrew before the primary (confirmed absent from NYC BOE's
  // Contest List — zero-candidate districts don't appear in that document
  // at all, consistent with an uncontested race). Mizrahi (Rep) uncontested
  // — coverage-gap note as above.
  {
    district: "08",
    name: "Hakeem Jeffries",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Lewis Mizrahi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 09 — Clarke (incumbent) won a 3-candidate Dem primary
  // (66.38%, beat Goldfarb/Bristol), confirmed via NYC BOE's Contest List
  // (Kings–Democratic). Anabilah-Azumah (Rep) uncontested — coverage-gap
  // note as above.
  {
    district: "09",
    name: "Yvette Clarke",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Joel Anabilah-Azumah",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 10 — sitting incumbent Dan Goldman LOST this primary to Brad
  // Lander (65.30%), confirmed via NYC BOE's Contest List (New York and
  // Kings–Democratic, identical roster both times) and ENR vote totals.
  // Goldman does not appear below; Lander is NOT flagged incumbent (he is
  // not the sitting representative). Moore (Rep) uncontested — coverage-gap
  // note as above.
  {
    district: "10",
    name: "Brad Lander",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Jennifer Moore",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 11 — DeCillis won a 2-candidate Dem primary (57.84%, beat
  // Ziogas, who withdrew but stayed on the ballot), confirmed via NYC
  // BOE's Contest List (Kings and Richmond–Democratic, identical roster
  // both times). Malliotakis (incumbent, Rep) uncontested — coverage-gap
  // note as above. NOTE: NY-11's district lines are subject to an
  // unresolved redistricting lawsuit; SCOTUS stayed the lower-court ruling
  // on 2026-03-02, so the 2026 election proceeds on the current map.
  {
    district: "11",
    name: "Michael DeCillis",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Nicole Malliotakis",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 12 — OPEN SEAT (Nadler retiring). Lasher won an 8-candidate
  // Dem primary by PLURALITY (38.99%, beat Bores 34.82%, Schlossberg
  // 10.73%, + 5 more), confirmed via NYC BOE's Contest List (New
  // York–Democratic, all 8 names match) and ENR (410/410 EDs, full
  // count) — New York has no runoff mechanism, plurality is final under
  // NY law. Shinkle (Rep) uncontested, corroborated via FEC.gov (candidate
  // ID H6NY12404) and independent news coverage (Patch, West Side Rag,
  // Newsmax, Fox News) confirming her as the sole Republican filer.
  {
    district: "12",
    name: "Micah Lasher",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Caroline Shinkle",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 13 — sitting incumbent Adriano Espaillat LOST this primary to
  // Darializa Avila Chevalier (48.60% vs. 45.15%, a 3.45-point margin,
  // full 383/383-EDs count), confirmed via NYC BOE's Contest List (New
  // York and Bronx–Democratic, identical roster both times) and ENR vote
  // totals. Espaillat does not appear below; Avila Chevalier is NOT
  // flagged incumbent. Williams (Rep) uncontested — coverage-gap note as
  // above; a Wikipedia-reported Conservative cross-endorsement for
  // Williams could not be confirmed via any NY official source this
  // session and is excluded.
  {
    district: "13",
    name: "Darializa Avila Chevalier",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: 'Manuel "Jomo" Williams',
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 14 — Ocasio-Cortez (incumbent) won a 3-candidate Dem primary
  // (84.71%, beat Garcia/Dolan), confirmed via NYC BOE's Contest List
  // (Bronx and Queens–Democratic, identical roster both times). Hysenaj
  // (Rep) uncontested — coverage-gap note as above.
  {
    district: "14",
    name: "Alexandria Ocasio-Cortez",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Diamant Hysenaj",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 15 — Torres (incumbent) won a 3-candidate Dem primary
  // (70.80%, beat Blake/Vega), confirmed via NYC BOE's Contest List
  // (Bronx–Democratic). Sapaskis (Rep) uncontested — coverage-gap note as
  // above (this district is wholly within the Bronx, one of NYC's five
  // boroughs, but the NYC BOE Contest List's uncontested-race exclusion
  // still applies). Two additional Wikipedia-reported filers (Duran on a
  // Conservative line, Easton as an independent) could not be confirmed
  // via any NY official source this session and are excluded.
  {
    district: "15",
    name: "Ritchie Torres",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Stylo Sapaskis",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 16 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines. Latimer (incumbent) also carries Working Families. No
  // Conservative filing exists for Cinquemani in this district's state
  // filing record.
  {
    district: "16",
    name: "George S. Latimer",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "16",
    name: "Joseph J. Cinquemani",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 17 — Conley won a 6-candidate Dem primary (beat Davidson/
  // Cappello/Phillips-Staley/Sacks, plus Chatzky who declined the
  // nomination), confirmed via NYS BOE "Who Filed" (Primary) and ENR; also
  // carries the Working Families line (filed as "Caitlin Conley"). Lawler
  // (incumbent, Rep) uncontested, also carries the Conservative line
  // (state record shows one Invalid and one Valid Conservative filing for
  // Lawler — same person, net Valid).
  {
    district: "17",
    name: "Cait Conley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "17",
    name: "Mike Lawler",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 18 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines plus full fusion: Ryan (incumbent) also carries Working
  // Families, Auringer also carries Conservative.
  {
    district: "18",
    name: "Pat Ryan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "18",
    name: "Jackie Mary Auringer",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 19 — Riley (incumbent) uncontested, also carries Working
  // Families. Oberacker won a 2-candidate Rep primary (74.15%, beat
  // Portelli), also carries Conservative. NYS BOE "Who Filed" (Primary)
  // confirms all of the above.
  {
    district: "19",
    name: "Josh Riley",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "19",
    name: "Peter K. Oberacker",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 20 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines plus full fusion: Tonko (incumbent) also carries Working
  // Families, Ambrosio also carries Conservative.
  {
    district: "20",
    name: "Paul D. Tonko",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "20",
    name: "Ralph F. Ambrosio",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 21 — OPEN SEAT (Stefanik not running). Gendebien won a
  // 2-candidate Dem primary (62.38%, beat Amoriell); a separate attempt by
  // Gendebien to also qualify on a self-created "Lower Costs Now"
  // independent-body line was ruled Invalid by NYS BOE and is excluded.
  // Constantino won a 2-candidate Rep primary (58.57%, beat Smullen, whose
  // own attempt at the Conservative line was Declined) and separately,
  // legitimately qualified (Valid) on a self-created "Taxpayer Rights"
  // independent-body line — noted here, not a separate row. A Working
  // Families attempt by a third party (Hewitt) was Declined. All statuses
  // confirmed via NYS BOE "Who Filed" (Primary).
  {
    district: "21",
    name: "Blake Gendebien",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "21",
    name: "Anthony Constantino",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 22 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines plus full fusion: Mannion (incumbent) also carries Working
  // Families, Buller also carries Conservative. A separate independent
  // attempt ("The People's Party," Staton) was ruled Invalid and is
  // excluded.
  {
    district: "22",
    name: "John W. Mannion",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "22",
    name: "Kailee Buller",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 23 — Gies won a 2-candidate Dem primary (68.31%, beat
  // Stocker), also carries Working Families. Langworthy (incumbent, Rep)
  // uncontested, also carries Conservative. NYS BOE "Who Filed" (Primary)
  // confirms all of the above.
  {
    district: "23",
    name: "Aaron Gies",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "23",
    name: "Nicholas A. Langworthy",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 24 — Ellman won a 2-candidate Dem primary (58.85%, beat
  // Kastenbaum), also carries Working Families. Tenney (incumbent, Rep)
  // uncontested, also carries Conservative. A separate independent attempt
  // ("Upstate," Sloan) was ruled Invalid and is excluded. NYS BOE "Who
  // Filed" (Primary) confirms all of the above.
  {
    district: "24",
    name: "Alissa J. Ellman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "24",
    name: "Claudia Tenney",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 25 — Morelle (incumbent) won a 3-candidate Dem primary
  // (62.27%, beat Wilt/Traywick, full 673/673-EDs count), also carries
  // Working Families. McIntyre (Rep) uncontested, also carries
  // Conservative. NYS BOE "Who Filed" (Primary) and ENR confirm all of the
  // above. A Wikipedia-reported independent filer (Walton, "filed
  // paperwork") could not be confirmed via any NY official source this
  // session and is excluded.
  {
    district: "25",
    name: "Joseph D. Morelle",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "25",
    name: "Virginia E. McIntyre",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // DISTRICT 26 — both uncontested; NYS BOE "Who Filed" (Primary) confirms
  // both lines. Kennedy's (incumbent) own attempt to also qualify on the
  // Working Families line was ruled Invalid and is excluded. Hannon also
  // carries Conservative (Valid).
  {
    district: "26",
    name: "Timothy M. Kennedy",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "26",
    name: "Dennis E. Hannon",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
