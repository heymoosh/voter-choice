/**
 * src/app/api/donors/route.test.ts
 *
 * Tests for GET /api/donors.
 * All DB and rate-limit dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../lib/server/counters-rate-limit", () => ({
  checkCounterRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../lib/server/donors", () => ({
  lookupDonorCoalition: vi.fn(),
}));

import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import { lookupDonorCoalition } from "../../../lib/server/donors";
import { GET } from "./route";

const mockedRateLimit = vi.mocked(checkCounterRateLimit);
const mockedLookup = vi.mocked(lookupDonorCoalition);

function makeRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/donors");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), {
    headers: { "x-real-ip": "127.0.0.1" },
  });
}

const VALID_PARAMS = {
  candidate_name: "Annise Parker",
  state_code: "TX",
  jurisdiction: "state-TX-house",
} as const;

const HAPPY_PATH_RESULT = {
  found: true as const,
  candidateId: "openstates-tx-123",
  totalRaised: 100000,
  buckets: [
    { label: "labor", amount: 50000, percent: 50 },
    { label: "tech", amount: 30000, percent: 30 },
    { label: "real_estate", amount: 20000, percent: 20 },
  ],
  source: "fec",
  sourceUrl: "https://fec.gov/candidate/H1234",
  electionCycle: "2026",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------

describe("GET /api/donors — rate limit", () => {
  it("returns 429 when rate limit exceeded", async () => {
    mockedRateLimit.mockResolvedValue(false);
    const req = makeRequest(VALID_PARAMS);
    const res = await GET(req as never);
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("GET /api/donors — validation", () => {
  it("returns 400 for missing candidate_name", async () => {
    const params = { ...VALID_PARAMS };
    delete (params as Record<string, string>).candidate_name;
    const res = await GET(makeRequest(params) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/candidate_name/i);
  });

  it("returns 400 for missing state_code", async () => {
    const params = { ...VALID_PARAMS };
    delete (params as Record<string, string>).state_code;
    const res = await GET(makeRequest(params) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/state_code/i);
  });

  it("returns 400 for missing jurisdiction", async () => {
    const params = { ...VALID_PARAMS };
    delete (params as Record<string, string>).jurisdiction;
    const res = await GET(makeRequest(params) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/jurisdiction/i);
  });

  it("returns 400 for invalid jurisdiction format", async () => {
    const res = await GET(
      makeRequest({ ...VALID_PARAMS, jurisdiction: "county-harris" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/jurisdiction/i);
  });

  it("returns 400 for non-legislative jurisdiction like state-TX-executive", async () => {
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        jurisdiction: "state-TX-executive",
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when state_code does not match jurisdiction prefix", async () => {
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        state_code: "CA",
        jurisdiction: "state-TX-house",
      }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/does not match/i);
  });

  it("returns 400 for malformed election_cycle", async () => {
    const res = await GET(
      makeRequest({ ...VALID_PARAMS, election_cycle: "twenty-six" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/election_cycle/i);
  });

  it("accepts federal-house jurisdiction", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        jurisdiction: "federal-house",
      }) as never,
    );
    expect(res.status).toBe(200);
  });

  it("accepts federal-senate jurisdiction", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        jurisdiction: "federal-senate",
      }) as never,
    );
    expect(res.status).toBe(200);
  });

  it("accepts state-XX-senate jurisdiction pattern", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        jurisdiction: "state-TX-senate",
      }) as never,
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("GET /api/donors — happy path", () => {
  it("returns 200 + found:true with totalRaised, buckets, source", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.candidateId).toBe("openstates-tx-123");
    expect(body.totalRaised).toBe(100000);
    expect(body.buckets).toHaveLength(3);
    expect(body.buckets[0].label).toBe("labor");
    expect(body.buckets[0].amount).toBe(50000);
    expect(body.buckets[0].percent).toBe(50);
    expect(body.source).toBe("fec");
    expect(body.sourceUrl).toBe("https://fec.gov/candidate/H1234");
    expect(body.electionCycle).toBe("2026");
  });

  it("passes correct arguments through to lookupDonorCoalition", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    await GET(
      makeRequest({ ...VALID_PARAMS, election_cycle: "2024" }) as never,
    );
    expect(mockedLookup).toHaveBeenCalledWith(
      "Annise Parker",
      "TX",
      "state-TX-house",
      "2024",
    );
  });

  it("passes undefined electionCycle when omitted (so the function uses its default)", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    await GET(makeRequest(VALID_PARAMS) as never);
    expect(mockedLookup).toHaveBeenCalledWith(
      "Annise Parker",
      "TX",
      "state-TX-house",
      undefined,
    );
  });

  it("sets 1-hour cache for found results", async () => {
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=3600");
  });
});

// ---------------------------------------------------------------------------
// Not-found shapes
// ---------------------------------------------------------------------------

describe("GET /api/donors — not found", () => {
  it("returns 200 + found:false with candidate_not_resolved reason", async () => {
    mockedLookup.mockResolvedValue({
      found: false,
      reason: "candidate_not_resolved",
    });

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.reason).toBe("candidate_not_resolved");
  });

  it("returns 200 + found:false with no_donor_data reason", async () => {
    mockedLookup.mockResolvedValue({
      found: false,
      reason: "no_donor_data",
    });

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.reason).toBe("no_donor_data");
  });

  it("sets a shorter cache header for not-found responses", async () => {
    mockedLookup.mockResolvedValue({
      found: false,
      reason: "candidate_not_resolved",
    });

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=900");
  });
});
