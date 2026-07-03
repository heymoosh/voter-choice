/**
 * src/lib/server/candidate-data.test.ts
 *
 * Unit tests for the candidate_data read/write layer.
 *
 * Covers:
 *   1. lookupCandidateData — builds web_search AlignmentScores from DB rows
 *   2. lookupCandidateData — returns [] when DB not configured
 *   3. lookupCandidateData — drops rows whose evidence has no real URLs
 *   4. researchAndPersistCandidate — calls research, persists, returns scores
 *   5. researchAndPersistCandidate — DROPS issues with no real-URL evidence
 *   6. researchAndPersistCandidate — returns [] when DB not configured
 *   7. buildCandidateKey — normalization
 *   8. race-data hook emits research_pending when lookupCandidateData returns []
 *
 * All DB interactions and the research sub-agent are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client
// ---------------------------------------------------------------------------
vi.mock("../../../db/client", () => {
  const DB_NOT_CONFIGURED = "DB_NOT_CONFIGURED" as const;
  return { getDb: vi.fn(), DB_NOT_CONFIGURED };
});

// ---------------------------------------------------------------------------
// Mock research-sub-agent (only the new structured function)
// ---------------------------------------------------------------------------
vi.mock("./research-sub-agent", () => ({
  runStructuredCandidateResearch: vi.fn(),
  runResearchSubAgent: vi.fn(), // keep existing export importable
}));

import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import {
  lookupCandidateData,
  researchAndPersistCandidate,
  buildCandidateKey,
} from "./candidate-data";
import { runStructuredCandidateResearch } from "./research-sub-agent";

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

type MockChain = {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
};

function makeSelectChain(rows: Record<string, unknown>[]): {
  select: ReturnType<typeof vi.fn>;
  _chain: MockChain;
} {
  const chain: MockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  return {
    select: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

function makeInsertChain(): {
  insert: ReturnType<typeof vi.fn>;
  _chain: MockChain;
} {
  const chain: MockChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  return {
    insert: vi.fn().mockReturnValue(chain),
    _chain: chain,
  };
}

// A db mock that supports BOTH the cache-lookup select (returns `selectRows`)
// and the persist insert. Used by researchAndPersistCandidate tests, which now
// consult the cache before spending on the sub-agent.
function makeResearchDbMock(selectRows: Record<string, unknown>[]): {
  db: { select: ReturnType<typeof vi.fn>; insert: ReturnType<typeof vi.fn> };
  insertChain: MockChain;
} {
  const { select } = makeSelectChain(selectRows);
  const { insert, _chain } = makeInsertChain();
  return { db: { select, insert }, insertChain: _chain };
}

const mockedGetDb = vi.mocked(getDb);
const mockedResearch = vi.mocked(runStructuredCandidateResearch);

// Dummy Anthropic client (never actually called — research is mocked)
const fakeClient = {} as Parameters<typeof researchAndPersistCandidate>[4];

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// buildCandidateKey
// ---------------------------------------------------------------------------

describe("buildCandidateKey", () => {
  it("lowercases and trims all three segments", () => {
    expect(buildCandidateKey("  Jane Doe  ", "County-NJ", "2026")).toBe(
      "jane doe|county-nj|2026",
    );
  });

  it("joins with pipe separator", () => {
    const key = buildCandidateKey("Bob", "county-nj", "2026");
    expect(key.split("|")).toHaveLength(3);
    expect(key.split("|")[0]).toBe("bob");
  });
});

// ---------------------------------------------------------------------------
// lookupCandidateData
// ---------------------------------------------------------------------------

describe("lookupCandidateData", () => {
  it("returns [] when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await lookupCandidateData("jane doe|county-nj|2026", [
      "healthcare_affordability",
    ]);
    expect(result).toEqual([]);
  });

  it("returns [] when issues list is empty", async () => {
    const { select } = makeSelectChain([]);
    mockedGetDb.mockReturnValue({ select } as never);
    const result = await lookupCandidateData("jane doe|county-nj|2026", []);
    expect(result).toEqual([]);
    // Should not even query the DB
    expect(select).not.toHaveBeenCalled();
  });

  it("builds web_search AlignmentScores from valid DB rows", async () => {
    const rows = [
      {
        canonicalIssue: "healthcare_affordability",
        resolvedStance: "in_favor",
        confidence: "high",
        evidence: [
          {
            summary: "Supports expanded Medicaid",
            url: "https://ballotpedia.org/jane",
          },
        ],
      },
    ];
    const { select } = makeSelectChain(rows);
    mockedGetDb.mockReturnValue({ select } as never);

    const result = await lookupCandidateData("jane doe|county-nj|2026", [
      "healthcare_affordability",
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      canonicalIssue: "healthcare_affordability",
      sourceType: "web_search",
      resolvedStance: "in_favor",
      confidence: "high",
    });
    expect(result[0].evidence).toHaveLength(1);
    expect(result[0].evidence![0].url).toBe("https://ballotpedia.org/jane");
  });

  it("drops rows whose evidence has no real https:// URLs", async () => {
    const rows = [
      {
        canonicalIssue: "healthcare_affordability",
        resolvedStance: "in_favor",
        confidence: "medium",
        // evidence contains only a fake/empty URL
        evidence: [{ summary: "Some claim", url: "not-a-real-url" }],
      },
    ];
    const { select } = makeSelectChain(rows);
    mockedGetDb.mockReturnValue({ select } as never);

    const result = await lookupCandidateData("jane doe|county-nj|2026", [
      "healthcare_affordability",
    ]);
    // Row is dropped because evidence has no valid URL (honesty guard)
    expect(result).toEqual([]);
  });

  it("returns multiple scores for multiple issues", async () => {
    const rows = [
      {
        canonicalIssue: "healthcare_affordability",
        resolvedStance: "in_favor",
        confidence: "high",
        evidence: [{ summary: "Supports healthcare", url: "https://a.com" }],
      },
      {
        canonicalIssue: "education_funding",
        resolvedStance: "opposed",
        confidence: "medium",
        evidence: [
          { summary: "Against new school bond", url: "https://b.com" },
        ],
      },
    ];
    const { select } = makeSelectChain(rows);
    mockedGetDb.mockReturnValue({ select } as never);

    const result = await lookupCandidateData("jane doe|county-nj|2026", [
      "healthcare_affordability",
      "education_funding",
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.canonicalIssue)).toEqual([
      "healthcare_affordability",
      "education_funding",
    ]);
  });
});

// ---------------------------------------------------------------------------
// researchAndPersistCandidate
// ---------------------------------------------------------------------------

describe("researchAndPersistCandidate", () => {
  it("returns [] when DB is not configured", async () => {
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);
    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [{ canonicalIssue: "healthcare_affordability" }],
      fakeClient,
    );
    expect(result).toEqual([]);
    expect(mockedResearch).not.toHaveBeenCalled();
  });

  it("returns [] when issues list is empty", async () => {
    const { select } = makeSelectChain([]);
    const { insert } = makeInsertChain();
    mockedGetDb.mockReturnValue({ select, insert } as never);
    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [],
      fakeClient,
    );
    expect(result).toEqual([]);
    expect(mockedResearch).not.toHaveBeenCalled();
  });

  it("calls research sub-agent and persists valid issues", async () => {
    // Empty cache → sub-agent runs.
    const { db, insertChain: _chain } = makeResearchDbMock([]);
    mockedGetDb.mockReturnValue(db as never);
    mockedResearch.mockResolvedValue({
      issues: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare Affordability",
          resolvedStance: "in_favor",
          confidence: "high",
          evidence: [
            {
              summary: "Supports expanded Medicaid",
              url: "https://ballotpedia.org/jane",
            },
          ],
        },
      ],
      usage: { input: 100, output: 80, searchCount: 2 },
    });

    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [{ canonicalIssue: "healthcare_affordability" }],
      fakeClient,
    );

    // Should have called the research sub-agent
    expect(mockedResearch).toHaveBeenCalledTimes(1);
    const researchInput = mockedResearch.mock.calls[0][0];
    expect(researchInput.candidateName).toBe("Jane Doe");
    expect(researchInput.jurisdiction).toBe("county-nj");
    expect(researchInput.cycle).toBe("2026");
    expect(researchInput.issues[0].canonicalIssue).toBe(
      "healthcare_affordability",
    );

    // Should have persisted to DB
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(_chain.values).toHaveBeenCalledTimes(1);
    expect(_chain.onConflictDoUpdate).toHaveBeenCalledTimes(1);

    // Should have returned the AlignmentScore
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      canonicalIssue: "healthcare_affordability",
      sourceType: "web_search",
      resolvedStance: "in_favor",
      confidence: "high",
    });
    expect(result[0].evidence![0].url).toBe("https://ballotpedia.org/jane");
  });

  it("DROPS issues whose evidence has no real URL (honesty bar)", async () => {
    const { db } = makeResearchDbMock([]);
    mockedGetDb.mockReturnValue(db as never);
    mockedResearch.mockResolvedValue({
      issues: [
        {
          // This issue has a real URL — should be kept
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare Affordability",
          resolvedStance: "in_favor",
          confidence: "high",
          evidence: [
            { summary: "Real citation", url: "https://ballotpedia.org/jane" },
          ],
        },
        {
          // This issue has no real URL — should be DROPPED
          canonicalIssue: "education_funding",
          issueLabel: "Education Funding",
          resolvedStance: "unclear",
          confidence: "low",
          evidence: [{ summary: "Vague claim", url: "not-a-real-url" }],
        },
        {
          // No evidence at all — should be DROPPED
          canonicalIssue: "gun_rights_safety",
          issueLabel: "Gun Rights & Safety",
          resolvedStance: "unclear",
          confidence: "low",
          evidence: [],
        },
      ],
      usage: { input: 150, output: 100, searchCount: 3 },
    });

    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [
        { canonicalIssue: "healthcare_affordability" },
        { canonicalIssue: "education_funding" },
        { canonicalIssue: "gun_rights_safety" },
      ],
      fakeClient,
    );

    // Only healthcare (real URL) survives
    expect(result).toHaveLength(1);
    expect(result[0].canonicalIssue).toBe("healthcare_affordability");
  });

  it("returns [] when ALL research issues have no real URL", async () => {
    const { db } = makeResearchDbMock([]);
    mockedGetDb.mockReturnValue(db as never);
    mockedResearch.mockResolvedValue({
      issues: [
        {
          canonicalIssue: "healthcare_affordability",
          issueLabel: "Healthcare Affordability",
          resolvedStance: "unclear",
          confidence: "low",
          evidence: [],
        },
      ],
      usage: { input: 80, output: 30, searchCount: 1 },
    });

    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [{ canonicalIssue: "healthcare_affordability" }],
      fakeClient,
    );

    expect(result).toEqual([]);
    // Should NOT call insert when nothing valid to persist
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("SHORT-CIRCUITS with cached data — no sub-agent spend when all issues are cached", async () => {
    // The cache already has valid, citation-backed rows for every requested
    // issue, so the billable research sub-agent must NOT be invoked.
    const cachedRows = [
      {
        canonicalIssue: "healthcare_affordability",
        resolvedStance: "in_favor",
        confidence: "high",
        evidence: [{ summary: "Supports Medicaid", url: "https://a.com" }],
      },
    ];
    const { db } = makeResearchDbMock(cachedRows);
    mockedGetDb.mockReturnValue(db as never);

    const result = await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [{ canonicalIssue: "healthcare_affordability" }],
      fakeClient,
    );

    // Zero spend: the sub-agent was never called.
    expect(mockedResearch).not.toHaveBeenCalled();
    // Nothing to re-persist on a cache hit.
    expect(db.insert).not.toHaveBeenCalled();
    // Returns the cached scores.
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      canonicalIssue: "healthcare_affordability",
      sourceType: "web_search",
      resolvedStance: "in_favor",
    });
  });

  it("still researches when the cache only partially covers the requested issues", async () => {
    // Only one of two requested issues is cached → cache miss → sub-agent runs.
    const cachedRows = [
      {
        canonicalIssue: "healthcare_affordability",
        resolvedStance: "in_favor",
        confidence: "high",
        evidence: [{ summary: "Supports Medicaid", url: "https://a.com" }],
      },
    ];
    const { db } = makeResearchDbMock(cachedRows);
    mockedGetDb.mockReturnValue(db as never);
    mockedResearch.mockResolvedValue({
      issues: [
        {
          canonicalIssue: "education_funding",
          issueLabel: "Education Funding",
          resolvedStance: "opposed",
          confidence: "medium",
          evidence: [{ summary: "Against bond", url: "https://b.com" }],
        },
      ],
      usage: { input: 100, output: 80, searchCount: 2 },
    });

    await researchAndPersistCandidate(
      "Jane Doe",
      "county-nj",
      "2026",
      [
        { canonicalIssue: "healthcare_affordability" },
        { canonicalIssue: "education_funding" },
      ],
      fakeClient,
    );

    expect(mockedResearch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// race-data hook: research_pending when lookupCandidateData returns []
// (Integration via assembleRaceData with mocked DB — ensures the hook emits
//  research_pending, not the old "no voting record" message)
// ---------------------------------------------------------------------------

describe("race-data hook: emits research_pending for no-record candidates", () => {
  it("emits unavailable.reason=research_pending when no web_search data stored", async () => {
    // DB not configured → lookupCandidateData returns []
    mockedGetDb.mockReturnValue(DB_NOT_CONFIGURED as never);

    // Import assembleRaceData here to pick up the mocked DB
    const { assembleRaceData } = await import("./race-data");

    const data = await assembleRaceData({
      raceId: "county-commissioners-nj",
      raceLabel: "County Commissioners",
      section: "County",
      stateCode: "NJ",
      candidates: [{ name: "John Smith", party: "Republican" }],
      issues: [
        {
          canonicalIssue: "property_taxes",
          issueLabel: "Property Taxes",
          stance: "opposed",
        },
      ],
      electionCycle: "2026",
    });

    expect(data.alignmentScores?.entries).toHaveLength(1);
    const entry = data.alignmentScores!.entries[0];
    expect(entry.scores).toBeNull();
    expect(entry.unavailable?.reason).toBe("research_pending");
  });
});
