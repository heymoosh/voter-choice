/**
 * Tests for GET /api/polis/bars
 *
 * PR 10 — national-default polis. The bars endpoint now accepts
 * `?scope=national` (default) and `?scope=county&county=X&stateCode=X`.
 * National aggregates across every state/county; county is the existing
 * "you're not alone in {county}" reading.
 *
 * Backward compat: `?stateCode=X&county=Y` (no `scope`) is treated as
 * scope=county to keep existing callers green.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import {
  _resetMemoryForTesting,
  incrementSessionCounters,
} from "../../../../lib/server/counters";

const BARS_PER_READING_MIN = 50;

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/polis/bars");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

async function seedSessions(opts: {
  stateCode: string;
  county: string;
  primary: "DEM" | "REP" | "OPEN" | "GENERAL";
  concerns: string[];
  n: number;
  idPrefix: string;
}) {
  for (let i = 0; i < opts.n; i++) {
    await incrementSessionCounters({
      sessionId: `${opts.idPrefix}-${i}`,
      stateCode: opts.stateCode,
      county: opts.county,
      primary: opts.primary,
      confirmedConcerns: opts.concerns.map((c) => ({ canonicalIssue: c })),
      picks: [],
    });
  }
}

describe("GET /api/polis/bars — national (default)", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
  });

  it("no params → scope=national, returns nationwide aggregation", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 30,
      idPrefix: "nat-tx",
    });
    await seedSessions({
      stateCode: "CA",
      county: "Los Angeles",
      primary: "OPEN",
      concerns: ["healthcare"],
      n: 25,
      idPrefix: "nat-ca",
    });

    const res = await GET(makeRequest({ userConcerns: "healthcare" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(55); // 30 + 25
    expect(json.bars[0].percent).toBe(100); // 55/55
    // No county field on national.
    expect(json.county).toBeUndefined();
  });

  it("?scope=national explicit → same as no params", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 50,
      idPrefix: "nat-explicit",
    });
    const res = await GET(
      makeRequest({ scope: "national", userConcerns: "healthcare" }),
    );
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(50);
  });

  it("scope=national → below_threshold when nation count > 0 but < min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 12,
      idPrefix: "nat-low",
    });
    const res = await GET(makeRequest({ scope: "national" }));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bars).toEqual([]);
  });

  it("scope=national → count=0 + bars=[] when nothing seeded", async () => {
    const res = await GET(makeRequest({}));
    const json = await res.json();
    expect(json.scope).toBe("national");
    expect(json.count).toBe(0);
    expect(json.bars).toEqual([]);
    expect(json.threshold).toBe(BARS_PER_READING_MIN);
  });

  it("national response shape: only allowlisted top-level keys", async () => {
    const res = await GET(makeRequest({ userConcerns: "healthcare" }));
    const json = await res.json();
    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "bars",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});

describe("GET /api/polis/bars — county scope", () => {
  beforeEach(() => {
    _resetMemoryForTesting();
  });

  it("?scope=county requires county param (returns 400 if missing)", async () => {
    const res = await GET(makeRequest({ scope: "county", stateCode: "TX" }));
    expect(res.status).toBe(400);
  });

  it("?scope=county requires stateCode param", async () => {
    const res = await GET(makeRequest({ scope: "county", county: "Travis" }));
    expect(res.status).toBe(400);
  });

  it("backward compat: ?stateCode=X&county=Y (no scope) → scope=county", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 50,
      idPrefix: "compat",
    });
    const res = await GET(
      makeRequest({
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(50);
    expect(json.bars[0].percent).toBe(100);
  });

  it("scope=county returns count=0 and bars=[] for zero-session county", async () => {
    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare,housing",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(0);
    expect(json.bars).toEqual([]);
    expect(json.threshold).toBe(BARS_PER_READING_MIN);
  });

  it("scope=county returns below_threshold when count > 0 but < per-reading min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 12,
      idPrefix: "bars-low",
    });
    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();
    expect(json.scope).toBe("county");
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bars).toEqual([]);
  });

  it("scope=county returns per-theme percentages when count >= per-reading min", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 30,
      idPrefix: "bars-h",
    });
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "REP",
      concerns: ["housing"],
      n: 20,
      idPrefix: "bars-r",
    });

    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare,housing,climate",
      }),
    );
    const json = await res.json();

    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(50);
    expect(json.status).toBeUndefined();
    expect(json.bars).toHaveLength(3);
    const byTheme = Object.fromEntries(
      (json.bars as Array<{ themeId: string; percent: number }>).map((b) => [
        b.themeId,
        b.percent,
      ]),
    );
    expect(byTheme.healthcare).toBe(60); // 30/50
    expect(byTheme.housing).toBe(40); // 20/50
    expect(byTheme.climate).toBe(0); // 0/50
  });

  it("scope=county does NOT fall back to state — county-only", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 50,
      idPrefix: "bars-tr",
    });
    await seedSessions({
      stateCode: "TX",
      county: "Harris",
      primary: "REP",
      concerns: ["healthcare"],
      n: 200,
      idPrefix: "bars-ha",
    });

    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();

    expect(json.scope).toBe("county");
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(50); // NOT 250 — Travis only.
    expect(json.bars[0].percent).toBe(100); // 50/50 from Travis alone
  });

  it("county response shape: only allowlisted top-level keys", async () => {
    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();
    const allowed = new Set([
      "scope",
      "county",
      "threshold",
      "count",
      "status",
      "bars",
    ]);
    for (const key of Object.keys(json)) {
      expect(allowed.has(key)).toBe(true);
    }
  });

  it("never includes identity-shaped keys in any bar record", async () => {
    await seedSessions({
      stateCode: "TX",
      county: "Travis",
      primary: "DEM",
      concerns: ["healthcare"],
      n: 60,
      idPrefix: "bars-id",
    });
    const res = await GET(
      makeRequest({
        scope: "county",
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();
    const forbidden = ["user_id", "session_id", "name", "address", "email"];
    for (const bar of json.bars) {
      for (const k of forbidden) {
        expect(Object.keys(bar)).not.toContain(k);
      }
    }
  });
});
