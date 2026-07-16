/**
 * scripts/congressional-rosters/ms-official-roster-2026.ts
 *
 * Mississippi's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 4 US House districts and the US Senate
 * race (Cindy Hyde-Smith's Class 2 seat is up). Built through the same
 * manual official-source pipeline as Arizona (card 637c2583), Texas (card
 * 8530a468), Oklahoma (card d9b1ef86), Alabama, Alaska, Colorado,
 * Connecticut, California, Arkansas, Delaware, Florida, Hawaii, Maine, and
 * Indiana, epic c5a813bb; this is Mississippi's build (card
 * "[P0] Import + verify official roster: Mississippi (MS)").
 *
 * MISSISSIPPI-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/mississippi-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Mississippi's official source is the Secretary of State's
 *     own static .gov pages/documents (sos.ms.gov) — an ASP.NET candidate-
 *     qualifying-list app plus PDF county-recapitulation results reports.
 *     No JS SPA, no *.civixapps.com portal; the Civix playbook does not
 *     apply here. The site does sit behind a WAF that 403s a bare `curl`/
 *     `WebFetch` request on several pages (including the PDF results
 *     files directly) — a real rendered browser session (Chrome
 *     automation) was required throughout, similar in spirit to (though a
 *     different mechanism from) TX's Civix 403.
 *   - CANDIDATE SET (who qualified) came from the official Candidate
 *     Qualifying List app (sos.ms.gov/content/CandidateQualifying/default.aspx,
 *     rendered via browser — a bare WebFetch of the parent page returns
 *     only the static shell, not the list), which lists every candidate
 *     who filed for the March 10, 2026 federal primary by office/district
 *     and party.
 *   - GENERAL-BALLOT NOMINEES had to be DERIVED from the official county-
 *     by-county "Official Recapitulation, FEDERAL PRIMARY ELECTION" PDF
 *     results reports (one per party, 82 counties each), because
 *     Mississippi's March 10, 2026 primary had already occurred and been
 *     certified by build time (mid-July 2026). These PDFs are
 *     IMAGE/CANVAS-RENDERED (no extractable text layer — confirmed via
 *     both `get_page_text` and a direct `pypdf` attempt on a saved copy),
 *     so results had to be read visually (zoomed screenshots) rather than
 *     parsed as text; each PDF's own printed statewide TOTAL row (present
 *     on the final data page after all 82 counties) was used and spot-
 *     verified by hand-summing one candidate's 82 county cells against it
 *     (Sarah Adlakha, US Senate REP: matched exactly, 30,344).
 *     Mississippi's runoff rule requires an outright majority (>50%) or
 *     the top two advance to an April 7, 2026 runoff; EVERY contested
 *     federal race here cleared 50% outright on March 10, so no
 *     congressional runoff occurred and every nomination is determined —
 *     no `runoff_pending` rows in this fixture.
 *   - Sources for both PDFs:
 *     Republican: https://www.sos.ms.gov/content/documents/elections/2026/republican%20primary%202026.pdf
 *     Democratic: https://www.sos.ms.gov/content/documents/elections/2026/Recap%20report%20Democratic%20Primary%202026.pdf
 *     (the Democratic file's URL is NOT the naive `democratic%20primary%202026.pdf`
 *     guess — it 404s; the real URL was found via the SOS results page's
 *     embedded results link / `read_network_requests` after clicking
 *     through from
 *     https://www.sos.ms.gov/elections-voting/election-results/2026/march-10-2026-democratic-primary-results)
 *   - Statewide primary vote totals for every contested federal race
 *     (winner in bold):
 *       US Senate (R): **Cindy Hyde-Smith** 127,852 (80.8%) vs. Sarah
 *         Adlakha 30,344 (19.2%)
 *       US Senate (D): **Scott Colom** 109,817 (72.9%) vs. Priscilla W.
 *         Till 28,075 (18.6%) vs. Albert R. Littell 12,749 (8.5%)
 *       US House D1 (D): **Cliff Johnson** 18,051 (63.4%) vs. Kelvin Buck
 *         10,426 (36.6%) — D1 (R) Trent Kelly ran unopposed, no primary
 *       US House D2 (R): **Ron Eller** 12,881 (51.1%) vs. Kevin Wilson
 *         12,337 (48.9%) — closest congressional race of the cycle, still
 *         a clean outright majority, no runoff triggered
 *       US House D2 (D): **Bennie G. Thompson** 64,334 (86.4%) vs. Evan
 *         Littleton Turnage 9,249 (12.4%) vs. Pertis Herman Williams III
 *         917 (1.2%)
 *       US House D3 (R): Michael Guest ran unopposed, no primary
 *       US House D3 (D): Michael A. Chiaradio ran unopposed, no primary
 *       US House D4 (R): **Mike Ezell** 39,564 (84.1%) vs. Sawyer Walters
 *         7,484 (15.9%)
 *       US House D4 (D): **Jeffrey Hulum III** 11,046 (57.7%) vs. Paul
 *         James Blackman 5,309 (27.7%) vs. D. Ryan Grover 2,799 (14.6%)
 *   - INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from either MS source or this app's
 *     FEC-derived `candidates` table: house.gov's "By State and District"
 *     member directory (Mississippi section, confirmed 2026-07-15 — Kelly
 *     D1, Thompson D2, Guest D3, Ezell D4, all four the same sitting
 *     member who filed for and won their own party's primary in their own
 *     current district, a clean case like Indiana's, no cross-district
 *     complications) and senate.gov's senator-contact directory (confirmed
 *     Hyde-Smith (R-MS) is the sitting senator for the Class 2 seat up in
 *     2026).
 *   - Libertarian nominees (Johnny Baucom, D1; Erik Kiehle, D3) are
 *     convention-nominated (no LIB primary in Mississippi), recorded
 *     `qualified_for_general_ballot` directly, using the existing generic
 *     `LIB` party code — no new party code needed.
 *   - Independent filers (Ty Pinkins, Senate; Bennie Foster, D2; Carl
 *     Boyanton, D4) qualify directly for the general ballot with no
 *     primary, recorded `qualified_for_general_ballot` using the existing
 *     generic `IND` party code — Mississippi does not have a
 *     state-specific independent designation distinct from generic IND
 *     (unlike AK's NPA/AKP or CA's NPP/PF or FL's LPF/FFP).
 *   - CALENDAR-DATES CHECK (per the plan doc's standing requirement):
 *     the official 2026 Elections Calendar
 *     (sos.ms.gov/sites/default/files/elections/2026%20Elections%20Calendar.pdf
 *     — this one DOES carry a real, `pypdf`-extractable text layer,
 *     unlike the county-recap results PDFs) was searched in full (all 16
 *     pages, case-insensitive, for "withdraw", "declin-", "resign",
 *     "vacanc-", "removed from the ballot") and carries NO candidate-
 *     withdrawal-deadline entry anywhere in the calendar year — a genuine
 *     negative finding, not an omission on this build's part. The
 *     closest ballot-content-lock milestones found: the "General Election
 *     Sample Ballot Deadline" (MSOS publishes the sample Nov. ballot in
 *     SEMS), September 9, 2026, Miss. Code Ann. § 23-15-367(3); and the
 *     statutory absentee-ballot-availability date, September 19, 2026,
 *     Miss. Code Ann. § 23-15-715(b) (the closest MS equivalent to the
 *     ~45-days-before-general UOCAVA milestone other states' calendars
 *     label more explicitly). See the data-check doc for the corresponding
 *     dated re-check card.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const MS_STATE = "MS";
export const MS_ELECTION_YEAR = 2026;
// Mississippi's March 10, 2026 primary is fully certified — every
// congressional nomination cleared an outright majority, no runoff was
// triggered for any federal race, every nomination is determined.
export const MS_STAGE = "general" as const;
export const MS_HOUSE_SOURCE_URLS = [
  "https://www.sos.ms.gov/content/documents/elections/2026/republican%20primary%202026.pdf",
  "https://www.sos.ms.gov/content/documents/elections/2026/Recap%20report%20Democratic%20Primary%202026.pdf",
  "https://sos.ms.gov/content/CandidateQualifying/default.aspx",
];
export const MS_SENATE_SOURCE_URLS = MS_HOUSE_SOURCE_URLS;
export const MS_RETRIEVED_AT = "2026-07-15";

export const MS_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Trent Kelly (REP, incumbent, unopposed primary)
  {
    district: "01",
    name: "Trent Kelly",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Cliff Johnson",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Johnny Baucom",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 02 — Bennie G. Thompson (DEM, incumbent)
  {
    district: "02",
    name: "Ron Eller",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Bennie G. Thompson",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Bennie Foster",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 03 — Michael Guest (REP, incumbent, unopposed primary)
  {
    district: "03",
    name: "Michael Guest",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Michael A. Chiaradio",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Erik Kiehle",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },

  // District 04 — Mike Ezell (REP, incumbent)
  {
    district: "04",
    name: "Mike Ezell",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Jeffrey Hulum III",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "04",
    name: "Carl Boyanton",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];

export const MS_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Cindy Hyde-Smith",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Scott Colom",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Ty Pinkins",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
];
