/**
 * Tests for the official-state-roster reader (officialRoster.ts) and its
 * wiring into lookupChallengers (races.ts). DB mocked — no live Neon
 * connection. Uses the real AZ_OFFICIAL_ROSTER_2026 fixture
 * (scripts/congressional-rosters/az-official-roster-2026.ts) as the source
 * of truth for expected shapes — see
 * docs/operations/arizona-vertical-slice-data-check.md for the full
 * validation this vertical slice is based on.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  getOfficialRoster,
  hasOfficialRoster,
  isIncumbentSeekingReelection,
  officialRosterRowToSeatChallenger,
  type OfficialRosterRow,
} from "./officialRoster";
import { lookupChallengers } from "./races";
import {
  AZ_OFFICIAL_ROSTER_2026,
  AZ_STATE,
  AZ_OFFICE,
  AZ_ELECTION_YEAR,
  AZ_SOURCE_URLS,
  AZ_RETRIEVED_AT,
  type OfficialRosterEntry,
} from "../../../scripts/congressional-rosters/az-official-roster-2026";
import {
  TX_HOUSE_ROSTER_2026,
  TX_SENATE_ROSTER_2026,
  TX_STATE,
  TX_ELECTION_YEAR,
  TX_HOUSE_SOURCE_URLS,
  TX_SENATE_SOURCE_URLS,
  TX_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/tx-official-roster-2026";
import {
  OK_HOUSE_ROSTER_2026,
  OK_SENATE_ROSTER_2026,
  OK_STATE,
  OK_ELECTION_YEAR,
  OK_HOUSE_SOURCE_URLS,
  OK_SENATE_SOURCE_URLS,
  OK_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ok-official-roster-2026";
import {
  AL_HOUSE_ROSTER_2026,
  AL_SENATE_ROSTER_2026,
  AL_STATE,
  AL_ELECTION_YEAR,
  AL_HOUSE_SOURCE_URLS,
  AL_SENATE_SOURCE_URLS,
  AL_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/al-official-roster-2026";
import {
  AK_HOUSE_ROSTER_2026,
  AK_SENATE_ROSTER_2026,
  AK_STATE,
  AK_ELECTION_YEAR,
  AK_HOUSE_DISTRICT,
  AK_HOUSE_SOURCE_URLS,
  AK_SENATE_SOURCE_URLS,
  AK_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ak-official-roster-2026";
import {
  CO_HOUSE_ROSTER_2026,
  CO_SENATE_ROSTER_2026,
  CO_STATE,
  CO_ELECTION_YEAR,
  CO_HOUSE_SOURCE_URLS,
  CO_SENATE_SOURCE_URLS,
  CO_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/co-official-roster-2026";
import {
  CT_HOUSE_ROSTER_2026,
  CT_STATE,
  CT_OFFICE,
  CT_ELECTION_YEAR,
  CT_HOUSE_SOURCE_URLS,
  CT_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ct-official-roster-2026";
import {
  CA_HOUSE_ROSTER_2026,
  CA_STATE,
  CA_ELECTION_YEAR,
  CA_HOUSE_SOURCE_URLS,
  CA_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ca-official-roster-2026";
import {
  AR_HOUSE_ROSTER_2026,
  AR_SENATE_ROSTER_2026,
  AR_STATE,
  AR_ELECTION_YEAR,
  AR_HOUSE_SOURCE_URLS,
  AR_SENATE_SOURCE_URLS,
  AR_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ar-official-roster-2026";
import {
  DE_HOUSE_ROSTER_2026,
  DE_SENATE_ROSTER_2026,
  DE_STATE,
  DE_ELECTION_YEAR,
  DE_HOUSE_DISTRICT,
  DE_HOUSE_SOURCE_URLS,
  DE_SENATE_SOURCE_URLS,
  DE_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/de-official-roster-2026";
import {
  FL_HOUSE_ROSTER_2026,
  FL_SENATE_ROSTER_2026,
  FL_STATE,
  FL_ELECTION_YEAR,
  FL_HOUSE_SOURCE_URLS,
  FL_SENATE_SOURCE_URLS,
  FL_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/fl-official-roster-2026";
import {
  HI_HOUSE_ROSTER_2026,
  HI_STATE,
  HI_ELECTION_YEAR,
  HI_HOUSE_SOURCE_URLS,
  HI_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/hi-official-roster-2026";
import {
  LA_SENATE_ROSTER_2026,
  LA_STATE,
  LA_OFFICE,
  LA_ELECTION_YEAR,
  LA_SENATE_SOURCE_URLS,
  LA_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/la-official-roster-2026";
import {
  ME_HOUSE_ROSTER_2026,
  ME_SENATE_ROSTER_2026,
  ME_STATE,
  ME_ELECTION_YEAR,
  ME_HOUSE_SOURCE_URLS,
  ME_SENATE_SOURCE_URLS,
  ME_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/me-official-roster-2026";
import {
  IN_HOUSE_ROSTER_2026,
  IN_STATE,
  IN_ELECTION_YEAR,
  IN_HOUSE_SOURCE_URLS,
  IN_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/in-official-roster-2026";
import {
  GA_HOUSE_ROSTER_2026,
  GA_SENATE_ROSTER_2026,
  GA_HOUSE_SOURCE_URLS,
  GA_SENATE_SOURCE_URLS,
  GA_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ga-official-roster-2026";
import {
  IA_HOUSE_ROSTER_2026,
  IA_SENATE_ROSTER_2026,
  IA_STATE,
  IA_ELECTION_YEAR,
  IA_HOUSE_SOURCE_URLS,
  IA_SENATE_SOURCE_URLS,
  IA_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ia-official-roster-2026";
import {
  KS_HOUSE_ROSTER_2026,
  KS_SENATE_ROSTER_2026,
  KS_STATE,
  KS_ELECTION_YEAR,
  KS_HOUSE_SOURCE_URLS,
  KS_SENATE_SOURCE_URLS,
  KS_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ks-official-roster-2026";
import {
  ID_HOUSE_ROSTER_2026,
  ID_SENATE_ROSTER_2026,
  ID_STATE,
  ID_ELECTION_YEAR,
  ID_HOUSE_SOURCE_URLS,
  ID_SENATE_SOURCE_URLS,
  ID_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/id-official-roster-2026";
import {
  MD_HOUSE_ROSTER_2026,
  MD_STATE,
  MD_ELECTION_YEAR,
  MD_HOUSE_SOURCE_URLS,
  MD_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/md-official-roster-2026";
import {
  KY_HOUSE_ROSTER_2026,
  KY_SENATE_ROSTER_2026,
  KY_STATE,
  KY_ELECTION_YEAR,
  KY_HOUSE_SOURCE_URLS,
  KY_SENATE_SOURCE_URLS,
  KY_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ky-official-roster-2026";
import {
  NE_HOUSE_ROSTER_2026,
  NE_SENATE_ROSTER_2026,
  NE_STATE,
  NE_ELECTION_YEAR,
  NE_HOUSE_SOURCE_URLS,
  NE_SENATE_SOURCE_URLS,
  NE_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ne-official-roster-2026";
import {
  MO_HOUSE_ROSTER_2026,
  MO_STATE,
  MO_ELECTION_YEAR,
  MO_HOUSE_SOURCE_URLS,
  MO_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/mo-official-roster-2026";
import {
  MN_HOUSE_ROSTER_2026,
  MN_SENATE_ROSTER_2026,
  MN_STATE,
  MN_ELECTION_YEAR,
  MN_HOUSE_SOURCE_URLS,
  MN_SENATE_SOURCE_URLS,
  MN_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/mn-official-roster-2026";
import {
  IL_HOUSE_ROSTER_2026,
  IL_SENATE_ROSTER_2026,
  IL_STATE,
  IL_ELECTION_YEAR,
  IL_HOUSE_SOURCE_URLS,
  IL_SENATE_SOURCE_URLS,
  IL_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/il-official-roster-2026";
import {
  MT_HOUSE_ROSTER_2026,
  MT_SENATE_ROSTER_2026,
  MT_STATE,
  MT_ELECTION_YEAR,
  MT_HOUSE_SOURCE_URLS,
  MT_SENATE_SOURCE_URLS,
  MT_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/mt-official-roster-2026";
import {
  NJ_HOUSE_ROSTER_2026,
  NJ_SENATE_ROSTER_2026,
  NJ_STATE,
  NJ_ELECTION_YEAR,
  NJ_HOUSE_SOURCE_URLS,
  NJ_SENATE_SOURCE_URLS,
  NJ_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/nj-official-roster-2026";
import {
  MS_HOUSE_ROSTER_2026,
  MS_SENATE_ROSTER_2026,
  MS_STATE,
  MS_ELECTION_YEAR,
  MS_HOUSE_SOURCE_URLS,
  MS_SENATE_SOURCE_URLS,
  MS_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/ms-official-roster-2026";
import {
  NC_HOUSE_ROSTER_2026,
  NC_SENATE_ROSTER_2026,
  NC_STATE,
  NC_ELECTION_YEAR,
  NC_HOUSE_SOURCE_URLS,
  NC_SENATE_SOURCE_URLS,
  NC_RETRIEVED_AT,
} from "../../../scripts/congressional-rosters/nc-official-roster-2026";

const mockedGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Shape a fixture entry as a raw DB row (what the officialRosterCandidates
 * table select would return). */
function dbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `az-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: AZ_OFFICE,
    district: entry.district,
    sourceUrl: AZ_SOURCE_URLS[0],
    retrievedAt: AZ_RETRIEVED_AT,
  };
}

const AZ_DB_ROWS = AZ_OFFICIAL_ROSTER_2026.map(dbRow);

/** Same shape as `dbRow`, but for TX entries — office/sourceUrl differ per
 * chamber (TX registers separate house and senate fixtures), and district
 * is nullable for the statewide senate contest. */
function txDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `tx-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? TX_HOUSE_SOURCE_URLS[0] : TX_SENATE_SOURCE_URLS[0],
    retrievedAt: TX_RETRIEVED_AT,
  };
}

const TX_HOUSE_DB_ROWS = TX_HOUSE_ROSTER_2026.map((e, i) =>
  txDbRow(e, i, "house"),
);
const TX_SENATE_DB_ROWS = TX_SENATE_ROSTER_2026.map((e, i) =>
  txDbRow(e, i, "senate"),
);

/** Same shape as `txDbRow`, but for OK entries. */
function okDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ok-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? OK_HOUSE_SOURCE_URLS[0] : OK_SENATE_SOURCE_URLS[0],
    retrievedAt: OK_RETRIEVED_AT,
  };
}

const OK_HOUSE_DB_ROWS = OK_HOUSE_ROSTER_2026.map((e, i) =>
  okDbRow(e, i, "house"),
);
const OK_SENATE_DB_ROWS = OK_SENATE_ROSTER_2026.map((e, i) =>
  okDbRow(e, i, "senate"),
);

/** Same shape as `okDbRow`, but for AL entries. */
function alDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `al-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? AL_HOUSE_SOURCE_URLS[0] : AL_SENATE_SOURCE_URLS[0],
    retrievedAt: AL_RETRIEVED_AT,
  };
}

const AL_HOUSE_DB_ROWS = AL_HOUSE_ROSTER_2026.map((e, i) =>
  alDbRow(e, i, "house"),
);
const AL_SENATE_DB_ROWS = AL_SENATE_ROSTER_2026.map((e, i) =>
  alDbRow(e, i, "senate"),
);

// AL-3, AL-4, AL-5 are unaffected by redistricting — determined winning
// nominee is the sitting incumbent. AL-2, AL-7 are special-primary districts
// whose Democratic incumbent ran unopposed in the special primary (also
// determined). AL-1 (Moore -> Senate) and AL-6 (Palmer, contested pending
// special primary) are exercised separately below.
const AL_INCUMBENT_SAMPLE: Record<string, string> = {
  "02": "Shomari C. Figures",
  "03": "Mike Rogers",
  "04": "Robert B. Aderholt",
  "05": "Dale W. Strong",
  "07": "Terri A. Sewell",
};

/** Same shape as `okDbRow`, but for AK entries — the House side uses
 * district "00" (at-large), never null (see the AK fixture's docblock). */
function akDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ak-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? AK_HOUSE_SOURCE_URLS[0] : AK_SENATE_SOURCE_URLS[0],
    retrievedAt: AK_RETRIEVED_AT,
  };
}

const AK_HOUSE_DB_ROWS = AK_HOUSE_ROSTER_2026.map((e, i) =>
  akDbRow(e, i, "house"),
);
const AK_SENATE_DB_ROWS = AK_SENATE_ROSTER_2026.map((e, i) =>
  akDbRow(e, i, "senate"),
);

/** Same shape as `akDbRow`, but for CO entries. */
function coDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `co-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? CO_HOUSE_SOURCE_URLS[0] : CO_SENATE_SOURCE_URLS[0],
    retrievedAt: CO_RETRIEVED_AT,
  };
}

const CO_HOUSE_DB_ROWS = CO_HOUSE_ROSTER_2026.map((e, i) =>
  coDbRow(e, i, "house"),
);
const CO_SENATE_DB_ROWS = CO_SENATE_ROSTER_2026.map((e, i) =>
  coDbRow(e, i, "senate"),
);

// CO-1 is the only open seat (sitting incumbent Diana DeGette lost her
// primary); every other district's winning nominee is the sitting
// incumbent per house.gov.
const CO_INCUMBENT_SAMPLE: Record<string, string> = {
  "02": "Joe Neguse",
  "03": "Jeff Hurd",
  "04": "Lauren Boebert",
  "05": "Jeff Crank",
  "06": "Jason Crow",
  "07": "Brittany Pettersen",
  "08": "Gabe Evans",
};

/** Same shape as `dbRow`, but for CT entries — house-only, like AZ. */
function ctDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `ct-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: CT_OFFICE,
    district: entry.district,
    sourceUrl: CT_HOUSE_SOURCE_URLS[0],
    retrievedAt: CT_RETRIEVED_AT,
  };
}

const CT_HOUSE_DB_ROWS = CT_HOUSE_ROSTER_2026.map(ctDbRow);

// All 5 CT districts' sitting incumbent (per clerk.house.gov) is running for
// re-election in 2026 — no open seats.
const CT_INCUMBENTS: Record<string, string> = {
  "01": "John B. Larson",
  "02": "Joe Courtney",
  "03": "Rosa L. DeLauro",
  "04": "Jim Himes",
  "05": "Jahana Hayes",
};

/** Same shape as `dbRow`, but for CA entries — house-only fixture, no
 * Senate contest in California's 2026 cycle. */
function caDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `ca-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: "house",
    district: entry.district,
    sourceUrl: CA_HOUSE_SOURCE_URLS[0],
    retrievedAt: CA_RETRIEVED_AT,
  };
}

const CA_HOUSE_DB_ROWS = CA_HOUSE_ROSTER_2026.map(caDbRow);

/** Same shape as `akDbRow`, but for AR entries. */
function arDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ar-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? AR_HOUSE_SOURCE_URLS[0] : AR_SENATE_SOURCE_URLS[0],
    retrievedAt: AR_RETRIEVED_AT,
  };
}

const AR_HOUSE_DB_ROWS = AR_HOUSE_ROSTER_2026.map((e, i) =>
  arDbRow(e, i, "house"),
);
const AR_SENATE_DB_ROWS = AR_SENATE_ROSTER_2026.map((e, i) =>
  arDbRow(e, i, "senate"),
);

// Every AR district's winning nominee is the sitting incumbent — no open
// seats, no pending nominations (see the fixture's docblock).
const AR_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Congressman Rick Crawford",
  "02": "Congressman French Hill",
  "03": "Congressman Steve Womack",
  "04": "Congressman Bruce Westerman",
};

/** Same shape as `akDbRow`, but for DE entries — the House side uses
 * district "00" (at-large), same convention as Alaska. */
function deDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `de-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? DE_HOUSE_SOURCE_URLS[0] : DE_SENATE_SOURCE_URLS[0],
    retrievedAt: DE_RETRIEVED_AT,
  };
}

const DE_HOUSE_DB_ROWS = DE_HOUSE_ROSTER_2026.map((e, i) =>
  deDbRow(e, i, "house"),
);
const DE_SENATE_DB_ROWS = DE_SENATE_ROSTER_2026.map((e, i) =>
  deDbRow(e, i, "senate"),
);

/** Same shape as `arDbRow`, but for FL entries. */
function flDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `fl-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? FL_HOUSE_SOURCE_URLS[0] : FL_SENATE_SOURCE_URLS[0],
    retrievedAt: FL_RETRIEVED_AT,
  };
}

const FL_HOUSE_DB_ROWS = FL_HOUSE_ROSTER_2026.map((e, i) =>
  flDbRow(e, i, "house"),
);
const FL_SENATE_DB_ROWS = FL_SENATE_ROSTER_2026.map((e, i) =>
  flDbRow(e, i, "senate"),
);

/** Same shape as `flDbRow`, but for GA entries. */
function gaDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ga-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? GA_HOUSE_SOURCE_URLS[0] : GA_SENATE_SOURCE_URLS[0],
    retrievedAt: GA_RETRIEVED_AT,
  };
}

const GA_SENATE_DB_ROWS = GA_SENATE_ROSTER_2026.map((e, i) =>
  gaDbRow(e, i, "senate"),
);

// GA districts whose nominee IS a sitting incumbent, per house.gov cross-
// check (see the fixture's docblock). GA-14 (Fuller) is included even though
// the results portal's own primary data omitted his incumbent tag — the
// fixture corrects that, mirroring FL's redistricting-tag corrections.
const GA_INCUMBENT_SAMPLE: Record<string, string> = {
  "02": "Sanford Bishop",
  "03": "Brian Jack",
  "04": 'Henry "Hank" Johnson, Jr.',
  "05": "Nikema Williams",
  "06": "Lucy McBath",
  "07": "Rich McCormick",
  "08": "Austin Scott",
  "09": "Andrew Clyde",
  "12": "Rick W. Allen",
  "14": "Clay Fuller",
};

// GA districts with no incumbent row at all — each an independently-sourced
// open seat/vacancy (see fixture docblock): 01 (Carter ran for Senate), 10
// (Collins ran for Senate), 11 (Loudermilk retiring), 13 (Scott died, seat
// vacant pending a separate July 28, 2026 special election).
const GA_OPEN_SEAT_DISTRICTS = ["01", "10", "11", "13"];

// A sample of FL districts whose winning-so-far nominee IS a sitting
// incumbent, per the fixture's redistricting cross-check (house.gov member
// directory, matched by name not district number — see the fixture's
// docblock). "23" (Frankel) and "25" (Moskowitz) are post-redistricting
// incumbents the portal's own tag omitted; "20" is intentionally excluded
// here (its incumbency is exercised separately below — a genuine
// two-sitting-member primary, Wasserman Schultz true / Cherfilus-McCormick
// false despite the portal's stale tag).
const FL_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Jimmy Patronis",
  "03": "Kat Cammack",
  "04": "Aaron Bean",
  "09": "Darren Soto",
  "10": "Maxwell Alejandro Frost",
  "23": "Lois Frankel",
  "25": "Jared Moskowitz",
  "26": "Mario Diaz-Balart",
  "27": "Maria Elvira Salazar",
  "28": "Carlos A. Gimenez",
};

// FL districts with no incumbent row at all (sitting member retired, ran for
// a different office, or is a namesake match only — see fixture docblock):
// 02 (Dunn), 11 (Webster — Royal Webster in the roster is a different
// person), 16 (Buchanan), 19 (Donalds, running for Governor), 22 (Frankel's
// old seat, no longer contested by her), 24 (Wilson).
const FL_OPEN_SEAT_DISTRICTS = ["02", "11", "16", "19", "22", "24"];

/** Same shape as `ctDbRow`, but for HI entries — house-only, no senate
 * contest exists in 2026 (see the fixture's docblock). */
function hiDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `hi-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: "house" as const,
    district: entry.district,
    sourceUrl: HI_HOUSE_SOURCE_URLS[0],
    retrievedAt: HI_RETRIEVED_AT,
  };
}

const HI_HOUSE_DB_ROWS = HI_HOUSE_ROSTER_2026.map(hiDbRow);

// Both HI districts' winning-so-far nominee (per case.house.gov /
// tokuda.house.gov) is the sitting incumbent — no open seats in 2026.
const HI_INCUMBENTS: Record<string, string> = {
  "01": "Ed Case",
  "02": "Jill N. Tokuda",
};

/** Same shape as `hiDbRow`, but for LA entries — senate-only, no house
 * contest exists in the fixture (Louisiana's Nov 3, 2026 House
 * open-primary qualifying period had not opened at transcription time; see
 * the fixture's docblock). */
function laDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `la-senate-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: LA_OFFICE,
    district: entry.district,
    sourceUrl: LA_SENATE_SOURCE_URLS[0],
    retrievedAt: LA_RETRIEVED_AT,
  };
}

const LA_SENATE_DB_ROWS = LA_SENATE_ROSTER_2026.map(laDbRow);

/** Same shape as `deDbRow`, but for ME entries. */
function meDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `me-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? ME_HOUSE_SOURCE_URLS[0] : ME_SENATE_SOURCE_URLS[0],
    retrievedAt: ME_RETRIEVED_AT,
  };
}

const ME_HOUSE_DB_ROWS = ME_HOUSE_ROSTER_2026.map((e, i) =>
  meDbRow(e, i, "house"),
);
const ME_SENATE_DB_ROWS = ME_SENATE_ROSTER_2026.map((e, i) =>
  meDbRow(e, i, "senate"),
);

// CD1's winning nominee IS the sitting incumbent (Pingree). CD2 is an open
// seat (Golden did not file for re-election) — no incumbent row exists for
// CD2, exercised separately below rather than in this sample.
const ME_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Chellie Pingree",
};

/** Same shape as `hiDbRow`, but for IN entries — house-only, no senate
 * contest exists in 2026 (see the fixture's docblock). */
function inDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `in-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: "house" as const,
    district: entry.district,
    sourceUrl: IN_HOUSE_SOURCE_URLS[0],
    retrievedAt: IN_RETRIEVED_AT,
  };
}

const IN_HOUSE_DB_ROWS = IN_HOUSE_ROSTER_2026.map(inDbRow);

/** Same shape as `okDbRow`, but for NJ entries. */
function njDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `nj-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? NJ_HOUSE_SOURCE_URLS[0] : NJ_SENATE_SOURCE_URLS[0],
    retrievedAt: NJ_RETRIEVED_AT,
  };
}

const NJ_HOUSE_DB_ROWS = NJ_HOUSE_ROSTER_2026.map((e, i) =>
  njDbRow(e, i, "house"),
);
const NJ_SENATE_DB_ROWS = NJ_SENATE_ROSTER_2026.map((e, i) =>
  njDbRow(e, i, "senate"),
);

// NJ-12 is the only open House seat (Watson Coleman not seeking
// re-election); every other district's winning nominee is the sitting
// incumbent (per house.gov, current as of this build).
const NJ_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "DONALD NORCROSS",
  "02": "JEFF VAN DREW",
  "03": "HERB CONAWAY",
  "04": "CHRISTOPHER H. SMITH",
  "05": "JOSH GOTTHEIMER",
  "06": "FRANK PALLONE JR.",
  "07": "THOMAS H. KEAN JR.",
  "08": "ROB MENENDEZ",
  "09": "NELIDA POU",
  "10": "LAMONICA R. MCIVER",
  "11": "ANALILIA MEJIA",
};

// Every one of IN's 9 sitting US Representatives (per house.gov) won their
// own party's primary in the same district they currently hold — no open
// seats, no redistricting complications (see the fixture's docblock).
const IN_INCUMBENTS: Record<string, string> = {
  "01": "Frank J. Mrvan",
  "02": "Rudy Yakym",
  "03": "Marlin A. Stutzman",
  "04": "Jim Baird",
  "05": "Victoria Spartz",
  "06": "Jefferson Shreve",
  "07": "André Carson",
  "08": "Mark Messmer",
  "09": "Erin Houchin",
};

/** Same shape as `okDbRow`, but for IA entries. */
function iaDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ia-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? IA_HOUSE_SOURCE_URLS[0] : IA_SENATE_SOURCE_URLS[0],
    retrievedAt: IA_RETRIEVED_AT,
  };
}

const IA_HOUSE_DB_ROWS = IA_HOUSE_ROSTER_2026.map((e, i) =>
  iaDbRow(e, i, "house"),
);
const IA_SENATE_DB_ROWS = IA_SENATE_ROSTER_2026.map((e, i) =>
  iaDbRow(e, i, "senate"),
);

// IA-1 (Miller-Meeks) and IA-3 (Nunn) are the only non-open districts —
// their winning nominee is the sitting incumbent, per house.gov. IA-2 and
// IA-4 are open seats (exercised separately below), so they're excluded
// from this sample.
const IA_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Mariannette Miller-Meeks",
  "03": "Zach Nunn",
};

/** Same shape as `meDbRow`, but for KS entries. */
function ksDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ks-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? KS_HOUSE_SOURCE_URLS[0] : KS_SENATE_SOURCE_URLS[0],
    retrievedAt: KS_RETRIEVED_AT,
  };
}

const KS_HOUSE_DB_ROWS = KS_HOUSE_ROSTER_2026.map((e, i) =>
  ksDbRow(e, i, "house"),
);
const KS_SENATE_DB_ROWS = KS_SENATE_ROSTER_2026.map((e, i) =>
  ksDbRow(e, i, "senate"),
);

// All 4 KS House seats + the Senate seat have a sitting incumbent seeking
// re-election — no open seats (see the fixture's docblock).
const KS_INCUMBENTS: Record<string, string> = {
  "01": "Tracey Mann",
  "02": "Derek Schmidt",
  "03": "Sharice L. Davids",
  "04": "Ron Estes",
};

/** Same shape as `flDbRow`, but for ID entries. */
function idDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `id-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? ID_HOUSE_SOURCE_URLS[0] : ID_SENATE_SOURCE_URLS[0],
    retrievedAt: ID_RETRIEVED_AT,
  };
}

const ID_HOUSE_DB_ROWS = ID_HOUSE_ROSTER_2026.map((e, i) =>
  idDbRow(e, i, "house"),
);
const ID_SENATE_DB_ROWS = ID_SENATE_ROSTER_2026.map((e, i) =>
  idDbRow(e, i, "senate"),
);

// Both ID House districts' winning nominee is the sitting incumbent —
// Idaho's May 19, 2026 primary is certified with no open congressional
// seats this cycle.
const ID_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Russ Fulcher",
  "02": "Mike Simpson",
};

/** Same shape as `hiDbRow`, but for MD entries — house-only, no senate
 * contest exists in 2026 (see the fixture's docblock). */
function mdDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `md-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: "house" as const,
    district: entry.district,
    sourceUrl: MD_HOUSE_SOURCE_URLS[0],
    retrievedAt: MD_RETRIEVED_AT,
  };
}

const MD_HOUSE_DB_ROWS = MD_HOUSE_ROSTER_2026.map(mdDbRow);

// CD5 is Maryland's only open seat in 2026 (incumbent Steny Hoyer not
// seeking re-election — see fixture docblock); every other district's
// nominee is the sitting incumbent per house.gov.
const MD_INCUMBENTS: Record<string, string> = {
  "01": "Andy Harris",
  "02": 'John "Johnny O" Olszewski, Jr.',
  "03": "Sarah Elfreth",
  "04": "Glenn F. Ivey",
  "06": "April McClain Delaney",
  "07": "Kweisi Mfume",
  "08": "Jamie Raskin",
};

/** Same shape as `arDbRow`, but for KY entries. */
function kyDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ky-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? KY_HOUSE_SOURCE_URLS[0] : KY_SENATE_SOURCE_URLS[0],
    retrievedAt: KY_RETRIEVED_AT,
  };
}

const KY_HOUSE_DB_ROWS = KY_HOUSE_ROSTER_2026.map((e, i) =>
  kyDbRow(e, i, "house"),
);
const KY_SENATE_DB_ROWS = KY_SENATE_ROSTER_2026.map((e, i) =>
  kyDbRow(e, i, "senate"),
);

// KY-4 and KY-6 are open seats (Massie lost his own primary; Barr filed
// for Senate instead of re-election) — the other 4 districts' winning
// nominee is the sitting incumbent. No incumbent Senator (McConnell not
// seeking re-election).
const KY_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "James R. Comer",
  "02": "S. Brett Guthrie",
  "03": "Morgan McGarvey",
  "05": "Hal Rogers",
};

/** Same shape as `meDbRow`, but for NE entries (house + senate both
 * covered — see the fixture's docblock). */
function neDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ne-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? NE_HOUSE_SOURCE_URLS[0] : NE_SENATE_SOURCE_URLS[0],
    retrievedAt: NE_RETRIEVED_AT,
  };
}

const NE_HOUSE_DB_ROWS = NE_HOUSE_ROSTER_2026.map((e, i) =>
  neDbRow(e, i, "house"),
);
const NE_SENATE_DB_ROWS = NE_SENATE_ROSTER_2026.map((e, i) =>
  neDbRow(e, i, "senate"),
);

// NE-01 (Flood) and NE-03 (Smith) are held by the sitting incumbent who won
// their own party's primary. NE-02 is an open seat (Bacon did not file) —
// no incumbent row exists for NE-02, exercised separately below.
const NE_INCUMBENTS: Record<string, string> = {
  "01": "Mike Flood",
  "03": "Adrian Smith",
};

/** Same shape as `inDbRow`, but for MO entries — house-only, no senate
 * contest exists in 2026 (see the fixture's docblock). */
function moDbRow(entry: OfficialRosterEntry, idx: number) {
  return {
    id: `mo-${entry.district}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office: "house" as const,
    district: entry.district,
    sourceUrl: MO_HOUSE_SOURCE_URLS[0],
    retrievedAt: MO_RETRIEVED_AT,
  };
}

const MO_HOUSE_DB_ROWS = MO_HOUSE_ROSTER_2026.map(moDbRow);

// Per house.gov, cross-checked against the SOS's active + withdrawn
// candidate lists (see the fixture's docblock). District 06 has NO
// incumbent row — Sam Graves (the sitting rep) withdrew his 2026
// candidacy, making it an open seat; exercised separately below.
const MO_INCUMBENTS: Record<string, string> = {
  "01": "Wesley Bell",
  "02": "Ann Wagner",
  "03": "Bob Onder",
  "04": "Mark Alford",
  "05": "Emanuel Cleaver, II",
  "07": "Eric W. Burlison",
  "08": "Jason T. Smith",
};

const MO_OPEN_SEAT_DISTRICTS = ["06"];

function mnDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `mn-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? MN_HOUSE_SOURCE_URLS[0] : MN_SENATE_SOURCE_URLS[0],
    retrievedAt: MN_RETRIEVED_AT,
  };
}

const MN_HOUSE_DB_ROWS = MN_HOUSE_ROSTER_2026.map((e, i) =>
  mnDbRow(e, i, "house"),
);
const MN_SENATE_DB_ROWS = MN_SENATE_ROSTER_2026.map((e, i) =>
  mnDbRow(e, i, "senate"),
);

// MN-02 is the only open House seat (Craig filed for Senate instead of
// re-election); every other district's sitting incumbent filed in the same
// district per Congress.gov's 119th Congress member list.
const MN_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Brad Finstad",
  "03": "Kelly Morrison",
  "04": "Betty McCollum",
  "05": "Ilhan Omar",
  "06": "Tom Emmer",
  "07": "Michelle Fischbach",
  "08": "Pete Stauber",
};
/** Same shape as `flDbRow`, but for IL entries. */
function ilDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `il-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? IL_HOUSE_SOURCE_URLS[0] : IL_SENATE_SOURCE_URLS[0],
    retrievedAt: IL_RETRIEVED_AT,
  };
}

const IL_HOUSE_DB_ROWS = IL_HOUSE_ROSTER_2026.map((e, i) =>
  ilDbRow(e, i, "house"),
);
const IL_SENATE_DB_ROWS = IL_SENATE_ROSTER_2026.map((e, i) =>
  ilDbRow(e, i, "senate"),
);

// The 12 IL districts whose 2026 nominee is a sitting incumbent, cross-
// checked by full name against house.gov (see fixture docblock).
const IL_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Jonathan L. Jackson",
  "03": "Delia Ramirez",
  "05": "Mike Quigley",
  "06": "Sean Casten",
  "10": "Brad Schneider",
  "11": "Bill Foster",
  "12": "Mike Bost",
  "13": "Nikki Budzinski",
  "14": "Lauren Underwood",
  "15": "Mary E. Miller",
  "16": "Darin LaHood",
  "17": "Eric Sorensen",
};

// IL districts with no incumbent row at all — sitting member is not on the
// 2026 ballot for any federal office (see fixture docblock): 02 (Kelly), 04
// (García), 07 (Davis), 08 (Krishnamoorthi), 09 (Schakowsky).
const IL_OPEN_SEAT_DISTRICTS = ["02", "04", "07", "08", "09"];
/** Same shape as `inDbRow`, but for MT entries — office/sourceUrl differ per
 * chamber (MT registers separate house and senate fixtures), and district
 * is nullable for the statewide senate contest. */
function mtDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `mt-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? MT_HOUSE_SOURCE_URLS[0] : MT_SENATE_SOURCE_URLS[0],
    retrievedAt: MT_RETRIEVED_AT,
  };
}

const MT_HOUSE_DB_ROWS = MT_HOUSE_ROSTER_2026.map((e, i) =>
  mtDbRow(e, i, "house"),
);
const MT_SENATE_DB_ROWS = MT_SENATE_ROSTER_2026.map((e, i) =>
  mtDbRow(e, i, "senate"),
);

// MT-02 is the only House district with a defending incumbent (Troy
// Downing, sole Republican primary filer). MT-01 (Zinke retired) and the
// Senate seat (Daines withdrew) are both open — exercised separately below.
const MT_INCUMBENT_SAMPLE: Record<string, string> = {
  "02": "Troy Downing",
};

/** Same shape as `meDbRow`, but for MS entries — both chambers covered. */
function msDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `ms-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? MS_HOUSE_SOURCE_URLS[0] : MS_SENATE_SOURCE_URLS[0],
    retrievedAt: MS_RETRIEVED_AT,
  };
}

const MS_HOUSE_DB_ROWS = MS_HOUSE_ROSTER_2026.map((e, i) =>
  msDbRow(e, i, "house"),
);
const MS_SENATE_DB_ROWS = MS_SENATE_ROSTER_2026.map((e, i) =>
  msDbRow(e, i, "senate"),
);

// Every one of MS's 4 sitting US Representatives (per house.gov) and the
// sitting senator (per senate.gov) won their own party's primary in the
// same seat they currently hold — no open seats, no redistricting
// complications (see the fixture's docblock).
const MS_INCUMBENTS: Record<string, string> = {
  "01": "Trent Kelly",
  "02": "Bennie G. Thompson",
  "03": "Michael Guest",
  "04": "Mike Ezell",
};

/** Same shape as `kyDbRow`, but for NC entries. */
function ncDbRow(
  entry: OfficialRosterEntry,
  idx: number,
  office: "house" | "senate",
) {
  return {
    id: `nc-${entry.district ?? "senate"}-${idx}`,
    name: entry.name,
    party: entry.party,
    isIncumbent: entry.isIncumbent,
    ballotStatus: entry.ballotStatus,
    office,
    district: entry.district,
    sourceUrl:
      office === "house" ? NC_HOUSE_SOURCE_URLS[0] : NC_SENATE_SOURCE_URLS[0],
    retrievedAt: NC_RETRIEVED_AT,
  };
}

const NC_HOUSE_DB_ROWS = NC_HOUSE_ROSTER_2026.map((e, i) =>
  ncDbRow(e, i, "house"),
);
const NC_SENATE_DB_ROWS = NC_SENATE_ROSTER_2026.map((e, i) =>
  ncDbRow(e, i, "senate"),
);

// No open US House seat in North Carolina this cycle — all 14 sitting
// representatives filed for re-election and are their district's winning
// nominee. No incumbent Senator (Tillis not seeking re-election).
const NC_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "Don Davis",
  "03": "Greg Murphy",
  "05": "Virginia Foxx",
  "09": "Richard Hudson",
  "12": "Alma S. Adams",
  "14": "Tim Moore",
};

// OK-1 is the only open House seat (Hern filed for Senate instead of
// re-election); the other 4 districts' winning nominee is the sitting
// incumbent.
const OK_INCUMBENT_SAMPLE: Record<string, string> = {
  "02": "JOSH BRECHEEN",
  "03": "FRANK D. LUCAS",
  "04": "TOM COLE",
  "05": "STEPHANIE BICE",
};

// TX districts where the sitting incumbent (per house.gov) is NOT among the
// 2026 general nominees for either party — the "not on the 2026 ballot"
// case. TX-23 is a separate vacancy (no incumbent to check at all).
const TX_OPEN_SEAT_TEST_DISTRICTS = [
  "02",
  "08",
  "09",
  "10",
  "19",
  "21",
  "30",
  "32",
  "33",
  "35",
  "37",
  "38",
];

// A sample of TX districts whose winning nominee IS the sitting incumbent —
// paired with the incumbent's full nominee-roster name for the
// isIncumbentSeekingReelection cross-check.
const TX_INCUMBENT_SAMPLE: Record<string, string> = {
  "01": "NATHANIEL MORAN",
  "07": "LIZZIE PANNILL FLETCHER",
  "18": "CHRISTIAN DASHAUN MENEFEE",
  "28": "HENRY CUELLAR",
};

/** A single-call db mock: one .where() resolving to `rows`. */
function makeDbMock(rows: unknown[]) {
  const chain = { from: vi.fn(), where: vi.fn().mockResolvedValue(rows) };
  chain.from.mockReturnValue(chain);
  const select = vi.fn().mockReturnValue(chain);
  return { select } as unknown as ReturnType<typeof getDb>;
}

/** A multi-call db mock: successive .where() calls resolve to
 * `resolvedValues[0]`, `[1]`, ... in order — for tests that exercise
 * lookupChallengers, which issues its DB calls in a fixed, deterministic
 * order (official house, then official senate, then FEC fallback). */
function makeSequencedDbMock(resolvedValues: unknown[][]) {
  const where = vi.fn();
  for (const v of resolvedValues) where.mockResolvedValueOnce(v);
  const chain = { from: vi.fn(), where };
  chain.from.mockReturnValue(chain);
  const select = vi.fn().mockReturnValue(chain);
  return { select, __chain: chain } as unknown as ReturnType<typeof getDb> & {
    __chain: typeof chain;
  };
}

const EXPECTED_NON_INCUMBENT_COUNTS: Record<string, number> = {
  "01": 12,
  "02": 4,
  "03": 3,
  "04": 5,
  "05": 6,
  "06": 4,
  "07": 1,
  "08": 3,
  "09": 1,
};

const AZ_INCUMBENTS: Record<string, string | null> = {
  "01": null, // open seat — Schweikert filed for Governor
  "02": "Crane",
  "03": "Ansari",
  "04": "Stanton",
  "05": null, // open seat — Biggs filed for Governor
  "06": "Ciscomani",
  "07": "Grijalva",
  "08": "Hamadeh",
  "09": "Gosar",
};

// ---------------------------------------------------------------------------
// getOfficialRoster
// ---------------------------------------------------------------------------

describe("getOfficialRoster", () => {
  it("returns empty when the DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await getOfficialRoster(
      AZ_STATE,
      AZ_OFFICE,
      "01",
      AZ_ELECTION_YEAR,
    );
    expect(out).toEqual([]);
  });

  it("narrows to the exact (office, district) contest for each of the 9 AZ districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AZ_DB_ROWS));
    for (const district of Object.keys(EXPECTED_NON_INCUMBENT_COUNTS)) {
      const out = await getOfficialRoster(
        AZ_STATE,
        AZ_OFFICE,
        district,
        AZ_ELECTION_YEAR,
      );
      const expectedNames = AZ_OFFICIAL_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns no rows for a senate contest (AZ has 0 in 2026)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AZ_DB_ROWS));
    const out = await getOfficialRoster(
      AZ_STATE,
      "senate",
      null,
      AZ_ELECTION_YEAR,
    );
    expect(out).toEqual([]);
  });

  it("spot-checks AIP party codes come through verbatim (raw code, unmapped)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AZ_DB_ROWS));
    const aipNames = [
      "Ajluni",
      "Aversa",
      "Fillmore",
      "Benoit",
      "Bah",
      "Martines",
    ];
    for (const [district, names] of [
      ["01", ["Ajluni"]],
      ["03", ["Aversa"]],
      ["04", ["Fillmore", "Benoit"]],
      ["06", ["Bah"]],
      ["08", ["Martines"]],
    ] as const) {
      const out = await getOfficialRoster(
        AZ_STATE,
        AZ_OFFICE,
        district,
        AZ_ELECTION_YEAR,
      );
      for (const name of names) {
        expect(aipNames).toContain(name);
        expect(out.find((r) => r.name === name)?.party).toBe("AIP");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// hasOfficialRoster
// ---------------------------------------------------------------------------

describe("hasOfficialRoster", () => {
  it("returns false when the DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    expect(await hasOfficialRoster("AZ")).toBe(false);
  });

  it("returns true when rows exist for the state", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([{ id: "az-01-0" }]));
    expect(await hasOfficialRoster("AZ")).toBe(true);
  });

  it("returns false for a state with no imported rows (never assumes coverage)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    expect(await hasOfficialRoster("WY")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isIncumbentSeekingReelection
// ---------------------------------------------------------------------------

describe("isIncumbentSeekingReelection", () => {
  it("returns null when no official roster covers this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const out = await isIncumbentSeekingReelection(
      "WY",
      "house",
      "07",
      2026,
      "Someone",
    );
    expect(out).toBeNull();
  });

  it("returns false for AZ-01 and AZ-05 — open seats, no incumbent row", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AZ_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AZ_STATE,
        AZ_OFFICE,
        "01",
        AZ_ELECTION_YEAR,
        "David Schweikert",
      ),
    ).toBe(false);
    expect(
      await isIncumbentSeekingReelection(
        AZ_STATE,
        AZ_OFFICE,
        "05",
        AZ_ELECTION_YEAR,
        "Andy Biggs",
      ),
    ).toBe(false);
  });

  it("returns true for every other AZ district, whose documented incumbent is present", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AZ_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(AZ_INCUMBENTS)) {
      if (incumbentName === null) continue; // open seats, checked above
      const out = await isIncumbentSeekingReelection(
        AZ_STATE,
        AZ_OFFICE,
        district,
        AZ_ELECTION_YEAR,
        incumbentName,
      );
      expect(out).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// officialRosterRowToSeatChallenger
// ---------------------------------------------------------------------------

describe("officialRosterRowToSeatChallenger", () => {
  const ctx = { election: "2026 primary", retrievedAt: AZ_RETRIEVED_AT };

  it("stamps official-source provenance and promotes into the verified bucket", () => {
    const row: OfficialRosterRow = {
      id: "az-01-0",
      name: "Ajluni",
      party: "AIP",
      isIncumbent: false,
      ballotStatus: "qualified_for_primary_ballot",
      sourceUrl: AZ_SOURCE_URLS[0],
      retrievedAt: AZ_RETRIEVED_AT,
    };
    const out = officialRosterRowToSeatChallenger(row, ctx);
    expect(out.id).toBe("az-01-0");
    expect(out.name).toBe("Ajluni");
    expect(out.party).toBe("AIP"); // raw code — races.ts applies partyName
    expect(out.totalReceipts).toBeNull();
    expect(out.rosterProvenance).toMatchObject({
      sourceKind: "official_state_roster",
      confidence: "official_address_election_tied",
      ballotStatus: "verified_current_ballot",
      selectableAsReplacement: true,
    });
  });

  it("includes write-in rows with party: null — nobody is left out", () => {
    const row: OfficialRosterRow = {
      id: "az-02-4",
      name: "Flores",
      party: null,
      isIncumbent: false,
      ballotStatus: "write_in_qualified",
      sourceUrl: AZ_SOURCE_URLS[1],
      retrievedAt: AZ_RETRIEVED_AT,
    };
    const out = officialRosterRowToSeatChallenger(row, ctx);
    expect(out.party).toBeNull();
    expect(out.rosterProvenance.selectableAsReplacement).toBe(true);
  });

  it("stamps isRunoffPending: true for a runoff_pending row, false/undefined for a determined row", () => {
    const pending: OfficialRosterRow = {
      id: "ok-01-0",
      name: "MARK TEDFORD",
      party: "REP",
      isIncumbent: false,
      ballotStatus: "runoff_pending",
      sourceUrl: AZ_SOURCE_URLS[0],
      retrievedAt: AZ_RETRIEVED_AT,
    };
    const determined: OfficialRosterRow = {
      id: "ok-02-0",
      name: "JOSH BRECHEEN",
      party: "REP",
      isIncumbent: true,
      ballotStatus: "qualified_for_general_ballot",
      sourceUrl: AZ_SOURCE_URLS[0],
      retrievedAt: AZ_RETRIEVED_AT,
    };
    expect(
      officialRosterRowToSeatChallenger(pending, ctx).isRunoffPending,
    ).toBe(true);
    expect(
      officialRosterRowToSeatChallenger(determined, ctx).isRunoffPending,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// lookupChallengers wiring (races.ts) — flag-gated official-roster path
// ---------------------------------------------------------------------------

describe("lookupChallengers — official-roster wiring", () => {
  it("flag OFF: never queries the official-roster table, output is FEC-only", async () => {
    const fecRows = [
      {
        id: "h1",
        fullName: "Jane Doe",
        party: "DEM",
        office: "house",
        district: "07",
        totalReceipts: "50000.00",
        rawMetadata: null,
      },
    ];
    const dbMock = makeSequencedDbMock([fecRows]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("TX", 7, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(1); // FEC query only
    expect(out.house.map((c) => c.id)).toEqual(["h1"]);
  });

  it("flag ON but no official rows for this contest: falls through, output matches FEC-only", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const fecRows = [
      {
        id: "h1",
        fullName: "Jane Doe",
        party: "DEM",
        office: "house",
        district: "07",
        totalReceipts: "50000.00",
        rawMetadata: null,
      },
    ];
    // Sequenced: official house query -> [], official senate query -> [],
    // FEC fallback query -> fecRows.
    const dbMock = makeSequencedDbMock([[], [], fecRows]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("TX", 7, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(3);
    expect(out.house.map((c) => c.id)).toEqual(["h1"]);
  });

  it("flag ON + AZ official rows: every district returns the FULL official set, no viability drops", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");

    for (const [district, expectedCount] of Object.entries(
      EXPECTED_NON_INCUMBENT_COUNTS,
    )) {
      const houseRows = AZ_OFFICIAL_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e, i) => dbRow(e, i));
      // Sequenced: official house query -> houseRows, official senate query
      // -> [] (AZ has 0 senate contests), FEC fallback (senate uncovered) -> [].
      mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

      const out = await lookupChallengers("AZ", Number(district), 2026);

      expect(out.house).toHaveLength(expectedCount);
      // Every returned challenger carries official-source provenance.
      for (const c of out.house) {
        expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
      }
      // The sitting incumbent (when one exists) is excluded from the
      // challenger list — same contract as the FEC path (already shown as
      // the seat's own card).
      const incumbentName = AZ_INCUMBENTS[district];
      if (incumbentName) {
        expect(out.house.some((c) => c.name === incumbentName)).toBe(false);
      }
    }
  });

  it("AZ-01: all 12 candidates render — exceeds the 8-per-seat viability cap", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AZ_OFFICIAL_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => dbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("AZ", 1, 2026);

    expect(out.house).toHaveLength(12);
    expect(out.house.find((c) => c.name === "Ajluni")?.party).toBe(
      "Arizona Independent Party",
    );
  });

  it("AZ-02: incumbent Crane is excluded from challengers; write-in Flores is included with null party", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AZ_OFFICIAL_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => dbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("AZ", 2, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Descheenie", "Flores", "Goodwin", "Nez"].sort(),
    );
    expect(out.house.find((c) => c.name === "Flores")?.party).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Texas — exercises the senate path AZ never covered (AZ has 0 senate
// contests in 2026; TX has an active one). See
// docs/operations/texas-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — TX senate narrowing", () => {
  it("returns the 7 TX senate rows for (senate, null), none for a house district in the same DB rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(TX_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      TX_STATE,
      "senate",
      null,
      TX_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(TX_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...TX_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      TX_STATE,
      "house",
      "01",
      TX_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("narrows house rows to the exact district for a sample of TX districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(TX_HOUSE_DB_ROWS));
    for (const district of ["01", "09", "23", "38"]) {
      const out = await getOfficialRoster(
        TX_STATE,
        "house",
        district,
        TX_ELECTION_YEAR,
      );
      const expectedNames = TX_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });
});

describe("isIncumbentSeekingReelection — TX", () => {
  it("returns true for districts whose winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(TX_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      TX_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          TX_STATE,
          "house",
          district,
          TX_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for every open-seat district — sitting incumbent lost their primary/runoff or didn't run there, not seeking re-election on this seat's ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(TX_HOUSE_DB_ROWS));
    for (const district of TX_OPEN_SEAT_TEST_DISTRICTS) {
      expect(
        await isIncumbentSeekingReelection(
          TX_STATE,
          "house",
          district,
          TX_ELECTION_YEAR,
          "irrelevant — no incumbent row exists for this seat",
        ),
      ).toBe(false);
    }
  });

  it("returns false for TX-23 — a house.gov-listed vacancy, no incumbent row", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(TX_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        TX_STATE,
        "house",
        "23",
        TX_ELECTION_YEAR,
        "Tony Gonzales",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — TX wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = TX_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => txDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, TX_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("TX", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Moran excluded; the Democratic nominee and the declared
    // independent both render as challengers
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["NATHAN LEVIN JACKSON", "YOLANDA R. PRINCE"].sort(),
    );
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      TX_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
  });

  it("TX-02 (open seat): both party nominees render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = TX_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => txDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, TX_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("TX", 2, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["SHAUN FINNIE", "STEVE TOTH"].sort(),
    );
  });

  it("senate: independents render with party 'Independent' (IND code mapped via partyName)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = TX_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => txDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, TX_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("TX", 1, 2026);

    const independentNames = TX_SENATE_ROSTER_2026.filter(
      (e) => e.party === "IND",
    ).map((e) => e.name);
    expect(independentNames.length).toBeGreaterThan(0);
    for (const name of independentNames) {
      expect(out.senate.find((c) => c.name === name)?.party).toBe(
        "Independent",
      );
    }
    expect(out.senate.find((c) => c.name === "JAMES TALARICO")?.party).toBe(
      "Democrat",
    );
    expect(out.senate.find((c) => c.name === "KEN PAXTON")?.party).toBe(
      "Republican",
    );
  });
});

// ---------------------------------------------------------------------------
// Oklahoma — third state built through this pipeline (card d9b1ef86). Not
// Civix-vended (unlike TX); exercises a runoff-pending ballotStatus that
// neither AZ nor TX needed (OK's Aug 25, 2026 runoff was still pending at
// transcription time). See
// docs/operations/oklahoma-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — OK narrowing", () => {
  it("narrows house rows to the exact district for every OK district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05"]) {
      const out = await getOfficialRoster(
        OK_STATE,
        "house",
        district,
        OK_ELECTION_YEAR,
      );
      const expectedNames = OK_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 6 OK senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      OK_STATE,
      "senate",
      null,
      OK_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(OK_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...OK_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      OK_STATE,
      "house",
      "01",
      OK_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("runoff_pending rows: both OK-1 Republican finalists come through with that exact ballotStatus", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      OK_STATE,
      "house",
      "01",
      OK_ELECTION_YEAR,
    );
    const pending = out.filter((r) => r.ballotStatus === "runoff_pending");
    expect(pending.map((r) => r.name).sort()).toEqual(
      ["JACKSON LAHMEYER", "MARK TEDFORD"].sort(),
    );
    // The unopposed Democratic nominee is NOT runoff_pending.
    expect(out.find((r) => r.name === "JOHN CROISANT")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });

  it("runoff_pending rows: both US Senate Democratic finalists come through with that exact ballotStatus", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      OK_STATE,
      "senate",
      null,
      OK_ELECTION_YEAR,
    );
    const pending = out.filter((r) => r.ballotStatus === "runoff_pending");
    expect(pending.map((r) => r.name).sort()).toEqual(
      ["JIM PRIEST", "N'KIYLA JASMINE THOMAS"].sort(),
    );
    // The Republican and Libertarian nominees are already determined.
    expect(out.find((r) => r.name === "KEVIN HERN")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(out.find((r) => r.name === "SEVIER WHITE")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });
});

describe("isIncumbentSeekingReelection — OK", () => {
  it("returns true for OK-2, OK-3, OK-4, OK-5 — the winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      OK_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          OK_STATE,
          "house",
          district,
          OK_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for OK-1 — Hern (sitting rep) filed for Senate instead, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        OK_STATE,
        "house",
        "01",
        OK_ELECTION_YEAR,
        "Kevin Hern",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — Armstrong (sitting senator) did not file for election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(OK_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        OK_STATE,
        "senate",
        null,
        OK_ELECTION_YEAR,
        "Alan Armstrong",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — OK wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = OK_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => okDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, OK_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("OK", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Brecheen excluded; the Democratic nominee and the declared
    // independent both render as challengers
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["BRANDON WADE", "RONNIE HOPKINS"].sort(),
    );
  });

  it("OK-1 (open seat, runoff pending): both Republican finalists render as challengers alongside the Democratic nominee, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = OK_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => okDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, OK_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("OK", 1, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["JACKSON LAHMEYER", "JOHN CROISANT", "MARK TEDFORD"].sort(),
    );
    // Both Republican finalists carry isRunoffPending; the uncontested
    // Democratic nominee does not.
    expect(
      out.house.find((c) => c.name === "MARK TEDFORD")?.isRunoffPending,
    ).toBe(true);
    expect(
      out.house.find((c) => c.name === "JACKSON LAHMEYER")?.isRunoffPending,
    ).toBe(true);
    expect(
      out.house.find((c) => c.name === "JOHN CROISANT")?.isRunoffPending,
    ).toBe(false);
  });

  it("senate (open seat, Democratic runoff pending): both Senate runoff finalists render as challengers alongside the determined nominees", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = OK_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => okDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, OK_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("OK", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      OK_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
    expect(out.senate.find((c) => c.name === "SEVIER WHITE")?.party).toBe(
      "Libertarian",
    );
    expect(out.senate.find((c) => c.name === "CURTIS STINNETT")?.party).toBe(
      "Independent",
    );
    // Both Democratic runoff finalists carry isRunoffPending; the determined
    // Republican and Libertarian nominees do not.
    expect(
      out.senate.find((c) => c.name === "N'KIYLA JASMINE THOMAS")
        ?.isRunoffPending,
    ).toBe(true);
    expect(
      out.senate.find((c) => c.name === "JIM PRIEST")?.isRunoffPending,
    ).toBe(true);
    expect(
      out.senate.find((c) => c.name === "KEVIN HERN")?.isRunoffPending,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Alabama — fourth state through this pipeline (card at
// docs/operations/voter-choice-backlog.md, "Import + verify official
// roster: Alabama (AL)"). Not Civix-vended; exercises a mid-decade
// congressional-redistricting special primary (CD1/2/6/7) with NO runoff —
// distinct from OK's true 2-finalist runoff shape (an entire party field
// can be "runoff_pending" here, not narrowed to two). See
// docs/operations/alabama-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — AL narrowing", () => {
  it("narrows house rows to the exact district for every AL district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06", "07"]) {
      const out = await getOfficialRoster(
        AL_STATE,
        "house",
        district,
        AL_ELECTION_YEAR,
      );
      const expectedNames = AL_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 2 AL senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AL_STATE,
      "senate",
      null,
      AL_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(AL_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...AL_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      AL_STATE,
      "house",
      "01",
      AL_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("runoff_pending rows: all 4 AL-1 Republican special-primary filers come through with that exact ballotStatus (no runoff — full field, not narrowed to two)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      AL_STATE,
      "house",
      "01",
      AL_ELECTION_YEAR,
    );
    const pending = out.filter((r) => r.ballotStatus === "runoff_pending");
    expect(pending.map((r) => r.name).sort()).toEqual(
      ["Austin Sidwell", "Jerry Carl", "John Mills", "Lucas Burger"].sort(),
    );
    // The unopposed Democratic nominee is NOT runoff_pending.
    expect(
      out.find((r) => r.name === "Clyde W. Jones, Jr.")?.ballotStatus,
    ).toBe("qualified_for_general_ballot");
  });

  it("AL-6: incumbent Palmer carries isIncumbent true AND ballotStatus runoff_pending simultaneously — renomination undetermined despite being the sitting officeholder", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      AL_STATE,
      "house",
      "06",
      AL_ELECTION_YEAR,
    );
    const palmer = out.find((r) => r.name === "Gary Palmer");
    expect(palmer?.isIncumbent).toBe(true);
    expect(palmer?.ballotStatus).toBe("runoff_pending");
    // Both parties are contested (R: Dixon vs Palmer; D: 4-way) — every
    // AL-6 row is pending, none determined.
    expect(out.every((r) => r.ballotStatus === "runoff_pending")).toBe(true);
    expect(out.map((r) => r.name).sort()).toEqual(
      [
        "Ashtyn Kennedy",
        "Case Dixon",
        "Gary Palmer",
        "Jacob Bouma-Sims",
        "Keith Pilkington",
        "Maurice Mercer",
      ].sort(),
    );
  });

  it("senate: both AL nominees are determined (unaffected by congressional redistricting)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      AL_STATE,
      "senate",
      null,
      AL_ELECTION_YEAR,
    );
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
    expect(out.find((r) => r.name === "Barry Moore")?.party).toBe("REP");
    expect(out.find((r) => r.name === "Everett Wess")?.party).toBe("DEM");
  });
});

describe("isIncumbentSeekingReelection — AL", () => {
  it("returns true for AL-2, AL-3, AL-4, AL-5, AL-7 — the winning/determined nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      AL_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          AL_STATE,
          "house",
          district,
          AL_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for AL-1 — Moore (sitting rep) filed for Senate instead, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AL_STATE,
        "house",
        "01",
        AL_ELECTION_YEAR,
        "Barry Moore",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — Tuberville (sitting senator) filed for Governor instead, not on the Senate ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AL_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AL_STATE,
        "senate",
        null,
        AL_ELECTION_YEAR,
        "Tommy Tuberville",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — AL wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "03",
    ).map((e, i) => alDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, AL_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("AL", 3, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Rogers excluded; the Democratic nominee renders as the sole
    // challenger.
    expect(out.house.map((c) => c.name)).toEqual(["Lee McInnis"]);
  });

  it("AL-1 (open seat, all-4 Republican field pending, no runoff): every special-primary filer renders as a challenger alongside the determined Democratic nominee, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => alDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, AL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AL", 1, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Austin Sidwell",
        "Clyde W. Jones, Jr.",
        "Jerry Carl",
        "John Mills",
        "Lucas Burger",
      ].sort(),
    );
    // All four Republican filers carry isRunoffPending; the uncontested
    // Democratic nominee does not.
    for (const name of [
      "Lucas Burger",
      "Jerry Carl",
      "John Mills",
      "Austin Sidwell",
    ]) {
      expect(out.house.find((c) => c.name === name)?.isRunoffPending).toBe(
        true,
      );
    }
    expect(
      out.house.find((c) => c.name === "Clyde W. Jones, Jr.")?.isRunoffPending,
    ).toBe(false);
  });

  it("AL-6 (incumbent Palmer's own renomination pending): Palmer is still excluded as the sitting incumbent (same isIncumbent-keyed contract as AZ/TX/OK) even though his own renomination isn't decided — his primary opponent and every Democratic filer render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "06",
    ).map((e, i) => alDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, AL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AL", 6, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Ashtyn Kennedy",
        "Case Dixon",
        "Jacob Bouma-Sims",
        "Keith Pilkington",
        "Maurice Mercer",
      ].sort(),
    );
    expect(out.house.some((c) => c.name === "Gary Palmer")).toBe(false);
    expect(
      out.house.find((c) => c.name === "Case Dixon")?.isRunoffPending,
    ).toBe(true);
  });

  it("senate: both determined nominees render, neither flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "03",
    ).map((e, i) => alDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, AL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AL", 3, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Barry Moore", "Everett Wess"].sort(),
    );
    expect(
      out.senate.find((c) => c.name === "Barry Moore")?.isRunoffPending,
    ).toBe(false);
    expect(
      out.senate.find((c) => c.name === "Everett Wess")?.isRunoffPending,
    ).toBe(false);
  });
});
// ---------------------------------------------------------------------------
// Alaska — fourth state built through this pipeline. At-large House seat
// (district "00", not null — see the fixture's docblock for why a null
// district would silently never match races.ts's lookupChallengers); every
// row is "qualified_for_primary_ballot" since Alaska's Aug 18, 2026
// top-four nonpartisan primary had not yet occurred at transcription time,
// so no runoff_pending rows exist here. See
// docs/operations/alaska-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — AK narrowing", () => {
  it("returns all AK house rows for the at-large district key ('00'), none for a bogus numbered district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AK_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      AK_STATE,
      "house",
      AK_HOUSE_DISTRICT,
      AK_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      [...AK_HOUSE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const wrongDistrict = await getOfficialRoster(
      AK_STATE,
      "house",
      "01",
      AK_ELECTION_YEAR,
    );
    expect(wrongDistrict).toEqual([]);
  });

  it("returns all AK senate rows for (senate, null), none for the house district key in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AK_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AK_STATE,
      "senate",
      null,
      AK_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(AK_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...AK_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      AK_STATE,
      "house",
      AK_HOUSE_DISTRICT,
      AK_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("every AK row is qualified_for_primary_ballot — the Aug 18, 2026 top-four primary had not yet happened at transcription time", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AK_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      AK_STATE,
      "house",
      AK_HOUSE_DISTRICT,
      AK_ELECTION_YEAR,
    );
    expect(
      house.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);

    mockedGetDb.mockReturnValue(makeDbMock(AK_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AK_STATE,
      "senate",
      null,
      AK_ELECTION_YEAR,
    );
    expect(
      senate.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — AK", () => {
  it("returns true for the House seat — Begich (sitting rep) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AK_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AK_STATE,
        "house",
        AK_HOUSE_DISTRICT,
        AK_ELECTION_YEAR,
        "Nick Begich",
      ),
    ).toBe(true);
  });

  it("returns true for the Senate seat — Sullivan (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AK_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AK_STATE,
        "senate",
        null,
        AK_ELECTION_YEAR,
        "Dan Sullivan",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — AK wiring (at-large house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3); a numeric district of 0 resolves the at-large seat", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const dbMock = makeSequencedDbMock([AK_HOUSE_DB_ROWS, AK_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("AK", 0, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Begich excluded from the house challenger list
    expect(out.house.some((c) => c.name === "NICK BEGICH")).toBe(false);
    expect(out.house.length).toBe(AK_HOUSE_ROSTER_2026.length - 1);
  });

  it("senate: incumbent Sullivan excluded; the same-name litigated filer and the Alaskan Party filer both render as challengers with mapped party names", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([AK_HOUSE_DB_ROWS, AK_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AK", 0, 2026);

    expect(out.senate.some((c) => c.name === "DAN S. SULLIVAN")).toBe(false);
    expect(out.senate.length).toBe(AK_SENATE_ROSTER_2026.length - 1);
    expect(
      out.senate.find((c) => c.name === "DANIEL J. SULLIVAN JR.")?.party,
    ).toBe("Republican");
    expect(
      out.senate.find((c) => c.name === 'EARL D. "SKIP" SOUTHWORTH')?.party,
    ).toBe("Alaskan Party");
    expect(out.senate.find((c) => c.name === "MARY PELTOLA")?.party).toBe(
      "Democrat",
    );
  });

  it("house: NPA-coded filers (Nonpartisan/Undeclared) render with mapped party 'No Party Affiliation'", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([AK_HOUSE_DB_ROWS, AK_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AK", 0, 2026);

    expect(out.house.find((c) => c.name === "DAVID R. AMBROSE II")?.party).toBe(
      "No Party Affiliation",
    );
    expect(
      out.house.find((c) => c.name === 'MATTHEW "BRONCO" WILLIAMS')?.party,
    ).toBe("No Party Affiliation");
  });
});

// ---------------------------------------------------------------------------
// Colorado — fifth state built through this pipeline. CO's June 30, 2026
// primary had already occurred at transcription time, so this is a
// general-ballot state: every major-party nominee is
// "qualified_for_general_ballot" (determined via certified primary results),
// while CO-1's, CO-3's, CO-4's, CO-6's, and CO-7's unaffiliated (UAF)
// petition candidates carry "declared_general_ballot_intent" (signature
// verification still pending at retrieval — same preliminary-filing status
// TX's independent track uses, not "runoff_pending"). CO-1's sitting
// incumbent, Diana DeGette, lost her Democratic primary to Melat Kiros, so
// CO-1 is the one district with no incumbent among the general nominees. See
// docs/operations/colorado-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — CO narrowing", () => {
  it("narrows house rows to the exact district for every CO district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
      const out = await getOfficialRoster(
        CO_STATE,
        "house",
        district,
        CO_ELECTION_YEAR,
      );
      const expectedNames = CO_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 2 CO senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      CO_STATE,
      "senate",
      null,
      CO_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(CO_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...CO_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      CO_STATE,
      "house",
      "01",
      CO_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("CO-1: no incumbent among the general nominees — DeGette lost her primary; Kiros (D), Peterson (R), and Blau (declared UAF) all render, none flagged incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      CO_STATE,
      "house",
      "01",
      CO_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      ["Melat Kiros", "Christy Peterson", "Shimon Blau"].sort(),
    );
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(out.find((r) => r.name === "Shimon Blau")?.ballotStatus).toBe(
      "declared_general_ballot_intent",
    );
    expect(out.find((r) => r.name === "Melat Kiros")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });

  it("senate: both CO nominees are determined, Hickenlooper carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      CO_STATE,
      "senate",
      null,
      CO_ELECTION_YEAR,
    );
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
    expect(out.find((r) => r.name === "John Hickenlooper")?.isIncumbent).toBe(
      true,
    );
    expect(out.find((r) => r.name === "Mark Baisley")?.isIncumbent).toBe(false);
  });
});

describe("isIncumbentSeekingReelection — CO", () => {
  it("returns true for CO-2, CO-3, CO-4, CO-5, CO-6, CO-7, CO-8 — the winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      CO_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          CO_STATE,
          "house",
          district,
          CO_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for CO-1 — DeGette (sitting rep) lost her primary, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        CO_STATE,
        "house",
        "01",
        CO_ELECTION_YEAR,
        "Diana DeGette",
      ),
    ).toBe(false);
  });

  it("returns true for the US Senate seat — Hickenlooper (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CO_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        CO_STATE,
        "senate",
        null,
        CO_ELECTION_YEAR,
        "John Hickenlooper",
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// California — the nonpartisan top-two "jungle primary" (all 52 House
// districts, house-only fixture — no Senate contest this cycle). The June 2,
// 2026 primary is fully certified, so every row is either
// qualified_for_general_ballot (top-two) or qualified_for_primary_ballot
// (ran, didn't advance); runoff_pending never applies. See
// docs/operations/california-vertical-slice-data-check.md for the full
// build, including the CD-40 vote-total correction and the redistricting
// cross-check findings.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — CA narrowing", () => {
  it("returns all CA-01 rows, none for a bogus district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      CA_STATE,
      "house",
      "01",
      CA_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      [
        "Audrey Denney",
        "James Gallagher",
        "Janice Karrman",
        "Mike McGuire",
        "Richard T. Minner",
        "Timothy Sean Kelly",
      ].sort(),
    );

    const wrongDistrict = await getOfficialRoster(
      CA_STATE,
      "house",
      "53",
      CA_ELECTION_YEAR,
    );
    expect(wrongDistrict).toEqual([]);
  });

  it("returns none for (senate, null) — California has no Senate contest this cycle", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    const senate = await getOfficialRoster(
      CA_STATE,
      "senate",
      null,
      CA_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });

  it("every CA row is either qualified_for_general_ballot or qualified_for_primary_ballot — never runoff_pending", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      CA_STATE,
      "house",
      "40",
      CA_ELECTION_YEAR,
    );
    expect(
      out.every(
        (r) =>
          r.ballotStatus === "qualified_for_general_ballot" ||
          r.ballotStatus === "qualified_for_primary_ballot",
      ),
    ).toBe(true);
  });

  it("CD-40 correction: Calvert and Kim (both REP) are the general-ballot rows; Kim-Varet (DEM) is primary-only", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      CA_STATE,
      "house",
      "40",
      CA_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "Ken Calvert")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(out.find((r) => r.name === "Young Kim")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(out.find((r) => r.name === "Esther Kim-Varet")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
  });
});

describe("isIncumbentSeekingReelection — CA", () => {
  it("returns true for CD-01 — Gallagher (sitting rep) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        CA_STATE,
        "house",
        "01",
        CA_ELECTION_YEAR,
        "James Gallagher",
      ),
    ).toBe(true);
  });

  it("returns false for open seats — CD-11 (Pelosi), CD-26 (Brownley), CD-38, CD-48 (Issa)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    for (const district of ["11", "26", "38", "48"]) {
      expect(
        await isIncumbentSeekingReelection(
          CA_STATE,
          "house",
          district,
          CA_ELECTION_YEAR,
          "Placeholder Name",
        ),
      ).toBe(false);
    }
  });

  it("returns true for CD-40 — two incumbents (Calvert, Kim) both filed in the same redrawn seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CA_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        CA_STATE,
        "house",
        "40",
        CA_ELECTION_YEAR,
        "Ken Calvert",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — CO wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CO_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => coDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, CO_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("CO", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Neguse excluded; the Republican nominee renders as the sole
    // challenger.
    expect(out.house.map((c) => c.name)).toEqual(["Kelley Anne Dennison"]);
  });

  it("CO-1 (open seat, DeGette lost her primary): both major-party nominees and the declared UAF filer render as challengers, none excluded as incumbent, none flagged runoff-pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CO_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => coDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, CO_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("CO", 1, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Christy Peterson", "Melat Kiros", "Shimon Blau"].sort(),
    );
    expect(out.house.every((c) => c.isRunoffPending === false)).toBe(true);
  });

  it("senate: incumbent Hickenlooper excluded; Baisley renders as the sole challenger with mapped party name", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CO_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => coDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, CO_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("CO", 2, 2026);

    expect(out.senate.some((c) => c.name === "John Hickenlooper")).toBe(false);
    expect(out.senate.map((c) => c.name)).toEqual(["Mark Baisley"]);
    expect(out.senate.find((c) => c.name === "Mark Baisley")?.party).toBe(
      "Republican",
    );
  });
});

// ---------------------------------------------------------------------------
// Connecticut — house-only (like AZ: 0 senate contests in 2026), the first
// state through this track with two DIFFERENT ballotStatus values inside a
// single "general"-stage fixture (contested primary-pending districts
// alongside already-determined uncontested nominees). See
// docs/operations/connecticut-vertical-slice-data-check.md for the full
// build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — CT narrowing", () => {
  it("narrows to the exact (office, district) contest for each of the 5 CT districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CT_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05"]) {
      const out = await getOfficialRoster(
        CT_STATE,
        CT_OFFICE,
        district,
        CT_ELECTION_YEAR,
      );
      const expectedNames = CT_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns no rows for a senate contest (CT has 0 in 2026)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CT_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      CT_STATE,
      "senate",
      null,
      CT_ELECTION_YEAR,
    );
    expect(out).toEqual([]);
  });

  it("CD1 and CD5 Democratic primary rows carry qualified_for_primary_ballot; uncontested CD2/CD3 rows carry qualified_for_general_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CT_HOUSE_DB_ROWS));
    const cd1 = await getOfficialRoster(
      CT_STATE,
      CT_OFFICE,
      "01",
      CT_ELECTION_YEAR,
    );
    expect(cd1.find((r) => r.name === "Luke Bronin")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
    expect(cd1.find((r) => r.name === "Ruth Fortune")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
    expect(cd1.find((r) => r.name === "Amy Chai")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(cd1.find((r) => r.name === "Mary L. Sanders")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );

    const cd2 = await getOfficialRoster(
      CT_STATE,
      CT_OFFICE,
      "02",
      CT_ELECTION_YEAR,
    );
    expect(cd2.find((r) => r.name === "Joe Courtney")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });
});

describe("isIncumbentSeekingReelection — CT", () => {
  it("returns true for every CT district — no open seats in 2026", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(CT_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(CT_INCUMBENTS)) {
      const out = await isIncumbentSeekingReelection(
        CT_STATE,
        CT_OFFICE,
        district,
        CT_ELECTION_YEAR,
        incumbentName,
      );
      expect(out).toBe(true);
    }
  });
});

describe("lookupChallengers — CT wiring (house-only, mixed ballotStatus within one contest)", () => {
  it("CD1: incumbent Larson excluded; the 3 other Dem primary contestants (incl. petition-route Fortune), uncontested Republican Chai, and Green nominee Sanders all render", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CT_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => ctDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (CT has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("CT", 1, 2026);

    expect(out.house.some((c) => c.name === "John B. Larson")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Luke Bronin",
        "Jillian Gilchrest",
        "Ruth Fortune",
        "Amy Chai",
        "Mary L. Sanders",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("every CT district's sitting incumbent is excluded from that district's challenger list", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    for (const [district, incumbentName] of Object.entries(CT_INCUMBENTS)) {
      const houseRows = CT_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e, i) => ctDbRow(e, i));
      mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

      const out = await lookupChallengers("CT", Number(district), 2026);

      expect(out.house.some((c) => c.name === incumbentName)).toBe(false);
    }
  });

  it("CD2 (uncontested, determined): sole Republican Austin renders as the only challenger", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CT_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => ctDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("CT", 2, 2026);

    expect(out.house.map((c) => c.name)).toEqual(["George Patrick Austin"]);
  });
});

describe("lookupChallengers — CA wiring (house-only, all 52 districts covered)", () => {
  it("CD-01: incumbent Gallagher excluded from challengers; 5 remain", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => caDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (CA has 0 senate contests in 2026), FEC fallback (senate uncovered,
    // house already resolved) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("CA", 1, 2026);

    expect(out.house).toHaveLength(5);
    expect(out.house.some((c) => c.name === "James Gallagher")).toBe(false);
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("CD-40: both incumbents (Calvert, Kim) excluded from challengers; the corrected 3rd-place Kim-Varet renders as a challenger", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "40",
    ).map((e, i) => caDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("CA", 40, 2026);

    expect(out.house.some((c) => c.name === "Ken Calvert")).toBe(false);
    expect(out.house.some((c) => c.name === "Young Kim")).toBe(false);
    expect(out.house.find((c) => c.name === "Esther Kim-Varet")?.party).toBe(
      "Democrat",
    );
    expect(out.house).toHaveLength(6);
  });

  it("CD-11: open seat (Pelosi) — no incumbent excluded, all 11 candidates render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = CA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "11",
    ).map((e, i) => caDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("CA", 11, 2026);

    expect(out.house).toHaveLength(11);
  });

  it("new CA-specific party codes render mapped display names: NPP -> 'No Party Preference', PF -> 'Peace and Freedom', GRE (CA's GRN) -> 'Green'", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const cd01 = CA_HOUSE_ROSTER_2026.filter((e) => e.district === "01").map(
      (e, i) => caDbRow(e, i),
    );
    mockedGetDb.mockReturnValue(makeSequencedDbMock([cd01, [], []]));
    const out01 = await lookupChallengers("CA", 1, 2026);
    expect(
      out01.house.find((c) => c.name === "Timothy Sean Kelly")?.party,
    ).toBe("No Party Preference");

    const cd24 = CA_HOUSE_ROSTER_2026.filter((e) => e.district === "24").map(
      (e, i) => caDbRow(e, i),
    );
    mockedGetDb.mockReturnValue(makeSequencedDbMock([cd24, [], []]));
    const out24 = await lookupChallengers("CA", 24, 2026);
    expect(
      out24.house.find((c) => c.name === "Helena Pasquarella")?.party,
    ).toBe("Peace and Freedom");

    const cd03 = CA_HOUSE_ROSTER_2026.filter((e) => e.district === "03").map(
      (e, i) => caDbRow(e, i),
    );
    mockedGetDb.mockReturnValue(makeSequencedDbMock([cd03, [], []]));
    const out03 = await lookupChallengers("CA", 3, 2026);
    expect(out03.house.find((c) => c.name === "Chris Richardson")?.party).toBe(
      "Green",
    );
  });
});
// ---------------------------------------------------------------------------
// Arkansas — sixth state built through this pipeline. Both the preferential
// primary (2026-03-03) and primary runoff (2026-03-31) had already occurred
// at transcription time, and every federal contest was decided by an
// outright majority — every row is "qualified_for_general_ballot", no
// runoff_pending rows, no open seats. See
// docs/operations/arkansas-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — AR narrowing", () => {
  it("narrows house rows to the exact district for every AR district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04"]) {
      const out = await getOfficialRoster(
        AR_STATE,
        "house",
        district,
        AR_ELECTION_YEAR,
      );
      const expectedNames = AR_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 3 AR senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AR_STATE,
      "senate",
      null,
      AR_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(AR_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...AR_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      AR_STATE,
      "house",
      "01",
      AR_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("every AR row is qualified_for_general_ballot — no undetermined nominations, no runoff needed by any federal race", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      AR_STATE,
      "house",
      "01",
      AR_ELECTION_YEAR,
    );
    expect(
      house.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);

    mockedGetDb.mockReturnValue(makeDbMock(AR_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AR_STATE,
      "senate",
      null,
      AR_ELECTION_YEAR,
    );
    expect(
      senate.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
  });

  it("Libertarian nominees (AR-1 Parsons, AR-3 Wilson, Senate Wadlin) carry party LIB", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_HOUSE_DB_ROWS));
    const d1 = await getOfficialRoster(
      AR_STATE,
      "house",
      "01",
      AR_ELECTION_YEAR,
    );
    expect(d1.find((r) => r.name === "Steve G. Parsons")?.party).toBe("LIB");
    const d3 = await getOfficialRoster(
      AR_STATE,
      "house",
      "03",
      AR_ELECTION_YEAR,
    );
    expect(d3.find((r) => r.name === "Bobby Wilson")?.party).toBe("LIB");

    mockedGetDb.mockReturnValue(makeDbMock(AR_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      AR_STATE,
      "senate",
      null,
      AR_ELECTION_YEAR,
    );
    expect(senate.find((r) => r.name === "Jeff Wadlin")?.party).toBe("LIB");
  });
});

describe("isIncumbentSeekingReelection — AR", () => {
  it("returns true for every AR district — the winning nominee is the sitting incumbent in all 4", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      AR_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          AR_STATE,
          "house",
          district,
          AR_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns true for the US Senate seat — Cotton (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(AR_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        AR_STATE,
        "senate",
        null,
        AR_ELECTION_YEAR,
        "Senator Tom Cotton",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — AR wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AR_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => arDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, AR_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("AR", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Hill excluded; the Democratic nominee renders as the sole
    // challenger (no Libertarian filer in AR-2).
    expect(out.house.map((c) => c.name)).toEqual(["Chris Jones"]);
  });

  it("AR-1: incumbent Crawford excluded; Democratic and Libertarian nominees both render as challengers, neither flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AR_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => arDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, AR_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AR", 1, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Steve G. Parsons", "Terri Yarbrough Green"].sort(),
    );
    expect(out.house.some((c) => c.name === "Congressman Rick Crawford")).toBe(
      false,
    );
    for (const c of out.house) {
      expect(c.isRunoffPending).toBe(false);
    }
  });

  it("senate: all three nominees render, incumbent Cotton excluded, none flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = AR_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => arDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, AR_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("AR", 2, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Hallie Shoffner", "Jeff Wadlin"].sort(),
    );
    expect(out.senate.some((c) => c.name === "Senator Tom Cotton")).toBe(false);
    for (const c of out.senate) {
      expect(c.isRunoffPending).toBe(false);
    }
  });
});
// ---------------------------------------------------------------------------
// Delaware — eighth state built through this pipeline. At-large House seat
// (district "00", same convention as Alaska). The September 15, 2026 primary
// had not yet occurred at transcription time, so every contested-primary row
// is "qualified_for_primary_ballot"; the sole unopposed House Democrat
// (McBride) is "qualified_for_general_ballot" instead — no runoff_pending
// rows (Delaware has no runoff). See
// docs/operations/delaware-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — DE narrowing", () => {
  it("returns all DE house rows for the at-large district key ('00'), none for a bogus numbered district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      DE_STATE,
      "house",
      DE_HOUSE_DISTRICT,
      DE_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      [...DE_HOUSE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const wrongDistrict = await getOfficialRoster(
      DE_STATE,
      "house",
      "01",
      DE_ELECTION_YEAR,
    );
    expect(wrongDistrict).toEqual([]);
  });

  it("returns all DE senate rows for (senate, null), none for the house district key in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      DE_STATE,
      "senate",
      null,
      DE_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(DE_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...DE_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      DE_STATE,
      "house",
      DE_HOUSE_DISTRICT,
      DE_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("every DE senate row is qualified_for_primary_ballot — the Sept 15, 2026 primary had not yet happened at transcription time", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      DE_STATE,
      "senate",
      null,
      DE_ELECTION_YEAR,
    );
    expect(
      senate.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });

  it("DE house: McBride (unopposed within her party) is qualified_for_general_ballot; every contested REP primary filer is qualified_for_primary_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      DE_STATE,
      "house",
      DE_HOUSE_DISTRICT,
      DE_ELECTION_YEAR,
    );
    expect(house.find((r) => r.name === "Sarah McBride")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    const repFilers = house.filter((r) => r.name !== "Sarah McBride");
    expect(repFilers.length).toBeGreaterThan(0);
    expect(
      repFilers.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — DE", () => {
  it("returns true for the House seat — McBride (sitting rep) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        DE_STATE,
        "house",
        DE_HOUSE_DISTRICT,
        DE_ELECTION_YEAR,
        "Sarah McBride",
      ),
    ).toBe(true);
  });

  it("returns true for the Senate seat — Coons (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(DE_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        DE_STATE,
        "senate",
        null,
        DE_ELECTION_YEAR,
        "Chris Coons",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — DE wiring (at-large house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3); a numeric district of 0 resolves the at-large seat", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const dbMock = makeSequencedDbMock([DE_HOUSE_DB_ROWS, DE_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("DE", 0, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent McBride excluded from the house challenger list
    expect(out.house.some((c) => c.name === "Sarah McBride")).toBe(false);
    expect(out.house.length).toBe(DE_HOUSE_ROSTER_2026.length - 1);
  });

  it("house: the four contested REP primary filers render as challengers with mapped party name, none flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([DE_HOUSE_DB_ROWS, DE_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("DE", 0, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Earl Cooper",
        "John J. Whalen",
        'Joseph "Dr. Joe" Arminio',
        "Lee Murphy",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.party).toBe("Republican");
      expect(c.isRunoffPending).toBe(false);
    }
  });

  it("senate: incumbent Coons excluded; the other five contested-primary filers render as challengers, none flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([DE_HOUSE_DB_ROWS, DE_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("DE", 0, 2026);

    expect(out.senate.some((c) => c.name === "Chris Coons")).toBe(false);
    expect(out.senate.length).toBe(DE_SENATE_ROSTER_2026.length - 1);
    expect(
      out.senate.find((c) => c.name === 'Michael "Dr. Mike" Katz')?.party,
    ).toBe("Republican");
    expect(out.senate.find((c) => c.name === "Jeff Appelhans")?.party).toBe(
      "Democrat",
    );
    for (const c of out.senate) {
      expect(c.isRunoffPending).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Florida — the first state through this track built after a mid-decade
// congressional redistricting (signed into law May 4, 2026). Incumbency was
// cross-checked by NAME across the ENTIRE candidate list, not by district
// number, surfacing 3 candidates the portal's own *Incumbent tag omitted
// (Frankel/CD23, Moskowitz/CD25, Wasserman Schultz/CD20 — each a sitting
// member who filed in a new district number) and one it wrongly carried
// forward (Cherfilus-McCormick/CD20 resigned 2026-04-21, well before this
// fixture's retrieval, per independent news reporting). See
// docs/operations/florida-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — FL narrowing", () => {
  it("narrows house rows to the exact district for every FL district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    const districts = Array.from({ length: 28 }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    );
    for (const district of districts) {
      const out = await getOfficialRoster(
        FL_STATE,
        "house",
        district,
        FL_ELECTION_YEAR,
      );
      const expectedNames = FL_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 7 FL senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      FL_STATE,
      "senate",
      null,
      FL_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(FL_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...FL_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      FL_STATE,
      "house",
      "01",
      FL_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("CD10 (Maxwell Frost): the only row in the district, qualified_for_general_ballot, isIncumbent true — no primary or general contest was held", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      FL_STATE,
      "house",
      "10",
      FL_ELECTION_YEAR,
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Maxwell Alejandro Frost");
    expect(out[0].isIncumbent).toBe(true);
    expect(out[0].ballotStatus).toBe("qualified_for_general_ballot");
  });

  it("CD20: Wasserman Schultz carries isIncumbent true, Cherfilus-McCormick carries isIncumbent false, despite the portal's own stale tag", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      FL_STATE,
      "house",
      "20",
      FL_ELECTION_YEAR,
    );
    expect(
      out.find((r) => r.name === "Debbie Wasserman Schultz")?.isIncumbent,
    ).toBe(true);
    expect(
      out.find((r) => r.name === "Sheila Cherfilus-McCormick")?.isIncumbent,
    ).toBe(false);
  });

  it("write-in rows (e.g. CD5's William Lintag Upham) carry write_in_qualified and a null party", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      FL_STATE,
      "house",
      "05",
      FL_ELECTION_YEAR,
    );
    const writeIn = out.find((r) => r.name === "William Lintag Upham");
    expect(writeIn?.ballotStatus).toBe("write_in_qualified");
    expect(writeIn?.party).toBeNull();
  });

  it("senate: Moody (contested REP primary) carries qualified_for_primary_ballot and isIncumbent true; NPA filer Gillespie carries qualified_for_general_ballot with no primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      FL_STATE,
      "senate",
      null,
      FL_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "Ashley Moody")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
    expect(out.find((r) => r.name === "Ashley Moody")?.isIncumbent).toBe(true);
    expect(out.find((r) => r.name === "Neil J. Gillespie")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });
});

describe("isIncumbentSeekingReelection — FL", () => {
  it("returns true for the sample of FL districts whose winning-so-far nominee is a sitting incumbent, including the two post-redistricting corrections (Frankel/CD23, Moskowitz/CD25)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      FL_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          FL_STATE,
          "house",
          district,
          FL_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for the open-seat districts — no sitting member is among the filers", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    for (const district of FL_OPEN_SEAT_DISTRICTS) {
      const rows = FL_HOUSE_ROSTER_2026.filter((e) => e.district === district);
      expect(rows.every((r) => r.isIncumbent === false)).toBe(true);
    }
  });

  it("CD20: the seat's own incumbent row is Wasserman Schultz (matches, no warning); checking against Cherfilus-McCormick's name (resigned, not the roster's incumbent row) still returns true for the seat but logs a mismatch warning", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_HOUSE_DB_ROWS));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(
      await isIncumbentSeekingReelection(
        FL_STATE,
        "house",
        "20",
        FL_ELECTION_YEAR,
        "Debbie Wasserman Schultz",
      ),
    ).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();

    expect(
      await isIncumbentSeekingReelection(
        FL_STATE,
        "house",
        "20",
        FL_ELECTION_YEAR,
        "Sheila Cherfilus-McCormick",
      ),
    ).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("incumbent name mismatch"),
    );

    warnSpy.mockRestore();
  });

  it("returns true for the US Senate seat — Moody (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(FL_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        FL_STATE,
        "senate",
        null,
        FL_ELECTION_YEAR,
        "Ashley Moody",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — FL wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = FL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => flDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, FL_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("FL", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Patronis excluded; every other CD1 filer renders.
    expect(out.house.some((c) => c.name === "Jimmy Patronis")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Douglas Chico",
        "Tyler L. Davis",
        "John Frankman",
        "Gay Valimont",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("CD10 (Frost, uncontested everywhere): renders as the sole entry and is excluded as the incumbent, leaving zero challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = FL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "10",
    ).map((e, i) => flDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, FL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("FL", 10, 2026);

    expect(out.house).toEqual([]);
  });

  it("CD20 (double sitting-member primary): Wasserman Schultz excluded as the incumbent; Cherfilus-McCormick (resigned, not excluded) and every other filer render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = FL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "20",
    ).map((e, i) => flDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, FL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("FL", 20, 2026);

    expect(out.house.some((c) => c.name === "Debbie Wasserman Schultz")).toBe(
      false,
    );
    expect(out.house.some((c) => c.name === "Sheila Cherfilus-McCormick")).toBe(
      true,
    );
  });

  it("senate: incumbent Moody excluded; the contested REP/DEM filers and the NPA filer all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = FL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => flDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, FL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("FL", 1, 2026);

    expect(out.senate.some((c) => c.name === "Ashley Moody")).toBe(false);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      [
        "Chris Gleason",
        "Angie Nixon",
        "Neelam Taneja Perry",
        'Ernest "Ernie" Rivera',
        "Alex Vindman",
        "Neil J. Gillespie",
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Hawaii (HI) — house-only, no US Senate contest exists in 2026 (Schatz's
// seat runs through 2029, Hirono's through 2031 — see the fixture's
// docblock). Both districts' sitting incumbent (Ed Case/HI-01, Jill N.
// Tokuda/HI-02) filed for re-election. 13 "Issued but never Filed"
// applications (picked up nomination papers, never completed them) were
// excluded from the fixture entirely — see
// docs/operations/hawaii-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — HI narrowing", () => {
  it("narrows house rows to the exact district for both HI districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(HI_HOUSE_DB_ROWS));
    for (const district of ["01", "02"]) {
      const out = await getOfficialRoster(
        HI_STATE,
        "house",
        district,
        HI_ELECTION_YEAR,
      );
      const expectedNames = HI_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("HI-01: 8 filed candidates, every row qualified_for_primary_ballot (including the sole Republican filer)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(HI_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      HI_STATE,
      "house",
      "01",
      HI_ELECTION_YEAR,
    );
    expect(out).toHaveLength(8);
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
    expect(out.find((r) => r.name === "Adriel C. Lam")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
  });

  it("HI-02: 7 filed candidates; incumbent Tokuda carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(HI_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      HI_STATE,
      "house",
      "02",
      HI_ELECTION_YEAR,
    );
    expect(out).toHaveLength(7);
    expect(out.find((r) => r.name === "Jill N. Tokuda")?.isIncumbent).toBe(
      true,
    );
  });

  it("returns [] for (senate, null) — no HI senate rows exist in the fixture", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const senate = await getOfficialRoster(
      HI_STATE,
      "senate",
      null,
      HI_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — HI", () => {
  it("returns true for both HI districts' sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(HI_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(HI_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          HI_STATE,
          "house",
          district,
          HI_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });
});

describe("lookupChallengers — HI wiring (house-only, no senate contest)", () => {
  it("HI-01: incumbent Ed Case excluded; the 7 other filers all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = HI_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => hiDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (HI has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("HI", 1, 2026);

    expect(out.house.some((c) => c.name === "Ed Case")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Nathan M. Berning",
        "Jennifer Booker",
        "Jordan S. Conley",
        "Ben Fatula",
        "Jarrett K. Keohokalole",
        'Nicholas "Nick" Kiswanto',
        "Adriel C. Lam",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("HI-02: incumbent Jill N. Tokuda excluded; the 6 other filers all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = HI_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => hiDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("HI", 2, 2026);

    expect(out.house.some((c) => c.name === "Jill N. Tokuda")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Brenton Awa",
        "Kirill Basin",
        "Edward A. Codelia",
        "Greg Guithues",
        "Steven King",
        "Randall Terry",
      ].sort(),
    );
  });
});

describe("getOfficialRoster — LA narrowing", () => {
  it("returns both Senate general-ballot nominees", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(LA_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      LA_STATE,
      "senate",
      null,
      LA_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      ['"Jamie" Davis', "Julia Letlow"].sort(),
    );
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
  });

  it("returns [] for any LA house district — Nov 3 open-primary qualifying (Aug 5-7, 2026) had not opened at transcription time, so no fixture rows exist", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const house = await getOfficialRoster(
      LA_STATE,
      "house",
      "01",
      LA_ELECTION_YEAR,
    );
    expect(house).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — LA", () => {
  it("returns false for Bill Cassidy — the sitting incumbent lost renomination and is not one of the two Nov 3 general-ballot nominees", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(LA_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        LA_STATE,
        LA_OFFICE,
        null,
        LA_ELECTION_YEAR,
        "Bill Cassidy",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — LA wiring (senate-only, house not yet qualified)", () => {
  it("both Senate nominees render as challengers; house falls through to the (empty) FEC path since no official rows cover it", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    // Sequenced: official house query -> [] (Louisiana's Nov 3 House
    // open-primary qualifying period had not opened at transcription time,
    // so no fixture rows exist for any district), official senate query ->
    // LA_SENATE_DB_ROWS, FEC fallback (house uncovered) -> [].
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([[], LA_SENATE_DB_ROWS, []]),
    );

    const out = await lookupChallengers("LA", 1, 2026);

    expect(out.house).toEqual([]);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ['"Jamie" Davis', "Julia Letlow"].sort(),
    );
    for (const c of out.senate) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });
});

// ---------------------------------------------------------------------------
// Maine (ME) — both chambers, general-stage (the June 9, 2026 primary is
// already past). CD2 is an open seat (Golden did not file for re-election).
// The Senate DEM slot has NO row — Platner won the primary outright but
// withdrew 2026-07-10; the party's replacement-nomination deadline is
// 2026-07-27, not yet resolved at fixture-transcription time. See the
// fixture's own docblock and
// docs/operations/maine-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — ME narrowing", () => {
  it("narrows house rows to the exact district for both ME districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_HOUSE_DB_ROWS));
    for (const district of ["01", "02"]) {
      const out = await getOfficialRoster(
        ME_STATE,
        "house",
        district,
        ME_ELECTION_YEAR,
      );
      const expectedNames = ME_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the single ME senate row (Collins) for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      ME_STATE,
      "senate",
      null,
      ME_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(1);
    expect(senate[0].name).toBe("Susan Collins");

    const houseInSenateRowset = await getOfficialRoster(
      ME_STATE,
      "house",
      "01",
      ME_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("ME-01: both determined nominees present, incumbent Pingree carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      ME_STATE,
      "house",
      "01",
      ME_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      ["Chellie Pingree", "Ronald C. Russell"].sort(),
    );
    expect(out.find((r) => r.name === "Chellie Pingree")?.isIncumbent).toBe(
      true,
    );
  });

  it("ME-02 (open seat): both nominees present, neither carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      ME_STATE,
      "house",
      "02",
      ME_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      ["Matthew Dunlap", "Paul R. LePage"].sort(),
    );
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — ME", () => {
  it("returns true for ME-01 — the winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      ME_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          ME_STATE,
          "house",
          district,
          ME_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for ME-02 — Golden (sitting rep) did not file for re-election, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        ME_STATE,
        "house",
        "02",
        ME_ELECTION_YEAR,
        "Jared Golden",
      ),
    ).toBe(false);
  });

  it("returns true for the US Senate seat — sitting Senator Collins is a determined nominee", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ME_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        ME_STATE,
        "senate",
        null,
        ME_ELECTION_YEAR,
        "Susan Collins",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — ME wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ME_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => meDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, ME_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("ME", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Pingree excluded; the Republican nominee renders as a challenger
    expect(out.house.map((c) => c.name)).toEqual(["Ronald C. Russell"]);
  });

  it("ME-02 (open seat): both party nominees render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ME_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => meDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, ME_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("ME", 2, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Matthew Dunlap", "Paul R. LePage"].sort(),
    );
  });

  it("senate: only Collins is a determined nominee — no phantom DEM challenger rendered", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ME_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => meDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, ME_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("ME", 1, 2026);

    // Collins is the incumbent — excluded from her own seat's challenger
    // list, same contract as every other state. With no DEM row in the
    // fixture (vacant pending party replacement), the senate challenger
    // list is empty, not guessed.
    expect(out.senate).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Indiana (IN) — house-only, no US Senate contest exists in 2026 (both IN
// Senate seats are Class 1 / Class 3, not up this cycle). All 9 districts'
// nominees are post-primary (STAGE = "general") — the May 5, 2026 primary is
// fully certified. Every sitting incumbent won their own party's primary in
// the same district they currently hold. See
// docs/operations/indiana-vertical-slice-data-check.md for the full build,
// including the General Candidate List's federal-office publication gap
// (linked to an unrelated state-legislative recount) worked around via the
// state's own certified primary-results portal.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — IN narrowing", () => {
  it("narrows house rows to the exact district for all 9 IN districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    for (const district of Object.keys(IN_INCUMBENTS)) {
      const out = await getOfficialRoster(
        IN_STATE,
        "house",
        district,
        IN_ELECTION_YEAR,
      );
      const expectedNames = IN_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("IN-01: 4 rows (2 major-party nominees + 2 write-ins), all qualified_for_general_ballot or write_in_qualified", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      IN_STATE,
      "house",
      "01",
      IN_ELECTION_YEAR,
    );
    expect(out).toHaveLength(4);
    expect(out.find((r) => r.name === "Frank J. Mrvan")?.isIncumbent).toBe(
      true,
    );
    expect(
      out.find((r) => r.name === "Alexander R. (Alex) Degman")?.ballotStatus,
    ).toBe("write_in_qualified");
  });

  it("IN-02: Libertarian nominee William Eric Henry renders qualified_for_general_ballot with party LIB", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      IN_STATE,
      "house",
      "02",
      IN_ELECTION_YEAR,
    );
    const henry = out.find((r) => r.name === "William Eric Henry");
    expect(henry?.party).toBe("LIB");
    expect(henry?.ballotStatus).toBe("qualified_for_general_ballot");
  });

  it("returns [] for (senate, null) — no IN senate rows exist in the fixture", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const senate = await getOfficialRoster(
      IN_STATE,
      "senate",
      null,
      IN_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — IN", () => {
  it("returns true for all 9 IN districts' sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(IN_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          IN_STATE,
          "house",
          district,
          IN_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });
});

describe("lookupChallengers — IN wiring (house-only, no senate contest)", () => {
  it("IN-01: incumbent Frank J. Mrvan excluded; the 3 other filers (incl. 2 write-ins) all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => inDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (IN has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("IN", 1, 2026);

    expect(out.house.some((c) => c.name === "Frank J. Mrvan")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Barb Regnitz",
        "Alexander R. (Alex) Degman",
        "Prescription Dope Deaths Johnson, Jr.",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("IN-09: incumbent Erin Houchin excluded; the 3 other filers (incl. write-in + Libertarian) all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "09",
    ).map((e, i) => inDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("IN", 9, 2026);

    expect(out.house.some((c) => c.name === "Erin Houchin")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Brad A. Meyer", "Floyd Michael Taylor", "Tonya L. Hudson"].sort(),
    );
  });
});

describe("lookupChallengers — GA wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = GA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => gaDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, GA_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("GA", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Bishop excluded; the REP nominee still renders.
    expect(out.house.some((c) => c.name === "Sanford Bishop")).toBe(false);
    expect(out.house.map((c) => c.name)).toEqual(["Matt Day"]);
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("every GA district with a documented incumbent excludes them, every other nominee renders", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    for (const [district, incumbentName] of Object.entries(
      GA_INCUMBENT_SAMPLE,
    )) {
      const houseRows = GA_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e, i) => gaDbRow(e, i, "house"));
      mockedGetDb.mockReturnValue(
        makeSequencedDbMock([houseRows, GA_SENATE_DB_ROWS]),
      );

      const out = await lookupChallengers("GA", Number(district), 2026);

      expect(out.house.some((c) => c.name === incumbentName)).toBe(false);
      const expectedChallengers = GA_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district && e.name !== incumbentName,
      ).map((e) => e.name);
      expect(out.house.map((c) => c.name).sort()).toEqual(
        [...expectedChallengers].sort(),
      );
    }
  });

  it("open-seat districts (01, 10, 11, 13): no incumbent to exclude, both nominees render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    for (const district of GA_OPEN_SEAT_DISTRICTS) {
      const houseRows = GA_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e, i) => gaDbRow(e, i, "house"));
      mockedGetDb.mockReturnValue(
        makeSequencedDbMock([houseRows, GA_SENATE_DB_ROWS]),
      );

      const out = await lookupChallengers("GA", Number(district), 2026);

      const expectedNames = GA_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.house.map((c) => c.name).sort()).toEqual(
        [...expectedNames].sort(),
      );
    }
  });

  it("senate: incumbent Ossoff excluded; the REP nominee renders as a challenger", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = GA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => gaDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, GA_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("GA", 2, 2026);

    expect(out.senate.some((c) => c.name === "Jon Ossoff")).toBe(false);
    expect(out.senate.map((c) => c.name)).toEqual(["Mike Collins"]);
  });
});

// ---------------------------------------------------------------------------
// Iowa (IA) — 4 US House districts + US Senate, all determined
// (qualified_for_general_ballot) as of this fixture's retrieval date; the
// June 2, 2026 primary has already passed and no runoff/convention contest
// is pending. IA-2 (Hinson filed for Senate instead) and IA-4 (Feenstra not
// seeking re-election) are open seats — see
// docs/operations/iowa-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — IA narrowing", () => {
  it("narrows house rows to the exact district for all 4 IA districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IA_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04"]) {
      const out = await getOfficialRoster(
        IA_STATE,
        "house",
        district,
        IA_ELECTION_YEAR,
      );
      const expectedNames = IA_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("narrows senate rows (district null) to all 3 IA Senate filers", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IA_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      IA_STATE,
      "senate",
      null,
      IA_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(IA_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...IA_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );
  });

  it("every IA house row is qualified_for_general_ballot — no pending nomination this cycle", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IA_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      IA_STATE,
      "house",
      "01",
      IA_ELECTION_YEAR,
    );
    expect(
      house.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — IA", () => {
  it("returns true for IA-1 and IA-3's sitting incumbents", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IA_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      IA_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          IA_STATE,
          "house",
          district,
          IA_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for IA-2 and IA-4 — open seats, sitting incumbent not a candidate for their own district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IA_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        IA_STATE,
        "house",
        "02",
        IA_ELECTION_YEAR,
        "Ashley Hinson",
      ),
    ).toBe(false);
    expect(
      await isIncumbentSeekingReelection(
        IA_STATE,
        "house",
        "04",
        IA_ELECTION_YEAR,
        "Randy Feenstra",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — IA wiring (house + senate both covered)", () => {
  it("IA-1: incumbent Miller-Meeks excluded; the other 2 filers render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => iaDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, IA_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("IA", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    expect(out.house.some((c) => c.name === "Mariannette Miller-Meeks")).toBe(
      false,
    );
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Christina Bohannan", "Michael Bridgford"].sort(),
    );
  });

  it("IA-2 (open seat, Hinson filed for Senate instead): all 4 filers render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => iaDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IA_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IA", 2, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Dave Bushaw", "Joe Mitchell", "Lindsay James", "Rick Stewart"].sort(),
    );
  });

  it("IA-4 (open seat, Feenstra not seeking re-election): both filers render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "04",
    ).map((e, i) => iaDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IA_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IA", 4, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Chris McGowan", "Dave Dawson"].sort(),
    );
  });

  it("senate: all 3 determined nominees render, none flagged incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IA_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => iaDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IA_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IA", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Ashley Hinson", "Josh Turek", "Thomas Laehn"].sort(),
    );
    for (const c of out.senate) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });
});

// ---------------------------------------------------------------------------
// Kansas (KS) — thirteenth state built through this pipeline. The August 4,
// 2026 primary had not yet occurred at transcription time, so every
// contested Democratic/Republican filer (including KS-2's sole Democratic
// filer, Don Coover — Kansas does not cancel an uncontested primary) is
// qualified_for_primary_ballot; every Libertarian filer bypasses the
// primary entirely (nominated by convention) and is
// qualified_for_general_ballot. Kansas has no primary runoff, so no
// runoff_pending rows appear anywhere in this fixture. See
// docs/operations/kansas-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — KS narrowing", () => {
  it("narrows house rows to the exact district for all 4 KS districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KS_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04"]) {
      const out = await getOfficialRoster(
        KS_STATE,
        "house",
        district,
        KS_ELECTION_YEAR,
      );
      const expectedNames = KS_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns all 14 KS senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KS_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      KS_STATE,
      "senate",
      null,
      KS_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(KS_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...KS_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      KS_STATE,
      "house",
      "01",
      KS_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("KS-2: Don Coover is the sole Democratic filer but still qualified_for_primary_ballot — Kansas does not cancel an uncontested primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KS_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      KS_STATE,
      "house",
      "02",
      KS_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "Don Coover")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
  });

  it("every Libertarian filer is qualified_for_general_ballot (bypasses the primary); every DEM/REP filer is qualified_for_primary_ballot; no runoff_pending rows exist anywhere", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([...KS_HOUSE_DB_ROWS, ...KS_SENATE_DB_ROWS]),
    );
    const allRows = [...KS_HOUSE_ROSTER_2026, ...KS_SENATE_ROSTER_2026];
    expect(allRows.some((e) => e.ballotStatus === "runoff_pending")).toBe(
      false,
    );
    for (const e of allRows) {
      if (e.party === "LIB") {
        expect(e.ballotStatus).toBe("qualified_for_general_ballot");
      } else {
        expect(e.ballotStatus).toBe("qualified_for_primary_ballot");
      }
    }
  });
});

describe("isIncumbentSeekingReelection — KS", () => {
  it("returns true for all 4 KS House districts' sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KS_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(KS_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          KS_STATE,
          "house",
          district,
          KS_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns true for the Senate seat — Roger Marshall (sitting senator) filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KS_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        KS_STATE,
        "senate",
        null,
        KS_ELECTION_YEAR,
        "Roger Marshall",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — KS wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => ksDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, KS_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("KS", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Schmidt excluded; Coover (DEM, primary-stage), Young (REP,
    // primary-stage), and Hauer (LIB, general-stage) all render.
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Don Coover", "Chad E Young", "John Hauer"].sort(),
    );
    expect(out.house.some((c) => c.name === "Derek Schmidt")).toBe(false);
    for (const c of out.house) {
      expect(c.isRunoffPending).toBe(false);
    }
  });

  it("KS-4: incumbent Estes excluded; the 4 Democratic primary filers, the Republican primary filer, and the Libertarian general filer all render, none flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "04",
    ).map((e, i) => ksDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, KS_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("KS", 4, 2026);

    expect(out.house.some((c) => c.name === "Ron Estes")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Chris Carmichael",
        "Cole Epley",
        "Ryan Gilbert",
        "Katy Tyndell",
        "Frank A. McCollum",
        "Drew Cranmer",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.isRunoffPending).toBe(false);
    }
  });

  it("senate: incumbent Marshall excluded; the 11 Democratic primary filers, the Republican primary filer, and the Libertarian general filer all render, none flagged pending", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => ksDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, KS_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("KS", 2, 2026);

    expect(out.senate.some((c) => c.name === "Roger Marshall")).toBe(false);
    expect(out.senate).toHaveLength(KS_SENATE_ROSTER_2026.length - 1);
    expect(out.senate.find((c) => c.name === "Pond Naramore")?.party).toBe(
      "Republican",
    );
    expect(out.senate.find((c) => c.name === "David C Graham")?.party).toBe(
      "Libertarian",
    );
    for (const c of out.senate) {
      expect(c.isRunoffPending).toBe(false);
    }
  });
});

// Idaho — built with a certified May 19, 2026 primary already behind it
// (Idaho State Board of Canvassers certified June 9, 2026, no outcomes
// changed), so this fixture carries only determined general-ballot
// nominees, not primary-stage rows. Independent and Constitution Party
// (`CST`, a new party code added for this build) filers go straight to the
// general — Idaho's official primary-results system has no Independent or
// Constitution Party contest for either federal race. See
// docs/operations/idaho-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — ID narrowing", () => {
  it("narrows house rows to the exact district for both ID districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ID_HOUSE_DB_ROWS));
    for (const district of ["01", "02"]) {
      const out = await getOfficialRoster(
        ID_STATE,
        "house",
        district,
        ID_ELECTION_YEAR,
      );
      const expectedNames = ID_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 5 ID senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ID_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      ID_STATE,
      "senate",
      null,
      ID_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(ID_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...ID_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      ID_STATE,
      "house",
      "01",
      ID_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("ID-2's Constitution Party filer (C. Sierra - ID Law - Idaho Lorax) carries party CST and qualified_for_general_ballot, having bypassed a primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ID_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      ID_STATE,
      "house",
      "02",
      ID_ELECTION_YEAR,
    );
    const lorax = out.find(
      (r) => r.name === "C. Sierra - ID Law - Idaho Lorax",
    );
    expect(lorax?.party).toBe("CST");
    expect(lorax?.ballotStatus).toBe("qualified_for_general_ballot");
  });
});

describe("isIncumbentSeekingReelection — ID", () => {
  it("returns true for both ID districts — Fulcher (ID-1) and Simpson (ID-2) each won their certified primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ID_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      ID_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          ID_STATE,
          "house",
          district,
          ID_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns true for the US Senate seat — Risch (sitting senator) won his certified primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(ID_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        ID_STATE,
        "senate",
        null,
        ID_ELECTION_YEAR,
        "Jim Risch",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — ID wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ID_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => idDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, ID_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("ID", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Fulcher excluded; every other ID-1 filer renders.
    expect(out.house.some((c) => c.name === "Russ Fulcher")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Kaylee Peterson", "Sarah Zabel", "Brendan J. Gomez"].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("ID-2 (6 filers, the most crowded ID race): incumbent Simpson excluded, every other filer renders as a challenger", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ID_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => idDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, ID_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("ID", 2, 2026);

    expect(out.house.some((c) => c.name === "Mike Simpson")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Ellie Gilbreath",
        "Will Johanson",
        "C. Sierra - ID Law - Idaho Lorax",
        "Emre Houser",
        "Tripp Charles Hutchinson",
      ].sort(),
    );
  });

  it("senate: incumbent Risch excluded; Roth, Loesby, Fleming, and Achilles all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = ID_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => idDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, ID_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("ID", 1, 2026);

    expect(out.senate.some((c) => c.name === "Jim Risch")).toBe(false);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      [
        "David Roth",
        "Matt Loesby",
        "Natalie M Fleming",
        "Todd Achilles",
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Maryland (MD) — house-only, no US Senate contest exists in 2026
// (Alsobrooks's seat runs through 2031, Van Hollen's through 2029 — see the
// fixture's docblock). Maryland's June 23, 2026 primary has already
// occurred; nominees below are recorded per the official results
// dashboard's all-precincts-reporting numbers (refreshed 2026-07-10). CD5 is
// the sole open seat (incumbent Steny Hoyer not seeking re-election) — see
// docs/operations/maryland-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — MD narrowing", () => {
  it("narrows house rows to the exact district for every MD district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
      const out = await getOfficialRoster(
        MD_STATE,
        "house",
        district,
        MD_ELECTION_YEAR,
      );
      const expectedNames = MD_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("MD-01: incumbent Andy Harris (REP), challenger Dan Schwartz (DEM, qualified_for_general_ballot), and write-in Edward Shlikas (IND, write_in_qualified)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MD_STATE,
      "house",
      "01",
      MD_ELECTION_YEAR,
    );
    expect(out).toHaveLength(3);
    expect(out.find((r) => r.name === "Andy Harris")?.isIncumbent).toBe(true);
    expect(out.find((r) => r.name === "Edward Shlikas")?.ballotStatus).toBe(
      "write_in_qualified",
    );
    expect(out.find((r) => r.name === "Edward Shlikas")?.party).toBe("IND");
  });

  it("MD-05: open seat — 5 rows (2 major-party nominees, 2 declared_general_ballot_intent Unaffiliated petition filers, 1 write-in), none carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MD_STATE,
      "house",
      "05",
      MD_ELECTION_YEAR,
    );
    expect(out).toHaveLength(5);
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(
      out
        .filter((r) => r.ballotStatus === "declared_general_ballot_intent")
        .map((r) => r.name)
        .sort(),
    ).toEqual(["Brian S. Jordan", "Jonathan Burruss"].sort());
    expect(out.find((r) => r.name === "Mildred Marie Hall")?.ballotStatus).toBe(
      "write_in_qualified",
    );
    expect(out.find((r) => r.name === "Mildred Marie Hall")?.party).toBeNull();
  });

  it("MD-06 and MD-08: Green Party filers 'seeking the nomination' recorded declared_general_ballot_intent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    const cd6 = await getOfficialRoster(
      MD_STATE,
      "house",
      "06",
      MD_ELECTION_YEAR,
    );
    const cd8 = await getOfficialRoster(
      MD_STATE,
      "house",
      "08",
      MD_ELECTION_YEAR,
    );
    expect(cd6.find((r) => r.name === "Moshe Y. Landman")).toMatchObject({
      party: "GRE",
      ballotStatus: "declared_general_ballot_intent",
    });
    expect(cd8.find((r) => r.name === "Nancy Wallace")).toMatchObject({
      party: "GRE",
      ballotStatus: "declared_general_ballot_intent",
    });
  });

  it("returns [] for (senate, null) — no MD senate rows exist in the fixture", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const senate = await getOfficialRoster(
      MD_STATE,
      "senate",
      null,
      MD_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — MD", () => {
  it("returns true for every district whose sitting incumbent filed for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(MD_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          MD_STATE,
          "house",
          district,
          MD_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for CD5 (Hoyer not a candidate — open seat)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MD_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MD_STATE,
        "house",
        "05",
        MD_ELECTION_YEAR,
        "Steny Hoyer",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — MD wiring (house-only, no senate contest)", () => {
  it("MD-01: incumbent Andy Harris excluded; Dan Schwartz and write-in Edward Shlikas render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MD_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => mdDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (MD has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("MD", 1, 2026);

    expect(out.house.some((c) => c.name === "Andy Harris")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Dan Schwartz", "Edward Shlikas"].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("MD-05 (open seat): all 5 filers render as challengers, no incumbent excluded", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MD_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "05",
    ).map((e, i) => mdDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("MD", 5, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Adrian Boafo",
        "Chris Chaffee",
        "Brian S. Jordan",
        "Jonathan Burruss",
        "Mildred Marie Hall",
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Kentucky — tenth state built through this pipeline. Not Civix-vended (a
// plain server-rendered SoS portal); the "2026 General Election" filing
// list is already the settled post-primary nominee set (May 19, 2026
// primary already occurred). Two open seats for two different reasons:
// KY-4 (sitting Rep. Massie lost his own primary to Gallrein) and KY-6
// (sitting Rep. Barr filed for Senate instead). See
// docs/operations/kentucky-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — KY narrowing", () => {
  it("narrows house rows to the exact district for every KY district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06"]) {
      const out = await getOfficialRoster(
        KY_STATE,
        "house",
        district,
        KY_ELECTION_YEAR,
      );
      const expectedNames = KY_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 4 KY senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      KY_STATE,
      "senate",
      null,
      KY_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(KY_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...KY_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      KY_STATE,
      "house",
      "01",
      KY_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("every KY row is qualified_for_general_ballot, declared_general_ballot_intent, or write_in_qualified — no runoff_pending anywhere (KY has no federal runoff primary)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      KY_STATE,
      "house",
      "01",
      KY_ELECTION_YEAR,
    );
    expect(
      house.every((r) =>
        [
          "qualified_for_general_ballot",
          "declared_general_ballot_intent",
          "write_in_qualified",
        ].includes(r.ballotStatus),
      ),
    ).toBe(true);
  });

  it("Kentucky Party nominees (Ahmad, Lynch, Campbell) carry party KYP", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    const d4 = await getOfficialRoster(
      KY_STATE,
      "house",
      "04",
      KY_ELECTION_YEAR,
    );
    expect(d4.find((r) => r.name === "Mohammad Wael Ahmad")?.party).toBe("KYP");
    const d6 = await getOfficialRoster(
      KY_STATE,
      "house",
      "06",
      KY_ELECTION_YEAR,
    );
    expect(d6.find((r) => r.name === "Pete Lynch")?.party).toBe("KYP");

    mockedGetDb.mockReturnValue(makeDbMock(KY_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      KY_STATE,
      "senate",
      null,
      KY_ELECTION_YEAR,
    );
    expect(senate.find((r) => r.name === "Christopher Campbell")?.party).toBe(
      "KYP",
    );
  });

  it("declared write-in candidates (Wilson KY-5, Quigley KY-6, Murphy Senate) carry party null and write_in_qualified", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    const d5 = await getOfficialRoster(
      KY_STATE,
      "house",
      "05",
      KY_ELECTION_YEAR,
    );
    const wilson = d5.find((r) => r.name === "Billy Ray Wilson");
    expect(wilson?.party).toBeNull();
    expect(wilson?.ballotStatus).toBe("write_in_qualified");

    const d6 = await getOfficialRoster(
      KY_STATE,
      "house",
      "06",
      KY_ELECTION_YEAR,
    );
    const quigley = d6.find((r) => r.name === "Robert Quigley");
    expect(quigley?.party).toBeNull();
    expect(quigley?.ballotStatus).toBe("write_in_qualified");

    mockedGetDb.mockReturnValue(makeDbMock(KY_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      KY_STATE,
      "senate",
      null,
      KY_ELECTION_YEAR,
    );
    const murphy = senate.find((r) => r.name === "Thomas Michael Murphy");
    expect(murphy?.party).toBeNull();
    expect(murphy?.ballotStatus).toBe("write_in_qualified");
  });
});

describe("isIncumbentSeekingReelection — KY", () => {
  it("returns true for KY-1, KY-2, KY-3, KY-5 — the winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      KY_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          KY_STATE,
          "house",
          district,
          KY_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for KY-4 — Massie (sitting rep) lost his own primary to Gallrein, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        KY_STATE,
        "house",
        "04",
        KY_ELECTION_YEAR,
        "Thomas Massie",
      ),
    ).toBe(false);
  });

  it("returns false for KY-6 — Barr (sitting rep) filed for Senate instead, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        KY_STATE,
        "house",
        "06",
        KY_ELECTION_YEAR,
        "Andy Barr",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — McConnell (sitting senator) did not file for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(KY_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        KY_STATE,
        "senate",
        null,
        KY_ELECTION_YEAR,
        "Mitch McConnell",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — KY wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KY_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => kyDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, KY_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("KY", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Comer excluded; the Democratic nominee is the sole
    // challenger (no independent/minor-party filer in KY-1).
    expect(out.house.map((c) => c.name)).toEqual(['John "Drew" Williams']);
  });

  it("KY-4 (open seat, incumbent defeated in primary): all 4 filers render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KY_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "04",
    ).map((e, i) => kyDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, KY_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("KY", 4, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Ed Gallrein",
        "Jeremy Todd",
        "Melissa Claire Strange",
        "Mohammad Wael Ahmad",
      ].sort(),
    );
    expect(out.house.some((c) => c.name === "Thomas Massie")).toBe(false);
  });

  it("KY-6 (open seat, incumbent ran for Senate instead): all 5 filers render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KY_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "06",
    ).map((e, i) => kyDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, KY_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("KY", 6, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Jay J Bowman",
        "Pete Lynch",
        "Ralph Alvarado",
        "Robert Quigley",
        "Zach Dembo",
      ].sort(),
    );
    expect(out.house.some((c) => c.name === "Andy Barr")).toBe(false);
  });

  it("senate: all four filers render, none excluded (open seat, no incumbent), Barr's party maps to Republican not treated as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = KY_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => kyDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, KY_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("KY", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      KY_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
    expect(out.senate.find((c) => c.name === "Andy Barr")?.party).toBe(
      "Republican",
    );
    expect(
      out.senate.find((c) => c.name === "Christopher Campbell")?.party,
    ).toBe("Kentucky Party");
  });
});

// ---------------------------------------------------------------------------
// Nebraska (NE) — all 3 US House districts + the 2026 US Senate race
// (Ricketts's seat). NE-01 and NE-03 are held by the sitting incumbent;
// NE-02 is an open seat (Bacon did not file). 5 independent/nonpartisan
// petition filers (incl. Senate candidate Dan Osborn) are recorded
// `declared_general_ballot_intent`, not yet qualified. See
// docs/operations/nebraska-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — NE narrowing", () => {
  it("narrows house rows to the exact district for all 3 NE districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03"]) {
      const out = await getOfficialRoster(
        NE_STATE,
        "house",
        district,
        NE_ELECTION_YEAR,
      );
      const expectedNames = NE_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("NE-02 (open seat): 4 rows, no isIncumbent true anywhere", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      NE_STATE,
      "house",
      "02",
      NE_ELECTION_YEAR,
    );
    expect(out).toHaveLength(4);
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(
      out.find((r) => r.name === "Christopher J. Feuerbach")?.ballotStatus,
    ).toBe("declared_general_ballot_intent");
  });

  it("NE-03: Legal Marijuana NOW nominee renders qualified_for_general_ballot with party LMN", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      NE_STATE,
      "house",
      "03",
      NE_ELECTION_YEAR,
    );
    const else_ = out.find((r) => r.name === "David J. Else");
    expect(else_?.party).toBe("LMN");
    expect(else_?.ballotStatus).toBe("qualified_for_general_ballot");
    // Two pending independent petition filers on this district, neither
    // promoted past declared_general_ballot_intent.
    expect(
      out
        .filter((r) => r.ballotStatus === "declared_general_ballot_intent")
        .map((r) => r.name)
        .sort(),
    ).toEqual(["Macey Budke", "Mark Cohen"].sort());
  });

  it("senate: Osborn is declared_general_ballot_intent, not qualified", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      NE_STATE,
      "senate",
      null,
      NE_ELECTION_YEAR,
    );
    expect(out).toHaveLength(4);
    const osborn = out.find((r) => r.name === "Dan Osborn");
    expect(osborn?.ballotStatus).toBe("declared_general_ballot_intent");
    expect(out.find((r) => r.name === "Pete Ricketts")?.isIncumbent).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — NE", () => {
  it("returns true for NE-01 and NE-03's sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(NE_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          NE_STATE,
          "house",
          district,
          NE_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for NE-02 — Bacon (sitting rep) did not file, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        NE_STATE,
        "house",
        "02",
        NE_ELECTION_YEAR,
        "Don Bacon",
      ),
    ).toBe(false);
  });

  it("returns true for the US Senate seat — sitting Senator Ricketts is a determined nominee", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NE_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        NE_STATE,
        "senate",
        null,
        NE_ELECTION_YEAR,
        "Pete Ricketts",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — NE wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NE_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => neDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, NE_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("NE", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Flood excluded; the other 3 filers render as challengers
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Chris Backemeyer", "Nik Sandman", "Austin Ahlman"].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("NE-02 (open seat): all 4 filers render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NE_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => neDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NE_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NE", 2, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Brinker Harding",
        "Denise Powell",
        "Eric Michael Foreman",
        "Christopher J. Feuerbach",
      ].sort(),
    );
  });

  it("senate: Ricketts excluded as incumbent, Burbank/Marvin/Osborn all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NE_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => neDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NE_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NE", 1, 2026);

    expect(out.senate.some((c) => c.name === "Pete Ricketts")).toBe(false);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Cindy Burbank", "Mike Marvin", "Dan Osborn"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Missouri (MO) — house-only, no US Senate contest exists in 2026 (Hawley's
// Class 1 seat runs to 2031, Schmitt's Class 3 seat to 2029). All 8
// districts' rows are PRE-primary (STAGE = "primary") — the August 4, 2026
// primary has not yet occurred, so every row is qualified_for_primary_ballot,
// never qualified_for_general_ballot. District 06 is a genuine open seat:
// sitting incumbent Sam Graves withdrew his 2026 candidacy. See
// docs/operations/missouri-vertical-slice-data-check.md for the full build,
// including the SOS's own 61-candidate summary-table cross-check and the
// house.gov incumbency cross-check (via browser automation — house.gov 403s
// a plain fetch).
// ---------------------------------------------------------------------------

describe("getOfficialRoster — MO narrowing", () => {
  it("narrows house rows to the exact district for all 8 MO districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MO_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
      const out = await getOfficialRoster(
        MO_STATE,
        "house",
        district,
        MO_ELECTION_YEAR,
      );
      const expectedNames = MO_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("MO-01: 8 rows, all qualified_for_primary_ballot; incumbent Wesley Bell present alongside challenger Cori Bush", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MO_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MO_STATE,
      "house",
      "01",
      MO_ELECTION_YEAR,
    );
    expect(out).toHaveLength(8);
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
    expect(out.find((r) => r.name === "Wesley Bell")?.isIncumbent).toBe(true);
    expect(out.find((r) => r.name === "Cori Bush")?.isIncumbent).toBe(false);
  });

  it("MO-06: open seat — no row carries isIncumbent true", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MO_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MO_STATE,
      "house",
      "06",
      MO_ELECTION_YEAR,
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
  });

  it("returns [] for (senate, null) — no MO senate rows exist in the fixture", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const senate = await getOfficialRoster(
      MO_STATE,
      "senate",
      null,
      MO_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — MO", () => {
  it("returns true for the 7 MO districts with a sitting incumbent seeking re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MO_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(MO_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          MO_STATE,
          "house",
          district,
          MO_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for MO-06 — open seat, no sitting member among the filers", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MO_HOUSE_DB_ROWS));
    for (const district of MO_OPEN_SEAT_DISTRICTS) {
      const rows = MO_HOUSE_ROSTER_2026.filter((e) => e.district === district);
      expect(rows.every((r) => r.isIncumbent === false)).toBe(true);
    }
  });
});

describe("lookupChallengers — MO wiring (house-only, no senate contest)", () => {
  it("MO-01: incumbent Wesley Bell excluded; the 7 other filers (incl. challenger Cori Bush) all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MO_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => moDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (MO has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("MO", 1, 2026);

    expect(out.house.some((c) => c.name === "Wesley Bell")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Paul Berry III",
        "Andrew Jones",
        "Alissa Murphy",
        "Carl E. Harris Sr",
        "Cori Bush",
        "Carl Earnest Henderson",
        "Tom Schmitz",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("MO-06 (open seat): no incumbent excluded, all 9 filers render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MO_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "06",
    ).map((e, i) => moDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("MO", 6, 2026);

    expect(out.house).toHaveLength(9);
    expect(out.house.some((c) => c.name === "Sam Graves")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Minnesota (MN) — 8 US House districts + the 2026 US Senate race (Tina
// Smith's open Class 2 seat). STAGE = "primary": Minnesota's August 11,
// 2026 primary is still upcoming, so almost every contested party primary
// (>1 filer) is recorded qualified_for_primary_ballot, not runoff_pending —
// Minnesota has no runoff mechanism. A party with exactly one filer for a
// seat has no primary contest and is recorded qualified_for_general_ballot
// directly. MN-02 is the only open House seat (Craig filed for the open
// Senate seat instead). See
// docs/operations/minnesota-vertical-slice-data-check.md for the full
// build, including the operational-navigation write-up for
// candidates.sos.mn.gov (not Civix-vended).
// ---------------------------------------------------------------------------

describe("getOfficialRoster — MN narrowing", () => {
  it("narrows house rows to the exact district for all 8 MN districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04", "05", "06", "07", "08"]) {
      const out = await getOfficialRoster(
        MN_STATE,
        "house",
        district,
        MN_ELECTION_YEAR,
      );
      const expectedNames = MN_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 17 MN senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      MN_STATE,
      "senate",
      null,
      MN_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(MN_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...MN_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      MN_STATE,
      "house",
      "01",
      MN_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("MN-01: incumbent Finstad and both primary challengers all carry qualified_for_primary_ballot — no nominee is yet determined", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MN_STATE,
      "house",
      "01",
      MN_ELECTION_YEAR,
    );
    expect(out).toHaveLength(5);
    expect(out.find((r) => r.name === "Brad Finstad")?.isIncumbent).toBe(true);
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });

  it("MN-02 (open seat): sole Republican filer Eric Pratt carries qualified_for_general_ballot; the 6-way contested DFL primary all carry qualified_for_primary_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MN_STATE,
      "house",
      "02",
      MN_ELECTION_YEAR,
    );
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(out.find((r) => r.name === "Eric Pratt")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    const dflFilers = out.filter((r) => r.party === "DFL");
    expect(dflFilers).toHaveLength(6);
    expect(
      dflFilers.every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });

  it("MN-05: sole Independent filer DeVelle L. Jackson carries qualified_for_general_ballot (not declared_general_ballot_intent) alongside incumbent Omar's contested DFL primary", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MN_STATE,
      "house",
      "05",
      MN_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "DeVelle L. Jackson")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(out.find((r) => r.name === "Ilhan Omar")?.isIncumbent).toBe(true);
    expect(out.find((r) => r.name === "Ilhan Omar")?.ballotStatus).toBe(
      "qualified_for_primary_ballot",
    );
  });

  it("senate: open seat (no isIncumbent row); Independent and Libertarian sole filers carry qualified_for_general_ballot, both major-party fields carry qualified_for_primary_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      MN_STATE,
      "senate",
      null,
      MN_ELECTION_YEAR,
    );
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(out.find((r) => r.name === "Marisa Simonetti")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(out.find((r) => r.name === "Rebecca Whiting")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
    expect(
      out
        .filter((r) => r.party === "REP" || r.party === "DFL")
        .every((r) => r.ballotStatus === "qualified_for_primary_ballot"),
    ).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — MN", () => {
  it("returns true for MN-01, MN-03, MN-04, MN-05, MN-06, MN-07, MN-08 — the sitting incumbent filed in the same district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      MN_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          MN_STATE,
          "house",
          district,
          MN_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for MN-02 — Craig (sitting rep) filed for Senate instead, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MN_STATE,
        "house",
        "02",
        MN_ELECTION_YEAR,
        "Angie Craig",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — Tina Smith (sitting senator) did not file for reelection", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MN_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MN_STATE,
        "senate",
        null,
        MN_ELECTION_YEAR,
        "Tina Smith",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — MN wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => mnDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, MN_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("MN", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Finstad excluded; every other filer (both parties'
    // contested primaries) renders as a challenger.
    expect(out.house.some((c) => c.name === "Brad Finstad")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Gregory A. Goetzman",
        "Oliver R. Morlan",
        "Alex Eaton",
        "Jake Johnson",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("MN-02 (open seat): no incumbent excluded — the sole Republican filer and all 6 DFL primary filers all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => mnDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MN_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MN", 2, 2026);

    expect(out.house).toHaveLength(7);
    expect(out.house.some((c) => c.name === "Eric Pratt")).toBe(true);
  });

  it("senate (open seat): no incumbent excluded — every filer across all 4 party lines renders as a challenger, none flagged isRunoffPending (MN has no runoff mechanism)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => mnDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MN_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MN", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      MN_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
    expect(out.senate.find((c) => c.name === "Rebecca Whiting")?.party).toBe(
      "Libertarian",
    );
    expect(out.senate.find((c) => c.name === "Marisa Simonetti")?.party).toBe(
      "Independent",
    );
    expect(out.senate.every((c) => c.isRunoffPending === false)).toBe(true);
  });
});

describe("getOfficialRoster — IL narrowing", () => {
  it("narrows house rows to the exact district for every one of the 17 IL districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_HOUSE_DB_ROWS));
    const districts = Array.from({ length: 17 }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    );
    for (const district of districts) {
      const out = await getOfficialRoster(
        IL_STATE,
        "house",
        district,
        IL_ELECTION_YEAR,
      );
      const expectedNames = IL_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 3 IL senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      IL_STATE,
      "senate",
      null,
      IL_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(IL_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...IL_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      IL_STATE,
      "house",
      "01",
      IL_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("IL-4's two independents with a pending ballot-access objection carry declared_general_ballot_intent, not qualified_for_general_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      IL_STATE,
      "house",
      "04",
      IL_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "Mayra Macias")?.ballotStatus).toBe(
      "declared_general_ballot_intent",
    );
    expect(out.find((r) => r.name === "Byron Sigcho Lopez")?.ballotStatus).toBe(
      "declared_general_ballot_intent",
    );
    // Getty, the third IL-4 independent, has no pending objection — fully
    // qualified.
    expect(out.find((r) => r.name === "Chris Getty")?.ballotStatus).toBe(
      "qualified_for_general_ballot",
    );
  });

  it("senate: Durbin's open seat has no incumbent row; the DEM nominee (sitting Lt. Governor Stratton) carries isIncumbent false for THIS Senate contest", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_SENATE_DB_ROWS));
    const out = await getOfficialRoster(
      IL_STATE,
      "senate",
      null,
      IL_ELECTION_YEAR,
    );
    expect(out.every((r) => r.isIncumbent === false)).toBe(true);
    expect(out.find((r) => r.name === "Juliana Stratton")).toBeDefined();
  });
});

describe("isIncumbentSeekingReelection — IL", () => {
  it("returns true for the sample of IL districts whose nominee is a sitting incumbent, cross-checked by full name against house.gov (not district number/surname alone — see the fixture's IL-4 Garcia near-miss)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      IL_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          IL_STATE,
          "house",
          district,
          IL_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for the open-seat districts — the sitting member is not among the filers", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_HOUSE_DB_ROWS));
    for (const district of IL_OPEN_SEAT_DISTRICTS) {
      const rows = IL_HOUSE_ROSTER_2026.filter((e) => e.district === district);
      expect(rows.every((r) => r.isIncumbent === false)).toBe(true);
    }
  });

  it("IL-4: checking against Jesús García (the district's former surname-sharing sitting member, NOT the DEM nominee Patty Garcia) returns false — no incumbent row exists for this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        IL_STATE,
        "house",
        "04",
        IL_ELECTION_YEAR,
        "Jesus Garcia",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — Durbin (retiring) is not among the filers", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IL_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        IL_STATE,
        "senate",
        null,
        IL_ELECTION_YEAR,
        "Dick Durbin",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — IL wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => ilDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, IL_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("IL", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Jackson excluded; the REP filer remains.
    expect(out.house.some((c) => c.name === "Jonathan L. Jackson")).toBe(false);
    expect(out.house.map((c) => c.name)).toEqual(["Christian Maxwell"]);
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("IL-4 (open seat, no incumbent): all 6 filers render as challengers, including the two independents with a pending ballot-access objection", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "04",
    ).map((e, i) => ilDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IL", 4, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Patty Garcia",
        "Lupe Castillo",
        "Ed Hershey",
        "Chris Getty",
        "Mayra Macias",
        "Byron Sigcho Lopez",
      ].sort(),
    );
  });

  it("IL-12 (Bost, incumbent): Bost excluded; the DEM challenger renders", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "12",
    ).map((e, i) => ilDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IL", 12, 2026);

    expect(out.house.some((c) => c.name === "Mike Bost")).toBe(false);
    expect(out.house.map((c) => c.name)).toEqual(["Julie Fortier"]);
  });

  it("senate: Durbin's open seat has no incumbent to exclude; all 3 ballot-qualified filers render (Removed filer Muhammad is not in the fixture)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IL_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => ilDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, IL_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("IL", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Juliana Stratton", "Don Tracy", "Whitfield Harrington Jr."].sort(),
    );
  });
});

// (candidatefiling.mt.gov) already carries a live NOMINATED/FILED/Withdrawn/
// PENDING PETITION status per filer, and Montana has no primary-runoff
// mechanism (src/data/states/MT.json's runoffRules.hasRunoff: false), so
// every nomination below is fully determined — no runoff_pending rows. Two
// open seats (MT-01, Senate) both stem from a real, non-obvious incumbency
// finding: sitting Rep. Zinke and sitting Sen. Daines each declined to seek
// re-election to their own seat, confirmed independently (never guessed) via
// GovTrack/congress.gov. See
// docs/operations/montana-vertical-slice-data-check.md for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — MT narrowing", () => {
  it("narrows house rows to the exact district for both MT districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_HOUSE_DB_ROWS));
    for (const district of ["01", "02"]) {
      const out = await getOfficialRoster(
        MT_STATE,
        "house",
        district,
        MT_ELECTION_YEAR,
      );
      const expectedNames = MT_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("MT-01 (open seat): 3 rows, all qualified_for_general_ballot — no independent (Persico did not qualify, omitted from the fixture)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MT_STATE,
      "house",
      "01",
      MT_ELECTION_YEAR,
    );
    expect(out).toHaveLength(3);
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
    expect(out.some((r) => r.name === "Kimberly A Persico")).toBe(false);
  });

  it("MT-02: incumbent Troy Downing plus the certified independent Michael D Eisenhauer both render qualified_for_general_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MT_STATE,
      "house",
      "02",
      MT_ELECTION_YEAR,
    );
    expect(out.find((r) => r.name === "Troy Downing")?.isIncumbent).toBe(true);
    const eisenhauer = out.find((r) => r.name === "Michael D Eisenhauer");
    expect(eisenhauer?.party).toBe("IND");
    expect(eisenhauer?.ballotStatus).toBe("qualified_for_general_ballot");
  });

  it("returns the 4 MT senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      MT_STATE,
      "senate",
      null,
      MT_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(MT_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...MT_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );
    expect(senate.every((r) => r.isIncumbent === false)).toBe(true);

    const houseInSenateRowset = await getOfficialRoster(
      MT_STATE,
      "house",
      "01",
      MT_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — MT", () => {
  it("returns true for MT-02 — the winning nominee is the sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      MT_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          MT_STATE,
          "house",
          district,
          MT_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for MT-01 — Zinke (sitting rep) did not seek re-election, no incumbent row on this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MT_STATE,
        "house",
        "01",
        MT_ELECTION_YEAR,
        "Ryan Zinke",
      ),
    ).toBe(false);
  });

  it("returns false for the US Senate seat — Daines (sitting senator) withdrew before filing", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MT_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MT_STATE,
        "senate",
        null,
        MT_ELECTION_YEAR,
        "Steve Daines",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — MT wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MT_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => mtDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, MT_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("MT", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Downing excluded; the Democratic nominee, Libertarian
    // nominee, and certified independent all render as challengers
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Brian J Miller", "Patrick McCracken", "Michael D Eisenhauer"].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("MT-01 (open seat): all 3 nominees render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MT_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => mtDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MT_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MT", 1, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Aaron Flint", "Sam Forstag", "Nick Sheedy"].sort(),
    );
  });

  it("senate (open seat): all 4 nominees, including the certified independent, render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MT_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => mtDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MT_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MT", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      MT_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
    expect(out.senate.find((c) => c.name === "Seth Bodnar")?.party).toBe(
      "Independent",
    );
    expect(out.senate.find((c) => c.name === "Kurt Alme")?.party).toBe(
      "Republican",
    );
    expect(out.senate.find((c) => c.name === "Alani Bankhead")?.party).toBe(
      "Democrat",
    );
  });
});

// ---------------------------------------------------------------------------
// Indiana (IN) — house-only, no US Senate contest exists in 2026 (both IN
// Senate seats are Class 1 / Class 3, not up this cycle). All 9 districts'
// nominees are post-primary (STAGE = "general") — the May 5, 2026 primary is
// fully certified. Every sitting incumbent won their own party's primary in
// the same district they currently hold. See
// docs/operations/indiana-vertical-slice-data-check.md for the full build,
// including the General Candidate List's federal-office publication gap
// (linked to an unrelated state-legislative recount) worked around via the
// state's own certified primary-results portal.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — IN narrowing", () => {
  it("narrows house rows to the exact district for all 9 IN districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    for (const district of Object.keys(IN_INCUMBENTS)) {
      const out = await getOfficialRoster(
        IN_STATE,
        "house",
        district,
        IN_ELECTION_YEAR,
      );
      const expectedNames = IN_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("IN-01: 4 rows (2 major-party nominees + 2 write-ins), all qualified_for_general_ballot or write_in_qualified", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      IN_STATE,
      "house",
      "01",
      IN_ELECTION_YEAR,
    );
    expect(out).toHaveLength(4);
    expect(out.find((r) => r.name === "Frank J. Mrvan")?.isIncumbent).toBe(
      true,
    );
    expect(
      out.find((r) => r.name === "Alexander R. (Alex) Degman")?.ballotStatus,
    ).toBe("write_in_qualified");
  });

  it("IN-02: Libertarian nominee William Eric Henry renders qualified_for_general_ballot with party LIB", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      IN_STATE,
      "house",
      "02",
      IN_ELECTION_YEAR,
    );
    const henry = out.find((r) => r.name === "William Eric Henry");
    expect(henry?.party).toBe("LIB");
    expect(henry?.ballotStatus).toBe("qualified_for_general_ballot");
  });

  it("returns [] for (senate, null) — no IN senate rows exist in the fixture", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const senate = await getOfficialRoster(
      IN_STATE,
      "senate",
      null,
      IN_ELECTION_YEAR,
    );
    expect(senate).toEqual([]);
  });
});

describe("isIncumbentSeekingReelection — IN", () => {
  it("returns true for all 9 IN districts' sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(IN_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(IN_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          IN_STATE,
          "house",
          district,
          IN_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });
});

describe("lookupChallengers — IN wiring (house-only, no senate contest)", () => {
  it("IN-01: incumbent Frank J. Mrvan excluded; the 3 other filers (incl. 2 write-ins) all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => inDbRow(e, i));
    // Sequenced: official house query -> houseRows, official senate query ->
    // [] (IN has 0 senate contests), FEC fallback (senate uncovered) -> [].
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("IN", 1, 2026);

    expect(out.house.some((c) => c.name === "Frank J. Mrvan")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      [
        "Barb Regnitz",
        "Alexander R. (Alex) Degman",
        "Prescription Dope Deaths Johnson, Jr.",
      ].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("IN-09: incumbent Erin Houchin excluded; the 3 other filers (incl. write-in + Libertarian) all render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = IN_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "09",
    ).map((e, i) => inDbRow(e, i));
    mockedGetDb.mockReturnValue(makeSequencedDbMock([houseRows, [], []]));

    const out = await lookupChallengers("IN", 9, 2026);

    expect(out.house.some((c) => c.name === "Erin Houchin")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Brad A. Meyer", "Floyd Michael Taylor", "Tonya L. Hudson"].sort(),
    );
  });
});

describe("getOfficialRoster — NJ narrowing", () => {
  it("narrows house rows to the exact district for all 12 NJ districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_HOUSE_DB_ROWS));
    for (const district of [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ]) {
      const out = await getOfficialRoster(
        NJ_STATE,
        "house",
        district,
        NJ_ELECTION_YEAR,
      );
      const expectedNames = NJ_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 4 NJ senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      NJ_STATE,
      "senate",
      null,
      NJ_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(NJ_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...NJ_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      NJ_STATE,
      "house",
      "01",
      NJ_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("NJ-08: no runoff_pending anywhere (NJ holds no primary runoffs) and no Republican nominee for this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      NJ_STATE,
      "house",
      "08",
      NJ_ELECTION_YEAR,
    );
    expect(out.some((r) => r.ballotStatus === "runoff_pending")).toBe(false);
    expect(out.some((r) => r.party === "REP")).toBe(false);
    expect(out.find((r) => r.name === "ROB MENENDEZ")?.isIncumbent).toBe(true);
  });
});

describe("isIncumbentSeekingReelection — NJ", () => {
  it("returns true for every NJ district except the NJ-12 open seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      NJ_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          NJ_STATE,
          "house",
          district,
          NJ_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for NJ-12 — Watson Coleman did not file for re-election, no incumbent row on this open seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_HOUSE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        NJ_STATE,
        "house",
        "12",
        NJ_ELECTION_YEAR,
        "Bonnie Watson Coleman",
      ),
    ).toBe(false);
  });

  it("returns true for the US Senate seat — Booker (sitting senator) is the Democratic nominee", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NJ_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        NJ_STATE,
        "senate",
        null,
        NJ_ELECTION_YEAR,
        "Cory Booker",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — NJ wiring (house + senate both covered)", () => {
  it("NJ-02: incumbent Van Drew excluded; the Democratic nominee and the declared independent both render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NJ_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => njDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, NJ_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("NJ", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    expect(out.house.some((c) => c.name === "JEFF VAN DREW")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["ZACK MULLOCK", "RAMON MORA JR."].sort(),
    );
    for (const c of out.house) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("NJ-12 (open seat): both major-party nominees and both minor-party filers render as challengers, none excluded as incumbent", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NJ_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "12",
    ).map((e, i) => njDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NJ_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NJ", 12, 2026);

    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["ADAM HAMAWY", "GREGG MELE", "ANDRES JINETE", "WINSTON JORDAN"].sort(),
    );
  });

  it("senate: incumbent Booker excluded; the Republican nominee and both declared minor-party filers render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NJ_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => njDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NJ_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NJ", 1, 2026);

    expect(out.senate.some((c) => c.name === "CORY BOOKER")).toBe(false);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["JUSTIN MURPHY", "VERONICA FERNANDEZ", "JOANNE KUNIANSKY"].sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// Mississippi (MS) — both chambers, general-stage (the March 10, 2026
// primary is already past, no runoff was needed for any congressional
// race). Every sitting incumbent (4 House + 1 Senate) won their own
// party's primary in their own seat — no open seats. See the fixture's own
// docblock and docs/operations/mississippi-vertical-slice-data-check.md
// for the full build.
// ---------------------------------------------------------------------------

describe("getOfficialRoster — MS narrowing", () => {
  it("narrows house rows to the exact district for all 4 MS districts", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_HOUSE_DB_ROWS));
    for (const district of ["01", "02", "03", "04"]) {
      const out = await getOfficialRoster(
        MS_STATE,
        "house",
        district,
        MS_ELECTION_YEAR,
      );
      const expectedNames = MS_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 3 MS senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      MS_STATE,
      "senate",
      null,
      MS_ELECTION_YEAR,
    );
    expect(senate.map((r) => r.name).sort()).toEqual(
      ["Cindy Hyde-Smith", "Scott Colom", "Ty Pinkins"].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      MS_STATE,
      "house",
      "01",
      MS_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("MS-01: 3 rows (incumbent Trent Kelly + Democratic + Libertarian nominees), all qualified_for_general_ballot", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MS_STATE,
      "house",
      "01",
      MS_ELECTION_YEAR,
    );
    expect(out.map((r) => r.name).sort()).toEqual(
      ["Trent Kelly", "Cliff Johnson", "Johnny Baucom"].sort(),
    );
    expect(out.find((r) => r.name === "Trent Kelly")?.isIncumbent).toBe(true);
    expect(
      out.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
  });

  it("MS-04: Independent filer Carl Boyanton renders qualified_for_general_ballot with party IND", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_HOUSE_DB_ROWS));
    const out = await getOfficialRoster(
      MS_STATE,
      "house",
      "04",
      MS_ELECTION_YEAR,
    );
    const boyanton = out.find((r) => r.name === "Carl Boyanton");
    expect(boyanton?.party).toBe("IND");
    expect(boyanton?.ballotStatus).toBe("qualified_for_general_ballot");
  });
});

describe("isIncumbentSeekingReelection — MS", () => {
  it("returns true for all 4 MS House districts' sitting incumbent", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(MS_INCUMBENTS)) {
      expect(
        await isIncumbentSeekingReelection(
          MS_STATE,
          "house",
          district,
          MS_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns true for the US Senate seat — sitting Senator Hyde-Smith filed for and won re-nomination", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(MS_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        MS_STATE,
        "senate",
        null,
        MS_ELECTION_YEAR,
        "Cindy Hyde-Smith",
      ),
    ).toBe(true);
  });
});

describe("lookupChallengers — MS wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "02",
    ).map((e, i) => msDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, MS_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("MS", 2, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Thompson excluded; the Republican nominee and the
    // Independent filer both render as challengers
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Ron Eller", "Bennie Foster"].sort(),
    );
    // incumbent Hyde-Smith excluded; the other two senate filers render as
    // challengers
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Scott Colom", "Ty Pinkins"].sort(),
    );
    for (const c of [...out.house, ...out.senate]) {
      expect(c.rosterProvenance.sourceKind).toBe("official_state_roster");
    }
  });

  it("MS-01: incumbent Trent Kelly excluded; Cliff Johnson and Johnny Baucom render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => msDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MS_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MS", 1, 2026);

    expect(out.house.some((c) => c.name === "Trent Kelly")).toBe(false);
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Cliff Johnson", "Johnny Baucom"].sort(),
    );
  });

  it("senate: incumbent Hyde-Smith excluded; Scott Colom and Ty Pinkins render as challengers", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = MS_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => msDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, MS_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("MS", 1, 2026);

    expect(out.senate.some((c) => c.name === "Cindy Hyde-Smith")).toBe(false);
    expect(out.senate.map((c) => c.name).sort()).toEqual(
      ["Scott Colom", "Ty Pinkins"].sort(),
    );
  });
});

describe("getOfficialRoster — NC narrowing", () => {
  it("narrows house rows to the exact district for every NC district", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_HOUSE_DB_ROWS));
    for (const district of [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
      "13",
      "14",
    ]) {
      const out = await getOfficialRoster(
        NC_STATE,
        "house",
        district,
        NC_ELECTION_YEAR,
      );
      const expectedNames = NC_HOUSE_ROSTER_2026.filter(
        (e) => e.district === district,
      ).map((e) => e.name);
      expect(out.map((r) => r.name).sort()).toEqual([...expectedNames].sort());
    }
  });

  it("returns the 4 NC senate rows for (senate, null), none for a house district in the same rowset", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      NC_STATE,
      "senate",
      null,
      NC_ELECTION_YEAR,
    );
    expect(senate).toHaveLength(NC_SENATE_ROSTER_2026.length);
    expect(senate.map((r) => r.name).sort()).toEqual(
      [...NC_SENATE_ROSTER_2026.map((e) => e.name)].sort(),
    );

    const houseInSenateRowset = await getOfficialRoster(
      NC_STATE,
      "house",
      "01",
      NC_ELECTION_YEAR,
    );
    expect(houseInSenateRowset).toEqual([]);
  });

  it("every NC row is qualified_for_general_ballot — no runoff_pending anywhere (both North Carolina's March 3 primary and May 12 second primary are already resolved)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_HOUSE_DB_ROWS));
    const house = await getOfficialRoster(
      NC_STATE,
      "house",
      "01",
      NC_ELECTION_YEAR,
    );
    expect(
      house.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);

    mockedGetDb.mockReturnValue(makeDbMock(NC_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      NC_STATE,
      "senate",
      null,
      NC_ELECTION_YEAR,
    );
    expect(
      senate.every((r) => r.ballotStatus === "qualified_for_general_ballot"),
    ).toBe(true);
  });

  it("Green Party nominees (Dublin — Senate, Whitehead — NC-8) carry party GRE", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_HOUSE_DB_ROWS));
    const d8 = await getOfficialRoster(
      NC_STATE,
      "house",
      "08",
      NC_ELECTION_YEAR,
    );
    expect(d8.find((r) => r.name === "Bo Whitehead")?.party).toBe("GRE");

    mockedGetDb.mockReturnValue(makeDbMock(NC_SENATE_DB_ROWS));
    const senate = await getOfficialRoster(
      NC_STATE,
      "senate",
      null,
      NC_ELECTION_YEAR,
    );
    expect(senate.find((r) => r.name === "Michael Dublin")?.party).toBe("GRE");
  });
});

describe("isIncumbentSeekingReelection — NC", () => {
  it("returns true for every sampled NC district — the winning nominee is the sitting incumbent (no open US House seat this cycle)", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_HOUSE_DB_ROWS));
    for (const [district, incumbentName] of Object.entries(
      NC_INCUMBENT_SAMPLE,
    )) {
      expect(
        await isIncumbentSeekingReelection(
          NC_STATE,
          "house",
          district,
          NC_ELECTION_YEAR,
          incumbentName,
        ),
      ).toBe(true);
    }
  });

  it("returns false for the US Senate seat — Tillis (sitting senator) did not file for re-election", async () => {
    mockedGetDb.mockReturnValue(makeDbMock(NC_SENATE_DB_ROWS));
    expect(
      await isIncumbentSeekingReelection(
        NC_STATE,
        "senate",
        null,
        NC_ELECTION_YEAR,
        "Thom Tillis",
      ),
    ).toBe(false);
  });
});

describe("lookupChallengers — NC wiring (house + senate both covered)", () => {
  it("both chambers covered by the official roster: skips the FEC query entirely (2 calls, not 3)", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NC_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => ncDbRow(e, i, "house"));
    const dbMock = makeSequencedDbMock([houseRows, NC_SENATE_DB_ROWS]);
    mockedGetDb.mockReturnValue(dbMock);

    const out = await lookupChallengers("NC", 1, 2026);

    expect(dbMock.select).toHaveBeenCalledTimes(2); // official house + official senate, FEC skipped
    // incumbent Davis excluded; Buckhout (R) and Bailey (LIB) render.
    expect(out.house.map((c) => c.name).sort()).toEqual(
      ["Laurie Buckhout", "Tom Bailey"].sort(),
    );
  });

  it("NC-6 (a district with no Libertarian filer): both remaining filers render, incumbent excluded", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NC_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "06",
    ).map((e, i) => ncDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NC_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NC", 6, 2026);

    expect(out.house.map((c) => c.name)).toEqual(["Cyril Jefferson"]);
    expect(out.house.some((c) => c.name === "Addison McDowell")).toBe(false);
  });

  it("senate: all four filers render as challengers, none excluded (open seat, no incumbent); Green Party nominee maps to display name Green", async () => {
    vi.stubEnv("OFFICIAL_ROSTER_ENABLED", "1");
    const houseRows = NC_HOUSE_ROSTER_2026.filter(
      (e) => e.district === "01",
    ).map((e, i) => ncDbRow(e, i, "house"));
    mockedGetDb.mockReturnValue(
      makeSequencedDbMock([houseRows, NC_SENATE_DB_ROWS]),
    );

    const out = await lookupChallengers("NC", 1, 2026);

    expect(out.senate.map((c) => c.name).sort()).toEqual(
      NC_SENATE_ROSTER_2026.map((e) => e.name).sort(),
    );
    expect(out.senate.find((c) => c.name === "Roy Cooper")?.party).toBe(
      "Democrat",
    );
    expect(out.senate.find((c) => c.name === "Michael Dublin")?.party).toBe(
      "Green",
    );
  });
});
