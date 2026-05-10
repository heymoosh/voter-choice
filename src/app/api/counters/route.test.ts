import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";
import { _resetRateLimitForTesting } from "../../../lib/server/counters-rate-limit";
import { _resetMemoryForTesting } from "../../../lib/server/counters";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  overrides: { headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest("http://localhost/api/counters", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      ...overrides.headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  sessionId: "sess-test-001",
  stateCode: "TX",
  county: "Harris",
  primary: "DEM",
  confirmedConcerns: [{ canonicalIssue: "healthcare_affordability" }],
  picks: [{ race: "governor", candidateId: "candidate-a" }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/counters", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    _resetRateLimitForTesting();
    _resetMemoryForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("happy path: returns { ok: true, alreadyCounted: false } for a valid first-time session", async () => {
    // No Redis env → in-memory path. Use unique sessionId to avoid cross-test collision.
    const body = { ...VALID_BODY, sessionId: `sess-happy-${Date.now()}` };
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.alreadyCounted).toBe(false);
  });

  it("invalid body: missing sessionId → 400", async () => {
    const req = makeRequest({ stateCode: "TX", primary: "DEM" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("invalid body: invalid primary value → 400", async () => {
    const req = makeRequest({ ...VALID_BODY, primary: "LIBERTARIAN" });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("invalid body: not JSON → 400", async () => {
    const req = new NextRequest("http://localhost/api/counters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "1.2.3.4",
      },
      body: "not-json!!!",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("rate limit: 21st request from same IP returns 429", async () => {
    // Use unique session IDs so they don't dedupe on the counter side.
    // The rate limit is per-IP (20 per hour).
    for (let i = 0; i < 20; i++) {
      const body = { ...VALID_BODY, sessionId: `sess-rl-${i}-${Date.now()}` };
      await POST(makeRequest(body));
    }

    // 21st request should hit the rate limit
    const body = { ...VALID_BODY, sessionId: `sess-rl-21-${Date.now()}` };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(429);
  });

  it("county=null is accepted and normalized", async () => {
    const body = {
      ...VALID_BODY,
      sessionId: `sess-null-county-${Date.now()}`,
      county: null,
    };
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("county omitted is accepted", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { county: _, ...bodyWithoutCounty } = VALID_BODY;
    const body = {
      ...bodyWithoutCounty,
      sessionId: `sess-no-county-${Date.now()}`,
    };
    const req = makeRequest(body);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
