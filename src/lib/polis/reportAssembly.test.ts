/**
 * Unit tests for src/lib/polis/reportAssembly.ts
 *
 * Pure functions, synthetic fixtures only. No DB, no network.
 *
 * Covers card 174c8798: an empty (size-0) k-means cluster must not
 * (a) suppress consensus statements assembled into the report, nor
 * (b) appear as a phantom 0-member cluster in `PolisReportResult.clusters`.
 */

import { describe, it, expect } from "vitest";
import { assemblePolisReport } from "./reportAssembly";
import { clusterVectors, DEFAULT_K, type ResponseVector } from "./clustering";

/**
 * Two clean groups (5 sessions each) that fully disagree on s1/s2 but
 * unanimously agree on s3. With DEFAULT_K=3 this naturally produces one
 * empty cluster (see clustering.test.ts precondition test) — a real
 * repro of the reportAssembly phantom-cluster + suppressed-consensus bug,
 * not just a hand-built fixture.
 */
const TWO_GROUPS_WITH_SHARED_CONSENSUS: ResponseVector[] = [
  { s1: "agree", s2: "disagree", s3: "agree" },
  { s1: "agree", s2: "disagree", s3: "agree" },
  { s1: "agree", s2: "disagree", s3: "agree" },
  { s1: "agree", s2: "disagree", s3: "agree" },
  { s1: "agree", s2: "disagree", s3: "agree" },
  { s1: "disagree", s2: "agree", s3: "agree" },
  { s1: "disagree", s2: "agree", s3: "agree" },
  { s1: "disagree", s2: "agree", s3: "agree" },
  { s1: "disagree", s2: "agree", s3: "agree" },
  { s1: "disagree", s2: "agree", s3: "agree" },
];

describe("assemblePolisReport — empty cluster (card 174c8798)", () => {
  it("precondition: clusterVectors at DEFAULT_K produces an empty cluster for this fixture", () => {
    const clusters = clusterVectors(
      TWO_GROUPS_WITH_SHARED_CONSENSUS,
      DEFAULT_K,
    );
    expect(clusters).not.toBeNull();
    expect(clusters!.some((c) => c.size === 0)).toBe(true);
  });

  it("still surfaces the shared-consensus statement (s3) despite the empty cluster", () => {
    const report = assemblePolisReport(TWO_GROUPS_WITH_SHARED_CONSENSUS);
    expect(report.hasEnoughData).toBe(true);
    const stmtIds = report.consensusStatements.map((c) => c.statementId);
    expect(stmtIds).toContain("s3");
  });

  it("does not report a size-0 phantom cluster in the report's clusters list", () => {
    const report = assemblePolisReport(TWO_GROUPS_WITH_SHARED_CONSENSUS);
    expect(report.hasEnoughData).toBe(true);
    expect(report.clusters.every((c) => c.size > 0)).toBe(true);
  });

  it("reported cluster sizes still sum to the sample size (phantom cluster carried no members anyway)", () => {
    const report = assemblePolisReport(TWO_GROUPS_WITH_SHARED_CONSENSUS);
    const total = report.clusters.reduce((acc, c) => acc + c.size, 0);
    expect(total).toBe(report.sampleSize);
  });
});
