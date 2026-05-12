import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";

// In-memory rate limiting (resets on server restart)
// For production, use a persistent store like Vercel KV
const sessionMap = new Map<string, { count: number; date: string }>();
const concurrentMap = new Map<string, number>();

// Monthly budget tracking (resets on server restart — persists via env var in production)
// $20/month hard cap via Anthropic Console; we track estimated spend here for progressive warnings
const COST_PER_INPUT_TOKEN = 0.000003; // $3 per 1M tokens (Sonnet)
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M tokens (Sonnet)
const MONTHLY_BUDGET = 20.0;
let monthlySpendEstimate = 0;
let budgetMonth = new Date().getMonth();

function getBudgetPercent(): number {
  // Reset monthly
  const currentMonth = new Date().getMonth();
  if (currentMonth !== budgetMonth) {
    monthlySpendEstimate = 0;
    budgetMonth = currentMonth;
  }
  return (monthlySpendEstimate / MONTHLY_BUDGET) * 100;
}

function updateBudget(inputTokens: number, outputTokens: number) {
  monthlySpendEstimate +=
    inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  // Same-origin check
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Check budget first
  const budgetPct = getBudgetPercent();
  if (budgetPct >= 100) {
    return NextResponse.json(
      { error: "budget_exhausted", budgetPercent: budgetPct },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  const today = getTodayStr();

  // Per-IP concurrent session check (max 3)
  const concurrent = concurrentMap.get(ip) ?? 0;
  if (concurrent >= 3) {
    return NextResponse.json(
      { error: "rate_limit_concurrent" },
      { status: 429 },
    );
  }

  // Per-IP daily session limit (max 5 new sessions per day)
  const sessionKey = `${ip}:${today}`;
  const sessionData = sessionMap.get(sessionKey) ?? { count: 0, date: today };
  if (sessionData.date !== today) {
    sessionData.count = 0;
    sessionData.date = today;
  }

  let body: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    systemPrompt: string;
    isNewSession?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "messages array required" },
      { status: 400 },
    );
  }

  // Check per-session message limit (60 messages)
  if (body.messages.length > 60) {
    return NextResponse.json(
      { error: "session_message_limit" },
      { status: 429 },
    );
  }

  // Track new sessions for daily limit
  if (body.isNewSession) {
    if (sessionData.count >= 5) {
      return NextResponse.json({ error: "rate_limit_daily" }, { status: 429 });
    }
    sessionData.count++;
    sessionMap.set(sessionKey, sessionData);
  }

  // Track concurrent sessions
  concurrentMap.set(ip, concurrent + 1);

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 },
      );
    }

    const client = new Anthropic({ apiKey });

    const encoder = new TextEncoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            temperature: 1,
            system: body.systemPrompt || "",
            messages: body.messages,
            stream: true,
          });

          for await (const event of response) {
            if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                const data = JSON.stringify({
                  type: "delta",
                  text: event.delta.text,
                  budgetPercent: getBudgetPercent(),
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            } else if (event.type === "message_start") {
              inputTokens = event.message.usage?.input_tokens ?? 0;
            } else if (event.type === "message_delta") {
              outputTokens = event.usage?.output_tokens ?? 0;
            } else if (event.type === "message_stop") {
              updateBudget(inputTokens, outputTokens);
              const done = JSON.stringify({
                type: "done",
                inputTokens,
                outputTokens,
                budgetPercent: getBudgetPercent(),
              });
              controller.enqueue(encoder.encode(`data: ${done}\n\n`));
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`,
            ),
          );
        } finally {
          controller.close();
          const curr = concurrentMap.get(ip) ?? 1;
          concurrentMap.set(ip, Math.max(0, curr - 1));
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
  } catch {
    const curr = concurrentMap.get(ip) ?? 1;
    concurrentMap.set(ip, Math.max(0, curr - 1));
    return NextResponse.json({ error: "Service error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Return budget status for UI
  void req;
  void headers;
  const budgetPct = getBudgetPercent();
  return NextResponse.json({
    budgetPercent: budgetPct,
    budgetExhausted: budgetPct >= 100,
  });
}
