import { describe, it, expect } from "vitest";
import {
  CANONICAL_ISSUES,
  getIssueLabel,
  getTopIssues,
  RankedIssues,
} from "../canonicalIssues";

describe("CANONICAL_ISSUES", () => {
  it("has exactly 12 issues", () => {
    expect(CANONICAL_ISSUES).toHaveLength(12);
  });

  it("first issue is economy-jobs", () => {
    expect(CANONICAL_ISSUES[0].slug).toBe("economy-jobs");
    expect(CANONICAL_ISSUES[0].label).toBe("Economy & Jobs");
  });

  it("all issues have unique slugs", () => {
    const slugs = CANONICAL_ISSUES.map((i) => i.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("all issues have non-empty labels", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.label.length).toBeGreaterThan(0);
    }
  });

  it("contains housing", () => {
    const housing = CANONICAL_ISSUES.find((i) => i.slug === "housing");
    expect(housing).toBeDefined();
    expect(housing?.label).toBe("Housing");
  });

  it("contains healthcare", () => {
    const hc = CANONICAL_ISSUES.find((i) => i.slug === "healthcare");
    expect(hc).toBeDefined();
  });
});

describe("getIssueLabel", () => {
  it("returns label for known slug", () => {
    expect(getIssueLabel("housing")).toBe("Housing");
    expect(getIssueLabel("healthcare")).toBe("Healthcare");
    expect(getIssueLabel("gun-policy")).toBe("Gun Policy");
  });

  it("returns slug for unknown slug", () => {
    expect(getIssueLabel("unknown-thing")).toBe("unknown-thing");
  });
});

describe("getTopIssues", () => {
  const ranking: RankedIssues = {
    ordered: ["housing", "healthcare", "education", "economy-jobs"],
    skipped: false,
    timestamp: "2026-01-01T00:00:00.000Z",
  };

  it("returns top 3 labels by default", () => {
    const top = getTopIssues(ranking);
    expect(top).toHaveLength(3);
    expect(top[0]).toBe("Housing");
    expect(top[1]).toBe("Healthcare");
    expect(top[2]).toBe("Education");
  });

  it("respects n parameter", () => {
    const top1 = getTopIssues(ranking, 1);
    expect(top1).toHaveLength(1);
    expect(top1[0]).toBe("Housing");

    const top2 = getTopIssues(ranking, 2);
    expect(top2).toHaveLength(2);
  });

  it("returns empty array when skipped", () => {
    const skipped: RankedIssues = {
      ordered: ["housing", "healthcare"],
      skipped: true,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(getTopIssues(skipped)).toHaveLength(0);
  });

  it("handles fewer than 3 ranked issues", () => {
    const short: RankedIssues = {
      ordered: ["housing"],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    const top = getTopIssues(short);
    expect(top).toHaveLength(1);
    expect(top[0]).toBe("Housing");
  });

  it("handles empty ordered array", () => {
    const empty: RankedIssues = {
      ordered: [],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(getTopIssues(empty)).toHaveLength(0);
  });
});
