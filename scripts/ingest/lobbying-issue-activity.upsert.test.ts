/**
 * scripts/ingest/lobbying-issue-activity.upsert.test.ts
 *
 * Tests for upsertLobbyingIssueActivityRows' conflict-handling — mocks the
 * DB client (no real DB connections), same convention as
 * stock-transactions.upsert.test.ts.
 */

import { describe, expect, it, vi } from "vitest";
import { upsertLobbyingIssueActivityRows } from "./lobbying-issue-activity";
import type { LobbyingIssueActivityRow } from "./lobbying-issue-activity";

const ROW: LobbyingIssueActivityRow = {
  filingUuid: "29c6a500-ec45-493b-908d-e68543e66f83",
  filingType: "3T",
  filingYear: 2026,
  filingPeriod: "third_quarter",
  registrantName: "LIBERTY GOVERNMENT AFFAIRS",
  clientName: "NAVIGATORS GLOBAL LLC ON BEHALF OF GOLDCO",
  clientDescription: "Precious metals company",
  clientState: "CA",
  issueAreaCode: "FIN",
  issueAreaLabel: "Financial Institutions/Investments/Securities",
  specificIssues: "General financial issues related to precious metals.",
  chamber: "senate",
  incomeAmount: "10000.00",
  expensesAmount: null,
  filingUrl:
    "https://lda.gov/filings/public/filing/29c6a500-ec45-493b-908d-e68543e66f83/print/",
  sourceDataset: "lda_gov",
  externalId: "lda_gov::29c6a500-ec45-493b-908d-e68543e66f83::FIN::senate",
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

describe("upsertLobbyingIssueActivityRows", () => {
  it("returns 0 and skips the DB call for an empty row list", async () => {
    const { db, insertFn } = makeDbClient();
    const result = await upsertLobbyingIssueActivityRows(db, []);
    expect(result).toBe(0);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("upserts on external_id and returns the row count", async () => {
    const { db, insertFn, valuesFn, onConflictDoUpdateFn } = makeDbClient();
    const result = await upsertLobbyingIssueActivityRows(db, [ROW]);

    expect(result).toBe(1);
    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(valuesFn).toHaveBeenCalledTimes(1);
    expect(onConflictDoUpdateFn).toHaveBeenCalledTimes(1);

    const call = onConflictDoUpdateFn.mock.calls[0][0];
    expect(call.target).toBeDefined();
    expect(call.set).toHaveProperty("clientName");
    expect(call.set).toHaveProperty("issueAreaLabel");
    expect(call.set).toHaveProperty("incomeAmount");
  });

  it("passes through multiple rows in one insert call", async () => {
    const { db, valuesFn } = makeDbClient();
    const rowTwo: LobbyingIssueActivityRow = {
      ...ROW,
      chamber: "house",
      externalId: "lda_gov::29c6a500-ec45-493b-908d-e68543e66f83::FIN::house",
    };
    const result = await upsertLobbyingIssueActivityRows(db, [ROW, rowTwo]);
    expect(result).toBe(2);
    const values = valuesFn.mock.calls[0][0];
    expect(values).toHaveLength(2);
  });
});
