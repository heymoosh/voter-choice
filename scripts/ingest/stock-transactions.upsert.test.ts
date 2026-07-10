/**
 * scripts/ingest/stock-transactions.upsert.test.ts
 *
 * Tests for upsertStockTransactionRows' conflict-handling — mocks the DB
 * client (no real DB connections), same convention as _audit-tags.test.ts.
 * Kept in a separate file so stock-transactions.test.ts can stay "no DB".
 */

import { describe, expect, it, vi } from "vitest";
import { upsertStockTransactionRows } from "./stock-transactions";
import type { StockTransactionRow } from "./stock-transactions";

const ROW: StockTransactionRow = {
  candidateId: "federal-V000135",
  bioguideId: null,
  chamber: "house",
  ticker: "GOOGL",
  assetDescription: "Alphabet Inc. - Class A Common Stock",
  assetType: "Stock",
  transactionType: "sale",
  rawTransactionType: "Sale",
  amountLow: "1001",
  amountHigh: "15000",
  amountRangeLabel: "$1,001 - $15,000",
  transactionDate: "2026-06-16",
  disclosureDate: "2026-06-17",
  owner: "Self",
  filingUrl:
    "https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20034807.pdf",
  sourceDataset: "house_stock_watcher",
  externalId: "house_stock_watcher::20034807::GOOGL::...",
  rawMetadata: {},
};

// Mocks db.insert(table).values(rows).onConflictDoUpdate({ target, set }).
function makeDbClient() {
  const onConflictDoUpdateFn = vi.fn().mockResolvedValue(undefined);
  const valuesFn = vi
    .fn()
    .mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateFn });
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn });
  return {
    db: { insert: insertFn } as unknown as import("../../db/client").DbClient,
    insertFn,
    valuesFn,
    onConflictDoUpdateFn,
  };
}

/** A row builder for chunking tests — every field distinct via externalId. */
function makeRow(externalId: string): StockTransactionRow {
  return { ...ROW, externalId };
}

/**
 * Same shape as makeDbClient, but the mocked onConflictDoUpdate call REJECTS
 * whenever the values() batch it's chained off of contains a row whose
 * externalId is in `badIds` — simulating a DB-side constraint failure (e.g.
 * a row that slipped past the pre-insert bounds checks) on exactly that row,
 * indistinguishable at the DB layer from any other insert error.
 */
function makeDbClientRejectingIds(badIds: Set<string>) {
  const insertFn = vi.fn();
  const calls: StockTransactionRow[][] = [];
  insertFn.mockImplementation(() => ({
    values: (rows: StockTransactionRow[]) => {
      calls.push(rows);
      const hasBadRow = rows.some((r) => badIds.has(r.externalId));
      return {
        onConflictDoUpdate: () =>
          hasBadRow
            ? Promise.reject(new Error("simulated constraint violation"))
            : Promise.resolve(undefined),
      };
    },
  }));
  return {
    db: { insert: insertFn } as unknown as import("../../db/client").DbClient,
    calls,
  };
}

describe("upsertStockTransactionRows", () => {
  it("upserts every row passed in (the batch is not dropped)", async () => {
    const { db, valuesFn } = makeDbClient();
    const count = await upsertStockTransactionRows(db, [ROW]);
    expect(count).toBe(1);
    expect(valuesFn).toHaveBeenCalledTimes(1);
    expect(valuesFn.mock.calls[0][0]).toHaveLength(1);
  });

  it("never includes filingUrl in the conflict-update SET — an official filing_url is never clobbered by a divergent later row", async () => {
    const { db, onConflictDoUpdateFn } = makeDbClient();
    await upsertStockTransactionRows(db, [ROW]);
    expect(onConflictDoUpdateFn).toHaveBeenCalledTimes(1);
    const { set } = onConflictDoUpdateFn.mock.calls[0][0];
    expect(Object.prototype.hasOwnProperty.call(set, "filingUrl")).toBe(false);
  });

  it("returns 0 and does not call insert for an empty batch", async () => {
    const { db, insertFn } = makeDbClient();
    const count = await upsertStockTransactionRows(db, []);
    expect(count).toBe(0);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("chunks a large batch into multiple insert statements rather than one giant one", async () => {
    const { db, valuesFn } = makeDbClient();
    const rows = Array.from({ length: 450 }, (_, i) => makeRow(`row-${i}`));
    const count = await upsertStockTransactionRows(db, rows);
    expect(count).toBe(450);
    // 450 rows at 50/chunk → 9 chunks of 50 each.
    expect(valuesFn).toHaveBeenCalledTimes(9);
    expect(valuesFn.mock.calls[0][0]).toHaveLength(50);
    expect(valuesFn.mock.calls[8][0]).toHaveLength(50);
  });

  it("GOAL_CONDITION: a single out-of-range row does not abort the whole batch — only that row is skipped, every good row still upserts", async () => {
    const rows = [makeRow("good-1"), makeRow("bad-row"), makeRow("good-2")];
    const { db } = makeDbClientRejectingIds(new Set(["bad-row"]));

    const count = await upsertStockTransactionRows(db, rows);

    // Both good rows landed; only the bad one was skipped.
    expect(count).toBe(2);
  });

  it("isolates the bad row to itself — retrying a failed chunk one row at a time, not dropping chunk-mates", async () => {
    // All 3 rows share one chunk (well under UPSERT_CHUNK_SIZE), so the
    // whole-chunk batch insert fails first; the retry-by-row fallback must
    // then still land the two good rows individually.
    const rows = [makeRow("good-1"), makeRow("bad-row"), makeRow("good-2")];
    const { db, calls } = makeDbClientRejectingIds(new Set(["bad-row"]));

    const count = await upsertStockTransactionRows(db, rows);

    expect(count).toBe(2);
    // First call is the whole-chunk attempt (3 rows, fails); then 3
    // single-row retries (2 succeed, 1 — the bad row — fails again).
    expect(calls[0]).toHaveLength(3);
    expect(calls.slice(1).every((c) => c.length === 1)).toBe(true);
    expect(calls.length).toBe(4);
  });
});
