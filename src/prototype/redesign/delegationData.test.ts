import { describe, it, expect } from "vitest";
import {
  seatOverviewAlignmentPct,
  seatIssueAlignmentRows,
  issuesForSeatCard,
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

describe("Dallas TX senior senator fixture — every scored issue gets its own row (2026-07-12 fix)", () => {
  // Prod repro: user issues = Grocery costs / Education keeping pace with AI
  // (tagged education_funding, a "state"-lean canonical issue) / Healthcare
  // affordability, on a federal Senate seat. AllVotesPanel (which reads
  // alignmentEntry.scores directly, unfiltered by level) correctly showed
  // votes for both Education and Healthcare — proving the seat's own data
  // considered Education in-scope — while the card's per-issue rows dropped
  // Education entirely and left Healthcare's row reading identically to what
  // the banner reported as the aggregate (61%, 11/18), because Healthcare
  // was the only issue issuesForLevel let through.
  const seat = {
    level: "federal" as const,
    alignmentEntry: {
      candidateId: "c1",
      scores: [
        vote("healthcare_affordability", 11, 18),
        vote("education_funding", 1, 5), // real record exists for this seat
      ],
    },
  };
  const userIssues = [
    issue("economy_jobs", "Grocery costs", "both"), // no scoreable record
    issue("education_funding", "Education keeping pace with AI", "state"),
    issue("healthcare_affordability", "Healthcare affordability", "federal"),
  ];

  it("issuesForSeatCard admits Education despite its state lean, because this seat's data scores it", () => {
    expect(
      issuesForSeatCard(userIssues, seat).map((i) => i.canonicalIssue),
    ).toEqual([
      "economy_jobs",
      "education_funding",
      "healthcare_affordability",
    ]);
  });

  it("renders all 3 rows with per-issue fractions — Education no longer dropped, Healthcare no longer misread as the aggregate", () => {
    expect(seatIssueAlignmentRows(seat, userIssues)).toEqual([
      { label: "Grocery costs", pct: null, fraction: null },
      { label: "Education keeping pace with AI", pct: 20, fraction: "1/5" },
      { label: "Healthcare affordability", pct: 61, fraction: "11/18" },
    ]);
  });

  it("banner aggregate now sums across every scored issue, not just the one issuesForLevel let through", () => {
    // avg(20%, 61.1%) = 40.56 -> rounds to 41, distinct from Healthcare's own 61%
    expect(seatOverviewAlignmentPct(seat, userIssues)).toBe(41);
  });
});

describe("issuesForSeatCard", () => {
  it("still excludes an off-level issue with no scoreable record for this seat", () => {
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
    expect(
      issuesForSeatCard(userIssues, seat).map((i) => i.canonicalIssue),
    ).toEqual(["healthcare_affordability"]);
  });

  it("does not falsely admit an off-level issue when the seat has no alignmentEntry at all (unresolved seat)", () => {
    const seat = { level: "federal" as const, alignmentEntry: null };
    const userIssues = [
      issue("state_only_issue", "A state-only issue", "state"),
    ];
    expect(issuesForSeatCard(userIssues, seat)).toEqual([]);
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
