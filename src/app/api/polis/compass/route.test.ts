/**
 * Tests for GET /api/polis/compass?stateCode=X&county=Y
 *
 * Cluster compass. In v1, always returns below_threshold because
 * per-session persistence + offline PCA aren't wired yet.
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

describe("GET /api/polis/compass", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 when stateCode is missing", async () => {
    const res = await GET(makeRequest({ county: "Travis" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when county is missing", async () => {
    const res = await GET(makeRequest({ stateCode: "TX" }));
    expect(res.status).toBe(400);
  });

  it("default threshold = 150; below_threshold for zero-session county", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.county).toBe("Travis");
    expect(json.threshold).toBe(150);
    expect(json.count).toBe(0);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
  });

  it("below_threshold when count < 150 (with sessions)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 100,
      idPrefix: "compass-100",
    });
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    expect(json.count).toBe(100);
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
  });

  it("v1: even when count >= threshold, still returns below_threshold (PCA deferred)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 160,
      idPrefix: "compass-met",
    });
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    expect(json.count).toBe(160);
    // v1 always defers compass — per-session statement persistence + offline
    // PCA aren't shipped. UI shows the empty state with the count.
    expect(json.status).toBe("below_threshold");
    expect(json.clusters).toEqual([]);
    expect(json.dots).toEqual([]);
  });

  it("respects POLIS_COMPASS_THRESHOLD env override", async () => {
    vi.stubEnv("POLIS_COMPASS_THRESHOLD", "200");
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    expect(json.threshold).toBe(200);
  });

  it("response shape contains only allowlisted top-level keys", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    const allowed = new Set([
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
