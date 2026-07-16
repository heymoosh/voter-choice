/**
 * scripts/congressional-rosters/ma-official-roster-2026.ts
 *
 * Massachusetts's 2026 official congressional roster — hand-transcribed from
 * the Secretary of the Commonwealth's (William Francis Galvin) own
 * state-primary candidate-list pages (not FEC filings). Built through the
 * same manual official-source pipeline as Arizona, Texas, Oklahoma, Alabama,
 * Alaska, Colorado, Connecticut, California, Arkansas, Delaware, Florida,
 * Hawaii, and Maine, epic c5a813bb; this is Massachusetts's build.
 *
 * MASSACHUSETTS-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/massachusetts-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Massachusetts's source (sec.state.ma.us) is NOT Civix-vended — plain
 *     static HTML pages, one per party, listing every office/district on one
 *     long page. `curl`/`WebFetch` works directly, no browser automation
 *     needed (same simple-download mechanics as AZ/DE/FL/HI/ME).
 *   - Massachusetts's September 1, 2026 State Primary is still UPCOMING at
 *     transcription time (2026-07-15) — this is a PRIMARY-stage roster,
 *     `MA_STAGE = "primary"`. Every row below is `qualified_for_primary_ballot`,
 *     including every UNOPPOSED candidate — unlike Delaware, whose official
 *     source itself pre-sorts unopposed filers onto a separately-labeled
 *     "general election candidates" page (promoting them there), Massachusetts's
 *     two source pages are both strictly labeled "20XX [Party] State Primary
 *     Candidates" with no equivalent general-ballot pre-sort. Per the SAFETY
 *     rule against inferring a status the official source doesn't itself
 *     assert, no candidate here — opposed or not — is promoted to
 *     `qualified_for_general_ballot` before the primary actually happens.
 *   - Massachusetts has 9 US House districts (all 9 currently Democratic-held)
 *     and 1 US Senate contest in 2026 (Ed Markey's Class II seat) — a
 *     TWO-CHAMBER build, same shape as OK/AL/AR/DE/FL/ME.
 *   - **MA-06 is an OPEN SEAT.** Sitting Representative Seth Moulton (D) is
 *     running for US Senate in 2026 rather than seeking House re-election —
 *     announced 2025-10-15, confirmed independently by Ballotpedia News, NBC
 *     News, CBS News Boston, and Boston Magazine — and, decisively, this is
 *     directly confirmed by the official source itself: Moulton's name does
 *     NOT appear anywhere on the CD6 section of the Democratic primary
 *     candidate list (it appears instead under "Senator in Congress"). No
 *     incumbent row exists for CD6 below — 6 Democratic primary filers and 1
 *     Republican primary filer are recorded instead, none carrying
 *     `isIncumbent: true`.
 *   - **US Senate: this is precisely the contest Moulton's House vacancy
 *     feeds.** Ed Markey (D, incumbent) faces a contested Democratic primary
 *     against Moulton; John Deaton (R) is unopposed in the Republican
 *     primary. Markey's incumbency was cross-checked against his own
 *     senate.gov domain (markey.senate.gov) and confirmed as the Class II
 *     seat up in 2026 (independent corroboration: govtrack.us, Wikipedia,
 *     Ballotpedia race-rating coverage) — never inferred from the filing
 *     list alone.
 *   - **Incumbency cross-check for the other 8 House districts:** each
 *     sitting Democratic Representative (Neal-01, McGovern-02, Trahan-03,
 *     Auchincloss-04, Clark-05, Pressley-07, Lynch-08, Keating-09) was
 *     independently confirmed via Wikipedia's "List of United States
 *     representatives from Massachusetts" AND, for Neal and McGovern
 *     specifically, their own house.gov-subdomain sites (neal.house.gov,
 *     mcgovern.house.gov) reached directly via web search — house.gov's own
 *     "By State and District" directory and govtrack.us both returned HTTP
 *     403 this session, the same failure mode DE's and ME's builds hit.
 *     Never sourced from this app's own FEC-derived `candidates` table.
 *   - **Republicans filed primary candidates in only 6 of 9 House districts**
 *     (03, 04, 06, 08, 09) plus the Senate seat — confirmed directly from the
 *     Republican primary candidate page's own "No Nominations" labels for
 *     districts 01, 02, 05, and 07, not inferred from their absence.
 *   - **No independent/non-party or write-in candidate has an official
 *     record yet.** Massachusetts's own 2026 Candidate's Guide (p.11, "Federal
 *     & Statewide Non-Party Candidates") sets the non-party
 *     nomination-paper-filing deadline with the Secretary of the Commonwealth
 *     at 5 p.m., August 25, 2026 — over five weeks after this fixture's
 *     retrieval date — with an intermediate July 28, 2026 signature-
 *     certification-submission deadline also still in the future. A
 *     secondary/informal source (Ballotpedia) names several declared
 *     independent hopefuls (Shiva Ayyadurai, Nathan Bech, Morgan Dawicki,
 *     Philip Devincentis for Senate; Anthony Celata, Bruce Hunt, Nadia
 *     Milleron for CD1; KC Linardon for CD7), but per the epic's SAFETY rule
 *     (never guess an undetermined filing from a non-official source), none
 *     of them appears as a row here — no official nomination-papers filing
 *     exists for any of them as of 2026-07-15. See the dated follow-up card
 *     for a recheck after the August 25 deadline.
 *   - **New Massachusetts law affecting the post-primary calendar (2025 Mass.
 *     Acts ch. 34):** rewrites the timeline for a party to replace a primary
 *     nominee who withdraws, specifically for the 2026 cycle. Withdrawal-of-
 *     or-objection-to-nomination deadline: noon, Friday, September 4, 2026
 *     (three days after the primary). Replacement-nominee filing deadline:
 *     5 p.m., Tuesday, September 8, 2026. Both dates postdate this fixture's
 *     primary-stage snapshot and are recorded for the dated follow-up card
 *     rather than acted on now (no withdrawal has occurred at transcription
 *     time — the primary itself hasn't happened yet).
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MA_STATE = "MA";
export const MA_ELECTION_YEAR = 2026;
// Massachusetts's September 1, 2026 State Primary is still upcoming at
// transcription time (2026-07-15) — every row below is a primary-stage
// filer, never promoted to a general-ballot status. See the docblock above
// for why this holds even for unopposed candidates.
export const MA_STAGE = "primary" as const;
export const MA_HOUSE_SOURCE_URLS = [
  // 2026 Democratic State Primary Candidates — "Representative in Congress"
  // section, all 9 districts.
  "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/dem-state-primary-candidates2026.htm",
  // 2026 Republican State Primary Candidates — "Representative in Congress"
  // section, all 9 districts (6 have filers, 3 "No Nominations").
  "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/rep-state-primary-candidates2026.htm",
  // Archive index page linking both party lists.
  "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/candidates2026.htm",
  // Official 2026 Candidate's Guide — every governing calendar date cited in
  // this fixture's docblock and the deliverable doc's calendar section.
  "https://www.sec.state.ma.us/divisions/elections/download/getting-on-the-ballot/Candidates-Guide-2026.pdf",
];
export const MA_SENATE_SOURCE_URLS = [
  // Same two party pages — "Senator in Congress" section.
  "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/dem-state-primary-candidates2026.htm",
  "https://www.sec.state.ma.us/divisions/elections/research-and-statistics/rep-state-primary-candidates2026.htm",
  "https://www.sec.state.ma.us/divisions/elections/download/getting-on-the-ballot/Candidates-Guide-2026.pdf",
];
export const MA_RETRIEVED_AT = "2026-07-15";

export const MA_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // ---- District 01 — contested DEM primary, no REP filer ----
  // Incumbent since 1989; cross-checked via Wikipedia's list of MA
  // representatives and neal.house.gov (reached via web search — house.gov's
  // own directory and govtrack.us both 403'd this session).
  {
    district: "01",
    name: "Richard E. Neal",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Jeromie Whalen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 02 — DEM unopposed, no REP filer ----
  // Incumbent since 2013; cross-checked via Wikipedia + mcgovern.house.gov.
  {
    district: "02",
    name: "James P. McGovern",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 03 — DEM unopposed, REP unopposed ----
  // Incumbent since 2019; cross-checked via Wikipedia's list of MA
  // representatives (trahan.house.gov confirmed via web search).
  {
    district: "03",
    name: "Lori Loureiro Trahan",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Gary J. Grossi",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 04 — contested DEM primary, REP unopposed ----
  // Incumbent since 2021; cross-checked via Wikipedia (auchincloss.house.gov
  // confirmed via web search).
  {
    district: "04",
    name: "Jake Auchincloss",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jason Poulos",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Thomas Stalcup",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 05 — contested DEM primary, no REP filer ----
  // Incumbent since 2013, House Democratic Whip; cross-checked via
  // Wikipedia (katherineclark.house.gov confirmed via web search).
  {
    district: "05",
    name: "Katherine M. Clark",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Tarik Samman",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Jonathan Paz",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 06 — OPEN SEAT (see docblock) — contested 6-way DEM
  // primary, REP unopposed. NO incumbent row: sitting Rep. Seth Moulton (D)
  // filed for US Senate instead (see MA_SENATE_ROSTER_2026 below), confirmed
  // both by independent news (Ballotpedia, NBC, CBS, Boston Magazine) and by
  // his name's absence from this district's section of the official filing
  // list itself.
  {
    district: "06",
    name: "Bethany Andres-Beck",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "John A. Beccia, III",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Jamie Belsito",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Dan Koh",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Mariah L. Lancaster",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Tram T. Nguyen",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Micah Quinney Jones",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 07 — DEM unopposed, no REP filer ----
  // Incumbent since 2019; cross-checked via Wikipedia (pressley.house.gov
  // confirmed via web search).
  {
    district: "07",
    name: "Ayanna S. Pressley",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 08 — contested DEM primary, REP unopposed ----
  // Incumbent since 2013; cross-checked via Wikipedia (lynch.house.gov
  // confirmed via web search).
  {
    district: "08",
    name: "Stephen F. Lynch",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Patrick Thomas Roath",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Robert Gerald Burke",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // ---- District 09 — contested DEM primary, REP unopposed ----
  // Incumbent since 2010; cross-checked via Wikipedia (keating.house.gov
  // confirmed via web search).
  {
    district: "09",
    name: "Bill Keating",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Craig Swallow",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "R. Tyler MacAllister",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

export const MA_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Class II seat, incumbent since 2013 (3rd full term if re-elected);
  // cross-checked via his own senate.gov domain (markey.senate.gov) plus
  // independent corroboration (govtrack.us, Wikipedia, Ballotpedia).
  {
    district: null,
    name: "Edward J. Markey",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Sitting CD6 Representative, running for Senate instead of House
  // re-election — see MA_HOUSE_ROSTER_2026's CD6 entries above. NOT the
  // Senate incumbent — isIncumbent is scoped to this specific seat.
  {
    district: null,
    name: "Seth Moulton",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  // Unopposed in the Republican primary.
  {
    district: null,
    name: "John Deaton",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];
