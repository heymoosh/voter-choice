/**
 * src/lib/server/alignment.test.ts
 *
 * Tests for the Drizzle alignment query layer.
 * All DB interactions are mocked — no live Neon connection required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client so no real DB connection is attempted
// ---------------------------------------------------------------------------
vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  resolveCandidateId,
  lookupAlignment,
  computeVoteAlignment,
} from "./alignment";

// ---------------------------------------------------------------------------
// Helper: build a minimal chainable Drizzle mock
// ---------------------------------------------------------------------------

function makeSelectMock(rows: Record<string, unknown>[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
    // For the candidate resolution path, `where` is the terminal call.
  };
  return { select: vi.fn().mockReturnValue(chain), _chain: chain };
}

const mockedGetDb = vi.mocked(getDb);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// computeVoteAlignment — truth-table
// ---------------------------------------------------------------------------

describe("computeVoteAlignment", () => {
  it("yea + in_favor + in_favor → with", () => {
    expect(computeVoteAlignment("yea", "in_favor", "in_favor")).toBe("with");
  });

  it("yea + in_favor + opposed → against", () => {
    expect(computeVoteAlignment("yea", "in_favor", "opposed")).toBe("against");
  });

  it("yea + opposed + in_favor → against", () => {
    expect(computeVoteAlignment("yea", "opposed", "in_favor")).toBe("against");
  });

  it("yea + opposed + opposed → with", () => {
    expect(computeVoteAlignment("yea", "opposed", "opposed")).toBe("with");
  });

  it("nay + in_favor + in_favor → against", () => {
    expect(computeVoteAlignment("nay", "in_favor", "in_favor")).toBe("against");
  });

  it("nay + in_favor + opposed → with", () => {
    expect(computeVoteAlignment("nay", "in_favor", "opposed")).toBe("with");
  });

  it("nay + opposed + in_favor → with", () => {
    expect(computeVoteAlignment("nay", "opposed", "in_favor")).toBe("with");
  });

  it("nay + opposed + opposed → against", () => {
    expect(computeVoteAlignment("nay", "opposed", "opposed")).toBe("against");
  });

  it("present → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("present", "in_favor", "in_favor")).toBe(
      "abstain",
    );
  });

  it("absent → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("absent", "in_favor", "in_favor")).toBe(
      "abstain",
    );
  });

  it("not_voting → abstain (excluded from counts)", () => {
    expect(computeVoteAlignment("not_voting", "opposed", "opposed")).toBe(
      "abstain",
    );
  });
});

// ---------------------------------------------------------------------------
// resolveCandidateId
// ---------------------------------------------------------------------------

describe("resolveCandidateId", () => {
  it("returns null when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await resolveCandidateId("Jane Doe", "federal-house");
    expect(result).toBeNull();
  });

  it("returns null for empty name", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await resolveCandidateId("", "federal-house");
    expect(result).toBeNull();
  });

  it("returns candidate id on exact case-insensitive match", async () => {
    const { select, _chain } = makeSelectMock([
      { id: "federal-A123", fullName: "Annise Parker" },
    ]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-A123", fullName: "Annise Parker" },
    ]);

    const result = await resolveCandidateId("annise parker", "federal-house");
    expect(result).toBe("federal-A123");
  });

  it("returns candidate id on prefix match (queried name is prefix of stored name)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-B456", fullName: "Bob Smith Jr." },
    ]);

    const result = await resolveCandidateId("Bob Smith", "federal-senate");
    expect(result).toBe("federal-B456");
  });

  it("returns candidate id on reverse prefix match (stored name is prefix of queried name)", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-C789", fullName: "Carol White" },
    ]);

    const result = await resolveCandidateId(
      "Carol White III",
      "federal-senate",
    );
    expect(result).toBe("federal-C789");
  });

  it("returns null when no candidate matches", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([
      { id: "federal-X000", fullName: "Someone Else" },
    ]);

    const result = await resolveCandidateId("Jane Doe", "federal-house");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupAlignment
// ---------------------------------------------------------------------------

describe("lookupAlignment", () => {
  it("returns unavailable when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.found).toBe(true);
    expect(result.kept).toBe(0);
    expect(result.total).toBe(0);
    expect(result.unavailable).toBeDefined();
  });

  it("returns unavailable with reason when no rows match the join", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);
    _chain.where.mockResolvedValue([]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.found).toBe(true);
    expect(result.kept).toBe(0);
    expect(result.total).toBe(0);
    expect(result.unavailable?.reason).toMatch(/no tagged votes/i);
  });

  it("happy path: computes kept/total correctly from fixture data", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    // Fixture: 3 votes
    // Vote 1: yea + in_favor + user=in_favor → with
    // Vote 2: nay + in_favor + user=in_favor → against
    // Vote 3: yea + in_favor + user=in_favor → with
    _chain.where.mockResolvedValue([
      {
        billTitle: "Affordable Care Act Expansion",
        billSourceUrl: "https://govtrack.us/bill/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-03-15",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
      {
        billTitle: "Healthcare Repeal Act",
        billSourceUrl: "https://govtrack.us/bill/2",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-02-10",
        stanceLens: "in_favor",
        taggerConfidence: "0.85",
      },
      {
        billTitle: "Medicaid Expansion Bill",
        billSourceUrl: "https://govtrack.us/bill/3",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-11-05",
        stanceLens: "in_favor",
        taggerConfidence: "0.90",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );

    expect(result.found).toBe(true);
    expect(result.kept).toBe(2); // votes 1 and 3
    expect(result.total).toBe(3);
    expect(result.contributingVotes).toHaveLength(3);
    expect(result.contributingVotes[0]!.billTitle).toBe(
      "Affordable Care Act Expansion",
    );
    expect(result.contributingVotes[0]!.voteCast).toBe("with");
    expect(result.contributingVotes[1]!.voteCast).toBe("with"); // Medicaid at 0.90
    expect(result.contributingVotes[2]!.voteCast).toBe("against"); // Repeal at 0.85
  });

  it("caps contributing votes at 6 even when more rows exist", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    const rows = Array.from({ length: 10 }, (_, i) => ({
      billTitle: `Bill ${i}`,
      billSourceUrl: `https://govtrack.us/bill/${i}`,
      billSource: "govtrack",
      voteCast: "yea",
      voteDate: `2024-0${(i % 9) + 1}-01`,
      stanceLens: "in_favor",
      taggerConfidence: String(0.9 - i * 0.02),
    }));
    _chain.where.mockResolvedValue(rows);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes).toHaveLength(6);
  });

  it("excludes abstain votes from kept and total counts", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Bill A",
        billSourceUrl: "https://govtrack.us/bill/A",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-05-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
      },
      {
        billTitle: "Bill B (abstain)",
        billSourceUrl: "https://govtrack.us/bill/B",
        billSource: "govtrack",
        voteCast: "present",
        voteDate: "2024-04-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.8",
      },
      {
        billTitle: "Bill C (absent)",
        billSourceUrl: "https://govtrack.us/bill/C",
        billSource: "govtrack",
        voteCast: "absent",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.7",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    // Only 1 non-abstain vote
    expect(result.kept).toBe(1);
    expect(result.total).toBe(1);
    expect(result.contributingVotes).toHaveLength(1);
    expect(result.contributingVotes[0]!.billTitle).toBe("Bill A");
  });

  it("sorts contributing votes by tagger confidence DESC, then by date DESC", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Low Conf Newer",
        billSourceUrl: "https://url/1",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2025-01-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.5",
      },
      {
        billTitle: "High Conf Older",
        billSourceUrl: "https://url/2",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2023-06-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.95",
      },
      {
        billTitle: "Med Conf",
        billSourceUrl: "https://url/3",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-03-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.75",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe("High Conf Older");
    expect(result.contributingVotes[1]!.billTitle).toBe("Med Conf");
    expect(result.contributingVotes[2]!.billTitle).toBe("Low Conf Newer");
  });

  it("handles null taggerConfidence by sorting those rows last", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Null Confidence Bill",
        billSourceUrl: "https://url/null",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2025-01-01",
        stanceLens: "in_favor",
        taggerConfidence: null,
      },
      {
        billTitle: "High Confidence Bill",
        billSourceUrl: "https://url/high",
        billSource: "govtrack",
        voteCast: "yea",
        voteDate: "2024-01-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.9",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "healthcare_affordability",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.billTitle).toBe("High Confidence Bill");
    expect(result.contributingVotes[1]!.billTitle).toBe("Null Confidence Bill");
  });

  it("opposed stance: alignment math flips correctly", async () => {
    // Voter is OPPOSED to gun regulation.
    // Bill: "Gun Background Check Expansion" — voting yea = in_favor of gun regulation.
    // Candidate voted nay → against gun regulation → WITH voter who is opposed.
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Gun Background Check Expansion",
        billSourceUrl: "https://govtrack.us/bill/gun",
        billSource: "govtrack",
        voteCast: "nay",
        voteDate: "2024-06-01",
        stanceLens: "in_favor", // yea = pro gun regulation
        taggerConfidence: "0.88",
      },
    ]);

    const result = await lookupAlignment(
      "federal-A123",
      "gun_rights_safety",
      "opposed",
    );
    expect(result.kept).toBe(1);
    expect(result.total).toBe(1);
    expect(result.contributingVotes[0]!.voteCast).toBe("with");
  });

  it("returns source name and url from bills table in contributing votes", async () => {
    const { select, _chain } = makeSelectMock([]);
    mockedGetDb.mockReturnValue({ select } as never);

    _chain.where.mockResolvedValue([
      {
        billTitle: "Clean Energy Act",
        billSourceUrl: "https://openstates.org/bill/123",
        billSource: "openstates",
        voteCast: "yea",
        voteDate: "2024-09-01",
        stanceLens: "in_favor",
        taggerConfidence: "0.92",
      },
    ]);

    const result = await lookupAlignment(
      "openstates-X99",
      "environment_climate",
      "in_favor",
    );
    expect(result.contributingVotes[0]!.source.name).toBe("openstates");
    expect(result.contributingVotes[0]!.source.url).toBe(
      "https://openstates.org/bill/123",
    );
  });
});
