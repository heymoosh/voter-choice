/**
 * src/lib/polis/pca.ts
 *
 * PURE numerics for the pol.is-style opinion MAP (Phase 8b).
 *
 * Pol.is projects everyone's agree/disagree votes onto their first two
 * principal components, so voters who answered alike sit together and the
 * distinct opinion groups spread across a 2-D landscape. This module is the
 * hand-rolled linear-algebra + assembly that produces that map — no npm deps,
 * no DB, no network.
 *
 * Pipeline (all deterministic):
 *   1. Encode each response vector (agree=+1 / disagree=-1 / pass|missing=0)
 *      over the union of statement ids — reuses `clustering.ts`'s encoder.
 *   2. Compute the top-2 principal components of the M×M covariance
 *      (M = statement count, small) via power iteration + deflation. Each
 *      eigenvector's sign is fixed by a stable rule (largest-magnitude
 *      component forced positive) so the projection is reproducible.
 *   3. Project every session onto PC1/PC2, normalize to a stable display
 *      range (x in [4,96], y compressed ~0.82 like the design's pmDots).
 *   4. Overlay k-means membership (reuse `clustering.ts` — same encoding) for
 *      the soft cluster blobs + per-dot colour, labelled Group A/B/C by size.
 *
 * Party-free (DECISION #116): clusters are opinion groups by ANSWER
 * SIMILARITY, never party. The output carries positions, counts, and neutral
 * cluster ids ONLY — never a session token, party, name, or raw response.
 */

import {
  clusterVectors,
  collectStatementIds,
  encodeVector,
  DEFAULT_K,
  MIN_SESSIONS_TO_CLUSTER,
  type ResponseVector,
} from "./clustering";

export type { ResponseVector } from "./clustering";

// ---------------------------------------------------------------------------
// Display + gating constants
// ---------------------------------------------------------------------------

/** Padding (in display units) kept clear of the map edges on the x axis. */
const X_PAD = 4;
/** Padding on the y axis before the vertical compression is applied. */
const Y_PAD = 4;
/** Vertical squash so dots never crowd the top/bottom edge (design's pmDots). */
const Y_COMPRESS = 0.82;
/** Power-iteration steps — plenty for a tiny (M<=~30) symmetric covariance. */
const POWER_ITERS = 200;

/**
 * Separation gate. We refuse to draw 3 distinct blobs unless the clusters
 * genuinely pull apart in the projected space: the closest pair of cluster
 * centroids must sit at least this many display units apart AND be farther
 * apart than the clusters are internally wide. Uniform data (one real cloud)
 * fails this and the caller falls back to the honest single-cloud state.
 */
const MIN_CENTROID_SEP = 12;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** One session's dot: display position + its opinion-group id (0-based). */
export interface ClusterMapDot {
  x: number;
  y: number;
  cluster: number;
}

/** A soft opinion-group field for the map. `label` is neutral ("Group A"). */
export interface ClusterMapGroup {
  id: number;
  label: string;
  /** Share of sessions in this group (0–100, rounded). */
  sharePercent: number;
  /** Group centroid in display space. */
  cx: number;
  cy: number;
  /** Group radius (display units) for the soft blob. */
  spread: number;
}

/** The assembled opinion map — positions + counts + neutral ids ONLY. */
export interface ClusterMap {
  dots: ClusterMapDot[];
  clusters: ClusterMapGroup[];
  /** The current voter, projected into the SAME space. Null when unavailable. */
  you: { x: number; y: number; cluster: number } | null;
}

// ---------------------------------------------------------------------------
// Vector / matrix helpers (small, self-contained)
// ---------------------------------------------------------------------------

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

function normalize(v: number[]): number[] {
  const n = norm(v);
  if (n === 0) return v.slice();
  return v.map((x) => x / n);
}

/** Column means of an N×M matrix. */
function columnMeans(rows: number[][], dim: number): number[] {
  const mean = new Array(dim).fill(0);
  for (const r of rows) for (let j = 0; j < dim; j++) mean[j] += r[j];
  const n = rows.length || 1;
  return mean.map((s) => s / n);
}

/** Covariance C = (1/N) · Xcᵀ·Xc for already-centered rows. Symmetric M×M. */
function covariance(centered: number[][], dim: number): number[][] {
  const c: number[][] = Array.from({ length: dim }, () =>
    new Array(dim).fill(0),
  );
  for (const row of centered) {
    for (let i = 0; i < dim; i++) {
      const ri = row[i];
      if (ri === 0) continue;
      for (let j = i; j < dim; j++) {
        c[i][j] += ri * row[j];
      }
    }
  }
  const n = centered.length || 1;
  for (let i = 0; i < dim; i++) {
    for (let j = i; j < dim; j++) {
      c[i][j] /= n;
      c[j][i] = c[i][j];
    }
  }
  return c;
}

/** Symmetric matrix × vector. */
function matVec(mat: number[][], v: number[]): number[] {
  const out = new Array(mat.length).fill(0);
  for (let i = 0; i < mat.length; i++) out[i] = dot(mat[i], v);
  return out;
}

/**
 * A deterministic, non-degenerate starting vector for power iteration. A
 * uniform vector can be orthogonal to the leading eigenvector; cos(i+1) gives a
 * varied but fixed seed so results are fully reproducible.
 */
function seedVector(dim: number): number[] {
  return normalize(
    Array.from({ length: dim }, (_, i) => Math.cos(i + 1) + 1.3),
  );
}

/**
 * Leading eigenvector/value of a symmetric matrix via power iteration.
 * Deterministic: fixed seed vector, fixed iteration count.
 */
function topEigen(mat: number[][]): { vector: number[]; value: number } {
  const dim = mat.length;
  let v = seedVector(dim);
  for (let it = 0; it < POWER_ITERS; it++) {
    const w = matVec(mat, v);
    const n = norm(w);
    if (n === 0) return { vector: v, value: 0 }; // null-space: value 0
    v = w.map((x) => x / n);
  }
  const value = dot(v, matVec(mat, v)); // Rayleigh quotient
  return { vector: v, value };
}

/** Deflate a symmetric matrix by a known eigenpair: M' = M − λ·vvᵀ. */
function deflate(mat: number[][], value: number, v: number[]): number[][] {
  const dim = mat.length;
  const out = mat.map((row) => row.slice());
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      out[i][j] -= value * v[i] * v[j];
    }
  }
  return out;
}

/**
 * Fix an eigenvector's sign deterministically: force the largest-magnitude
 * component positive (ties → lower index). Makes the projection reproducible
 * regardless of power-iteration's arbitrary sign.
 */
function fixSign(v: number[]): number[] {
  let idx = 0;
  let best = -1;
  for (let i = 0; i < v.length; i++) {
    const m = Math.abs(v[i]);
    if (m > best) {
      best = m;
      idx = i;
    }
  }
  return v[idx] < 0 ? v.map((x) => -x) : v.slice();
}

// ---------------------------------------------------------------------------
// PCA (exported for unit testing)
// ---------------------------------------------------------------------------

export interface Pca2D {
  mean: number[];
  pc1: number[];
  pc2: number[];
}

/**
 * Top-2 principal components of an N×M matrix. When M < 2 the second
 * component is a zero vector (a 1-D dataset has no second axis).
 */
export function principalComponents2D(rows: number[][]): Pca2D {
  const dim = rows[0]?.length ?? 0;
  const mean = columnMeans(rows, dim);
  const centered = rows.map((r) => r.map((x, j) => x - mean[j]));
  const cov = covariance(centered, dim);

  const first = topEigen(cov);
  const pc1 = fixSign(first.vector);

  let pc2 = new Array(dim).fill(0);
  if (dim >= 2) {
    const deflated = deflate(cov, first.value, pc1);
    pc2 = fixSign(topEigen(deflated).vector);
  }

  return { mean, pc1, pc2 };
}

/** Project a raw encoded vector onto PC1/PC2 → unnormalized scores. */
export function projectOnto(
  vec: number[],
  pca: Pca2D,
): { x: number; y: number } {
  const centered = vec.map((x, j) => x - pca.mean[j]);
  return { x: dot(centered, pca.pc1), y: dot(centered, pca.pc2) };
}

// ---------------------------------------------------------------------------
// Normalization to display space
// ---------------------------------------------------------------------------

interface AxisScale {
  min: number;
  span: number;
}

function axisScale(values: number[]): AxisScale {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return { min, span: span > 1e-9 ? span : 1 };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/** Map a raw x score to display units [X_PAD, 100−X_PAD]. */
function normX(v: number, sx: AxisScale): number {
  return X_PAD + ((v - sx.min) / sx.span) * (100 - 2 * X_PAD);
}

/** Map a raw y score to [Y_PAD, 100−Y_PAD] then compress ~0.82 around 50. */
function normY(v: number, sy: AxisScale): number {
  const spread = Y_PAD + ((v - sy.min) / sy.span) * (100 - 2 * Y_PAD);
  return 50 + (spread - 50) * Y_COMPRESS;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const GROUP_LABELS = ["Group A", "Group B", "Group C", "Group D", "Group E"];

function euclid(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Assemble the opinion map from de-identified response vectors.
 *
 * Returns null (→ caller falls back to the honest single-cloud / low-N state)
 * when there are too few sessions, fewer than 2 statements (no 2-D map), or the
 * clusters don't meaningfully separate (don't fabricate 3 blobs from one real
 * cloud of uniform opinion).
 *
 * @param vectors    de-identified response vectors (caller loads from DB).
 * @param youVector  the current voter's own responses, projected into the SAME
 *                   PCA space + assigned its nearest cluster. Omit/undefined
 *                   when unavailable (e.g. the endpoint has no per-session
 *                   vector) → `you` is null and the FE omits the marker.
 * @param k          number of opinion groups (default DEFAULT_K = 3).
 */
export function assembleClusterMap(
  vectors: ResponseVector[],
  youVector?: ResponseVector,
  k: number = DEFAULT_K,
): ClusterMap | null {
  if (vectors.length < MIN_SESSIONS_TO_CLUSTER) return null;

  const statementIds = collectStatementIds(vectors);
  if (statementIds.length < 2) return null; // need ≥2 axes for a 2-D map

  const encoded = vectors.map((v) => encodeVector(v, statementIds));

  // --- PCA projection -----------------------------------------------------
  const pca = principalComponents2D(encoded);
  const scores = encoded.map((e) => projectOnto(e, pca));

  const sx = axisScale(scores.map((s) => s.x));
  const sy = axisScale(scores.map((s) => s.y));
  const positions = scores.map((s) => ({
    x: normX(s.x, sx),
    y: normY(s.y, sy),
  }));

  // --- k-means membership -------------------------------------------------
  const rawClusters = clusterVectors(vectors, k);
  if (!rawClusters) return null;

  const nonEmpty = rawClusters
    .filter((c) => c.size > 0)
    .sort((a, b) => b.size - a.size);
  if (nonEmpty.length < 2) return null; // one real group → single cloud

  // Size-desc remap: k-means index → 0-based display id (0 = largest = "A").
  const displayId = new Map<number, number>();
  nonEmpty.forEach((c, i) => displayId.set(c.id, i));

  // Per-cluster centroid + spread in DISPLAY space.
  const groups: ClusterMapGroup[] = nonEmpty.map((c, i) => {
    const pts = c.memberIndices.map((idx) => positions[idx]);
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const rms =
      Math.sqrt(
        pts.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) /
          pts.length,
      ) || 0;
    return {
      id: i,
      label: GROUP_LABELS[i] ?? `Group ${i + 1}`,
      sharePercent: Math.round((c.size / vectors.length) * 100),
      cx: round1(cx),
      cy: round1(cy),
      spread: round1(clamp(rms * 1.5, 9, 20)),
    };
  });

  // --- separation gate ----------------------------------------------------
  let minSep = Infinity;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      minSep = Math.min(
        minSep,
        euclid(groups[i].cx, groups[i].cy, groups[j].cx, groups[j].cy),
      );
    }
  }
  const avgWidth = groups.reduce((s, g) => s + g.spread, 0) / groups.length;
  if (minSep < MIN_CENTROID_SEP || minSep < avgWidth) return null;

  // --- dots ---------------------------------------------------------------
  const clusterByIndex = new Array(vectors.length).fill(0);
  for (const c of nonEmpty) {
    const id = displayId.get(c.id) ?? 0;
    for (const idx of c.memberIndices) clusterByIndex[idx] = id;
  }
  const dots: ClusterMapDot[] = positions.map((p, i) => ({
    x: round1(p.x),
    y: round1(p.y),
    cluster: clusterByIndex[i],
  }));

  // --- you ----------------------------------------------------------------
  let you: ClusterMap["you"] = null;
  if (youVector) {
    const yEnc = encodeVector(youVector, statementIds);
    const yScore = projectOnto(yEnc, pca);
    const yx = clamp(normX(yScore.x, sx), X_PAD, 100 - X_PAD);
    const yy = clamp(normY(yScore.y, sy), 0, 100);
    // Nearest opinion group by encoded-space distance to its k-means centroid.
    let nearest = nonEmpty[0];
    let best = Infinity;
    for (const c of nonEmpty) {
      const cen = statementIds.map((id) => c.centroid[id] ?? 0);
      let d = 0;
      for (let j = 0; j < cen.length; j++) d += (yEnc[j] - cen[j]) ** 2;
      if (d < best) {
        best = d;
        nearest = c;
      }
    }
    you = {
      x: round1(yx),
      y: round1(yy),
      cluster: displayId.get(nearest.id) ?? 0,
    };
  }

  return { dots, clusters: groups, you };
}
