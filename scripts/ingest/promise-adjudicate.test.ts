/**
 * scripts/ingest/promise-adjudicate.test.ts
 *
 * Tests for the adjudicator's pure functions — the deterministic §4.1
 * window rule, prompt rendering, and verdict validation (the no-fabricated-
 * evidence and no-forced-verdict rails). No network, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  windowNotYetOpen,
  deterministicNotYetTestable,
  buildAdjudicationSystemPrompt,
  buildAdjudicationPrompt,
  renderActionForPrompt,
  parseAndValidateVerdict,
  termWindowForCycle,
  ADJUDICATOR_VERSION,
  RUBRIC_VERSION,
  TERM_WINDOW,
  VERDICTS,
  type PromiseWithActions,
  type LinkedAction,
} from "./promise-adjudicate";

const ACTION: LinkedAction = {
  actionId: "act-1",
  actionType: "vote",
  direction: "toward",
  evidenceLevel: "activity",
  billId: "govtrack-hr1-120",
  billTitle: "An Act",
  billStatus: null,
  voteCast: "yea",
  voteDate: "2027-03-01",
};

function promise(
  overrides: Partial<PromiseWithActions> = {},
): PromiseWithActions {
  return {
    id: "pr_test",
    candidateId: "cand-1",
    canonicalIssue: "healthcare_affordability",
    promiseText: "I will vote against any bill cutting Medicaid.",
    promiseType: "vote",
    conditionsDeadline: null,
    actions: [ACTION],
    ...overrides,
  };
}

describe("windowNotYetOpen", () => {
  it("is true before the term starts and false from day one", () => {
    expect(windowNotYetOpen("2026-08-12")).toBe(true);
    expect(windowNotYetOpen("2027-01-02")).toBe(true);
    expect(windowNotYetOpen(TERM_WINDOW.start)).toBe(false);
    expect(windowNotYetOpen("2028-06-01")).toBe(false);
  });
});

describe("deterministicNotYetTestable", () => {
  it("issues not_yet_testable citing the rubric rule and the window", () => {
    const row = deterministicNotYetTestable(
      promise({ actions: [] }),
      "2026-08-12",
    );
    expect(row.verdict).toBe("not_yet_testable");
    expect(row.rationale).toContain(RUBRIC_VERSION);
    expect(row.rationale).toContain(TERM_WINDOW.start);
    expect(row.evidenceRefs).toBeNull();
    expect(row.adjudicatorVersion).toBe(ADJUDICATOR_VERSION);
  });

  it("notes current-term actions as context without judging on them", () => {
    const row = deterministicNotYetTestable(promise(), "2026-08-12");
    expect(row.verdict).toBe("not_yet_testable");
    expect(row.rationale).toContain("outside the promised window");
    expect(row.evidenceRefs).toEqual(["act-1"]);
  });

  it("records an explicit conditions_deadline in the rationale", () => {
    const row = deterministicNotYetTestable(
      promise({ conditionsDeadline: "first 100 days", actions: [] }),
      "2026-08-12",
    );
    expect(row.rationale).toContain("first 100 days");
  });
});

describe("prompt rendering", () => {
  it("system prompt carries the rubric version, rule order, and all verdicts", () => {
    const prompt = buildAdjudicationSystemPrompt();
    expect(prompt).toContain(RUBRIC_VERSION);
    for (const v of VERDICTS) expect(prompt).toContain(v);
    expect(prompt).toContain("FIRST MATCHING RULE");
    expect(prompt).toContain("PRE-DECLARED");
    expect(prompt).toContain("never penalized for flagging");
  });

  it("page prompt carries the declared test and the linked actions", () => {
    const p = buildAdjudicationPrompt(promise(), "2027-06-01");
    expect(p).toContain("promise_type=vote");
    expect(p).toContain("act-1");
    expect(p).toContain("vote_cast=yea");
    expect(p).toContain(TERM_WINDOW.start);
  });

  it("renders '(none linked)' when no actions exist", () => {
    const p = buildAdjudicationPrompt(promise({ actions: [] }), "2027-06-01");
    expect(p).toContain("(none linked)");
  });

  it("renderActionForPrompt omits null fields", () => {
    const line = renderActionForPrompt({
      ...ACTION,
      voteCast: null,
      voteDate: null,
      billTitle: null,
      billStatus: null,
    });
    expect(line).not.toContain("vote_cast");
    expect(line).not.toContain("bill=");
    expect(line).toContain("id=act-1");
  });
});

describe("parseAndValidateVerdict", () => {
  const good = {
    verdict: "kept",
    rationale:
      "Rule 2: the pre-declared vote occurred in the promised direction inside the window.",
    evidence_action_ids: ["act-1"],
  };

  it("accepts a well-formed verdict citing linked evidence", () => {
    const row = parseAndValidateVerdict(JSON.stringify(good), promise());
    expect(row.verdict).toBe("kept");
    expect(row.evidenceRefs).toEqual(["act-1"]);
    expect(row.adjudicatorVersion).toBe(ADJUDICATOR_VERSION);
  });

  it("downgrades fabricated evidence ids to not_yet_rated", () => {
    const row = parseAndValidateVerdict(
      JSON.stringify({ ...good, evidence_action_ids: ["act-1", "act-999"] }),
      promise(),
    );
    expect(row.verdict).toBe("not_yet_rated");
    expect(row.rationale).toContain("act-999");
  });

  it("downgrades unknown verdicts and malformed JSON to not_yet_rated", () => {
    expect(
      parseAndValidateVerdict(
        JSON.stringify({ ...good, verdict: "mostly_kept" }),
        promise(),
      ).verdict,
    ).toBe("not_yet_rated");
    expect(parseAndValidateVerdict("not json", promise()).verdict).toBe(
      "not_yet_rated",
    );
    expect(parseAndValidateVerdict("[]", promise()).verdict).toBe(
      "not_yet_rated",
    );
  });

  it("rejects a positive verdict with zero cited evidence", () => {
    const row = parseAndValidateVerdict(
      JSON.stringify({ ...good, evidence_action_ids: [] }),
      promise(),
    );
    expect(row.verdict).toBe("not_yet_rated");
    expect(row.rationale).toContain("cited no linked evidence");
  });

  it("allows not_yet_testable without evidence and keeps ambiguity reasons", () => {
    const nyt = parseAndValidateVerdict(
      JSON.stringify({
        verdict: "not_yet_testable",
        rationale: "Rule 1: no in-window action has occurred yet.",
        evidence_action_ids: [],
      }),
      promise(),
    );
    expect(nyt.verdict).toBe("not_yet_testable");

    const flagged = parseAndValidateVerdict(
      JSON.stringify({
        verdict: "not_yet_rated",
        rationale: "Two evidence items point at different verdicts.",
        evidence_action_ids: [],
        ambiguous_reason: "voted for the rule, against the bill",
      }),
      promise(),
    );
    expect(flagged.verdict).toBe("not_yet_rated");
    expect(flagged.rationale).toContain("voted for the rule");
  });

  it("rejects an empty rationale", () => {
    const row = parseAndValidateVerdict(
      JSON.stringify({ ...good, rationale: "ok" }),
      promise(),
    );
    expect(row.verdict).toBe("not_yet_rated");
  });

  it("tolerates markdown fences", () => {
    const row = parseAndValidateVerdict(
      "```json\n" + JSON.stringify(good) + "\n```",
      promise(),
    );
    expect(row.verdict).toBe("kept");
  });
});

describe("termWindowForCycle", () => {
  it("matches TERM_WINDOW for the 2026 cycle and closes for 2022", () => {
    expect(termWindowForCycle(2026)).toEqual(TERM_WINDOW);
    const retro = termWindowForCycle(2022);
    expect(retro).toEqual({ start: "2023-01-03", end: "2025-01-03" });
    // The retrospective window is already OPEN (and closed) today — the LLM
    // path, not the deterministic §4.1 short-circuit, applies.
    expect(windowNotYetOpen("2026-08-13", retro)).toBe(false);
  });
});

describe("version contract", () => {
  it("adjudicator_version pins rubric + revision + model", () => {
    expect(ADJUDICATOR_VERSION.startsWith(`${RUBRIC_VERSION}+`)).toBe(true);
    expect(ADJUDICATOR_VERSION.split("+").length).toBe(3);
  });
});
