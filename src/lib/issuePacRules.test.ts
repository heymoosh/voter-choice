import { describe, it, expect } from "vitest";
import {
  ruleNameFromIssuePacLabel,
  issuePacDisplayFromRuleName,
  issueFromIssuePacLabel,
} from "./issuePacRules";

describe("ruleNameFromIssuePacLabel", () => {
  it("extracts the ruleName from a 3-segment bucket label", () => {
    expect(
      ruleNameFromIssuePacLabel(
        "Issue-aligned PACs — healthcare_affordability — pharma-company-pacs",
      ),
    ).toBe("pharma-company-pacs");
  });
  it("returns null for the legacy 2-segment format (no ruleName)", () => {
    expect(
      ruleNameFromIssuePacLabel(
        "Issue-aligned PACs — healthcare_affordability",
      ),
    ).toBeNull();
  });
  it("returns null for a non issue-PAC label", () => {
    expect(ruleNameFromIssuePacLabel("Legal industry")).toBeNull();
  });
});

describe("issuePacDisplayFromRuleName", () => {
  it("round-trips a label → ruleName → editorial display fields", () => {
    const ruleName = ruleNameFromIssuePacLabel(
      "Issue-aligned PACs — healthcare_affordability — pharma-company-pacs",
    );
    const display = ruleName ? issuePacDisplayFromRuleName(ruleName) : null;
    expect(display?.displayName).toBe("Pharma Company PACs");
    expect(display?.canonicalIssue).toBe("healthcare_affordability");
    expect(display?.stance).toBe("opposed");
    expect(display?.advocates).toMatch(/pharmaceutical/i);
  });
  it("returns null for an unknown ruleName", () => {
    expect(issuePacDisplayFromRuleName("no-such-rule")).toBeNull();
  });
});

describe("issueFromIssuePacLabel", () => {
  it("extracts a valid canonical issue from both label formats", () => {
    expect(
      issueFromIssuePacLabel(
        "Issue-aligned PACs — healthcare_affordability — pharma-company-pacs",
      ),
    ).toBe("healthcare_affordability");
    expect(
      issueFromIssuePacLabel("Issue-aligned PACs — healthcare_affordability"),
    ).toBe("healthcare_affordability");
  });
  it("returns null when the issue segment isn't a known canonical issue", () => {
    expect(
      issueFromIssuePacLabel("Issue-aligned PACs — not_an_issue"),
    ).toBeNull();
  });
});
