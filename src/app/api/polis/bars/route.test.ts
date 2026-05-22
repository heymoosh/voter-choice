/**
 * Tests for GET /api/polis/bars?stateCode=X&county=Y&userConcerns=a,b,c
 *
 * Bars endpoint: per-theme percentage of finished sessions in the county
 * that also confirmed each of the user's themes. No state-scope fallback —
 * "your county" is the framing.
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

describe("GET /api/polis/bars", () => {
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

  it("returns count=0 and bars=[] for a county with zero sessions", async () => {
    const res = await GET(
      makeRequest({
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare,housing",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.county).toBe("Travis");
    expect(json.count).toBe(0);
    expect(json.bars).toEqual([]);
    expect(json.threshold).toBe(BARS_PER_READING_MIN);
  });

  it("returns below_threshold status when count > 0 but < per-reading min", async () => {
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
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();
    expect(json.count).toBe(12);
    expect(json.status).toBe("below_threshold");
    expect(json.bars).toEqual([]);
  });

  it("returns per-theme percentages when count >= per-reading min", async () => {
    // 50 sessions in county: 30 with healthcare, 20 with housing.
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
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare,housing,climate",
      }),
    );
    const json = await res.json();

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

  it("does NOT fall back to state scope — county-only", async () => {
    // 50 sessions in Travis County alone (>= per-reading min)
    // and other sessions in different counties in the same state.
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
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();

    expect(json.county).toBe("Travis");
    expect(json.count).toBe(50); // NOT 250 — Travis only.
    expect(json.bars[0].percent).toBe(100); // 50/50 from Travis alone
  });

  it("response shape contains only allowlisted top-level keys", async () => {
    const res = await GET(
      makeRequest({
        stateCode: "TX",
        county: "Travis",
        userConcerns: "healthcare",
      }),
    );
    const json = await res.json();
    const allowed = new Set(["county", "threshold", "count", "status", "bars"]);
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
