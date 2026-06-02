/**
 * src/lib/server/donors.ts
 *
 * Drizzle query layer for the donor-coalition lookup endpoint.
 * Aggregates per-candidate, per-cycle bucket-level dollar amounts from
 * the `donor_aggregates` table into a coalition breakdown.
 *
 * This module is server-only. Never import it from client components.
 */

import { eq, and } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import { resolveCandidateId } from "./alignment";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DonorBucket {
  /** canonical bucket label (matches donor_aggregates.bucket_label) */
  label: string;
  /** dollars, decimal as JS number */
  amount: number;
  /** 0-100 integer, computed from total (may sum to 99 or 101 due to rounding) */
  percent: number;
}

export interface DonorCoalitionResult {
  found: true;
  candidateId: string;
  totalRaised: number;
  buckets: DonorBucket[];
  /** donor_aggregates.source, e.g. "fec", "tx-tec" */
  source: string;
  /** first/most-common source_url among rows for this candidate+cycle */
  sourceUrl: string;
  electionCycle: string;
}

export interface DonorCoalitionNotFound {
  found: false;
  reason:
    | "candidate_not_resolved"
    | "no_donor_data"
    | "non_legislative_candidate";
}

export type DonorLookupResult = DonorCoalitionResult | DonorCoalitionNotFound;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Default election cycle when caller doesn't pass one.
 * Hard-coded to "2026" intentionally (not derived from new Date()) so the
 * default is stable across environments and doesn't roll over at midnight
 * Jan 1 in a way that surprises consumers.
 */
const DEFAULT_ELECTION_CYCLE = "2026";

/** Pick the most frequently occurring string in `values`; ties broken by first occurrence. */
function pickMostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  let bestVal = values[0]!;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      bestVal = v;
    }
  }
  return bestVal;
}

// ---------------------------------------------------------------------------
// Main lookup
// ---------------------------------------------------------------------------

/**
 * Look up the donor coalition for a candidate in a given election cycle.
 *
 * Resolution path:
 *   1. resolveCandidateId(name, jurisdiction) — reuses alignment's matcher.
 *      Non-legislative jurisdictions (e.g. `state-TX-executive`) won't have
 *      any candidates row, so resolution returns null → candidate_not_resolved.
 *   2. Query donor_aggregates for (candidate_id, election_cycle).
 *   3. Aggregate rows into bucket dollar amounts + percent of total.
 *
 * `stateCode` is accepted for contract symmetry with the alignment API and
 * used only as a defensive cross-check against the jurisdiction prefix; the
 * authoritative candidate lookup runs on (name, jurisdiction).
 */
export async function lookupDonorCoalition(
  candidateName: string,
  stateCode: string,
  jurisdiction: string,
  electionCycle?: string,
): Promise<DonorLookupResult> {
  void stateCode; // accepted for API symmetry; jurisdiction is authoritative

  const cycle = electionCycle?.trim() || DEFAULT_ELECTION_CYCLE;

  // 1. Resolve candidate via the shared alignment matcher. Pass stateCode so
  // the matcher can disambiguate ballot nicknames vs GovTrack formal names
  // (e.g. "Andy Kim" ↔ "Andrew Kim [D-NJ]") by lastname + state.
  const candidateId = await resolveCandidateId(
    candidateName,
    jurisdiction,
    stateCode,
  );
  if (!candidateId) {
    return { found: false, reason: "candidate_not_resolved" };
  }

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    // We resolved a candidate id from a configured DB but somehow lost the
    // connection between calls — treat as no donor data so the chat tool can
    // gracefully fall through rather than throwing.
    return { found: false, reason: "no_donor_data" };
  }

  // 2. Query donor_aggregates for this candidate + cycle.
  const rows = await db
    .select({
      bucketLabel: schema.donorAggregates.bucketLabel,
      amountTotal: schema.donorAggregates.amountTotal,
      source: schema.donorAggregates.source,
      sourceUrl: schema.donorAggregates.sourceUrl,
    })
    .from(schema.donorAggregates)
    .where(
      and(
        eq(schema.donorAggregates.candidateId, candidateId),
        eq(schema.donorAggregates.electionCycle, cycle),
      ),
    );

  if (rows.length === 0) {
    return { found: false, reason: "no_donor_data" };
  }

  // 3. Aggregate.
  // amount_total is numeric(15,2) → returned as string by drizzle/neon.
  // Coerce to Number before any arithmetic, otherwise we'd concatenate.
  const buckets: DonorBucket[] = rows.map((r) => ({
    label: r.bucketLabel,
    amount: Number(r.amountTotal),
    percent: 0, // filled in below once we know totalRaised
  }));

  const totalRaised = buckets.reduce((sum, b) => sum + b.amount, 0);

  for (const b of buckets) {
    b.percent =
      totalRaised > 0 ? Math.round((b.amount / totalRaised) * 100) : 0;
  }

  // Sort buckets by amount descending (largest coalition first).
  buckets.sort((a, b) => b.amount - a.amount);

  // Source: usually identical across rows but pick the most common if not.
  const source = pickMostCommon(rows.map((r) => r.source));
  const sourceUrl = pickMostCommon(rows.map((r) => r.sourceUrl));

  return {
    found: true,
    candidateId,
    totalRaised,
    buckets,
    source,
    sourceUrl,
    electionCycle: cycle,
  };
}
