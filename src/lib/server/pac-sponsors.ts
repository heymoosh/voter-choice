/**
 * src/lib/server/pac-sponsors.ts
 *
 * Read layer for Part 6a — "Top PACs and sponsors". Names the PAC committees
 * that gave directly to a candidate, with the sponsor each committee itself
 * files (FEC CONNECTED_ORG) and the sector we inferred from it. Rows are
 * written by scripts/ingest/federal-pac-sponsors.ts into `pac_committees` +
 * `pac_candidate_contributions` (migration 0022).
 *
 * THIS IS A BREAKDOWN, NEVER A NEW TOTAL. Every dollar returned here is
 * already inside the "PACs" funding-mix bucket of `donor_aggregates` (the
 * ingest stores direct 24K/24P/24Z contributions only). Plan doc, Part 6a:
 * "read paths must never re-add them to totals". So this module deliberately
 * returns NO aggregate dollar figure at all — only per-PAC amounts — and its
 * result is never summed into `totalRaised` or the funding mix. See
 * `pac-sponsors.test.ts`, which asserts the absence of any total field.
 *
 * HAND-CURATION CONTRACT. `pac_committees.status` is auto | verified |
 * rejected; 'rejected' is a human saying "this sponsor attribution is
 * wrong". A rejected row's FILED sponsor/sector claim is never rendered.
 * Since migration 0024, a rejected committee that carries a human-curated
 * summary (our own sourced statement of who is behind it) IS listed — with
 * the filed claim suppressed and the summary in its place; a rejected row
 * with no summary is still excluded entirely, because there is nothing
 * honest left to render (Muxin's 2026-08-16 direction: people should see
 * what every PAC is about — don't drop them).
 *
 * Server-only. Never import it from client components.
 */

import { and, desc, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";
import {
  PAC_COMMITTEE_DISPLAY_COLUMNS,
  type CuratedAttribution,
} from "./curated-attribution";

/** Committee rows a human has rejected are never displayed. */
const REJECTED_STATUS = "rejected";

/** Most PACs shown per candidate; the rest are counted, not listed. */
export const MAX_SPONSORS_SHOWN = 8;

/**
 * Default election cycle, hard-coded for the same reason
 * `donors.ts` hard-codes it: a stable default that doesn't roll over at
 * midnight on Jan 1 in a way that surprises callers.
 */
const DEFAULT_ELECTION_CYCLE = "2026";

export interface PacSponsorEntry extends CuratedAttribution {
  /** FEC committee id, e.g. "C00123456". */
  committeeId: string;
  /** PAC name exactly as filed with the FEC. */
  name: string;
  /**
   * CONNECTED_ORG — the sponsoring organization the committee declares on
   * its own filing. Null when the committee files none (most super PACs and
   * ideological PACs): honestly unsponsored, never guessed.
   */
  sponsor: string | null;
  /**
   * Our sector inference from the filed sponsor (shared `_bucket-mapping.ts`
   * vocabulary). Null = honestly unclassified; the UI shows no sector rather
   * than inventing one.
   */
  sector: string | null;
  /** Dollars. Part of the "PACs" funding-mix bucket, not additional money. */
  amount: number;
  /** Itemized contributions behind `amount`. */
  transactionCount: number;
  /** fec.gov page where the sponsor filing is visible — every claim links out. */
  evidenceUrl: string;
  /**
   * 'auto' | 'verified' | 'rejected' — a rejected row appears only when it
   * carries a curated summary, and with its filed sponsor/sector nulled.
   */
  status: string;
}

export interface PacSponsorsResult {
  electionCycle: string;
  /** Ranked by amount, largest first. Empty = no rows; render "no data". */
  sponsors: PacSponsorEntry[];
  /**
   * PACs beyond `MAX_SPONSORS_SHOWN` that exist but aren't listed. A COUNT,
   * never dollars — so this block can never contribute a figure to any total.
   */
  hiddenCount: number;
}

/**
 * The honest empty result: "we looked and there is nothing on file", as
 * distinct from "we did not look" (which callers express as a missing block).
 * Callers on the display path substitute this for a candidate absent from the
 * lookup map so the UI can render an explicit "no data" line rather than a
 * blank space.
 */
export function emptyPacSponsors(electionCycle?: string): PacSponsorsResult {
  return {
    electionCycle: electionCycle?.trim() || DEFAULT_ELECTION_CYCLE,
    sponsors: [],
    hiddenCount: 0,
  };
}

/**
 * Top PAC contributors for a set of candidate ids, keyed by candidate id.
 *
 * Candidates with no rows are simply absent from the map — callers must
 * render the explicit "no data" state themselves rather than a blank, and
 * must not infer "this candidate took no PAC money" from an empty result
 * (the ingest may not have run for their cycle). DB-not-configured and query
 * failure both degrade to an empty map, like `lookupCommittees`.
 */
export async function lookupPacSponsors(
  candidateIds: string[],
  electionCycle?: string,
): Promise<Map<string, PacSponsorsResult>> {
  const cycle = electionCycle?.trim() || DEFAULT_ELECTION_CYCLE;
  const result = new Map<string, PacSponsorsResult>();
  if (candidateIds.length === 0) return result;

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return result;

  // Optional enrichment: a missing table (migration 0022 not applied) or a
  // query failure must never take down the surface this hangs off.
  let rows;
  try {
    rows = await db
      .select({
        candidateId: schema.pacCandidateContributions.candidateId,
        committeeId: schema.pacCandidateContributions.committeeId,
        amountTotal: schema.pacCandidateContributions.amountTotal,
        transactionCount: schema.pacCandidateContributions.transactionCount,
        ...PAC_COMMITTEE_DISPLAY_COLUMNS,
      })
      .from(schema.pacCandidateContributions)
      .innerJoin(
        schema.pacCommittees,
        eq(
          schema.pacCandidateContributions.committeeId,
          schema.pacCommittees.committeeId,
        ),
      )
      .where(
        and(
          inArray(schema.pacCandidateContributions.candidateId, candidateIds),
          eq(schema.pacCandidateContributions.electionCycle, cycle),
          // Hand-curation contract: a rejected row renders only when a
          // human-curated summary can stand in for the thrown-out claim.
          or(
            ne(schema.pacCommittees.status, REJECTED_STATUS),
            isNotNull(schema.pacCommittees.curatedSummary),
          ),
        ),
      )
      .orderBy(desc(schema.pacCandidateContributions.amountTotal));
  } catch (err) {
    console.error("[pac-sponsors] lookup failed (degrading to empty):", err);
    return result;
  }

  const byCandidate = new Map<string, PacSponsorEntry[]>();
  for (const row of rows) {
    const rejected = row.status === REJECTED_STATUS;
    const curatedSummary = emptyToNull(row.curatedSummary);
    // Defence in depth: the SQL filter above already excludes summary-less
    // rejected rows, but a future caller passing pre-fetched rows must not
    // be able to leak one through.
    if (rejected && curatedSummary === null) continue;
    const list = byCandidate.get(row.candidateId) ?? [];
    list.push({
      committeeId: row.committeeId,
      name: row.name,
      // A rejected row's FILED claim is suppressed; the curated summary is
      // what renders in its place.
      sponsor: rejected ? null : emptyToNull(row.connectedOrg),
      sector: rejected ? null : emptyToNull(row.sector),
      curatedSummary,
      curatedSourceUrl: emptyToNull(row.curatedSourceUrl),
      // amount_total is numeric(14,2) → a string from drizzle/neon. Coerce
      // before any comparison, or the sort below would compare strings.
      amount: Number(row.amountTotal),
      transactionCount: row.transactionCount,
      evidenceUrl: row.evidenceUrl,
      status: row.status,
    });
    byCandidate.set(row.candidateId, list);
  }

  for (const [candidateId, list] of byCandidate) {
    list.sort((a, b) => b.amount - a.amount);
    result.set(candidateId, {
      electionCycle: cycle,
      sponsors: list.slice(0, MAX_SPONSORS_SHOWN),
      hiddenCount: Math.max(0, list.length - MAX_SPONSORS_SHOWN),
    });
  }

  return result;
}

/** FEC text fields arrive as "" as often as NULL; both mean "not filed". */
function emptyToNull(value: string | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}
