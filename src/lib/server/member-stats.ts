/**
 * src/lib/server/member-stats.ts
 *
 * Read layer for the `member_stats` table (per-incumbent GovTrack stats:
 * missed-votes attendance, current term end, senate class). Rows are written
 * by scripts/ingest/member-stats.ts.
 *
 * This module is server-only. Never import it from client components.
 */

import { inArray } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

export type AttendanceBand = "good" | "mid" | "bad";

export interface MemberAttendance {
  missedPct: number;
  /** Display string for the denominator, e.g. "612 floor votes". */
  of: string;
  band: AttendanceBand;
}

export interface MemberStatsEntry {
  candidateId: string;
  attendance: MemberAttendance | null;
  /** True when the member's seat is up in the 2026 general; null = unknown. */
  onBallot2026: boolean | null;
  /** Calendar year of the seat's next general election; null = unknown. */
  nextElectionYear: number | null;
  senateClass: string | null;
  /** Authoritative geography from the GovTrack role API (ingest-populated). */
  state: string | null;
  district: number | null;
  senatorRank: "senior" | "junior" | null;
}

/**
 * Band a member's missed-votes percentage against the chamber median.
 * Thresholds: at/below median → "good"; within 3× median → "mid"; above →
 * "bad". A zero/unknown median falls back to absolute cutoffs (2% / 6%) so a
 * pathological ingest can't mark everyone "good".
 */
export function attendanceBand(
  missedPct: number,
  chamberMedianPct: number | null,
): AttendanceBand {
  if (chamberMedianPct !== null && chamberMedianPct > 0) {
    if (missedPct <= chamberMedianPct) return "good";
    if (missedPct <= chamberMedianPct * 3) return "mid";
    return "bad";
  }
  if (missedPct <= 2) return "good";
  if (missedPct <= 6) return "mid";
  return "bad";
}

function toNumber(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * A member is on the 2026 ballot when their current term ends after the
 * Nov 2026 general but before the end of 2027 (House terms and senate class 2
 * both end on Jan 3, 2027).
 */
export function onBallot2026FromTermEnd(
  termEnd: string | null,
): boolean | null {
  if (!termEnd) return null;
  const year = Number(termEnd.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return year === 2027;
}

/**
 * The seat's next general-election year: terms end the January after the
 * November election (term end 2029-01-03 → elected Nov 2028).
 */
export function nextElectionYearFromTermEnd(
  termEnd: string | null,
): number | null {
  if (!termEnd) return null;
  const year = Number(termEnd.slice(0, 4));
  return Number.isFinite(year) ? year - 1 : null;
}

/**
 * Fetch member stats for a set of candidate ids. Missing rows (member not
 * ingested yet) simply don't appear in the result — callers render the honest
 * "not tracked" state. DB-not-configured returns an empty map for the same
 * graceful degradation.
 */
export async function lookupMemberStats(
  candidateIds: string[],
): Promise<Map<string, MemberStatsEntry>> {
  const result = new Map<string, MemberStatsEntry>();
  if (candidateIds.length === 0) return result;

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return result;

  // member_stats is an optional enrichment: a missing table (migration not
  // applied yet) or query failure must never take down delegation resolution.
  let rows;
  try {
    rows = await db
      .select({
        candidateId: schema.memberStats.candidateId,
        missedVotesPct: schema.memberStats.missedVotesPct,
        votesEligible: schema.memberStats.votesEligible,
        chamberMedianPct: schema.memberStats.chamberMedianPct,
        currentTermEnd: schema.memberStats.currentTermEnd,
        senateClass: schema.memberStats.senateClass,
        state: schema.memberStats.state,
        district: schema.memberStats.district,
        senatorRank: schema.memberStats.senatorRank,
      })
      .from(schema.memberStats)
      .where(inArray(schema.memberStats.candidateId, candidateIds));
  } catch (err) {
    console.error("[member-stats] lookup failed (degrading to empty):", err);
    return result;
  }

  for (const row of rows) {
    const missedPct = toNumber(row.missedVotesPct);
    const eligible = toNumber(row.votesEligible);
    const median = toNumber(row.chamberMedianPct);

    const attendance: MemberAttendance | null =
      missedPct !== null
        ? {
            missedPct,
            of:
              eligible !== null
                ? `${eligible} floor votes`
                : "floor votes this term",
            band: attendanceBand(missedPct, median),
          }
        : null;

    result.set(row.candidateId, {
      candidateId: row.candidateId,
      attendance,
      onBallot2026: onBallot2026FromTermEnd(row.currentTermEnd),
      nextElectionYear: nextElectionYearFromTermEnd(row.currentTermEnd),
      senateClass: row.senateClass,
      state: row.state,
      district: row.district,
      senatorRank:
        row.senatorRank === "senior" || row.senatorRank === "junior"
          ? row.senatorRank
          : null,
    });
  }

  return result;
}
