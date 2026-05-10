import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getCurrentBudgetState,
  recordUsageCents,
  isChatAvailable,
} from "@/lib/budget";
import {
  checkNewSession,
  startSession,
  endSession,
  checkMessage,
  recordMessage,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const MAX_WEB_SEARCH_USES = 5;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "127.0.0.1"
  );
}

function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 25;
  const outputCostPer1M = 125;
  return Math.ceil(
    (inputTokens / 1_000_000) * inputCostPer1M * 100 +
      (outputTokens / 1_000_000) * outputCostPer1M * 100,
  );
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_VOTER_API;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured on this server." },
      { status: 503 },
    );
  }

  const budgetState = await getCurrentBudgetState();
  if (!isChatAvailable(budgetState.tier)) {
    return NextResponse.json(
      { error: "Chat is temporarily unavailable due to budget limits." },
      { status: 503 },
    );
  }

  const ip = getClientIP(req);
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    messages,
    sessionId,
    systemPrompt,
    isNewSession,
  }: {
    messages: ChatMessage[];
    sessionId: string;
    systemPrompt?: string;
    isNewSession?: boolean;
  } = body;

  if (!sessionId || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  if (isNewSession) {
    const sessionCheck = checkNewSession(ip);
    if (!sessionCheck.allowed) {
      return NextResponse.json({ error: sessionCheck.reason }, { status: 429 });
    }
    startSession(ip, sessionId);
  }

  const messageCheck = checkMessage(sessionId);
  if (!messageCheck.allowed) {
    endSession(ip, sessionId);
    return NextResponse.json({ error: messageCheck.reason }, { status: 429 });
  }

  recordMessage(sessionId);

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let inputTokens = 0;
        let outputTokens = 0;

        const anthropicStream = await client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt
            ? [
                {
                  type: "text",
                  text: systemPrompt,
                  cache_control: { type: "ephemeral" },
                },
              ]
            : undefined,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: MAX_WEB_SEARCH_USES,
            } as Parameters<
              typeof client.messages.create
            >[0]["tools"] extends Array<infer T>
              ? T
              : never,
          ],
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`,
                ),
              );
            }
          } else if (event.type === "message_delta") {
            if (event.usage) {
              outputTokens = event.usage.output_tokens ?? 0;
            }
          } else if (event.type === "message_start") {
            if (event.message.usage) {
              inputTokens = event.message.usage.input_tokens;
            }
          }
        }

        const costCents = estimateCostCents(inputTokens, outputTokens);
        await recordUsageCents(costCents);

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
