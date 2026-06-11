/* Chat block-code routing + markdown stripping for the delegation workspace's
   seat chat. Ported verbatim from the shipped prototype (VoterChoiceApp.tsx —
   stripChatMd / CHAT_BLOCK_MESSAGES / CHAT_BUDGET_CODES / resolveChatBlock) as
   a typed, unit-testable module so the redesign never imports workspace-only
   internals from the monolith. */

/** The chat route's prompt forbids markdown, but the model still emits
 *  bold/italic/code markers occasionally and the bubble renders raw text —
 *  strip the common markers at render so the voter never sees literal
 *  asterisks. Plain prose only. */
export function stripChatMd(s: string): string {
  if (!s) return s;
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "");
}

/** Server block `code` → chat-specific banner message. Codes NOT in this map
 *  (AI_ERROR, unknown, missing) intentionally resolve to null → caller keeps
 *  the generic "AI is taking longer" retry banner. */
export const CHAT_BLOCK_MESSAGES: Record<string, string> = {
  RATE_LIMIT_UNAVAILABLE:
    "Chat is briefly unavailable — please try again in a moment.",
  DAILY_LIMIT:
    "You've reached today's chat session limit. Copy your prompt to continue in another chatbot.",
  SESSION_LIMIT: "You've reached this session's message limit.",
  CONCURRENT_LIMIT:
    "Too many chat sessions open at once — close other tabs and retry.",
  API_OVERLOADED: "The AI is busy right now — try again in a moment.",
  API_RATE_LIMIT: "The AI is busy right now — try again in a moment.",
};

/** Budget block codes route to the budget/handoff modal, not a banner. */
export const CHAT_BUDGET_CODES = new Set([
  "BUDGET_SOFT_CLOSE",
  "BUDGET_HANDOFF",
  "BUDGET_EXHAUSTED",
]);

export interface ChatBlockResolution {
  /** true → open the budget modal (community budget gate). */
  budget: boolean;
  /** Banner body for non-budget blocks; null → generic retry banner. */
  message: string | null;
}

/** Resolve a block `code` → open the budget modal OR show a banner message
 *  (null message = the generic retry banner). */
export function resolveChatBlock(
  code: string | undefined,
): ChatBlockResolution {
  if (code && CHAT_BUDGET_CODES.has(code))
    return { budget: true, message: null };
  return {
    budget: false,
    message: (code && CHAT_BLOCK_MESSAGES[code]) || null,
  };
}
