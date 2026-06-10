import { describe, it, expect } from "vitest";
import {
  normalizeFecName,
  normalizeDistrict,
  parseRosterResult,
  parseIncumbentDecoration,
  fetchRoster,
  fetchReceipts,
  resolveConfig,
  type FederalCandidatesConfig,
} from "./federal-candidates";

const baseConfig: FederalCandidatesConfig = {
  fecApiKey: "TEST_KEY",
  electionYear: 2026,
  limit: null,
  dryRun: true,
  fecBaseUrl: "https://fec.test/v1",
};

function fakeFetch(
  pages: Record<string, unknown>[][],
): typeof fetch & { urls: string[] } {
  const urls: string[] = [];
  const fn = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    const page = Number(new URL(url).searchParams.get("page") ?? "1");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        results: pages[page - 1] ?? [],
        pagination: { pages: pages.length },
      }),
    } as Response;
  }) as typeof fetch & { urls: string[] };
  fn.urls = urls;
  return fn;
}

describe("normalizeFecName", () => {
  it("reorders LAST, FIRST to First Last in title case", () => {
    expect(normalizeFecName("ADERHOLT, ROBERT B.")).toBe("Robert B. Aderholt");
    expect(normalizeFecName("OCASIO-CORTEZ, ALEXANDRIA")).toBe(
      "Alexandria Ocasio-Cortez",
    );
  });

  it("drops trailing honorifics", () => {
    expect(normalizeFecName("SMITH, JOHN MR.")).toBe("John Smith");
  });

  it("passes through names without a comma", () => {
    expect(normalizeFecName("CHER")).toBe("Cher");
  });
});

describe("normalizeDistrict", () => {
  it("zero-pads house districts", () => {
    expect(normalizeDistrict("house", "7")).toBe("07");
    expect(normalizeDistrict("house", "32")).toBe("32");
  });
  it("maps at-large/empty house to 00", () => {
    expect(normalizeDistrict("house", "")).toBe("00");
    expect(normalizeDistrict("house", null)).toBe("00");
  });
  it("returns null for senate", () => {
    expect(normalizeDistrict("senate", "00")).toBeNull();
  });
});

describe("parseRosterResult", () => {
  it("parses a house challenger", () => {
    const row = parseRosterResult({
      candidate_id: "H6TX07289",
      name: "DOE, JANE",
      party: "DEM",
      state: "tx",
      district: "7",
      office: "H",
      incumbent_challenge: "C",
    });
    expect(row).toEqual({
      fecCandidateId: "H6TX07289",
      fullName: "Jane Doe",
      fecName: "DOE, JANE",
      party: "DEM",
      state: "TX",
      district: "07",
      office: "house",
      incumbentChallenge: "C",
    });
  });

  it("skips rows missing id/name/office", () => {
    expect(parseRosterResult({ name: "X", office: "H" })).toBeNull();
    expect(
      parseRosterResult({ candidate_id: "P00001", name: "X", office: "P" }),
    ).toBeNull();
  });
});

describe("parseIncumbentDecoration", () => {
  it("parses a House decoration", () => {
    expect(parseIncumbentDecoration("Rep. Robert Aderholt [R-AL4]")).toEqual({
      party: "REP",
      state: "AL",
      district: "04",
    });
  });
  it("parses a Senate decoration (no district)", () => {
    expect(parseIncumbentDecoration("Sen. Tammy Baldwin [D-WI]")).toEqual({
      party: "DEM",
      state: "WI",
      district: null,
    });
  });
  it("returns nulls for undecorated names", () => {
    expect(parseIncumbentDecoration("Jane Doe")).toEqual({
      party: null,
      state: null,
      district: null,
    });
  });
});

describe("fetchRoster", () => {
  it("paginates and filters to parseable H/S rows", async () => {
    const fetcher = fakeFetch([
      [
        {
          candidate_id: "H6TX07289",
          name: "DOE, JANE",
          party: "DEM",
          state: "TX",
          district: "7",
          office: "H",
          incumbent_challenge: "C",
        },
        { candidate_id: "BAD", office: "P", name: "X" },
      ],
      [
        {
          candidate_id: "S6WI00061",
          name: "ROE, RICHARD",
          party: "REP",
          state: "WI",
          district: "00",
          office: "S",
          incumbent_challenge: "O",
        },
      ],
    ]);
    const rows = await fetchRoster(baseConfig, fetcher);
    expect(rows).toHaveLength(2);
    expect(rows[0].office).toBe("house");
    expect(rows[1].office).toBe("senate");
    expect(rows[1].district).toBeNull();
    expect(fetcher.urls).toHaveLength(2);
    const first = new URL(fetcher.urls[0]);
    expect(first.searchParams.get("election_year")).toBe("2026");
    expect(first.searchParams.getAll("office")).toEqual(["H", "S"]);
    expect(first.searchParams.get("candidate_status")).toBe("C");
  });

  it("respects --limit", async () => {
    const page = Array.from({ length: 100 }, (_, i) => ({
      candidate_id: `H${i}`,
      name: `LAST, FIRST${i}`,
      office: "H",
      state: "TX",
      district: "1",
    }));
    const fetcher = fakeFetch([page, page]);
    const rows = await fetchRoster({ ...baseConfig, limit: 100 }, fetcher);
    expect(rows).toHaveLength(100);
    expect(fetcher.urls).toHaveLength(1);
  });
});

describe("fetchReceipts", () => {
  it("maps candidate_id to receipts", async () => {
    const fetcher = fakeFetch([
      [
        { candidate_id: "H6TX07289", receipts: 1234567.89 },
        { candidate_id: "S6WI00061", receipts: 0 },
        { candidate_id: "NOPE" },
      ],
    ]);
    const map = await fetchReceipts(baseConfig, fetcher);
    expect(map.get("H6TX07289")).toBeCloseTo(1234567.89);
    expect(map.get("S6WI00061")).toBe(0);
    expect(map.has("NOPE")).toBe(false);
  });
});

describe("resolveConfig", () => {
  it("defaults to 2026 / no limit / live run", () => {
    const c = resolveConfig({ FEC_API_KEY: "k" }, ["node", "x"]);
    expect(c.electionYear).toBe(2026);
    expect(c.limit).toBeNull();
    expect(c.dryRun).toBe(false);
    expect(c.fecApiKey).toBe("k");
  });
  it("parses flags", () => {
    const c = resolveConfig({}, [
      "node",
      "x",
      "--year",
      "2028",
      "--limit",
      "50",
      "--dry-run",
    ]);
    expect(c.electionYear).toBe(2028);
    expect(c.limit).toBe(50);
    expect(c.dryRun).toBe(true);
    expect(c.fecApiKey).toBe("DEMO_KEY");
  });
});
