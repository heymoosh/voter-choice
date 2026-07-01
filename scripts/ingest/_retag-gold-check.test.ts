/**
 * Tests for scripts/ingest/_retag-gold-check.ts — the before/after validation
 * for the targeted re-tag. Covers the pure diff logic and the mocked-DB
 * snapshot parse.
 */

import { describe, expect, it, vi } from "vitest";
import {
  computeRetagSnapshot,
  diffRetagSnapshots,
  type RetagSnapshot,
} from "./_retag-gold-check";

function snap(over: Partial<RetagSnapshot>): RetagSnapshot {
  return {
    issue: "reproductive_rights",
    states: ["TX"],
    subsetBills: 100,
    taggedForIssue: 30,
    coverage: 0.3,
    stance: { in_favor: 10, opposed: 20 },
    meanConfidence: 0.8,
    ...over,
  };
}

describe("diffRetagSnapshots", () => {
  it("reports a clean lift with no warnings", () => {
    const before = snap({ taggedForIssue: 30, coverage: 0.3 });
    const after = snap({ taggedForIssue: 70, coverage: 0.7 });
    const diff = diffRetagSnapshots(before, after);
    expect(diff.taggedDelta).toBe(40);
    expect(diff.coverageDelta).toBeCloseTo(0.4, 5);
    expect(diff.warnings).toHaveLength(0);
  });

  it("warns when coverage drops", () => {
    const before = snap({ coverage: 0.5 });
    const after = snap({ coverage: 0.3 });
    const diff = diffRetagSnapshots(before, after);
    expect(diff.warnings.some((w) => /coverage DROPPED/u.test(w))).toBe(true);
  });

  it("warns when mean confidence collapses (>0.1 drop)", () => {
    const before = snap({ meanConfidence: 0.9 });
    const after = snap({ meanConfidence: 0.7 });
    const diff = diffRetagSnapshots(before, after);
    expect(diff.confidenceDelta).toBeCloseTo(-0.2, 5);
    expect(diff.warnings.some((w) => /confidence fell/u.test(w))).toBe(true);
  });

  it("handles null confidence on either side", () => {
    const before = snap({ meanConfidence: null });
    const after = snap({ meanConfidence: 0.8 });
    const diff = diffRetagSnapshots(before, after);
    expect(diff.confidenceDelta).toBeNull();
  });
});

describe("computeRetagSnapshot", () => {
  it("parses the aggregate row into a typed snapshot", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            subset_bills: "100",
            tagged_for_issue: "40",
            in_favor: "15",
            opposed: "25",
            mean_confidence: "0.812",
          },
        ],
      }),
    } as unknown as import("../../db/client").DbClient;

    const s = await computeRetagSnapshot(db, "reproductive_rights");
    expect(s.subsetBills).toBe(100);
    expect(s.taggedForIssue).toBe(40);
    expect(s.coverage).toBeCloseTo(0.4, 5);
    expect(s.stance).toEqual({ in_favor: 15, opposed: 25 });
    expect(s.meanConfidence).toBeCloseTo(0.812, 5);
  });

  it("coverage is 0 when the subset is empty", async () => {
    const db = {
      execute: vi.fn().mockResolvedValue({
        rows: [
          {
            subset_bills: "0",
            tagged_for_issue: "0",
            in_favor: "0",
            opposed: "0",
            mean_confidence: null,
          },
        ],
      }),
    } as unknown as import("../../db/client").DbClient;

    const s = await computeRetagSnapshot(db, "immigration");
    expect(s.coverage).toBe(0);
    expect(s.meanConfidence).toBeNull();
  });
});
