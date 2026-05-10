/**
 * src/lib/server/alignment.ts
 *
 * Drizzle query layer for the alignment lookup endpoint.
 * Pulled out of the route handler so it can be tested independently.
 *
 * This module is server-only. Never import it from client components.
 */

import { eq, and, gte } from "drizzle-orm";
import { getDb, DB_NOT_CONFIGURED } from "../../../db/client";
import * as schema from "../../../db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContributingVote {
  billTitle: string;
  /** "with" = voted on the user's side; "against" = voted against the user's side */
  voteCast: "with" | "against";
  date: string; // YYYY-MM-DD
  source: { name: string; url: string };
}

export interface AlignmentResult {
  found: true;
  candidateId: string;
  kept: number;
  total: number;
  contributingVotes: ContributingVote[];
  unavailable?: { reason: string };
}

export interface AlignmentNotFound {
  found: false;
  unavailable: { reason: string };
}

export type AlignmentLookupResult = AlignmentResult | AlignmentNotFound;

// ---------------------------------------------------------------------------
// Candidate resolution
// ---------------------------------------------------------------------------

/**
 * Fuzzy-match a candidate by full name + jurisdiction.
 *
 * Strategy:
 * 1. Exact case-insensitive match on full_name + jurisdiction.
 * 2. If that misses, try prefix match (name starts with the queried string).
 * 3. If still missing, return null.
 *
 * The jurisdiction narrows the search to the right chamber so same-name
 * candidates across chambers (e.g., a state rep who later ran for Senate)
 * don't collide.
 */
export async function resolveCandidateId(
  candidateName: string,
  jurisdiction: string,
): Promise<string | null> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return null;

  const normalized = candidateName.trim().toLowerCase();
  if (!normalized) return null;

  // 1. Exact case-insensitive match
  const rows = await db
    .select({ id: schema.candidates.id, fullName: schema.candidates.fullName })
    .from(schema.candidates)
    .where(eq(schema.candidates.jurisdiction, jurisdiction));

  const exact = rows.find(
    (r) => r.fullName.trim().toLowerCase() === normalized,
  );
  if (exact) return exact.id;

  // 2. Prefix match — handles "Bob Smith" matching "Bob Smith Jr."
  const prefix = rows.find((r) =>
    r.fullName.trim().toLowerCase().startsWith(normalized),
  );
  if (prefix) return prefix.id;

  // 3. Reverse prefix — queried name is longer (typo / middle-initial included)
  const reversePrefix = rows.find((r) =>
    normalized.startsWith(r.fullName.trim().toLowerCase()),
  );
  if (reversePrefix) return reversePrefix.id;

  return null;
}

// ---------------------------------------------------------------------------
// Alignment math
// ---------------------------------------------------------------------------

/**
 * Determine whether a vote is "with" or "against" the user's stated stance.
 *
 * Truth-table:
 * | vote_cast | stance_lens  | resolvedStance | alignment |
 * |-----------|-------------|----------------|-----------|
 * | yea       | in_favor    | in_favor       | with      |
 * | yea       | in_favor    | opposed        | against   |
 * | yea       | opposed     | in_favor       | against   |
 * | yea       | opposed     | opposed        | with      |
 * | nay       | in_favor    | in_favor       | against   |
 * | nay       | in_favor    | opposed        | with      |
 * | nay       | opposed     | in_favor       | with      |
 * | nay       | opposed     | opposed        | against   |
 *
 * "present", "absent", "not_voting" are non-votes and are excluded from
 * contributing votes (they neither help nor hurt alignment).
 */
export function computeVoteAlignment(
  voteCast: string,
  stanceLens: string,
  resolvedStance: "in_favor" | "opposed",
): "with" | "against" | "abstain" {
  const yea = voteCast === "yea";
  const nay = voteCast === "nay";
  if (!yea && !nay) return "abstain"; // present / absent / not_voting

  // A yea vote means the candidate supports what the bill does.
  // stanceLens tells us what voting yea means for the canonical issue.
  // resolvedStance tells us what the voter wants on the canonical issue.
  const candidateSupportsIssueDirection = yea
    ? stanceLens === "in_favor"
    : stanceLens === "opposed";
  const voterWantsSupport = resolvedStance === "in_favor";

  const aligned = candidateSupportsIssueDirection === voterWantsSupport;
  return aligned ? "with" : "against";
}

// ---------------------------------------------------------------------------
// Main lookup
// ---------------------------------------------------------------------------

/** Four years ago from the current date — used to filter the voting window. */
function fourYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}

const MAX_CONTRIBUTING_VOTES = 6;

export async function lookupAlignment(
  candidateId: string,
  canonicalIssue: string,
  resolvedStance: "in_favor" | "opposed",
): Promise<AlignmentResult> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    return {
      found: true,
      candidateId,
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: { reason: "Voting record database is not configured" },
    };
  }

  const cutoff = fourYearsAgo();

  // Join votes → bills → issue_tags filtered by candidate + issue + date window
  const rows = await db
    .select({
      billTitle: schema.bills.title,
      billSourceUrl: schema.bills.sourceUrl,
      billSource: schema.bills.source,
      voteCast: schema.votes.voteCast,
      voteDate: schema.votes.voteDate,
      stanceLens: schema.issueTags.stanceLens,
      taggerConfidence: schema.issueTags.taggerConfidence,
    })
    .from(schema.votes)
    .innerJoin(schema.bills, eq(schema.votes.billId, schema.bills.id))
    .innerJoin(
      schema.issueTags,
      and(
        eq(schema.issueTags.billId, schema.bills.id),
        eq(schema.issueTags.canonicalIssue, canonicalIssue),
      ),
    )
    .where(
      and(
        eq(schema.votes.candidateId, candidateId),
        gte(schema.votes.voteDate, cutoff),
      ),
    );

  if (rows.length === 0) {
    return {
      found: true,
      candidateId,
      kept: 0,
      total: 0,
      contributingVotes: [],
      unavailable: {
        reason: "No tagged votes for this issue in our records yet",
      },
    };
  }

  // Compute alignment for each row (exclude abstains from totals)
  const scored = rows
    .map((r) => ({
      ...r,
      alignment: computeVoteAlignment(r.voteCast, r.stanceLens, resolvedStance),
    }))
    .filter((r) => r.alignment !== "abstain");

  const kept = scored.filter((r) => r.alignment === "with").length;
  const total = scored.length;

  // Sort by tagger_confidence DESC (nulls last) then most recent first to pick
  // the most diagnostic contributing votes.
  const sorted = [...scored].sort((a, b) => {
    const confA = a.taggerConfidence !== null ? Number(a.taggerConfidence) : -1;
    const confB = b.taggerConfidence !== null ? Number(b.taggerConfidence) : -1;
    if (confB !== confA) return confB - confA;
    return b.voteDate.localeCompare(a.voteDate);
  });

  const contributingVotes: ContributingVote[] = sorted
    .slice(0, MAX_CONTRIBUTING_VOTES)
    .map((r) => ({
      billTitle: r.billTitle,
      voteCast: r.alignment as "with" | "against",
      date: r.voteDate,
      source: {
        name: r.billSource,
        url: r.billSourceUrl,
      },
    }));

  return {
    found: true,
    candidateId,
    kept,
    total,
    contributingVotes,
  };
}
