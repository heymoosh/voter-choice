import { describe, it, expect } from "vitest";
import { decideVerdict, type RescoredRace } from "./decide-verdict";

/**
 * decideVerdict — Phase 6 amendment verdict rules.
 *
 * Rules (per .ai/work-packets/redesign-phase-6-mid-session-theme-amendment.md):
 *   · Proposition (raceType === "proposition") → "N/A"
 *   · If (oldScore - newScore) >= 5 AND some other candidate's newScore
 *     strictly > active pick's newScore → "REVISIT"
 *   · Otherwise → "HOLD"
 *
 * The verdict is computed from the score deltas of the active pick AND the
 * post-amendment scores of OTHER candidates in the same race. This is a pure
 * function — testable in isolation.
 */

function buildRace(overrides: Partial<RescoredRace> = {}): RescoredRace {
  return {
    raceId: "race-1",
    raceLabel: "U.S. Senate",
    raceType: "choice",
    oldScore: 80,
    newScore: 80,
    otherCandidateScores: [],
    ...overrides,
  };
}

describe("decideVerdict", () => {
  it("returns N/A for a proposition regardless of scores", () => {
    const race = buildRace({
      raceType: "proposition",
      oldScore: 90,
      newScore: 40,
      otherCandidateScores: [99],
    });
    const out = decideVerdict(race);
    expect(out.verdict).toBe("N/A");
    expect(out.raceId).toBe("race-1");
    expect(out.delta).toBe(-50);
  });

  it("returns REVISIT when drop is exactly 5 AND another candidate scores higher", () => {
    const race = buildRace({
      oldScore: 80,
      newScore: 75,
      otherCandidateScores: [76],
    });
    expect(decideVerdict(race).verdict).toBe("REVISIT");
  });

  it("returns REVISIT when drop is >5 AND another candidate scores strictly higher", () => {
    const race = buildRace({
      oldScore: 90,
      newScore: 70,
      otherCandidateScores: [50, 71, 60],
    });
    expect(decideVerdict(race).verdict).toBe("REVISIT");
  });

  it("returns HOLD when drop is 5+ but no other candidate scores higher", () => {
    const race = buildRace({
      oldScore: 80,
      newScore: 70,
      otherCandidateScores: [69, 50, 30],
    });
    expect(decideVerdict(race).verdict).toBe("HOLD");
  });

  it("returns HOLD when drop is less than 5 even if another candidate scores higher", () => {
    const race = buildRace({
      oldScore: 80,
      newScore: 76, // drop of 4
      otherCandidateScores: [99],
    });
    expect(decideVerdict(race).verdict).toBe("HOLD");
  });

  it("returns HOLD when score is unchanged or improved", () => {
    expect(
      decideVerdict(
        buildRace({ oldScore: 70, newScore: 70, otherCandidateScores: [80] }),
      ).verdict,
    ).toBe("HOLD");
    expect(
      decideVerdict(
        buildRace({ oldScore: 70, newScore: 85, otherCandidateScores: [90] }),
      ).verdict,
    ).toBe("HOLD");
  });

  it("returns HOLD when drop is 5+ and another candidate exactly TIES the new active score (strict > required)", () => {
    const race = buildRace({
      oldScore: 80,
      newScore: 70, // drop of 10
      otherCandidateScores: [70, 60], // tied with active pick, not strictly higher
    });
    expect(decideVerdict(race).verdict).toBe("HOLD");
  });

  it("evaluates the highest other-candidate score when multiple others exist", () => {
    const race = buildRace({
      oldScore: 90,
      newScore: 80, // drop of 10
      otherCandidateScores: [10, 20, 81, 30], // only one is strictly higher
    });
    expect(decideVerdict(race).verdict).toBe("REVISIT");
  });

  it("returns HOLD when otherCandidateScores is empty (no other candidate to outrank)", () => {
    const race = buildRace({
      oldScore: 90,
      newScore: 70, // drop of 20
      otherCandidateScores: [],
    });
    expect(decideVerdict(race).verdict).toBe("HOLD");
  });

  it("computes signed delta as newScore - oldScore (negative when dropped)", () => {
    const dropped = decideVerdict(
      buildRace({ oldScore: 80, newScore: 75, otherCandidateScores: [] }),
    );
    expect(dropped.delta).toBe(-5);

    const improved = decideVerdict(
      buildRace({ oldScore: 70, newScore: 85, otherCandidateScores: [] }),
    );
    expect(improved.delta).toBe(15);

    const unchanged = decideVerdict(
      buildRace({ oldScore: 50, newScore: 50, otherCandidateScores: [] }),
    );
    expect(unchanged.delta).toBe(0);
  });

  it("preserves raceId, raceLabel, oldScore, newScore on the output", () => {
    const race = buildRace({
      raceId: "us-house-tx-07",
      raceLabel: "U.S. House — TX-07",
      oldScore: 78,
      newScore: 60,
      otherCandidateScores: [82],
    });
    const out = decideVerdict(race);
    expect(out.raceId).toBe("us-house-tx-07");
    expect(out.raceLabel).toBe("U.S. House — TX-07");
    expect(out.oldScore).toBe(78);
    expect(out.newScore).toBe(60);
    expect(out.verdict).toBe("REVISIT");
  });
});
