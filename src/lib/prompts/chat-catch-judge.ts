/**
 * Chat-catch judgment sub-agent prompt.
 *
 * Used by `runChatCatchSubAgent` (src/lib/server/chat-catch-sub-agent.ts) on
 * the POST /api/chat-catch endpoint. The sub-agent decides whether a voter's
 * latest chat message expresses a NEW civic concern not already covered by
 * their currently-locked priority themes — and, if so, what neutral noun
 * phrase to surface as a proposed new theme.
 *
 * Why AI-judged instead of keyword-matched (fix J):
 *   The legacy chat-catch heuristic shipped a curated 19-keyword list (jobs,
 *   ICE, guns, abortion, police, …). Per user post-redesign feedback: those
 *   keywords pre-determined what users "care about" and several of them
 *   leaned politically — "I'm worried about guns" could mean gun safety OR
 *   gun rights; "I'm worried about ICE" could mean restriction OR
 *   protection. The list itself was a values posture, not a neutral
 *   substrate. This prompt replaces the keyword list with a small AI
 *   judgment call so neutrality is enforced by output contract (no advocacy
 *   verbs, no party labels) rather than by curating a "safe" word list.
 *
 * Composed with `prependSafetyHeader` at the call site (same pattern as the
 * other v2 prompt fleet members) — keep this body header-free.
 */

import type { Theme } from "./types";

export interface ChatCatchJudgeInput {
  /** The user's latest chat message (already PII-stripped server-side). */
  userMessage: string;
  /** The user's currently-locked themes (name + quotes). */
  currentThemes: Theme[];
}

export function buildChatCatchJudgePrompt(input: ChatCatchJudgeInput): string {
  const themesList =
    input.currentThemes.length === 0
      ? "    (none yet)"
      : input.currentThemes.map((t, i) => `    ${i + 1}. ${t.name}`).join("\n");
  return `You judge whether a voter's chat message expresses a NEW concern not covered by their current priority themes.

Their currently locked themes:
  <current_themes>
${themesList}
  </current_themes>

Their latest message:
  <message>${input.userMessage}</message>

Decide:
  · If the message expresses a CIVIC ISSUE or POLICY CONCERN not already covered by an existing theme → suggest:true
  · If the message is a question, acknowledgement, clarification, or a topic already covered → suggest:false
  · Be conservative — false positives erode trust. Only flag when the new concern is concrete and policy-shaped.

Return JSON ONLY, no prose:
  {
    "suggest": true,
    "suggested_theme_name": "<short neutral 3-7 word noun phrase, no advocacy verbs, no party labels>",
    "summary": "<one-sentence rationale, ≤25 words>"
  }
  OR
  { "suggest": false }`;
}
