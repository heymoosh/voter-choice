import { describe, it, expect } from "vitest";
import {
  makeRankedIssues,
  makeSkippedRanking,
  getTopPriorities,
  buildVoterValuesBlock,
  buildRankedIssuesPromptSection,
} from "../issueRanking";

describe("makeRankedIssues", () => {
  it("creates a non-skipped ranking with ordered keys", () => {
    const ranking = makeRankedIssues(["healthcare", "housing", "education"]);
    expect(ranking.skipped).toBe(false);
    expect(ranking.ordered).toEqual(["healthcare", "housing", "education"]);
    expect(ranking.timestamp).toBeTruthy();
  });

  it("stores a valid ISO-8601 timestamp", () => {
    const ranking = makeRankedIssues(["healthcare"]);
    expect(new Date(ranking.timestamp).toISOString()).toBe(ranking.timestamp);
  });
});

describe("makeSkippedRanking", () => {
  it("creates a skipped ranking with empty ordered array", () => {
    const ranking = makeSkippedRanking();
    expect(ranking.skipped).toBe(true);
    expect(ranking.ordered).toEqual([]);
  });
});

describe("getTopPriorities", () => {
  it("returns top 3 from a non-skipped ranking", () => {
    const ranking = makeRankedIssues([
      "healthcare",
      "housing",
      "education",
      "climate-environment",
    ]);
    expect(getTopPriorities(ranking, 3)).toEqual([
      "healthcare",
      "housing",
      "education",
    ]);
  });

  it("returns empty array for skipped ranking", () => {
    const ranking = makeSkippedRanking();
    expect(getTopPriorities(ranking)).toEqual([]);
  });

  it("returns all items if n > length", () => {
    const ranking = makeRankedIssues(["healthcare"]);
    expect(getTopPriorities(ranking, 3)).toEqual(["healthcare"]);
  });
});

describe("buildVoterValuesBlock", () => {
  it("returns empty string for skipped ranking", () => {
    const ranking = makeSkippedRanking();
    expect(buildVoterValuesBlock(ranking)).toBe("");
  });

  it("includes [VOTER VALUES] block with ranked issues", () => {
    const ranking = makeRankedIssues(["healthcare", "housing", "education"]);
    const block = buildVoterValuesBlock(ranking);
    expect(block).toContain("[VOTER VALUES]");
    expect(block).toContain("[/VOTER VALUES]");
    expect(block).toContain("healthcare");
    expect(block).toContain("topPriorities");
  });
});

describe("buildRankedIssuesPromptSection", () => {
  it("returns empty string for skipped ranking", () => {
    expect(buildRankedIssuesPromptSection(makeSkippedRanking())).toBe("");
  });

  it("includes ranked list in prompt section", () => {
    const ranking = makeRankedIssues(["healthcare", "housing"]);
    const section = buildRankedIssuesPromptSection(ranking);
    expect(section).toContain("healthcare");
    expect(section).toContain("housing");
    expect(section).toContain("VOTER'S RANKED PRIORITIES");
  });
});
