import { describe, it, expect } from "vitest";
import {
  seatOverviewAlignmentPct,
  seatIssueAlignmentRows,
  type UserIssue,
} from "./delegationData";

const vote = (canonicalIssue: string, kept: number, total: number) => ({
  canonicalIssue,
  issueLabel: canonicalIssue,
  resolvedStance: "in_favor",
  sourceType: "voting_record",
  kept,
  total,
});

const issue = (
  canonicalIssue: string,
  interpretation: string,
  level: "federal" | "state" = "federal",
): UserIssue => ({ canonicalIssue, interpretation, level });

describe("seatOverviewAlignmentPct", () => {
  it("averages per-issue percentages, same formula as the deep-view banner", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 3, 4), vote("housing", 2, 5)],
      },
    };
    const userIssues = [
      issue("healthcare_affordability", "Lower drug prices"),
      issue("housing", "Housing affordability"),
    ];
    // (75 + 40) / 2 = 57.5 -> rounds to 58
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(58);
  });

  it("returns null (honest gap) when no user issue has a scoreable record", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: { candidateId: "c1", scores: [] },
    };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBeNull();
  });

  it("returns null when alignmentEntry itself is null (unresolved seat)", () => {
    const seat = { level: "federal" as const, alignmentEntry: null };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBeNull();
  });

  it("scopes to the seat's level — a state-only issue doesn't factor into a federal seat's score", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 4, 4)],
      },
    };
    const userIssues = [
      issue("healthcare_affordability", "Lower drug prices", "federal"),
      issue("state_only_issue", "A state-only issue", "state"),
    ];
    // only the federal issue counts -> 100%, not diluted by the state one
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(100);
  });
});

describe("seatIssueAlignmentRows", () => {
  it("returns one row per level-scoped user issue, with pct + raw fraction", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: {
        candidateId: "c1",
        scores: [vote("healthcare_affordability", 3, 4)],
      },
    };
    const userIssues = [issue("healthcare_affordability", "Lower drug prices")];
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Lower drug prices", pct: 75, fraction: "3/4" },
    ]);
  });

  it("is null-honest (not zero) for an issue with no scoreable record", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: { candidateId: "c1", scores: [] },
    };
    const userIssues = [issue("housing", "Housing affordability")];
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Housing affordability", pct: null, fraction: null },
    ]);
  });
});
