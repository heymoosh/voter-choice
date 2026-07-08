/**
 * Tests for GET /api/polis/bridges
 *
 * PR 10 — national-default. Supports `?scope=national` (default) and
 * `?scope=county&stateCode=X&county=Y`. v1 still returns the
 * `no_bridges_yet` sentinel once the count meets per-reading min,
 * because per-session statement persistence isn't shipped.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import {
  _resetMemoryForTesting,
  incrementSessionCounters,
} from "../../../../lib/server/counters";

const BRIDGES_PER_READING_MIN = 50;

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/polis/bridges");
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

describe("GET /api/polis/bridges — national (default)", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
  });

  it("no params → scope=national, returns nationwide aggregation", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 30,
      idPrefix: "nat-bridges-tx",
    });
    await seedSessions({
      stateCode: "CA",
      county: "Los Angeles",
      primary: "OPEN",
      n: 40,
      idPrefix: "nat-bridges-ca",
    });
    const res = await GET(makeRequest({}));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(70); // 30 + 40
    // 70 >= 50 → no_bridges_yet (v1: statement persistence missing)
    expect(json.status).toBe("no_bridges_yet");
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
    expect(json.county).toBeUndefined();
  });

  it("scope=national: count=0 and bridges=[]/divided=[] when nothing seeded", async () => {
    const res = await GET(makeRequest({ scope: "national" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.threshold).toBe(BRIDGES_PER_READING_MIN);
    expect(json.count).toBe(0);
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
  });

  it("scope=national: below_threshold when 0 < count < min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 12,
      idPrefix: "nat-bridges-low",
    });
    const res = await GET(makeRequest({ scope: "national" }));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
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
      "bridges",
      "divided",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("GET /api/polis/bridges — county scope", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
  });

  it("scope=county requires stateCode (returns 400 if missing)", async () => {
    const res = await GET(makeRequest({ scope: "county", county: "Travis" }));
    expect(res.status).toBe(400);
  });

  it("scope=county requires county (returns 400 if missing)", async () => {
    const res = await GET(makeRequest({ scope: "county", stateCode: "TX" }));
    expect(res.status).toBe(400);
  });

  it("backward compat: ?stateCode=X&county=Y (no scope) → scope=county", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(0);
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
  });

  it("scope=county: count=0 and bridges=[]/divided=[] for zero-session county", async () => {
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.threshold).toBe(BRIDGES_PER_READING_MIN);
    expect(json.count).toBe(0);
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
  });

  it("scope=county: below_threshold sentinel when 0 < count < per-reading min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 12,
      idPrefix: "bridges-low",
    });
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
  });

  it("scope=county: no_bridges_yet when count >= min (v1)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 80,
      idPrefix: "bridges-met",
    });
    const res = await GET(
      makeRequest({ scope: "county", stateCode: "TX", county: "Travis" }),
    );
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(80);
    expect(json.status).toBe("no_bridges_yet");
    expect(json.bridges).toEqual([]);
    expect(json.divided).toEqual([]);
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
      "bridges",
      "divided",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});
