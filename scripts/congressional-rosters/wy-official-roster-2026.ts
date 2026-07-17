/**
 * scripts/congressional-rosters/wy-official-roster-2026.ts
 *
 * Wyoming's 2026 official congressional roster for the November 3, 2026
 * general election — covers the single at-large US House seat and the 2026
 * US Senate race (Class II). Built through the same manual official-source
 * pipeline as Arizona (card 637c2583), Texas (card 8530a468), Oklahoma
 * (card d9b1ef86), and Alaska (epic c5a813bb); this is Wyoming's build.
 *
 * WYOMING-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/wyoming-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - Wyoming's official candidate source is a single static PDF
 *     (https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf),
 *     NOT Civix — confirmed via a direct HTTP GET (200, Content-Type
 *     application/pdf, Last-Modified 2026-06-30) before assuming any prior
 *     state's pattern applied, per the card's explicit instruction. This
 *     matches the I11 rehearsal's `sourceFormat: "pdf"` /
 *     `parserFamily: "text_pdf"` finding for jurisdiction "WY".
 *   - The PDF is a statewide, all-office 2026 Primary Election Candidate
 *     Roster (24 pages total, one row per candidate across every office —
 *     federal, state, and local). Every page returned extractable native
 *     text via `pypdf` (no page under 50 characters) — no scanned/
 *     image-only pages, so the CT scanned-page-enumeration gotcha does not
 *     apply here. The two federal offices (US SENATOR, US REPRESENTATIVE)
 *     are entirely contained on pages 1-2, grouped by
 *     "<OFFICE> - <PARTY>" section headers.
 *   - This is a PRE-primary roster: Wyoming's 2026 primary is Aug 18, 2026
 *     and had NOT yet occurred as of this fixture's retrieval (2026-07-16).
 *     Wyoming runs a standard closed-primary-per-party system with NO
 *     runoff (unlike Oklahoma) — every filed candidate gets
 *     "qualified_for_primary_ballot", full stop, mirroring Arizona's and
 *     Alaska's own pre-primary builds. Promoting anyone to
 *     "qualified_for_general_ballot" now would be guessing the primary's
 *     outcome, exactly what the plan doc's SAFETY rule forbids.
 *   - BOTH Wyoming federal seats are open in 2026 — no incumbent appears on
 *     either roster, and this was independently cross-checked (never
 *     inferred from the PDF's own layout, which carries no incumbency
 *     marker at all):
 *     (1) US Senate (Class II): sitting Sen. Cynthia Lummis announced
 *         2025-12-19 she will not seek re-election ("I do not have six more
 *         years in me" — Roll Call, NBC News); she does not appear on
 *         either Senate party list.
 *     (2) US House (at-large): sitting Rep. Harriet Hageman is instead a
 *         FILER FOR THE OPEN SENATE SEAT (she appears under "UNITED STATES
 *         SENATOR - REPUBLICAN", not under the House section) — confirmed
 *         directly in this fixture's own source PDF, so no House incumbent
 *         is seeking re-election either.
 *     Cross-checked against senate.gov's "States in the Senate" page
 *     (Wyoming's Class II seat, up in 2026, held by Lummis — retiring, not
 *     filed) and house.gov/representatives ("By State and District" —
 *     Wyoming's at-large seat, Hageman — filed for Senate, not House).
 *     Never sourced from this app's own FEC-derived `candidates` table.
 *   - All 19 federal filers are REP or DEM — no new `party` union code was
 *     needed in types.ts (unlike AK/CA/FL/ID/KY/NE, which each added a
 *     state-specific minor-party code). No minor-party, independent, or
 *     write-in federal filer appears on this roster as of retrieval: minor/
 *     provisional-party candidates have until Aug 17, 2026 and independents
 *     until Aug 24, 2026 to file (per the state's own key-election-dates
 *     calendar, see Sources below) — both deadlines are still in the
 *     future, so the general-ballot roster is not yet complete. This is a
 *     known, explicit gap (see KNOWN LIMITATIONS), not an omission.
 *   - District/office wiring: mirrors Alaska's at-large convention exactly
 *     (races.ts's lookupChallengers zero-pads a numeric district of 0 to
 *     districtKey "00") — every House row uses `district: "00"`, never
 *     null; Senate rows use `district: null` (statewide, no House-style
 *     district key), matching the existing AK/TX/OK Senate rows.
 *   - No candidate withdrawals appear on this roster (the source PDF has a
 *     "Date Withdrawn" column; every federal row's cell was blank).
 *
 * Sources:
 *   - https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf
 *     (Wyoming Secretary of State Elections Division's official 2026
 *     Primary Election Candidate Roster, all offices; "Tuesday, June 30,
 *     2026 - 1:06PM" per-page timestamp footer — the source of record for
 *     this fixture's federal rows, pages 1-2)
 *   - https://sos.wyo.gov/Elections/Docs/2026/2026_Key_Election_Dates.pdf
 *     (Wyoming Secretary of State's official 2026 key election dates —
 *     filing period, primary/general dates, minor-party and independent
 *     candidate deadlines; used for the governing-calendar-dates
 *     deliverable, not for candidate transcription)
 *
 * Coverage: the single at-large US House seat + the US Senate race.
 *
 * KNOWN LIMITATIONS:
 *   - Every row here is "qualified_for_primary_ballot" — the Aug 18, 2026
 *     primary determines each party's nominee per office. This fixture will
 *     need a follow-up update once that primary is certified (see the
 *     epic's own standing NOT-BEFORE-date-gate convention; a dated
 *     follow-up card for this exact re-check is opened alongside this PR).
 *   - No minor-party, independent, or write-in federal filer appears yet —
 *     the Aug 17 (minor/provisional party) and Aug 24 (independent) filing
 *     deadlines are both still in the future as of retrieval. The
 *     general-ballot roster is not complete until after those deadlines
 *     pass; this fixture reflects only the primary-stage filing roster.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const WY_STATE = "WY";
export const WY_ELECTION_YEAR = 2026;
// Wyoming's Aug 18, 2026 primary had not yet occurred at transcription time
// (2026-07-16) — see the docblock's pre-primary note. Every row here is a
// primary-ballot filer.
export const WY_STAGE = "primary" as const;
export const WY_HOUSE_SOURCE_URLS = [
  "https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf",
];
export const WY_SENATE_SOURCE_URLS = [
  "https://sos.wyo.gov/Elections/Docs/2026/2026_WY_Primary_Election_Candidates.pdf",
];
export const WY_RETRIEVED_AT = "2026-07-16";

// Wyoming's US House is a single at-large seat — races.ts's lookupChallengers
// zero-pads a numeric district of 0 to districtKey "00" (mirrors Alaska's
// fixture exactly); every House row uses this district key, never null.
export const WY_HOUSE_DISTRICT = "00";

// Both WY federal seats are open in 2026 (Lummis retiring; Hageman running
// for the open Senate seat instead of House re-election) — see docblock.
export const WY_OPEN_SEAT_DISTRICTS = [WY_HOUSE_DISTRICT];

export const WY_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: WY_HOUSE_DISTRICT,
    name: "BO BITEMAN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "CHUCK GRAY",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "DAVID GIRALT",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "FRANK CHAPMAN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "JILLIAN BALOW",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "KEITH B. GOODENOUGH",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "KEVIN CHRISTENSEN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "REID RASNER",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "RICHARD DODSON",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "STEVE FRIESS",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "ELENA DEL REAL",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: WY_HOUSE_DISTRICT,
    name: "LISA KINNEY",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

export const WY_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "HARRIET HAGEMAN",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "JILL M EDWARDS",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "JIMMY SKOVGARD",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "JOHN HOLTZ",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "SAM MEAD",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "BILLY BENAVIDEZ",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: null,
    name: "JAMES BYRD",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
];
