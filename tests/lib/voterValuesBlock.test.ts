import { describe, it, expect } from "vitest";
import { buildVoterValuesBlock } from "@/lib/promptBuilder";
import type { RankedIssues, ConfirmedConcerns } from "@/lib/canonicalIssues";

describe("buildVoterValuesBlock", () => {
  const fullRanking: RankedIssues = {
    ordered: ["healthcare", "housing", "economy-jobs", "education"],
    skipped: false,
    timestamp: "2026-01-01T00:00:00.000Z",
  };

  const skippedRanking: RankedIssues = {
    ordered: [],
    skipped: true,
    timestamp: "2026-01-01T00:00:00.000Z",
  };

  const fullConcerns: ConfirmedConcerns = {
    freeText: "I rent and can't afford housing",
    confirmedIssues: ["housing", "economy-jobs"],
    skipped: false,
  };

  const skippedConcerns: ConfirmedConcerns = {
    freeText: null,
    confirmedIssues: [],
    skipped: true,
  };

  it("returns empty string when both inputs are null", () => {
    expect(buildVoterValuesBlock(null, null)).toBe("");
  });

  it("includes ranked issues in inline mode", () => {
    const result = buildVoterValuesBlock(fullRanking, null, false);
    expect(result).toContain("Healthcare");
    expect(result).toContain("Housing");
    expect(result).toContain("top priority");
  });

  it("includes structured blocks in structured mode", () => {
    const result = buildVoterValuesBlock(fullRanking, null, true);
    expect(result).toContain("[VOTER VALUES]");
    expect(result).toContain("[/VOTER VALUES]");
    expect(result).toContain("topPriorities");
  });

  it("includes concern text in structured mode", () => {
    const result = buildVoterValuesBlock(null, fullConcerns, true);
    expect(result).toContain("[CONCERN_INTERPRETATION]");
    expect(result).toContain("[VOTER CONFIRMED CONCERNS]");
    expect(result).toContain("I rent and can't afford housing");
  });

  it("returns empty when ranking is skipped", () => {
    const result = buildVoterValuesBlock(skippedRanking, null);
    expect(result).toBe("");
  });

  it("returns empty when concerns are skipped", () => {
    const result = buildVoterValuesBlock(null, skippedConcerns);
    expect(result).toBe("");
  });

  it("combines ranking and concerns in structured mode", () => {
    const result = buildVoterValuesBlock(fullRanking, fullConcerns, true);
    expect(result).toContain("[VOTER VALUES]");
    expect(result).toContain("[CONCERN_INTERPRETATION]");
    expect(result).toContain("[VOTER CONFIRMED CONCERNS]");
  });

  it("maps issue keys to human-readable labels", () => {
    const result = buildVoterValuesBlock(fullRanking, fullConcerns, true);
    expect(result).toContain("Healthcare");
    expect(result).toContain("Housing");
    expect(result).toContain("Economy & Jobs");
  });
});
