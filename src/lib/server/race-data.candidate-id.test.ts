/**
 * src/lib/server/race-data.candidate-id.test.ts
 *
 * Covers the "thread the resolved candidate id" path in assembleRaceData:
 *   1. A provided candidateId is looked up DIRECTLY (no name re-resolution) —
 *      this is the fix for House incumbents mis-resolving to voteless
 *      FEC-roster duplicates.
 *   2. Callers without a candidateId keep the name-resolution path (chat /
 *      ballot back-compat).
 *   3. Safety net: a provided id with no scoreable votes falls back to
 *      name + sibling-chamber resolution (prior-office record).
 *
 * Lives in its own file because it mocks ./alignment etc. at the module level;
 * the sibling race-data.test.ts deliberately runs against the real no-DB path.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RaceDataInput } from "./race-data";

vi.mock("./alignment", () => ({
  resolveCandidateId: vi.fn(),
  lookupAlignment: vi.fn(),
  // Pure passthrough — the notice gating isn't under test here.
  attachLimitedDataNotice: (r: unknown) => r,
}));
vi.mock("./donors", () => ({
  lookupDonorCoalition: vi.fn(async () => ({
    found: false,
    reason: "candidate_not_resolved",
  })),
  FUNDING_MIX_LABELS: { small: "s", large: "l", pac: "p" },
  isSectorBucket: () => false,
  isIssuePacBucket: () => false,
}));
vi.mock("./candidate-data", () => ({
  lookupCandidateData: vi.fn(async () => []),
  buildCandidateKey: vi.fn(() => "key|jur|2026"),
}));

import { assembleRaceData } from "./race-data";
import { resolveCandidateId, lookupAlignment } from "./alignment";

const mockResolve = vi.mocked(resolveCandidateId);
const mockLookup = vi.mocked(lookupAlignment);

const ISSUE = {
  canonicalIssue: "healthcare_affordability",
  issueLabel: "Healthcare Affordability",
  stance: "in_favor" as const,
};

const found = (cid: string, kept: number, total: number) => ({
  found: true as const,
  candidateId: cid,
  kept,
  total,
  contributingVotes: [],
});

const houseInput = (
  candidate: RaceDataInput["candidates"][number],
): RaceDataInput => ({
  raceId: "house-TX-37",
  raceLabel: "U.S. House — TX-37",
  section: "Federal",
  stateCode: "TX",
  candidates: [candidate],
  issues: [ISSUE],
});

describe("assembleRaceData — threaded candidate id", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("looks up a provided candidateId DIRECTLY and skips name resolution", async () => {
    mockLookup.mockResolvedValue(found("federal-TEST1", 5, 6));

    const data = await assembleRaceData(
      houseInput({ name: "Alex Rivera", candidateId: "federal-TEST1" }),
    );

    expect(mockLookup).toHaveBeenCalledWith(
      "federal-TEST1",
      "healthcare_affordability",
      "in_favor",
    );
    expect(mockResolve).not.toHaveBeenCalled();
    const entry = data.alignmentScores?.entries[0];
    expect(entry?.scores).not.toBeNull();
    expect(entry?.scores?.[0]).toMatchObject({ kept: 5, total: 6 });
  });

  it("falls back to name resolution when no candidateId is provided (chat/ballot)", async () => {
    mockResolve.mockResolvedValue("federal-XYZ");
    mockLookup.mockResolvedValue(found("federal-XYZ", 1, 2));

    const data = await assembleRaceData(houseInput({ name: "Alex Rivera" }));

    expect(mockResolve).toHaveBeenCalledWith(
      "Alex Rivera",
      "federal-house",
      "TX",
    );
    expect(mockLookup).toHaveBeenCalledWith(
      "federal-XYZ",
      "healthcare_affordability",
      "in_favor",
    );
    expect(data.alignmentScores?.entries[0].scores).not.toBeNull();
  });

  it("safety net: provided id with no scoreable votes re-resolves by name + sibling chamber", async () => {
    // The provided (current-office) id yields no tagged votes; the member's
    // record lives in the sibling chamber (chamber-switch case).
    mockLookup.mockImplementation(async (cid: string) => {
      if (cid === "federal-SENATE-ID") {
        return {
          found: true,
          candidateId: cid,
          kept: 0,
          total: 0,
          contributingVotes: [],
          unavailable: {
            reason: "No tagged votes for this issue in our records yet",
          },
        };
      }
      if (cid === "federal-HOUSE-REC") return found(cid, 3, 4);
      return { found: false, unavailable: { reason: "x" } };
    });
    mockResolve.mockImplementation(async (_name: string, jur: string) =>
      jur === "federal-house" ? "federal-HOUSE-REC" : null,
    );

    const data = await assembleRaceData({
      raceId: "senate-TX-a",
      raceLabel: "U.S. Senate",
      section: "Federal",
      stateCode: "TX",
      candidates: [{ name: "Morgan Hale", candidateId: "federal-SENATE-ID" }],
      issues: [ISSUE],
    });

    // It retried against the sibling-chamber record and surfaced real scores...
    expect(mockLookup).toHaveBeenCalledWith(
      "federal-HOUSE-REC",
      "healthcare_affordability",
      "in_favor",
    );
    expect(data.alignmentScores?.entries[0].scores).not.toBeNull();
    // ...and labeled the card with the prior-office provenance.
    expect(data.racePatterns.candidates[0].priorRole).toMatch(/U\.S\. House/);
  });
});
