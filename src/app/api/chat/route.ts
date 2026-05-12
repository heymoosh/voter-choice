/**
 * POST /api/chat
 *
 * Streaming chat API route for the ballot research AI.
 * - Proxies to Anthropic API (claude-sonnet-4-6) via SSE
 * - API key never exposed to client
 * - Stateless: receives full conversation history per request
 * - Rate limiting: per-IP concurrent sessions (3) and daily sessions (5)
 * - Budget tracking: estimates cumulative monthly spend
 * - No conversation content logged server-side
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBudgetStatus, recordUsage } from "@/lib/budget-tracker";
import {
  checkAndStartSession,
  endSession,
  MAX_MESSAGES_PER_SESSION,
} from "@/lib/rate-limiter";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt: string;
  sessionId: string;
}

// Mock response for test environments
const MOCK_RESPONSE = `I'll help you research your ballot. Let me start by reviewing what we know about your election.

Looking at your ballot, I can see several important races. Let me walk you through them one at a time.

**First, let's look at your values.** What issues matter most to you in this election?

After discussing your priorities, here are some alignment scores:

[ALIGNMENT_SCORES]
{
  "race": "Sample Race 2026",
  "scores": [
    {
      "candidate": "Jane Doe",
      "overall": 78,
      "issues": [
        {"issue": "Economy", "userPriority": "high", "score": 82, "rationale": "Supported small business tax relief.", "sources": ["Ballotpedia: Doe, Jane"]},
        {"issue": "Education", "userPriority": "medium", "score": 74, "rationale": "Voted for increased school funding.", "sources": ["State Legislature votes 2024"]}
      ]
    },
    {
      "candidate": "John Smith",
      "overall": 55,
      "issues": [
        {"issue": "Economy", "userPriority": "high", "score": 60, "rationale": "Mixed record on business regulation.", "sources": ["Congress.gov"]},
        {"issue": "Education", "userPriority": "medium", "score": 50, "rationale": "Opposed recent education funding bill.", "sources": ["Senate.gov vote record 2024"]}
      ]
    }
  ]
}
[/ALIGNMENT_SCORES]

Based on our conversation, here is your ballot summary:

MY BALLOT — Sample County — Sample Election 2026 — November 3, 2026

US Senate: Jane Doe
State Governor: Write-in

Propositions:
1: YES
2: NO

REMINDER: Please check your state's phone policy before entering the polling place.

Generated with Voter Choice Tool — voterchoice.app
This document is your personal notes, not an official ballot.

=== MY VOTER PROFILE — November 2026 ===

LOCATION: Sample zip, Sample State

WHAT I CARE ABOUT:
- Economy and small business support
- Education funding

HOW I MAKE DECISIONS:
- Evidence-based, looking at voting records
- Values consistency over political party

WHAT AFFECTS ME PERSONALLY:
- Small business owner

MY VOTING HISTORY WITH THIS TOOL:
- Sample Election 2026: Chose Jane Doe for Senate based on economic record

NOTES:
- First time using this tool

=== END VOTER PROFILE ===`;

export async function POST(request: NextRequest) {
  // Same-origin check
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (
    origin &&
    host &&
    !origin.includes(host) &&
    process.env.NODE_ENV !== "test" &&
    process.env.MOCK_ANTHROPIC !== "true"
  ) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse request
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, systemPrompt, sessionId } = body;

  if (!Array.isArray(messages) || !systemPrompt || !sessionId) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: messages, systemPrompt, sessionId",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Session limit check
  if (
    messages.filter((m) => m.role === "user").length > MAX_MESSAGES_PER_SESSION
  ) {
    return new Response(
      JSON.stringify({
        error: "session_limit",
        message:
          "You've reached the 60-message session limit. To keep this tool free for everyone, we limit sessions per day. You can continue your research by copying the prompt below.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitResult = checkAndStartSession(ip, sessionId);
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

  // Budget check
  const budgetStatus = getBudgetStatus();
  if (budgetStatus.tier === "exhausted") {
    endSession(ip, sessionId);
    return new Response(
      JSON.stringify({
        error: "budget_exhausted",
        message:
          "Our free AI chat has reached its monthly limit. You can still research your ballot — copy the prompt below and paste it into any free AI chatbot.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Use mock in test environment
  if (
    process.env.NODE_ENV === "test" ||
    process.env.MOCK_ANTHROPIC === "true"
  ) {
    endSession(ip, sessionId);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Stream mock response in chunks ([\s\S] to preserve newlines)
        const chunks = MOCK_RESPONSE.match(/[\s\S]{1,50}/g) ?? [MOCK_RESPONSE];
        for (const chunk of chunks) {
          const sseData = `data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`;
          controller.enqueue(encoder.encode(sseData));
          await new Promise((r) => setTimeout(r, 5));
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", budgetTier: "normal" })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Real Anthropic API call
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const encoder = new TextEncoder();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          temperature: 1,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const sseData = `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
          if (event.type === "message_start") {
            totalInputTokens = event.message.usage?.input_tokens ?? 0;
          }
          if (event.type === "message_delta") {
            totalOutputTokens = event.usage?.output_tokens ?? 0;
          }
        }

        // Record usage after completion
        if (totalInputTokens > 0 || totalOutputTokens > 0) {
          recordUsage(totalInputTokens, totalOutputTokens);
        }

        const finalBudget = getBudgetStatus();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", budgetTier: finalBudget.tier })}\n\n`,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`,
          ),
        );
      } finally {
        endSession(ip, sessionId);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * GET /api/chat/budget
 * Returns current budget status for client-side progressive degradation UI.
 */
export async function GET() {
  const status = getBudgetStatus();
  return new Response(
    JSON.stringify({
      tier: status.tier,
      percentUsed: Math.round(status.percentUsed),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
