/**
 * src/lib/server/chamber-median.test.ts
 *
 * Unit tests for the chamber-median computation.
 * DB-backed lookupChamberMedian is tested with a mocked DB so no live
 * Neon connection is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client before importing anything that touches it
// ---------------------------------------------------------------------------
vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { computeMedian, lookupChamberMedian } from "./chamber-median";

const mockedGetDb = vi.mocked(getDb);

/** Build a minimal chainable Drizzle select mock that resolves to `rows`. */
function makeSelectMock(rows: Record<string, unknown>[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  return { select: vi.fn().mockReturnValue(chain) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// computeMedian — pure math, no DB
// ---------------------------------------------------------------------------

describe("computeMedian", () => {
  it("returns undefined for empty array", () => {
    expect(computeMedian([])).toBeUndefined();
  });

  it("returns the single value for a 1-element array", () => {
    expect(computeMedian([42])).toBe(42);
  });

  it("returns the middle value for odd count", () => {
    // [1, 3, 5] sorted → median = 3
    expect(computeMedian([5, 1, 3])).toBe(3);
    // [10, 20, 30, 40, 50] → median = 30
    expect(computeMedian([50, 10, 30, 40, 20])).toBe(30);
  });

  it("returns the average of two middle values for even count", () => {
    // [1, 2, 3, 4] → median = (2 + 3) / 2 = 2.5
    expect(computeMedian([3, 1, 4, 2])).toBe(2.5);
    // [100, 200] → median = 150
    expect(computeMedian([200, 100])).toBe(150);
  });

  it("handles duplicate values correctly", () => {
    // [5, 5, 5] → median = 5
    expect(computeMedian([5, 5, 5])).toBe(5);
    // [1, 1, 2, 2] → median = (1 + 2) / 2 = 1.5
    expect(computeMedian([2, 1, 1, 2])).toBe(1.5);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    computeMedian(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// lookupChamberMedian — DB-backed
// ---------------------------------------------------------------------------

describe("lookupChamberMedian — DB not configured", () => {
  it("returns undefined when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(
      DB_NOT_CONFIGURED as unknown as ReturnType<typeof getDb>,
    );
    const result = await lookupChamberMedian("house", "2026");
    expect(result).toBeUndefined();
  });
});

describe("lookupChamberMedian — insufficient data", () => {
  it("returns undefined when fewer than 2 qualifying rows exist", async () => {
    const mock = makeSelectMock([{ totalReceipts: "1500000.00" }]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("house", "2026");
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty result set", async () => {
    const mock = makeSelectMock([]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("senate", "2026");
    expect(result).toBeUndefined();
  });
});

describe("lookupChamberMedian — House median", () => {
  it("computes median over odd number of candidates", async () => {
    // Three House candidates with receipts: 500k, 1M, 2M → median = 1M
    const mock = makeSelectMock([
      { totalReceipts: "500000.00" },
      { totalReceipts: "1000000.00" },
      { totalReceipts: "2000000.00" },
    ]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("house", "2026");
    expect(result).toBe(1_000_000);
  });

  it("computes median over even number of candidates", async () => {
    // Four House candidates: 400k, 600k, 800k, 1.2M → median = (600k + 800k)/2 = 700k
    const mock = makeSelectMock([
      { totalReceipts: "1200000.00" },
      { totalReceipts: "400000.00" },
      { totalReceipts: "800000.00" },
      { totalReceipts: "600000.00" },
    ]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("house", "2026");
    expect(result).toBe(700_000);
  });
});

describe("lookupChamberMedian — Senate median", () => {
  it("computes median for Senate cycle", async () => {
    // Two Senate candidates: 5M, 15M → median = (5M + 15M) / 2 = 10M
    const mock = makeSelectMock([
      { totalReceipts: "5000000.00" },
      { totalReceipts: "15000000.00" },
    ]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("senate", "2026");
    expect(result).toBe(10_000_000);
  });
});

describe("lookupChamberMedian — filters non-finite values", () => {
  it("returns undefined when all rows have non-parseable receipts", async () => {
    // Rows returned but all have null/NaN-string values — after Number() + isFinite filter, <2 remain
    const mock = makeSelectMock([
      { totalReceipts: null },
      { totalReceipts: "NaN" },
    ]);
    mockedGetDb.mockReturnValue(mock as unknown as ReturnType<typeof getDb>);
    const result = await lookupChamberMedian("house", "2026");
    // These rows wouldn't actually be returned by the DB (WHERE > 0 + NOT NULL)
    // but the in-process filter also protects against unexpected values.
    expect(result).toBeUndefined();
  });
});
