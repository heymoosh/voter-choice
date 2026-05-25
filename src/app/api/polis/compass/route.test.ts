/**
 * Tests for GET /api/polis/compass
 *
 * PR 10 — national-default. Supports `?scope=national` (default) and
 * `?scope=county&stateCode=X&county=Y`. In v1, both scopes always
 * return the `below_threshold` sentinel because per-session statement
 * persistence + offline PCA aren't wired yet.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import {
  _resetMemoryForTesting,
  incrementSessionCounters,
} from "../../../../lib/server/counters";

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/polis/compass");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

async function seedSessions(opts: {
  stateCode: string;
  county: string;
  primary: "DEM" | "REP" | "OPEN" | "GENERAL";
  n: number;
  idPrefix: string;
}) {
  for (let i = 0; i < opts.n; i++) {
    await incrementSessionCounters({
      sessionId: `${opts.idPrefix}-${i}`,
      stateCode: opts.stateCode,
      county: opts.county,
      primary: opts.primary,
      confirmedConcerns: [{ canonicalIssue: "healthcare" }],
      picks: [],
    });
  }
}

describe("GET /api/polis/compass — national (default)", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no params → scope=national, default threshold 150, below_threshold sentinel", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.threshold).toBe(150);
    expect(json.count).toBe(0);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
    expect(json.county).toBeUndefined();
  });

  it("scope=national: aggregates nationwide counts", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 80,
      idPrefix: "nat-compass-tx",
    });
    await seedSessions({
      stateCode: "CA",
      county: "Los Angeles",
      primary: "OPEN",
      n: 90,
      idPrefix: "nat-compass-ca",
    });
    const res = await GET(makeRequest({ scope: "national" }));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(170); // 80 + 90
    // v1 always below_threshold (PCA deferred)
    expect(json.status).toBe("below_threshold");
  });

  it("scope=national: respects POLIS_COMPASS_THRESHOLD env override", async () => {
    vi.stubEnv("POLIS_COMPASS_THRESHOLD", "200");
    const res = await GET(makeRequest({ scope: "national" }));
    const json = await res.json();
    expect(json.threshold).toBe(200);
  });

  it("national response shape: only allowlisted top-level keys", async () => {
    const res = await GET(makeRequest({}));
    const json = await res.json();
    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "clusters",
      "dots",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("GET /api/polis/compass — county scope", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("scope=county requires stateCode", async () => {
    const res = await GET(makeRequest({ scope: "county", county: "Travis" }));
    expect(res.status).toBe(400);
  });

  it("scope=county requires county", async () => {
    const res = await GET(makeRequest({ scope: "county", stateCode: "TX" }));
    expect(res.status).toBe(400);
  });

  it("backward compat: ?stateCode=X&county=Y (no scope) → scope=county", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.threshold).toBe(150);
  });

  it("scope=county default threshold 150; below_threshold for zero-session county", async () => {
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.threshold).toBe(150);
    expect(json.count).toBe(0);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
  });

  it("scope=county: below_threshold when count < 150 (with sessions)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 100,
      idPrefix: "compass-100",
    });
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.count).toBe(100);
    expect(json.status).toBe("below_threshold");
  });

  it("scope=county v1: even when count >= threshold, still below_threshold (PCA deferred)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 160,
      idPrefix: "compass-met",
    });
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.count).toBe(160);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
  });

  it("scope=county respects POLIS_COMPASS_THRESHOLD env override", async () => {
    vi.stubEnv("POLIS_COMPASS_THRESHOLD", "200");
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    expect(json.threshold).toBe(200);
  });

  it("county response shape: only allowlisted top-level keys", async () => {
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "clusters",
      "dots",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});
