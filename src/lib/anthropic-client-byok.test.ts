// @vitest-environment jsdom
/**
 * BYOK (bring-your-own-key) client — direct browser-to-Anthropic.
 *
 * Security contract under test:
 *   - Key lives in localStorage only; never reaches the Voter Choice server.
 *   - `streamWithByok` fetches `https://api.anthropic.com/v1/messages` directly.
 *   - On 401 the surfaced error message NEVER contains the key value.
 *   - With no key set, `streamWithByok` throws "no byok key set".
 *
 * Phase 9 — out-of-budget continuity + BYOK. See
 * `.ai/work-packets/redesign-phase-9-out-of-budget-handoff.md`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  STORAGE_KEY,
  getByokKey,
  setByokKey,
  removeByokKey,
  hasByokKey,
  streamWithByok,
} from "./anthropic-client-byok";

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Build a ReadableStream of SSE event lines that mimics an Anthropic
 * /v1/messages streaming response. We emit only the events the client
 * actually consumes: `content_block_delta` with `text_delta` deltas and
 * the terminal `message_stop`. The SSE format is one "event:" line + one
 * "data:" line per event, blank line between events.
 */
function makeAnthropicSSEStream(
  textChunks: string[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  for (const text of textChunks) {
    lines.push("event: content_block_delta");
    lines.push(
      `data: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text },
      })}`,
    );
    lines.push("");
  }
  lines.push("event: message_stop");
  lines.push(`data: ${JSON.stringify({ type: "message_stop" })}`);
  lines.push("");
  const payload = lines.join("\n");

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/* ── Setup ──────────────────────────────────────────────────── */

let originalFetch: typeof fetch;

beforeEach(() => {
  originalFetch = global.fetch;
  window.localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

/* ── localStorage CRUD ─────────────────────────────────────── */

describe("BYOK key storage (localStorage only)", () => {
  it("setByokKey persists into localStorage under STORAGE_KEY", () => {
    setByokKey("sk-ant-test-1234");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("sk-ant-test-1234");
  });

  it("getByokKey reads what setByokKey wrote", () => {
    setByokKey("sk-ant-abc-9999");
    expect(getByokKey()).toBe("sk-ant-abc-9999");
  });

  it("returns null when no key is stored", () => {
    expect(getByokKey()).toBeNull();
    expect(hasByokKey()).toBe(false);
  });

  it("removeByokKey clears the key", () => {
    setByokKey("sk-ant-zzz");
    expect(hasByokKey()).toBe(true);
    removeByokKey();
    expect(getByokKey()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(hasByokKey()).toBe(false);
  });

  it("does NOT issue any fetch when storing/reading the key", () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    setByokKey("sk-ant-no-fetch");
    expect(getByokKey()).toBe("sk-ant-no-fetch");
    removeByokKey();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ── streamWithByok: direct-to-Anthropic, never to our server ─── */

describe("streamWithByok — direct browser-to-Anthropic", () => {
  it("throws when no key is set", async () => {
    await expect(
      streamWithByok(
        {
          systemPrompt: "test",
          messages: [{ role: "user", content: "hi" }],
        },
        { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
      ),
    ).rejects.toThrow(/no byok key set/i);
  });

  it("fetches https://api.anthropic.com/v1/messages with the key in x-api-key", async () => {
    setByokKey("sk-ant-key-abc123");

    const fetchSpy = vi.fn(
      async () =>
        new Response(makeAnthropicSSEStream(["hello"]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    await streamWithByok(
      {
        systemPrompt: "system",
        messages: [{ role: "user", content: "hi" }],
      },
      { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");

    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-key-abc123");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("never sends a request to any voter-choice server route", async () => {
    setByokKey("sk-ant-leakcheck");

    const fetchSpy = vi.fn(
      async () =>
        new Response(makeAnthropicSSEStream(["ok"]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    await streamWithByok(
      {
        systemPrompt: "system",
        messages: [{ role: "user", content: "hi" }],
      },
      { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    );

    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toMatch(/\/api\/(chat|civic|polis|counters)/);
      // Any relative path starting with /api/ is suspect.
      expect(url).not.toMatch(/^\/api\//);
    }
  });

  it("invokes onText per text_delta and onDone at end of stream", async () => {
    setByokKey("sk-ant-stream");

    global.fetch = (async () =>
      new Response(makeAnthropicSSEStream(["foo", "bar", "baz"]), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })) as unknown as typeof fetch;

    const onText = vi.fn();
    const onError = vi.fn();
    const onDone = vi.fn();

    await streamWithByok(
      {
        systemPrompt: "system",
        messages: [{ role: "user", content: "hello" }],
      },
      { onText, onError, onDone },
    );

    expect(onText).toHaveBeenCalledTimes(3);
    expect(onText.mock.calls.map((c) => c[0])).toEqual(["foo", "bar", "baz"]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("on 401 surfaces a sanitized error that does NOT contain the key", async () => {
    setByokKey("sk-ant-secret-leak");

    global.fetch = (async () =>
      jsonResponse(401, {
        error: { type: "authentication_error", message: "invalid api key" },
      })) as unknown as typeof fetch;

    const onError = vi.fn();
    await streamWithByok(
      {
        systemPrompt: "x",
        messages: [{ role: "user", content: "y" }],
      },
      { onText: vi.fn(), onError, onDone: vi.fn() },
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const errMessage: string = onError.mock.calls[0][0];
    expect(errMessage).toMatch(/didn't authenticate|did not authenticate/i);
    // CRITICAL: the surfaced error must not echo the key.
    expect(errMessage).not.toContain("sk-ant-secret-leak");
  });

  it("fully redacts the key even when it appears MULTIPLE times in a non-401 error", async () => {
    const key = "sk-ant-multileak-9999";
    setByokKey(key);

    // Anthropic (or an upstream proxy) echoes the key more than once in the
    // error detail. A single-occurrence .replace() would leak the 2nd+ copy.
    const leaky = `bad request for key ${key}; retry with ${key} removed (${key})`;

    global.fetch = (async () =>
      jsonResponse(400, {
        error: { type: "invalid_request_error", message: leaky },
      })) as unknown as typeof fetch;

    const onError = vi.fn();
    await streamWithByok(
      { systemPrompt: "x", messages: [{ role: "user", content: "y" }] },
      { onText: vi.fn(), onError, onDone: vi.fn() },
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const errMessage: string = onError.mock.calls[0][0];
    // CRITICAL: NO occurrence of the key may survive sanitization.
    expect(errMessage).not.toContain(key);
    expect(errMessage.includes(key)).toBe(false);
  });

  it("uses claude-haiku-4-5-20251001 as the default model", async () => {
    setByokKey("sk-ant-default-model");

    const fetchSpy = vi.fn(
      async () =>
        new Response(makeAnthropicSSEStream(["ok"]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    await streamWithByok(
      {
        systemPrompt: "system",
        messages: [{ role: "user", content: "hi" }],
      },
      { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    );

    const init = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(init?.body as string) as { model: string };
    expect(body.model).toBe("claude-haiku-4-5-20251001");
  });

  it("reads the key from localStorage at call time (refresh is immediate)", async () => {
    setByokKey("sk-ant-original");

    const fetchSpy = vi.fn(
      async () =>
        new Response(makeAnthropicSSEStream(["ok"]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    global.fetch = fetchSpy as unknown as typeof fetch;

    // First call uses the original key.
    await streamWithByok(
      { systemPrompt: "s", messages: [{ role: "user", content: "1" }] },
      { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    );
    expect(
      (fetchSpy.mock.calls[0][1]?.headers as Record<string, string>)[
        "x-api-key"
      ],
    ).toBe("sk-ant-original");

    // Update the key BETWEEN calls — second call must pick up the new value.
    setByokKey("sk-ant-rotated");
    await streamWithByok(
      { systemPrompt: "s", messages: [{ role: "user", content: "2" }] },
      { onText: vi.fn(), onError: vi.fn(), onDone: vi.fn() },
    );
    expect(
      (fetchSpy.mock.calls[1][1]?.headers as Record<string, string>)[
        "x-api-key"
      ],
    ).toBe("sk-ant-rotated");
  });
});
