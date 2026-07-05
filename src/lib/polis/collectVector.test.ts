/**
 * src/lib/polis/collectVector.test.ts
 *
 * Tests for collectPolisVector — the polis_response_vectors writer — and
 * buildVectorInput, its pure input-builder helper.
 *
 * All DB interactions are mocked; no live Neon connection required.
 * Conventions mirror src/lib/server/counters-events.test.ts (the analogous
 * flag-gated writer for voter_issue_events).
 *
 * Guarantees under test:
 *  - silent "skipped" outcome when POLIS_VECTOR_COLLECTION_ENABLED is unset
 *  - silent "skipped" outcome when the flag is not exactly "true"
 *  - early "skipped" outcome on empty responses (DB never touched)
 *  - silent "skipped" outcome when DATABASE_URL is unset (DB_NOT_CONFIGURED)
 *  - correct row + onConflictDoUpdate shape on the happy path
 *  - never throws when the insert fails (outcome="error", isolation)
 *  - buildVectorInput drops invalid answer values, keeps valid ones
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

// Schema table is only used as an opaque handle passed to db.insert() /
// onConflictDoUpdate({ target }).
vi.mock("../../../db/schema", () => ({
  polisResponseVectors: {
    __table: "polis_response_vectors",
    sessionToken: "session_token_column",
  },
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  collectPolisVector,
  buildVectorInput,
  type CollectVectorInput,
} from "./collectVector";

const mockedGetDb = vi.mocked(getDb);

function makeInsertMock(onConflictImpl?: () => Promise<unknown>) {
  const onConflictDoUpdate = vi.fn(
    onConflictImpl ?? (() => Promise.resolve(undefined)),
  );
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });
  return { db: { insert } as unknown, insert, values, onConflictDoUpdate };
}

const sampleInput: CollectVectorInput = {
  sessionToken: "tok-abc-123",
  stateCode: "TX",
  responses: {
    healthcare_affordability: "agree",
    housing_affordability: "pass",
  },
};

const ORIGINAL_FLAG = process.env.POLIS_VECTOR_COLLECTION_ENABLED;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

afterEach(() => {
  if (ORIGINAL_FLAG === undefined)
    delete process.env.POLIS_VECTOR_COLLECTION_ENABLED;
  else process.env.POLIS_VECTOR_COLLECTION_ENABLED = ORIGINAL_FLAG;
});

describe("collectPolisVector", () => {
  it("is a no-op (skipped) when the flag is unset (DB never reached)", async () => {
    delete process.env.POLIS_VECTOR_COLLECTION_ENABLED;
    const result = await collectPolisVector(sampleInput);
    expect(result).toEqual({ ok: true, outcome: "skipped" });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("is a no-op (skipped) when the flag is not exactly 'true'", async () => {
    process.env.POLIS_VECTOR_COLLECTION_ENABLED = "1";
    const result = await collectPolisVector(sampleInput);
    expect(result).toEqual({ ok: true, outcome: "skipped" });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("is a no-op (skipped) on empty responses, even with the flag on (DB never reached)", async () => {
    process.env.POLIS_VECTOR_COLLECTION_ENABLED = "true";
    const result = await collectPolisVector({ ...sampleInput, responses: {} });
    expect(result).toEqual({ ok: true, outcome: "skipped" });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("is a no-op (skipped) when DATABASE_URL is unset", async () => {
    process.env.POLIS_VECTOR_COLLECTION_ENABLED = "true";
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await collectPolisVector(sampleInput);
    expect(result).toEqual({ ok: true, outcome: "skipped" });
  });

  it("writes the row and returns outcome='stored' on the happy path", async () => {
    process.env.POLIS_VECTOR_COLLECTION_ENABLED = "true";
    const { db, insert, values, onConflictDoUpdate } = makeInsertMock();
    mockedGetDb.mockReturnValue(db as never);

    const result = await collectPolisVector(sampleInput);

    expect(result).toEqual({ ok: true, outcome: "stored" });
    expect(insert).toHaveBeenCalledTimes(1);
    const row = values.mock.calls[0][0];
    expect(row.sessionToken).toBe("tok-abc-123");
    expect(row.stateCode).toBe("TX");
    expect(row.responses).toEqual(sampleInput.responses);
    expect(row.recordedHour).toBeInstanceOf(Date);
    // Truncated to the hour: minutes/seconds/ms all zero.
    expect(row.recordedHour.getUTCMinutes()).toBe(0);
    expect(row.recordedHour.getUTCSeconds()).toBe(0);

    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const conflictArg = onConflictDoUpdate.mock.calls[0][0];
    expect(conflictArg.set.responses).toEqual(sampleInput.responses);
    expect(conflictArg.set.stateCode).toBe("TX");
  });

  it("never throws when the insert fails (outcome='error', isolation)", async () => {
    process.env.POLIS_VECTOR_COLLECTION_ENABLED = "true";
    const { db } = makeInsertMock(() => Promise.reject(new Error("neon down")));
    mockedGetDb.mockReturnValue(db as never);

    const result = await collectPolisVector(sampleInput);
    expect(result).toEqual({ ok: false, outcome: "error" });
  });
});

describe("buildVectorInput", () => {
  it("keeps valid answer values and drops invalid ones", () => {
    const input = buildVectorInput("tok-1", "TX", {
      healthcare_affordability: "agree",
      housing_affordability: "disagree",
      education_funding: "pass",
      bogus_statement: "yes", // invalid answer, dropped
      another_bogus: 42, // non-string, dropped
    });

    expect(input).toEqual({
      sessionToken: "tok-1",
      stateCode: "TX",
      responses: {
        healthcare_affordability: "agree",
        housing_affordability: "disagree",
        education_funding: "pass",
      },
    });
  });

  it("passes through a null stateCode", () => {
    const input = buildVectorInput("tok-2", null, { a: "agree" });
    expect(input.stateCode).toBeNull();
  });

  it("returns an empty responses object for empty input", () => {
    const input = buildVectorInput("tok-3", "CA", {});
    expect(input.responses).toEqual({});
  });
});
