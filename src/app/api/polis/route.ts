/**
 * GET /api/polis?stateCode=TX&county=Harris&userConcerns=healthcare_affordability,education_funding
 *
 * Returns the polis visualization aggregate:
 *  - scope and threshold status
 *  - synthetic dots (one per sample, colored by primary) from aggregate distribution
 *  - "you" dot projected into the same 2D space (or null)
 *  - consensus panel (top 5 issues by total count)
 *
 * Dimension reduction: simplified 2D projection using issue-share vectors.
 * Each primary's distribution is projected into 2D using the top-2 PCA components
 * via power iteration over the covariance of all primary issue-share vectors.
 *
 * If fewer than 2 distinct primaries have data, the projection falls back to
 * a cluster-by-primary layout with random jitter. This is invisible to the user
 * (the visual goal is clusters with overlap, not a specific eigenvector meaning).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  fetchPolisAggregate,
  type PolisAggregate,
} from "../../../lib/server/counters";
import { getIssueLabel } from "../../../lib/canonicalIssues";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PolisResponse {
  scope: "county" | "state";
  sampleSize: number;
  thresholdMet: boolean;
  countToUnlock?: number;
  dots: Array<{ x: number; y: number; primary: string }>;
  you: { x: number; y: number } | null;
  consensus: Array<{
    canonicalIssue: string;
    issueLabel: string;
    percent: number;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THRESHOLD = 200;
const MAX_DOTS_PER_PRIMARY = 200;
const MIN_DOTS_PER_PRIMARY = 30;

// Primary cluster centers for the fallback layout (when PCA cannot be computed).
// These positions are chosen so DEM/REP overlap partially, and OPEN/GENERAL bridge.
const FALLBACK_CENTERS: Record<string, [number, number]> = {
  DEM: [-0.6, 0.2],
  REP: [0.6, -0.2],
  OPEN: [0.0, 0.3],
  GENERAL: [0.0, -0.3],
};

// ---------------------------------------------------------------------------
// Math utilities (no external deps)
// ---------------------------------------------------------------------------

/** Dot product of two vectors. */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Scale a vector by a scalar. */
function scale(v: number[], s: number): number[] {
  return v.map((x) => x * s);
}

/** Subtract two vectors. */
function sub(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - b[i]);
}

/** L2 norm. */
function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

/** Normalize a vector. Returns zero vector if norm is ~0. */
function normalize(v: number[]): number[] {
  const n = norm(v);
  return n < 1e-10 ? v.map(() => 0) : scale(v, 1 / n);
}

/** Matrix-vector product: A is rows×cols matrix (row-major), v is cols-length. */
function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => dot(row, v));
}

/**
 * Power iteration to find the dominant eigenvector of a symmetric matrix.
 * Returns the eigenvector after up to `maxIter` iterations.
 */
function powerIteration(A: number[][], maxIter = 50): number[] {
  const n = A.length;
  let v = Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0.1 * (i + 1)));
  v = normalize(v);
  for (let iter = 0; iter < maxIter; iter++) {
    const w = matVec(A, v);
    const wn = normalize(w);
    // Converged?
    const diff = norm(sub(wn, v));
    v = wn;
    if (diff < 1e-6) break;
  }
  return v;
}

/**
 * Build the covariance matrix of a set of row vectors (each row = one observation).
 * Returns a (cols × cols) symmetric matrix.
 */
function covarianceMatrix(rows: number[][]): number[][] {
  const n = rows.length;
  const d = rows[0].length;
  const means = Array.from(
    { length: d },
    (_, j) => rows.reduce((s, r) => s + r[j], 0) / n,
  );
  const centered = rows.map((r) => r.map((x, j) => x - means[j]));
  // Cov = (1/(n-1)) * centered^T * centered
  const cov: number[][] = Array.from({ length: d }, () =>
    new Array<number>(d).fill(0),
  );
  for (const row of centered) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += row[i] * row[j];
      }
    }
  }
  const factor = n > 1 ? n - 1 : 1;
  for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] /= factor;
  return cov;
}

/**
 * Deflate: subtract the rank-1 component of v from matrix A.
 * Used to find the second eigenvector after finding the first.
 */
function deflate(A: number[][], v: number[], eigenvalue: number): number[][] {
  return A.map((row, i) => row.map((val, j) => val - eigenvalue * v[i] * v[j]));
}

/**
 * Compute top-2 PCA components of the given row matrix.
 * Returns [pc1, pc2] as unit vectors, or null if matrix is too small.
 */
function pca2(rows: number[][]): [number[], number[]] | null {
  if (rows.length < 2 || rows[0].length < 2) return null;

  const cov = covarianceMatrix(rows);
  const pc1 = powerIteration(cov);
  const lambda1 = dot(pc1, matVec(cov, pc1));
  const cov2 = deflate(cov, pc1, lambda1);
  const pc2 = powerIteration(cov2);

  // Sanity: if both components are nearly zero, projection is degenerate
  if (norm(pc1) < 0.01 || norm(pc2) < 0.01) return null;

  return [pc1, pc2];
}

// ---------------------------------------------------------------------------
// Seeded pseudo-random (for deterministic dot placement on the same aggregate)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// Dot generation
// ---------------------------------------------------------------------------

/**
 * Build issue-share vectors per primary from aggregate data.
 * Each vector has one entry per canonical issue, normalized to sum=1.
 */
function buildIssueShareVectors(
  agg: PolisAggregate,
): Map<string, { vector: number[]; issues: string[] }> {
  // Collect all canonical issues
  const issueSet = new Set<string>();
  for (const ic of agg.issueCounts) issueSet.add(ic.canonicalIssue);
  const issues = Array.from(issueSet).sort();

  if (issues.length === 0) return new Map();

  const result = new Map<string, { vector: number[]; issues: string[] }>();

  for (const pt of agg.primaryTotals) {
    if (pt.count === 0) continue;
    const vec = issues.map((issue) => {
      const entry = agg.issueCounts.find(
        (ic) => ic.canonicalIssue === issue && ic.primary === pt.primary,
      );
      return entry ? entry.count / pt.count : 0;
    });
    result.set(pt.primary, { vector: vec, issues });
  }

  return result;
}

/**
 * Project primaries into 2D. Uses PCA when possible, falls back to
 * fixed cluster centers with primary-specific offsets when not.
 *
 * Returns per-primary center coordinates in [-1, 1]^2 space.
 */
function projectPrimaries(agg: PolisAggregate): Map<string, [number, number]> {
  const shareVectors = buildIssueShareVectors(agg);
  const primariesWithData = Array.from(shareVectors.keys());

  // Need at least 2 primaries with issue data and at least 2 issues to attempt PCA
  const firstVectorEntry = Array.from(shareVectors.values())[0];
  const issueCount = firstVectorEntry?.vector.length ?? 0;
  if (primariesWithData.length >= 2 && issueCount >= 2) {
    const rows = primariesWithData.map((p) => shareVectors.get(p)!.vector);
    const pcaResult = pca2(rows);

    if (pcaResult) {
      const [pc1, pc2] = pcaResult;
      const projections = new Map<string, [number, number]>();

      // Project each primary's share vector onto (pc1, pc2)
      const rawCoords = primariesWithData.map((p) => {
        const { vector } = shareVectors.get(p)!;
        return { primary: p, x: dot(vector, pc1), y: dot(vector, pc2) };
      });

      // Normalize to [-1, 1]
      const xs = rawCoords.map((c) => c.x);
      const ys = rawCoords.map((c) => c.y);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);
      const xRange = xMax - xMin || 1;
      const yRange = yMax - yMin || 1;

      for (const { primary, x, y } of rawCoords) {
        projections.set(primary, [
          ((x - xMin) / xRange) * 2 - 1,
          ((y - yMin) / yRange) * 2 - 1,
        ]);
      }
      return projections;
    }
  }

  // Fallback: fixed cluster positions
  const fallback = new Map<string, [number, number]>();
  for (const p of primariesWithData) {
    fallback.set(p, FALLBACK_CENTERS[p] ?? [0, 0]);
  }
  return fallback;
}

/**
 * Generate synthetic dots from the primary projections.
 * Dots are scattered around each primary's center using Gaussian-like jitter.
 *
 * Up to MAX_DOTS_PER_PRIMARY per primary, scaled by sample share.
 * Minimum MIN_DOTS_PER_PRIMARY per primary if represented at all.
 */
function generateDots(
  agg: PolisAggregate,
  centers: Map<string, [number, number]>,
): Array<{ x: number; y: number; primary: string }> {
  const totalSessions = agg.primaryTotals.reduce((s, pt) => s + pt.count, 0);
  if (totalSessions === 0) return [];

  const rand = seededRandom(agg.sampleSize * 31 + agg.primaryTotals.length);

  const dots: Array<{ x: number; y: number; primary: string }> = [];

  for (const pt of agg.primaryTotals) {
    if (pt.count === 0) continue;
    const center = centers.get(pt.primary);
    if (!center) continue;

    // Scale dot count by share, clamp to [MIN, MAX]
    const share = pt.count / totalSessions;
    const rawCount = Math.round(
      share * MAX_DOTS_PER_PRIMARY * agg.primaryTotals.length,
    );
    const dotCount = Math.max(
      MIN_DOTS_PER_PRIMARY,
      Math.min(MAX_DOTS_PER_PRIMARY, rawCount),
    );

    // Jitter: Box-Muller approximation using uniform random pairs
    for (let i = 0; i < dotCount; i++) {
      const u1 = rand();
      const u2 = rand();
      // Box-Muller: uniform → ~normal
      const mag = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10)));
      const theta = 2 * Math.PI * u2;
      const nx = mag * Math.cos(theta);
      const ny = mag * Math.sin(theta);

      // Jitter spread: 0.25 in normalized space
      const spread = 0.25;
      const x = Math.max(-1, Math.min(1, center[0] + nx * spread));
      const y = Math.max(-1, Math.min(1, center[1] + ny * spread));

      dots.push({
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000,
        primary: pt.primary,
      });
    }
  }

  return dots;
}

/**
 * Project the "you" dot into the same 2D space.
 *
 * Projects the user's confirmed concerns as a share vector over the same issue
 * basis used for the primary projections, then maps it using the same PCA
 * components (or fallback).
 *
 * Returns null when userConcerns is empty (voter skipped Act 2).
 */
function projectYou(
  userConcerns: string[],
  agg: PolisAggregate,
  centers: Map<string, [number, number]>,
): { x: number; y: number } | null {
  if (userConcerns.length === 0) return null;

  const shareVectors = buildIssueShareVectors(agg);
  if (shareVectors.size === 0) return null;

  // Build the issue basis from the first primary's vector
  const firstEntry = Array.from(shareVectors.values())[0];
  if (!firstEntry) return null;

  // Re-derive issue list (same sort as buildIssueShareVectors)
  const issueSet = new Set<string>();
  for (const ic of agg.issueCounts) issueSet.add(ic.canonicalIssue);
  const issues = Array.from(issueSet).sort();

  if (issues.length === 0) return null;

  // Build user share vector
  const userVec = issues.map((issue) =>
    userConcerns.includes(issue) ? 1 / userConcerns.length : 0,
  );

  // Try to recompute PCA components
  const primariesWithData = Array.from(shareVectors.keys());
  let youX = 0;
  let youY = 0;

  if (primariesWithData.length >= 2) {
    const rows = primariesWithData.map((p) => shareVectors.get(p)!.vector);
    const pcaResult = pca2(rows);

    if (pcaResult) {
      const [pc1, pc2] = pcaResult;
      // Project user vec
      const rawX = dot(userVec, pc1);
      const rawY = dot(userVec, pc2);

      // Use same normalization: derive from primary projections
      // (we re-project all primaries to get xMin/xMax/yMin/yMax)
      const rawCoords = primariesWithData.map((p) => ({
        x: dot(shareVectors.get(p)!.vector, pc1),
        y: dot(shareVectors.get(p)!.vector, pc2),
      }));
      const xs = rawCoords.map((c) => c.x);
      const ys = rawCoords.map((c) => c.y);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);
      const xRange = xMax - xMin || 1;
      const yRange = yMax - yMin || 1;

      youX = ((rawX - xMin) / xRange) * 2 - 1;
      youY = ((rawY - yMin) / yRange) * 2 - 1;

      // Clamp to slightly beyond the scatter to allow "you" to sit in overlap zone
      youX = Math.max(-1.3, Math.min(1.3, youX));
      youY = Math.max(-1.3, Math.min(1.3, youY));

      return {
        x: Math.round(youX * 1000) / 1000,
        y: Math.round(youY * 1000) / 1000,
      };
    }
  }

  // Fallback: find the closest primary center to the user's issue profile
  // (match by which primary has the most overlap with user's concerns)
  let bestPrimary = "DEM";
  let bestOverlap = -1;
  for (const [primary, { vector }] of shareVectors) {
    const overlap = dot(userVec, vector);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestPrimary = primary;
    }
  }
  const center = centers.get(bestPrimary) ?? [0, 0];
  return {
    x: Math.round(center[0] * 1000) / 1000,
    y: Math.round(center[1] * 1000) / 1000,
  };
}

// ---------------------------------------------------------------------------
// Consensus panel
// ---------------------------------------------------------------------------

interface ConsensusItem {
  canonicalIssue: string;
  issueLabel: string;
  percent: number;
}

function computeConsensus(agg: PolisAggregate): ConsensusItem[] {
  const totalSessions = agg.primaryTotals.reduce((s, pt) => s + pt.count, 0);
  if (totalSessions === 0) return [];

  // Sum issue counts across all primaries
  const issueTotals = new Map<string, number>();
  for (const ic of agg.issueCounts) {
    issueTotals.set(
      ic.canonicalIssue,
      (issueTotals.get(ic.canonicalIssue) ?? 0) + ic.count,
    );
  }

  // Sort by total count descending, take top 5
  return Array.from(issueTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([canonicalIssue, count]) => ({
      canonicalIssue,
      issueLabel: getIssueLabel(canonicalIssue),
      percent: Math.round((count / totalSessions) * 100),
    }));
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const stateCode =
    searchParams.get("stateCode")?.toUpperCase().slice(0, 4) ?? "";
  const county = searchParams.get("county")?.slice(0, 64) ?? null;
  const userConcernsParam = searchParams.get("userConcerns") ?? "";

  if (!stateCode) {
    return NextResponse.json(
      { error: "stateCode is required." },
      { status: 400 },
    );
  }

  const userConcerns = userConcernsParam
    ? userConcernsParam
        .split(",")
        .map((s) => s.trim().slice(0, 64))
        .filter(Boolean)
    : [];

  const agg = await fetchPolisAggregate(stateCode, county || null);

  const centers = projectPrimaries(agg);
  const dots = generateDots(agg, centers);
  const you = projectYou(userConcerns, agg, centers);
  const consensus = computeConsensus(agg);

  const response: PolisResponse = {
    scope: agg.scope,
    sampleSize: agg.sampleSize,
    thresholdMet: agg.thresholdMet,
    dots,
    you,
    consensus,
  };

  if (!agg.thresholdMet) {
    response.countToUnlock = Math.max(0, THRESHOLD - agg.sampleSize);
  }

  return NextResponse.json(response, { status: 200 });
}
