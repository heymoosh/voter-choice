/**
 * src/app/api/alignment/route.test.ts
 *
 * Tests for GET /api/alignment.
 * All DB and rate-limit dependencies are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../lib/server/counters-rate-limit", () => ({
  checkCounterRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../lib/server/alignment", () => ({
  resolveCandidateId: vi.fn(),
  lookupAlignment: vi.fn(),
}));

import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import {
  resolveCandidateId,
  lookupAlignment,
} from "../../../lib/server/alignment";
import { GET } from "./route";

const mockedRateLimit = vi.mocked(checkCounterRateLimit);
const mockedResolve = vi.mocked(resolveCandidateId);
const mockedLookup = vi.mocked(lookupAlignment);

function makeRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/alignment");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), {
    headers: { "x-real-ip": "127.0.0.1" },
  });
}

const VALID_PARAMS = {
  candidateName: "Annise Parker",
  stateCode: "TX",
  jurisdiction: "state-TX-house",
  canonicalIssue: "healthcare_affordability",
  resolvedStance: "in_favor",
} as const;

const HAPPY_PATH_RESULT = {
  found: true as const,
  candidateId: "openstates-tx-123",
  kept: 4,
  total: 6,
  contributingVotes: [
    {
      billTitle: "HB 100 — Medicaid Expansion",
      voteCast: "with" as const,
      date: "2024-03-15",
      source: {
        name: "openstates",
        url: "https://openstates.org/bill/tx-hb100",
      },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("GET /api/alignment — validation", () => {
  it("returns 429 when rate limit exceeded", async () => {
    mockedRateLimit.mockResolvedValue(false);
    const req = makeRequest(VALID_PARAMS);
    const res = await GET(req as never);
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing candidateName", async () => {
    const params = { ...VALID_PARAMS };
    delete (params as Record<string, string>).candidateName;
    const res = await GET(makeRequest(params) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/candidateName/i);
  });

  it("returns 400 for missing stateCode", async () => {
    const params = { ...VALID_PARAMS };
    delete (params as Record<string, string>).stateCode;
    const res = await GET(makeRequest(params) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid jurisdiction", async () => {
    const res = await GET(
      makeRequest({ ...VALID_PARAMS, jurisdiction: "county-harris" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/jurisdiction/i);
  });

  it("returns 400 for invalid canonicalIssue (injection attempt)", async () => {
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        canonicalIssue: "'; DROP TABLE candidates;--",
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid resolvedStance", async () => {
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        resolvedStance: "maybe",
      }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/resolvedStance/i);
  });

  it("accepts federal-house jurisdiction", async () => {
    mockedResolve.mockResolvedValue("federal-A123");
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
    mockedResolve.mockResolvedValue("federal-B456");
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
    mockedResolve.mockResolvedValue("openstates-tx-999");
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
// Candidate not found
// ---------------------------------------------------------------------------

describe("GET /api/alignment — candidate not found", () => {
  it("returns found:false when candidate cannot be resolved", async () => {
    mockedResolve.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(body.unavailable.reason).toMatch(/not found in our voting record/i);
  });

  it("sets a shorter cache header for not-found responses", async () => {
    mockedResolve.mockResolvedValue(null);
    const res = await GET(makeRequest(VALID_PARAMS) as never);
    const cc = res.headers.get("cache-control") ?? "";
    // Should be a shorter cache than the 3600 for found results
    expect(cc).toContain("s-maxage=900");
  });
});

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("GET /api/alignment — happy path", () => {
  it("returns found:true with kept/total/contributingVotes", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.kept).toBe(4);
    expect(body.total).toBe(6);
    expect(body.contributingVotes).toHaveLength(1);
    expect(body.contributingVotes[0].billTitle).toBe(
      "HB 100 — Medicaid Expansion",
    );
  });

  it("passes correct candidateId to lookupAlignment", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    await GET(makeRequest(VALID_PARAMS) as never);
    expect(mockedLookup).toHaveBeenCalledWith(
      "openstates-tx-123",
      "healthcare_affordability",
      "in_favor",
    );
  });

  it("sets 1-hour cache for found results", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    mockedLookup.mockResolvedValue(HAPPY_PATH_RESULT);

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=3600");
  });
});

// ---------------------------------------------------------------------------
// Missing tags (found but no data)
// ---------------------------------------------------------------------------

describe("GET /api/alignment — no tagged votes", () => {
  it("returns found:true with kept=0, total=0, and unavailable reason", async () => {
    mockedResolve.mockResolvedValue("openstates-tx-123");
    mockedLookup.mockResolvedValue({
      found: true,
      candidateId: "openstates-tx-123",
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: {
        reason: "No tagged votes for this issue in our records yet",
      },
    });

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.kept).toBe(0);
    expect(body.total).toBe(0);
    expect(body.unavailable.reason).toMatch(/no tagged votes/i);
  });
});

// ---------------------------------------------------------------------------
// Alignment math verification via route
// ---------------------------------------------------------------------------

describe("GET /api/alignment — alignment math edge cases", () => {
  it("kept <= total always", async () => {
    mockedResolve.mockResolvedValue("federal-A123");
    mockedLookup.mockResolvedValue({
      found: true,
      candidateId: "federal-A123",
      kept: 2,
      total: 5,
      contributingVotes: [],
    });

    const res = await GET(
      makeRequest({ ...VALID_PARAMS, jurisdiction: "federal-house" }) as never,
    );
    const body = await res.json();
    expect(body.kept).toBeLessThanOrEqual(body.total);
  });

  it("returns opposed stance result correctly", async () => {
    mockedResolve.mockResolvedValue("federal-A123");
    mockedLookup.mockResolvedValue({
      found: true,
      candidateId: "federal-A123",
      kept: 3,
      total: 3,
      contributingVotes: [
        {
          billTitle: "Gun Background Check Expansion",
          voteCast: "with" as const,
          date: "2024-06-01",
          source: { name: "govtrack", url: "https://govtrack.us/bill/gun" },
        },
      ],
    });

    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        jurisdiction: "federal-house",
        canonicalIssue: "gun_rights_safety",
        resolvedStance: "opposed",
      }) as never,
    );
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.contributingVotes[0].voteCast).toBe("with");
  });
});
