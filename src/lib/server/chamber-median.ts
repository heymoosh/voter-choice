/**
 * src/lib/server/chamber-median.ts
 *
 * Computes the median total_receipts for federal House or Senate candidates
 * in a given election cycle. Used by the FunderBars funding-detail expansion
 * to display context like "~3× the median House campaign."
 *
 * Data source: `candidates.total_receipts` — per-candidate FEC cycle receipts
 * already ingested by scripts/ingest/federal-candidates.ts. No new data needed.
 *
 * Comparison is chamber-wide median, NOT per-race or challenger-based.
 * Returns undefined when there is insufficient data (fewer than 2 candidates
 * with receipts > 0 for the chamber/cycle), so callers omit the line honestly.
 *
 * Server-only. Never import from a client component.
 */

import { and, eq, gt, isNotNull } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

// ---------------------------------------------------------------------------
// Pure math helper (exported for unit tests — no DB dependency)
// ---------------------------------------------------------------------------

/**
 * Compute the median of a sorted or unsorted numeric array.
 * Returns undefined for empty input; handles odd and even counts.
 *
 * Exported so unit tests can verify the computation in isolation.
 */
export function computeMedian(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  // Even count: average of the two middle values.
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// ---------------------------------------------------------------------------
// Chamber-median lookup (DB-backed)
// ---------------------------------------------------------------------------

export type FederalChamber = "house" | "senate";

/**
 * Look up the median total_receipts across all federal candidates for the
 * given chamber and cycle.
 *
 * Only candidates with total_receipts > 0 are included — zero-receipt rows
 * are placeholder/rostered entries without real fundraising activity and
 * would skew the median toward zero. The median is over the set of active
 * fundraisers, which is the meaningful comparison for a voter.
 *
 * Returns undefined when:
 *   - DB is not configured
 *   - Fewer than 2 candidates qualify (median would be trivially
 *     equal to the one value, not a meaningful baseline)
 */
export async function lookupChamberMedian(
  chamber: FederalChamber,
  cycle: string,
): Promise<number | undefined> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return undefined;

  const rows = await db
    .select({ totalReceipts: schema.candidates.totalReceipts })
    .from(schema.candidates)
    .where(
      and(
        eq(schema.candidates.office, chamber),
        eq(schema.candidates.electionYear, parseInt(cycle, 10)),
        isNotNull(schema.candidates.totalReceipts),
        gt(schema.candidates.totalReceipts, "0"),
      ),
    );

  if (rows.length < 2) return undefined;

  // totalReceipts is numeric(15,2) — returned as a string by drizzle/neon.
  const values = rows
    .map((r) => Number(r.totalReceipts))
    .filter((v) => Number.isFinite(v) && v > 0);

  if (values.length < 2) return undefined;

  return computeMedian(values);
}
