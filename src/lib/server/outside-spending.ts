/**
 * src/lib/server/outside-spending.ts
 *
 * Read layer for Part 6b — "Outside spending about this race". FEC Schedule E
 * money spent FOR or AGAINST a candidate by committees that are not the
 * candidate's, written by scripts/ingest/federal-independent-expenditures.ts
 * (migration 0023) and joined here to `pac_committees` for the spender's
 * name, filed sponsor and sector.
 *
 * ---------------------------------------------------------------------------
 * THE DISPLAY RULE (legally load-bearing, plan doc Part 6b — non-negotiable)
 *
 * This is NOT the candidate's money. Independent expenditures are absent from
 * candidate receipts by law and cannot be coordinated with the campaign.
 * Therefore:
 *   • These amounts NEVER enter `donor_aggregates`, `totalRaised`, or any
 *     funding-mix figure. This module is not imported by any funding-mix
 *     producer or read path — `scripts/ingest/independent-expenditure-
 *     isolation.test.ts` enforces that structurally.
 *   • "Spent supporting" and "spent opposing" are TWO figures. They are never
 *     summed into one number, never netted against each other, and never
 *     mingled with the funding mix. The shape below has no field in which a
 *     combined figure could live, and the tests assert that.
 * ---------------------------------------------------------------------------
 *
 * SPENDER ATTRIBUTION IS DELIBERATELY THIN. Most super PACs are non-connected
 * committees, so CONNECTED_ORG is usually empty and the sector is rightly
 * NULL (plan doc, 6b dry-run finding 3). Spenders are therefore presented by
 * NAME + filed sponsor, with sector shown only where it exists. Unlike 6a,
 * a `rejected` committee row does NOT drop the spending: the expenditure is a
 * filing and remains real: only the rejected sponsor/sector ATTRIBUTION is
 * suppressed, so the block never understates outside spending, and never
 * repeats a claim a human threw out.
 *
 * Server-only. Never import it from client components.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

/** Committee rows a human has rejected keep their money, lose their sponsor. */
const REJECTED_STATUS = "rejected";

/** Most spenders listed per direction; the rest are counted, not listed. */
export const MAX_SPENDERS_SHOWN = 6;

/** Same stable default as `donors.ts` / `pac-sponsors.ts`. */
const DEFAULT_ELECTION_CYCLE = "2026";

/**
 * The two directions, kept apart everywhere. Mirrors the ingest's
 * SUPPORT_OPPOSE_VALUES and the `support_oppose` column; duplicated (not
 * imported) to respect the src/ ↔ scripts/ boundary.
 */
export const SPENDING_DIRECTIONS = ["support", "oppose"] as const;
export type SpendingDirection = (typeof SPENDING_DIRECTIONS)[number];

export interface OutsideSpender {
  /** FEC committee id of the SPENDING committee — not the candidate's. */
  committeeId: string;
  /** Spender name as filed. The primary thing this block names. */
  name: string;
  /**
   * CONNECTED_ORG — the sponsor the spender declares on its own filing.
   * Null for most super PACs (non-connected): honestly unsponsored.
   * Also null when a human rejected the attribution.
   */
  sponsor: string | null;
  /** Sector, only where one exists. Null = honestly unclassified. */
  sector: string | null;
  /** Dollars spent in THIS direction. Never added to the other direction. */
  amount: number;
  /** Itemized Schedule E filings behind `amount`. */
  expenditureCount: number;
  /** fec.gov page for the spending committee — every name links out. */
  evidenceUrl: string;
}

/** One direction's figure and its spenders. There are always exactly two. */
export interface OutsideSpendingDirection {
  /**
   * Dollars spent in this direction ONLY. This is one of the two figures the
   * plan requires; it is never added to the other direction's total, and
   * never to any campaign-finance total.
   */
  total: number;
  /** Ranked by amount, largest first. Empty = none filed in this direction. */
  spenders: OutsideSpender[];
  /** Spenders beyond MAX_SPENDERS_SHOWN — a count, never dollars. */
  hiddenCount: number;
}

/**
 * Outside spending about one candidate. Note the shape: two sibling
 * directions and no combined field. There is deliberately no `total`,
 * `net`, or `all` key — a caller that wanted to sum them would have to write
 * the addition itself, in the open, against this file's doc.
 */
export interface OutsideSpendingResult {
  electionCycle: string;
  support: OutsideSpendingDirection;
  oppose: OutsideSpendingDirection;
}

/**
 * The honest empty result: "we looked and nothing is on file", as distinct
 * from "we did not look" (a missing block). Both directions are present and
 * zero — the UI still shows two figures, never one.
 */
export function emptyOutsideSpending(
  electionCycle?: string,
): OutsideSpendingResult {
  const emptyDirection = (): OutsideSpendingDirection => ({
    total: 0,
    spenders: [],
    hiddenCount: 0,
  });
  return {
    electionCycle: electionCycle?.trim() || DEFAULT_ELECTION_CYCLE,
    support: emptyDirection(),
    oppose: emptyDirection(),
  };
}

/**
 * Outside spending for a set of candidate ids, keyed by candidate id.
 *
 * Candidates with no Schedule E rows are absent from the map; callers render
 * the explicit "no outside spending on file" state rather than a blank, and
 * must not read absence as proof none happened (the ingest may not have run,
 * and non-express-advocacy ads aren't IEs at all). DB-not-configured and
 * query failure degrade to an empty map.
 */
export async function lookupOutsideSpending(
  candidateIds: string[],
  electionCycle?: string,
): Promise<Map<string, OutsideSpendingResult>> {
  const cycle = electionCycle?.trim() || DEFAULT_ELECTION_CYCLE;
  const result = new Map<string, OutsideSpendingResult>();
  if (candidateIds.length === 0) return result;

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return result;

  let rows;
  try {
    rows = await db
      .select({
        candidateId: schema.independentExpenditures.candidateId,
        committeeId: schema.independentExpenditures.committeeId,
        supportOppose: schema.independentExpenditures.supportOppose,
        amountTotal: schema.independentExpenditures.amountTotal,
        expenditureCount: schema.independentExpenditures.expenditureCount,
        name: schema.pacCommittees.name,
        connectedOrg: schema.pacCommittees.connectedOrg,
        sector: schema.pacCommittees.sector,
        status: schema.pacCommittees.status,
        evidenceUrl: schema.pacCommittees.evidenceUrl,
      })
      .from(schema.independentExpenditures)
      .innerJoin(
        schema.pacCommittees,
        eq(
          schema.independentExpenditures.committeeId,
          schema.pacCommittees.committeeId,
        ),
      )
      .where(
        and(
          inArray(schema.independentExpenditures.candidateId, candidateIds),
          eq(schema.independentExpenditures.electionCycle, cycle),
        ),
      )
      .orderBy(desc(schema.independentExpenditures.amountTotal));
  } catch (err) {
    console.error(
      "[outside-spending] lookup failed (degrading to empty):",
      err,
    );
    return result;
  }

  // Per candidate, per direction. The two directions are accumulated in
  // separate buckets and never touch: there is no code path in this module
  // that reads one direction's total while writing the other's.
  const byCandidate = new Map<
    string,
    Record<SpendingDirection, OutsideSpender[]>
  >();
  for (const row of rows) {
    const direction = asDirection(row.supportOppose);
    // An unrecognised direction is dropped, never folded into the other one —
    // guessing a side is exactly the misstatement this block exists to avoid.
    if (!direction) continue;
    const buckets =
      byCandidate.get(row.candidateId) ??
      ({ support: [], oppose: [] } as Record<
        SpendingDirection,
        OutsideSpender[]
      >);
    const rejected = row.status === REJECTED_STATUS;
    buckets[direction].push({
      committeeId: row.committeeId,
      name: row.name,
      // A rejected row keeps its spending and loses its sponsor claim.
      sponsor: rejected ? null : emptyToNull(row.connectedOrg),
      sector: rejected ? null : emptyToNull(row.sector),
      amount: Number(row.amountTotal),
      expenditureCount: row.expenditureCount,
      evidenceUrl: row.evidenceUrl,
    });
    byCandidate.set(row.candidateId, buckets);
  }

  for (const [candidateId, buckets] of byCandidate) {
    result.set(candidateId, {
      electionCycle: cycle,
      support: summarizeDirection(buckets.support),
      oppose: summarizeDirection(buckets.oppose),
    });
  }

  return result;
}

/**
 * Roll one direction's spenders into that direction's figure. Called once per
 * direction with only that direction's rows — it cannot see the other side,
 * which is what makes summing the two structurally impossible here.
 */
function summarizeDirection(
  spenders: OutsideSpender[],
): OutsideSpendingDirection {
  const ranked = [...spenders].sort((a, b) => b.amount - a.amount);
  return {
    total: ranked.reduce((sum, s) => sum + s.amount, 0),
    spenders: ranked.slice(0, MAX_SPENDERS_SHOWN),
    hiddenCount: Math.max(0, ranked.length - MAX_SPENDERS_SHOWN),
  };
}

function asDirection(value: string): SpendingDirection | null {
  return value === "support" || value === "oppose" ? value : null;
}

/** FEC text fields arrive as "" as often as NULL; both mean "not filed". */
function emptyToNull(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}
