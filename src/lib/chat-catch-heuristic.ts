/**
 * Phase 6 — chat-catch client helper (AI-judged, post fix J).
 *
 * Decides whether a user message in the workspace chat should trigger a soft
 * "I noticed you mentioned X — want to add it as a theme?" proposal chip.
 * Before fix J this was a curated 19-keyword list (jobs, ICE, guns, abortion,
 * police, …); per user post-redesign feedback those keywords pre-determined
 * what users "care about" and several of them leaned politically (e.g. "guns"
 * could mean gun safety OR gun rights — the curation itself was a posture).
 *
 * Now it's a thin fetch wrapper around `POST /api/chat-catch`. The judgment
 * happens server-side in a small Haiku sub-call (see
 * src/lib/server/chat-catch-sub-agent.ts) so neutrality is enforced by the
 * judgment prompt's output contract instead of by a hardcoded word list.
 *
 * Failure semantics (load-bearing for neutrality):
 *   ANY failure mode — network error, non-2xx, malformed JSON, missing
 *   `suggest` field, timeout — returns `{ suggest: false }`. A missing chat-
 *   catch chip is the right neutral default. We never surface a half-baked
 *   theme proposal nor fall back to a keyword heuristic.
 *
 * Timing:
 *   Bounded by a 3s AbortSignal.timeout so a slow judgment can't block the
 *   user experience. The caller (ChatPanel) fires this in parallel with the
 *   main /api/chat call; either the judgment beats the main response and
 *   surfaces a chip when streaming ends, or it doesn't and chat continues
 *   normally.
 */

import type { Theme } from "./prompts/types";

export interface ShouldSuggestAmendInput {
  message: string;
  currentThemes: Theme[];
}

export interface ShouldSuggestAmendResult {
  suggest: boolean;
  /** Neutral 3-7 word noun phrase from the AI judge when suggest=true. */
  suggestedThemeName?: string;
  /** One-sentence rationale from the AI judge when suggest=true. */
  summary?: string;
}

/** 3 seconds — best-effort. Longer than this and the chip is too laggy to
 * feel like a response to the user's message. */
const CHAT_CATCH_TIMEOUT_MS = 3000;

/**
 * AI-judged chat-catch. Returns suggest:false on any failure (network,
 * 5xx, timeout, parse error) — fail closed for neutrality.
 */
export async function shouldSuggestAmend(
  input: ShouldSuggestAmendInput,
): Promise<ShouldSuggestAmendResult> {
  try {
    const res = await fetch("/api/chat-catch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(CHAT_CATCH_TIMEOUT_MS),
    });
    if (!res.ok) return { suggest: false };
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { suggest: false };
    }
    if (typeof data !== "object" || data === null) return { suggest: false };
    const obj = data as {
      suggest?: unknown;
      suggestedThemeName?: unknown;
      summary?: unknown;
    };
    if (typeof obj.suggest !== "boolean") return { suggest: false };
    if (!obj.suggest) return { suggest: false };
    // suggest:true → require a usable theme name. Without one the chip
    // can't render — fail closed.
    if (
      typeof obj.suggestedThemeName !== "string" ||
      obj.suggestedThemeName.length === 0
    ) {
      return { suggest: false };
    }
    return {
      suggest: true,
      suggestedThemeName: obj.suggestedThemeName,
      ...(typeof obj.summary === "string" && obj.summary.length > 0
        ? { summary: obj.summary }
        : {}),
    };
  } catch {
    return { suggest: false };
  }
}
