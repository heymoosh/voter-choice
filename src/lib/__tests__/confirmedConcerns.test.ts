import { describe, it, expect } from "vitest";
import {
  makeConfirmedConcerns,
  makeSkippedConcerns,
  buildConcernBlocks,
  buildConcernsPromptSection,
} from "../confirmedConcerns";

describe("makeSkippedConcerns", () => {
  it("creates a skipped concerns object", () => {
    const c = makeSkippedConcerns();
    expect(c.skipped).toBe(true);
    expect(c.freeText).toBeNull();
    expect(c.confirmedIssues).toEqual([]);
  });
});

describe("makeConfirmedConcerns", () => {
  it("creates a confirmed concerns object", () => {
    const c = makeConfirmedConcerns("I rent and can't afford housing", [
      "Housing",
      "Healthcare",
    ]);
    expect(c.skipped).toBe(false);
    expect(c.freeText).toBe("I rent and can't afford housing");
    expect(c.confirmedIssues).toEqual(["Housing", "Healthcare"]);
  });
});

describe("buildConcernBlocks", () => {
  it("returns empty string for skipped concerns", () => {
    expect(buildConcernBlocks(makeSkippedConcerns())).toBe("");
  });

  it("includes [VOTER CONFIRMED CONCERNS] block", () => {
    const c = makeConfirmedConcerns("housing issue", ["Housing"]);
    const blocks = buildConcernBlocks(c, "Housing affordability");
    expect(blocks).toContain("[CONCERN_INTERPRETATION]");
    expect(blocks).toContain("[VOTER CONFIRMED CONCERNS]");
    expect(blocks).toContain("Housing");
  });

  it("returns empty string for skipped with null freeText", () => {
    const c = { freeText: null, confirmedIssues: [], skipped: false };
    expect(buildConcernBlocks(c)).toBe("");
  });
});

describe("buildConcernsPromptSection", () => {
  it("returns empty string for skipped concerns", () => {
    expect(buildConcernsPromptSection(makeSkippedConcerns())).toBe("");
  });

  it("returns empty string for empty confirmed issues", () => {
    const c = makeConfirmedConcerns("some text", []);
    expect(buildConcernsPromptSection(c)).toBe("");
  });

  it("includes free text and issues in prompt section", () => {
    const c = makeConfirmedConcerns("I care about housing", ["Housing"]);
    const section = buildConcernsPromptSection(c);
    expect(section).toContain("Housing");
    expect(section).toContain("VOTER'S CONFIRMED CONCERNS");
  });
});
