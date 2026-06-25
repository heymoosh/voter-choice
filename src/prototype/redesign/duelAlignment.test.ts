import { describe, it, expect } from "vitest";
import { issueAlignment, overallAlignment, buildLedger } from "./duelAlignment";
import type { AlignmentScore } from "../realData";
import type { UserIssue } from "./delegationData";

const vote = (
  canonicalIssue: string,
  kept: number,
  total: number,
): AlignmentScore =>
  ({
    canonicalIssue,
    issueLabel: canonicalIssue,
    resolvedStance: "in_favor",
    sourceType: "voting_record",
    kept,
    total,
  }) as AlignmentScore;

const researched = (
  canonicalIssue: string,
  resolvedStance: string,
): AlignmentScore =>
  ({
    canonicalIssue,
    issueLabel: canonicalIssue,
    resolvedStance,
    sourceType: "web_search",
    confidence: "medium",
  }) as AlignmentScore;

const issue = (canonicalIssue: string, interpretation: string): UserIssue =>
  ({ canonicalIssue, interpretation, level: "federal" }) as UserIssue;

describe("issueAlignment", () => {
  it("computes roll-call pct from kept/total", () => {
    expect(issueAlignment(vote("h", 5, 6))).toEqual({
      pct: 83,
      basis: "roll-call",
    });
  });

  it("returns null pct (honest unknown) for a thin roll-call row", () => {
    expect(issueAlignment(vote("h", 0, 0))).toEqual({
      pct: null,
      basis: "roll-call",
    });
  });

  it("maps researched stance to a directional band, tagged researched", () => {
    expect(issueAlignment(researched("h", "in_favor"))).toEqual({
      pct: 80,
      basis: "researched",
    });
    expect(issueAlignment(researched("h", "opposed"))).toEqual({
      pct: 20,
      basis: "researched",
    });
    expect(issueAlignment(researched("h", "mixed"))).toEqual({
      pct: 50,
      basis: "researched",
    });
  });

  it("never fabricates a number for an unclear researched read", () => {
    expect(issueAlignment(researched("h", "unclear"))).toEqual({
      pct: null,
      basis: "researched",
    });
  });

  it("returns null for a missing score", () => {
    expect(issueAlignment(undefined)).toBeNull();
  });
});

describe("overallAlignment", () => {
  it("vote-weights roll-call rows (Σkept/Σtotal)", () => {
    expect(overallAlignment([vote("a", 5, 6), vote("b", 1, 4)])).toEqual({
      pct: 60,
      basis: "roll-call",
    });
  });

  it("averages researched bands", () => {
    expect(
      overallAlignment([
        researched("a", "in_favor"),
        researched("b", "opposed"),
      ]),
    ).toEqual({ pct: 50, basis: "researched" });
  });

  it("returns null for no scoreable record", () => {
    expect(overallAlignment(null).pct).toBeNull();
    expect(overallAlignment([]).pct).toBeNull();
    expect(overallAlignment([vote("a", 0, 0)]).pct).toBeNull();
  });
});

describe("buildLedger", () => {
  const issues = [issue("a", "Healthcare"), issue("b", "Housing")];

  it("pairs incumbent vs challenger per user issue, in user order", () => {
    const rows = buildLedger(
      [vote("a", 3, 4), vote("b", 1, 5)], // 75, 20
      [researched("a", "in_favor"), researched("b", "in_favor")], // 80, 80
      issues,
    );
    expect(rows.map((r) => r.label)).toEqual(["Healthcare", "Housing"]);
    expect(rows[0].inc?.pct).toBe(75);
    expect(rows[0].ch?.pct).toBe(80);
    expect(rows[0].delta).toBe(5);
    expect(rows[1].delta).toBe(60); // 80 - 20
  });

  it("suppresses the delta when either side is an honest unknown", () => {
    const rows = buildLedger(
      [vote("a", 3, 4)], // only issue a has a record
      [researched("a", "unclear")], // challenger unknown on a
      issues,
    );
    expect(rows[0].inc?.pct).toBe(75);
    expect(rows[0].ch?.pct).toBeNull();
    expect(rows[0].delta).toBeNull();
    // issue b: incumbent has no row at all
    expect(rows[1].inc).toBeNull();
    expect(rows[1].delta).toBeNull();
  });
});
