import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type {
  BallotData,
  ChatMessage,
  RankedIssues,
  ConfirmedConcerns,
} from "@/lib/types";
import type { Language } from "@/lib/i18n";
import { buildChatSystemPrompt } from "@/lib/chatSystemPrompt";
import { getBudgetStatus, recordUsage } from "@/lib/budgetTracker";
import {
  checkSessionLimit,
  checkMessageLimit,
  releaseSession,
} from "@/lib/rateLimiter";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  // Same-origin check
  if (!validateOrigin(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    messages: ChatMessage[];
    ballotData: BallotData;
    zip: string;
    language: Language;
    voterProfile: string | null;
    rankedIssues?: RankedIssues | null;
    confirmedConcerns?: ConfirmedConcerns | null;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: "messages must be an array" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const ip = getClientIp(req);

  // Rate limiting: per-session message limit
  const msgCheck = checkMessageLimit(body.messages.length);
  if (!msgCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "session_limit", reason: msgCheck.reason }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rate limiting: session start (only check on first message)
  let sessionStarted = false;
  if (body.messages.length === 1) {
    const sessionCheck = checkSessionLimit(ip);
    if (!sessionCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "rate_limited", reason: sessionCheck.reason }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
    sessionStarted = true;
  }

  // Budget check
  const budgetStatus = getBudgetStatus();
  if (budgetStatus === "exhausted") {
    if (sessionStarted) releaseSession(ip);
    return new Response(JSON.stringify({ error: "budget_exhausted" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildChatSystemPrompt(
    body.ballotData,
    body.zip,
    body.language ?? "en",
    body.voterProfile ?? null,
    body.rankedIssues ?? null,
    body.confirmedConcerns ?? null,
  );

  // Convert messages to Anthropic format
  const apiMessages: MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Create streaming response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const stream = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          temperature: 1,
          system: systemPrompt,
          messages: apiMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }

        // Get final message for token counting
        const finalMessage = await stream.finalMessage();
        const inputTokens = finalMessage.usage.input_tokens;
        const outputTokens = finalMessage.usage.output_tokens;
        const updatedBudget = recordUsage(inputTokens, outputTokens);

        // Send done event with budget status
        const doneData = `data: ${JSON.stringify({ type: "done", budgetStatus: updatedBudget })}\n\n`;
        controller.enqueue(encoder.encode(doneData));
        controller.close();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        const errData = `data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`;
        controller.enqueue(encoder.encode(errData));
        controller.close();
      } finally {
        if (sessionStarted) releaseSession(ip);
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
