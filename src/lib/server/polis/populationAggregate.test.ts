/**
 * Tests for population-level Polis aggregation (Phase 8 — real bridges/divided).
 *
 * `tallyPopulationResponses` / `computePopulationAggregate` are pure —
 * synthetic in-memory rows only, no DB. `fetchPopulationAggregate` is
 * exercised with `db/client` + `db/schema` mocked (no live Neon connection),
 * mirroring the convention in `collectVector.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

vi.mock("../../../../db/schema", () => ({
  polisResponseVectors: { responses: "responses_column" },
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../../db/client";
import {
  tallyPopulationResponses,
  computePopulationAggregate,
  fetchPopulationAggregate,
  type PolisResponseRow,
} from "./populationAggregate";

const mockedGetDb = vi.mocked(getDb);

function makeSelectMock(rows: Array<{ responses: PolisResponseRow }>) {
  const from = vi.fn().mockResolvedValue(rows);
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select } as unknown, select, from };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/* ── tallyPopulationResponses ────────────────────────────────── */

describe("tallyPopulationResponses", () => {
  it("computes agree/disagree/pass percent per statement across the whole population", () => {
    const rows: PolisResponseRow[] = [
      { stock_trading_ban: "agree", term_limits: "agree" },
      { stock_trading_ban: "agree", term_limits: "disagree" },
      { stock_trading_ban: "agree", term_limits: "disagree" },
      { stock_trading_ban: "agree", term_limits: "pass" },
    ];
    const tallies = tallyPopulationResponses(rows);
    const byId = Object.fromEntries(tallies.map((t) => [t.statement, t]));

    expect(byId.stock_trading_ban).toEqual({
      statement: "stock_trading_ban",
      agreePercent: 100,
      disagreePercent: 0,
      passPercent: 0,
    });
    expect(byId.term_limits).toEqual({
      statement: "term_limits",
      agreePercent: 25,
      disagreePercent: 50,
      passPercent: 25,
    });
  });

  it("counts an unanswered statement (absent key) against agreement, same as clustering.ts convention", () => {
    const rows: PolisResponseRow[] = [
      { a: "agree" },
      {}, // did not answer "a" at all
    ];
    const tallies = tallyPopulationResponses(rows);
    expect(tallies).toEqual([
      { statement: "a", agreePercent: 50, disagreePercent: 0, passPercent: 0 },
    ]);
  });

  it("returns an empty array for zero rows", () => {
    expect(tallyPopulationResponses([])).toEqual([]);
  });
});

/* ── computePopulationAggregate ──────────────────────────────── */

describe("computePopulationAggregate", () => {
  it("(a) a statement everyone agrees on yields a real bridge", () => {
    const rows: PolisResponseRow[] = Array.from({ length: 10 }, () => ({
      stock_trading_ban: "agree" as const,
    }));
    const result = computePopulationAggregate(rows);
    expect(result.count).toBe(10);
    expect(result.bridges).toHaveLength(1);
    expect(result.bridges[0].statement).toBe("stock_trading_ban");
    expect(result.bridges[0].clusters).toEqual([
      { name: "population", agreementPercent: 100 },
    ]);
  });

  it("(b) a contested statement yields a divided/split result, not a bridge", () => {
    const rows: PolisResponseRow[] = [
      ...Array.from({ length: 5 }, () => ({ term_limits: "agree" as const })),
      ...Array.from({ length: 5 }, () => ({
        term_limits: "disagree" as const,
      })),
    ];
    const result = computePopulationAggregate(rows);
    expect(result.bridges).toEqual([]);
    expect(result.divided).toHaveLength(1);
    expect(result.divided[0]).toEqual({
      statement: "term_limits",
      agreePercent: 50,
      disagreePercent: 50,
    });
  });

  it("returns empty bridges/divided for zero rows", () => {
    const result = computePopulationAggregate([]);
    expect(result).toEqual({ count: 0, bridges: [], divided: [] });
  });
});

/* ── per-opinion-group agreement enrichment (DISPLAY ONLY) ──────
 *
 * Deterministic 3-archetype fixture that clusters into 3 opinion groups the
 * same way the opinion MAP does (same assembleClusterMap run) + a universal
 * "agree" statement s0 so a real population bridge exists too. Mirrors the
 * parity-gallery fixture so the shapes match what the report renders.
 */
const ENRICH_ARCHETYPES = {
  A: ["agree", "agree", "disagree", "disagree", "pass", "pass"],
  B: ["disagree", "disagree", "agree", "agree", "pass", "pass"],
  C: ["disagree", "disagree", "disagree", "disagree", "agree", "agree"],
} as const;

function enrichRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function archetypeRows(
  kind: "A" | "B" | "C",
  n: number,
  rng: () => number,
): PolisResponseRow[] {
  const base = ENRICH_ARCHETYPES[kind];
  const out: PolisResponseRow[] = [];
  for (let i = 0; i < n; i++) {
    const v: PolisResponseRow = { s0: "agree" }; // universal → a real bridge
    for (let j = 0; j < 6; j++) {
      let ans = base[j] as "agree" | "disagree" | "pass";
      if (rng() < 0.15) {
        const alt = ["agree", "disagree", "pass"] as const;
        ans = alt[Math.floor(rng() * 3)];
      }
      v[`s${j + 1}`] = ans;
    }
    out.push(v);
  }
  return out;
}

function clusteredPopulation(): PolisResponseRow[] {
  const rng = enrichRng(42);
  return [
    ...archetypeRows("A", 26, rng),
    ...archetypeRows("B", 25, rng),
    ...archetypeRows("C", 17, rng),
  ];
}

const CLUSTER_AGREEMENT_KEYS = ["agreePct", "clusterId", "label"];

describe("computePopulationAggregate — per-opinion-group enrichment", () => {
  it("attaches a per-group clusterAgreement to bridges/divided, reusing the map's Group A/B/C", () => {
    const result = computePopulationAggregate(clusteredPopulation());

    expect(result.bridges.length).toBeGreaterThan(0);
    expect(result.divided.length).toBeGreaterThan(0);

    for (const item of [...result.bridges, ...result.divided]) {
      expect(item.clusterAgreement).toBeDefined();
      // Party-free: labels are the neutral opinion groups the map assigns by
      // size, never D/R/I.
      expect(item.clusterAgreement!.map((c) => c.label)).toEqual([
        "Group A",
        "Group B",
        "Group C",
      ]);
      expect(item.clusterAgreement!.map((c) => c.clusterId)).toEqual([0, 1, 2]);
      for (const rec of item.clusterAgreement!) {
        expect(rec.agreePct).toBeGreaterThanOrEqual(0);
        expect(rec.agreePct).toBeLessThanOrEqual(100);
      }
    }

    // The universal-agree bridge converges — every group at 100%.
    const bridge = result.bridges[0];
    expect(bridge.clusterAgreement!.every((c) => c.agreePct === 100)).toBe(
      true,
    );
  });

  it("clusterAgreement records carry ONLY {clusterId,label,agreePct} — no party/session/token leak", () => {
    const result = computePopulationAggregate(clusteredPopulation());
    const allRecords = [...result.bridges, ...result.divided].flatMap(
      (i) => i.clusterAgreement ?? [],
    );
    expect(allRecords.length).toBeGreaterThan(0);

    for (const rec of allRecords) {
      expect(Object.keys(rec).sort()).toEqual(CLUSTER_AGREEMENT_KEYS);
    }

    // The whole serialized payload leaks no party / session / token strings.
    const serialized = JSON.stringify(result).toLowerCase();
    for (const banned of ["party", "dem", "republican", "session", "token"]) {
      expect(serialized).not.toContain(banned);
    }
  });

  it("omits clusterAgreement entirely when the population is too thin to cluster (map's fallback guard)", () => {
    // 3 rows, one statement → assembleClusterMap returns null (below the
    // minimum session count / <2 statements) → no fabricated group values.
    const result = computePopulationAggregate([
      { stock_trading_ban: "agree" },
      { stock_trading_ban: "agree" },
      { stock_trading_ban: "agree" },
    ]);
    for (const item of [...result.bridges, ...result.divided]) {
      expect(item.clusterAgreement).toBeUndefined();
    }
  });
});

/* ── fetchPopulationAggregate (DB mocked — never a live connection) ── */

describe("fetchPopulationAggregate", () => {
  it("returns null when DATABASE_URL is not configured (DB never queried)", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await fetchPopulationAggregate();
    expect(result).toBeNull();
  });

  it("(c) too-few rows still comes back honest — no false bridge from a tiny sample", async () => {
    // Only 3 rows, all agreeing — computeBridges alone would call this a
    // bridge; the ROUTE layer is responsible for gating on population.count
    // vs POPULATION_MIN_ROWS before trusting it. This test proves the raw
    // count the route needs for that gate is the real row count, not a
    // fabricated one.
    const { db } = makeSelectMock([
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
    ]);
    mockedGetDb.mockReturnValue(db as never);

    const result = await fetchPopulationAggregate();
    expect(result?.count).toBe(3);
  });

  it("loads real rows and returns computed bridges/divided", async () => {
    const { db, select, from } = makeSelectMock([
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
      { responses: { stock_trading_ban: "agree" } },
    ]);
    mockedGetDb.mockReturnValue(db as never);

    const result = await fetchPopulationAggregate();

    expect(select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      count: 5,
      bridges: [
        {
          statement: "stock_trading_ban",
          clusters: [{ name: "population", agreementPercent: 100 }],
        },
      ],
      divided: [],
    });
  });
});
