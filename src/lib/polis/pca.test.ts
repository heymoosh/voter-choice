/**
 * Unit tests for the pol.is-style opinion MAP (PCA + k-means assembly).
 *
 * Pure functions, synthetic fixtures only. No DB, no network.
 *
 * Covers:
 *  - principalComponents2D: deterministic, top-2 axes recover a known spread
 *  - assembleClusterMap: 3 archetypal answer-patterns + noise → 3 opinion
 *    groups whose 2-D centroids are distinct and whose members separate
 *  - honest fallbacks: too-few sessions, <2 statements, uniform (no
 *    separation) data all return null
 *  - "you" projection into the SAME space + nearest cluster
 *  - privacy: the payload leaks no party / session / token fields
 *    (key-allowlist test, mirroring aggregates.test.ts)
 */

import { describe, it, expect } from "vitest";
import {
  assembleClusterMap,
  principalComponents2D,
  projectOnto,
  type ResponseVector,
} from "./pca";
import type { ResponseVector as ClusteringVector } from "./clustering";

// ---------------------------------------------------------------------------
// Synthetic 3-archetype fixture (deterministic "noise")
// ---------------------------------------------------------------------------

type Answer = "agree" | "disagree" | "pass";

/** Six statements; three archetypes answer them in clearly distinct patterns. */
const S = ["s1", "s2", "s3", "s4", "s5", "s6"] as const;

const ARCHETYPES: Record<"A" | "B" | "C", Answer[]> = {
  // A: agree taxes/border (s1,s2), disagree drugs/climate (s3,s4)
  A: ["agree", "agree", "disagree", "disagree", "pass", "pass"],
  // B: the mirror — disagree taxes/border, agree drugs/climate
  B: ["disagree", "disagree", "agree", "agree", "pass", "pass"],
  // C: anti-corruption first (s5,s6), against the rest
  C: ["disagree", "disagree", "disagree", "disagree", "agree", "agree"],
};

/** Deterministic LCG so "noise" is reproducible across runs. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Build `n` rows of an archetype with occasional single-answer flips. */
function archetypeRows(
  kind: "A" | "B" | "C",
  n: number,
  rng: () => number,
): ResponseVector[] {
  const base = ARCHETYPES[kind];
  const rows: ResponseVector[] = [];
  for (let i = 0; i < n; i++) {
    const v: ResponseVector = {};
    for (let j = 0; j < S.length; j++) {
      let ans = base[j];
      // ~15% of answers flip to add realistic within-group scatter.
      if (rng() < 0.15) {
        const alt: Answer[] = ["agree", "disagree", "pass"];
        ans = alt[Math.floor(rng() * 3)];
      }
      v[S[j]] = ans;
    }
    rows.push(v);
  }
  return rows;
}

function threeClusterFixture(): {
  vectors: ResponseVector[];
  counts: { A: number; B: number; C: number };
} {
  const rng = makeRng(42);
  const counts = { A: 26, B: 25, C: 17 };
  const vectors = [
    ...archetypeRows("A", counts.A, rng),
    ...archetypeRows("B", counts.B, rng),
    ...archetypeRows("C", counts.C, rng),
  ];
  return { vectors, counts };
}

// ---------------------------------------------------------------------------
// principalComponents2D
// ---------------------------------------------------------------------------

describe("principalComponents2D", () => {
  it("is deterministic and recovers the dominant axis of spread", () => {
    // Points spread mostly along dimension 0.
    const rows = [
      [-3, 0.1],
      [-1, -0.1],
      [0, 0.05],
      [1, 0.0],
      [3, -0.05],
    ];
    const a = principalComponents2D(rows);
    const b = principalComponents2D(rows);
    expect(a.pc1).toEqual(b.pc1); // reproducible
    expect(a.pc2).toEqual(b.pc2);
    // PC1 should load overwhelmingly on dim 0.
    expect(Math.abs(a.pc1[0])).toBeGreaterThan(Math.abs(a.pc1[1]));
  });

  it("returns a zero second component for a 1-D dataset", () => {
    const rows = [[-2], [-1], [0], [1], [2]];
    const pca = principalComponents2D(rows);
    expect(pca.pc2).toEqual([0]);
  });

  it("projects the centroid of the input near the origin", () => {
    const rows = [
      [2, 2],
      [-2, -2],
      [2, -2],
      [-2, 2],
    ];
    const pca = principalComponents2D(rows);
    const center = projectOnto([0, 0], pca);
    expect(Math.abs(center.x)).toBeLessThan(1e-9);
    expect(Math.abs(center.y)).toBeLessThan(1e-9);
  });
});

// ---------------------------------------------------------------------------
// assembleClusterMap — the happy path
// ---------------------------------------------------------------------------

describe("assembleClusterMap — 3 archetypes", () => {
  const { vectors, counts } = threeClusterFixture();
  const map = assembleClusterMap(vectors, undefined, 3);

  it("returns a populated map (not the single-cloud fallback)", () => {
    expect(map).not.toBeNull();
  });

  it("finds three opinion groups labelled Group A/B/C by size", () => {
    const groups = map!.clusters;
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.label)).toEqual([
      "Group A",
      "Group B",
      "Group C",
    ]);
    // Size-desc: shares are non-increasing and sum near 100.
    const shares = groups.map((g) => g.sharePercent);
    expect(shares[0]).toBeGreaterThanOrEqual(shares[1]);
    expect(shares[1]).toBeGreaterThanOrEqual(shares[2]);
    const total = counts.A + counts.B + counts.C;
    expect(groups[0].sharePercent).toBe(Math.round((counts.A / total) * 100));
  });

  it("places one dot per session, each tagged to a group", () => {
    expect(map!.dots).toHaveLength(vectors.length);
    for (const d of map!.dots) {
      expect(d.cluster).toBeGreaterThanOrEqual(0);
      expect(d.cluster).toBeLessThan(3);
    }
  });

  it("gives the three group centroids distinct 2-D positions", () => {
    const g = map!.clusters;
    const dist = (a: (typeof g)[number], b: (typeof g)[number]) =>
      Math.hypot(a.cx - b.cx, a.cy - b.cy);
    expect(dist(g[0], g[1])).toBeGreaterThan(12);
    expect(dist(g[0], g[2])).toBeGreaterThan(12);
    expect(dist(g[1], g[2])).toBeGreaterThan(12);
  });

  it("keeps every dot inside the display frame", () => {
    for (const d of map!.dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(100);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(100);
    }
  });

  it("separates members: a dot sits nearest its OWN group centroid most of the time", () => {
    const g = map!.clusters;
    let correct = 0;
    for (const d of map!.dots) {
      let nearest = 0;
      let best = Infinity;
      g.forEach((grp) => {
        const dd = Math.hypot(d.x - grp.cx, d.y - grp.cy);
        if (dd < best) {
          best = dd;
          nearest = grp.id;
        }
      });
      if (nearest === d.cluster) correct++;
    }
    // Overwhelming majority of dots are closest to their assigned group.
    expect(correct / map!.dots.length).toBeGreaterThan(0.85);
  });
});

// ---------------------------------------------------------------------------
// "you" projection
// ---------------------------------------------------------------------------

describe("assembleClusterMap — you", () => {
  it("projects a supplied voter vector and assigns a nearest group", () => {
    const { vectors } = threeClusterFixture();
    const you: ResponseVector = {
      s1: "agree",
      s2: "agree",
      s3: "disagree",
      s4: "disagree",
      s5: "pass",
      s6: "pass",
    }; // matches archetype A
    const map = assembleClusterMap(vectors, you, 3);
    expect(map).not.toBeNull();
    expect(map!.you).not.toBeNull();
    expect(map!.you!.cluster).toBeGreaterThanOrEqual(0);
    expect(map!.you!.cluster).toBeLessThan(3);
    expect(map!.you!.x).toBeGreaterThanOrEqual(0);
    expect(map!.you!.x).toBeLessThanOrEqual(100);
  });

  it("is null when no voter vector is supplied", () => {
    const { vectors } = threeClusterFixture();
    const map = assembleClusterMap(vectors, undefined, 3);
    expect(map!.you).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Honest fallbacks
// ---------------------------------------------------------------------------

describe("assembleClusterMap — honest fallbacks", () => {
  it("returns null below MIN_SESSIONS_TO_CLUSTER", () => {
    const rows: ResponseVector[] = [
      { s1: "agree", s2: "disagree" },
      { s1: "disagree", s2: "agree" },
    ];
    expect(assembleClusterMap(rows)).toBeNull();
  });

  it("returns null with fewer than 2 statements (no 2-D map)", () => {
    const rows: ResponseVector[] = Array.from({ length: 12 }, () => ({
      s1: "agree" as Answer,
    }));
    expect(assembleClusterMap(rows)).toBeNull();
  });

  it("returns null for uniform data — no fabricated 3-way split", () => {
    // 30 near-identical voters: one real cloud, not three groups.
    const rng = makeRng(7);
    const rows: ResponseVector[] = archetypeRows("A", 30, rng);
    expect(assembleClusterMap(rows)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Privacy — key allowlist (mirrors aggregates.test.ts)
// ---------------------------------------------------------------------------

describe("assembleClusterMap — party-free / privacy-safe payload", () => {
  const { vectors } = threeClusterFixture();
  const you: ResponseVector = {
    s1: "agree",
    s2: "agree",
    s3: "disagree",
    s4: "disagree",
    s5: "pass",
    s6: "pass",
  };
  const map = assembleClusterMap(vectors, you, 3)!;

  it("dot records carry ONLY {x, y, cluster}", () => {
    for (const d of map.dots) {
      expect(Object.keys(d).sort()).toEqual(["cluster", "x", "y"]);
    }
  });

  it("group records carry ONLY {cx, cy, id, label, sharePercent, spread}", () => {
    for (const g of map.clusters) {
      expect(Object.keys(g).sort()).toEqual([
        "cx",
        "cy",
        "id",
        "label",
        "sharePercent",
        "spread",
      ]);
    }
  });

  it("you record carries ONLY {cluster, x, y}", () => {
    expect(Object.keys(map.you!).sort()).toEqual(["cluster", "x", "y"]);
  });

  it("labels are neutral Group letters — never a party token", () => {
    const serialized = JSON.stringify(map).toLowerCase();
    for (const g of map.clusters) {
      expect(g.label).toMatch(/^group [a-e]$/i);
    }
    // No party / identity vocabulary anywhere in the payload.
    for (const token of [
      "dem",
      "republican",
      "democrat",
      '"r"',
      "party",
      "session",
      "token",
      "primary",
    ]) {
      expect(serialized).not.toContain(token);
    }
  });
});

// Type-compat guard: pca.ts re-exports the same ResponseVector as clustering.
const _typecheck: ClusteringVector = { s1: "agree" };
void _typecheck;
