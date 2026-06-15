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

describe("GET /api/polis (party-free overlap cloud)", () => {
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

  it("renders below the old 200 gate — no display threshold", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      10,
      "polis-low-dem",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      10,
      "polis-low-rep",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.sampleSize).toBe(20);
    expect(json.thresholdMet).toBe(false);
    // No gate, no unlock countdown.
    expect(json.countToUnlock).toBeUndefined();
    // The cloud renders even far below 200.
    expect(json.dots.length).toBeGreaterThan(0);
  });

  it("draws exactly one dot per finished session at low N (no inflation)", async () => {
    await seedSessions(
      "WY",
      null,
      "GENERAL",
      ["economy_jobs"],
      3,
      "polis-honest",
    );

    const res = await GET(makeRequest({ stateCode: "WY" }));
    const json = await res.json();

    expect(json.sampleSize).toBe(3);
    // The old code forced a 30-dot-per-primary minimum; honesty demands N dots.
    expect(json.dots.length).toBe(3);
  });

  it("caps the cloud but never invents people beyond the sample", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "GENERAL",
      ["healthcare_affordability"],
      250,
      "polis-cap",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.sampleSize).toBe(250);
    expect(json.thresholdMet).toBe(true);
    expect(json.dots.length).toBe(250); // below MAX_DOTS → exact
    expect(json.dots.length).toBeLessThanOrEqual(250);
  });

  it("dots are party-free {x, y} within bounds", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      60,
      "polis-shape-d",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      60,
      "polis-shape-r",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.dots.length).toBeGreaterThan(0);
    for (const dot of json.dots) {
      expect(typeof dot.x).toBe("number");
      expect(typeof dot.y).toBe("number");
      expect(dot).not.toHaveProperty("primary"); // party is gone
      expect(dot.x).toBeGreaterThanOrEqual(-1);
      expect(dot.x).toBeLessThanOrEqual(1);
      expect(dot.y).toBeGreaterThanOrEqual(-1);
      expect(dot.y).toBeLessThanOrEqual(1);
    }
    // Response carries no party-grouped structure.
    expect(json.groups).toBeUndefined();
  });

  it("consensus: top issues with percent and issueLabel (party-free)", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability", "education_funding"],
      110,
      "polis-cons-d",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security", "economy_jobs"],
      110,
      "polis-cons-r",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.consensus.length).toBeGreaterThan(0);
    expect(json.consensus.length).toBeLessThanOrEqual(5);
    for (const item of json.consensus) {
      expect(typeof item.canonicalIssue).toBe("string");
      expect(typeof item.issueLabel).toBe("string");
      expect(item.percent).toBeGreaterThanOrEqual(0);
      expect(item.percent).toBeLessThanOrEqual(100);
    }
  });

  it("overlap stat: youShares reflects the voter's own priorities", async () => {
    // 100 share healthcare, 100 share border → sample 200.
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      100,
      "polis-ov-d",
    );
    await seedSessions(
      "TX",
      "Harris",
      "REP",
      ["border_security"],
      100,
      "polis-ov-r",
    );

    const res = await GET(
      makeRequest({
        stateCode: "TX",
        county: "Harris",
        userConcerns: "healthcare_affordability",
      }),
    );
    const json = await res.json();

    expect(json.overlap.mostCommon).not.toBeNull();
    expect(json.overlap.youShares[0].canonicalIssue).toBe(
      "healthcare_affordability",
    );
    expect(json.overlap.youShares[0].percent).toBe(50); // 100 / 200
    expect(json.issueRegions.length).toBeGreaterThan(0);
  });

  it("'you' projection is non-null with userConcerns and within bounds", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      40,
      "polis-you-d",
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
    expect(json.overlap.youShares.length).toBeGreaterThan(0);
  });

  it("'you' is null when userConcerns is absent or empty", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      10,
      "polis-noyou",
    );

    const a = await (
      await GET(makeRequest({ stateCode: "TX", county: "Harris" }))
    ).json();
    expect(a.you).toBeNull();
    expect(a.overlap.youShares).toEqual([]);

    const b = await (
      await GET(
        makeRequest({ stateCode: "TX", county: "Harris", userConcerns: "" }),
      )
    ).json();
    expect(b.you).toBeNull();
  });

  it("uses the county scope whenever the county has finishers", async () => {
    await seedSessions(
      "TX",
      "Harris",
      "DEM",
      ["healthcare_affordability"],
      20,
      "polis-county",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.scope).toBe("county");
    expect(json.sampleSize).toBe(20);
  });

  it("falls back to state when the county has no finishers", async () => {
    // State-only sessions (county unknown) → Harris county total is 0.
    await seedSessions(
      "TX",
      null,
      "DEM",
      ["healthcare_affordability"],
      30,
      "polis-statefb",
    );

    const res = await GET(makeRequest({ stateCode: "TX", county: "Harris" }));
    const json = await res.json();

    expect(json.scope).toBe("state");
    expect(json.sampleSize).toBe(30);
  });

  it("no data: empty cloud, consensus, and overlap without error", async () => {
    const res = await GET(makeRequest({ stateCode: "ZZ", county: "Nowhere" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.sampleSize).toBe(0);
    expect(json.dots).toEqual([]);
    expect(json.consensus).toEqual([]);
    expect(json.issueRegions).toEqual([]);
    expect(json.you).toBeNull();
    expect(json.overlap.mostCommon).toBeNull();
  });

  it("scope=national aggregates across states without requiring stateCode", async () => {
    await seedSessions(
      "TX",
      null,
      "GENERAL",
      ["healthcare_affordability"],
      120,
      "polis-nat-tx",
    );
    await seedSessions(
      "NJ",
      null,
      "GENERAL",
      ["healthcare_affordability", "immigration"],
      120,
      "polis-nat-nj",
    );

    const res = await GET(makeRequest({ scope: "national" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.sampleSize).toBe(240);
    expect(json.thresholdMet).toBe(true);
    expect(json.groups).toBeUndefined();
    const consensusIssues = json.consensus.map(
      (c: { canonicalIssue: string }) => c.canonicalIssue,
    );
    expect(consensusIssues).toContain("healthcare_affordability");
  });

  it("scope=national renders below 200 with no unlock countdown", async () => {
    await seedSessions(
      "TX",
      null,
      "GENERAL",
      ["healthcare_affordability"],
      10,
      "polis-nat-low",
    );

    const res = await GET(makeRequest({ scope: "national" }));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.sampleSize).toBe(10);
    expect(json.thresholdMet).toBe(false);
    expect(json.countToUnlock).toBeUndefined();
    expect(json.dots.length).toBe(10);
  });
});
