/**
 * src/app/api/chat-catch/route.test.ts
 *
 * Tests for POST /api/chat-catch — the AI-judged chat-catch endpoint that
 * replaces the legacy keyword heuristic (fix J).
 *
 * Properties under test:
 *   - origin check rejects cross-origin requests (403)
 *   - body validation rejects malformed input (400)
 *   - budget exhausted → returns { suggest: false } 200 (don't block UX)
 *   - happy path: sub-agent suggest:true → endpoint surfaces it 200
 *   - sub-agent failure → returns { suggest: false } 200 (graceful)
 *
 * Anthropic SDK and the sub-agent module are mocked at module scope.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../lib/server/budget", () => ({
  getBudgetStatusAsync: vi.fn().mockResolvedValue({
    tier: "normal" as const,
    percent: 12,
    estimatedSpendUSD: 6,
  }),
}));

vi.mock("../../../lib/server/chat-catch-sub-agent", () => ({
  runChatCatchSubAgent: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@anthropic-ai/sdk")>(
      "@anthropic-ai/sdk",
    );
  function AnthropicCtor() {
    return { messages: { create: vi.fn() } };
  }
  (AnthropicCtor as unknown as { APIError: unknown }).APIError =
    actual.default.APIError;
  return { default: AnthropicCtor };
});

import { POST } from "./route";
import { getBudgetStatusAsync } from "../../../lib/server/budget";
import { runChatCatchSubAgent } from "../../../lib/server/chat-catch-sub-agent";

function makeRequest(
  body: unknown,
  opts: { origin?: string; host?: string } = {},
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: opts.origin ?? "http://localhost",
    host: opts.host ?? "localhost",
  };
  return new Request("http://localhost/api/chat-catch", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("ANTHROPIC_VOTER_API", "sk-test-key");
  vi.mocked(getBudgetStatusAsync).mockResolvedValue({
    tier: "normal",
    percent: 12,
    estimatedSpendUSD: 6,
  });
  vi.mocked(runChatCatchSubAgent).mockResolvedValue({
    suggest: false,
    usage: { input: 0, output: 0, searchCount: 0 },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/chat-catch", () => {
  describe("origin check", () => {
    it("rejects requests with no origin header (403)", async () => {
      const req = new Request("http://localhost/api/chat-catch", {
        method: "POST",
        headers: { "content-type": "application/json", host: "localhost" },
        body: JSON.stringify({ message: "x", currentThemes: [] }),
      });
      const res = await POST(req as never);
      expect(res.status).toBe(403);
    });

    it("rejects cross-origin requests (403)", async () => {
      const req = makeRequest(
        { message: "x", currentThemes: [] },
        { origin: "http://evil.com", host: "localhost" },
      );
      const res = await POST(req as never);
      expect(res.status).toBe(403);
    });

    it("accepts same-origin requests", async () => {
      const req = makeRequest({ message: "x", currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
    });
  });

  describe("body validation", () => {
    it("rejects non-JSON body (400)", async () => {
      const req = new Request("http://localhost/api/chat-catch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
          host: "localhost",
        },
        body: "not json",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("rejects missing message field (400)", async () => {
      const req = makeRequest({ currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("rejects missing currentThemes field (400)", async () => {
      const req = makeRequest({ message: "x" });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("rejects non-string message (400)", async () => {
      const req = makeRequest({ message: 123, currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("rejects non-array currentThemes (400)", async () => {
      const req = makeRequest({ message: "x", currentThemes: "not an array" });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("rejects message that is too long (400) — same MAX_USER_MESSAGE_CHARS as /api/chat", async () => {
      const longMessage = "x".repeat(8001);
      const req = makeRequest({ message: longMessage, currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });
  });

  describe("budget gating", () => {
    it("returns { suggest: false } 200 when budget is exhausted (don't block UX)", async () => {
      vi.mocked(getBudgetStatusAsync).mockResolvedValue({
        tier: "exhausted",
        percent: 100,
        estimatedSpendUSD: 50,
      });

      const req = makeRequest({ message: "x", currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { suggest: boolean };
      expect(json.suggest).toBe(false);
      // The sub-agent must NOT be called when budget is exhausted.
      expect(runChatCatchSubAgent).not.toHaveBeenCalled();
    });

    it("returns { suggest: false } 200 when budget is in handoff tier", async () => {
      vi.mocked(getBudgetStatusAsync).mockResolvedValue({
        tier: "handoff",
        percent: 95,
        estimatedSpendUSD: 47,
      });

      const req = makeRequest({ message: "x", currentThemes: [] });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { suggest: boolean };
      expect(json.suggest).toBe(false);
      expect(runChatCatchSubAgent).not.toHaveBeenCalled();
    });
  });

  describe("missing API key", () => {
    it("returns { suggest: false } 200 when ANTHROPIC_VOTER_API is missing", async () => {
      vi.unstubAllEnvs();
      const req = makeRequest({ message: "x", currentThemes: [] });
      const res = await POST(req as never);
      // Configuration failure must NOT block chat. Return neutral default.
      expect(res.status).toBe(200);
      const json = (await res.json()) as { suggest: boolean };
      expect(json.suggest).toBe(false);
      expect(runChatCatchSubAgent).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("returns the sub-agent's suggest:true judgment with theme name + summary", async () => {
      vi.mocked(runChatCatchSubAgent).mockResolvedValue({
        suggest: true,
        suggestedThemeName: "Climate and air quality",
        summary: "User worries about pollution in Houston.",
        usage: { input: 250, output: 35, searchCount: 0 },
      });

      const req = makeRequest({
        message: "I'm worried about climate change and air quality in Houston.",
        currentThemes: [{ name: "Healthcare costs", quotes: ["insulin"] }],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        suggest: boolean;
        suggestedThemeName?: string;
        summary?: string;
      };
      expect(json.suggest).toBe(true);
      expect(json.suggestedThemeName).toBe("Climate and air quality");
      expect(json.summary).toBe("User worries about pollution in Houston.");
    });

    it("forwards both userMessage and currentThemes to the sub-agent", async () => {
      vi.mocked(runChatCatchSubAgent).mockResolvedValue({
        suggest: false,
        usage: { input: 0, output: 0, searchCount: 0 },
      });

      const req = makeRequest({
        message: "I'm worried about climate.",
        currentThemes: [{ name: "Healthcare costs", quotes: ["insulin"] }],
      });
      await POST(req as never);

      expect(runChatCatchSubAgent).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(runChatCatchSubAgent).mock.calls[0][0];
      expect(callArgs.userMessage).toBe("I'm worried about climate.");
      expect(callArgs.currentThemes).toEqual([
        { name: "Healthcare costs", quotes: ["insulin"] },
      ]);
    });

    it("returns the sub-agent's suggest:false judgment cleanly", async () => {
      vi.mocked(runChatCatchSubAgent).mockResolvedValue({
        suggest: false,
        usage: { input: 250, output: 8, searchCount: 0 },
      });

      const req = makeRequest({
        message: "thanks, that's helpful",
        currentThemes: [],
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { suggest: boolean };
      expect(json.suggest).toBe(false);
    });
  });

  describe("graceful degradation", () => {
    it("returns { suggest: false } 200 when the sub-agent throws", async () => {
      vi.mocked(runChatCatchSubAgent).mockRejectedValue(
        new Error("Anthropic error"),
      );

      const req = makeRequest({ message: "x", currentThemes: [] });
      const res = await POST(req as never);
      // The dispatcher itself should swallow errors, but if anything
      // slips through the route layer still returns 200 with suggest:false
      // so the client's fail-closed path renders no chip (neutrality).
      expect(res.status).toBe(200);
      const json = (await res.json()) as { suggest: boolean };
      expect(json.suggest).toBe(false);
    });
  });
});
