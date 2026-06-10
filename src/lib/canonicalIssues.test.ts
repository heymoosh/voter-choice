/**
 * src/lib/canonicalIssues.test.ts
 *
 * Guards the jurisdiction-lean map against vocabulary drift: every canonical
 * issue must carry a lean, and the design-mock assignments stay locked.
 */

import { describe, it, expect } from "vitest";
import {
  CANONICAL_ISSUE_LABELS,
  ISSUE_JURISDICTION_LEAN,
  getIssueLevel,
} from "./canonicalIssues";

describe("ISSUE_JURISDICTION_LEAN", () => {
  it("covers every canonical issue (no drift)", () => {
    for (const issue of Object.keys(CANONICAL_ISSUE_LABELS)) {
      expect(
        ISSUE_JURISDICTION_LEAN[issue],
        `missing jurisdiction lean for "${issue}"`,
      ).toBeDefined();
    }
  });

  it("has no entries outside the canonical vocabulary", () => {
    for (const issue of Object.keys(ISSUE_JURISDICTION_LEAN)) {
      expect(
        CANONICAL_ISSUE_LABELS[issue],
        `lean entry "${issue}" is not a canonical issue`,
      ).toBeDefined();
    }
  });

  it("matches the design mock's explicit assignments", () => {
    // docs/design/2026-redesign/…/redesign2-data.jsx USER_ISSUES2
    expect(getIssueLevel("healthcare_affordability")).toBe("federal");
    expect(getIssueLevel("immigration")).toBe("federal");
    expect(getIssueLevel("reproductive_rights")).toBe("state");
    expect(getIssueLevel("property_taxes")).toBe("state");
    expect(getIssueLevel("congressional_accountability")).toBe("both");
  });

  it("defaults unknown issues to both (never hidden)", () => {
    expect(getIssueLevel("not_a_real_issue")).toBe("both");
  });
});
