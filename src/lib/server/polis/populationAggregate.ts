/**
 * Population-level Polis aggregation (Phase 8 — real bridges/divided).
 *
 * Tallies agree/disagree/pass PER STATEMENT across every stored response
 * vector as one population — no k-means cluster split, no D/R/I party
 * breakdown. This matches the approved design decision (card e2455f56,
 * 2026-07-07): keep the existing party-free product decision, threshold at
 * the population level. SELECTION (which statements qualify as bridge/divided)
 * stays strictly population-level.
 *
 * On top of that population selection we attach DISPLAY-ONLY per-opinion-group
 * agreement (`clusterAgreement`) to each selected statement, reusing the SAME
 * k-means opinion clusters the opinion MAP renders (`assembleClusterMap` from
 * `../../polis/pca` — same response vectors, same run, same Group A/B/C
 * size-desc labelling). This does NOT change selection; it only annotates how
 * each group broke down, so the report can draw convergence dots + colored
 * group chips. When the population is too thin / unseparated to cluster (the
 * map's own fallback guard), the enrichment is omitted and only the population
 * figure is shown — we never fabricate group values.
 *
 * `tallyPopulationResponses` / `computePopulationAggregate` are pure and
 * unit-tested against synthetic in-memory rows. `fetchPopulationAggregate`
 * is the thin DB-querying wrapper the route handlers call.
 *
 * Percent convention mirrors `clustering.ts`'s per-cluster agreement: percent
 * = count / total rows (the whole population), not count / answers-for-that-
 * statement. A statement most people skipped counts against agreement (and
 * against disagreement) the same way an explicit "pass" does — this keeps a
 * statement almost nobody answered from misreading as consensus.
 *
 * Privacy: outputs are statement ids + percentages only. NO session_token,
 * state_code, or other per-row field ever leaves this module.
 */

import { getDb, DB_NOT_CONFIGURED } from "../../../../db/client";
import { polisResponseVectors } from "../../../../db/schema";
import {
  computeBridges,
  computeDivided,
  type BridgeStatement,
  type ClusterAgreementRecord,
  type DividedStatement,
  type StatementInput,
} from "./aggregates";
import { assembleClusterMap } from "../../polis/pca";
import type { ResponseVector } from "../../polis/clustering";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A voter's answer to one Polis statement (mirrors polis_response_vectors.responses). */
export type PolisAnswer = "agree" | "disagree" | "pass";

/** One de-identified row's `responses` column: statementId -> answer. */
export type PolisResponseRow = Record<string, PolisAnswer>;

export interface PopulationTally {
  statement: string;
  agreePercent: number;
  disagreePercent: number;
  passPercent: number;
}

export interface PopulationAggregateResult {
  /** Total response-vector rows tallied. */
  count: number;
  bridges: BridgeStatement[];
  divided: DividedStatement[];
}

// ---------------------------------------------------------------------------
// Pure tally + composition (unit-tested against synthetic rows, no DB)
// ---------------------------------------------------------------------------

/**
 * Tally agree/disagree/pass per statement across every response row.
 * Returns one entry per statement id that appears in at least one row,
 * sorted by statement id for deterministic output.
 */
export function tallyPopulationResponses(
  rows: PolisResponseRow[],
): PopulationTally[] {
  const total = rows.length;
  if (total === 0) return [];

  const counts = new Map<
    string,
    { agree: number; disagree: number; pass: number }
  >();
  for (const row of rows) {
    for (const [statementId, answer] of Object.entries(row)) {
      const c = counts.get(statementId) ?? { agree: 0, disagree: 0, pass: 0 };
      if (answer === "agree") c.agree++;
      else if (answer === "disagree") c.disagree++;
      else if (answer === "pass") c.pass++;
      counts.set(statementId, c);
    }
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([statement, c]) => ({
      statement,
      agreePercent: Math.round((c.agree / total) * 100),
      disagreePercent: Math.round((c.disagree / total) * 100),
      passPercent: Math.round((c.pass / total) * 100),
    }));
}

/**
 * Wrap the population tally into the per-cluster shape `computeBridges`
 * expects: a single "population" entry per statement. This is NOT a cluster
 * split — there is exactly one group (everyone) — it just satisfies the
 * existing, tested function's input contract.
 */
function toBridgeInput(tallies: PopulationTally[]): StatementInput[] {
  return tallies.map((t) => ({
    statement: t.statement,
    clusterAgreement: [
      { name: "population", agreementPercent: t.agreePercent },
    ],
  }));
}

function toDividedInput(tallies: PopulationTally[]): DividedStatement[] {
  return tallies.map((t) => ({
    statement: t.statement,
    agreePercent: t.agreePercent,
    disagreePercent: t.disagreePercent,
  }));
}

// ---------------------------------------------------------------------------
// Per-opinion-group agreement enrichment (DISPLAY ONLY)
// ---------------------------------------------------------------------------

/**
 * The row-index → opinion-group membership the opinion MAP produced, plus the
 * neutral group labels, so per-statement agreement can be tallied within each
 * group. Null when the map itself has nothing to show.
 */
interface ClusterMembership {
  /** Non-empty opinion groups, size-desc (display id 0 = largest = Group A). */
  groups: Array<{ id: number; label: string }>;
  /** Display cluster id → the row indices assigned to that group. */
  membersByCluster: Map<number, number[]>;
}

/**
 * Reuse the SAME k-means opinion clusters the map renders. Calls
 * `assembleClusterMap` on the same rows and reads its per-session memberships
 * (`dots[i].cluster` — the size-desc display id) so a "Group A" here is the
 * exact Group A the map draws. Returns null (→ chips omitted) when the map
 * falls back to the single-cloud state (too few sessions, <2 statements, or
 * clusters that don't separate) — the same guard the map uses.
 */
function buildClusterMembership(
  rows: PolisResponseRow[],
): ClusterMembership | null {
  const map = assembleClusterMap(rows as ResponseVector[]);
  if (!map) return null;

  const membersByCluster = new Map<number, number[]>();
  map.dots.forEach((dot, i) => {
    const arr = membersByCluster.get(dot.cluster) ?? [];
    arr.push(i);
    membersByCluster.set(dot.cluster, arr);
  });

  return {
    groups: map.clusters.map((c) => ({ id: c.id, label: c.label })),
    membersByCluster,
  };
}

/**
 * Per-opinion-group agree% on one statement. Percent = agree / group size
 * (members who passed/skipped/did-not-answer count against agreement), mirroring
 * `clustering.ts`'s per-cluster convention. Records carry ONLY
 * `{ clusterId, label, agreePct }`.
 */
function clusterAgreementFor(
  statement: string,
  membership: ClusterMembership,
  rows: PolisResponseRow[],
): ClusterAgreementRecord[] {
  return membership.groups.map((g) => {
    const members = membership.membersByCluster.get(g.id) ?? [];
    const total = members.length;
    const agree = members.reduce(
      (acc, idx) => acc + (rows[idx][statement] === "agree" ? 1 : 0),
      0,
    );
    return {
      clusterId: g.id,
      label: g.label,
      agreePct: total > 0 ? Math.round((agree / total) * 100) : 0,
    };
  });
}

/** Pure: tally rows, compose population-level bridges/divided, then attach the
 *  DISPLAY-ONLY per-opinion-group breakdown (omitted when the map has no
 *  cluster structure to reuse). No DB. */
export function computePopulationAggregate(
  rows: PolisResponseRow[],
): PopulationAggregateResult {
  const tallies = tallyPopulationResponses(rows);
  const bridges = computeBridges(toBridgeInput(tallies));
  const divided = computeDivided(toDividedInput(tallies));

  const membership = buildClusterMembership(rows);
  const attach = (statement: string): ClusterAgreementRecord[] | undefined =>
    membership ? clusterAgreementFor(statement, membership, rows) : undefined;

  return {
    count: rows.length,
    bridges: bridges.map((b) => {
      const ca = attach(b.statement);
      return ca ? { ...b, clusterAgreement: ca } : b;
    }),
    divided: divided.map((d) => {
      const ca = attach(d.statement);
      return ca ? { ...d, clusterAgreement: ca } : d;
    }),
  };
}

// ---------------------------------------------------------------------------
// DB-querying wrapper (thin — route handlers call this)
// ---------------------------------------------------------------------------

/** Minimum stored response-vector rows before a bridges/divided reading is trusted. */
export const POPULATION_MIN_ROWS = 50;

/**
 * Load every `polis_response_vectors` row and compute the population-level
 * bridges/divided result.
 *
 * Returns null when DATABASE_URL is not configured (caller falls back to the
 * honest empty/sentinel branch — same convention as `collectPolisVector`).
 */
export async function fetchPopulationAggregate(): Promise<PopulationAggregateResult | null> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return null;

  const rows = await db
    .select({ responses: polisResponseVectors.responses })
    .from(polisResponseVectors);

  return computePopulationAggregate(
    rows.map((r) => r.responses as PolisResponseRow),
  );
}
