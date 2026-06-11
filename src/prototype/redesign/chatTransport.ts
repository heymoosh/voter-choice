/* Single chat transport for every LLM touchpoint in the redesign (seat chat,
   issue intake/edit conversations): community budget first, the voter's own
   key after they opt in.

   - Server path: streamChatReply → /api/chat (tools, PII strip on the
     fleet-v2 path, budget enforcement). BUDGET_* blocks surface through
     `onBudgetBlock` instead of `onError` so hosts open the budget modal with
     the failed turn preserved.
   - BYOK path: streamWithByok → browser-direct api.anthropic.com. No server
     tools (lookup_alignment / web_search run server-side only), so answers
     ground ONLY in what the prompt carries — every redesign prompt embeds its
     card data, and intake/edit are pure prompt tasks, so this degrades
     honestly. Challenger research cannot run under BYOK at all.

   BYOK activation is an explicit, per-session opt-in ("Retry with my key"):
   sticky via sessionStorage until the tab closes or the key is removed. */

import { streamChatReply } from "../realData";
import type { ChatHistoryMsg, ChatStreamCallbacks } from "../realData";
import { streamWithByok, hasByokKey } from "../../lib/anthropic-client-byok";
import { CHAT_BUDGET_CODES } from "./chatBlocks";

const BYOK_ACTIVE_KEY = "voter-choice:byok-active-v1";

export function isByokActive(): boolean {
  if (!hasByokKey()) return false;
  try {
    return sessionStorage.getItem(BYOK_ACTIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function activateByok(): void {
  try {
    sessionStorage.setItem(BYOK_ACTIVE_KEY, "1");
  } catch {
    /* private mode — opt-in lasts for the in-memory session only */
  }
}

export function deactivateByok(): void {
  try {
    sessionStorage.removeItem(BYOK_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export interface ChatTurnArgs {
  messages: ChatHistoryMsg[];
  systemPrompt: string;
  sessionId: string;
  messageCount: number;
  isNewSession?: boolean;
  activeRaceId?: string;
  prevActiveRaceId?: string;
}

export interface ChatTurnCallbacks extends ChatStreamCallbacks {
  /** A community-budget gate refused the turn (BUDGET_SOFT_CLOSE / _HANDOFF /
   *  _EXHAUSTED). The host should stash the turn for retry and open the
   *  budget modal. When absent, budget blocks fall through to onError. */
  onBudgetBlock?: (code: string) => void;
}

/** Send one chat turn: BYOK-direct when the voter opted in, else the server. */
export async function sendChatTurn(
  args: ChatTurnArgs,
  cb: ChatTurnCallbacks,
): Promise<void> {
  if (isByokActive()) return sendViaByok(args, cb);
  return streamChatReply(args, {
    onText: cb.onText,
    onDone: cb.onDone,
    onBudgetTier: cb.onBudgetTier,
    onError: (reason, meta) => {
      if (meta?.code && CHAT_BUDGET_CODES.has(meta.code) && cb.onBudgetBlock) {
        cb.onBudgetBlock(meta.code);
        return;
      }
      cb.onError(reason, meta);
    },
  });
}

/** BYOK-direct turn (used by sendChatTurn once active, and by the budget
 *  modal's "Retry with my key" before the sticky flag is consulted). */
export async function sendViaByok(
  args: Pick<ChatTurnArgs, "messages" | "systemPrompt">,
  cb: ChatStreamCallbacks,
): Promise<void> {
  try {
    await streamWithByok(
      { systemPrompt: args.systemPrompt, messages: args.messages },
      {
        onText: cb.onText,
        onDone: () => cb.onDone?.(),
        onError: (err) => cb.onError(err || "byok"),
      },
    );
  } catch {
    // streamWithByok throws synchronously when no key is set.
    cb.onError("byok-no-key");
  }
}
