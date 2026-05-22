/**
 * Cluster naming + threshold gating for the polis compass (Phase 8).
 *
 * Cluster labels NEVER contain partisan strings ("Democrat," "Republican,"
 * "Independent," "DEM," "REP," etc.) — the redesign explicitly rejects party
 * labels and groups by shared priorities instead. Asserted via tests in
 * `clusters.test.ts`.
 *
 * "Unaligned" is a real cluster (~12-15% typical) — not forced. It only
 * appears in compass output when the data shows ≥10% unaligned share.
 *
 * Compass renders only when the in-county finished-session count is at
 * or above `POLIS_COMPASS_THRESHOLD` (env-overridable; default 150). In v1
 * the compass endpoint always returns `below_threshold` until per-session
 * persistence + offline PCA accumulate enough data to cluster meaningfully.
 */

/* ── Cluster vocabulary (v1) ─────────────────────────────────── */

/**
 * v1 named-cluster vocabulary. Curated to describe shared priorities, NOT
 * party affiliation. "Unaligned" is included as a labeled cluster (not a
 * residue) — see Phase 8 packet "Unaligned is real."
 *
 * Re-labeling lives in code as a single source of truth; any future
 * data-driven re-labeling must continue to fail the partisan regex.
 */
export const CLUSTER_LABELS = [
  "Service-first progressives",
  "Pocketbook moderates",
  "Civic libertarians",
  "Unaligned",
] as const;

export type ClusterLabel = (typeof CLUSTER_LABELS)[number];

/* ── Partisan-label guard ────────────────────────────────────── */

const PARTISAN_REGEX = /democrat|republican|independent|\bdem\b|\brep\b/i;

/** Returns true iff the given label string matches the partisan regex. */
export function isPartisanLabel(label: string): boolean {
  return PARTISAN_REGEX.test(label);
}

/* ── Unaligned-not-forced ────────────────────────────────────── */

export interface ClusterShare {
  name: string;
  percent: number;
}

/**
 * Minimum percent at which the "Unaligned" cluster is preserved in compass
 * output. Below this, the cluster is dropped so we don't show a meaningless
 * trace cluster.
 */
const UNALIGNED_MIN_PERCENT = 10;

/**
 * Strip an emergent Unaligned cluster from compass output when its share is
 * below the minimum. Leaves all non-Unaligned clusters untouched.
 */
export function emergeUnalignedCluster(
  clusters: ClusterShare[],
): ClusterShare[] {
  return clusters.filter((c) => {
    if (c.name !== "Unaligned") return true;
    return c.percent >= UNALIGNED_MIN_PERCENT;
  });
}

/* ── Compass threshold gating ────────────────────────────────── */

export const DEFAULT_COMPASS_THRESHOLD = 150;

/**
 * Resolve the compass threshold from an environment variable string, falling
 * back to `DEFAULT_COMPASS_THRESHOLD` whenever the value is missing,
 * non-numeric, or non-positive.
 */
export function resolveCompassThreshold(rawEnv: string | undefined): number {
  if (rawEnv === undefined || rawEnv === "") return DEFAULT_COMPASS_THRESHOLD;
  const n = Number(rawEnv);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_COMPASS_THRESHOLD;
  return Math.floor(n);
}

/** True iff in-county session count meets the compass threshold. */
export function shouldShowCompass(count: number, threshold: number): boolean {
  return count >= threshold;
}
