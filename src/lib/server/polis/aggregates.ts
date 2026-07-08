/**
 * Polis aggregate helpers (Phase 8 — bars + bridges).
 *
 * Pure functions that take in-memory fixtures (so they can be unit-tested
 * without DB). Route handlers compose these on top of the existing Redis
 * counters or future per-session persistence.
 *
 * Rank-fidelity caveat (bars):
 *   The existing counter pipeline (`incrementSessionCounters`) records
 *   *confirmed concerns* per session — not ordered top-4 ranks. We treat
 *   every confirmed concern as a "ranked" theme for overlap purposes; this
 *   is generous but honest, and aligned with the only data the production
 *   counters currently expose. When per-session rank order lands (Phase 8b),
 *   `computeOverlapBars` can be tightened to filter sessions whose top-4
 *   includes the user theme.
 *
 * Privacy: outputs are counts/percentages only. NO user_id, session_id,
 * name, address, email, or other identity fields. Asserted via key-allowlist
 * tests in `aggregates.test.ts`.
 */

/* ── Public types ────────────────────────────────────────────── */

export interface SessionConcerns {
  concerns: string[];
}

export interface UserTheme {
  id: string;
  label: string;
}

export interface OverlapBar {
  themeId: string;
  theme: string;
  percent: number;
}

export interface ClusterAgreement {
  name: string;
  agreementPercent: number;
}

export interface StatementInput {
  statement: string;
  clusterAgreement: ClusterAgreement[];
}

export interface BridgeStatement {
  statement: string;
  clusters: ClusterAgreement[];
}

/* ── Constants ───────────────────────────────────────────────── */

/** Percentage threshold (inclusive) for a statement to qualify as a bridge. */
export const BRIDGE_THRESHOLD = 80;

/* ── Bars ────────────────────────────────────────────────────── */

/**
 * For each user theme, return the percentage of county sessions whose
 * confirmed concerns contain that theme.
 *
 * Caveat: we don't currently know each session's rank order; "contains the
 * theme" is the closest proxy and the most generous honest interpretation
 * (see file header).
 */
export function computeOverlapBars(
  sessions: SessionConcerns[],
  userThemes: UserTheme[],
): OverlapBar[] {
  const total = sessions.length;
  return userThemes.map((theme) => {
    if (total === 0) {
      return { themeId: theme.id, theme: theme.label, percent: 0 };
    }
    const hits = sessions.reduce(
      (acc, s) => acc + (s.concerns.includes(theme.id) ? 1 : 0),
      0,
    );
    const percent = Math.round((hits / total) * 100);
    return { themeId: theme.id, theme: theme.label, percent };
  });
}

/* ── Bridges ─────────────────────────────────────────────────── */

/**
 * Strict-inclusive 80% across every cluster. Returns false when the input
 * list is empty (no clusters to satisfy ⇒ not a bridge by convention; the
 * UI surfaces a separate "no_bridges_yet" sentinel).
 */
export function isBridgeStatement(clusterPercents: number[]): boolean {
  if (clusterPercents.length === 0) return false;
  return clusterPercents.every((p) => p >= BRIDGE_THRESHOLD);
}

/**
 * Filter a candidate-statement list down to the ones where every cluster
 * agreed at >= 80%. Output records are pruned to the contract shape.
 */
export function computeBridges(
  statements: StatementInput[],
): BridgeStatement[] {
  const bridges: BridgeStatement[] = [];
  for (const s of statements) {
    const percents = s.clusterAgreement.map((c) => c.agreementPercent);
    if (!isBridgeStatement(percents)) continue;
    bridges.push({
      statement: s.statement,
      clusters: s.clusterAgreement.map((c) => ({
        name: c.name,
        agreementPercent: c.agreementPercent,
      })),
    });
  }
  return bridges;
}

/**
 * The complement of `computeBridges`: statements that were actually scored
 * (at least one cluster has an agreement figure) but did NOT clear the
 * threshold in every cluster. This is the "where it split" honest-report
 * branch — never omit a statement just because it didn't bridge; surface it
 * distinctly instead. Output records use the same contract shape as
 * `computeBridges` (statement + per-cluster agreement) so the caller can
 * render a single population-level figure (e.g. the minimum) without ever
 * reintroducing party (D/R/I) grouping — clusters here are opinion clusters,
 * never party. A statement with no cluster data at all is excluded from both
 * lists (nothing to report either way).
 */
export function computeDivided(
  statements: StatementInput[],
): BridgeStatement[] {
  const divided: BridgeStatement[] = [];
  for (const s of statements) {
    if (s.clusterAgreement.length === 0) continue;
    const percents = s.clusterAgreement.map((c) => c.agreementPercent);
    if (isBridgeStatement(percents)) continue;
    divided.push({
      statement: s.statement,
      clusters: s.clusterAgreement.map((c) => ({
        name: c.name,
        agreementPercent: c.agreementPercent,
      })),
    });
  }
  return divided;
}
