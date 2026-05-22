// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shouldSuggestAmend } from "./chat-catch-heuristic";

/**
 * After fix J, `shouldSuggestAmend` is a thin client-side wrapper around
 * `POST /api/chat-catch`. The actual judgment runs server-side in a small
 * Haiku sub-call (see src/lib/server/chat-catch-sub-agent.ts).
 *
 * The contract this file guards is the fail-closed neutrality property:
 * ANY failure mode (network error, non-2xx, malformed JSON, missing fields,
 * timeout) → `{ suggest: false }`. A missing chat-catch chip is the right
 * neutral default — never surface a half-baked theme proposal.
 */

describe("shouldSuggestAmend — client-side fetch wrapper", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("POSTs to /api/chat-catch with the message + currentThemes payload", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ suggest: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await shouldSuggestAmend({
      message: "I'm worried about transit.",
      currentThemes: [{ name: "Healthcare", quotes: ["insulin"] }],
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/chat-catch");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.message).toBe("I'm worried about transit.");
    expect(body.currentThemes).toEqual([
      { name: "Healthcare", quotes: ["insulin"] },
    ]);
  });

  it("returns the suggest:true judgment with theme name + summary", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          suggest: true,
          suggestedThemeName: "Public transit",
          summary: "User wants better transit options.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await shouldSuggestAmend({
      message: "I'm worried about transit.",
      currentThemes: [],
    });
    expect(result.suggest).toBe(true);
    expect(result.suggestedThemeName).toBe("Public transit");
    expect(result.summary).toBe("User wants better transit options.");
  });

  it("returns suggest:false cleanly when the API responds with suggest:false", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ suggest: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await shouldSuggestAmend({
      message: "thanks",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
    expect(result.suggestedThemeName).toBeUndefined();
  });

  it("fails closed (suggest:false) when the API returns a 5xx", async () => {
    fetchSpy.mockResolvedValue(new Response("server error", { status: 500 }));

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("fails closed (suggest:false) when fetch throws (network error)", async () => {
    fetchSpy.mockRejectedValue(new TypeError("network error"));

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("fails closed (suggest:false) when the response body is invalid JSON", async () => {
    fetchSpy.mockResolvedValue(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("fails closed (suggest:false) when the response JSON has no suggest field", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ unexpected: "shape" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("fails closed (suggest:false) when the response suggest field is not a boolean", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ suggest: "yes" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("fails closed (suggest:false) when the fetch is aborted by the timeout", async () => {
    // Simulate AbortSignal.timeout firing — fetch rejects with an AbortError.
    const abortError = new DOMException("aborted", "AbortError");
    fetchSpy.mockRejectedValue(abortError);

    const result = await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });
    expect(result.suggest).toBe(false);
  });

  it("sends an AbortSignal so the request can be timed out", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ suggest: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await shouldSuggestAmend({
      message: "x",
      currentThemes: [],
    });

    // Load-bearing: chat-catch is best-effort. Without a timeout the chip
    // appearance could lag forever and frustrate users.
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeDefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
