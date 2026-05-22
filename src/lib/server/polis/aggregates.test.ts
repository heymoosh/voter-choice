/**
 * Tests for polis aggregate helpers (Phase 8 — bars + bridges).
 *
 * Pure functions. No DB. Fixtures only.
 */

import { describe, it, expect } from "vitest";
import {
  computeOverlapBars,
  computeBridges,
  isBridgeStatement,
  BRIDGE_THRESHOLD,
} from "./aggregates";

/* ── computeOverlapBars ──────────────────────────────────────── */

describe("computeOverlapBars", () => {
  it("computes per-theme percentage of county sessions that share each user theme", () => {
    // 4 sessions in county, varying confirmed concerns.
    const sessions = [
      { concerns: ["healthcare", "housing"] },
      { concerns: ["healthcare"] },
      { concerns: ["housing", "education"] },
      { concerns: ["education"] },
    ];
    const userThemes = [
      { id: "healthcare", label: "Healthcare access" },
      { id: "housing", label: "Housing affordability" },
      { id: "education", label: "Public education" },
      { id: "climate", label: "Climate action" }, // not in any session → 0
    ];
    const bars = computeOverlapBars(sessions, userThemes);

    // 2/4 sessions include "healthcare" → 50
    // 2/4 sessions include "housing"    → 50
    // 2/4 sessions include "education"  → 50
    // 0/4 sessions include "climate"    → 0
    expect(bars).toEqual([
      { themeId: "healthcare", theme: "Healthcare access", percent: 50 },
      { themeId: "housing", theme: "Housing affordability", percent: 50 },
      { themeId: "education", theme: "Public education", percent: 50 },
      { themeId: "climate", theme: "Climate action", percent: 0 },
    ]);
  });

  it("rounds to nearest integer percent", () => {
    // 1/3 = 33.33… → 33
    const sessions = [
      { concerns: ["a"] },
      { concerns: ["b"] },
      { concerns: ["a"] },
    ];
    const bars = computeOverlapBars(sessions, [{ id: "a", label: "A" }]);
    expect(bars[0].percent).toBe(67); // 2/3 = 66.66… → 67
  });

  it("returns 0 percent for every theme when sessions array is empty", () => {
    const bars = computeOverlapBars(
      [],
      [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    );
    expect(bars).toEqual([
      { themeId: "a", theme: "A", percent: 0 },
      { themeId: "b", theme: "B", percent: 0 },
    ]);
  });

  it("returns no identity / session fields on the output records", () => {
    const sessions = [{ concerns: ["a"] }];
    const bars = computeOverlapBars(sessions, [{ id: "a", label: "A" }]);
    for (const bar of bars) {
      // Allowlist of permitted keys.
      const keys = Object.keys(bar).sort();
      expect(keys).toEqual(["percent", "theme", "themeId"]);
    }
  });
});

/* ── isBridgeStatement (parameterized 80% threshold) ─────────── */

describe("isBridgeStatement", () => {
  it("BRIDGE_THRESHOLD constant is 80", () => {
    expect(BRIDGE_THRESHOLD).toBe(80);
  });

  it("[93, 89, 94] → bridge (all >= 80)", () => {
    expect(isBridgeStatement([93, 89, 94])).toBe(true);
  });

  it("[93, 75, 94] → not bridge (75 below threshold)", () => {
    expect(isBridgeStatement([93, 75, 94])).toBe(false);
  });

  it("[80, 80, 80] → bridge (inclusive equality)", () => {
    expect(isBridgeStatement([80, 80, 80])).toBe(true);
  });

  it("[79, 99, 99] → not bridge (79 below 80)", () => {
    expect(isBridgeStatement([79, 99, 99])).toBe(false);
  });

  it("empty cluster list → not bridge", () => {
    expect(isBridgeStatement([])).toBe(false);
  });
});

/* ── computeBridges ──────────────────────────────────────────── */

describe("computeBridges", () => {
  it("returns statements where every cluster agrees at >= 80%", () => {
    const statements = [
      {
        statement: "Members of Congress should not trade individual stocks.",
        clusterAgreement: [
          { name: "Service-first progressives", agreementPercent: 93 },
          { name: "Pocketbook moderates", agreementPercent: 89 },
          { name: "Civic libertarians", agreementPercent: 94 },
        ],
      },
      {
        statement: "Federal income tax should be abolished.",
        clusterAgreement: [
          { name: "Service-first progressives", agreementPercent: 12 },
          { name: "Pocketbook moderates", agreementPercent: 35 },
          { name: "Civic libertarians", agreementPercent: 88 },
        ],
      },
    ];

    const bridges = computeBridges(statements);
    expect(bridges).toHaveLength(1);
    expect(bridges[0].statement).toMatch(/individual stocks/);
    expect(bridges[0].clusters).toHaveLength(3);
  });

  it("returns an empty array when no statements meet threshold", () => {
    const statements = [
      {
        statement: "X",
        clusterAgreement: [
          { name: "A", agreementPercent: 79 },
          { name: "B", agreementPercent: 99 },
        ],
      },
    ];
    expect(computeBridges(statements)).toEqual([]);
  });

  it("returns an empty array when statements array is empty", () => {
    expect(computeBridges([])).toEqual([]);
  });

  it("output records have only allowlisted keys (no identity / session)", () => {
    const statements = [
      {
        statement: "X",
        clusterAgreement: [
          { name: "A", agreementPercent: 90 },
          { name: "B", agreementPercent: 95 },
        ],
      },
    ];
    const bridges = computeBridges(statements);
    for (const bridge of bridges) {
      const keys = Object.keys(bridge).sort();
      expect(keys).toEqual(["clusters", "statement"]);
      for (const c of bridge.clusters) {
        const ckeys = Object.keys(c).sort();
        expect(ckeys).toEqual(["agreementPercent", "name"]);
      }
    }
  });
});
