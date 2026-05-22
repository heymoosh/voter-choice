/**
 * POST /api/chat-catch
 *
 * AI-judged chat-catch endpoint (fix J). Replaces the legacy 19-keyword
 * heuristic with a small Haiku judgment call so chat-catch neutrality is
 * enforced by output contract (no advocacy verbs, no party labels) rather
 * than by a curated word list.
 *
 * Why the keyword list had to go (per user feedback): "I am a little bit
 * concerned about keywords. Those specific keywords seem very specific,
 * and they almost seem leaning, politically speaking. Just because I'm
 * worried about guns, does that mean that I'm worried about gun safety
 * and I think we should have more restrictions, or is it that I'm worried
 * about gun rights? Let the AI judge."
 *
 * Contract:
 *   Request:  { message: string, currentThemes: Theme[] }
 *   Response (always 200 on accepted requests):
 *     { suggest: false }
 *     OR
 *     { suggest: true, suggestedThemeName: string, summary?: string }
 *
 * Failure semantics (fail closed for neutrality):
 *   - 403 only on origin-check failure (defensive against CSRF)
 *   - 400 only on malformed input (caller bug)
 *   - 200 + { suggest: false } on EVERY OTHER condition: budget exhausted,
 *     missing API key, sub-agent throws, anything else. A missing chat-catch
 *     chip is the right neutral default — never block the main chat UX over
 *     a best-effort suggestion.
 *
 * Origin check + budget guard mirror src/app/api/chat/route.ts so this
 * route shares the same defense-in-depth contract as the main chat call.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getBudgetStatusAsync } from "../../../lib/server/budget";
import { runChatCatchSubAgent } from "../../../lib/server/chat-catch-sub-agent";
import type { Theme } from "../../../lib/prompts/types";

// Match /api/chat's caps so a misbehaving / oversized request fails the same
// way at both endpoints. The chat-catch payload is much smaller than a
// /api/chat call but we still bound it.
const MAX_USER_MESSAGE_CHARS = 8000;
const MAX_THEMES = 50;

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Neutral fail-closed response. Used on every non-route-error path so the
 * client always sees the same shape and the fail-closed contract is one
 * easy line to grep.
 */
function neutral(): Response {
  return Response.json({ suggest: false }, { status: 200 });
}

interface ChatCatchRequestBody {
  message: unknown;
  currentThemes: unknown;
}

function isTheme(value: unknown): value is Theme {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { name?: unknown; quotes?: unknown };
  if (typeof v.name !== "string") return false;
  if (!Array.isArray(v.quotes)) return false;
  return v.quotes.every((q) => typeof q === "string");
}

function validateBody(
  body: ChatCatchRequestBody,
): { message: string; currentThemes: Theme[] } | Response {
  if (typeof body.message !== "string") {
    return Response.json({ error: "Invalid message" }, { status: 400 });
  }
  if (body.message.length > MAX_USER_MESSAGE_CHARS) {
    return Response.json({ error: "Message too long" }, { status: 400 });
  }
  if (!Array.isArray(body.currentThemes)) {
    return Response.json({ error: "Invalid currentThemes" }, { status: 400 });
  }
  if (body.currentThemes.length > MAX_THEMES) {
    return Response.json({ error: "Too many themes" }, { status: 400 });
  }
  if (!body.currentThemes.every(isTheme)) {
    return Response.json({ error: "Invalid theme shape" }, { status: 400 });
  }
  return {
    message: body.message,
    currentThemes: body.currentThemes,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!validateOrigin(request)) {
    return Response.json(
      { error: "Forbidden", code: "ORIGIN_MISMATCH" },
      { status: 403 },
    );
  }

  let body: ChatCatchRequestBody;
  try {
    body = (await request.json()) as ChatCatchRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBody(body);
  if (validated instanceof Response) return validated;

  // Budget gate: if the community pool is exhausted (or in handoff tier),
  // skip the sub-agent entirely. Returning neutral keeps the main chat
  // flow uninterrupted even when AI judgment is unavailable.
  const budget = await getBudgetStatusAsync();
  if (budget.tier === "exhausted" || budget.tier === "handoff") {
    return neutral();
  }

  const apiKey = process.env.ANTHROPIC_VOTER_API;
  if (!apiKey) {
    // Same neutrality principle — never crash the chat over a missing key.
    return neutral();
  }

  try {
    const client = new Anthropic({ apiKey });
    const judgment = await runChatCatchSubAgent(
      {
        userMessage: validated.message,
        currentThemes: validated.currentThemes,
      },
      client,
    );
    if (!judgment.suggest) return neutral();
    return Response.json(
      {
        suggest: true,
        suggestedThemeName: judgment.suggestedThemeName,
        ...(judgment.summary ? { summary: judgment.summary } : {}),
      },
      { status: 200 },
    );
  } catch {
    // The sub-agent dispatcher itself fails closed, but defensively catch
    // here too so the route NEVER 5xx's the client. Worst case: no chip.
    return neutral();
  }
}
