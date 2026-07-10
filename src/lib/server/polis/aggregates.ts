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

export interface DividedStatement {
  statement: string;
  agreePercent: number;
  disagreePercent: number;
}

/* ── Constants ───────────────────────────────────────────────── */

/** Percentage threshold (inclusive) for a statement to qualify as a bridge. */
export const BRIDGE_THRESHOLD = 80;

/**
 * Minimum population share (inclusive) each side needs for a statement to
 * read as genuinely contested, rather than merely low-signal. A statement
 * almost nobody weighed in on either way isn't "divided" — it's unanswered.
 */
export const DIVIDED_MIN_SHARE = 30;

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

/* ── Divided ─────────────────────────────────────────────────── */

/**
 * A statement is genuinely divided when both agreement and disagreement
 * clear DIVIDED_MIN_SHARE — real mass on both sides, not a runaway majority
 * (that's a bridge candidate instead) and not silence (a statement nobody
 * answered isn't a "split").
 */
export function isDividedStatement(
  agreePercent: number,
  disagreePercent: number,
): boolean {
  return (
    agreePercent >= DIVIDED_MIN_SHARE && disagreePercent >= DIVIDED_MIN_SHARE
  );
}

/**
 * Filter a candidate-statement list down to the ones with a genuine
 * population-wide split. Output records are pruned to the contract shape.
 */
export function computeDivided(
  statements: DividedStatement[],
): DividedStatement[] {
  return statements
    .filter((s) => isDividedStatement(s.agreePercent, s.disagreePercent))
    .map((s) => ({
      statement: s.statement,
      agreePercent: s.agreePercent,
      disagreePercent: s.disagreePercent,
    }));
}
