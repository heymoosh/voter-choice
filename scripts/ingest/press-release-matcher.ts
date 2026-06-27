/**
 * scripts/ingest/press-release-matcher.ts
 *
 * Pure matching logic: does a member press release relate to a roll-call vote?
 *
 * Data source: congress-press by Derek Willis
 *   https://github.com/dwillis/congress-press
 *   MIT licensed — Copyright (c) 2026 Derek Willis
 *
 * Matching strategy (bill number + date window):
 *   1. "High" confidence   — the bill number (e.g. "H.R. 1234", "S. 42",
 *      "H.J.Res. 7") appears verbatim in the press release text or title.
 *   2. "Medium" confidence — a significant keyword from the bill's title
 *      appears in the release AND the release date is within the window.
 *   3. "Low" confidence    — the release date is within the window but no
 *      explicit bill or keyword reference was found. Only useful as a last
 *      resort when the member issued a timed statement.
 *
 * Exclusion rules (card spec):
 *   - Exclude "Personal Explanations" — Congressional Record entries that
 *     cover MISSED votes. Identified by:
 *       (a) the text contains the phrase "personal explanation" (case-insensitive), or
 *       (b) the title matches the PERSONAL_EXPLANATION_PATTERN regex.
 *   - Procedural-only releases (e.g. floor scheduling notices) do not
 *     produce a rationale; they are filtered by the "no keyword match and
 *     low confidence only" gate higher in the ingest pipeline.
 *
 * This module is a pure function library — no DB, no network. Safe to import
 * in unit tests without any environment setup.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single record from the congress-press JSONL bulk download. */
export interface CongressPressRelease {
  /** Unique release identifier (sequential in the JSONL). */
  id?: string | number;
  /** Member's bioguide ID, e.g. "K000367". */
  bioguide_id: string;
  /** ISO-8601 date or datetime string of the press release. */
  date: string;
  /** Headline / subject line. */
  title: string;
  /** Full text of the press release. May be multi-paragraph. */
  text: string;
  /** Original .gov URL for the press release (required for attribution). */
  url: string;
}

/** A roll-call vote we want to find press-release matches for. */
export interface RollCallVote {
  /** bill id as stored in our `bills` table (e.g. "govtrack-hr1234-118"). */
  billId: string;
  /** The bill's display title (used for keyword extraction). */
  billTitle: string;
  /**
   * Bill number tokens as they appear in human-readable text.
   * Include variations: "H.R. 1234", "HR1234", "H.R.1234".
   * The matcher checks all of them.
   */
  billNumberTokens: string[];
  /** ISO-8601 date of the vote (YYYY-MM-DD). */
  voteDate: string;
  /** Candidate's bioguide ID — only releases from THIS member are matched. */
  bioguideId: string;
}

/** Result of matching one press release against one roll-call vote. */
export type MatchConfidence = "high" | "medium" | "low" | "no_match";

export interface MatchResult {
  confidence: MatchConfidence;
  /** True when the release was excluded (Personal Explanation / procedural). */
  excluded: boolean;
  /** Human-readable reason for exclusion (for logging). */
  exclusionReason?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Window around the vote date in which a press release is considered relevant.
 * Members typically issue statements within a few days before or after a vote.
 * 7 days pre-vote → 7 days post-vote = 14-day window.
 */
export const DATE_WINDOW_DAYS_BEFORE = 7;
export const DATE_WINDOW_DAYS_AFTER = 7;

/**
 * Regex for Congressional Record "Personal Explanation" entries.
 * These cover MISSED votes and MUST be excluded (card spec).
 *
 * Matches:
 *   - "Personal Explanation"
 *   - "personal explanation"
 *   - "PERSONAL EXPLANATION"
 */
export const PERSONAL_EXPLANATION_PATTERN = /\bpersonal\s+explanation\b/i;

/**
 * Stopwords excluded from bill-title keyword extraction.
 * Short, common words that appear in nearly every bill title and add noise.
 */
const TITLE_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "act",
  "bill",
  "in",
  "on",
  "at",
  "by",
  "as",
  "is",
  "be",
  "it",
  "this",
  "that",
  "with",
  "from",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "not",
  "its",
  "into",
  "such",
  "than",
  "then",
  "when",
  "which",
  "who",
  "will",
  "would",
  "could",
  "should",
]);

/**
 * Minimum length for a keyword extracted from a bill title.
 * Single-character tokens and very short words are filtered out.
 */
const MIN_KEYWORD_LENGTH = 4;

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Parse an ISO-8601 date or datetime string to a YYYY-MM-DD date string.
 * Returns null for unparseable values.
 */
export function toDateString(isoish: string): string | null {
  if (!isoish) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(isoish.trim());
  return m ? m[1] : null;
}

/**
 * Compute the inclusive date bounds for the matching window around a vote date.
 *
 * @returns { earliest, latest } as YYYY-MM-DD strings.
 */
export function computeDateWindow(voteDateIso: string): {
  earliest: string;
  latest: string;
} {
  const vote = new Date(`${voteDateIso}T00:00:00Z`);
  const before = new Date(vote);
  before.setUTCDate(before.getUTCDate() - DATE_WINDOW_DAYS_BEFORE);
  const after = new Date(vote);
  after.setUTCDate(after.getUTCDate() + DATE_WINDOW_DAYS_AFTER);
  return {
    earliest: before.toISOString().slice(0, 10),
    latest: after.toISOString().slice(0, 10),
  };
}

/**
 * True when `releaseDateIso` falls within [earliest, latest] inclusive.
 */
export function isWithinWindow(
  releaseDateIso: string,
  earliest: string,
  latest: string,
): boolean {
  const d = toDateString(releaseDateIso);
  if (!d) return false;
  return d >= earliest && d <= latest;
}

// ---------------------------------------------------------------------------
// Personal Explanation detector
// ---------------------------------------------------------------------------

/**
 * Returns true when a press release should be excluded as a "Personal
 * Explanation" — a Congressional Record entry that explains a MISSED vote,
 * NOT a rationale for an actual vote.
 *
 * Checks both the title and the text body.
 */
export function isPersonalExplanation(release: CongressPressRelease): boolean {
  return (
    PERSONAL_EXPLANATION_PATTERN.test(release.title) ||
    PERSONAL_EXPLANATION_PATTERN.test(release.text)
  );
}

// ---------------------------------------------------------------------------
// Bill number normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a bill number token for case-insensitive substring matching.
 * Strips dots and spaces so "H.R. 1234" → "hr1234".
 */
function normalizeBillToken(token: string): string {
  return token.toLowerCase().replace(/[\s.]+/g, "");
}

/**
 * True when ANY of the bill number tokens appears in the release text/title.
 * Matching is case-insensitive and ignores punctuation/spaces in the token.
 */
export function releaseContainsBillNumber(
  release: CongressPressRelease,
  billNumberTokens: string[],
): boolean {
  const haystack = `${release.title} ${release.text}`.toLowerCase();
  // Normalize the haystack too (strip punctuation between bill prefix and number)
  const normalizedHaystack = haystack.replace(/[\s.]+/g, "");
  return billNumberTokens.some((token) => {
    const norm = normalizeBillToken(token);
    return normalizedHaystack.includes(norm);
  });
}

// ---------------------------------------------------------------------------
// Keyword extraction
// ---------------------------------------------------------------------------

/**
 * Extract significant keywords from a bill title for medium-confidence matching.
 *
 * Strategy: lowercase → split on non-word chars → filter stopwords and short
 * tokens → return the remaining tokens. These are used for substring search in
 * the release body.
 *
 * Examples:
 *   "Inflation Reduction Act" → ["inflation", "reduction"]
 *   "H.R. 5376 — Save Our Seas" → ["save", "seas"]
 */
export function extractBillKeywords(billTitle: string): string[] {
  return billTitle
    .toLowerCase()
    .split(/[\W_]+/)
    .filter(
      (token) =>
        token.length >= MIN_KEYWORD_LENGTH && !TITLE_STOPWORDS.has(token),
    );
}

/**
 * True when ANY of the bill keywords appears in the release text/title.
 * The release haystack is lowercased but NOT normalized (we want real word
 * presence, not bill-number-style compact matching).
 */
export function releaseContainsBillKeyword(
  release: CongressPressRelease,
  keywords: string[],
): boolean {
  if (keywords.length === 0) return false;
  const haystack = `${release.title} ${release.text}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

// ---------------------------------------------------------------------------
// Core matcher
// ---------------------------------------------------------------------------

/**
 * Match a single press release against a roll-call vote.
 *
 * Precedence:
 *   excluded  → { excluded: true, confidence: "no_match" }
 *   high      → bill number token found in release (regardless of date window
 *               — a release the day after the vote mentioning the bill number
 *               is still highly relevant; date is used as a secondary signal
 *               to surface warnings rather than disqualify)
 *   medium    → within date window AND bill keyword found
 *   low       → within date window only
 *   no_match  → none of the above
 *
 * The member check (bioguide_id match) is enforced by the caller (ingest
 * script) before this function is called, not here, for separation of concerns.
 */
export function matchReleaseToVote(
  release: CongressPressRelease,
  vote: RollCallVote,
): MatchResult {
  // --- Exclusion check first ---
  if (isPersonalExplanation(release)) {
    return {
      confidence: "no_match",
      excluded: true,
      exclusionReason: "personal_explanation",
    };
  }

  const { earliest, latest } = computeDateWindow(vote.voteDate);
  const withinWindow = isWithinWindow(release.date, earliest, latest);

  // --- High confidence: bill number verbatim ---
  if (releaseContainsBillNumber(release, vote.billNumberTokens)) {
    return { confidence: "high", excluded: false };
  }

  // --- Medium confidence: keyword + date window ---
  const keywords = extractBillKeywords(vote.billTitle);
  if (withinWindow && releaseContainsBillKeyword(release, keywords)) {
    return { confidence: "medium", excluded: false };
  }

  // --- Low confidence: date window only ---
  if (withinWindow) {
    return { confidence: "low", excluded: false };
  }

  // --- No match ---
  return { confidence: "no_match", excluded: false };
}

/**
 * Filter a list of press releases to those that match a roll-call vote,
 * returning only matches above a minimum confidence threshold.
 *
 * Typical usage: pass minConfidence = "medium" to avoid noise from low-signal
 * date-window-only matches. Use "low" when you want maximum recall.
 */
export function filterMatchingReleases(
  releases: CongressPressRelease[],
  vote: RollCallVote,
  minConfidence: "high" | "medium" | "low" = "medium",
): Array<{ release: CongressPressRelease; result: MatchResult }> {
  const confidenceRank: Record<MatchConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
    no_match: 0,
  };
  const threshold = confidenceRank[minConfidence];

  return releases
    .map((release) => ({ release, result: matchReleaseToVote(release, vote) }))
    .filter(
      ({ result }) =>
        !result.excluded && confidenceRank[result.confidence] >= threshold,
    );
}
