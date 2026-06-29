import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SUB_ISSUES,
  SUB_ISSUE_VOCABULARY_VERSION,
  getSubIssuesForParent,
  getSubIssue,
  isValidSubIssueForParent,
  parseAndValidateSubTag,
  renderResolverSubIssues,
  renderTaggerSubIssueBlock,
} from "./subIssues";
import { CANONICAL_ISSUE_LABELS } from "../canonicalIssues";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const entries = Object.entries(SUB_ISSUES);

describe("sub-issue vocabulary — shape", () => {
  it("has the 5 healthcare sub-issues, all parented to healthcare_affordability", () => {
    expect(getSubIssuesForParent("healthcare_affordability")).toHaveLength(5);
    for (const e of getSubIssuesForParent("healthcare_affordability")) {
      expect(e.parent).toBe("healthcare_affordability");
    }
  });

  it("every entry has non-empty id/parent/label/resolverDescription and >=1 bill signal", () => {
    for (const [id, e] of entries) {
      expect(e.id, id).toBeTruthy();
      expect(e.parent, id).toBeTruthy();
      expect(e.label, id).toBeTruthy();
      expect(e.resolverDescription, id).toBeTruthy();
      expect(e.billSignals.length, `${id}.billSignals`).toBeGreaterThan(0);
    }
  });

  it("every parent is a valid canonical issue id", () => {
    for (const [id, e] of entries) {
      expect(CANONICAL_ISSUE_LABELS[e.parent], id).toBeTruthy();
    }
  });

  it("ids are globally unique (record key === entry.id)", () => {
    for (const [key, e] of entries) {
      expect(e.id, `key ${key}`).toBe(key);
    }
    expect(new Set(entries.map(([, e]) => e.id)).size).toBe(entries.length);
  });
});

describe("sub-issue vocabulary — doc sync (prose <-> module)", () => {
  const doc = readFileSync(
    path.join(REPO_ROOT, "docs/alignment/SUB_ISSUE_VOCABULARY.md"),
    "utf-8",
  );

  it("every id appears as a doc heading with a matching parent", () => {
    for (const [id, e] of entries) {
      const start = doc.indexOf(`### ${id}`);
      expect(start, `heading for ${id}`).toBeGreaterThanOrEqual(0);
      // Bound the section to the next entry heading so we read THIS id's parent.
      const rest = doc.slice(start + 3);
      const nextHeading = rest.indexOf("\n### ");
      const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
      const m = section.match(/parent:\s*(\S+)/);
      expect(m?.[1], `parent for ${id}`).toBe(e.parent);
    }
  });
});

describe("renderers — round-trip", () => {
  it("resolver block carries every id + description + the version", () => {
    const block = renderResolverSubIssues();
    for (const [id, e] of entries) {
      expect(block).toContain(id);
      expect(block).toContain(e.resolverDescription);
    }
    expect(block).toContain(SUB_ISSUE_VOCABULARY_VERSION);
  });

  it("tagger block names every id + label + each bill signal", () => {
    const block = renderTaggerSubIssueBlock();
    for (const [id, e] of entries) {
      expect(block).toContain(id);
      expect(block).toContain(e.label);
      for (const signal of e.billSignals) {
        expect(block, `${id} signal`).toContain(signal);
      }
    }
  });
});

describe("validation helpers", () => {
  it("getSubIssue returns the entry for a known id, undefined otherwise", () => {
    expect(getSubIssue("drug_prices")?.id).toBe("drug_prices");
    expect(getSubIssue("not_a_real_id")).toBeUndefined();
  });

  it("isValidSubIssueForParent: valid -> true; wrong parent / unknown id -> false", () => {
    expect(
      isValidSubIssueForParent("drug_prices", "healthcare_affordability"),
    ).toBe(true);
    expect(isValidSubIssueForParent("drug_prices", "economy_jobs")).toBe(false);
    expect(
      isValidSubIssueForParent("not_a_real_id", "healthcare_affordability"),
    ).toBe(false);
  });

  it("parseAndValidateSubTag: valid -> id; wrong parent / unknown / non-string -> null", () => {
    expect(
      parseAndValidateSubTag("coverage_access", "healthcare_affordability"),
    ).toBe("coverage_access");
    expect(
      parseAndValidateSubTag("coverage_access", "economy_jobs"),
    ).toBeNull();
    expect(
      parseAndValidateSubTag("not_a_real_id", "healthcare_affordability"),
    ).toBeNull();
    expect(parseAndValidateSubTag(123, "healthcare_affordability")).toBeNull();
    expect(parseAndValidateSubTag(null, "healthcare_affordability")).toBeNull();
    expect(
      parseAndValidateSubTag(undefined, "healthcare_affordability"),
    ).toBeNull();
  });
});
