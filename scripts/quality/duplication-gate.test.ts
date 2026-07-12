// scripts/quality/duplication-gate.test.ts
//
// Unit tests for the duplication ratchet's pure comparison logic. The jscpd
// subprocess itself is NOT run here (importing the module must stay
// side-effect-free — see the main-guard at the bottom of duplication-gate.ts);
// these tests feed synthetic report/baseline shapes through summarizeReport
// and compareToBaseline.

import { describe, expect, it } from "vitest";
import {
  compareToBaseline,
  LINE_SLACK,
  pairKey,
  summarizeReport,
  type Baseline,
  type JscpdReport,
} from "./duplication-gate";

function dup(a: string, b: string, lines: number) {
  return {
    lines,
    firstFile: { name: a, start: 1, end: lines },
    secondFile: { name: b, start: 1, end: lines },
  };
}

describe("pairKey", () => {
  it("is order-independent", () => {
    expect(pairKey("b.ts", "a.ts")).toBe(pairKey("a.ts", "b.ts"));
  });

  it("keys self-clones as the file paired with itself", () => {
    expect(pairKey("a.ts", "a.ts")).toBe("a.ts :: a.ts");
  });
});

describe("summarizeReport", () => {
  it("aggregates clone count and lines per unordered pair", () => {
    const report: JscpdReport = {
      duplicates: [
        dup("a.ts", "b.ts", 10),
        dup("b.ts", "a.ts", 7),
        dup("c.ts", "c.ts", 5),
      ],
    };
    expect(summarizeReport(report)).toEqual({
      "a.ts :: b.ts": { clones: 2, lines: 17 },
      "c.ts :: c.ts": { clones: 1, lines: 5 },
    });
  });
});

describe("compareToBaseline", () => {
  const baseline: Baseline = {
    pairs: {
      "a.ts :: b.ts": { clones: 2, lines: 20 },
    },
  };

  it("passes when current duplication matches the baseline exactly", () => {
    const out = compareToBaseline(
      { "a.ts :: b.ts": { clones: 2, lines: 20 } },
      baseline,
    );
    expect(out.failures).toEqual([]);
    expect(out.improvements).toEqual([]);
  });

  it("fails on a file pair that is not in the baseline", () => {
    const out = compareToBaseline(
      {
        "a.ts :: b.ts": { clones: 2, lines: 20 },
        "new1.tsx :: new2.tsx": { clones: 1, lines: 12 },
      },
      baseline,
    );
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0]).toMatchObject({
      pair: "new1.tsx :: new2.tsx",
      kind: "new-pair",
    });
  });

  it("fails when a baselined pair gains a clone, with zero slack", () => {
    const out = compareToBaseline(
      { "a.ts :: b.ts": { clones: 3, lines: 20 } },
      baseline,
    );
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0].kind).toBe("more-clones");
  });

  it("tolerates line growth within LINE_SLACK (clone-boundary jitter)", () => {
    const out = compareToBaseline(
      { "a.ts :: b.ts": { clones: 2, lines: 20 + LINE_SLACK } },
      baseline,
    );
    expect(out.failures).toEqual([]);
  });

  it("fails when a baselined pair's lines grow past LINE_SLACK", () => {
    const out = compareToBaseline(
      { "a.ts :: b.ts": { clones: 2, lines: 20 + LINE_SLACK + 1 } },
      baseline,
    );
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0].kind).toBe("more-lines");
  });

  it("reports shrunk and vanished pairs as improvements, not failures", () => {
    const wider: Baseline = {
      pairs: {
        "a.ts :: b.ts": { clones: 2, lines: 20 },
        "gone1.ts :: gone2.ts": { clones: 1, lines: 8 },
      },
    };
    const out = compareToBaseline(
      { "a.ts :: b.ts": { clones: 1, lines: 9 } },
      wider,
    );
    expect(out.failures).toEqual([]);
    expect(out.improvements.sort()).toEqual([
      "a.ts :: b.ts",
      "gone1.ts :: gone2.ts",
    ]);
  });
});
