/**
 * src/lib/server/committees.test.ts
 *
 * Tests for the committees read layer: the DB lookup, the parent/child
 * name join, the leadership-first sort, and graceful degradation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import { lookupCommittees } from "./committees";

const mockedGetDb = vi.mocked(getDb);

/** First select() call returns membershipRows, second returns committeeRows. */
function makeDbMock(
  membershipRows: Record<string, unknown>[],
  committeeRows: Record<string, unknown>[],
) {
  let call = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      const rows = call === 0 ? membershipRows : committeeRows;
      call += 1;
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(rows),
        then: (resolve: (v: unknown) => void) => resolve(rows),
      };
    }),
  } as unknown as ReturnType<typeof getDb>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lookupCommittees", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await lookupCommittees(["a"]);
    expect(out.size).toBe(0);
  });

  it("returns an empty map for an empty id list without touching the DB", async () => {
    const out = await lookupCommittees([]);
    expect(out.size).toBe(0);
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("degrades to an empty map when the query throws (e.g. table missing)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetDb.mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockRejectedValue(new Error('relation "committees" does not exist')),
      }),
    } as unknown as ReturnType<typeof getDb>);

    const out = await lookupCommittees(["p1"]);
    expect(out.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("joins a subcommittee membership to its parent committee's name", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          {
            candidateId: "p1",
            committeeId: "HSAG15",
            rank: 1,
            title: null,
            congress: 119,
          },
        ],
        [
          {
            thomasId: "HSAG",
            name: "House Committee on Agriculture",
            chamber: "house",
            parentCommitteeId: null,
          },
          {
            thomasId: "HSAG15",
            name: "Forestry and Horticulture",
            chamber: "house",
            parentCommitteeId: "HSAG",
          },
        ],
      ),
    );

    const out = await lookupCommittees(["p1"]);
    expect(out.get("p1")).toEqual([
      {
        committeeId: "HSAG15",
        name: "Forestry and Horticulture",
        chamber: "house",
        parentName: "House Committee on Agriculture",
        title: null,
        isLeadership: false,
        rank: 1,
      },
    ]);
  });

  it("sorts leadership seats first, then by rank", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          {
            candidateId: "p1",
            committeeId: "AAAA",
            rank: 5,
            title: null,
            congress: 119,
          },
          {
            candidateId: "p1",
            committeeId: "BBBB",
            rank: 1,
            title: "Ranking Member",
            congress: 119,
          },
        ],
        [
          {
            thomasId: "AAAA",
            name: "Committee A",
            chamber: "house",
            parentCommitteeId: null,
          },
          {
            thomasId: "BBBB",
            name: "Committee B",
            chamber: "house",
            parentCommitteeId: null,
          },
        ],
      ),
    );

    const out = await lookupCommittees(["p1"]);
    expect(out.get("p1")?.map((c) => c.committeeId)).toEqual(["BBBB", "AAAA"]);
  });

  it("keeps only the most-current congress per (candidate, committee)", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          {
            candidateId: "p1",
            committeeId: "AAAA",
            rank: 3,
            title: null,
            congress: 118,
          },
          {
            candidateId: "p1",
            committeeId: "AAAA",
            rank: 1,
            title: "Chairman",
            congress: 119,
          },
        ],
        [
          {
            thomasId: "AAAA",
            name: "Committee A",
            chamber: "house",
            parentCommitteeId: null,
          },
        ],
      ),
    );

    const out = await lookupCommittees(["p1"]);
    expect(out.get("p1")).toEqual([
      {
        committeeId: "AAAA",
        name: "Committee A",
        chamber: "house",
        parentName: null,
        title: "Chairman",
        isLeadership: true,
        rank: 1,
      },
    ]);
  });

  it("drops a membership row whose committee_id has no matching committee", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock(
        [
          {
            candidateId: "p1",
            committeeId: "ZZZZ",
            rank: 1,
            title: null,
            congress: 119,
          },
        ],
        [],
      ),
    );

    const out = await lookupCommittees(["p1"]);
    expect(out.get("p1")).toBeUndefined();
  });
});
