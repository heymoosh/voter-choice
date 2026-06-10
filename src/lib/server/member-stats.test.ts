/**
 * src/lib/server/member-stats.test.ts
 *
 * Tests for the member-stats read layer: banding math, ballot-year
 * derivation, and the DB lookup mapping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  attendanceBand,
  onBallot2026FromTermEnd,
  lookupMemberStats,
} from "./member-stats";

const mockedGetDb = vi.mocked(getDb);

function makeDbMock(rows: Record<string, unknown>[]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(rows),
    }),
  } as unknown as ReturnType<typeof getDb>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// attendanceBand
// ---------------------------------------------------------------------------

describe("attendanceBand — median-relative thresholds", () => {
  it("at or below the chamber median is good", () => {
    expect(attendanceBand(1.5, 2.0)).toBe("good");
    expect(attendanceBand(2.0, 2.0)).toBe("good");
  });

  it("within 3x the median is mid", () => {
    expect(attendanceBand(4.0, 2.0)).toBe("mid");
    expect(attendanceBand(6.0, 2.0)).toBe("mid");
  });

  it("above 3x the median is bad", () => {
    expect(attendanceBand(6.1, 2.0)).toBe("bad");
  });
});

describe("attendanceBand — absolute fallback when median unknown", () => {
  it("uses 2% / 6% cutoffs", () => {
    expect(attendanceBand(1.4, null)).toBe("good");
    expect(attendanceBand(2.0, 0)).toBe("good");
    expect(attendanceBand(5.9, null)).toBe("mid");
    expect(attendanceBand(11.2, null)).toBe("bad");
  });
});

// ---------------------------------------------------------------------------
// onBallot2026FromTermEnd
// ---------------------------------------------------------------------------

describe("onBallot2026FromTermEnd", () => {
  it("a term ending Jan 2027 means the seat is up in 2026", () => {
    expect(onBallot2026FromTermEnd("2027-01-03")).toBe(true);
  });

  it("later term ends are not up in 2026", () => {
    expect(onBallot2026FromTermEnd("2029-01-03")).toBe(false);
    expect(onBallot2026FromTermEnd("2031-01-03")).toBe(false);
  });

  it("unknown term end is null", () => {
    expect(onBallot2026FromTermEnd(null)).toBeNull();
    expect(onBallot2026FromTermEnd("not-a-date")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupMemberStats
// ---------------------------------------------------------------------------

describe("lookupMemberStats", () => {
  it("returns an empty map when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED);
    const out = await lookupMemberStats(["a"]);
    expect(out.size).toBe(0);
  });

  it("returns an empty map for an empty id list without touching the DB", async () => {
    const out = await lookupMemberStats([]);
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
          .mockRejectedValue(
            new Error('relation "member_stats" does not exist'),
          ),
      }),
    } as unknown as ReturnType<typeof getDb>);

    const out = await lookupMemberStats(["p1"]);
    expect(out.size).toBe(0);
    consoleSpy.mockRestore();
  });

  it("maps numeric strings into attendance + ballot fields", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        {
          candidateId: "p1",
          missedVotesPct: "1.40",
          votesEligible: "612",
          chamberMedianPct: "2.10",
          currentTermEnd: "2027-01-03",
          senateClass: null,
          state: "NJ",
          district: 12,
          senatorRank: null,
        },
      ]),
    );

    const out = await lookupMemberStats(["p1"]);
    const entry = out.get("p1");
    expect(entry?.attendance).toEqual({
      missedPct: 1.4,
      of: "612 floor votes",
      band: "good",
    });
    expect(entry?.onBallot2026).toBe(true);
    expect(entry?.state).toBe("NJ");
    expect(entry?.district).toBe(12);
  });

  it("returns attendance null when the pct is missing", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        {
          candidateId: "s1",
          missedVotesPct: null,
          votesEligible: null,
          chamberMedianPct: null,
          currentTermEnd: "2031-01-03",
          senateClass: "3",
          state: "AK",
          district: null,
          senatorRank: "junior",
        },
      ]),
    );

    const out = await lookupMemberStats(["s1"]);
    const entry = out.get("s1");
    expect(entry?.attendance).toBeNull();
    expect(entry?.onBallot2026).toBe(false);
    expect(entry?.senateClass).toBe("3");
    expect(entry?.senatorRank).toBe("junior");
  });

  it("normalizes an unexpected senator_rank value to null", async () => {
    mockedGetDb.mockReturnValue(
      makeDbMock([
        {
          candidateId: "s2",
          missedVotesPct: null,
          votesEligible: null,
          chamberMedianPct: null,
          currentTermEnd: null,
          senateClass: null,
          state: null,
          district: null,
          senatorRank: "weird-value",
        },
      ]),
    );

    const out = await lookupMemberStats(["s2"]);
    expect(out.get("s2")?.senatorRank).toBeNull();
  });
});
