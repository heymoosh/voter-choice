/**
 * src/lib/server/counters-events.test.ts
 *
 * Tests for recordConcernEvents — the anonymous voter_issue_events writer.
 * All DB interactions are mocked; no live Neon connection required.
 *
 * Guarantees under test:
 *  - silent no-op when the kill-switch flag is unset
 *  - silent no-op when DATABASE_URL is unset (getDb() === DB_NOT_CONFIGURED)
 *  - early return on empty input (DB never touched)
 *  - correct row mapping on the happy path
 *  - never throws when the insert fails (isolation from the counter path)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

// Schema table is only used as an opaque handle passed to db.insert().
vi.mock("../../../db/schema", () => ({
  voterIssueEvents: { __table: "voter_issue_events" },
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { recordConcernEvents, type ConcernEvent } from "./counters";

const mockedGetDb = vi.mocked(getDb);

function makeInsertMock(valuesImpl?: () => Promise<unknown>) {
  const values = vi.fn(valuesImpl ?? (() => Promise.resolve(undefined)));
  const insert = vi.fn().mockReturnValue({ values });
  return { db: { insert } as unknown, insert, values };
}

const sampleEvents: ConcernEvent[] = [
  {
    canonicalIssue: "healthcare_affordability",
    offTopicLabel: null,
    stance: "lower healthcare costs",
    rank: 1,
    confidence: "clear",
    wasOffTopic: false,
  },
  {
    canonicalIssue: null,
    offTopicLabel: "Abortion access and reproductive policy",
    stance: null,
    rank: 2,
    confidence: "off_topic",
    wasOffTopic: true,
  },
];

const ORIGINAL_FLAG = process.env.VOTER_ISSUE_EVENTS_ENABLED;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (ORIGINAL_FLAG === undefined)
    delete process.env.VOTER_ISSUE_EVENTS_ENABLED;
  else process.env.VOTER_ISSUE_EVENTS_ENABLED = ORIGINAL_FLAG;
});

describe("recordConcernEvents", () => {
  it("is a no-op when the flag is unset (DB never reached)", async () => {
    delete process.env.VOTER_ISSUE_EVENTS_ENABLED;
    await expect(
      recordConcernEvents({ stateCode: "TX", concernEvents: sampleEvents }),
    ).resolves.toBeUndefined();
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("is a no-op when the flag is not exactly 'true'", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "1";
    await recordConcernEvents({ stateCode: "TX", concernEvents: sampleEvents });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns early on empty input without touching the DB", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "true";
    await recordConcernEvents({ stateCode: "TX", concernEvents: [] });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("is a no-op when DATABASE_URL is unset", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "true";
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    await expect(
      recordConcernEvents({ stateCode: "TX", concernEvents: sampleEvents }),
    ).resolves.toBeUndefined();
  });

  it("maps rows correctly on the happy path", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "true";
    const { db, insert, values } = makeInsertMock();
    mockedGetDb.mockReturnValue(db as never);

    await recordConcernEvents({ stateCode: "TX", concernEvents: sampleEvents });

    expect(insert).toHaveBeenCalledTimes(1);
    const rows = values.mock.calls[0][0];
    expect(rows).toEqual([
      {
        canonicalIssue: "healthcare_affordability",
        offTopicLabel: null,
        resolvedStance: "lower healthcare costs",
        rank: 1,
        wasOffTopic: false,
        confidenceLevel: "clear",
        stateCode: "TX",
      },
      {
        canonicalIssue: null,
        offTopicLabel: "Abortion access and reproductive policy",
        resolvedStance: null,
        rank: 2,
        wasOffTopic: true,
        confidenceLevel: "off_topic",
        stateCode: "TX",
      },
    ]);
  });

  it("coerces an empty stateCode to null", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "true";
    const { db, values } = makeInsertMock();
    mockedGetDb.mockReturnValue(db as never);

    await recordConcernEvents({
      stateCode: "",
      concernEvents: [sampleEvents[0]],
    });
    expect(values.mock.calls[0][0][0].stateCode).toBeNull();
  });

  it("never throws when the insert fails (isolation)", async () => {
    process.env.VOTER_ISSUE_EVENTS_ENABLED = "true";
    const { db } = makeInsertMock(() => Promise.reject(new Error("neon down")));
    mockedGetDb.mockReturnValue(db as never);

    await expect(
      recordConcernEvents({ stateCode: "TX", concernEvents: sampleEvents }),
    ).resolves.toBeUndefined();
  });
});
