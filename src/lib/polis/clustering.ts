/**
 * src/lib/polis/clustering.ts
 *
 * PURE functions for Polis response-vector clustering.
 *
 * No DB. No network. No side effects. All inputs/outputs are plain objects.
 *
 * Algorithm: k-means on numeric-encoded responses (agree=1, disagree=-1, pass=0,
 * missing=0). We run k-means with k=3 by default (three named clusters + the
 * caller may suppress "Unaligned" if thin — see clusters.ts). k-means is fast,
 * dependency-free, and sufficient for the P1 vertical slice.
 *
 * FOLLOW-UP (out of scope for P1):
 *   - PCA projection for the visual cluster MAP (2-D positions). The map in
 *     the PolisReport design needs 2-D coordinates per session dot; PCA would
 *     project each vector's encoded answers onto the first two principal
 *     components. This requires a matrix library or hand-rolled SVD — deferred
 *     to Phase 8b. For now the report assembly falls back to synthetic dot
 *     positions (same approach as the existing /api/polis route).
 *   - Silhouette-score or elbow heuristic to auto-pick k (currently fixed at 3).
 *   - Per-session cluster membership export for the scatter plot.
 *
 * Privacy: no PII in inputs or outputs. Session tokens are not passed into
 * any clustering function — callers only pass the `responses` payloads.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A voter's answer to one Polis statement. */
export type Answer = "agree" | "disagree" | "pass";

/**
 * One de-identified row from polis_response_vectors.responses.
 * Keys are statement ids; absent keys mean the voter did not answer.
 */
export type ResponseVector = Record<string, Answer>;

/** A cluster produced by the clustering step. */
export interface Cluster {
  /** 0-based cluster index. */
  id: number;
  /** Number of sessions assigned to this cluster. */
  size: number;
  /** For each statement, the centroid value (-1 to 1). */
  centroid: Record<string, number>;
  /** Indices into the input vectors array for members of this cluster. */
  memberIndices: number[];
}

/** A statement that cleared the consensus threshold in every cluster. */
export interface ConsensusStatement {
  statementId: string;
  /** For each cluster, the agreement percent (0–100). */
  clusterAgreement: Array<{ clusterId: number; agreePct: number }>;
  /** Minimum agree percent across all clusters. */
  minAgreePct: number;
}

/** Result of the divided-state check. */
export interface DividedState {
  /** True when no consensus statements exist AND clusters disagree sharply. */
  isDivided: boolean;
  /**
   * Optional statement that most sharply divides clusters — the one with the
   * highest variance in cluster agree-pcts. Null when there are no statements
   * or when isDivided is false.
   */
  sharpestDivide: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Encode agree/disagree/pass/missing to a number for k-means. */
const ANSWER_TO_NUM: Record<Answer, number> = {
  agree: 1,
  disagree: -1,
  pass: 0,
};

/** Minimum sessions required to attempt clustering. */
export const MIN_SESSIONS_TO_CLUSTER = 5;

/** Default number of clusters (k). */
export const DEFAULT_K = 3;

/** Maximum k-means iterations before stopping. */
const MAX_ITER = 100;

/** Consensus threshold: a statement must clear this agree-pct in every cluster. */
export const CONSENSUS_THRESHOLD = 60;

/**
 * Divided-state threshold: a statement contributes to the "divided" signal
 * when the max-minus-min cluster agree-pct exceeds this gap.
 */
const DIVIDED_GAP_THRESHOLD = 40;

// ---------------------------------------------------------------------------
// Numeric encoding
// ---------------------------------------------------------------------------

/**
 * Collect all statement ids that appear in at least one vector.
 * Returns them in a stable sorted order so encoding is deterministic.
 */
export function collectStatementIds(vectors: ResponseVector[]): string[] {
  const ids = new Set<string>();
  for (const v of vectors) {
    for (const k of Object.keys(v)) ids.add(k);
  }
  return [...ids].sort();
}

/**
 * Encode a ResponseVector as a number array in the order given by `statementIds`.
 * Missing answers are encoded as 0 (same as "pass").
 */
export function encodeVector(
  v: ResponseVector,
  statementIds: string[],
): number[] {
  return statementIds.map((id) => {
    const ans = v[id];
    if (ans === undefined) return 0;
    return ANSWER_TO_NUM[ans];
  });
}

// ---------------------------------------------------------------------------
// k-means helpers
// ---------------------------------------------------------------------------

/** Euclidean distance squared between two equal-length numeric arrays. */
function distSq(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return sum;
}

/** Return index of the nearest centroid to `point`. */
function nearestCentroid(point: number[], centroids: number[][]): number {
  let best = 0;
  let bestDist = distSq(point, centroids[0]);
  for (let i = 1; i < centroids.length; i++) {
    const d = distSq(point, centroids[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Recompute centroids as the mean of all assigned points.
 * Clusters with no assigned points keep their previous centroid
 * (degenerate case; callers should use k-means++ style init to minimize this).
 */
function recomputeCentroids(
  points: number[][],
  assignments: number[],
  k: number,
  dim: number,
  prevCentroids: number[][],
): number[][] {
  const sums: number[][] = Array.from({ length: k }, () =>
    new Array(dim).fill(0),
  );
  const counts: number[] = new Array(k).fill(0);

  for (let i = 0; i < points.length; i++) {
    const c = assignments[i];
    counts[c]++;
    for (let d = 0; d < dim; d++) sums[c][d] += points[i][d];
  }

  return sums.map((sum, ci) => {
    if (counts[ci] === 0) return prevCentroids[ci]; // keep previous
    return sum.map((s) => s / counts[ci]);
  });
}

/**
 * k-means++ initialization: choose first centroid uniformly at random,
 * then choose each subsequent one with probability proportional to
 * distance-squared from the nearest already-chosen centroid.
 *
 * Uses a simple seeded PRNG so results are deterministic given the same
 * input ordering. Seed is derived from the number of vectors.
 */
function kmeansppInit(points: number[][], k: number, seed: number): number[][] {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };

  const chosen: number[][] = [];
  // First centroid: random point
  chosen.push(points[Math.floor(rand() * points.length)]);

  for (let ci = 1; ci < k; ci++) {
    const dists = points.map((p) => {
      let minD = Infinity;
      for (const c of chosen) {
        const d = distSq(p, c);
        if (d < minD) minD = d;
      }
      return minD;
    });
    const total = dists.reduce((a, b) => a + b, 0);
    if (total === 0) {
      // All points are identical to existing centroids — just pick randomly
      chosen.push(points[Math.floor(rand() * points.length)]);
    } else {
      let r = rand() * total;
      let picked = points.length - 1;
      for (let i = 0; i < dists.length; i++) {
        r -= dists[i];
        if (r <= 0) {
          picked = i;
          break;
        }
      }
      chosen.push(points[picked]);
    }
  }

  return chosen;
}

// ---------------------------------------------------------------------------
// Main clustering function
// ---------------------------------------------------------------------------

/**
 * Cluster `vectors` into `k` groups by answer similarity.
 *
 * Returns null when there are fewer than MIN_SESSIONS_TO_CLUSTER vectors
 * (not enough data to cluster meaningfully).
 *
 * Algorithm: k-means with k-means++ initialization, up to MAX_ITER iterations.
 * Encoding: agree=1, disagree=-1, pass/missing=0.
 * Results are deterministic for a given input order (seed is fixed per run).
 */
export function clusterVectors(
  vectors: ResponseVector[],
  k: number = DEFAULT_K,
): Cluster[] | null {
  if (vectors.length < MIN_SESSIONS_TO_CLUSTER) return null;
  // Clamp k to the number of vectors (can't have more clusters than points)
  const effectiveK = Math.min(k, vectors.length);

  const statementIds = collectStatementIds(vectors);
  const dim = statementIds.length;

  if (dim === 0) return null; // no statements answered at all

  const encoded = vectors.map((v) => encodeVector(v, statementIds));

  // Initialize centroids via k-means++
  let centroids = kmeansppInit(encoded, effectiveK, vectors.length * 31 + dim);

  let assignments: number[] = new Array(encoded.length).fill(0);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Assignment step
    const newAssignments = encoded.map((p) => nearestCentroid(p, centroids));

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed && iter > 0) break;

    // Update step
    centroids = recomputeCentroids(
      encoded,
      assignments,
      effectiveK,
      dim,
      centroids,
    );
  }

  // Build Cluster objects
  const clusters: Cluster[] = centroids.map((centroid, ci) => ({
    id: ci,
    size: 0,
    centroid: Object.fromEntries(
      statementIds.map((id, d) => [id, centroid[d]]),
    ),
    memberIndices: [],
  }));

  for (let i = 0; i < assignments.length; i++) {
    const ci = assignments[i];
    clusters[ci].size++;
    clusters[ci].memberIndices.push(i);
  }

  return clusters;
}

// ---------------------------------------------------------------------------
// Consensus
// ---------------------------------------------------------------------------

/**
 * Find statements that cleared CONSENSUS_THRESHOLD agree-pct in EVERY cluster.
 *
 * "Agree percent" for a statement within a cluster = the fraction of that
 * cluster's members who answered "agree" on that statement (members who
 * answered "disagree", "pass", or did not answer all count against the
 * threshold). This is the strictest interpretation: "at least X% of the
 * cluster actively agreed."
 *
 * Returns an empty array when clusters is null/empty, or when no statement
 * clears the threshold in every cluster.
 */
export function findConsensusStatements(
  vectors: ResponseVector[],
  clusters: Cluster[] | null,
  threshold: number = CONSENSUS_THRESHOLD,
): ConsensusStatement[] {
  if (!clusters || clusters.length === 0) return [];

  const statementIds = collectStatementIds(vectors);
  const consensus: ConsensusStatement[] = [];

  for (const stmtId of statementIds) {
    const clusterAgreement: Array<{ clusterId: number; agreePct: number }> = [];
    let allClear = true;

    for (const cluster of clusters) {
      if (cluster.size === 0) {
        // Empty cluster: cannot clear threshold — no consensus possible
        allClear = false;
        break;
      }
      const agreeCount = cluster.memberIndices.reduce((acc, idx) => {
        return acc + (vectors[idx][stmtId] === "agree" ? 1 : 0);
      }, 0);
      const agreePct = Math.round((agreeCount / cluster.size) * 100);
      clusterAgreement.push({ clusterId: cluster.id, agreePct });
      if (agreePct < threshold) {
        allClear = false;
        break;
      }
    }

    if (allClear) {
      const minAgreePct = Math.min(
        ...clusterAgreement.map((ca) => ca.agreePct),
      );
      consensus.push({ statementId: stmtId, clusterAgreement, minAgreePct });
    }
  }

  // Sort by minAgreePct descending (strongest consensus first)
  return consensus.sort((a, b) => b.minAgreePct - a.minAgreePct);
}

// ---------------------------------------------------------------------------
// Divided state
// ---------------------------------------------------------------------------

/**
 * Detect whether the dataset is in a "divided" state: no consensus exists
 * AND at least one statement shows a large cluster-agreement gap.
 *
 * `isDivided = true` when:
 *   - There are no consensus statements AND
 *   - At least one statement has a max-minus-min cluster agree-pct gap
 *     exceeding DIVIDED_GAP_THRESHOLD (default 40pp).
 *
 * `sharpestDivide` is the statement with the highest inter-cluster variance.
 *
 * Returns isDivided=false when there are fewer than 2 clusters (no
 * inter-cluster comparison possible) or when vectors/clusters are empty.
 */
export function detectDividedState(
  vectors: ResponseVector[],
  clusters: Cluster[] | null,
  consensusStatements: ConsensusStatement[],
): DividedState {
  if (!clusters || clusters.length < 2 || vectors.length === 0) {
    return { isDivided: false, sharpestDivide: null };
  }

  // If consensus exists, the dataset is not divided
  if (consensusStatements.length > 0) {
    return { isDivided: false, sharpestDivide: null };
  }

  const statementIds = collectStatementIds(vectors);
  if (statementIds.length === 0) {
    return { isDivided: false, sharpestDivide: null };
  }

  // For each statement, compute agree-pct in each cluster and find the gap
  let sharpestGap = 0;
  let sharpestDivide: string | null = null;

  for (const stmtId of statementIds) {
    const agreePcts: number[] = clusters
      .filter((c) => c.size > 0)
      .map((cluster) => {
        const agreeCount = cluster.memberIndices.reduce((acc, idx) => {
          return acc + (vectors[idx][stmtId] === "agree" ? 1 : 0);
        }, 0);
        return Math.round((agreeCount / cluster.size) * 100);
      });

    if (agreePcts.length < 2) continue;

    const gap = Math.max(...agreePcts) - Math.min(...agreePcts);
    if (gap > sharpestGap) {
      sharpestGap = gap;
      sharpestDivide = stmtId;
    }
  }

  const isDivided = sharpestGap >= DIVIDED_GAP_THRESHOLD;
  return {
    isDivided,
    sharpestDivide: isDivided ? sharpestDivide : null,
  };
}
