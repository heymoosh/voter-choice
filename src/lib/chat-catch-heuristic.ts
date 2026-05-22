/**
 * Phase 6 — conservative chat-catch detector.
 *
 * Decides whether a user message in the workspace chat should trigger a soft
 * "I noticed you mentioned X — want to add it as a theme?" proposal chip. The
 * packet calls this out as load-bearing:
 *
 *   "Workers must NOT trigger chat catches aggressively — false positives
 *   are worse than misses. Conservative threshold; soft proposal UI."
 *
 * Rules (v1):
 *   · message must be at least 50 chars (filters acknowledgements + small talk)
 *   · message must contain at least one DOMAIN_KEYWORDS entry (case-insensitive
 *     whole-token match, lightly tolerant — matches "school funding" against
 *     "school")
 *   · NONE of the currently-locked themes should already cover those keywords
 *     (case-insensitive substring match against theme name OR theme quote)
 *
 * The keyword list is intentionally short and curated for v1 — concrete civic
 * issue language. We err on the side of recall over precision (a missed catch
 * is fine because the user can click the rail's "Edit themes" link). The list
 * is meant to be tuned over time as real chat traffic surfaces gaps.
 *
 * Fires CLIENT-SIDE ONLY on user-message submit. No server roundtrip; no
 * dependency on the assistant response. The proposal chip is rendered inline
 * in the chat thread and dismissed by clicking through to the editor or by
 * the user continuing to send another message.
 */

/**
 * v1 curated keyword list — concrete civic issue language.
 *
 * Keep this short. Each keyword is matched as a case-insensitive substring
 * against (a) the user's message, and (b) the currently-locked theme names +
 * quotes. Tune over time as real chat traffic surfaces gaps; do not expand
 * aggressively (false positives are worse than misses).
 */
const DOMAIN_KEYWORDS: readonly string[] = [
  "jobs",
  "school",
  "school funding",
  "ice",
  "tax",
  "rent",
  "housing",
  "healthcare",
  "insurance",
  "border",
  "abortion",
  "guns",
  "police",
  "climate",
  "environment",
  "education",
  "homeless",
  "drugs",
  "transit",
];

const MIN_MESSAGE_LENGTH = 50;

export interface ChatCatchHeuristicInput {
  message: string;
  currentThemes: { name: string; quotes: string[] }[];
}

export interface ChatCatchHeuristicResult {
  suggest: boolean;
  /** Short human-readable explanation for logging / dev-tools. */
  reason: string;
  /** Keywords from DOMAIN_KEYWORDS that hit; empty when suggest=false. */
  suggestedKeywords?: string[];
}

export function shouldSuggestAmend(
  input: ChatCatchHeuristicInput,
): ChatCatchHeuristicResult {
  const message = input.message ?? "";

  if (message.length < MIN_MESSAGE_LENGTH) {
    return {
      suggest: false,
      reason: `message length ${message.length} below threshold ${MIN_MESSAGE_LENGTH}`,
    };
  }

  const messageLower = message.toLowerCase();
  const hitKeywords = DOMAIN_KEYWORDS.filter((kw) =>
    messageLower.includes(kw.toLowerCase()),
  );

  if (hitKeywords.length === 0) {
    return {
      suggest: false,
      reason: "no domain-flagged keywords in message",
    };
  }

  // Check whether the hit keywords are already represented in locked themes.
  // Coverage uses the FULL hit list (not the deduped one) — if the broader
  // term "school" already appears in a locked theme, treat the more specific
  // "school funding" mention as covered too. This is intentionally
  // conservative: prefer skipping the proposal over false-positive chips.
  const themeHaystack = input.currentThemes
    .flatMap((t) => [t.name, ...t.quotes])
    .map((s) => s.toLowerCase())
    .join(" ⏷ ");

  const isCovered = hitKeywords.some((kw) =>
    themeHaystack.includes(kw.toLowerCase()),
  );
  if (isCovered) {
    return {
      suggest: false,
      reason: "at least one hit keyword already covered by locked themes",
    };
  }

  // De-dupe surfaced keywords: prefer the more specific match.
  const uncoveredKeywords = hitKeywords.filter(
    (kw) =>
      !hitKeywords.some(
        (other) =>
          other !== kw && other.length > kw.length && other.includes(kw),
      ),
  );

  return {
    suggest: true,
    reason: `uncovered domain keyword(s): ${uncoveredKeywords.join(", ")}`,
    suggestedKeywords: uncoveredKeywords,
  };
}

/** Exported for tests / future tuning. */
export const _DOMAIN_KEYWORDS = DOMAIN_KEYWORDS;
