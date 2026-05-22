/**
 * src/lib/server/chat-catch-sub-agent.test.ts
 *
 * Tests the chat-catch judgment sub-agent dispatcher. The sub-agent runs in
 * its own focused Anthropic call (NO tools — text-only) and returns a small
 * JSON object: { suggest, suggestedThemeName?, summary? }.
 *
 * Properties under test (load-bearing for fix J):
 *   - safety header is prepended to the system prompt
 *   - the call exposes NO tools (this is a judgment call, not a research call)
 *   - the call is non-streaming and capped at a small max_tokens
 *   - JSON output is parsed and surfaced to the caller
 *   - malformed JSON fails closed → returns { suggest: false } (neutrality)
 *   - usage is recorded via recordUsageAsync so the community budget sees it
 *   - non-text content blocks are filtered (defensive — should never happen
 *     since the sub-call exposes no tools, but enforce it anyway)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./budget", () => ({
  recordUsageAsync: vi.fn().mockResolvedValue(undefined),
}));

import { runChatCatchSubAgent } from "./chat-catch-sub-agent";
import { recordUsageAsync } from "./budget";

interface MockClient {
  messages: {
    create: ReturnType<typeof vi.fn>;
  };
}

function makeMockClient(): MockClient {
  return {
    messages: {
      create: vi.fn(),
    },
  };
}

/** Build a minimal non-streaming Message shape with a single text block. */
function fakeMessage(
  text: string,
  opts: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    cacheWriteTokens?: number;
    extraBlocks?: unknown[];
  } = {},
) {
  return {
    id: "msg_catch_1",
    type: "message" as const,
    role: "assistant" as const,
    model: "claude-haiku-4-5-20251001",
    stop_reason: "end_turn",
    stop_sequence: null,
    content: [{ type: "text", text }, ...(opts.extraBlocks ?? [])],
    usage: {
      input_tokens: opts.inputTokens ?? 20,
      output_tokens: opts.outputTokens ?? 40,
      cache_read_input_tokens: opts.cachedInputTokens ?? 0,
      cache_creation_input_tokens: opts.cacheWriteTokens ?? 0,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runChatCatchSubAgent", () => {
  it("builds a system prompt that prepends the safety header and includes both themes and user message", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    await runChatCatchSubAgent(
      {
        userMessage:
          "I'm worried about climate change and air quality in Houston.",
        currentThemes: [
          { name: "Healthcare costs", quotes: ["insulin"] },
          { name: "Tax burden", quotes: ["property taxes"] },
        ],
      },
      client as never,
    );

    expect(client.messages.create).toHaveBeenCalledTimes(1);
    const params = client.messages.create.mock.calls[0][0];
    const systemText: string = Array.isArray(params.system)
      ? params.system.map((s: { text?: string }) => s.text ?? "").join("")
      : (params.system as string);
    expect(systemText).toContain("You are nonpartisan civic research.");
    expect(systemText).toContain("You judge whether");
    expect(systemText).toContain("Healthcare costs");
    expect(systemText).toContain("Tax burden");
    expect(systemText).toContain("climate change and air quality");
  });

  it("exposes NO tools (this is a text-only judgment call)", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );

    const params = client.messages.create.mock.calls[0][0];
    // Either no tools field, or an explicitly empty array.
    if (params.tools !== undefined) {
      expect(Array.isArray(params.tools)).toBe(true);
      expect(params.tools.length).toBe(0);
    }
  });

  it("calls the API with stream:false (non-streaming sub-call)", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );

    const params = client.messages.create.mock.calls[0][0];
    expect(params.stream).not.toBe(true);
  });

  it("caps max_tokens so the JSON output stays small (≤ 200)", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );

    const params = client.messages.create.mock.calls[0][0];
    expect(typeof params.max_tokens).toBe("number");
    expect(params.max_tokens).toBeLessThanOrEqual(200);
  });

  it("parses suggest:true JSON and returns suggestedThemeName + summary", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(
      fakeMessage(
        '{"suggest": true, "suggested_theme_name": "Climate and air quality", "summary": "User worries about pollution in Houston."}',
      ),
    );

    const result = await runChatCatchSubAgent(
      {
        userMessage:
          "I'm worried about climate change and air quality in Houston.",
        currentThemes: [],
      },
      client as never,
    );
    expect(result.suggest).toBe(true);
    expect(result.suggestedThemeName).toBe("Climate and air quality");
    expect(result.summary).toBe("User worries about pollution in Houston.");
  });

  it("parses suggest:false JSON cleanly", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    const result = await runChatCatchSubAgent(
      { userMessage: "thanks", currentThemes: [] },
      client as never,
    );
    expect(result.suggest).toBe(false);
    expect(result.suggestedThemeName).toBeUndefined();
    expect(result.summary).toBeUndefined();
  });

  it("fails closed (returns suggest:false) when the model emits malformed JSON", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(
      fakeMessage("not valid json at all just prose"),
    );

    const result = await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );
    // Load-bearing: the WHOLE point of fix J is neutrality. A failure here
    // must NOT silently surface a chip — return suggest:false.
    expect(result.suggest).toBe(false);
  });

  it("strips markdown code fences around the JSON before parsing", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(
      fakeMessage(
        '```json\n{"suggest": true, "suggested_theme_name": "Climate", "summary": "ok"}\n```',
      ),
    );

    const result = await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );
    expect(result.suggest).toBe(true);
    expect(result.suggestedThemeName).toBe("Climate");
  });

  it("filters non-text content blocks defensively when extracting the JSON", async () => {
    const client = makeMockClient();
    // Even though the sub-call exposes no tools, the dispatcher must still
    // concatenate ONLY text-type blocks — same defensive shape as the
    // research-sub-agent so any future tool addition can't leak raw content.
    client.messages.create.mockResolvedValue(
      fakeMessage('{"suggest": false}', {
        extraBlocks: [
          {
            type: "server_tool_use",
            id: "stu_1",
            name: "web_search",
            input: { query: "should not be here" },
          },
        ],
      }),
    );

    const result = await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );
    expect(result.suggest).toBe(false);
  });

  it("records usage from the sub-call so it counts against the community budget", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(
      fakeMessage('{"suggest": false}', {
        inputTokens: 250,
        outputTokens: 12,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
      }),
    );

    await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );

    expect(recordUsageAsync).toHaveBeenCalledTimes(1);
    const recorded = vi.mocked(recordUsageAsync).mock.calls[0][0] as {
      inputTokens?: number;
      outputTokens?: number;
      cachedInputTokens?: number;
      cacheWriteTokens?: number;
      searchCount?: number;
    };
    expect(recorded.inputTokens).toBe(250);
    expect(recorded.outputTokens).toBe(12);
    // No tools → no web searches.
    expect(recorded.searchCount).toBe(0);
  });

  it("sends a user message so the sub-agent has a turn to respond to", async () => {
    const client = makeMockClient();
    client.messages.create.mockResolvedValue(fakeMessage('{"suggest": false}'));

    await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );

    const params = client.messages.create.mock.calls[0][0];
    expect(Array.isArray(params.messages)).toBe(true);
    expect(params.messages.length).toBeGreaterThanOrEqual(1);
    expect(params.messages[0].role).toBe("user");
  });

  it("fails closed when the Anthropic call itself throws", async () => {
    const client = makeMockClient();
    client.messages.create.mockRejectedValue(new Error("Anthropic 503"));

    const result = await runChatCatchSubAgent(
      { userMessage: "x", currentThemes: [] },
      client as never,
    );
    // Same neutrality principle: any failure → suggest:false. Callers
    // (the API route) bubble this up as a 200 with suggest:false so the
    // client UX continues normally.
    expect(result.suggest).toBe(false);
  });
});
