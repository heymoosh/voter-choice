/**
 * Parity + full-iteration proof for the SCAN-based key enumeration that
 * replaced the blocking `KEYS pattern:*` calls in counters.ts.
 *
 * A mock Upstash REST endpoint backs a fixed keyspace and answers SCAN in the
 * awkward ways a real Redis can: multi-page slices, an EMPTY page carrying a
 * NON-ZERO cursor (a scan must not stop early on it), and a duplicate key in
 * the final page (dedup must collapse it). The durable aggregate fetchers are
 * then asserted against hand-computed expectations — proving the returned data
 * shapes are unchanged from what KEYS would have produced.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const NS = "voter-choice:counters";

// Seeded keyspace: two states, per-primary totals, and per-issue counters.
const KEYSPACE: Record<string, string> = {
  [`${NS}:state:TX:total`]: "120",
  [`${NS}:state:CA:total`]: "80",
  [`${NS}:state:TX:primary:DEM:total`]: "70",
  [`${NS}:state:TX:primary:REP:total`]: "50",
  [`${NS}:state:CA:primary:DEM:total`]: "80",
  [`${NS}:state:TX:primary:DEM:issue:healthcare_affordability`]: "40",
  [`${NS}:state:TX:primary:REP:issue:healthcare_affordability`]: "20",
  [`${NS}:state:CA:primary:DEM:issue:healthcare_affordability`]: "30",
  [`${NS}:state:TX:primary:DEM:issue:education_funding`]: "15",
};

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\\\*/g, ".*")}$`);
}

const PAGE = 3;

/**
 * Mock SCAN over the static keyspace. Cursor is an integer offset, plus two
 * sentinel states appended after the real slices:
 *   "EMPTY" → an empty key slice with a still-non-zero cursor
 *   "DUP"   → a final slice repeating an already-seen key, then cursor "0"
 */
function mockScan(cursor: string, pattern: string): [string, string[]] {
  const all = Object.keys(KEYSPACE)
    .filter((k) => globToRegExp(pattern).test(k))
    .sort();

  if (cursor === "EMPTY") return ["DUP", []];
  if (cursor === "DUP") return ["0", all.length ? [all[0]] : []];

  const off = Number(cursor);
  const slice = all.slice(off, off + PAGE);
  const nextOff = off + PAGE;
  if (nextOff >= all.length) return ["EMPTY", slice];
  return [String(nextOff), slice];
}

describe("counters SCAN parity (durable path)", () => {
  beforeEach(() => {
    vi.stubEnv("KV_REST_API_URL", "https://mock-redis.local");
    vi.stubEnv("KV_REST_API_TOKEN", "mock-token");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const cmd = JSON.parse(String(init?.body)) as (string | number)[];
      const op = cmd[0];

      if (op === "SCAN") {
        const cursor = String(cmd[1]);
        const matchIdx = cmd.indexOf("MATCH");
        const pattern = String(cmd[matchIdx + 1]);
        return new Response(
          JSON.stringify({ result: mockScan(cursor, pattern) }),
          { status: 200 },
        );
      }
      if (op === "GET") {
        const key = String(cmd[1]);
        return new Response(JSON.stringify({ result: KEYSPACE[key] ?? null }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ result: null }), { status: 200 });
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fetchNationalPolisAggregate sums totals/primaries/issues across full SCAN", async () => {
    const { fetchNationalPolisAggregate } = await import("./counters");
    const agg = await fetchNationalPolisAggregate();

    expect(agg.scope).toBe("national");
    expect(agg.sampleSize).toBe(200); // 120 + 80

    const primaries = Object.fromEntries(
      agg.primaryTotals.map((p) => [p.primary, p.count]),
    );
    expect(primaries).toEqual({ DEM: 150, REP: 50 }); // DEM 70+80, REP 50

    const issues = Object.fromEntries(
      agg.issueCounts.map((i) => [`${i.primary}|${i.canonicalIssue}`, i.count]),
    );
    expect(issues).toEqual({
      "DEM|healthcare_affordability": 70, // 40 + 30
      "REP|healthcare_affordability": 20,
      "DEM|education_funding": 15,
    });
  });

  it("fetchNationalOverlapCounts sums issues across primaries via SCAN", async () => {
    const { fetchNationalOverlapCounts } = await import("./counters");
    const overlap = await fetchNationalOverlapCounts();

    expect(overlap.count).toBe(200);
    expect(overlap.issueCounts).toEqual({
      healthcare_affordability: 90, // 40 + 20 + 30
      education_funding: 15,
    });
  });

  it("redisScanKeys returns the deduped full match set despite paging quirks", async () => {
    const { redisScanKeys } = await import("./durable-store");
    const keys = await redisScanKeys(`${NS}:state:*:total`);

    // 5 total-suffixed keys; the injected duplicate final page must collapse.
    expect(keys.sort()).toEqual(
      [
        `${NS}:state:CA:primary:DEM:total`,
        `${NS}:state:CA:total`,
        `${NS}:state:TX:primary:DEM:total`,
        `${NS}:state:TX:primary:REP:total`,
        `${NS}:state:TX:total`,
      ].sort(),
    );
  });
});
