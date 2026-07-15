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
    expect(await hasOfficialRoster("TX")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isIncumbentSeekingReelection
// ---------------------------------------------------------------------------

describe("isIncumbentSeekingReelection", () => {
  it("returns null when no official roster covers this seat", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    const out = await isIncumbentSeekingReelection(
      "TX",
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
