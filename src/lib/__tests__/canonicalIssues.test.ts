import { describe, it, expect } from "vitest";
import {
  CANONICAL_ISSUES,
  slugForIssue,
  issueForSlug,
} from "../canonicalIssues";

describe("canonicalIssues", () => {
  it("has exactly 12 issues", () => {
    expect(CANONICAL_ISSUES).toHaveLength(12);
  });

  it("all issues have non-empty key and slug", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.key.length).toBeGreaterThan(0);
      expect(issue.slug.length).toBeGreaterThan(0);
    }
  });

  it("slugs are lowercase kebab-case", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("all keys are unique", () => {
    const keys = CANONICAL_ISSUES.map((i) => i.key);
    expect(new Set(keys).size).toBe(CANONICAL_ISSUES.length);
  });

  it("all slugs are unique", () => {
    const slugs = CANONICAL_ISSUES.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(CANONICAL_ISSUES.length);
  });

  it("slugForIssue returns correct slug for known issue", () => {
    expect(slugForIssue("Healthcare")).toBe("healthcare");
    expect(slugForIssue("Economy & Jobs")).toBe("economy-jobs");
    expect(slugForIssue("Housing")).toBe("housing");
  });

  it("slugForIssue falls back for unknown issue", () => {
    const result = slugForIssue("Unknown Issue");
    expect(result).toMatch(/^[a-z0-9-]+$/);
  });

  it("issueForSlug returns correct key", () => {
    expect(issueForSlug("healthcare")).toBe("Healthcare");
    expect(issueForSlug("housing")).toBe("Housing");
  });

  it("issueForSlug returns null for unknown slug", () => {
    expect(issueForSlug("nonexistent-slug")).toBeNull();
  });

  it("includes expected issues from spec", () => {
    const keys = CANONICAL_ISSUES.map((i) => i.key);
    expect(keys).toContain("Healthcare");
    expect(keys).toContain("Housing");
    expect(keys).toContain("Education");
    expect(keys).toContain("Immigration");
    expect(keys).toContain("Voting Rights & Democracy");
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(CANONICAL_ISSUES)).toBe(true);
  });
});
