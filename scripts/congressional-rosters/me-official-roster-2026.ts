/**
 * scripts/congressional-rosters/me-official-roster-2026.ts
 *
 * Maine's 2026 official congressional roster — hand-transcribed from the
 * Maine Secretary of State's own candidate-list and primary-results
 * documents (not FEC filings). Built through the same manual official-source
 * pipeline as Arizona, Texas, Oklahoma, Alabama, Alaska, Colorado,
 * California, Arkansas, Delaware, and Florida, epic c5a813bb; this is
 * Maine's build.
 *
 * MAINE-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/maine-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Maine's source is a set of static XLSX/PDF files on maine.gov (not
 *     Civix, not a JS portal) — plain HTTP download + parse (openpyxl /
 *     pypdf) works directly, no browser automation needed.
 *   - Maine's June 9, 2026 primary is already PAST at transcription time
 *     (2026-07-15) — unlike AZ/DE's upcoming-primary builds, this is a
 *     GENERAL-stage roster: `ME_STAGE = "general"`. Winners were derived
 *     from the SoS's official per-race primary-results workbooks (raw
 *     municipality-level vote counts), not guessed from the filing list.
 *     Two of the three contested primaries had an outright first-round
 *     majority (Senate DEM: Platner 467,656/648,393 = 72.1%; CD1 REP:
 *     Russell 26,983/50,348 = 53.6%) — summed directly from the results
 *     workbook, no RCV needed. The CD2 DEM primary (4 candidates, no
 *     majority) went to ranked-choice tabulation; the SoS's own
 *     announcement page names Matthew Dunlap the winner after eliminating
 *     Loud then Wood in successive rounds (round-by-round CSV linked below).
 *   - **Jared Golden (D), ME-2's sitting incumbent, did NOT file for
 *     re-election** (publicly announced retirement 2025-11-05, confirmed via
 *     multiple independent news sources — themainemonitor.org, CNN,
 *     rollcall.com — and absent from both the primary filing list and the
 *     GOV filing list). ME-2 has NO incumbent row below, same convention as
 *     AZ-01/AZ-05's open seats (no filer = no row, never inferred).
 *   - **US Senate: the Democratic nominee slot is VACANT, not a
 *     `runoff_pending` two-finalist race.** Graham Platner won the DEM
 *     Senate primary outright (72.1%, no RCV) but formally withdrew via a
 *     signed notice to the Secretary of State on 2026-07-10 — confirmed by
 *     the SoS's own "Candidate Withdrawals and Replacement Candidate
 *     Nominations" document (as of 2026-07-13, no replacement listed yet)
 *     and corroborated by contemporaneous independent reporting (NBC News,
 *     Axios, The Hill, Maine Morning Star). Per 21-A MRS §374-A (quoted in
 *     the SoS's own 2026 Candidate's Guide to Ballot Access), a primary
 *     nominee who withdraws on or before the 2nd Monday in July (July 13,
 *     2026 — Platner's 7/10 withdrawal was inside this window) may be
 *     replaced by the party's committee no later than 5 p.m. on the 4th
 *     Monday in July (**July 27, 2026**); the Maine Democratic Party's
 *     nominating convention is scheduled for July 25, 2026. As of this
 *     fixture's retrieval date, NO replacement has been filed with the SoS
 *     — there is no official candidate record to attach any ballotStatus
 *     to (not even `runoff_pending`, which presumes real filed finalists;
 *     several Democrats have publicly floated bids, per news coverage, but
 *     none is an SoS-filed candidate as of 2026-07-15). Per SAFETY (never
 *     guess an undetermined nomination from partial/unofficial signals),
 *     this fixture carries **no DEM row for the Senate seat** — Susan
 *     Collins (REP, incumbent) is the only determined Senate row below.
 *     See the dated follow-up card (backlog) for the July 28, 2026 recheck
 *     once the party's replacement nominee is officially filed.
 *   - No independent/non-party candidate filed for US Senate or either US
 *     House district this cycle — confirmed by the SoS's official 2026
 *     Non-Party Candidate List (posted 6/2/2026, FINAL; checked for `US`/
 *     `CG` office rows, found none).
 *   - No write-in candidate has filed for the general election as of
 *     transcription time — the filing deadline (August 25, 2026, 5 p.m.,
 *     70 days before the election) is still in the future; no row guessed.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const ME_STATE = "ME";
export const ME_ELECTION_YEAR = 2026;
// The June 9, 2026 primary is already past at transcription time
// (2026-07-15) — every row below is a determined general-ballot nominee
// (derived from official primary-results totals / RCV tabulation), not a
// primary-stage filer list. See the docblock above for the one exception
// (the vacant DEM Senate slot, which has no row at all).
export const ME_STAGE = "general" as const;
export const ME_HOUSE_SOURCE_URLS = [
  // Primary candidate filing list (office/district/party of record).
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Primary%20Candidate%20List%20posting%20FINAL%203.16.26.xlsx",
  // CD1 official primary results, by municipality (DEM uncontested, REP contested).
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dist%201%20FINAL.xlsx",
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dis%201%20REP%20-%20FINAL.xlsx",
  // CD2 official primary results: REP uncontested; DEM required ranked-choice
  // tabulation (4 candidates, no first-round majority).
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/Rep%20to%20Congress%20Dis%202%20REP%20-%20FINAL.xlsx",
  "https://www.maine.gov/sos/news/maine-secretary-states-office-announces-ranked-choice-tabulations",
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026-06-19_02-21-13_summary%20DEMCG2.csv",
  // Confirms no independent/non-party filer for either House district.
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Non-Party%20Candidate%20List-%20FINAL%20posting%206.2.xlsx",
];
export const ME_SENATE_SOURCE_URLS = [
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Primary%20Candidate%20List%20posting%20FINAL%203.16.26.xlsx",
  // Official Senate primary results, by municipality (REP uncontested; DEM
  // contested, Platner won outright with no RCV needed).
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/US%20Senate%20DEM%20-%20FINAL.xlsx",
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/US%20Senate%20REP%20-%20FINAL.xlsx",
  // Post-primary withdrawal record — the SoS document confirming Platner's
  // 7/10/2026 withdrawal (Senate DEM nominee slot now vacant).
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Post%20Primary%20withdrawals%2020260713.pdf",
  // Statutory replacement-nomination deadline (21-A MRS §374-A) + every
  // governing withdrawal/write-in date cited in this fixture's docblock.
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Candidates%20Guide%20to%20Ballot%20Access%20Final.pdf",
  // Confirms no independent/non-party Senate filer.
  "https://www.maine.gov/sos/sites/maine.gov.sos/files/inline-files/2026%20Non-Party%20Candidate%20List-%20FINAL%20posting%206.2.xlsx",
];
export const ME_RETRIEVED_AT = "2026-07-15";

export const ME_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // CD1 — Pingree ran unopposed in the DEM primary (straight to general);
  // incumbent, cross-checked against govtrack.us / congress.gov (pingree
  // .house.gov and clerk.house.gov's MemberData.xml both 403'd this
  // session, same failure mode DE's build hit — see DE's own docblock).
  {
    district: "01",
    name: "Chellie Pingree",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD1 — Russell won the contested REP primary outright (53.6%, no RCV).
  {
    district: "01",
    name: "Ronald C. Russell",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD2 — open seat (Golden did not file for re-election, see docblock).
  // Dunlap won the 4-way DEM primary via ranked-choice tabulation.
  {
    district: "02",
    name: "Matthew Dunlap",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  // CD2 — LePage ran unopposed in the REP primary (straight to general).
  {
    district: "02",
    name: "Paul R. LePage",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const ME_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  // Collins ran unopposed in the REP primary; incumbent, cross-checked
  // against her own senate.gov domain (collins.senate.gov).
  {
    district: null,
    name: "Susan Collins",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  // NO DEMOCRATIC ROW: Platner won the DEM primary outright but withdrew
  // 2026-07-10 (see docblock). The Maine Democratic Party has until 5 p.m.,
  // July 27, 2026 to name a replacement (21-A MRS §374-A) — no candidate has
  // been filed with the SoS as of this fixture's 2026-07-15 retrieval date.
  // Recheck after that date (dated follow-up card) rather than guessing a
  // name from unofficial convention-bid reporting.
];
