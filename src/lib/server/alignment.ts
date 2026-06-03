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
  /**
   * Optional structured notice surfaced to the chat layer when the underlying
   * tag corpus is thin (e.g., `total < 5`). The chat layer / UI should render
   * this verbatim so the user understands the score is based on limited data.
   * Absent (undefined) when there is no notice to surface.
   *
   * See: `attachLimitedDataNotice` for the gating rules and
   * `docs/operations/post-launch-backlog.md` "[P1] Alignment returns kept: 0
   * silently for unmapped concerns" for the user-impact context.
   */
  notice?: string;
}

export interface AlignmentNotFound {
  found: false;
  unavailable: { reason: string };
}

export type AlignmentLookupResult = AlignmentResult | AlignmentNotFound;

/** Threshold below which the alignment lookup is considered "thin data". */
const LIMITED_DATA_THRESHOLD = 5;

/**
 * Attach a "limited data" notice to an alignment result when the underlying
 * tag corpus is too thin to be statistically meaningful.
 *
 * Gating rules:
 *  - Only attaches when `result.found === true`. AlignmentNotFound is a
 *    passthrough; the existing `unavailable.reason` already conveys the issue.
 *  - Only attaches when `0 < total < LIMITED_DATA_THRESHOLD`. A `total` of 0
 *    typically co-occurs with `unavailable.reason` (no rows / DB not
 *    configured); stacking "Limited data: 0 votes" on top of that reads
 *    broken, so we suppress the notice in those cases.
 *  - Only attaches when `result.unavailable` is absent. If the caller has
 *    already flagged the lookup as unavailable, that signal takes precedence.
 *
 * Pure function. Tested directly in `alignment.test.ts`.
 */
export function attachLimitedDataNotice(
  result: AlignmentLookupResult,
): AlignmentLookupResult {
  if (!result.found) return result;
  if (result.unavailable) return result;
  if (result.total <= 0) return result;
  if (result.total >= LIMITED_DATA_THRESHOLD) return result;

  const noun = result.total === 1 ? "vote" : "votes";
  return {
    ...result,
    notice: `Limited data: only ${result.total} relevant ${noun} found for this issue (${result.kept} aligned with your stance). Score may not reflect the candidate's overall record.`,
  };
}

// ---------------------------------------------------------------------------
// Candidate resolution
// ---------------------------------------------------------------------------

/**
 * Strip GovTrack-style decorations from a stored candidate name so it can be
 * matched against a clean ballot name.
 *
 * The federal-votes ingest stores GovTrack's `person.name`, which is decorated:
 *   "Sen. Andrew Kim [D-NJ]"  ·  "Rep. Marc Veasey [D-TX]"
 * and occasionally the sortname form "Collins, Susan (Sen.) [R-ME]". Ballot
 * rosters (Google Civic / uploaded ballots) use the plain "Firstname Lastname"
 * form. This reduces the stored name to "Andrew Kim" / "Susan Collins".
 *
 * Exported for unit testing.
 */
export function cleanCandidateName(raw: string): string {
  let s = (raw ?? "").trim();
  // Trailing "[D-NJ]" / "[ID-VT]" party-state tag.
  s = s.replace(/\s*\[[A-Za-z]+-[A-Za-z]{2}\]\s*$/u, "");
  // Sortname "Collins, Susan (Sen.) [R-ME]" → "Susan Collins".
  const sortname = s.match(
    /^([^,]+),\s*(.+?)(?:\s*\((?:Sen|Rep|Del|Res|Com)\.?\))?$/u,
  );
  if (s.includes(",") && sortname) {
    s = `${sortname[2].trim()} ${sortname[1].trim()}`;
  }
  // Leading honorific title.
  s = s.replace(
    /^(?:sen|rep|del|com|res|gov|senator|representative)\.?\s+/iu,
    "",
  );
  // Stray "(Sen.)" left mid-string.
  s = s.replace(/\s*\((?:sen|rep|del|res|com)\.?\)\s*/iu, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Extract the 2-letter state from a "[D-NJ]" decoration, or null. */
export function stateFromCandidateName(raw: string): string | null {
  const m = (raw ?? "").match(/\[[A-Za-z]+-([A-Za-z]{2})\]/u);
  return m ? m[1].toUpperCase() : null;
}

/** First / last name tokens of a cleaned "Firstname … Lastname" string. */
export function candidateNameParts(clean: string): {
  first: string;
  last: string;
} {
  const toks = (clean ?? "").trim().split(/\s+/).filter(Boolean);
  if (toks.length === 0) return { first: "", last: "" };
  return { first: toks[0], last: toks[toks.length - 1] };
}

interface ParsedCandidateRow {
  id: string;
  rawLower: string;
  clean: string;
  cleanLower: string;
  state: string | null;
  first: string;
  last: string;
}

/**
 * Resolve a candidate id from a ballot name + jurisdiction (+ optional state).
 *
 * Match tiers, most-precise first:
 *   1. Exact match on the raw stored name (back-compat for clean stored data).
 *   2. Exact match on the decoration-stripped stored name — handles
 *      "Sen. John Cornyn [R-TX]" ↔ "John Cornyn".
 *   3. Lastname + state — handles ballot nicknames vs GovTrack formal names
 *      ("Andy Kim" ↔ "Andrew Kim [D-NJ]"). State is taken from the stored
 *      decoration; the caller passes the ballot's state to disambiguate. When
 *      one lastname+state row exists it wins; multiple are broken by first
 *      initial, and a still-ambiguous set is left to the prefix tiers rather
 *      than guessed.
 *   4. Prefix / reverse-prefix on the cleaned name (middle initials, suffixes).
 *
 * `stateCode` is optional for back-compat (the chat tools pass it; older
 * callers may not). Without it, tier 3 is skipped.
 *
 * The jurisdiction narrows the search to the right chamber so same-name
 * candidates across chambers don't collide.
 */
export async function resolveCandidateId(
  candidateName: string,
  jurisdiction: string,
  stateCode?: string,
): Promise<string | null> {
  const db = getDb();
  if (db === DB_NOT_CONFIGURED) return null;

  const rawQuery = candidateName.trim();
  if (!rawQuery) return null;
  const queryLower = rawQuery.toLowerCase();
  const cleanQuery = cleanCandidateName(rawQuery);
  const cleanQueryLower = cleanQuery.toLowerCase();
  const queryParts = candidateNameParts(cleanQuery);

  const rows = await db
    .select({ id: schema.candidates.id, fullName: schema.candidates.fullName })
    .from(schema.candidates)
    .where(eq(schema.candidates.jurisdiction, jurisdiction));

  const parsed: ParsedCandidateRow[] = rows.map((r) => {
    const clean = cleanCandidateName(r.fullName);
    const parts = candidateNameParts(clean);
    return {
      id: r.id,
      rawLower: r.fullName.trim().toLowerCase(),
      clean,
      cleanLower: clean.toLowerCase(),
      state: stateFromCandidateName(r.fullName),
      first: parts.first,
      last: parts.last,
    };
  });

  // 1 + 2. Exact on raw, then on cleaned.
  const exact =
    parsed.find((p) => p.rawLower === queryLower) ??
    parsed.find((p) => p.cleanLower === cleanQueryLower);
  if (exact) return exact.id;

  // 3. Lastname (+ state when available). Ballots usually list SURNAMES only
  // ("NORCROSS", "BOOKER"), so this tier must resolve a bare lastname when it
  // maps to one person.
  //
  // The stored name's state is parsed from a GovTrack-style "[D-NJ]"
  // decoration — but the prod DB has MIXED formats: some rows are decorated
  // (re-ingest), some are clean with no state on file (older dump). So state
  // is used to EXCLUDE contradicting rows, not as a hard requirement: a row
  // whose state matches the ballot OR has no state on file is "compatible";
  // a row with a different state is not.
  if (stateCode && queryParts.last) {
    const st = stateCode.toUpperCase();
    const qLast = queryParts.last.toLowerCase();
    const byLast = parsed.filter((p) => p.last.toLowerCase() === qLast);
    // Prefer exact state matches; else fall back to rows that don't contradict
    // the ballot state (state matches or is unknown on file).
    const stateMatched = byLast.filter((p) => p.state === st);
    const compatible = byLast.filter((p) => p.state === st || p.state === null);
    const pool = stateMatched.length > 0 ? stateMatched : compatible;
    const distinctIds = new Set(pool.map((p) => p.id));
    if (distinctIds.size === 1) return pool[0].id;
    if (distinctIds.size > 1) {
      // A surname-only query ("NORCROSS") has no real first name —
      // queryParts.first is the surname itself — so the first-initial tiebreak
      // is meaningless and must be skipped. Only disambiguate by initial when
      // the query actually carries a distinct first name ("Mike Kelly").
      const queryIsSurnameOnly = queryParts.first.toLowerCase() === qLast;
      if (!queryIsSurnameOnly) {
        const qInitial = queryParts.first[0]?.toLowerCase();
        const byInitial = pool.filter(
          (p) => p.first[0]?.toLowerCase() === qInitial,
        );
        if (new Set(byInitial.map((p) => p.id)).size === 1) {
          return byInitial[0].id;
        }
      }
      // Genuinely ambiguous (multiple distinct people, can't disambiguate) →
      // fall through to the prefix tiers rather than guess.
    }
  }

  // 4. Prefix / reverse-prefix on the cleaned name.
  const prefix = parsed.find(
    (p) => cleanQueryLower && p.cleanLower.startsWith(cleanQueryLower),
  );
  if (prefix) return prefix.id;
  const reversePrefix = parsed.find(
    (p) => p.cleanLower && cleanQueryLower.startsWith(p.cleanLower),
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

  const base: AlignmentResult = {
    found: true,
    candidateId,
    kept,
    total,
    contributingVotes,
  };

  // Surface a "limited data" notice when the tag corpus is too thin for the
  // score to be meaningful. Gated by `attachLimitedDataNotice` — see helper.
  const withNotice = attachLimitedDataNotice(base);
  // attachLimitedDataNotice preserves discriminated union; we know it's
  // AlignmentResult here because we passed an AlignmentResult in.
  return withNotice as AlignmentResult;
}
