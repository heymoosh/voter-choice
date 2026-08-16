/**
 * src/lib/server/outside-spending.test.ts
 *
 * Tests for the Part 6b read layer. The load-bearing one is
 * "support and oppose are never summed or netted": that is a
 * campaign-finance-law correctness requirement, not a formatting
 * preference (plan doc, Part 6b display rule + Open Risk #7).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  lookupOutsideSpending,
  MAX_SPENDERS_SHOWN,
  SPENDING_DIRECTIONS,
  type OutsideSpendingResult,
} from "./outside-spending";

const mockedGetDb = vi.mocked(getDb);

function makeDbMock(rows: Record<string, unknown>[]) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "innerJoin", "where", "orderBy"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  (chain as { then?: unknown }).then = (resolve: (v: unknown[]) => void) =>
    resolve(rows);
  return {
    select: vi.fn().mockReturnValue(chain),
  } as unknown as ReturnType<typeof getDb>;
}

function ieRow(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: "federal-A",
    committeeId: "C00900001",
    supportOppose: "support",
    amountTotal: "7000.00",
    expenditureCount: 3,
    name: "AN OUTSIDE GROUP",
    connectedOrg: null,
    sector: null,
    status: "auto",
    evidenceUrl: "https://www.fec.gov/data/committee/C00900001/",
    ...overrides,
  };
}

/** Unwrap the single-candidate result the fixtures above produce. */
function out(map: Map<string, OutsideSpendingResult>): OutsideSpendingResult {
  const value = map.get("federal-A");
  if (!value) throw new Error("expected a result for federal-A");
  return value;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lookupOutsideSpending", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    expect((await lookupOutsideSpending(["federal-A"])).size).toBe(0);
  });

  it("returns an empty map for an empty id list without touching the DB", async () => {
    expect((await lookupOutsideSpending([])).size).toBe(0);
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the query throws (table missing)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "where"]) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.orderBy = vi
      .fn()
      .mockRejectedValue(
        new Error('relation "independent_expenditures" does not exist'),
      );
    mockedGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof getDb>);

    expect((await lookupOutsideSpending(["federal-A"])).size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("omits candidates with no rows so callers write the honest empty state", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([]));
    expect((await lookupOutsideSpending(["federal-A"])).has("federal-A")).toBe(
      false,
    );
  });

  it("names spenders and keeps unfiled sponsor/sector null", async () => {
    mockedGetDb.mockReturnValue(makeDbMock([ieRow()]));
    const res = out(await lookupOutsideSpending(["federal-A"]));
    expect(res.support.spenders).toEqual([
      {
        committeeId: "C00900001",
        name: "AN OUTSIDE GROUP",
        sponsor: null,
        sector: null,
        curatedSummary: null,
        curatedSourceUrl: null,
        amount: 7000,
        expenditureCount: 3,
        evidenceUrl: "https://www.fec.gov/data/committee/C00900001/",
      },
    ]);
    expect(res.oppose.spenders).toEqual([]);
  });

  it("shows a filed sponsor and sector when the committee master has one", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        ieRow({ connectedOrg: "EXAMPLE CORP", sector: "Technology" }),
      ]),
    );
    const spender = out(await lookupOutsideSpending(["federal-A"])).support
      .spenders[0]!;
    expect(spender.sponsor).toBe("EXAMPLE CORP");
    expect(spender.sector).toBe("Technology");
  });

  it("keeps the curated summary on a rejected row — our sourced claim survives rejection", async () => {
    // Migration 0024: rejection suppresses the FILED claim; the human-written
    // cited line is precisely what should render for anodyne-name spenders.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        ieRow({
          status: "rejected",
          connectedOrg: "MISLEADING FILED SPONSOR",
          curatedSummary: "The super PAC of Example Org.",
          curatedSourceUrl: "https://example.org/reporting",
        }),
      ]),
    );
    const spender = out(await lookupOutsideSpending(["federal-A"])).support
      .spenders[0]!;
    expect(spender.sponsor).toBeNull();
    expect(spender.curatedSummary).toBe("The super PAC of Example Org.");
    expect(spender.curatedSourceUrl).toBe("https://example.org/reporting");
  });

  it("keeps a rejected committee's spending but drops its rejected sponsor claim", async () => {
    // Unlike 6a (where the sponsor claim IS the block), dropping the row here
    // would understate outside spending — itself a misstatement.
    mockedGetDb.mockReturnValue(
      makeDbMock([
        ieRow({
          status: "rejected",
          connectedOrg: "WRONGLY ATTRIBUTED CO",
          sector: "Technology",
        }),
      ]),
    );
    const res = out(await lookupOutsideSpending(["federal-A"]));
    expect(res.support.total).toBe(7000);
    expect(res.support.spenders[0]!.sponsor).toBeNull();
    expect(res.support.spenders[0]!.sector).toBeNull();
  });

  it("drops an unrecognised direction rather than folding it into either side", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        ieRow({ supportOppose: "???", amountTotal: "1234.00" }),
        ieRow(),
      ]),
    );
    const res = out(await lookupOutsideSpending(["federal-A"]));
    expect(res.support.total).toBe(7000);
    expect(res.oppose.total).toBe(0);
  });

  it("ranks each direction by dollars and counts (never sums) the remainder", async () => {
    const rows = Array.from({ length: MAX_SPENDERS_SHOWN + 2 }, (_, i) =>
      ieRow({ committeeId: `C${i}`, amountTotal: `${(100 - i) * 100}.00` }),
    );
    mockedGetDb.mockReturnValue(makeDbMock(rows));
    const res = out(await lookupOutsideSpending(["federal-A"]));
    expect(res.support.spenders).toHaveLength(MAX_SPENDERS_SHOWN);
    expect(res.support.spenders[0]!.committeeId).toBe("C0");
    expect(res.support.hiddenCount).toBe(2);
  });
});

describe("support and oppose are two figures, never one", () => {
  it("exposes exactly two directions", () => {
    expect([...SPENDING_DIRECTIONS]).toEqual(["support", "oppose"]);
  });

  it("reports each direction apart and never the sum or the net", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        ieRow({
          committeeId: "C1",
          supportOppose: "support",
          amountTotal: "441300.00",
        }),
        ieRow({
          committeeId: "C2",
          supportOppose: "oppose",
          amountTotal: "242700.00",
        }),
      ]),
    );
    const res = out(await lookupOutsideSpending(["federal-A"]));
    expect(res.support.total).toBe(441300);
    expect(res.oppose.total).toBe(242700);

    // Neither the sum (684,000) nor the net (198,600) exists anywhere in the
    // result — not as a field, not as a nested value.
    const values = JSON.stringify(res);
    expect(values).not.toContain("684000");
    expect(values).not.toContain("198600");
    expect(Object.keys(res).sort()).toEqual([
      "electionCycle",
      "oppose",
      "support",
    ]);
    expect(Object.keys(res.support).sort()).toEqual([
      "hiddenCount",
      "spenders",
      "total",
    ]);
  });

  it("the read path's source never adds a support amount to an oppose amount", () => {
    // Structural mirror of the ingest-side check in
    // scripts/ingest/independent-expenditure-isolation.test.ts.
    const source = readFileSync(
      resolve(process.cwd(), "src/lib/server/outside-spending.ts"),
      "utf8",
    )
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .split("\n")
      .filter((line) => !/^\s*\/\//u.test(line))
      .join("\n");
    expect(source).not.toMatch(/support\w*\s*\+\s*oppose\w*/iu);
    expect(source).not.toMatch(/oppose\w*\s*\+\s*support\w*/iu);
    // …and never reaches for funding-mix money while doing it.
    expect(source).not.toMatch(/donorAggregates|donor_aggregates|totalRaised/u);
  });
});
