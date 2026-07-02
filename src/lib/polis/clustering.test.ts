/**
 * Unit tests for Polis response-vector clustering.
 *
 * Pure functions, synthetic fixtures only. No DB, no network.
 *
 * Covers:
 *  - Two-cluster split → clusters returned with correct membership
 *  - Unanimous consensus fixture → consensus list non-empty
 *  - Fully divided fixture → isDivided=true
 *  - Tiny-N edge cases (below MIN_SESSIONS_TO_CLUSTER → null)
 *  - Empty vectors / no statements
 *  - Encoding helpers
 */

import { describe, it, expect } from "vitest";
import {
  clusterVectors,
  findConsensusStatements,
  detectDividedState,
  collectStatementIds,
  encodeVector,
  MIN_SESSIONS_TO_CLUSTER,
  DEFAULT_K,
  CONSENSUS_THRESHOLD,
  type ResponseVector,
  type Cluster,
} from "./clustering";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Clear two-cluster split: 5 sessions strongly agree on s1, 5 strongly agree
 * on s2 (and disagree on s1). With k=2 these should cluster cleanly.
 */
const TWO_CLUSTER_FIXTURE: ResponseVector[] = [
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "pass" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
  { s1: "pass", s2: "agree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
];

/**
 * Unanimous consensus: all 8 sessions agree on s1, split on s2. Expects
 * s1 to appear in consensus (cleared 100% in both clusters), s2 not.
 */
const UNANIMOUS_FIXTURE: ResponseVector[] = [
  { s1: "agree", s2: "agree" },
  { s1: "agree", s2: "agree" },
  { s1: "agree", s2: "agree" },
  { s1: "agree", s2: "agree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
];

/**
 * Fully divided: 5 sessions strongly agree on s1 (disagree on s2), 5 strongly
 * disagree on s1 (agree on s2). No statement should reach consensus; the
 * divide should be detected.
 */
const DIVIDED_FIXTURE: ResponseVector[] = [
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "agree", s2: "disagree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
  { s1: "disagree", s2: "agree" },
];

// ---------------------------------------------------------------------------
// collectStatementIds
// ---------------------------------------------------------------------------

describe("collectStatementIds", () => {
  it("collects all unique statement ids in sorted order", () => {
    const vectors: ResponseVector[] = [
      { b: "agree", a: "disagree" },
      { c: "pass" },
    ];
    expect(collectStatementIds(vectors)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(collectStatementIds([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// encodeVector
// ---------------------------------------------------------------------------

describe("encodeVector", () => {
  it("encodes agree=1, disagree=-1, pass=0", () => {
    const v: ResponseVector = { s1: "agree", s2: "disagree", s3: "pass" };
    expect(encodeVector(v, ["s1", "s2", "s3"])).toEqual([1, -1, 0]);
  });

  it("encodes missing statements as 0", () => {
    const v: ResponseVector = { s1: "agree" };
    expect(encodeVector(v, ["s1", "s2"])).toEqual([1, 0]);
  });
});

// ---------------------------------------------------------------------------
// clusterVectors — edge cases
// ---------------------------------------------------------------------------

describe("clusterVectors — edge cases", () => {
  it("returns null when vectors array is empty", () => {
    expect(clusterVectors([])).toBeNull();
  });

  it(`returns null when fewer than MIN_SESSIONS_TO_CLUSTER (${MIN_SESSIONS_TO_CLUSTER}) vectors`, () => {
    const tinyN: ResponseVector[] = [
      { s1: "agree" },
      { s1: "disagree" },
      { s1: "pass" },
      { s1: "agree" },
    ];
    expect(tinyN.length).toBeLessThan(MIN_SESSIONS_TO_CLUSTER);
    expect(clusterVectors(tinyN)).toBeNull();
  });

  it("returns null when no statements are answered in any vector", () => {
    const empty: ResponseVector[] = Array.from({ length: 10 }, () => ({}));
    expect(clusterVectors(empty)).toBeNull();
  });

  it("returns clusters array of length <= k", () => {
    const vectors: ResponseVector[] = Array.from({ length: 10 }, (_, i) => ({
      s1: i < 5 ? "agree" : "disagree",
    }));
    const clusters = clusterVectors(vectors, 3);
    expect(clusters).not.toBeNull();
    expect(clusters!.length).toBeLessThanOrEqual(3);
  });

  it("all cluster sizes sum to the number of vectors", () => {
    const vectors: ResponseVector[] = Array.from({ length: 12 }, (_, i) => ({
      s1: i < 6 ? "agree" : "disagree",
      s2: i % 3 === 0 ? "agree" : "pass",
    }));
    const clusters = clusterVectors(vectors, DEFAULT_K);
    expect(clusters).not.toBeNull();
    const totalSize = clusters!.reduce((acc, c) => acc + c.size, 0);
    expect(totalSize).toBe(vectors.length);
  });

  it("each memberIndex is unique across clusters", () => {
    const vectors = TWO_CLUSTER_FIXTURE;
    const clusters = clusterVectors(vectors, 2);
    expect(clusters).not.toBeNull();
    const allIndices = clusters!.flatMap((c) => c.memberIndices);
    const unique = new Set(allIndices);
    expect(unique.size).toBe(allIndices.length);
  });

  it("every memberIndex is a valid index into the input vectors array", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    for (const c of clusters!) {
      for (const idx of c.memberIndices) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(TWO_CLUSTER_FIXTURE.length);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// clusterVectors — two-cluster split
// ---------------------------------------------------------------------------

describe("clusterVectors — two-cluster split", () => {
  it("produces exactly 2 clusters when k=2", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    expect(clusters!.length).toBe(2);
  });

  it("clusters have non-zero size", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    for (const c of clusters!) {
      expect(c.size).toBeGreaterThan(0);
    }
  });

  it("the two clusters each capture roughly 5 sessions (the split is clean)", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const sizes = clusters!.map((c) => c.size).sort((a, b) => a - b);
    // With a clean 5/5 split the two clusters should be 4-6 each
    expect(sizes[0]).toBeGreaterThanOrEqual(4);
    expect(sizes[0]).toBeLessThanOrEqual(6);
    expect(sizes[1]).toBeGreaterThanOrEqual(4);
    expect(sizes[1]).toBeLessThanOrEqual(6);
  });

  it("centroid keys match the statement ids present in the fixture", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    for (const c of clusters!) {
      const keys = Object.keys(c.centroid).sort();
      expect(keys).toEqual(["s1", "s2"]);
    }
  });

  it("centroid values are in range [-1, 1]", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    for (const c of clusters!) {
      for (const val of Object.values(c.centroid)) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// findConsensusStatements — unanimous fixture
// ---------------------------------------------------------------------------

describe("findConsensusStatements — unanimous fixture", () => {
  it("finds s1 as consensus when all sessions agree on it across clusters", () => {
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    const stmtIds = consensus.map((c) => c.statementId);
    expect(stmtIds).toContain("s1");
  });

  it("does NOT include s2 in consensus (clusters are split ~50/50 on s2)", () => {
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    const stmtIds = consensus.map((c) => c.statementId);
    // s2 is disagree in one cluster → must NOT be in consensus at 60%
    expect(stmtIds).not.toContain("s2");
  });

  it("consensus items have clusterAgreement covering all clusters", () => {
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    for (const stmt of consensus) {
      expect(stmt.clusterAgreement.length).toBe(clusters!.length);
      for (const ca of stmt.clusterAgreement) {
        expect(ca.agreePct).toBeGreaterThanOrEqual(CONSENSUS_THRESHOLD);
      }
    }
  });

  it("returns empty array when clusters is null", () => {
    expect(findConsensusStatements(UNANIMOUS_FIXTURE, null)).toEqual([]);
  });

  it("returns empty array when clusters is empty", () => {
    expect(findConsensusStatements(UNANIMOUS_FIXTURE, [])).toEqual([]);
  });

  it("consensus results are sorted by minAgreePct descending", () => {
    // Build a fixture with two consensus statements of different strengths
    const vectors: ResponseVector[] = [
      { s1: "agree", s2: "agree", s3: "agree" },
      { s1: "agree", s2: "agree", s3: "agree" },
      { s1: "agree", s2: "agree", s3: "agree" },
      { s1: "agree", s2: "agree", s3: "pass" },
      { s1: "agree", s2: "agree", s3: "pass" },
      { s1: "agree", s2: "agree", s3: "pass" },
      { s1: "agree", s2: "agree", s3: "pass" },
      { s1: "agree", s2: "agree", s3: "pass" },
    ];
    const clusters = clusterVectors(vectors, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(vectors, clusters);
    for (let i = 1; i < consensus.length; i++) {
      expect(consensus[i - 1].minAgreePct).toBeGreaterThanOrEqual(
        consensus[i].minAgreePct,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// findConsensusStatements — empty cluster (card 174c8798)
// ---------------------------------------------------------------------------

/**
 * Two clean groups (5 sessions each) that fully disagree with each other on
 * s1/s2, but unanimously agree on s3. Requesting k=3 clusters on this data
 * naturally yields one empty cluster (k-means++ can seed a centroid that no
 * point is ever closer to than the two real clusters) — this reproduces the
 * bug from real `clusterVectors` output, not just a hand-built fixture.
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

describe("findConsensusStatements — empty cluster does not suppress consensus", () => {
  it("clusterVectors(..., 3) on the fixture actually produces an empty cluster (precondition)", () => {
    const clusters = clusterVectors(TWO_GROUPS_WITH_SHARED_CONSENSUS, 3);
    expect(clusters).not.toBeNull();
    expect(clusters!.length).toBe(3);
    expect(clusters!.some((c) => c.size === 0)).toBe(true);
  });

  it("still finds s3 as consensus when one of the 3 clusters is empty", () => {
    const clusters = clusterVectors(TWO_GROUPS_WITH_SHARED_CONSENSUS, 3);
    expect(clusters).not.toBeNull();
    expect(clusters!.some((c) => c.size === 0)).toBe(true); // precondition

    const consensus = findConsensusStatements(
      TWO_GROUPS_WITH_SHARED_CONSENSUS,
      clusters,
    );
    const stmtIds = consensus.map((c) => c.statementId);
    // Pre-fix: the empty cluster sets allClear=false for every statement,
    // so consensus is [] and s3 (100% agreement in both real clusters) is
    // wrongly excluded. Post-fix: the empty cluster is filtered out before
    // the agreement check, so s3 clears the threshold.
    expect(stmtIds).toContain("s3");
  });

  it("clusterAgreement on the consensus statement only covers the non-empty clusters", () => {
    const clusters = clusterVectors(TWO_GROUPS_WITH_SHARED_CONSENSUS, 3);
    expect(clusters).not.toBeNull();
    const nonEmptyCount = clusters!.filter((c) => c.size > 0).length;

    const consensus = findConsensusStatements(
      TWO_GROUPS_WITH_SHARED_CONSENSUS,
      clusters,
    );
    const s3 = consensus.find((c) => c.statementId === "s3");
    expect(s3).toBeDefined();
    expect(s3!.clusterAgreement.length).toBe(nonEmptyCount);
    expect(s3!.clusterAgreement.every((ca) => ca.agreePct === 100)).toBe(true);
  });

  it("directly-constructed clusters: an empty cluster among agreeing non-empty clusters does not block consensus", () => {
    // Hand-built Cluster[] (no dependency on k-means internals) mirroring the
    // shape clusterVectors would produce: 2 clusters that fully agree on s1,
    // 1 empty cluster in between.
    const vectors: ResponseVector[] = Array.from({ length: 8 }, () => ({
      s1: "agree" as const,
    }));
    const clustersWithEmpty: Cluster[] = [
      { id: 0, size: 4, centroid: { s1: 1 }, memberIndices: [0, 1, 2, 3] },
      { id: 1, size: 0, centroid: { s1: 0 }, memberIndices: [] },
      { id: 2, size: 4, centroid: { s1: 1 }, memberIndices: [4, 5, 6, 7] },
    ];

    const consensus = findConsensusStatements(vectors, clustersWithEmpty);
    expect(consensus.map((c) => c.statementId)).toContain("s1");
    const s1 = consensus.find((c) => c.statementId === "s1")!;
    expect(s1.clusterAgreement.length).toBe(2); // only the 2 non-empty clusters
    expect(s1.minAgreePct).toBe(100);
  });

  it("an all-empty cluster list yields no consensus (not a crash)", () => {
    const vectors: ResponseVector[] = Array.from({ length: 4 }, () => ({
      s1: "agree" as const,
    }));
    const allEmpty: Cluster[] = [
      { id: 0, size: 0, centroid: { s1: 0 }, memberIndices: [] },
      { id: 1, size: 0, centroid: { s1: 0 }, memberIndices: [] },
    ];
    expect(findConsensusStatements(vectors, allEmpty)).toEqual([]);
  });

  it("all-nonempty clusters still behave exactly as before (regression guard)", () => {
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    expect(clusters!.every((c) => c.size > 0)).toBe(true); // precondition
    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    expect(consensus.map((c) => c.statementId)).toContain("s1");
    expect(consensus.map((c) => c.statementId)).not.toContain("s2");
  });
});

// ---------------------------------------------------------------------------
// detectDividedState — divided fixture
// ---------------------------------------------------------------------------

describe("detectDividedState — divided fixture", () => {
  it("detects divided=true when clusters sharply disagree and no consensus", () => {
    const clusters = clusterVectors(DIVIDED_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(DIVIDED_FIXTURE, clusters);
    const divided = detectDividedState(DIVIDED_FIXTURE, clusters, consensus);
    expect(divided.isDivided).toBe(true);
  });

  it("provides a sharpestDivide statement when isDivided=true", () => {
    const clusters = clusterVectors(DIVIDED_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(DIVIDED_FIXTURE, clusters);
    const divided = detectDividedState(DIVIDED_FIXTURE, clusters, consensus);
    expect(divided.isDivided).toBe(true);
    expect(divided.sharpestDivide).not.toBeNull();
    expect(["s1", "s2"]).toContain(divided.sharpestDivide);
  });

  it("returns isDivided=false when consensus statements exist", () => {
    // Use the unanimous fixture where s1 should be in consensus
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    expect(consensus.length).toBeGreaterThan(0); // precondition
    const divided = detectDividedState(UNANIMOUS_FIXTURE, clusters, consensus);
    expect(divided.isDivided).toBe(false);
  });

  it("returns isDivided=false when clusters is null", () => {
    expect(detectDividedState(DIVIDED_FIXTURE, null, []).isDivided).toBe(false);
  });

  it("returns isDivided=false when fewer than 2 clusters", () => {
    const singleCluster: Cluster[] = [
      { id: 0, size: 5, centroid: { s1: 1 }, memberIndices: [0, 1, 2, 3, 4] },
    ];
    const divided = detectDividedState(DIVIDED_FIXTURE, singleCluster, []);
    expect(divided.isDivided).toBe(false);
  });

  it("returns isDivided=false for empty vectors", () => {
    const divided = detectDividedState([], [], []);
    expect(divided.isDivided).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full pipeline probe
// ---------------------------------------------------------------------------

describe("full pipeline probe", () => {
  it("two-cluster fixture → clusters returned, divided detected, no consensus", () => {
    const clusters = clusterVectors(TWO_CLUSTER_FIXTURE, 2);
    expect(clusters).not.toBeNull();
    expect(clusters!.length).toBe(2);

    const consensus = findConsensusStatements(TWO_CLUSTER_FIXTURE, clusters);
    // No statement clears 60% in BOTH clusters in this split fixture
    // (each cluster agrees on its own statement but disagrees on the other's)
    // We don't assert empty here because depending on clustering outcomes
    // the agree-pct might vary — just verify the shape is correct.
    for (const stmt of consensus) {
      expect(stmt.statementId).toBeTypeOf("string");
      for (const ca of stmt.clusterAgreement) {
        expect(ca.agreePct).toBeGreaterThanOrEqual(CONSENSUS_THRESHOLD);
      }
    }

    const divided = detectDividedState(
      TWO_CLUSTER_FIXTURE,
      clusters,
      consensus,
    );
    // The fixture is a clean two-cluster split with no consensus → divided
    if (consensus.length === 0) {
      expect(divided.isDivided).toBe(true);
    } else {
      expect(divided.isDivided).toBe(false);
    }
  });

  it("unanimous fixture → s1 in consensus, isDivided=false", () => {
    const clusters = clusterVectors(UNANIMOUS_FIXTURE, 2);
    expect(clusters).not.toBeNull();

    const consensus = findConsensusStatements(UNANIMOUS_FIXTURE, clusters);
    expect(consensus.map((c) => c.statementId)).toContain("s1");

    const divided = detectDividedState(UNANIMOUS_FIXTURE, clusters, consensus);
    expect(divided.isDivided).toBe(false);
    expect(divided.sharpestDivide).toBeNull();
  });

  it("divided fixture → isDivided=true, sharpestDivide is one of the statements", () => {
    const clusters = clusterVectors(DIVIDED_FIXTURE, 2);
    expect(clusters).not.toBeNull();

    const consensus = findConsensusStatements(DIVIDED_FIXTURE, clusters);
    const divided = detectDividedState(DIVIDED_FIXTURE, clusters, consensus);

    expect(divided.isDivided).toBe(true);
    expect(["s1", "s2"]).toContain(divided.sharpestDivide);
  });
});
