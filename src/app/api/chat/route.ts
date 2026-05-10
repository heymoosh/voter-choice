import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isChatAvailable, recordSpend } from "@/lib/budget";
import {
  checkSessionLimit,
  checkIpLimits,
  startSession,
  recordMessage,
} from "@/lib/rate-limit";
import { ChatMessage } from "@/types/election";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_VOTER_API,
});

const SYSTEM_PROMPT = `You are a nonpartisan civic research assistant helping a U.S. voter prepare for an upcoming election. Your job is to help the voter understand what's on their ballot, form their own opinions, and research candidates based on their ACTIONS — not campaign promises.

FORMAT EVERY RESPONSE:
- Keep each issue or race to 4-6 bullet points max. No long paragraphs.
- Bold the key takeaway in each bullet.
- One issue or race per response unless asked to speed up.
- Bottom line first. Lead with a 1-sentence summary.
- Use plain language. If a 16-year-old wouldn't understand it, rewrite it.
- Never recap what was already covered unless asked.

RULES:
- Collaborate, don't auto-fill. Recommend only when asked.
- Actions > words. Prioritize what candidates have DONE.
- Teach before you ask. Never ask an opinion on something the voter doesn't understand yet.
- Make it personal. "This affects renters because..." beats abstract policy talk.
- AI makes mistakes. Link to sources so the voter can verify.
- If the voter says "I don't care" — move on.

Use web search to research candidates, voting records, donor data, and endorsements when available.`;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  if (!isChatAvailable()) {
    return new Response(
      JSON.stringify({ error: "Chat unavailable", code: "budget_exhausted" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const ip = getClientIp(request);
  let body: {
    messages: ChatMessage[];
    sessionId: string;
    systemContext?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, sessionId, systemContext } = body;

  if (!sessionId || !messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isNewSession = messages.length <= 1;
  const ipCheck = checkIpLimits(ip, isNewSession);
  if (!ipCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", code: ipCheck.reason }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const sessionCheck = checkSessionLimit(sessionId);
  if (!sessionCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Session message limit reached",
        code: "session_limit",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  if (isNewSession) startSession(sessionId, ip);
  recordMessage(sessionId);

  const fullSystem = systemContext
    ? `${SYSTEM_PROMPT}\n\n## VOTER ELECTION CONTEXT\n${systemContext}`
    : SYSTEM_PROMPT;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: fullSystem,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          tools: [
            { type: "web_search_20250305", name: "web_search", max_uses: 5 },
          ] as unknown as Parameters<typeof client.messages.create>[0]["tools"],
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({
              type: "text",
              text: event.delta.text,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } else if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          } else if (event.type === "message_start" && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        }

        const costCents = Math.ceil(
          (inputTokens * 0.00025 + outputTokens * 0.00125) * 100,
        );
        recordSpend(costCents);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
        );
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: msg })}\n\n`,
          ),
        );
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
