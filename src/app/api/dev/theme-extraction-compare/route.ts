/**
 * POST /api/dev/theme-extraction-compare
 *
 * Dev-only reference endpoint for the on-device-AI spike (see
 * src/app/dev/on-device-ai/page.tsx). Runs ONLY the cold-open
 * theme-extraction prompt + parse round trip against the live (cloud,
 * Claude) path — no session state, no rate limiting, no tool calls — so the
 * comparison page has a clean baseline to measure the local WebLLM path
 * against. Reuses the same prompt builder (`buildThemeExtractionPrompt`) and
 * parser (`parseThemeExtraction`) the live /api/chat route uses for this
 * step, and the same Anthropic client/model/env-var pattern as that route
 * (see src/app/api/chat/route.ts and src/app/api/research-candidate/route.ts).
 *
 * Gated OFF by default: returns a bare 404 (not a 403/error body) when
 * NEXT_PUBLIC_LAUNCH_ON_DEVICE_AI isn't exactly "true", so the route's
 * existence isn't leaked while dark. See src/lib/launch-flags.ts for the
 * LAUNCH_* convention this flag follows (client-surface variant).
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildThemeExtractionPrompt } from "../../../../lib/prompts/theme-extraction";
import { parseThemeExtraction } from "../../../../lib/prompts/parse-theme-extraction";
import type { Theme } from "../../../../lib/prompts/types";

const DEFAULT_ANTHROPIC_CHAT_MODEL = "claude-haiku-4-5-20251001";
const MAX_USER_CONCERN_CHARS = 2000;
const MAX_TOKENS = 2048;

function notFound(): Response {
  return new Response(null, { status: 404 });
}

async function parseRequestBody(
  request: NextRequest,
): Promise<{ userConcernText: string } | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const userConcernText =
    typeof b.userConcernText === "string" ? b.userConcernText.trim() : "";
  if (!userConcernText || userConcernText.length > MAX_USER_CONCERN_CHARS) {
    return Response.json({ error: "Invalid userConcernText" }, { status: 400 });
  }
  return { userConcernText };
}

async function runCloudThemeExtraction(
  userConcernText: string,
  apiKey: string,
  model: string,
): Promise<{ themes: Theme[]; latencyMs: number } | Response> {
  const systemPrompt = buildThemeExtractionPrompt({
    userInput: userConcernText,
  });

  try {
    const client = new Anthropic({ apiKey });
    const startedAt = Date.now();
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userConcernText }],
    });
    const latencyMs = Date.now() - startedAt;

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      return Response.json(
        { error: "Anthropic response contained no text block" },
        { status: 502 },
      );
    }

    return { themes: parseThemeExtraction(textBlock.text), latencyMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[theme-extraction-compare] Anthropic call failed: ${message}`,
    );
    return Response.json(
      { error: `Cloud theme extraction failed: ${message}` },
      { status: 502 },
    );
  }
}

// Next.js auto-405s any HTTP method with no matching export, which would
// leak "a route exists here" while the flag is off (contradicting the "bare
// 404 when unset" intent above). Export the common non-POST methods too so
// every method 404s identically until the flag is on.
export const GET = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;

export async function POST(request: NextRequest) {
  // Literal expression per the LAUNCH_* client-flag rule (src/lib/launch-flags.ts) —
  // Next.js only statically inlines this exact form; it's read at runtime here
  // since this handler runs server-side, but the literal form is kept for
  // consistency with the convention and so it can't silently drift.
  if (process.env.NEXT_PUBLIC_LAUNCH_ON_DEVICE_AI !== "true") {
    return notFound();
  }

  const parsed = await parseRequestBody(request);
  if (parsed instanceof Response) return parsed;

  const apiKey = process.env.ANTHROPIC_VOTER_API;
  const model =
    process.env.ANTHROPIC_CHAT_MODEL ?? DEFAULT_ANTHROPIC_CHAT_MODEL;
  if (!apiKey) {
    return Response.json(
      { error: "Chat service is not configured" },
      { status: 500 },
    );
  }

  const result = await runCloudThemeExtraction(
    parsed.userConcernText,
    apiKey,
    model,
  );
  if (result instanceof Response) return result;
  return Response.json(result);
}
