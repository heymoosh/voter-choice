/**
 * Tests for GET /api/polis/bridges?stateCode=X&county=Y
 *
 * Bridge statements (80%+ across every cluster). In v1, returns the
 * below_threshold sentinel because per-session statement persistence
 * + cluster labels don't exist yet.
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

describe("GET /api/polis/bridges", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
  });

  it("returns 400 when stateCode is missing", async () => {
    const res = await GET(makeRequest({ county: "Travis" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when county is missing", async () => {
    const res = await GET(makeRequest({ stateCode: "TX" }));
    expect(res.status).toBe(400);
  });

  it("returns count=0 and bridges=[] for zero-session county", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.county).toBe("Travis");
    expect(json.threshold).toBe(BRIDGES_PER_READING_MIN);
    expect(json.count).toBe(0);
    expect(json.bridges).toEqual([]);
  });

  it("returns below_threshold sentinel when count > 0 but < per-reading min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 12,
      idPrefix: "bridges-low",
    });
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bridges).toEqual([]);
  });

  it("returns no_bridges_yet sentinel when count >= min but statement persistence is missing (v1)", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      n: 80,
      idPrefix: "bridges-met",
    });
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    expect(json.count).toBe(80);
    expect(json.status).toBe("no_bridges_yet");
    expect(json.bridges).toEqual([]);
  });

  it("response shape contains only allowlisted top-level keys", async () => {
    const res = await GET(makeRequest({ stateCode: "TX", county: "Travis" }));
    const json = await res.json();
    const allowed = new Set([
      "county",
      "threshold",
      "count",
      "status",
      "bridges",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});
