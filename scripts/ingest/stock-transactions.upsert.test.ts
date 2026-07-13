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
    expect(Object.prototype.hasOwnProperty.call(set, "filingUrl")).toBe(
      false,
    );
  });

  it("returns 0 and does not call insert for an empty batch", async () => {
    const { db, insertFn } = makeDbClient();
    const count = await upsertStockTransactionRows(db, []);
    expect(count).toBe(0);
    expect(insertFn).not.toHaveBeenCalled();
  });
});
