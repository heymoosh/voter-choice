import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import {
  _resetMemoryForTesting,
  incrementSessionCounters,
} from "../../../lib/server/counters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/polis");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// Seed in-memory counters with N sessions
async function seedSessions(
  stateCode: string,
  county: string | null,
  primary: "DEM" | "REP" | "OPEN" | "GENERAL",
  concerns: string[],
  n: number,
  idPrefix: string,
) {
  for (let i = 0; i < n; i++) {
    await incrementSessionCounters({
      sessionId: `${idPrefix}-${i}`,
      stateCode,
      county,
      primary,
      confirmedConcerns: concerns.map((c) => ({ canonicalIssue: c })),
      picks: [],
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/polis", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 400 when stateCode is missing", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("threshold-not-met response shape: sampleSize < 200", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      10,
      "polis-notmet-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      10,
      "polis-notmet-rep",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.thresholdMet).toBe(false);
    expect(json.sampleSize).toBeGreaterThan(0);
    expect(json.sampleSize).toBeLessThan(200);
    expect(typeof json.countToUnlock).toBe("number");
    expect(json.countToUnlock).toBeGreaterThan(0);
    expect(Array.isArray(json.dots)).toBe(true);
    expect(Array.isArray(json.consensus)).toBe(true);
  });

  it("threshold-met response shape: sampleSize >= 200, countToUnlock absent", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability", "education_funding"],
      110,
      "polis-met-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security", "economy_jobs"],
      110,
      "polis-met-rep",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.thresholdMet).toBe(true);
    expect(json.sampleSize).toBeGreaterThanOrEqual(200);
    expect(json.countToUnlock).toBeUndefined();
    expect(json.scope).toMatch(/^(county|state)$/);
    expect(Array.isArray(json.dots)).toBe(true);
    expect(json.dots.length).toBeGreaterThan(0);
    expect(Array.isArray(json.consensus)).toBe(true);
  });

  it("dots have correct shape: {x, y, primary}", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      100,
      "polis-shape-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      100,
      "polis-shape-rep",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.dots.length).toBeGreaterThan(0);
    for (const dot of json.dots) {
      expect(typeof dot.x).toBe("number");
      expect(typeof dot.y).toBe("number");
      expect(typeof dot.primary).toBe("string");
      expect(dot.x).toBeGreaterThanOrEqual(-1);
      expect(dot.x).toBeLessThanOrEqual(1);
      expect(dot.y).toBeGreaterThanOrEqual(-1);
      expect(dot.y).toBeLessThanOrEqual(1);
    }
  });

  it("consensus panel: top issues present with percent and issueLabel", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability", "education_funding"],
      110,
      "polis-consensus-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security", "economy_jobs"],
      110,
      "polis-consensus-rep",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.consensus.length).toBeGreaterThan(0);
    expect(json.consensus.length).toBeLessThanOrEqual(5);

    for (const item of json.consensus) {
      expect(typeof item.canonicalIssue).toBe("string");
      expect(typeof item.issueLabel).toBe("string");
      expect(typeof item.percent).toBe("number");
      expect(item.percent).toBeGreaterThanOrEqual(0);
      expect(item.percent).toBeLessThanOrEqual(100);
    }
  });

  it("'you' projection: userConcerns param returns non-null you", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      110,
      "polis-you-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      110,
      "polis-you-rep",
    );

    const res = await GET(
      makeRequest({
        stateCode: "TX",
        county: "Harris",
        userConcerns: "healthcare_affordability,education_funding",
      }),
    );
    const json = await res.json();

    expect(json.you).not.toBeNull();
    expect(typeof json.you.x).toBe("number");
    expect(typeof json.you.y).toBe("number");
  });

  it("'you' is null when userConcerns is empty", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      10,
      "polis-noyou-dem",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.you).toBeNull();
  });

  it("'you' is null when userConcerns param is empty string", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      10,
      "polis-noyou-empty-dem",
    );

    const res = await GET(
      makeRequest({ stateCode: "TX", county: "Harris", userConcerns: "" }),
    );
    const json = await res.json();

    expect(json.you).toBeNull();
  });

  it("scope falls back to state when county is below threshold but state is above", async () => {
    // 100 Harris + 100 Travis = 200 state; neither county > 200
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      100,
      "polis-scope-h",
    );
    await seedSessions(
      "TX",
      "Travis",
      "REP",
      ["border_security"],
      100,
      "polis-scope-t",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.scope).toBe("state");
    expect(json.thresholdMet).toBe(true);
  });

  it("no data: returns empty dots and consensus without error", async () => {
    const res = await GET(makeRequest({ stateCode: "ZZ", county: "Nowhere" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.sampleSize).toBe(0);
    expect(json.dots).toEqual([]);
    expect(json.consensus).toEqual([]);
    expect(json.you).toBeNull();
  });
});
