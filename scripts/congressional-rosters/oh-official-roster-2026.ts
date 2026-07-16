/**
 * scripts/congressional-rosters/oh-official-roster-2026.ts
 *
 * Ohio's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 15 US House districts and the 2026 US
 * Senate special election. Built through the same manual official-source
 * pipeline as Arizona, Texas, Oklahoma, and the rest of epic c5a813bb; this
 * is Ohio's build (card "[P0] Import + verify official roster: Ohio (OH)").
 *
 * OHIO-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/ohio-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - OH_STAGE = "general": Ohio's May 5, 2026 primary is already certified
 *     as of this fixture's transcription (2026-07-16) — every major-party
 *     nomination is determined (Ohio has no runoff primary; the primary
 *     winner is automatically the general-election nominee).
 *   - NOT Civix-vended. Ohio has no unified statewide candidate portal at
 *     all — `ohiosos.gov` and `boe.ohio.gov` publish static guidance PDFs
 *     and are both bot-WAF-blocked to non-browser fetches, but neither is
 *     the actual candidate-roster source. Congressional candidates file
 *     with (and are certified by) the Board of Elections of the *most
 *     populous county* touching their district — Ohio's election
 *     administration is genuinely decentralized to its 88 county boards,
 *     each running its own website/CMS. This is a materially different
 *     source shape than every prior state in this track (all of which had
 *     one statewide source, Civix or not).
 *   - Ten of Ohio's fifteen House districts, plus the Senate race, were
 *     confirmed via each anchor county's own official "November 3, 2026
 *     General Election Candidate List" document (Franklin, Stark, Cuyahoga,
 *     Wood, Butler, Lake counties). The other five districts' anchor
 *     counties (Hamilton, Clermont, Union, Licking) had not yet republished
 *     that convenience document at transcription time — several Ohio
 *     counties don't post it until closer to the write-in/withdrawal
 *     deadlines in late August. For those five, the actual authoritative
 *     record used instead is each county's own CERTIFIED MAY 5, 2026
 *     PRIMARY RESULTS (official government vote totals, not news
 *     reporting) — since Ohio has no runoff, the certified primary winner
 *     *is* the November nominee as a matter of law, so a "candidate list
 *     for the general" republication is a convenience document, not the
 *     underlying authority. This mirrors how Oklahoma's build in this same
 *     track derived nominees from certified primary vote totals rather than
 *     waiting for a similar convenience document.
 *   - Per-district and per-office `sourceUrl` provenance is preserved
 *     exactly (not collapsed to one blanket URL) — see `OH_HOUSE_SOURCES`,
 *     `OH_DISTRICT_SOURCE`, and the grouped `OH_HOUSE_ROSTER_<COUNTY>`
 *     exports below. Every DB row this fixture produces cites the specific
 *     county document it was actually transcribed from.
 *   - INCUMBENCY was cross-checked against two official sources, never
 *     guessed from a county filing/results document:
 *     (1) house.gov's "By State and District" directory (Ohio section)
 *     confirms the sitting House delegation: Landsman (OH-1), Taylor
 *     (OH-2), Beatty (OH-3), Jordan (OH-4), Latta (OH-5), Rulli (OH-6),
 *     Miller (OH-7), Davidson (OH-8), Kaptur (OH-9), Turner (OH-10), S.
 *     Brown (OH-11), Balderson (OH-12), Sykes (OH-13), Joyce (OH-14), Carey
 *     (OH-15). All 15 incumbents sought re-election — no open House seats.
 *     (2) husted.senate.gov (Jon Husted's own official Senate page) confirms
 *     Husted is the sitting appointed Senator (appointed January 2025,
 *     filling the seat JD Vance vacated on becoming Vice President);
 *     Husted is himself the Republican nominee to hold the seat through the
 *     rest of the term via this November's special election.
 *   - NAME COLLISION, not a data error: Shontel M. Brown (OH-11
 *     Representative, incumbent, seeking re-election to her House seat) and
 *     Sherrod Brown (the Democratic nominee for the separate Senate special
 *     election) are two different people who happen to share a surname.
 *   - Write-in candidates: three were found already confirmed on an
 *     official county document (Cuyahoga: Thahbia Asad and Andrey Joseph
 *     Martinichin for OH-7; Franklin: Samuel Ronan for OH-15), each marked
 *     `party: null`, `ballotStatus: "write_in_qualified"` — same convention
 *     as AZ/FL/IN/KY/MD. Ohio's write-in declaration-of-intent deadline
 *     (ORC 3513.041 — 72 days before the general, 2026-08-23) is still open
 *     as of this build; additional write-ins could still be added to any of
 *     the 16 races before then — see KNOWN LIMITATIONS and the governing
 *     calendar dates below.
 *   - Independent candidate: Gregory Lee Levy (US Senate) is confirmed via
 *     Butler County's own official candidate/petition-activity document,
 *     marked "(N)" (that county's own non-major-party label — Ohio has no
 *     uniquely-named recognized minor party the way Kentucky or Alaska do;
 *     "(N)"/"Independent"/"Nonparty" all collapse to the existing generic
 *     `IND` code). Ohio's independent-candidate filing deadline (ORC
 *     3513.257 — the day before the primary, 2026-05-04) has already
 *     passed, but whether Butler County had fully verified Levy's
 *     petition-signature count as of this document's publication could not
 *     be confirmed from the official sources read this session — so,
 *     consistent with every prior state's equivalent gap (AZ/TX/OK/…),
 *     Levy is recorded as `declared_general_ballot_intent`, not
 *     `qualified_for_general_ballot`.
 *   - A second self-described independent/write-in Senate candidate,
 *     Stephen Faris, campaigns publicly (his own site,
 *     writeinfaris.com) but does NOT appear on any official county
 *     document read this session (Cuyahoga's official Senate list does not
 *     include him). Per the epic's SAFETY rule against guessing, Faris is
 *     deliberately OMITTED from this fixture — not a data gap, an absence
 *     from every official source checked. Ohio's write-in deadline
 *     (2026-08-23) is still open, so this should be re-checked after that
 *     date; see the dated follow-up card.
 *   - Ohio's own party-label formatting is inconsistent county-to-county in
 *     the source documents themselves (spelled-out "Democratic"/
 *     "Republican"/"Libertarian" in some counties, "DEM"/"REP" or bare
 *     "D"/"R"/"L" abbreviations in others, "(N)"/"Nonparty"/"Nonpartisan
 *     Write-In" for non-major-party filers in others) — normalized here to
 *     this app's existing DEM/REP/LIB/IND codes and `null` for write-ins;
 *     no new `OfficialBallotStatus` party code was needed (unlike AK/CA/FL/
 *     IA/ID/KY, which each added one for a real state-recognized minor
 *     party — Ohio has none among these 16 contests).
 *
 * Sources: see `OH_HOUSE_SOURCES` / `OH_SENATE_SOURCES` below for the exact
 * per-county URLs; also used, cross-check-only (never as primary candidate
 * data):
 *   - https://www.house.gov/representatives (incumbency cross-check only)
 *   - https://www.husted.senate.gov/about/ (Senate incumbency cross-check
 *     only)
 *   - https://codes.ohio.gov/ohio-revised-code/section-3513.257
 *     (independent-candidate filing deadline — already passed)
 *   - https://codes.ohio.gov/ohio-revised-code/section-3513.041 (write-in
 *     declaration-of-intent deadline — still open, 2026-08-23)
 *   - https://codes.ohio.gov/ohio-revised-code/section-3513.30
 *     (candidate-withdrawal deadline — still open, 2026-08-25)
 *   - https://codes.ohio.gov/ohio-revised-code/section-3505.32
 *     (post-election canvass/certification deadline, 2026-11-24 — informs
 *     when *results*, not the candidate set, are locked)
 *
 * Coverage: all 15 US House districts + the US Senate special election.
 *
 * KNOWN LIMITATIONS:
 *   - Ohio's write-in declaration deadline (2026-08-23) and
 *     candidate-withdrawal deadline (2026-08-25) are BOTH still open as of
 *     this build (2026-07-16) — this fixture is not fully locked until
 *     those pass. A dated re-check follow-up card is opened per the epic's
 *     NOT BEFORE convention.
 *   - Stephen Faris's self-described Senate write-in candidacy is not on
 *     any official document read this session — omitted, not guessed; see
 *     above.
 *   - Levy's (Senate, independent) petition-verification status as of
 *     Butler County's document publication is unconfirmed — recorded as
 *     `declared_general_ballot_intent`, same conservative posture as every
 *     prior state's equivalent gap.
 *   - Names are recorded as they appear in each official document; not
 *     independently re-verified against a third document beyond the
 *     incumbency cross-check.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const OH_STATE = "OH";
export const OH_ELECTION_YEAR = 2026;
export const OH_STAGE = "general" as const;
export const OH_RETRIEVED_AT = "2026-07-16";

// Each Ohio congressional district's candidate data was transcribed from
// its own most-populous anchor county's official document — Ohio has no
// unified statewide candidate source (see docblock above).
export const OH_HOUSE_SOURCES = {
  HAMILTON:
    "https://votehamiltoncountyohio.gov/wp-content/uploads/2026/05/Cumulative-FINAL-1.pdf",
  CLERMONT: "https://cms2.revize.com/revize/clermontcounty/OfficialGroupDetail.pdf",
  FRANKLIN:
    "https://vote.franklincountyohio.gov/getmedia/92039866-8eae-4fdc-a638-66ac8631bc70/2026-General-Candidate-List-2",
  UNION:
    "https://www.unioncountyohio.gov/media/Agencies/Board%20of%20Elections/union-election-summary.pdf",
  WOOD: "https://boe.woodcountyohio.gov/DocumentCenter/View/370/Candidate-List-PDF",
  STARK:
    "https://cms7files1.revize.com/starkcountyoh/Document_center/Offices/Board%20of%20Elections/Candidates%20Issues%20&%20Campaign%20Finance%20Information/Candidates%20List%20General.pdf",
  CUYAHOGA:
    "https://boe.cuyahogacounty.gov/docs/default-source/boe/candidates-page/candidate-list.pdf?sfvrsn=4b1792c0_609",
  BUTLER:
    "https://cms2.revize.com/revize/butlercountyboe/2026/November/PetitionActivityReport.pdf",
  LICKING: "https://www.boe.ohio.gov/licking/c/elecres/20260505results.pdf",
  LAKE: "https://wpassets.lakecountyohio.gov/wp-content/uploads/sites/12/2026/07/15095752/2026-Candidate-Filings.pdf",
} as const;

export const OH_HOUSE_SOURCE_URLS = Object.values(OH_HOUSE_SOURCES);

// District -> the county source it was transcribed from, for reference and
// for the deliverable doc's per-district citation.
export const OH_DISTRICT_SOURCE: Record<string, string> = {
  "01": OH_HOUSE_SOURCES.HAMILTON,
  "02": OH_HOUSE_SOURCES.CLERMONT,
  "03": OH_HOUSE_SOURCES.FRANKLIN,
  "04": OH_HOUSE_SOURCES.UNION,
  "05": OH_HOUSE_SOURCES.WOOD,
  "06": OH_HOUSE_SOURCES.STARK,
  "07": OH_HOUSE_SOURCES.CUYAHOGA,
  "08": OH_HOUSE_SOURCES.HAMILTON,
  "09": OH_HOUSE_SOURCES.WOOD,
  "10": OH_HOUSE_SOURCES.BUTLER,
  "11": OH_HOUSE_SOURCES.CUYAHOGA,
  "12": OH_HOUSE_SOURCES.LICKING,
  "13": OH_HOUSE_SOURCES.STARK,
  "14": OH_HOUSE_SOURCES.LAKE,
  "15": OH_HOUSE_SOURCES.FRANKLIN,
};

export const OH_SENATE_SOURCES = {
  CUYAHOGA: OH_HOUSE_SOURCES.CUYAHOGA,
  BUTLER: OH_HOUSE_SOURCES.BUTLER,
} as const;
export const OH_SENATE_SOURCE_URLS = Object.values(OH_SENATE_SOURCES);

// --- House rosters, grouped by source county -------------------------------

// OH-1 (Hamilton County primary results, certified 2026-05-15) + OH-8
// (same document — Hamilton anchors both districts).
export const OH_HOUSE_ROSTER_HAMILTON: OfficialRosterEntry[] = [
  {
    district: "01",
    name: "Greg Landsman",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Eric Conroy",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Warren Davidson",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "08",
    name: "Vanessa Enoch",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-2 (Clermont County primary results, certified 2026-05-20).
export const OH_HOUSE_ROSTER_CLERMONT: OfficialRosterEntry[] = [
  {
    district: "02",
    name: "David J. Taylor",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Jen Mazzuckelli",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-3 + OH-15 (Franklin County's official Nov 2026 General Election
// Candidates document, revised 2026-06-16).
export const OH_HOUSE_ROSTER_FRANKLIN: OfficialRosterEntry[] = [
  {
    district: "03",
    name: "Joyce Beatty",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Cleophus Dulaney",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Mike Carey",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Don Leonard",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Brennan Barrington",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "15",
    name: "Samuel Ronan",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
];

// OH-4 (Union County primary results — both candidates unopposed in their
// party primary, certified as Union County's own "Official Summary
// Report", 2026-05-05).
export const OH_HOUSE_ROSTER_UNION: OfficialRosterEntry[] = [
  {
    district: "04",
    name: "Jim Jordan",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Joshua D. Kolasinski",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-5 + OH-9 (Wood County's official Nov 2026 general candidate list,
// certified 2026-07-06 — Wood County touches both districts).
export const OH_HOUSE_ROSTER_WOOD: OfficialRosterEntry[] = [
  {
    district: "05",
    name: "Bob Latta",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Brian A. Shaver",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "05",
    name: "Michael J. Veloff",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Marcy Kaptur",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Derek Merrin",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "09",
    name: "Matthew Althaus",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-6 + OH-13 (Stark County's official "Candidates List," General
// Election Nov 3 2026, run 2026-06-17 — Stark County touches both
// districts).
export const OH_HOUSE_ROSTER_STARK: OfficialRosterEntry[] = [
  {
    district: "06",
    name: "Michael A. Rulli",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "06",
    name: "Elizabeth Kirtley",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Emilia Sykes",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "13",
    name: "Carey Coleman",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-7 + OH-11 (Cuyahoga County's official Nov 2026 general candidate
// list, dated 2026-06-16 — Cuyahoga County touches both districts).
export const OH_HOUSE_ROSTER_CUYAHOGA: OfficialRosterEntry[] = [
  {
    district: "07",
    name: "Max Miller",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Brian Poindexter",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "07",
    name: "Thahbia Asad",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "07",
    name: "Andrey Joseph Martinichin",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "11",
    name: "Shontel M. Brown",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "11",
    name: "Mike Kirchner",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-10 (Butler County's official "Candidate & Petition Activity" document,
// dated 2026-07-13).
export const OH_HOUSE_ROSTER_BUTLER: OfficialRosterEntry[] = [
  {
    district: "10",
    name: "Mike Turner",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Kristina Knickerbocker",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "10",
    name: "Thomas F. McMasters",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-12 (Licking County primary results — "Licking's Official Canvass,"
// generated 2026-05-13; Republican unopposed in the primary).
export const OH_HOUSE_ROSTER_LICKING: OfficialRosterEntry[] = [
  {
    district: "12",
    name: "Troy Balderson",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "12",
    name: "Jerrad Christian",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// OH-14 (Lake County's official Nov 2026 General Election Candidate List,
// updated 2026-07-15).
export const OH_HOUSE_ROSTER_LAKE: OfficialRosterEntry[] = [
  {
    district: "14",
    name: "David P. Joyce",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "14",
    name: "Maria Jukic",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// Flat convenience export — all 15 House districts, 34 rows total. Kept for
// call sites/tests that want "every OH House row" without caring which
// county sourced it; per-row provenance still lives on each entry's
// district via `OH_DISTRICT_SOURCE`, and each grouped export above is the
// actual source of truth used to register per-county `sourceUrl`s in
// scripts/ingest/official-roster.ts's FIXTURES map.
export const OH_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  ...OH_HOUSE_ROSTER_HAMILTON,
  ...OH_HOUSE_ROSTER_CLERMONT,
  ...OH_HOUSE_ROSTER_FRANKLIN,
  ...OH_HOUSE_ROSTER_UNION,
  ...OH_HOUSE_ROSTER_WOOD,
  ...OH_HOUSE_ROSTER_STARK,
  ...OH_HOUSE_ROSTER_CUYAHOGA,
  ...OH_HOUSE_ROSTER_BUTLER,
  ...OH_HOUSE_ROSTER_LICKING,
  ...OH_HOUSE_ROSTER_LAKE,
];

// --- Senate roster, grouped by source county --------------------------------

// Cuyahoga County's official Nov 2026 general candidate list (same document
// as OH-7/OH-11 above) — the three major-ballot-access Senate candidates.
export const OH_SENATE_ROSTER_CUYAHOGA: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Jon Husted",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Sherrod Brown",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "William B. Redpath",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

// Butler County's own official document is the only official source that
// lists this independent Senate filer.
export const OH_SENATE_ROSTER_BUTLER: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Gregory Lee Levy",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

export const OH_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  ...OH_SENATE_ROSTER_CUYAHOGA,
  ...OH_SENATE_ROSTER_BUTLER,
];
