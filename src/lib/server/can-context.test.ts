import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { canRaceId, lookupCanSeatContext } from "./can-context";

const mockedGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canRaceId", () => {
  it("builds the senate key", () => {
    expect(canRaceId("tx", "senate", null)).toBe("TX-senate");
  });
  it("builds zero-padded house keys (at-large = 00)", () => {
    expect(canRaceId("NJ", "house", 6)).toBe("NJ-house-06");
    expect(canRaceId("WY", "house", 0)).toBe("WY-house-00");
    expect(canRaceId("TX", "house", 32)).toBe("TX-house-32");
  });
});

describe("lookupCanSeatContext", () => {
  it("returns the empty context when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const ctx = await lookupCanSeatContext("TX", "senate", null, "cand-1");
    expect(ctx).toEqual({
      ratings: [],
      donorTrail: null,
      keyVotes: [],
      snapshotDate: null,
      sourceUrl: null,
    });
  });

  it("returns the empty context when no can_* rows exist", async () => {
    // Thenable chain that resolves [] for every query shape used.
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "where", "orderBy", "leftJoin", "innerJoin"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
      resolve([]);
    const select = vi.fn().mockReturnValue(chain);
    mockedGetDb.mockReturnValue({ select } as unknown as ReturnType<
      typeof getDb
    >);

    const ctx = await lookupCanSeatContext("NJ", "house", 6, "cand-1");
    expect(ctx.ratings).toEqual([]);
    expect(ctx.donorTrail).toBeNull();
    expect(ctx.keyVotes).toEqual([]);
  });
});
