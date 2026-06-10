/**
 * src/lib/server/can-context.ts
 *
 * Read layer for CAN2026 enrichment context (display-side ONLY — this data
 * never feeds lookupAlignment or any score; see
 * docs/CAN2026_ENRICHMENT_SCHEMA.md §4).
 *
 * Returns curated race ratings, donor-trail headers/notes, and key-vote
 * context for a seat, via the can_* tables populated by
 * scripts/ingest/can2026.ts. Every block must be rendered with the CAN
 * attribution (src/lib/canAttribution.ts). Empty results everywhere until
 * the first ingest runs — callers render nothing.
 *
 * This module is server-only. Never import it from client components.
 */

import { desc, eq, inArray } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

// ---------------------------------------------------------------------------
// Types (client-safe shapes)
// ---------------------------------------------------------------------------

export interface CanRaceRating {
  rater: string; // "cook" | "sabato" | "inside_elections" | "can_own" | …
  raterType: string; // "forecaster" | "pollster" | "can_own"
  rating: string; // normalized: "toss_up" | "lean_d" | … | "safe_r"
  ratingRaw: string | null; // verbatim label
}

export interface CanKeyVote {
  billLabel: string;
  voteCast: string | null; // normalized "yea"|"nay"|"present"|"not_voting"|"na"
  voteCastRaw: string | null; // verbatim incl. qualifiers
  voteDateRaw: string | null;
  context: string | null; // the curated per-vote prose
  proceduralNote: string | null;
  billNarrative: string | null; // "What it did:" prose, when linked
}

export interface CanDonorTrail {
  cycleWindow: string;
  totalRaised: number | null;
  cashOnHand: number | null;
  pacSharePct: number | null;
  note: string | null; // curated dark-money / issue-PAC prose
}

export interface CanSeatContext {
  ratings: CanRaceRating[];
  donorTrail: CanDonorTrail | null;
  keyVotes: CanKeyVote[];
  /** CAN's own content-freshness stamp for the rows returned. */
  snapshotDate: string | null;
  sourceUrl: string | null;
}

const MAX_KEY_VOTES = 8;

/** Deterministic can_races key — mirrors the ingester's convention. */
export function canRaceId(
  stateCode: string,
  chamber: "house" | "senate",
  district: number | null,
): string {
  const st = stateCode.toUpperCase();
  if (chamber === "senate") return `${st}-senate`;
  const dd = String(district ?? 0).padStart(2, "0");
  return `${st}-house-${dd}`;
}

const EMPTY: CanSeatContext = {
  ratings: [],
  donorTrail: null,
  keyVotes: [],
  snapshotDate: null,
  sourceUrl: null,
};

/**
 * CAN context for one seat: race ratings for the seat's race, plus the
 * donor trail + key votes of the sitting member identified by
 * `ourCandidateId` (crosswalked at ingest). All best-effort and read-only.
 */
export async function lookupCanSeatContext(
  stateCode: string,
  chamber: "house" | "senate",
  district: number | null,
  ourCandidateId: string | null,
): Promise<CanSeatContext> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return EMPTY;

  const raceId = canRaceId(stateCode, chamber, district);

  // Latest-snapshot ratings for the race (the unique index keys ratings by
  // (race, rater, snapshot) — take the newest snapshot's rows).
  const ratingRows = await db
    .select({
      rater: schema.canRaceRatings.rater,
      raterType: schema.canRaceRatings.raterType,
      rating: schema.canRaceRatings.rating,
      ratingRaw: schema.canRaceRatings.ratingRaw,
      snapshotDate: schema.canRaceRatings.snapshotDate,
      sourceUrl: schema.canRaceRatings.sourceUrl,
    })
    .from(schema.canRaceRatings)
    .where(eq(schema.canRaceRatings.raceId, raceId))
    .orderBy(desc(schema.canRaceRatings.snapshotDate));

  const latestRatingSnapshot = ratingRows[0]?.snapshotDate ?? null;
  const ratings: CanRaceRating[] = ratingRows
    .filter((r) => r.snapshotDate === latestRatingSnapshot)
    .map((r) => ({
      rater: r.rater,
      raterType: r.raterType,
      rating: r.rating,
      ratingRaw: r.ratingRaw,
    }));

  let donorTrail: CanDonorTrail | null = null;
  let keyVotes: CanKeyVote[] = [];
  let memberSnapshot: string | null = null;
  let memberSourceUrl: string | null = null;

  if (ourCandidateId) {
    const canCands = await db
      .select({
        id: schema.canCandidates.id,
        snapshotDate: schema.canCandidates.snapshotDate,
        sourceUrl: schema.canCandidates.sourceUrl,
      })
      .from(schema.canCandidates)
      .where(eq(schema.canCandidates.ourCandidateId, ourCandidateId))
      .orderBy(desc(schema.canCandidates.snapshotDate));

    const canCand = canCands[0];
    if (canCand) {
      memberSnapshot = canCand.snapshotDate;
      memberSourceUrl = canCand.sourceUrl;
      const candIds = canCands
        .filter((c) => c.snapshotDate === canCand.snapshotDate)
        .map((c) => c.id);

      const [trailRows, voteRows] = await Promise.all([
        db
          .select({
            cycleWindow: schema.canDonorTrails.cycleWindow,
            totalRaised: schema.canDonorTrails.totalRaised,
            cashOnHand: schema.canDonorTrails.cashOnHand,
            pacSharePct: schema.canDonorTrails.pacSharePct,
            note: schema.canDonorTrails.note,
          })
          .from(schema.canDonorTrails)
          .where(inArray(schema.canDonorTrails.canCandidateId, candIds))
          .orderBy(desc(schema.canDonorTrails.cycleWindow)),
        db
          .select({
            billLabel: schema.canCandidateKeyVotes.billLabel,
            voteCast: schema.canCandidateKeyVotes.voteCast,
            voteCastRaw: schema.canCandidateKeyVotes.voteCastRaw,
            voteDateRaw: schema.canCandidateKeyVotes.voteDateRaw,
            context: schema.canCandidateKeyVotes.context,
            proceduralNote: schema.canCandidateKeyVotes.proceduralNote,
            narrative: schema.canBillNarratives.narrative,
          })
          .from(schema.canCandidateKeyVotes)
          .leftJoin(
            schema.canBillNarratives,
            eq(
              schema.canCandidateKeyVotes.billNarrativeId,
              schema.canBillNarratives.id,
            ),
          )
          .where(inArray(schema.canCandidateKeyVotes.canCandidateId, candIds)),
      ]);

      const trail = trailRows[0];
      donorTrail = trail
        ? {
            cycleWindow: trail.cycleWindow,
            totalRaised:
              trail.totalRaised !== null ? Number(trail.totalRaised) : null,
            cashOnHand:
              trail.cashOnHand !== null ? Number(trail.cashOnHand) : null,
            pacSharePct:
              trail.pacSharePct !== null ? Number(trail.pacSharePct) : null,
            note: trail.note,
          }
        : null;

      // Prefer votes that carry curated context — that prose is the asset.
      keyVotes = [...voteRows]
        .sort((a, b) => Number(Boolean(b.context)) - Number(Boolean(a.context)))
        .slice(0, MAX_KEY_VOTES)
        .map((v) => ({
          billLabel: v.billLabel,
          voteCast: v.voteCast,
          voteCastRaw: v.voteCastRaw,
          voteDateRaw: v.voteDateRaw,
          context: v.context,
          proceduralNote: v.proceduralNote,
          billNarrative: v.narrative,
        }));
    }
  }

  if (ratings.length === 0 && !donorTrail && keyVotes.length === 0) {
    return EMPTY;
  }
  return {
    ratings,
    donorTrail,
    keyVotes,
    snapshotDate: memberSnapshot ?? latestRatingSnapshot,
    sourceUrl: memberSourceUrl ?? ratingRows[0]?.sourceUrl ?? null,
  };
}
