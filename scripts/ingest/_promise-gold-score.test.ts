/**
 * Tests for the promise gold scorer's pure functions — CSV round-trip with
 * the sample writer, pairing, agreement, Cohen's κ, polarity flips, and the
 * §6.4 ship gate. No network, no DB.
 */

import { describe, it, expect } from "vitest";
import {
  parseCsv,
  labelsByPromise,
  pairLabels,
  agreementRate,
  cohenKappa,
  isPolarityFlip,
  scoreVerdictGate,
  type PairedLabels,
} from "./_promise-gold-score";
import { csvLine, renderExtractionCsv } from "./_promise-gold-sample";

describe("csv round-trip", () => {
  it("parseCsv inverts csvLine, including quotes, commas, and newlines", () => {
    const line = csvLine([
      "pr_1",
      'He said "I will vote, always" — verbatim',
      "line1\nline2",
      null,
    ]);
    const rows = parseCsv(`${line}\n`);
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe('He said "I will vote, always" — verbatim');
    expect(rows[0][2]).toBe("line1\nline2");
    expect(rows[0][3]).toBe("");
  });

  it("renderExtractionCsv output parses back with the header intact", () => {
    const csv = renderExtractionCsv([
      {
        promiseId: "pr_1",
        candidateName: "Jane Doe",
        seat: "TX-21",
        promiseText: 'I will vote against "X", always.',
        canonicalIssue: "property_taxes",
        subIssue: null,
        promiseType: "vote",
        conditionsDeadline: null,
        archiveUrl: "https://web.archive.org/web/20260801/https://example.com",
        linkedActions: [],
      },
    ]);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe("promise_id");
    expect(rows[1][0]).toBe("pr_1");
    expect(rows[1][7]).toBe('I will vote against "X", always.');
  });
});

describe("labelsByPromise + pairLabels", () => {
  const header = 'promise_id,"is_promise (yes/no)"';
  const a = parseCsv(`${header}\npr_1,yes\npr_2,no\npr_3,yes\npr_4,\n`);
  const b = parseCsv(`${header}\npr_1,YES\npr_2,yes\npr_3,yes\npr_4,no\n`);

  it("pairs only cases labeled by BOTH annotators, case-insensitively", () => {
    const pairs = pairLabels(
      labelsByPromise(a, "is_promise (yes/no)"),
      labelsByPromise(b, "is_promise (yes/no)"),
    );
    // pr_4 dropped: annotator a left it blank.
    expect(pairs.map((p) => p.promiseId)).toEqual(["pr_1", "pr_2", "pr_3"]);
    expect(pairs[0]).toEqual({ promiseId: "pr_1", a: "yes", b: "yes" });
  });

  it("throws on a CSV missing the required columns", () => {
    expect(() => labelsByPromise(parseCsv("foo,bar\n1,2\n"), "x")).toThrow(
      "required columns",
    );
  });
});

describe("agreement + kappa", () => {
  const perfect: PairedLabels[] = [
    { promiseId: "1", a: "kept", b: "kept" },
    { promiseId: "2", a: "broken", b: "broken" },
  ];
  const mixed: PairedLabels[] = [
    { promiseId: "1", a: "kept", b: "kept" },
    { promiseId: "2", a: "kept", b: "broken" },
    { promiseId: "3", a: "broken", b: "broken" },
    { promiseId: "4", a: "broken", b: "kept" },
  ];

  it("perfect two-category agreement scores κ = 1", () => {
    expect(agreementRate(perfect)).toBe(1);
    expect(cohenKappa(perfect)).toBe(1);
  });

  it("50% agreement with balanced marginals scores κ = 0", () => {
    expect(agreementRate(mixed)).toBe(0.5);
    expect(cohenKappa(mixed)).toBeCloseTo(0, 10);
  });

  it("degenerate single-category sets score κ = 1, not NaN", () => {
    const trivial: PairedLabels[] = [
      { promiseId: "1", a: "not_yet_testable", b: "not_yet_testable" },
    ];
    expect(cohenKappa(trivial)).toBe(1);
  });

  it("empty input scores 0, not NaN", () => {
    expect(agreementRate([])).toBe(0);
    expect(cohenKappa([])).toBe(0);
  });
});

describe("isPolarityFlip", () => {
  it("flags kept↔broken in both directions and nothing else", () => {
    expect(isPolarityFlip("kept", "broken")).toBe(true);
    expect(isPolarityFlip("broken", "kept")).toBe(true);
    expect(isPolarityFlip("kept", "compromise")).toBe(false);
    expect(isPolarityFlip("attempted_blocked", "broken")).toBe(false);
    expect(isPolarityFlip("kept", "kept")).toBe(false);
  });
});

describe("scoreVerdictGate", () => {
  const humans: PairedLabels[] = [
    { promiseId: "1", a: "kept", b: "kept" },
    { promiseId: "2", a: "broken", b: "broken" },
    { promiseId: "3", a: "kept", b: "kept" },
    { promiseId: "4", a: "attempted_blocked", b: "attempted_blocked" },
    { promiseId: "5", a: "kept", b: "compromise" }, // contested
  ];

  it("passes when the adjudicator matches all gold cases", () => {
    const result = scoreVerdictGate(
      humans,
      new Map([
        ["1", "kept"],
        ["2", "broken"],
        ["3", "kept"],
        ["4", "attempted_blocked"],
      ]),
    );
    expect(result.goldCases).toBe(4);
    expect(result.contestedCases).toEqual(["5"]);
    expect(result.adjudicatorAgreement).toBe(1);
    expect(result.polarityFlips).toEqual([]);
    expect(result.pass).toBe(true);
  });

  it("fails on a single kept↔broken polarity flip even at high agreement", () => {
    const result = scoreVerdictGate(
      humans,
      new Map([
        ["1", "kept"],
        ["2", "kept"], // human gold says broken — polarity flip
        ["3", "kept"],
        ["4", "attempted_blocked"],
      ]),
    );
    expect(result.polarityFlips).toEqual(["2"]);
    expect(result.gates.zeroPolarityFlips).toBe(false);
    expect(result.pass).toBe(false);
  });

  it("fails when human κ is below 0.70", () => {
    const noisy: PairedLabels[] = [
      { promiseId: "1", a: "kept", b: "broken" },
      { promiseId: "2", a: "broken", b: "kept" },
      { promiseId: "3", a: "kept", b: "kept" },
      { promiseId: "4", a: "broken", b: "broken" },
    ];
    const result = scoreVerdictGate(noisy, new Map());
    expect(result.gates.kappaAtLeast070).toBe(false);
    expect(result.pass).toBe(false);
  });

  it("never scores the adjudicator on contested cases", () => {
    const result = scoreVerdictGate(
      humans,
      new Map([["5", "kept"]]), // only the contested case has a model verdict
    );
    expect(result.adjudicatorScored).toBe(0);
    expect(result.adjudicatorAgreement).toBe(0);
  });
});
