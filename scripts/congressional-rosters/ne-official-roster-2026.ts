/**
 * scripts/congressional-rosters/ne-official-roster-2026.ts
 *
 * Nebraska's 2026 official congressional roster for the November 3, 2026
 * general election — covers all 3 US House districts and the 2026 US
 * Senate race (Pete Ricketts's seat, up for a full 6-year term this cycle
 * after he won the 2024 special election to serve the remainder of Ben
 * Sasse's term). Built through the same manual official-source pipeline as
 * Arizona (card 637c2583), Texas (card 8530a468), Oklahoma (card d9b1ef86),
 * Alabama, Alaska, Colorado, Connecticut, California, Arkansas, Delaware,
 * Florida, Hawaii, Louisiana, Maine, and Indiana, epic c5a813bb; this is
 * Nebraska's build (card "[P0] Import + verify official roster: Nebraska
 * (NE)").
 *
 * NEBRASKA-SPECIFIC OPERATIONAL NOTES (see also
 * docs/operations/nebraska-vertical-slice-data-check.md for the full
 * operational-navigation writeup):
 *   - NOT Civix. Nebraska's Secretary of State runs a plain Drupal 10 site
 *     (sos.nebraska.gov) — every source below was fetched with a direct,
 *     non-browser `curl`; no JS-rendered portal was involved anywhere in
 *     this build.
 *   - The "Statewide_Candidate_Filing_List.xlsx" workbook (linked from
 *     `/elections/information-candidates`) has two sheets: "General
 *     Election Candidates" (the certified post-primary nominee list — the
 *     authoritative source for every DETERMINED row below) and "Candidate
 *     Petitions" (independent/nonpartisan petition filers for the GENERAL
 *     ballot whose signature sufficiency is still pending or in-progress —
 *     the source for every `declared_general_ballot_intent` row below).
 *     Nebraska's own per-office PDF candidate-filing forms
 *     (`.../Candidates/US_House_of_Representatives.pdf`,
 *     `.../Candidates/US_Senate.pdf`) are BLANK filing forms, not roster
 *     data — a dead end, not a source, despite being the most obviously-
 *     named links on the page.
 *   - Nebraska's May 12, 2026 primary is fully certified (the 2026 Primary
 *     Canvass Book PDF is published) — every major/minor recognized-party
 *     nomination below is a determined general-ballot nominee, not a
 *     primary-stage filer.
 *   - Nebraska's ballot design is "party office, vote for one" (partisan
 *     federal races) with a SEPARATE "Candidate Petitions" track for
 *     independent/nonpartisan candidates seeking general-ballot access by
 *     petition (Neb. Rev. Stat. §32-617, partisan-office petitions due
 *     Aug 3, 2026). This is a distinct legal track from Nebraska's own
 *     famously-nonpartisan STATE legislature elections — the federal
 *     House/Senate races on this roster are ordinary partisan contests.
 *   - `Party (if applicable)` values transcribed exactly as the SoS's own
 *     spreadsheet labels them: "Republican" → REP, "Democratic" → DEM,
 *     "Libertarian" → LIB, "Legal Marijuana NOW" → LMN (added to types.ts
 *     for this build — a real, state-recognized Nebraska minor party, not a
 *     guess), and "Nonpartisan" (independent petition candidates) → IND
 *     (matches the existing TX/OK precedent for a declared independent
 *     candidacy, not a voter-registration status like AK's NPA).
 *   - **Five petition candidates are still pending as of this fixture's
 *     retrieval date (2026-07-15)** — recorded `declared_general_ballot_intent`,
 *     never promoted to `qualified_for_general_ballot`:
 *     - US Senate: Dan Osborn (Omaha) — status "Pending Verification"
 *       (petition already turned in, signature-sufficiency review underway).
 *     - NE-01: Austin Ahlman (Norfolk) — status "Circulating" (still
 *       gathering signatures, not yet turned in).
 *     - NE-02: Christopher J. Feuerbach (Omaha) — status "Circulating".
 *     - NE-03: Mark Cohen (Lemoyne) and Macey Budke (North Platte) — both
 *       "Circulating".
 *     All five share the same statutory turn-in deadline, August 3, 2026
 *     5 PM (Neb. Rev. Stat. §32-617, partisan-office petition) — see the
 *     data-check doc's governing-dates section. A "Circulating" candidate
 *     may never actually turn in a sufficient petition; this is not guessed
 *     onto the roster as qualified.
 *   - NE-02 is an OPEN SEAT: sitting Republican incumbent Don Bacon did not
 *     file for re-election (confirmed absent from both the "General
 *     Election Candidates" sheet and the "Candidate Petitions" sheet for
 *     District 02) — Brinker Harding (R) is the Republican nominee, and per
 *     the "Incumbency Status" column is explicitly "Nonincumbent". No
 *     incumbent row exists for NE-02.
 *   - INCUMBENCY was cross-checked against two independent official
 *     sources, never guessed from Nebraska's own spreadsheet or this app's
 *     FEC-derived `candidates` table: (1) house.gov's "By State and
 *     District" member directory (fetched directly, isolated to the
 *     `id="state-nebraska"` table section) confirms Mike Flood (NE-01,
 *     R) and Adrian Smith (NE-03, R) as sitting Representatives, and Don
 *     Bacon (NE-02, R) as the sitting Representative who is NOT on this
 *     cycle's roster (open-seat retirement, not an omission); (2)
 *     senate.gov's official Nebraska senators page
 *     (`senate.gov/states/NE/intro.htm`) confirms Pete Ricketts as a
 *     sitting Senator (alongside Deb Fischer, whose Class I seat is not up
 *     in 2026).
 *   - No `runoff_pending` rows — Nebraska's nonpartisan-primary-advance
 *     mechanism applies to state/local races, not to federal partisan
 *     primaries, which are decided by plurality; the May 12, 2026 primary
 *     is fully certified with no runoff mechanism for these contests.
 *
 * Sources:
 *   - https://sos.nebraska.gov/elections/information-candidates (candidate
 *     information landing page, linking the workbook below)
 *   - https://sos.nebraska.gov/sites/default/files/doc/elections/2026/Statewide_Candidate_Filing_List.xlsx
 *     (Nebraska SoS, "General Election Candidates" sheet — determined
 *     nominees — and "Candidate Petitions" sheet — pending independent/
 *     nonpartisan petition filers — downloaded 2026-07-15)
 *   - https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Primary_Canvass_Book.pdf
 *     (2026 Primary Canvass Book — confirms the May 12, 2026 primary is
 *     certified, downloaded 2026-07-15)
 *   - https://sos.nebraska.gov/sites/default/files/doc/elections/2026/2026_Election_Calendar.pdf
 *     (2026 Official Election Calendar, State of Nebraska — source for the
 *     governing dates recorded in the data-check doc, downloaded 2026-07-15)
 *   - https://www.house.gov/representatives (member directory, incumbency
 *     cross-check, retrieved 2026-07-15)
 *   - https://www.senate.gov/states/NE/intro.htm (Nebraska senators page,
 *     incumbency cross-check, retrieved 2026-07-15)
 *
 * Coverage: all 3 US House districts + the 2026 US Senate race. Every
 * major/recognized-minor-party row is `qualified_for_general_ballot`
 * (post-primary certified nominee, or convention/petition-nominated for a
 * recognized minor party). The 5 independent/nonpartisan petition filers
 * are `declared_general_ballot_intent` (signature sufficiency still
 * pending or in progress). No `runoff_pending`, no `write_in_qualified`
 * rows in this fixture — Nebraska's write-in-affidavit deadline (Nov 3
 * general — see data-check doc) had not yet passed at retrieval time and no
 * such affidavits were published anywhere in the sources above.
 *
 * KNOWN LIMITATIONS:
 *   - The 5 `declared_general_ballot_intent` rows are exactly as pending as
 *     the source shows — some ("Circulating") may never turn in a
 *     sufficient petition at all. See the data-check doc's dated re-check
 *     card, opened for the day after Nebraska's August 3, 2026 partisan-
 *     office petition turn-in deadline.
 *   - Nebraska's own primary-nominee withdrawal/decline-nomination deadline
 *     (Neb. Rev. Stat. §32-623) is ALSO August 3, 2026 — a determined
 *     nominee recorded here could still withdraw before that date. See the
 *     data-check doc's calendar-dates section and the same re-check card.
 *   - Full ballot-content lock is Nebraska's Secretary of State general-
 *     election certification deadline, September 11, 2026 (§32-801) — see
 *     the data-check doc.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const NE_STATE = "NE";
export const NE_ELECTION_YEAR = 2026;
// Nebraska's May 12, 2026 primary is fully certified — every determined
// nomination below is a general-ballot nominee, not a primary-stage filer.
export const NE_STAGE = "general" as const;
export const NE_HOUSE_SOURCE_URLS = [
  "https://sos.nebraska.gov/sites/default/files/doc/elections/2026/Statewide_Candidate_Filing_List.xlsx",
  "https://sos.nebraska.gov/elections/information-candidates",
];
export const NE_SENATE_SOURCE_URLS = [
  "https://sos.nebraska.gov/sites/default/files/doc/elections/2026/Statewide_Candidate_Filing_List.xlsx",
  "https://sos.nebraska.gov/elections/information-candidates",
];
export const NE_RETRIEVED_AT = "2026-07-15";

export const NE_HOUSE_ROSTER_2026: OfficialRosterEntry[] = [
  // District 01 — Mike Flood (REP, incumbent)
  {
    district: "01",
    name: "Mike Flood",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Chris Backemeyer",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Nik Sandman",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "01",
    name: "Austin Ahlman",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // District 02 — open seat (incumbent Don Bacon, R, did not file)
  {
    district: "02",
    name: "Brinker Harding",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Denise Powell",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Eric Michael Foreman",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "02",
    name: "Christopher J. Feuerbach",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },

  // District 03 — Adrian Smith (REP, incumbent)
  {
    district: "03",
    name: "Adrian Smith",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Becky Kelly Stille",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "David J. Else",
    party: "LMN",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: "03",
    name: "Mark Cohen",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
  {
    district: "03",
    name: "Macey Budke",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];

export const NE_SENATE_ROSTER_2026: OfficialRosterEntry[] = [
  {
    district: null,
    name: "Pete Ricketts",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Cindy Burbank",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Mike Marvin",
    party: "LMN",
    isIncumbent: false,
    ballotStatus: "qualified_for_general_ballot",
  },
  {
    district: null,
    name: "Dan Osborn",
    party: "IND",
    isIncumbent: false,
    ballotStatus: "declared_general_ballot_intent",
  },
];
