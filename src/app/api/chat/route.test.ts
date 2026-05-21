/**
 * src/app/api/chat/route.test.ts
 *
 * Tests for POST /api/chat — focused on the PROMPT_FLEET_V2 wiring:
 *  - flag-off legacy parity (AC #1)
 *  - flag-on routing through routePrompt (AC #2 — observed end-to-end)
 *  - per-race reset of message history when activeRaceId changes (AC #5)
 *  - PII strip applied to user messages under flag-on
 *  - `prompt_used` observability log
 *  - chat-route forwards the full alignment result, including `notice`,
 *    in the tool_result content (AC #8, #11, #12)
 *  - validation of new optional fields (`view`, `activeRaceType`, etc.)
 *
 * Anthropic SDK is mocked at module scope. `messages.create` is a vi.fn() that
 * returns a controllable async iterable per call. The default export's
 * `APIError` static is preserved via vi.importActual so the route's
 * `instanceof Anthropic.APIError` checks still work on error paths.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE the route import so vi.mock hoists correctly.
// ---------------------------------------------------------------------------

vi.mock("../../../lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("../../../lib/server/budget", () => ({
  getBudgetStatusAsync: vi.fn().mockResolvedValue({
    tier: "normal" as const,
    percent: 12,
    estimatedSpendUSD: 6,
  }),
  recordUsageAsync: vi.fn().mockResolvedValue(undefined),
  shouldTriggerHandoffAsync: vi.fn().mockResolvedValue(false),
  markHandoffServed: vi.fn().mockResolvedValue(undefined),
  wasHandoffServed: vi.fn().mockReturnValue(false),
}));

vi.mock("../../../lib/server/alignment", () => ({
  resolveCandidateId: vi.fn().mockResolvedValue("openstates-tx-123"),
  lookupAlignment: vi.fn().mockResolvedValue({
    found: true,
    candidateId: "openstates-tx-123",
    kept: 1,
    total: 3,
    contributingVotes: [],
    notice:
      "Limited data: only 3 relevant votes found for this issue (1 aligned with your stance). Score may not reflect the candidate's overall record.",
  }),
}));

vi.mock("../../../lib/server/donors", () => ({
  lookupDonorCoalition: vi.fn().mockResolvedValue({ found: false }),
}));

// Anthropic SDK mock. We preserve the real APIError class (via importActual)
// so the route's `instanceof Anthropic.APIError` branch remains functional.
// `messages.create` returns whatever the per-test setup queued via
// `queueStream(...)`.
vi.mock("@anthropic-ai/sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@anthropic-ai/sdk")>(
      "@anthropic-ai/sdk",
    );
  // We deliberately drop the real default's heavy fetch machinery and replace
  // it with a tiny ctor that exposes a controllable `messages.create`. The
  // ctor is a regular function so `new Anthropic({ apiKey })` works.
  function AnthropicCtor() {
    return {
      messages: {
        create: messagesCreateMock,
      },
    };
  }
  // Preserve APIError so `instanceof Anthropic.APIError` works on error paths.
  (AnthropicCtor as unknown as { APIError: unknown }).APIError =
    actual.default.APIError;
  return { default: AnthropicCtor };
});

// ---------------------------------------------------------------------------
// Imports AFTER mocks so the mocked modules take effect.
// ---------------------------------------------------------------------------

import { POST } from "./route";
import { checkRateLimitAsync } from "../../../lib/server/rate-limit";
import { getBudgetStatusAsync } from "../../../lib/server/budget";
import {
  resolveCandidateId,
  lookupAlignment,
} from "../../../lib/server/alignment";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const messagesCreateMock = vi.fn();

/** Queue the next responses from `messages.create`. First call returns the
 * first item, second call returns the second, etc. */
function queueStreams(
  ...streams: AsyncIterable<Anthropic.MessageStreamEvent>[]
): void {
  messagesCreateMock.mockReset();
  for (const stream of streams) {
    messagesCreateMock.mockResolvedValueOnce(stream);
  }
}

/** Build an async iterable from a list of stream events. */
function mockAnthropicStream(
  events: Anthropic.MessageStreamEvent[],
): AsyncIterable<Anthropic.MessageStreamEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) yield e;
    },
  };
}

/** A canonical "single text block, then done" stream — used when the test
 * just needs the route to complete without exercising tool use. */
function simpleTextStream(
  text = "ok",
): AsyncIterable<Anthropic.MessageStreamEvent> {
  return mockAnthropicStream([
    {
      type: "message_start",
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [],
        model: "claude-haiku-4-5-20251001",
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_stop",
      index: 0,
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 5 },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "message_stop",
    } as unknown as Anthropic.MessageStreamEvent,
  ]);
}

/** A stream that emits a single `lookup_alignment` tool_use, then stops with
 * stop_reason="tool_use" so the route's continuation loop fires. */
function toolUseStream(
  toolName: "lookup_alignment" | "lookup_donor_coalition",
  toolUseId: string,
  input: Record<string, unknown>,
): AsyncIterable<Anthropic.MessageStreamEvent> {
  return mockAnthropicStream([
    {
      type: "message_start",
      message: {
        id: "msg_tool",
        type: "message",
        role: "assistant",
        content: [],
        model: "claude-haiku-4-5-20251001",
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 20,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "tool_use",
        id: toolUseId,
        name: toolName,
        input: {},
      },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "input_json_delta",
        partial_json: JSON.stringify(input),
      },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "content_block_stop",
      index: 0,
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "message_delta",
      delta: { stop_reason: "tool_use", stop_sequence: null },
      usage: { output_tokens: 8 },
    } as unknown as Anthropic.MessageStreamEvent,
    {
      type: "message_stop",
    } as unknown as Anthropic.MessageStreamEvent,
  ]);
}

interface MakeChatRequestInput {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  systemPrompt?: string;
  sessionId?: string;
  messageCount?: number;
  isNewSession?: boolean;
  voterProfile?: string;
  view?: string;
  activeRaceType?: string;
  trigger?: string;
  activeRaceId?: string;
  prevActiveRaceId?: string;
  raceContext?: Record<string, unknown>;
}

function makeChatRequest(body: MakeChatRequestInput = {}): Request {
  const fullBody = {
    messages: [{ role: "user" as const, content: "hi" }],
    systemPrompt: "LEGACY",
    sessionId: "sess-1",
    messageCount: 1,
    ...body,
  };
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      host: "localhost",
    },
    body: JSON.stringify(fullBody),
  });
}

/** Drain the SSE stream so all assertions on the mock fire. */
async function drainResponseBody(res: Response): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ANTHROPIC_VOTER_API", "sk-test-key");
  // Default flag off; individual tests stub on as needed.
  vi.stubEnv("PROMPT_FLEET_V2", "");
  // Reset default lookupAlignment behavior between tests.
  vi.mocked(resolveCandidateId).mockResolvedValue("openstates-tx-123");
  vi.mocked(lookupAlignment).mockResolvedValue({
    found: true,
    candidateId: "openstates-tx-123",
    kept: 1,
    total: 3,
    contributingVotes: [],
    notice:
      "Limited data: only 3 relevant votes found for this issue (1 aligned with your stance). Score may not reflect the candidate's overall record.",
  });
  vi.mocked(checkRateLimitAsync).mockResolvedValue({ allowed: true });
  vi.mocked(getBudgetStatusAsync).mockResolvedValue({
    tier: "normal",
    percent: 12,
    estimatedSpendUSD: 6,
  });
  messagesCreateMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Flag-off legacy path (AC #1)
// ---------------------------------------------------------------------------

describe("POST /api/chat — flag off (legacy parity)", () => {
  it("passes systemPrompt through unchanged when PROMPT_FLEET_V2 is empty", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({ systemPrompt: "LEGACY-PROMPT-BODY" });
    const res = await POST(req as never);
    await drainResponseBody(res);

    expect(messagesCreateMock).toHaveBeenCalled();
    const firstCallParams = messagesCreateMock.mock.calls[0][0];
    expect(firstCallParams.system).toEqual([
      expect.objectContaining({
        type: "text",
        text: "LEGACY-PROMPT-BODY",
      }),
    ]);
  });

  it("does not strip PII from user messages when flag is off", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "");
    queueStreams(simpleTextStream());

    const userText = "Email me at jane.doe@example.com about Senate Bill 1.";
    const req = makeChatRequest({
      messages: [{ role: "user", content: userText }],
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const firstCallParams = messagesCreateMock.mock.calls[0][0];
    expect(firstCallParams.messages).toHaveLength(1);
    expect(firstCallParams.messages[0].content).toContain(
      "jane.doe@example.com",
    );
  });

  it("does NOT apply per-race reset when flag is off", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "second" },
      ],
      activeRaceId: "B",
      prevActiveRaceId: "A",
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const firstCallParams = messagesCreateMock.mock.calls[0][0];
    expect(firstCallParams.messages).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Flag-on routing (AC #2 — observed end-to-end via system-prompt body)
// ---------------------------------------------------------------------------

describe("POST /api/chat — flag on (router-driven prompt)", () => {
  it("routes cold-open view to theme-extraction builder", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "cold-open",
      raceContext: { userInput: "i care about housing costs" },
      messages: [{ role: "user", content: "i care about housing costs" }],
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const firstCallParams = messagesCreateMock.mock.calls[0][0];
    const systemText: string = firstCallParams.system[0].text;
    // Safety header MUST prefix every prompt under the flag.
    expect(systemText).toContain("You are nonpartisan civic research.");
    // Theme-extraction body marker.
    expect(systemText).toContain("You extract civic themes");
  });

  it("routes workspace-race + choice to race-deep-dive builder", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "workspace-race",
      activeRaceType: "choice",
      raceContext: {
        raceLabel: "US House — TX-07",
        state: "TX",
        county: "Harris",
        themesList: "housing costs; healthcare",
        candidatesJson: "[]",
        decidedSummary: "none",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const systemText: string =
      messagesCreateMock.mock.calls[0][0].system[0].text;
    expect(systemText).toContain("You are nonpartisan civic research.");
    expect(systemText).toContain(
      "You are the research assistant inside Voter Choice.",
    );
  });

  it("routes workspace-prop to proposition builder", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "workspace-prop",
      raceContext: {
        propLabel: "Prop A",
        propSummary: "bond measure",
        propIfYes: "issues bonds",
        propIfNo: "no bonds",
        themesList: "housing",
        yesFunders: "builders",
        noFunders: "taxpayers union",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const systemText: string =
      messagesCreateMock.mock.calls[0][0].system[0].text;
    expect(systemText).toContain("You are nonpartisan civic research.");
    expect(systemText).toContain("You explain a ballot proposition");
  });

  it("trigger=handoff-button overrides view and routes to handoff builder", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "workspace-race",
      activeRaceType: "choice",
      trigger: "handoff-button",
      raceContext: {
        addressCityState: "Austin, TX",
        electionLabel: "2026 TX Primary Runoff",
        electionDate: "2026-05-28",
        ballotType: "DEM-runoff",
        themesRanked: "housing",
        decidedJson: "[]",
        remainingList: "US-Sen",
        notableQuotes: "",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const systemText: string =
      messagesCreateMock.mock.calls[0][0].system[0].text;
    expect(systemText).toContain("Produce a session handoff");
  });
});

// ---------------------------------------------------------------------------
// Per-race reset (AC #5)
// ---------------------------------------------------------------------------

describe("POST /api/chat — per-race reset", () => {
  it("clears carry-over to last user msg when activeRaceId changes under flag-on", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "workspace-race",
      activeRaceType: "choice",
      activeRaceId: "race-B",
      prevActiveRaceId: "race-A",
      messages: [
        { role: "user", content: "previous race question" },
        { role: "assistant", content: "previous reply" },
        { role: "user", content: "new race question" },
      ],
      raceContext: {
        raceLabel: "X",
        state: "TX",
        county: "Harris",
        themesList: "x",
        candidatesJson: "[]",
        decidedSummary: "",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const params = messagesCreateMock.mock.calls[0][0];
    expect(params.messages).toHaveLength(1);
    expect(params.messages[0].role).toBe("user");
    expect(params.messages[0].content).toBe("new race question");
  });

  it("does not reset when activeRaceId is unchanged", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const req = makeChatRequest({
      view: "workspace-race",
      activeRaceType: "choice",
      activeRaceId: "race-A",
      prevActiveRaceId: "race-A",
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "second" },
      ],
      raceContext: {
        raceLabel: "X",
        state: "TX",
        county: "Harris",
        themesList: "x",
        candidatesJson: "[]",
        decidedSummary: "",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const params = messagesCreateMock.mock.calls[0][0];
    expect(params.messages).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// PII strip under flag-on
// ---------------------------------------------------------------------------

describe("POST /api/chat — PII strip", () => {
  it("strips PII from user messages when flag is on", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());

    const userText =
      "Email jane.doe@example.com. My DOB is 12/31/1985. I live in Austin, TX.";
    const req = makeChatRequest({
      view: "cold-open",
      raceContext: { userInput: "x" },
      messages: [{ role: "user", content: userText }],
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const params = messagesCreateMock.mock.calls[0][0];
    const outgoing: string = params.messages[0].content;
    expect(outgoing).not.toContain("jane.doe@example.com");
    expect(outgoing).not.toContain("12/31/1985");
    // City + state explicitly preserved (rule 3 of safety header).
    expect(outgoing).toContain("Austin, TX");
  });
});

// ---------------------------------------------------------------------------
// Observability — `prompt_used` log
// ---------------------------------------------------------------------------

describe("POST /api/chat — observability", () => {
  it("emits a chat.prompt_used log line under flag-on", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    queueStreams(simpleTextStream());
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const req = makeChatRequest({
      view: "cold-open",
      raceContext: { userInput: "anything" },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    const promptUsedCalls = logSpy.mock.calls
      .map((args) => String(args[0]))
      .filter((line) => line.includes("chat.prompt_used"));
    expect(promptUsedCalls.length).toBeGreaterThan(0);
    const parsed = JSON.parse(promptUsedCalls[0]);
    expect(parsed.event).toBe("chat.prompt_used");
    expect(parsed.builder).toBe("theme-extraction");
    expect(parsed.view).toBe("cold-open");

    logSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Validation of new fields
// ---------------------------------------------------------------------------

describe("POST /api/chat — validation of new fields", () => {
  it("returns 400 for an invalid view value", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");

    const req = makeChatRequest({
      view: "garbage-view",
      raceContext: {},
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AC #8 / #11 / #12 — full alignment result (with notice) forwarded
// ---------------------------------------------------------------------------

describe("POST /api/chat — alignment notice forwarded to model", () => {
  it("includes the alignment notice verbatim in the tool_result content sent on continuation", async () => {
    vi.stubEnv("PROMPT_FLEET_V2", "1");
    vi.mocked(lookupAlignment).mockResolvedValue({
      found: true,
      candidateId: "openstates-tx-123",
      kept: 1,
      total: 3,
      contributingVotes: [],
      notice:
        "Limited data: only 3 relevant votes found for this issue (1 aligned with your stance). Score may not reflect the candidate's overall record.",
    });
    vi.mocked(resolveCandidateId).mockResolvedValue("openstates-tx-123");

    queueStreams(
      toolUseStream("lookup_alignment", "toolu_xyz", {
        candidate_name: "Test Candidate",
        state_code: "TX",
        jurisdiction: "federal-house",
        canonical_issue: "healthcare_affordability",
        resolved_stance: "in_favor",
      }),
      simpleTextStream("Limited data: only 3 votes — here's what we found."),
    );

    const req = makeChatRequest({
      view: "workspace-race",
      activeRaceType: "choice",
      raceContext: {
        raceLabel: "US House — TX-07",
        state: "TX",
        county: "Harris",
        themesList: "healthcare",
        candidatesJson: "[]",
        decidedSummary: "",
      },
    });
    const res = await POST(req as never);
    await drainResponseBody(res);

    expect(messagesCreateMock).toHaveBeenCalledTimes(2);
    const secondCallParams = messagesCreateMock.mock.calls[1][0];
    const continuationMessages = secondCallParams.messages;
    const lastMessage = continuationMessages[continuationMessages.length - 1];
    expect(lastMessage.role).toBe("user");
    const toolResultBlock = lastMessage.content[0];
    expect(toolResultBlock.type).toBe("tool_result");
    expect(toolResultBlock.tool_use_id).toBe("toolu_xyz");
    expect(typeof toolResultBlock.content).toBe("string");
    expect(toolResultBlock.content).toContain('"notice":"Limited data: only 3');
  });
});
