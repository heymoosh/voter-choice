import { describe, it, expect } from "vitest";
import { CANONICAL_ISSUES, mapKeywordsToIssues } from "@/lib/canonical-issues";

describe("CANONICAL_ISSUES", () => {
  it("has exactly 10 issues", () => {
    expect(CANONICAL_ISSUES).toHaveLength(10);
  });

  it("every issue has an id", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.id).toBeTruthy();
    }
  });

  it("every issue has an English label", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.label).toBeTruthy();
    }
  });

  it("every issue has a Spanish label", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.labelEs).toBeTruthy();
    }
  });

  it("every issue has at least one keyword", () => {
    for (const issue of CANONICAL_ISSUES) {
      expect(issue.keywords.length).toBeGreaterThan(0);
    }
  });

  it("all ids are unique", () => {
    const ids = CANONICAL_ISSUES.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("mapKeywordsToIssues", () => {
  it("maps 'economy' to the economy issue", () => {
    const result = mapKeywordsToIssues("I care about the economy");
    expect(result.some((i) => i.id === "economy")).toBe(true);
  });

  it("maps 'healthcare' to the healthcare issue", () => {
    const result = mapKeywordsToIssues("healthcare costs are too high");
    expect(result.some((i) => i.id === "healthcare")).toBe(true);
  });

  it("maps 'climate' to the climate issue", () => {
    const result = mapKeywordsToIssues("climate change is a major concern");
    expect(result.some((i) => i.id === "climate")).toBe(true);
  });

  it("maps 'immigration' text correctly", () => {
    const result = mapKeywordsToIssues("border immigration policy");
    expect(result.some((i) => i.id === "immigration")).toBe(true);
  });

  it("maps 'abortion' to reproductive rights", () => {
    const result = mapKeywordsToIssues("abortion rights");
    expect(result.some((i) => i.id === "reproductive-rights")).toBe(true);
  });

  it("maps 'housing' text correctly", () => {
    const result = mapKeywordsToIssues("affordable housing shortage");
    expect(result.some((i) => i.id === "housing")).toBe(true);
  });

  it("maps multiple keywords in one text", () => {
    const result = mapKeywordsToIssues(
      "economy and healthcare are my top concerns",
    );
    const ids = result.map((i) => i.id);
    expect(ids).toContain("economy");
    expect(ids).toContain("healthcare");
  });

  it("returns empty array for unrelated text", () => {
    const result = mapKeywordsToIssues("I like pizza and hiking");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = mapKeywordsToIssues("ECONOMY JOBS INFLATION");
    expect(result.some((i) => i.id === "economy")).toBe(true);
  });
});
