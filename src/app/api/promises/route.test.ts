/**
 * src/app/api/promises/route.test.ts
 *
 * Tests for GET /api/promises. All DB and rate-limit dependencies are
 * mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../lib/server/counters-rate-limit", () => ({
  checkCounterRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../lib/server/promises", () => ({
  lookupCandidatePromises: vi.fn(),
}));

import { checkCounterRateLimit } from "../../../lib/server/counters-rate-limit";
import { lookupCandidatePromises } from "../../../lib/server/promises";
import { GET } from "./route";

const mockedRateLimit = vi.mocked(checkCounterRateLimit);
const mockedLookup = vi.mocked(lookupCandidatePromises);

function makeRequest(params: Record<string, string>): Request {
  const url = new URL("http://localhost/api/promises");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString(), {
    headers: { "x-real-ip": "127.0.0.1" },
  });
}

const VALID_PARAMS = { candidateId: "federal-A" } as const;

const SAMPLE_PROMISE = {
  id: "promise-1",
  canonicalIssue: "healthcare_affordability",
  subIssue: null,
  promiseText: "I will vote no on any bill cutting Medicaid eligibility.",
  promiseType: "vote",
  conditionsDeadline: null,
  venue: "campaign_site",
  madeAt: "2026-03-01",
  sourceUrl: "https://example.com/platform",
  archiveUrl:
    "https://web.archive.org/web/20260301/https://example.com/platform",
  verdict: null,
  actions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedRateLimit.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------------

describe("GET /api/promises — rate limit", () => {
  it("returns 429 when rate limit exceeded", async () => {
    mockedRateLimit.mockResolvedValue(false);
    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("GET /api/promises — validation", () => {
  it("returns 400 for missing candidateId", async () => {
    const res = await GET(makeRequest({}) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/candidateId/i);
  });

  it("returns 400 for a candidateId with disallowed characters", async () => {
    const res = await GET(
      makeRequest({ candidateId: "federal/../A" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a candidateId over 128 chars", async () => {
    const res = await GET(
      makeRequest({ candidateId: "a".repeat(129) }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown issue value", async () => {
    const res = await GET(
      makeRequest({ ...VALID_PARAMS, issue: "not_a_real_issue" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/issue/i);
  });

  it("returns 400 for an Object.prototype key masquerading as an issue", async () => {
    // isCanonicalIssueId uses an own-key Set, not `in` — "toString" must not
    // pass by inheriting from Object.prototype.
    const res = await GET(
      makeRequest({ ...VALID_PARAMS, issue: "toString" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("accepts a known canonical issue", async () => {
    mockedLookup.mockResolvedValue([]);
    const res = await GET(
      makeRequest({
        ...VALID_PARAMS,
        issue: "healthcare_affordability",
      }) as never,
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Happy path / honest-empty
// ---------------------------------------------------------------------------

describe("GET /api/promises — happy path", () => {
  it("returns 200 + status ok with promises for a known candidate", async () => {
    mockedLookup.mockResolvedValue([SAMPLE_PROMISE]);

    const res = await GET(makeRequest(VALID_PARAMS) as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.promises).toHaveLength(1);
    expect(body.promises[0].promiseText).toBe(SAMPLE_PROMISE.promiseText);
  });

  it("returns status ok with an empty list for an unknown candidate — never 404", async () => {
    mockedLookup.mockResolvedValue([]);

    const res = await GET(
      makeRequest({ candidateId: "federal-unknown" }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.promises).toEqual([]);
  });

  it("passes candidateId and issue through to lookupCandidatePromises", async () => {
    mockedLookup.mockResolvedValue([]);

    await GET(
      makeRequest({
        ...VALID_PARAMS,
        issue: "healthcare_affordability",
      }) as never,
    );
    expect(mockedLookup).toHaveBeenCalledWith(
      "federal-A",
      "healthcare_affordability",
    );
  });

  it("omits the issue argument entirely when not provided", async () => {
    mockedLookup.mockResolvedValue([]);

    await GET(makeRequest(VALID_PARAMS) as never);
    expect(mockedLookup).toHaveBeenCalledWith("federal-A", undefined);
  });
});
