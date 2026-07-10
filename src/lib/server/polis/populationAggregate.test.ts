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
