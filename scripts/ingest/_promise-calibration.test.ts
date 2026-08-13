/**
 * Tests for the external-calibration harness's pure functions — CSV → case
 * validation, the production-shape conversion (synthetic action ids feeding
 * the real no-fabricated-evidence rail), per-case window threading, and the
 * calibration scoring report. No network, no DB.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  CALIBRATION_COLUMNS,
  parseCalibrationCases,
  toPromiseWithActions,
  scoreCalibration,
  type CalibrationCase,
  type CaseResult,
} from "./_promise-calibration";
import { parseCsv } from "./_promise-gold-score";
import {
  buildAdjudicationPrompt,
  parseAndValidateVerdict,
  windowNotYetOpen,
  TERM_WINDOW,
} from "./promise-adjudicate";

// Vitest runs from the repo root, so the fixture resolves relative to it.
const FIXTURE = resolve(
  "scripts/ingest/fixtures/promise-calibration-sample.csv",
);

function fixtureCases(): CalibrationCase[] {
  const { cases, errors } = parseCalibrationCases(
    parseCsv(readFileSync(FIXTURE, "utf8")),
  );
  expect(errors).toEqual([]);
  return cases;
}

function csvOf(rows: string[][]): string[][] {
  return rows;
}

/** Build a minimal valid data row matching CALIBRATION_COLUMNS order. */
function row(overrides: Partial<Record<string, string>> = {}): string[] {
  const base: Record<string, string> = {
    case_id: "c1",
    source: "test",
    source_url: "https://example.com/ruling",
    source_label: "Promise Kept",
    expected_verdict: "kept",
    promise_text: "I will vote for X.",
    promise_type: "vote",
    conditions_deadline: "",
    canonical_issue: "healthcare_affordability",
    window_start: "2023-01-03",
    window_end: "2025-01-03",
    actions_json:
      '[{"action_type":"vote","direction":"toward","evidence_level":"activity","vote_cast":"yea"}]',
    notes: "",
  };
  Object.assign(base, overrides);
  return CALIBRATION_COLUMNS.map((c) => base[c]);
}

const HEADER = [...CALIBRATION_COLUMNS];

describe("parseCalibrationCases", () => {
  it("parses the tracked synthetic fixture cleanly", () => {
    const cases = fixtureCases();
    expect(cases).toHaveLength(5);
    expect(cases[0].caseId).toBe("cal_kept_vote");
    expect(cases[0].expectedVerdict).toBe("kept");
    expect(cases[0].actions[0].voteCast).toBe("nay");
    expect(cases[0].window).toEqual({
      start: "2023-01-03",
      end: "2025-01-03",
    });
    // The inaction case carries zero actions — legal input, exercises the
    // zero-evidence rail downstream.
    const inaction = cases.find((c) => c.caseId === "cal_inaction");
    expect(inaction?.actions).toEqual([]);
  });

  it("rejects an expected_verdict outside the enum", () => {
    const { cases, errors } = parseCalibrationCases(
      csvOf([HEADER, row({ expected_verdict: "mostly_kept" })]),
    );
    expect(cases).toEqual([]);
    expect(errors.join(" ")).toContain("mostly_kept");
  });

  it("rejects a promise_type outside the extractor's enum", () => {
    const { cases, errors } = parseCalibrationCases(
      csvOf([HEADER, row({ promise_type: "tweet" })]),
    );
    expect(cases).toEqual([]);
    expect(errors.join(" ")).toContain("tweet");
  });

  it("requires source_url — labels are citation-only", () => {
    const { cases, errors } = parseCalibrationCases(
      csvOf([HEADER, row({ source_url: "" })]),
    );
    expect(cases).toEqual([]);
    expect(errors.join(" ")).toContain("citation");
  });

  it("rejects malformed actions_json and bad action fields", () => {
    expect(
      parseCalibrationCases(
        csvOf([HEADER, row({ actions_json: "{oops" })]),
      ).errors.join(" "),
    ).toContain("not valid JSON");
    expect(
      parseCalibrationCases(
        csvOf([
          HEADER,
          row({
            actions_json:
              '[{"action_type":"vote","direction":"sideways","evidence_level":"activity"}]',
          }),
        ]),
      ).errors.join(" "),
    ).toContain("sideways");
    expect(
      parseCalibrationCases(
        csvOf([
          HEADER,
          row({
            actions_json:
              '[{"action_type":"vote","direction":"toward","evidence_level":"vibes"}]',
          }),
        ]),
      ).errors.join(" "),
    ).toContain("vibes");
  });

  it("rejects inverted windows and non-ISO dates", () => {
    expect(
      parseCalibrationCases(
        csvOf([
          HEADER,
          row({ window_start: "2025-01-03", window_end: "2023-01-03" }),
        ]),
      ).errors.join(" "),
    ).toContain("precede");
    expect(
      parseCalibrationCases(
        csvOf([HEADER, row({ window_start: "Jan 3 2023" })]),
      ).errors.join(" "),
    ).toContain("YYYY-MM-DD");
  });

  it("rejects duplicate case ids and keeps valid rows around invalid ones", () => {
    const { cases, errors } = parseCalibrationCases(
      csvOf([
        HEADER,
        row({ case_id: "dup" }),
        row({ case_id: "dup" }),
        row({ case_id: "ok" }),
        row({ case_id: "bad", expected_verdict: "nope" }),
      ]),
    );
    expect(cases.map((c) => c.caseId)).toEqual(["dup", "ok"]);
    expect(errors.join(" ")).toContain("duplicate");
    expect(errors.join(" ")).toContain("nope");
  });

  it("fails fast on a CSV missing a required column", () => {
    const { errors } = parseCalibrationCases(
      csvOf([
        ["case_id", "promise_text"],
        ["c1", "text"],
      ]),
    );
    expect(errors.join(" ")).toContain("required column");
  });
});

describe("toPromiseWithActions", () => {
  it("assigns synthetic ids the real evidence rail accepts — and only those", () => {
    const c = fixtureCases().find((x) => x.caseId === "cal_kept_vote")!;
    const promise = toPromiseWithActions(c);
    expect(promise.actions.map((a) => a.actionId)).toEqual([
      "act_cal_kept_vote_1",
    ]);

    const accepted = parseAndValidateVerdict(
      JSON.stringify({
        verdict: "kept",
        rationale:
          "Rule 2: the pre-declared vote occurred in the promised direction inside the window.",
        evidence_action_ids: ["act_cal_kept_vote_1"],
      }),
      promise,
    );
    expect(accepted.verdict).toBe("kept");

    const fabricated = parseAndValidateVerdict(
      JSON.stringify({
        verdict: "kept",
        rationale:
          "Rule 2: the pre-declared vote occurred in the promised direction inside the window.",
        evidence_action_ids: ["act_cal_kept_vote_99"],
      }),
      promise,
    );
    expect(fabricated.verdict).toBe("not_yet_rated");
  });

  it("threads the CASE's window into the prompt, not the 2026 TERM_WINDOW", () => {
    const c = fixtureCases()[0];
    const prompt = buildAdjudicationPrompt(
      toPromiseWithActions(c),
      "2026-08-13",
      c.window,
    );
    expect(prompt).toContain("2023-01-03 to 2025-01-03");
    expect(prompt).not.toContain(TERM_WINDOW.start);
  });

  it("historical windows are open (LLM path), the 2026 default is not", () => {
    const c = fixtureCases()[0];
    expect(windowNotYetOpen("2026-08-13", c.window)).toBe(false);
    expect(windowNotYetOpen("2026-08-13")).toBe(true);
  });
});

describe("scoreCalibration", () => {
  const meta = {
    nowIso: "2026-08-13",
    casesPath: "x.csv",
    cases: 4,
    apiErrors: [],
  };
  const result = (
    caseId: string,
    expected: string,
    model: string,
  ): CaseResult => ({
    caseId,
    source: "test",
    sourceUrl: "https://example.com",
    sourceLabel: "",
    expected,
    model,
    rationale: "",
  });

  it("perfect agreement: κ=1, no flips, no flags", () => {
    const report = scoreCalibration(
      [
        result("1", "kept", "kept"),
        result("2", "broken", "broken"),
        result("3", "compromise", "compromise"),
      ],
      meta,
    );
    expect(report.agreement).toBe(1);
    expect(report.kappa).toBe(1);
    expect(report.polarityFlips).toEqual([]);
    expect(report.flagRate).toBe(0);
    expect(report.disagreements).toEqual([]);
    expect(report.byExpected.kept).toEqual({ n: 1, agreed: 1, flagged: 0 });
  });

  it("flags a kept↔broken polarity flip", () => {
    const report = scoreCalibration(
      [result("1", "broken", "kept"), result("2", "kept", "kept")],
      meta,
    );
    expect(report.polarityFlips).toEqual(["1"]);
    expect(report.disagreements.map((d) => d.caseId)).toEqual(["1"]);
  });

  it("separates flag rate from wrongness: flags hurt agreement but not the flip count", () => {
    const report = scoreCalibration(
      [
        result("1", "broken", "not_yet_rated"),
        result("2", "kept", "kept"),
        result("3", "kept", "kept"),
        result("4", "compromise", "kept"),
      ],
      meta,
    );
    expect(report.flagged).toEqual(["1"]);
    expect(report.flagRate).toBe(0.25);
    expect(report.agreement).toBe(0.5);
    // excluding the flagged case: 2 of 3 agree
    expect(report.agreementExcludingFlags).toBeCloseTo(2 / 3, 10);
    expect(report.polarityFlips).toEqual([]);
    expect(report.byExpected.broken).toEqual({ n: 1, agreed: 0, flagged: 1 });
  });

  it("stamps the report with the adjudicator version and run metadata", () => {
    const report = scoreCalibration([result("1", "kept", "kept")], meta);
    expect(report.adjudicatorVersion).toContain("rubric-1.0.0");
    expect(report.nowIso).toBe("2026-08-13");
    expect(report.cases).toBe(4);
    expect(report.scored).toBe(1);
  });
});
