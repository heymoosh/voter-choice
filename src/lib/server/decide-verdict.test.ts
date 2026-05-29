import { describe, it, expect } from "vitest";
import { decideVerdict, type RescoredRace } from "./decide-verdict";

/**
 * decideVerdict — Phase 6 amendment verdict rules (D-1 reframe).
 *
 * D-1 (current-app-inventory.md:120): no aggregate alignment score, no
 * cross-candidate ranking, no "best match." The verdict is therefore a
 * per-issue *relevance* signal only:
 *   · Proposition (raceType === "proposition") -> "N/A" (regardless of relevance)
 *   · Candidate race + relevantToNewTheme === true -> "REVISIT"
 *   · Otherwise -> "HOLD"
 *
 * Pure function — testable in isolation.
 */

function buildRace(overrides: Partial<RescoredRace> = {}): RescoredRace {
  return {
    raceId: "race-1",
    raceLabel: "U.S. Senate",
    raceType: "choice",
    relevantToNewTheme: false,
    ...overrides,
  };
}

describe("decideVerdict", () => {
  it("returns N/A for a proposition regardless of relevance", () => {
    const relevantProp = decideVerdict(
      buildRace({ raceType: "proposition", relevantToNewTheme: true }),
    );
    expect(relevantProp.verdict).toBe("N/A");
    expect(relevantProp.raceId).toBe("race-1");

    const irrelevantProp = decideVerdict(
      buildRace({ raceType: "proposition", relevantToNewTheme: false }),
    );
    expect(irrelevantProp.verdict).toBe("N/A");
  });

  it("returns REVISIT for a candidate race when the new theme is relevant", () => {
    const race = buildRace({ raceType: "choice", relevantToNewTheme: true });
    expect(decideVerdict(race).verdict).toBe("REVISIT");
  });

  it("returns HOLD for a candidate race when the new theme is not relevant", () => {
    const race = buildRace({ raceType: "choice", relevantToNewTheme: false });
    expect(decideVerdict(race).verdict).toBe("HOLD");
  });

  it("preserves raceId and raceLabel on the output", () => {
    const out = decideVerdict(
      buildRace({
        raceId: "us-house-tx-07",
        raceLabel: "U.S. House — TX-07",
        relevantToNewTheme: true,
      }),
    );
    expect(out.raceId).toBe("us-house-tx-07");
    expect(out.raceLabel).toBe("U.S. House — TX-07");
    expect(out.verdict).toBe("REVISIT");
  });

  it("emits no aggregate score fields (D-1: no oldScore/newScore/delta)", () => {
    const out = decideVerdict(buildRace({ relevantToNewTheme: true }));
    expect(Object.keys(out).sort()).toEqual(["raceId", "raceLabel", "verdict"]);
  });
});
