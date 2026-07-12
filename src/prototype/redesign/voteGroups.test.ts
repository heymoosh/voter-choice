// Unit gate for the issue-consistency invariant at the derivation layer:
// AllVotesPanel's groups (voteGroupsForUserIssues) and the card's alignment
// rows (seatIssueAlignmentRows) must present the SAME issue set — same
// count, same order, same labels — for the same inputs. The e2e spec
// (e2e/redesign-issue-consistency.spec.ts) checks the rendered surfaces;
// this test pins the shared contract where it's cheapest to catch: if
// someone re-adds a filter/slice to one derivation and not the other, this
// fails without booting a browser.

import { describe, expect, it } from "vitest";
import { voteGroupsForUserIssues } from "./voteGroups";
import { seatIssueAlignmentRows, type UserIssue } from "./delegationData";

const USER_ISSUES: UserIssue[] = [
  {
    canonicalIssue: "healthcare_affordability",
    interpretation: "Lower insulin & drug prices",
    level: "federal",
  },
  {
    canonicalIssue: "housing_affordability",
    interpretation: "Rent & cost-of-living protections",
    level: "both",
  },
  {
    // Custom issue — never mapped, so it can never be scored. It still may
    // not vanish from any surface that renders "your issues".
    interpretation: "Fix the potholes on Ranch Road",
    level: "both",
  },
];

// One scored issue with votes, one scored issue with NO votes, plus a score
// for an issue the user never picked (must be ignored, not displayed).
const SCORES = [
  {
    canonicalIssue: "healthcare_affordability",
    issueLabel: "Healthcare (API's own label — not the user's wording)",
    kept: 5,
    total: 6,
    contributingVotes: [
      {
        billTitle: "S 1339 · Insulin Price Cap Act",
        voteCast: "with",
        date: "2025-06-12",
        source: { name: "GovTrack", url: "https://www.govtrack.us/" },
      },
    ],
  },
  {
    canonicalIssue: "housing_affordability",
    issueLabel: "Housing",
    kept: 0,
    total: 0,
    contributingVotes: [],
  },
  {
    canonicalIssue: "immigration_border",
    issueLabel: "An issue the user never picked",
    kept: 3,
    total: 4,
    contributingVotes: [
      {
        billTitle: "HR 1 · Not the user's issue",
        voteCast: "with",
        date: "2025-01-01",
        source: { name: "GovTrack", url: "https://www.govtrack.us/" },
      },
    ],
  },
];

describe("voteGroupsForUserIssues", () => {
  it("conserves the user's issue set: one group per issue, user's order and wording", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, SCORES);
    expect(groups.map((g) => g.issueLabel)).toEqual(
      USER_ISSUES.map((i) => i.interpretation),
    );
  });

  it("keeps voteless and unmapped issues as empty groups instead of dropping them", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, SCORES);
    expect(groups[1].votes).toEqual([]); // mapped, no votes
    expect(groups[2].votes).toEqual([]); // custom, unscoreable
    expect(groups[2].canonicalIssue).toBeNull();
  });

  it("joins votes and kept/total by canonicalIssue", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, SCORES);
    expect(groups[0].kept).toBe(5);
    expect(groups[0].total).toBe(6);
    expect(groups[0].votes).toHaveLength(1);
    expect(groups[0].votes[0].billTitle).toContain("S 1339");
  });

  it("ignores scores for issues outside the user's list", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, SCORES);
    expect(
      groups.find((g) => g.canonicalIssue === "immigration_border"),
    ).toBeUndefined();
  });

  it("survives a null/missing scores payload (research-pending seats)", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, null);
    expect(groups).toHaveLength(USER_ISSUES.length);
    expect(groups.every((g) => g.votes.length === 0)).toBe(true);
  });

  it("gives every group a stable, unique key (custom issues included)", () => {
    const groups = voteGroupsForUserIssues(USER_ISSUES, SCORES);
    const keys = groups.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("cross-surface consistency with seatIssueAlignmentRows", () => {
  it("panel groups and card rows present the same issues, in the same order, with the same labels", () => {
    const seat = {
      level: "federal" as const,
      alignmentEntry: { scores: SCORES },
    };
    // Both surfaces consume the same level-scoped list, the way
    // DelegationWorkspace/RepCard wire them (issuesForLevel applied once,
    // upstream). seatIssueAlignmentRows applies the scoping itself; the
    // panel receives the pre-scoped list.
    const cardRows = seatIssueAlignmentRows(seat, USER_ISSUES);
    const panelGroups = voteGroupsForUserIssues(
      USER_ISSUES.filter((i) => i.level === "federal" || i.level === "both"),
      seat.alignmentEntry.scores,
    );
    expect(panelGroups.map((g) => g.issueLabel)).toEqual(
      cardRows.map((r) => r.label),
    );
  });
});
