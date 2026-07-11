import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { _resetRateLimitForTesting } from "../../../lib/server/counters-rate-limit";
import {
  _resetMemoryForTesting,
  fetchPolisAggregate,
} from "../../../lib/server/counters";
import { NextRequest } from "next/server";

import { POST } from "./route";

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

  it("drops a canonicalIssue not in the canonical set — never reflected in aggregates", async () => {
    const body = {
      ...VALID_BODY,
      sessionId: `sess-unknown-issue-${Date.now()}`,
      confirmedConcerns: [{ canonicalIssue: "not_a_real_issue" }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const agg = await fetchPolisAggregate("TX", null);
    expect(agg.sampleSize).toBe(1); // session still counted at state level
    // The bogus issue is absent from the aggregate entirely.
    expect(
      agg.issueCounts.some((c) => c.canonicalIssue === "not_a_real_issue"),
    ).toBe(false);
    expect(agg.issueCounts).toHaveLength(0);
  });

  it("drops a ':'-bearing canonicalIssue — never reaches a Redis key or aggregate", async () => {
    const body = {
      ...VALID_BODY,
      sessionId: `sess-colon-issue-${Date.now()}`,
      confirmedConcerns: [
        { canonicalIssue: "healthcare_affordability:evil*key" },
      ],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const agg = await fetchPolisAggregate("TX", null);
    expect(agg.issueCounts.some((c) => c.canonicalIssue.includes(":"))).toBe(
      false,
    );
    expect(agg.issueCounts).toHaveLength(0);
  });

  it("prototype-pollution key ('toString') is dropped, not treated as canonical", async () => {
    const body = {
      ...VALID_BODY,
      sessionId: `sess-proto-${Date.now()}`,
      confirmedConcerns: [{ canonicalIssue: "toString" }],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    const agg = await fetchPolisAggregate("TX", null);
    expect(agg.issueCounts).toHaveLength(0);
  });

  it("keeps valid siblings while dropping the invalid entry in the same POST", async () => {
    const body = {
      ...VALID_BODY,
      sessionId: `sess-mixed-${Date.now()}`,
      confirmedConcerns: [
        { canonicalIssue: "healthcare_affordability" },
        { canonicalIssue: "bogus:injected" },
        { canonicalIssue: "housing_affordability" },
      ],
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    const agg = await fetchPolisAggregate("TX", null);
    const issues = agg.issueCounts.map((c) => c.canonicalIssue).sort();
    expect(issues).toEqual([
      "healthcare_affordability",
      "housing_affordability",
    ]);
  });

  it("privacy: a county in the body is silently dropped — never stored", async () => {
    // Even if a client (or attacker) sends county, the route must collect
    // state-level only. We verify nothing landed in the county bucket.
    const body = {
      ...VALID_BODY,
      sessionId: `sess-county-drop-${Date.now()}`,
      county: "Harris",
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // The session counted at the STATE level; the Harris county bucket is empty,
    // so resolution falls back to state (county is never represented).
    const agg = await fetchPolisAggregate("TX", "Harris");
    expect(agg.scope).toBe("state");
    expect(agg.sampleSize).toBe(1);
  });

  it("retired stopgap: /api/counters response never carries Polis-vector fields, even with the flag on", async () => {
    // Polis response-vector collection moved to POST /api/polis/respond
    // (card fb77d0bb, PolisStand) — this route no longer touches
    // polis_response_vectors at all. Locks in the retirement: the response
    // shape stays exactly { ok, alreadyCounted }, flag or no flag.
    vi.stubEnv("POLIS_VECTOR_COLLECTION_ENABLED", "true");
    const body = {
      ...VALID_BODY,
      sessionId: `sess-polis-retired-${Date.now()}`,
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Object.keys(json).sort()).toEqual(["alreadyCounted", "ok"]);
  });
});
