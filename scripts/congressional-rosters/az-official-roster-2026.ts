/**
 * scripts/congressional-rosters/az-official-roster-2026.ts
 *
 * Arizona's 2026 official congressional roster — hand-transcribed from the
 * Arizona Secretary of State's PDF publications (not FEC filings). This is
 * the source-of-truth fixture for the AZ vertical-slice build (card
 * 637c2583, epic c5a813bb) — the first state built through the corrected
 * official-source pipeline instead of FEC-derived data.
 *
 * Sources (fetched directly from azsos.gov, read as PDF text — no
 * third-party aggregator):
 *   - https://azsos.gov/sites/default/files/docs/2026-Candidate-Nominations-and-Petitions-Filed-0330.pdf
 *     ("Official list of candidates who qualified for the July 21, 2026,
 *     Primary Ballot pending any court-ordered removal, ARS § 16-351.")
 *   - https://azsos.gov/sites/default/files/docs/2026-Primary-Write-In-and-Withdrawn-Candidate-List-0602.pdf
 *     (revised 2026-06-02; adds write-in filers, states zero withdrawn as of
 *     that date)
 *
 * Coverage: 9 US House districts. AZ has 0 US Senate contests in 2026
 * (Gallego's seat runs to 2031, Kelly's to 2029) — no senate rows here.
 *
 * Full verification narrative: docs/operations/arizona-vertical-slice-data-check.md
 *
 * KNOWN LIMITATIONS (see the report's "Residual risks" — carried forward,
 * not resolved by this fixture):
 *   - Several names are surname-only, as captured in the source report's
 *     transcription pass. A production cutover needs a full-name re-check
 *     against the PDF before this governs a real ballot render.
 *   - Write-in filers' party affiliation was not captured in the source
 *     excerpt; recorded here as `party: null` rather than guessed.
 *   - azsos.gov/node/223 ("2026 Challenges and Withdrawal") lists several of
 *     these candidates against lawsuits labeled "Withdrawal," which
 *     conflicts with the 2026-06-02 write-in/withdrawn list's "WITHDRAWN
 *     CANDIDATES: none" (the later, more authoritative document). This
 *     fixture follows the later document and does NOT mark any of them
 *     withdrawn — an open discrepancy, not resolved here.
 */

export type { OfficialBallotStatus, OfficialRosterEntry } from "./types";
import type { OfficialRosterEntry } from "./types";

export const AZ_STATE = "AZ";
export const AZ_OFFICE = "house" as const;
export const AZ_ELECTION_YEAR = 2026;
export const AZ_STAGE = "primary" as const;
export const AZ_SOURCE_URLS = [
  "https://azsos.gov/sites/default/files/docs/2026-Candidate-Nominations-and-Petitions-Filed-0330.pdf",
  "https://azsos.gov/sites/default/files/docs/2026-Primary-Write-In-and-Withdrawn-Candidate-List-0602.pdf",
];
export const AZ_RETRIEVED_AT = "2026-07-15";

export const AZ_OFFICIAL_ROSTER_2026: OfficialRosterEntry[] = [
  // AZ-01 — open seat: Schweikert (incumbent) filed for Governor, not
  // House re-election. Not in this roster => not shown as a 2026 candidate.
  {
    district: "01",
    name: "Weintraub",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "McCartney",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Shah",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Galán-Woods",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Treble",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Gordon",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Redkey",
    party: "GRE",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Ajluni",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Alponte",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Trobough",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Feely",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "01",
    name: "Chaplik",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // AZ-02 — Crane (incumbent, REP)
  {
    district: "02",
    name: "Nez",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Descheenie",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Goodwin",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Crane",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "02",
    name: "Flores",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // AZ-03 — Ansari (incumbent, DEM)
  {
    district: "03",
    name: "Aversa",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Ansari",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "03",
    name: "Glenn",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },
  {
    district: "03",
    name: "Redkey",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // AZ-04 — Stanton (incumbent, DEM)
  {
    district: "04",
    name: "Fillmore",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Benoit",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Stanton",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Newkirk",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Jasser",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "04",
    name: "Davison",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // AZ-05 — open seat: Biggs (incumbent) filed for Governor, not House
  // re-election. Not in this roster => not shown as a 2026 candidate.
  {
    district: "05",
    name: "Lee",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Hualde",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "James",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Bracht",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Lamb",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "05",
    name: "Keenan",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // AZ-06 — Ciscomani (incumbent, REP)
  {
    district: "06",
    name: "Bah",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Mendoza",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Peters",
    party: "LIB",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Ciscomani",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "06",
    name: "Swing",
    party: null,
    isIncumbent: false,
    ballotStatus: "write_in_qualified",
  },

  // AZ-07 — Grijalva (incumbent, DEM)
  {
    district: "07",
    name: "Grijalva",
    party: "DEM",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "07",
    name: "Butierez Sr.",
    party: "REP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // AZ-08 — Hamadeh (incumbent, REP)
  {
    district: "08",
    name: "Martines",
    party: "AIP",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Greene-Placentia",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Keeler",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "08",
    name: "Hamadeh",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },

  // AZ-09 — Gosar (incumbent, REP) — already correct under the current
  // pipeline; included here for completeness / regression coverage.
  {
    district: "09",
    name: "Sterbinsky",
    party: "DEM",
    isIncumbent: false,
    ballotStatus: "qualified_for_primary_ballot",
  },
  {
    district: "09",
    name: "Gosar",
    party: "REP",
    isIncumbent: true,
    ballotStatus: "qualified_for_primary_ballot",
  },
];

/**
 * Districts with no incumbent row in the official roster: the sitting
 * member filed for a different office (Governor, in both cases) and is not
 * a 2026 House candidate for this seat. The render layer must not present
 * them as seeking re-election, even though the seat itself is still up
 * (every House seat is contested every 2 years).
 */
export const AZ_OPEN_SEAT_DISTRICTS = ["01", "05"];
