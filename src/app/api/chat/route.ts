/**
 * POST /api/chat
 * Streaming chat route that proxies requests to the Anthropic API.
 * - Validates same-origin
 * - Enforces rate limits (concurrent sessions, daily limit, message limit)
 * - Tracks budget via chatBudget module
 * - Streams responses as Server-Sent Events (SSE)
 * - Does NOT log conversation content
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBudgetInfo, recordTokenUsage, isExhausted } from "@/lib/chatBudget";
import {
  tryStartSession,
  endSession,
  isSessionAtMessageLimit,
} from "@/lib/rateLimiter";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;
const TEMPERATURE = 1;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) {
    // Allow requests without origin (server-to-server, curl for testing)
    // In production, same-origin check is the primary protection
    return true;
  }
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  // Same-origin check
  if (!isSameOrigin(req)) {
    return new Response(
      JSON.stringify({ error: "Forbidden: cross-origin requests not allowed" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  // Parse request body
  let body: {
    messages?: Array<{ role: string; content: string }>;
    systemPrompt?: string;
    sessionId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, systemPrompt, sessionId } = body;

  if (!Array.isArray(messages) || !sessionId) {
    return new Response(
      JSON.stringify({
        error: "messages array and sessionId are required",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Check budget
  if (isExhausted()) {
    return new Response(
      JSON.stringify({
        error: "budget_exhausted",
        message:
          "Our free AI chat has reached its monthly limit. Please use the copy-paste option.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Check per-session message limit
  if (isSessionAtMessageLimit(messages.length)) {
    return new Response(
      JSON.stringify({
        error: "session_limit",
        message:
          "To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rate limiting
  const ip = getClientIp(req);
  const rateLimitResult = tryStartSession(ip, sessionId);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        reason: rateLimitResult.reason,
        message:
          "To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Validate and sanitize messages
  const validMessages = messages.filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  ) as Array<{ role: "user" | "assistant"; content: string }>;

  if (validMessages.length === 0) {
    endSession(ip, sessionId);
    return new Response(
      JSON.stringify({ error: "No valid messages provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: systemPrompt ?? undefined,
          messages: validMessages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({
              type: "delta",
              content: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Get final message for token counting
        const finalMessage = await anthropicStream.finalMessage();
        const inputTokens = finalMessage.usage.input_tokens;
        const outputTokens = finalMessage.usage.output_tokens;

        // Record token usage for budget tracking (server-side, no user data)
        recordTokenUsage(inputTokens, outputTokens);

        const doneData = JSON.stringify({
          type: "done",
          inputTokens,
          outputTokens,
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        // Check if this is a budget-related error from Anthropic
        const errorData = JSON.stringify({
          type: "error",
          message: message.includes("credit")
            ? "budget_exhausted"
            : "api_error",
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        endSession(ip, sessionId);
        controller.close();
      }
    },
  });

  // Get current budget info to include in response headers
  const budgetInfo = getBudgetInfo();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Budget-Percent": String(Math.round(budgetInfo.percentUsed)),
      "X-Budget-Status": budgetInfo.status,
    },
  });
}
