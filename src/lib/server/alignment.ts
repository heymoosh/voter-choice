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
import { isCan2026DisplayEnabled } from "./can-flag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContributingVote {
  billTitle: string;
  /** "with" = voted on the user's side; "against" = voted against the user's side */
  voteCast: "with" | "against";
  date: string; // YYYY-MM-DD
  source: { name: string; url: string };
  /**
   * Additional source attributions beyond the primary `source`. Populated when
   * the LLM plain_summary (CRS-derived) is used — a Congress.gov entry is
   * appended so the data provenance is visible in the UI.
   */
  sources?: Array<{ name: string; url: string }>;
  /**
   * Bill-level "What it did" prose. Always plain text — never HTML.
   * Populated from two sources, in precedence order:
   *   1. can_bill_narratives.narrative — when CAN2026_DISPLAY_ENABLED is set
   *      and the bill has a linked CAN2026 row (curated, gated).
   *   2. bills.plain_summary — LLM-generated short plain-language summary
   *      (≤2 sentences) from scripts/ingest/summarize-bills.ts (ungated).
   *      Rendered in full; never truncated or ellipsized.
   * Absent when neither source has content — the UI shows the bill title +
   * roll-call + Congress.gov link but NO inline summary paragraph.
   */
  narrative?: string;
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
  /**
   * The sub-issue facet the score was actually computed from, set ONLY when the
   * caller passed a `subIssue` AND the sub-issue-specific row set had enough
   * scorable votes to PREFER it over the parent corpus. Absent when no subIssue
   * was requested or when the lookup FELL BACK to the parent (sparse sub-rows).
   */
  matchedSubIssue?: string;
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
  // Trailing party-state tag. Senators are "[D-NJ]" (state only); House members
  // carry a district digit — "[D-NJ1]" / "[R-NC12]". The trailing \d* matches
  // both so a House surname parses (mirrors the ingest side's \d* in
  // federal-donors.ts); without it Norcross's last name read as "[d-nj1]" and
  // resolveCandidateId missed him (breaking BOTH alignment and donors).
  s = s.replace(/\s*\[[A-Za-z]+-[A-Za-z]{2}\d*\]\s*$/u, "");
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

/** Extract the 2-letter state from a "[D-NJ]" or House "[D-NJ1]" decoration. */
export function stateFromCandidateName(raw: string): string | null {
  const m = (raw ?? "").match(/\[[A-Za-z]+-([A-Za-z]{2})\d*\]/u);
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
    const queryIsSurnameOnly = queryParts.first.toLowerCase() === qLast;
    // Resolve to the single distinct candidate in a row set, else null.
    const onlyDistinct = (rows: ParsedCandidateRow[]): string | null => {
      const ids = new Set(rows.map((p) => p.id));
      return ids.size === 1 ? rows[0].id : null;
    };
    // Most specific → least specific. The DB's "[D-NJ]" state decoration is
    // INCONSISTENT (some rows decorated, some clean with no state, some with a
    // stale/wrong state), so we can't treat it as authoritative:
    //   (a) exact state match;
    //   (b) state matches OR is unknown on file (don't contradict the ballot);
    //   (c) last resort — a surname that is UNIQUE in this chamber resolves
    //       regardless of the unreliable state tag (a federal surname maps to
    //       one member; this is what makes "NORCROSS"/"PALLONE" resolve when
    //       their stored state is missing/wrong).
    const stateMatched = byLast.filter((p) => p.state === st);
    const compatible = byLast.filter((p) => p.state === st || p.state === null);
    const resolved =
      onlyDistinct(stateMatched) ??
      onlyDistinct(compatible) ??
      onlyDistinct(byLast);
    if (resolved) return resolved;
    // Multiple DISTINCT people share the surname. Disambiguate by first initial
    // (skip for a surname-only query, which has no real first name), preferring
    // rows whose state matches the ballot.
    if (!queryIsSurnameOnly) {
      const qInitial = queryParts.first[0]?.toLowerCase();
      const pool = stateMatched.length > 0 ? stateMatched : byLast;
      const byInitial = pool.filter(
        (p) => p.first[0]?.toLowerCase() === qInitial,
      );
      const initResolved = onlyDistinct(byInitial);
      if (initResolved) return initResolved;
    }
    // Genuinely ambiguous → fall through to the prefix tiers rather than guess.
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
 *
 * Read-path no_score guard (HANDOFF follow-up, 2026-06): any stance_lens
 * that is not exactly "in_favor"/"opposed" — e.g. a "no_score" row leaked by
 * a future re-tag — is treated as an abstain and excluded from totals.
 * Without this, a leaked no_score row silently reads as "opposed" direction
 * and corrupts the score. The 2026-06-06 cutover verified zero such rows in
 * prod (`_cutover-verify.ts`), so this is purely defensive today.
 */
export function computeVoteAlignment(
  voteCast: string,
  stanceLens: string,
  resolvedStance: "in_favor" | "opposed",
): "with" | "against" | "abstain" {
  if (stanceLens !== "in_favor" && stanceLens !== "opposed") return "abstain";
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
// Bill-number helpers
// ---------------------------------------------------------------------------

/**
 * Map raw GovTrack bill type strings to the short canonical form.
 * Mirrors the ingest-side `normalizeBillType` in scripts/ingest/federal-votes.ts
 * so that secondary rawMetadata fallback uses the same mapping.
 * Exported for unit testing.
 */
export function normalizeFederalType(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const normalized = raw.toLowerCase().replace(/[^a-z]/gu, "");
  const mapped: Record<string, string> = {
    hr: "hr",
    housebill: "hr",
    s: "s",
    senatebill: "s",
    hres: "hres",
    houseresolution: "hres",
    sres: "sres",
    senateresolution: "sres",
    hjres: "hjres",
    housejointresolution: "hjres",
    sjres: "sjres",
    senatejointresolution: "sjres",
    hconres: "hconres",
    houseconcurrentresolution: "hconres",
    sconres: "sconres",
    senateconcurrentresolution: "sconres",
  };
  return mapped[normalized] ?? (normalized || null);
}

/**
 * Extract a compact bill number (e.g. "HR-2", "S-1171", "HB-12") from a bill
 * row's rawMetadata, id, and source.
 *
 * Federal (govtrack):
 *   Primary — parse the deterministic `bills.id` format "govtrack-<type><number>-<congress>"
 *   Secondary — rawMetadata.govtrack.bill.{type|bill_type, number}
 *
 * State (openstates):
 *   rawMetadata.openstates.identifier (e.g. "HB 12" → "HB-12")
 *
 * Returns null when no number can be determined (cards fall back to title-only).
 * Exported for unit testing.
 */
export function extractBillNumber(
  rawMetadata: unknown,
  billId: unknown,
  source: unknown,
): string | null {
  const rm =
    rawMetadata && typeof rawMetadata === "object"
      ? (rawMetadata as Record<string, unknown>)
      : {};

  if (source === "govtrack") {
    // Primary: parse the deterministic id "govtrack-<type><number>-<congress>"
    const idStr = typeof billId === "string" ? billId : "";
    const idMatch = /^govtrack-([a-z]+)(\d+)-\d+$/i.exec(idStr);
    if (idMatch) {
      return `${idMatch[1].toUpperCase()}-${idMatch[2]}`;
    }

    // Secondary: rawMetadata.govtrack.bill.{type|bill_type, number}
    const gt = rm.govtrack as Record<string, unknown> | undefined;
    const bill = gt?.bill as Record<string, unknown> | undefined;
    if (bill) {
      const rawType = bill.type ?? bill.bill_type;
      const type = normalizeFederalType(rawType);
      const num = String(bill.number ?? "").replace(/\D/gu, "");
      if (type && num) return `${type.toUpperCase()}-${num}`;
    }

    return null;
  }

  if (source === "openstates") {
    const ops = rm.openstates as Record<string, unknown> | undefined;
    const ident = ops?.identifier;
    if (ident && typeof ident === "string" && ident.trim()) {
      return ident.trim().replace(/\s+/gu, "-");
    }
    return null;
  }

  return null;
}

/**
 * Remove a leading embedded bill-number prefix that GovTrack sometimes includes
 * in the bill title (e.g. "H.R. 21 (118th): Strategic Production Response Act").
 * Only strips when an explicit `:` / `-` / `–` / `—` separator follows the
 * number token, so real titles starting with a letter+digit token aren't touched.
 * Falls back to the original title if stripping would produce an empty string.
 * Exported for unit testing.
 */
export function stripLeadingBillNumber(title: string): string {
  const stripped = title.replace(
    /^\s*(?:H\.?\s?R\.?|S\.?|H\.?J\.?\s?Res\.?|S\.?J\.?\s?Res\.?|H\.?\s?Res\.?|S\.?\s?Res\.?|H\.?\s?Con\.?\s?Res\.?|S\.?\s?Con\.?\s?Res\.?|HB|SB|HR|SR)\s*\.?\s*\d+\s*(?:\(\d+(?:th|st|nd|rd)?\))?\s*[:\-–—]\s*/iu,
    "",
  );
  return stripped.trim() || title;
}

/**
 * Build a Congress.gov bill URL from a govtrack-style bill id.
 *
 * The govtrack id format is "govtrack-<type><number>-<congress>", e.g.:
 *   "govtrack-hr1234-118" → https://www.congress.gov/bill/118th-congress/house-bill/1234
 *   "govtrack-s5-119"     → https://www.congress.gov/bill/119th-congress/senate-bill/5
 *
 * The Congress.gov bill-type path segment mapping:
 *   hr    → house-bill
 *   s     → senate-bill
 *   hres  → house-resolution
 *   sres  → senate-resolution
 *   hjres → house-joint-resolution
 *   sjres → senate-joint-resolution
 *   hconres → house-concurrent-resolution
 *   sconres → senate-concurrent-resolution
 *
 * Returns null when the id can't be parsed (non-govtrack bills, state bills).
 * Exported for unit testing.
 */
export function buildCongressGovUrl(billId: unknown): string | null {
  const idStr = typeof billId === "string" ? billId : "";
  const m = /^govtrack-([a-z]+)(\d+)-(\d+)$/i.exec(idStr);
  if (!m) return null;

  const typeRaw = m[1].toLowerCase();
  const number = m[2];
  const congress = m[3];

  const typeMap: Record<string, string> = {
    hr: "house-bill",
    s: "senate-bill",
    hres: "house-resolution",
    sres: "senate-resolution",
    hjres: "house-joint-resolution",
    sjres: "senate-joint-resolution",
    hconres: "house-concurrent-resolution",
    sconres: "senate-concurrent-resolution",
  };

  const segment = typeMap[typeRaw];
  if (!segment) return null;

  const suffix =
    congress === "1"
      ? "1st"
      : congress === "2"
        ? "2nd"
        : congress === "3"
          ? "3rd"
          : `${congress}th`;

  return `https://www.congress.gov/bill/${suffix}-congress/${segment}/${number}`;
}

/**
 * Append a Congress.gov source-attribution entry to a contributing-vote when
 * its narrative comes from the (public-domain) CRS data — either the LLM
 * `plain_summary` derived from it, or the raw CRS summary fallback.
 */
function attachCongressGovSource(
  vote: ContributingVote,
  billId: unknown,
): void {
  const cgUrl = buildCongressGovUrl(billId);
  vote.sources = [
    {
      name: "Congress.gov (CRS summary)",
      url: cgUrl ?? "https://www.congress.gov",
    },
  ];
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
  subIssue?: string,
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

  const can2026Enabled = isCan2026DisplayEnabled();
  const cutoff = fourYearsAgo();

  // Join votes → bills → issue_tags filtered by candidate + issue + date window.
  // When CAN2026_DISPLAY_ENABLED is set, also LEFT JOIN can_bill_narratives so
  // the "What it did" prose can appear on the contributing-vote cards. The join
  // is keyed on bills.id = can_bill_narratives.our_bill_id (the crosswalk
  // populated by scripts/ingest/can2026.ts). When the flag is off, the CAN2026
  // table is never touched and narrative is always undefined.
  const rows = can2026Enabled
    ? await db
        .select({
          billTitle: schema.bills.title,
          billId: schema.bills.id,
          billRawMetadata: schema.bills.rawMetadata,
          billSourceUrl: schema.bills.sourceUrl,
          billSource: schema.bills.source,
          billPlainSummary: schema.bills.plainSummary,
          voteCast: schema.votes.voteCast,
          voteDate: schema.votes.voteDate,
          stanceLens: schema.issueTags.stanceLens,
          taggerConfidence: schema.issueTags.taggerConfidence,
          subIssue: schema.issueTags.subIssue,
          narrative: schema.canBillNarratives.narrative,
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
        .leftJoin(
          schema.canBillNarratives,
          eq(schema.bills.id, schema.canBillNarratives.ourBillId),
        )
        .where(
          and(
            eq(schema.votes.candidateId, candidateId),
            gte(schema.votes.voteDate, cutoff),
          ),
        )
    : await db
        .select({
          billTitle: schema.bills.title,
          billId: schema.bills.id,
          billRawMetadata: schema.bills.rawMetadata,
          billSourceUrl: schema.bills.sourceUrl,
          billSource: schema.bills.source,
          billPlainSummary: schema.bills.plainSummary,
          voteCast: schema.votes.voteCast,
          voteDate: schema.votes.voteDate,
          stanceLens: schema.issueTags.stanceLens,
          taggerConfidence: schema.issueTags.taggerConfidence,
          subIssue: schema.issueTags.subIssue,
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

  // Sub-issue prefer/fallback: when the caller passes a sub-issue facet, PREFER
  // the sub-issue-specific votes if they alone meet the data threshold; else
  // FALL BACK to the full parent corpus so a score is never worse than today.
  // The threshold is measured on SCORABLE rows (abstains excluded) so a handful
  // of present/absent sub-rows can't trip the prefer path. The inner join stays
  // keyed on (billId AND canonicalIssue) only — sub-issue selection happens here
  // in app code, not in SQL.
  let workingRows = rows;
  let matchedSubIssue: string | undefined;
  if (subIssue) {
    const subRows = rows.filter((r) => r.subIssue === subIssue);
    const scorableSubCount = subRows.filter(
      (r) =>
        computeVoteAlignment(r.voteCast, r.stanceLens, resolvedStance) !==
        "abstain",
    ).length;
    if (scorableSubCount >= LIMITED_DATA_THRESHOLD) {
      workingRows = subRows;
      matchedSubIssue = subIssue;
    }
  }

  // Compute alignment for each row (exclude abstains from totals)
  const scored = workingRows
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
    .map((r) => {
      const num = extractBillNumber(r.billRawMetadata, r.billId, r.billSource);
      const title = stripLeadingBillNumber(r.billTitle) || r.billTitle;
      const vote: ContributingVote = {
        billTitle: num ? `${num} · ${title}` : title,
        voteCast: r.alignment as "with" | "against",
        date: r.voteDate,
        source: {
          name: r.billSource,
          url: r.billSourceUrl,
        },
      };

      // Narrative precedence (the narrative is ALWAYS plain text —
      // never HTML — because the UI renders it as a JSX text node):
      //   1. CAN2026 narrative (gated — only present in the can2026Enabled query
      //      branch when a can_bill_narratives row exists for this bill).
      //   2. bills.plain_summary (LLM-generated short summary, ungated). Rendered
      //      IN FULL (it's already ≤2 sentences). Appends a Congress.gov entry to
      //      vote.sources for provenance.
      //   3. None → narrative stays absent. The user sees the bill title (heading)
      //      + roll-call + the Congress.gov chip/link to read the full CRS text.
      //      Do NOT show any truncated or ellipsized preview of raw bills.summary.
      const can2026Narrative = (r as { narrative?: string | null }).narrative;
      const plainSummary = (r as { billPlainSummary?: string | null })
        .billPlainSummary;

      if (can2026Narrative) {
        vote.narrative = can2026Narrative;
      } else if (plainSummary && plainSummary.trim()) {
        vote.narrative = plainSummary.trim();
        attachCongressGovSource(vote, r.billId);
      }

      return vote;
    });

  const base: AlignmentResult = {
    found: true,
    candidateId,
    kept,
    total,
    contributingVotes,
    // Set only when the prefer path fired; undefined keys are omitted by the
    // discriminated-union consumers, so this stays a no-op for the parent path.
    ...(matchedSubIssue ? { matchedSubIssue } : {}),
  };

  // Surface a "limited data" notice when the tag corpus is too thin for the
  // score to be meaningful. Gated by `attachLimitedDataNotice` — see helper.
  const withNotice = attachLimitedDataNotice(base);
  // attachLimitedDataNotice preserves discriminated union; we know it's
  // AlignmentResult here because we passed an AlignmentResult in.
  return withNotice as AlignmentResult;
}
