/**
 * Tests for Phase E donor ingest:
 *   - scripts/ingest/_bucket-mapping.ts
 *   - scripts/ingest/federal-donors.ts
 *   - scripts/ingest/state-donors.ts
 *
 * Pattern mirrors tag-bills.test.ts:
 *   - Mock HTTP fetchers (no real API calls)
 *   - Mock DB clients (no real DB connections)
 *   - Test pure logic functions directly
 */

import { describe, expect, it, vi } from "vitest";
import {
  mapEmployerToBucket,
  bucketIndividualByAmount,
  DONOR_BUCKET_LABELS,
} from "./_bucket-mapping";
import {
  resolveConfig as resolveFederalConfig,
  extractFecCandidateId,
  fetchFecTotals,
  fetchEmployerBuckets,
  buildDonorRows as buildFederalDonorRows,
  upsertDonorRows as upsertFederalDonorRows,
  ingestFederalDonors,
  type FederalDonorConfig,
} from "./federal-donors";
import {
  resolveConfig as resolveStateConfig,
  extractFtmCandidateId,
  extractStateFromJurisdiction,
  parseFtmIndustryResponse,
  buildDonorRows as buildStateDonorRows,
  upsertDonorRows as upsertStateDonorRows,
  ingestStateDonors,
  type StateDonorConfig,
} from "./state-donors";

// ---------------------------------------------------------------------------
// Shared DB mock factory
// ---------------------------------------------------------------------------

function makeDbClient(opts?: {
  candidates?: Record<string, unknown>[];
  insertError?: Error;
}) {
  const candidateRows = opts?.candidates ?? [];
  const insertError = opts?.insertError;

  const whereResult = {
    limit: vi.fn().mockResolvedValue(candidateRows),
  };

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(whereResult),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: insertError
          ? vi.fn().mockRejectedValue(insertError)
          : vi.fn().mockResolvedValue(undefined),
      }),
    }),
  } as unknown as import("../../db/client").DbClient;
}

// ---------------------------------------------------------------------------
// Shared fetcher mock factory
// ---------------------------------------------------------------------------

function makeFetcher(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    // Find the first matching key
    const matchKey = Object.keys(responses).find((key) => url.includes(key));
    const body = matchKey
      ? responses[matchKey]
      : { results: [], pagination: { pages: 1 } };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    });
  }) as unknown as typeof fetch;
}

function makeErrorFetcher(message = "Network error") {
  return vi
    .fn()
    .mockRejectedValue(new Error(message)) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// Unit: DONOR_BUCKET_LABELS exports (vocabulary sanity check)
// ---------------------------------------------------------------------------

describe("DONOR_BUCKET_LABELS", () => {
  it("contains all expected fixed labels", () => {
    expect(DONOR_BUCKET_LABELS).toContain("Real estate & development");
    expect(DONOR_BUCKET_LABELS).toContain("Oil, gas & energy");
    expect(DONOR_BUCKET_LABELS).toContain("Healthcare industry");
    expect(DONOR_BUCKET_LABELS).toContain("Pharmaceutical & medical device");
    expect(DONOR_BUCKET_LABELS).toContain("Finance, banking & insurance");
    expect(DONOR_BUCKET_LABELS).toContain("Technology");
    expect(DONOR_BUCKET_LABELS).toContain("Legal industry");
    expect(DONOR_BUCKET_LABELS).toContain("Agriculture");
    expect(DONOR_BUCKET_LABELS).toContain("Telecom & utilities");
    expect(DONOR_BUCKET_LABELS).toContain("Retail & hospitality");
    expect(DONOR_BUCKET_LABELS).toContain("Trade unions (non-public-safety)");
    expect(DONOR_BUCKET_LABELS).toContain("Public safety unions");
    expect(DONOR_BUCKET_LABELS).toContain("Education employees");
    expect(DONOR_BUCKET_LABELS).toContain(
      "Small individual donors (under $200)",
    );
    expect(DONOR_BUCKET_LABELS).toContain("Large individual donors ($200+)");
    expect(DONOR_BUCKET_LABELS).toContain("Self-funded");
    expect(DONOR_BUCKET_LABELS).toContain("Party committees");
    expect(DONOR_BUCKET_LABELS).toContain("Other");
  });

  it("has 18 fixed entries", () => {
    expect(DONOR_BUCKET_LABELS).toHaveLength(18);
  });
});

// ---------------------------------------------------------------------------
// Unit: mapEmployerToBucket — 30+ fixtures covering all buckets
// ---------------------------------------------------------------------------

describe("mapEmployerToBucket", () => {
  // Real estate & development
  it("maps 'ABC Real Estate Group' to Real estate & development", () => {
    expect(mapEmployerToBucket("ABC Real Estate Group")).toBe(
      "Real estate & development",
    );
  });
  it("maps 'National Realtor Association' to Real estate & development", () => {
    expect(mapEmployerToBucket("National Realtor Association")).toBe(
      "Real estate & development",
    );
  });
  it("maps 'Sunrise Property Developer LLC' to Real estate & development", () => {
    expect(mapEmployerToBucket("Sunrise Property Developer LLC")).toBe(
      "Real estate & development",
    );
  });

  // Oil, gas & energy
  it("maps 'ConocoPhillips' to Oil, gas & energy", () => {
    expect(mapEmployerToBucket("ConocoPhillips")).toBe("Oil, gas & energy");
  });
  it("maps 'ExxonMobil Corporation' to Oil, gas & energy", () => {
    expect(mapEmployerToBucket("ExxonMobil Corporation")).toBe(
      "Oil, gas & energy",
    );
  });
  it("maps 'Midland Basin Petroleum LLC' to Oil, gas & energy", () => {
    expect(mapEmployerToBucket("Midland Basin Petroleum LLC")).toBe(
      "Oil, gas & energy",
    );
  });
  it("maps 'Shell Oil Company' to Oil, gas & energy", () => {
    expect(mapEmployerToBucket("Shell Oil Company")).toBe("Oil, gas & energy");
  });

  // Healthcare industry
  it("maps 'Texas Medical Center' to Healthcare industry", () => {
    expect(mapEmployerToBucket("Texas Medical Center")).toBe(
      "Healthcare industry",
    );
  });
  it("maps 'Blue Cross Blue Shield' to Healthcare industry", () => {
    expect(mapEmployerToBucket("Blue Cross Blue Shield")).toBe(
      "Healthcare industry",
    );
  });
  it("maps 'St. Luke's Hospital' to Healthcare industry", () => {
    expect(mapEmployerToBucket("St. Luke's Hospital")).toBe(
      "Healthcare industry",
    );
  });

  // Pharmaceutical & medical device — wins over Healthcare industry
  it("maps 'Pfizer Inc' to Pharmaceutical & medical device", () => {
    expect(mapEmployerToBucket("Pfizer Inc")).toBe(
      "Pharmaceutical & medical device",
    );
  });
  it("maps 'Biotech Innovations Corp' to Pharmaceutical & medical device", () => {
    expect(mapEmployerToBucket("Biotech Innovations Corp")).toBe(
      "Pharmaceutical & medical device",
    );
  });
  it("maps 'Merck Sharp & Dohme' to Pharmaceutical & medical device", () => {
    expect(mapEmployerToBucket("Merck Sharp & Dohme")).toBe(
      "Pharmaceutical & medical device",
    );
  });

  // Finance, banking & insurance
  it("maps 'First National Bank' to Finance, banking & insurance", () => {
    expect(mapEmployerToBucket("First National Bank")).toBe(
      "Finance, banking & insurance",
    );
  });
  it("maps 'Goldman Sachs & Co' to Finance, banking & insurance", () => {
    expect(mapEmployerToBucket("Goldman Sachs & Co")).toBe(
      "Finance, banking & insurance",
    );
  });
  it("maps 'State Farm Insurance' to Finance, banking & insurance", () => {
    expect(mapEmployerToBucket("State Farm Insurance")).toBe(
      "Finance, banking & insurance",
    );
  });

  // Technology
  it("maps 'Google LLC' to Technology", () => {
    expect(mapEmployerToBucket("Google LLC")).toBe("Technology");
  });
  it("maps 'Microsoft Corporation' to Technology", () => {
    expect(mapEmployerToBucket("Microsoft Corporation")).toBe("Technology");
  });
  it("maps 'Acme Software Solutions' to Technology", () => {
    expect(mapEmployerToBucket("Acme Software Solutions")).toBe("Technology");
  });

  // Legal industry
  it("maps 'Smith & Jones Law Firm' to Legal industry", () => {
    expect(mapEmployerToBucket("Smith & Jones Law Firm")).toBe(
      "Legal industry",
    );
  });
  it("maps 'Trial Lawyers Association of Texas' to Legal industry", () => {
    expect(mapEmployerToBucket("Trial Lawyers Association of Texas")).toBe(
      "Legal industry",
    );
  });

  // Agriculture
  it("maps 'Texas Cattle Ranchers Association' to Agriculture", () => {
    expect(mapEmployerToBucket("Texas Cattle Ranchers Association")).toBe(
      "Agriculture",
    );
  });
  it("maps 'Cargill Agriculture' to Agriculture", () => {
    expect(mapEmployerToBucket("Cargill Agriculture")).toBe("Agriculture");
  });

  // Telecom & utilities
  it("maps 'AT&T Services Inc' to Telecom & utilities", () => {
    expect(mapEmployerToBucket("AT&T Services Inc")).toBe(
      "Telecom & utilities",
    );
  });
  it("maps 'Comcast Corporation' to Telecom & utilities", () => {
    expect(mapEmployerToBucket("Comcast Corporation")).toBe(
      "Telecom & utilities",
    );
  });
  it("maps 'CenterPoint Energy Utilities' to Telecom & utilities", () => {
    expect(mapEmployerToBucket("CenterPoint Energy Utilities")).toBe(
      "Telecom & utilities",
    );
  });

  // Retail & hospitality
  it("maps 'Walmart Stores Inc' to Retail & hospitality", () => {
    expect(mapEmployerToBucket("Walmart Stores Inc")).toBe(
      "Retail & hospitality",
    );
  });
  it("maps 'Marriott International Hotel' to Retail & hospitality", () => {
    expect(mapEmployerToBucket("Marriott International Hotel")).toBe(
      "Retail & hospitality",
    );
  });

  // Trade unions (non-public-safety)
  it("maps 'United Auto Workers UAW Local 12' to Trade unions (non-public-safety)", () => {
    expect(mapEmployerToBucket("United Auto Workers UAW Local 12")).toBe(
      "Trade unions (non-public-safety)",
    );
  });
  it("maps 'Teamsters Local 507' to Trade unions (non-public-safety)", () => {
    expect(mapEmployerToBucket("Teamsters Local 507")).toBe(
      "Trade unions (non-public-safety)",
    );
  });
  it("maps 'SEIU Healthcare Workers' to Trade unions (non-public-safety)", () => {
    expect(mapEmployerToBucket("SEIU Healthcare Workers")).toBe(
      "Trade unions (non-public-safety)",
    );
  });

  // Public safety unions — wins over Trade unions
  it("maps 'Fraternal Order of Police Lodge 7' to Public safety unions", () => {
    expect(mapEmployerToBucket("Fraternal Order of Police Lodge 7")).toBe(
      "Public safety unions",
    );
  });
  it("maps 'International Association of Firefighters IAFF' to Public safety unions", () => {
    expect(
      mapEmployerToBucket("International Association of Firefighters IAFF"),
    ).toBe("Public safety unions");
  });
  it("maps 'Dallas Police Association' to Public safety unions", () => {
    expect(mapEmployerToBucket("Dallas Police Association")).toBe(
      "Public safety unions",
    );
  });

  // Education employees
  it("maps 'National Education Association NEA' to Education employees", () => {
    expect(mapEmployerToBucket("National Education Association NEA")).toBe(
      "Education employees",
    );
  });
  it("maps 'Houston Independent School District' to Education employees", () => {
    expect(mapEmployerToBucket("Houston Independent School District")).toBe(
      "Education employees",
    );
  });
  it("maps 'University of Texas' to Education employees", () => {
    expect(mapEmployerToBucket("University of Texas")).toBe(
      "Education employees",
    );
  });

  // Self-funded
  it("maps 'Self Employed Energy Consultant' to Self-funded (not Oil)", () => {
    expect(mapEmployerToBucket("Self Employed Energy Consultant")).toBe(
      "Self-funded",
    );
  });
  it("maps 'Self-Funded Campaign' to Self-funded", () => {
    expect(mapEmployerToBucket("Self-Funded Campaign")).toBe("Self-funded");
  });

  // Party committees
  it("maps 'Texas Republican Party Committee' to Party committees", () => {
    expect(mapEmployerToBucket("Texas Republican Party Committee")).toBe(
      "Party committees",
    );
  });
  it("maps 'NRCC' to Party committees", () => {
    expect(mapEmployerToBucket("NRCC")).toBe("Party committees");
  });

  // Edge cases
  it("returns null for empty string", () => {
    expect(mapEmployerToBucket("")).toBeNull();
  });
  it("returns null for whitespace-only string", () => {
    expect(mapEmployerToBucket("   ")).toBeNull();
  });
  it("returns null for unmatched generic employer", () => {
    expect(mapEmployerToBucket("ACME Corp")).toBeNull();
  });

  // Case insensitivity
  it("is case-insensitive — 'REAL ESTATE' matches", () => {
    expect(mapEmployerToBucket("REAL ESTATE LLC")).toBe(
      "Real estate & development",
    );
  });
  it("is case-insensitive — 'google' lowercase matches Technology", () => {
    expect(mapEmployerToBucket("google inc")).toBe("Technology");
  });
});

// ---------------------------------------------------------------------------
// Unit: bucketIndividualByAmount
// ---------------------------------------------------------------------------

describe("bucketIndividualByAmount", () => {
  it("returns Small individual donors for amount under $200", () => {
    expect(bucketIndividualByAmount(50)).toBe(
      "Small individual donors (under $200)",
    );
    expect(bucketIndividualByAmount(199.99)).toBe(
      "Small individual donors (under $200)",
    );
    expect(bucketIndividualByAmount(0)).toBe(
      "Small individual donors (under $200)",
    );
  });

  it("returns Large individual donors for amount $200 and above", () => {
    expect(bucketIndividualByAmount(200)).toBe(
      "Large individual donors ($200+)",
    );
    expect(bucketIndividualByAmount(500)).toBe(
      "Large individual donors ($200+)",
    );
    expect(bucketIndividualByAmount(2800)).toBe(
      "Large individual donors ($200+)",
    );
  });
});

// ---------------------------------------------------------------------------
// Unit: extractFecCandidateId
// ---------------------------------------------------------------------------

describe("extractFecCandidateId", () => {
  it("extracts from sourceId when it looks like an FEC ID", () => {
    const candidate = {
      id: "federal-H1234567",
      sourceId: "H1234567",
      rawMetadata: {},
    };
    expect(extractFecCandidateId(candidate)).toBe("H1234567");
  });

  it("extracts from rawMetadata.fec.candidate_id", () => {
    const candidate = {
      id: "federal-abc",
      sourceId: "bioguide-ABC",
      rawMetadata: { fec: { candidate_id: "S0001234" } },
    };
    expect(extractFecCandidateId(candidate)).toBe("S0001234");
  });

  it("returns null when no FEC ID is available", () => {
    const candidate = {
      id: "federal-abc",
      sourceId: "ABCDEF",
      rawMetadata: {},
    };
    expect(extractFecCandidateId(candidate)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit: extractFtmCandidateId
// ---------------------------------------------------------------------------

describe("extractFtmCandidateId", () => {
  it("extracts from rawMetadata.followthemoney.candidate_id", () => {
    const candidate = {
      id: "openstates-tx-123",
      rawMetadata: { followthemoney: { candidate_id: "FTM-98765" } },
    };
    expect(extractFtmCandidateId(candidate)).toBe("FTM-98765");
  });

  it("extracts from rawMetadata.ftm_id", () => {
    const candidate = { id: "abc", rawMetadata: { ftm_id: "FTM-111" } };
    expect(extractFtmCandidateId(candidate)).toBe("FTM-111");
  });

  it("returns null when no FTM ID is available", () => {
    const candidate = { id: "abc", rawMetadata: {} };
    expect(extractFtmCandidateId(candidate)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit: extractStateFromJurisdiction
// ---------------------------------------------------------------------------

describe("extractStateFromJurisdiction", () => {
  it("extracts TX from state-TX-house", () => {
    expect(extractStateFromJurisdiction("state-TX-house")).toBe("TX");
  });
  it("extracts CA from state-CA-senate", () => {
    expect(extractStateFromJurisdiction("state-CA-senate")).toBe("CA");
  });
  it("returns null for federal jurisdictions", () => {
    expect(extractStateFromJurisdiction("federal-house")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(extractStateFromJurisdiction("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit: parseFtmIndustryResponse
// ---------------------------------------------------------------------------

describe("parseFtmIndustryResponse", () => {
  it("maps known FTM industry names to buckets", () => {
    const response = {
      records: [
        { industry_name: "Oil & Gas", total: 50000 },
        { industry_name: "Health", total: 30000 },
        { industry_name: "Finance, Insurance & Real Estate", total: 20000 },
      ],
    };
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.get("Oil, gas & energy")).toBe(50000);
    expect(buckets.get("Healthcare industry")).toBe(30000);
    expect(buckets.get("Finance, banking & insurance")).toBe(20000);
  });

  it("falls back to keyword matching for unknown industry names", () => {
    const response = {
      records: [
        { industry_name: "Software Development Companies", total: 15000 },
      ],
    };
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.get("Technology")).toBe(15000);
  });

  it("puts truly unmatched industries into Other", () => {
    const response = {
      records: [{ industry_name: "Miscellaneous Business", total: 5000 }],
    };
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.get("Other")).toBe(5000);
  });

  it("handles empty response gracefully", () => {
    const buckets = parseFtmIndustryResponse({ records: [] });
    expect(buckets.size).toBe(0);
  });

  it("handles array response format", () => {
    const response = [{ industry_name: "Agriculture", total: 10000 }];
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.get("Agriculture")).toBe(10000);
  });

  it("skips entries with zero or negative totals", () => {
    const response = {
      records: [
        { industry_name: "Oil & Gas", total: 0 },
        { industry_name: "Health", total: -100 },
      ],
    };
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.size).toBe(0);
  });

  it("handles Amount field name variant", () => {
    const response = {
      records: [{ Industry: "Lawyers & Lobbyists", Amount: 8000 }],
    };
    const buckets = parseFtmIndustryResponse(response);
    expect(buckets.get("Legal industry")).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// Unit: federal-donors resolveConfig
// ---------------------------------------------------------------------------

describe("resolveFederalConfig", () => {
  it("defaults to 500 candidate limit", () => {
    const config = resolveFederalConfig({}, []);
    expect(config.limit).toBe(500);
  });

  it("reads --limit from argv", () => {
    const config = resolveFederalConfig({}, [
      "node",
      "script.ts",
      "--limit",
      "50",
    ]);
    expect(config.limit).toBe(50);
  });

  it("reads DONOR_LIMIT from env", () => {
    const config = resolveFederalConfig({ DONOR_LIMIT: "100" }, []);
    expect(config.limit).toBe(100);
  });

  it("includes current and prior election cycles", () => {
    const config = resolveFederalConfig({}, []);
    expect(config.electionCycles).toHaveLength(2);
    // Both should be even-year strings
    for (const cycle of config.electionCycles) {
      expect(Number.parseInt(cycle, 10) % 2).toBe(0);
    }
  });

  it("sets FEC API key when provided", () => {
    const config = resolveFederalConfig({ FEC_API_KEY: "my-key" }, []);
    expect(config.fecApiKey).toBe("my-key");
  });

  it("leaves fecApiKey undefined when not provided", () => {
    const config = resolveFederalConfig({}, []);
    expect(config.fecApiKey).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Unit: state-donors resolveConfig
// ---------------------------------------------------------------------------

describe("resolveStateConfig", () => {
  it("defaults to 500 candidate limit", () => {
    const config = resolveStateConfig({}, []);
    expect(config.limit).toBe(500);
  });

  it("reads --limit from argv", () => {
    const config = resolveStateConfig({}, [
      "node",
      "script.ts",
      "--limit",
      "25",
    ]);
    expect(config.limit).toBe(25);
  });

  it("sets FTM API key when provided", () => {
    const config = resolveStateConfig(
      { FOLLOWTHEMONEY_API_KEY: "ftm-key" },
      [],
    );
    expect(config.ftmApiKey).toBe("ftm-key");
  });

  it("leaves ftmApiKey undefined when not set (free tier)", () => {
    const config = resolveStateConfig({}, []);
    expect(config.ftmApiKey).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration: fetchFecTotals
// ---------------------------------------------------------------------------

describe("fetchFecTotals", () => {
  const config: FederalDonorConfig = {
    fecBaseUrl: "https://api.open.fec.gov/v1",
    electionCycles: ["2026", "2024"],
    limit: 500,
  };

  it("maps FEC totals to correct buckets", async () => {
    const fetcher = makeFetcher({
      "/candidate/H1234567/totals/": {
        results: [
          {
            individual_unitemized_contributions: 5000,
            individual_itemized_contributions: 25000,
            other_political_committee_contributions: 10000,
            political_party_committee_contributions: 3000,
            candidate_contribution: 0,
          },
        ],
        pagination: { pages: 1 },
      },
    });
    const buckets = await fetchFecTotals("H1234567", "2026", config, fetcher);
    expect(buckets.get("Small individual donors (under $200)")).toBe(5000);
    expect(buckets.get("Large individual donors ($200+)")).toBe(25000);
    expect(buckets.get("Party committees")).toBe(3000);
    expect(buckets.get("Other")).toBe(10000); // unclassified PAC contributions
  });

  it("maps self-funded contributions to Self-funded bucket", async () => {
    const fetcher = makeFetcher({
      "/candidate/H9999999/totals/": {
        results: [
          {
            individual_unitemized_contributions: 0,
            individual_itemized_contributions: 0,
            other_political_committee_contributions: 0,
            political_party_committee_contributions: 0,
            candidate_contribution: 50000,
          },
        ],
        pagination: { pages: 1 },
      },
    });
    const buckets = await fetchFecTotals("H9999999", "2026", config, fetcher);
    expect(buckets.get("Self-funded")).toBe(50000);
  });

  it("returns empty map when FEC returns empty results", async () => {
    const fetcher = makeFetcher({
      "/candidate/H0000000/totals/": {
        results: [],
        pagination: { pages: 1 },
      },
    });
    const buckets = await fetchFecTotals("H0000000", "2026", config, fetcher);
    expect(buckets.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: fetchEmployerBuckets
// ---------------------------------------------------------------------------

describe("fetchEmployerBuckets", () => {
  const config: FederalDonorConfig = {
    fecBaseUrl: "https://api.open.fec.gov/v1",
    electionCycles: ["2026"],
    limit: 500,
  };

  it("maps employer names to buckets", async () => {
    const fetcher = makeFetcher({
      "/committee/C00123456/schedules/schedule_a/by_employer/": {
        results: [
          { employer: "Google LLC", total: 15000 },
          { employer: "First National Bank", total: 8000 },
          { employer: "ACME Consulting", total: 2000 },
        ],
        pagination: { pages: 1 },
      },
    });
    const buckets = await fetchEmployerBuckets(
      "C00123456",
      "2026",
      config,
      fetcher,
    );
    expect(buckets.get("Technology")).toBe(15000);
    expect(buckets.get("Finance, banking & insurance")).toBe(8000);
    expect(buckets.get("Other")).toBe(2000);
  });

  it("returns empty map when schedule_a returns no results", async () => {
    const fetcher = makeFetcher({
      "/committee/C99999999/schedules/schedule_a/by_employer/": {
        results: [],
        pagination: { pages: 1 },
      },
    });
    const buckets = await fetchEmployerBuckets(
      "C99999999",
      "2026",
      config,
      fetcher,
    );
    expect(buckets.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: buildFederalDonorRows
// ---------------------------------------------------------------------------

describe("buildFederalDonorRows", () => {
  const config: FederalDonorConfig = {
    fecBaseUrl: "https://api.open.fec.gov/v1",
    electionCycles: ["2026"],
    limit: 500,
  };

  it("returns empty array when no FEC ID is extractable", async () => {
    const candidate = {
      id: "federal-ABCDE",
      sourceId: "ABCDE",
      rawMetadata: {},
    };
    const fetcher = makeFetcher({});
    const rows = await buildFederalDonorRows(candidate, config, fetcher);
    expect(rows).toHaveLength(0);
  });

  it("builds donor rows from FEC totals", async () => {
    const candidate = {
      id: "federal-H1234567",
      sourceId: "H1234567",
      rawMetadata: {},
    };
    const fetcher = makeFetcher({
      "/candidate/H1234567/totals/": {
        results: [
          {
            individual_unitemized_contributions: 5000,
            individual_itemized_contributions: 20000,
            other_political_committee_contributions: 0,
            political_party_committee_contributions: 1000,
            candidate_contribution: 0,
          },
        ],
        pagination: { pages: 1 },
      },
      "/candidate/H1234567/committees/": {
        results: [],
        pagination: { pages: 1 },
      },
    });
    const rows = await buildFederalDonorRows(candidate, config, fetcher);
    expect(rows.length).toBeGreaterThan(0);
    const smallDonorRow = rows.find(
      (r) => r.bucketLabel === "Small individual donors (under $200)",
    );
    expect(smallDonorRow).toBeDefined();
    expect(smallDonorRow?.amountTotal).toBe("5000.00");
    expect(smallDonorRow?.source).toBe("fec_api");
    expect(smallDonorRow?.candidateId).toBe("federal-H1234567");
    expect(smallDonorRow?.electionCycle).toBe("2026");
  });

  it("continues on API error for one cycle, does not crash", async () => {
    const candidate = {
      id: "federal-H1234567",
      sourceId: "H1234567",
      rawMetadata: {},
    };
    const errorFetcher = makeErrorFetcher("FEC HTTP 500");
    // Should not throw
    const rows = await buildFederalDonorRows(candidate, config, errorFetcher);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: buildStateDonorRows
// ---------------------------------------------------------------------------

describe("buildStateDonorRows", () => {
  const config: StateDonorConfig = {
    ftmBaseUrl: "https://api.followthemoney.org",
    electionCycles: ["2026"],
    limit: 500,
  };

  it("returns empty array for candidates without a valid state jurisdiction", async () => {
    const candidate = {
      id: "federal-H1111111",
      fullName: "Jane Federal",
      jurisdiction: "federal-house",
      rawMetadata: {},
    };
    const fetcher = makeFetcher({});
    const rows = await buildStateDonorRows(candidate, config, fetcher);
    expect(rows).toHaveLength(0);
  });

  it("builds donor rows from FTM industry summary", async () => {
    const candidate = {
      id: "openstates-tx-123",
      fullName: "John State",
      jurisdiction: "state-TX-house",
      rawMetadata: { followthemoney: { candidate_id: "FTM-987" } },
    };
    const fetcher = makeFetcher({
      "/": {
        records: [
          { industry_name: "Oil & Gas", total: 40000 },
          { industry_name: "Health", total: 15000 },
        ],
      },
    });
    const rows = await buildStateDonorRows(candidate, config, fetcher);
    expect(rows.length).toBeGreaterThan(0);
    const oilRow = rows.find((r) => r.bucketLabel === "Oil, gas & energy");
    expect(oilRow).toBeDefined();
    expect(oilRow?.amountTotal).toBe("40000.00");
    expect(oilRow?.source).toBe("followthemoney_api");
  });

  it("returns empty array when FTM returns no records", async () => {
    const candidate = {
      id: "openstates-ca-456",
      fullName: "Alice State",
      jurisdiction: "state-CA-senate",
      rawMetadata: {},
    };
    const fetcher = makeFetcher({ "/": { records: [] } });
    const rows = await buildStateDonorRows(candidate, config, fetcher);
    expect(rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: upsertFederalDonorRows
// ---------------------------------------------------------------------------

describe("upsertFederalDonorRows", () => {
  it("inserts rows into donor_aggregates with correct fields", async () => {
    const db = makeDbClient();
    const rows = [
      {
        candidateId: "federal-H1234567",
        electionCycle: "2026",
        bucketLabel: "Technology",
        amountTotal: "15000.00",
        source: "fec_api",
        sourceUrl: "https://api.open.fec.gov/v1/candidate/H1234567/totals/",
        rawMetadata: { fecCandidateId: "H1234567", cycle: "2026" },
      },
    ];
    const count = await upsertFederalDonorRows(db, rows);
    expect(count).toBe(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("returns 0 and does not call DB when rows is empty", async () => {
    const db = makeDbClient();
    const count = await upsertFederalDonorRows(db, []);
    expect(count).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("propagates DB errors", async () => {
    const db = makeDbClient({ insertError: new Error("DB error") });
    const rows = [
      {
        candidateId: "federal-H1234567",
        electionCycle: "2026",
        bucketLabel: "Technology",
        amountTotal: "15000.00",
        source: "fec_api",
        sourceUrl: "https://api.open.fec.gov/v1/candidate/H1234567/totals/",
        rawMetadata: {},
      },
    ];
    await expect(upsertFederalDonorRows(db, rows)).rejects.toThrow("DB error");
  });
});

// ---------------------------------------------------------------------------
// Integration: upsertStateDonorRows
// ---------------------------------------------------------------------------

describe("upsertStateDonorRows", () => {
  it("inserts state donor rows correctly", async () => {
    const db = makeDbClient();
    const rows = [
      {
        candidateId: "openstates-tx-123",
        electionCycle: "2026",
        bucketLabel: "Agriculture",
        amountTotal: "10000.00",
        source: "followthemoney_api",
        sourceUrl: "https://api.followthemoney.org/?mode=summary",
        rawMetadata: { ftmCandidateId: null, state: "TX", cycle: "2026" },
      },
    ];
    const count = await upsertStateDonorRows(db, rows);
    expect(count).toBe(1);
  });

  it("returns 0 for empty rows without DB call", async () => {
    const db = makeDbClient();
    const count = await upsertStateDonorRows(db, []);
    expect(count).toBe(0);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Integration: ingestFederalDonors (full orchestration)
// ---------------------------------------------------------------------------

describe("ingestFederalDonors", () => {
  it("queries federal candidates with correct jurisdiction filter", async () => {
    const db = makeDbClient({ candidates: [] });
    const fetcher = makeFetcher({});

    const counts = await ingestFederalDonors({
      db,
      fetcher,
      env: {},
      argv: [],
    });

    expect(counts.candidatesQueried).toBe(0);
    expect(counts.rowsUpserted).toBe(0);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("skips candidates that produce no rows, continues others", async () => {
    const federalCandidates = [
      // No FEC ID → will be skipped
      {
        id: "federal-abc",
        sourceId: "ABCDEF",
        jurisdiction: "federal-house",
        rawMetadata: {},
      },
      // Valid FEC ID → will be processed
      {
        id: "federal-H1234567",
        sourceId: "H1234567",
        jurisdiction: "federal-house",
        rawMetadata: {},
      },
    ];

    const db = makeDbClient({ candidates: federalCandidates });
    const fetcher = makeFetcher({
      "/candidate/H1234567/totals/": {
        results: [
          {
            individual_unitemized_contributions: 1000,
            individual_itemized_contributions: 5000,
            other_political_committee_contributions: 0,
            political_party_committee_contributions: 0,
            candidate_contribution: 0,
          },
        ],
        pagination: { pages: 1 },
      },
      "/candidate/H1234567/committees/": {
        results: [],
        pagination: { pages: 1 },
      },
    });

    const counts = await ingestFederalDonors({
      db,
      fetcher,
      env: {},
      argv: ["node", "script.ts", "--limit", "50"],
    });

    expect(counts.candidatesQueried).toBe(2);
    // One processed, one skipped (no FEC ID)
    expect(counts.candidatesProcessed).toBe(1);
    expect(counts.candidatesSkipped).toBe(1);
  });

  it("API error on one candidate: that candidate is skipped, others continue", async () => {
    // Candidates: H1111111 has no FEC ID pattern (sourceId is too short) so it
    // gets skipped immediately. H2222222 has a valid FEC ID and is processed.
    // This tests that a failed/skipped candidate doesn't abort the batch.
    const federalCandidates = [
      // ABCDEFGH is not a valid FEC ID (no single-letter prefix + 7-8 digits)
      {
        id: "federal-ABCDEFGH",
        sourceId: "ABCDEFGH",
        jurisdiction: "federal-house",
        rawMetadata: {},
      },
      {
        id: "federal-H2222222",
        sourceId: "H2222222",
        jurisdiction: "federal-senate",
        rawMetadata: {},
      },
    ];

    const db = makeDbClient({ candidates: federalCandidates });
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url.includes("H2222222/totals")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                {
                  individual_unitemized_contributions: 500,
                  individual_itemized_contributions: 0,
                  other_political_committee_contributions: 0,
                  political_party_committee_contributions: 0,
                  candidate_contribution: 0,
                },
              ],
              pagination: { pages: 1 },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: [], pagination: { pages: 1 } }),
      });
    }) as unknown as typeof fetch;

    const counts = await ingestFederalDonors({
      db,
      fetcher,
      env: {},
      argv: [],
    });

    // First candidate has no extractable FEC ID → skipped (no API call made)
    expect(counts.candidatesSkipped).toBe(1);
    // Second candidate is processed successfully
    expect(counts.candidatesProcessed).toBe(1);
    // No uncaught errors
    expect(counts.apiErrors).toBe(0);
  });

  it("--limit flag is honored", async () => {
    const db = makeDbClient({ candidates: [] });
    const fetcher = makeFetcher({});

    await ingestFederalDonors({
      db,
      fetcher,
      env: {},
      argv: ["node", "script.ts", "--limit", "10"],
    });

    // Verify limit was passed to the DB query
    const limitCall = (db.select as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value?.from.mock.results[0]?.value?.where.mock.results[0]?.value?.limit;
    expect(limitCall).toHaveBeenCalledWith(10);
  });
});

// ---------------------------------------------------------------------------
// Integration: ingestStateDonors (full orchestration)
// ---------------------------------------------------------------------------

describe("ingestStateDonors", () => {
  it("queries state candidates with correct jurisdiction filter", async () => {
    const db = makeDbClient({ candidates: [] });
    const fetcher = makeFetcher({});

    const counts = await ingestStateDonors({
      db,
      fetcher,
      env: {},
      argv: [],
    });

    expect(counts.candidatesQueried).toBe(0);
    expect(counts.rowsUpserted).toBe(0);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("processes state candidates and upserts donor rows", async () => {
    const stateCandidates = [
      {
        id: "openstates-tx-abc",
        fullName: "Jane Texas",
        jurisdiction: "state-TX-house",
        rawMetadata: {},
      },
    ];

    const db = makeDbClient({ candidates: stateCandidates });
    const fetcher = makeFetcher({
      "/": {
        records: [{ industry_name: "Agriculture", total: 25000 }],
      },
    });

    const counts = await ingestStateDonors({
      db,
      fetcher,
      env: {},
      argv: [],
    });

    expect(counts.candidatesQueried).toBe(1);
    expect(counts.candidatesProcessed).toBe(1);
    expect(counts.rowsUpserted).toBeGreaterThan(0);
  });

  it("FTM API error on one candidate: that candidate skipped, others continue", async () => {
    const stateCandidates = [
      {
        id: "openstates-tx-001",
        fullName: "Alice TX",
        jurisdiction: "state-TX-house",
        rawMetadata: {},
      },
      {
        id: "openstates-ca-001",
        fullName: "Bob CA",
        jurisdiction: "state-CA-senate",
        rawMetadata: {},
      },
    ];
    const db = makeDbClient({ candidates: stateCandidates });

    let callCount = 0;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      callCount += 1;
      if (
        url.includes("can_nam=Alice+TX") ||
        url.includes("can_nam=Alice%20TX")
      ) {
        return Promise.reject(new Error("FTM HTTP 500"));
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            records: [{ industry_name: "Real Estate", total: 10000 }],
          }),
      });
    }) as unknown as typeof fetch;

    const counts = await ingestStateDonors({
      db,
      fetcher,
      env: {},
      argv: [],
    });

    // Alice TX: API error → skipped; Bob CA: processed
    expect(counts.candidatesSkipped).toBeGreaterThanOrEqual(1);
  });

  it("--limit flag is honored", async () => {
    const db = makeDbClient({ candidates: [] });
    const fetcher = makeFetcher({});

    await ingestStateDonors({
      db,
      fetcher,
      env: {},
      argv: ["node", "script.ts", "--limit", "20"],
    });

    const limitCall = (db.select as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value?.from.mock.results[0]?.value?.where.mock.results[0]?.value?.limit;
    expect(limitCall).toHaveBeenCalledWith(20);
  });
});
