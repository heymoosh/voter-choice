/**
 * Population-level Polis aggregation (Phase 8 — real bridges/divided).
 *
 * Tallies agree/disagree/pass PER STATEMENT across every stored response
 * vector as one population — no k-means cluster split, no D/R/I party
 * breakdown. This matches the approved design decision (card e2455f56,
 * 2026-07-07): keep the existing party-free product decision, threshold at
 * the population level. Deliberately does NOT use `../../polis/clustering`
 * or `../../polis/reportAssembly` (that pipeline computes PER-CLUSTER
 * agreement, the wrong methodology for this card).
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
  type DividedStatement,
  type StatementInput,
} from "./aggregates";

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

/** Pure: tally rows, then compose bridges/divided. No DB. */
export function computePopulationAggregate(
  rows: PolisResponseRow[],
): PopulationAggregateResult {
  const tallies = tallyPopulationResponses(rows);
  return {
    count: rows.length,
    bridges: computeBridges(toBridgeInput(tallies)),
    divided: computeDivided(toDividedInput(tallies)),
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
