import { describe, it, expect } from "vitest";
import {
  CANONICAL_ISSUES,
  getTopIssues,
  getIssueLabel,
  type RankedIssues,
} from "@/lib/canonicalIssues";

describe("CANONICAL_ISSUES", () => {
  it("has exactly 12 issues", () => {
    expect(CANONICAL_ISSUES).toHaveLength(12);
  });

  it("contains expected issues", () => {
    const labels = CANONICAL_ISSUES.map((i) => i.label);
    expect(labels).toContain("Economy & Jobs");
    expect(labels).toContain("Healthcare");
    expect(labels).toContain("Housing");
    expect(labels).toContain("Voting Rights & Democracy");
  });

  it("all issues have non-empty keys and slugs", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.key).toBeTruthy();
      expect(issue.slug).toBeTruthy();
      expect(issue.label).toBeTruthy();
    }
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(CANONICAL_ISSUES)).toBe(true);
  });
});

describe("getTopIssues", () => {
  it("returns top 3 by default", () => {
    const ranked: RankedIssues = {
      ordered: ["healthcare", "housing", "economy-jobs", "education"],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    const top = getTopIssues(ranked);
    expect(top).toEqual(["healthcare", "housing", "economy-jobs"]);
  });

  it("returns empty array when skipped", () => {
    const ranked: RankedIssues = {
      ordered: ["healthcare"],
      skipped: true,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(getTopIssues(ranked)).toEqual([]);
  });

  it("returns empty array when ordered is empty", () => {
    const ranked: RankedIssues = {
      ordered: [],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(getTopIssues(ranked)).toEqual([]);
  });

  it("respects custom n value", () => {
    const ranked: RankedIssues = {
      ordered: ["healthcare", "housing", "economy-jobs", "education"],
      skipped: false,
      timestamp: "2026-01-01T00:00:00.000Z",
    };
    expect(getTopIssues(ranked, 2)).toEqual(["healthcare", "housing"]);
  });
});

describe("getIssueLabel", () => {
  it("returns label for known key", () => {
    expect(getIssueLabel("healthcare")).toBe("Healthcare");
  });

  it("returns label for known slug", () => {
    expect(getIssueLabel("economy-jobs")).toBe("Economy & Jobs");
  });

  it("returns the input unchanged for unknown key", () => {
    expect(getIssueLabel("unknown-issue")).toBe("unknown-issue");
  });
});
