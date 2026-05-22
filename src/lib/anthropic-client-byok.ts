/**
 * BYOK (bring-your-own-key) Anthropic client.
 *
 * Phase 9 — out-of-budget continuity. Power users hit the community-budget
 * exhaustion screen, drop in their own Anthropic API key, and keep going
 * inside Voter Choice. The key is stored in localStorage only and is sent
 * directly to `api.anthropic.com` from the browser — it NEVER reaches the
 * Voter Choice server on any code path. See
 * `.ai/work-packets/redesign-phase-9-out-of-budget-handoff.md`.
 *
 * Security contract:
 *   - `STORAGE_KEY` is the single, well-known localStorage namespace.
 *   - `streamWithByok` reads the key at call time (not session start) so a
 *     refresh or remove is immediately effective.
 *   - On 401 from Anthropic, the surfaced error message NEVER contains the
 *     key value — sanitized to a generic "didn't authenticate" string.
 *   - We pass `anthropic-dangerous-direct-browser-access: true` so the
 *     Anthropic SDK / API tolerates the cross-origin request from the
 *     browser. This is intentional — see the design brief §10 + the packet
 *     architecture decision recorded in the orchestrator's notes.
 */

export const STORAGE_KEY = "voter-choice:byok-anthropic-key";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 4096;

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getByokKey(): string | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setByokKey(key: string): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, key);
  } catch {
    // Quota / disabled storage — non-fatal; UX shows the key wasn't saved
    // via the caller's own state.
  }
}

export function removeByokKey(): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasByokKey(): boolean {
  const key = getByokKey();
  return typeof key === "string" && key.length > 0;
}

export interface ByokChatRequest {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  model?: string;
}

export interface ByokStreamCallbacks {
  onText: (text: string) => void;
  onError: (err: string) => void;
  onDone: () => void;
}

/**
 * Stream a chat completion directly from Anthropic using the BYOK key.
 *
 * Throws synchronously when no key is set. Otherwise resolves after the
 * stream completes (success → `onDone`; error → `onError`).
 *
 * @see ByokStreamCallbacks for the per-event handlers.
 */
export async function streamWithByok(
  req: ByokChatRequest,
  cb: ByokStreamCallbacks,
): Promise<void> {
  const key = getByokKey();
  if (!key || key.length === 0) {
    throw new Error("no byok key set");
  }

  const body = {
    model: req.model ?? DEFAULT_MODEL,
    max_tokens: DEFAULT_MAX_TOKENS,
    system: req.systemPrompt,
    messages: req.messages,
    stream: true,
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    cb.onError(msg);
    return;
  }

  if (!response.ok) {
    if (response.status === 401) {
      cb.onError(
        "Your Anthropic key didn't authenticate. Check it and try again.",
      );
      return;
    }
    // Surface Anthropic's error message verbatim for other failures, but
    // never echo the key.
    let detail = "";
    try {
      const data = (await response.json()) as {
        error?: { message?: string };
      };
      detail = data?.error?.message ?? "";
    } catch {
      detail = (await response.text().catch(() => "")) || "";
    }
    const sanitized = detail.replace(key, "[redacted]");
    cb.onError(sanitized || `Anthropic API error (status ${response.status}).`);
    return;
  }

  if (!response.body) {
    cb.onError("Empty response stream from Anthropic.");
    return;
  }

  try {
    await consumeAnthropicSSE(response.body, cb);
    cb.onDone();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stream error";
    cb.onError(msg.replace(key, "[redacted]"));
  }
}

/**
 * Parse Anthropic's SSE event stream. Each event is `event: <name>` followed
 * by `data: <json>` and a blank line. We only act on `content_block_delta`
 * with a `text_delta` payload (forwarded to `onText`) and `message_stop`
 * (terminates the loop).
 */
async function consumeAnthropicSSE(
  stream: ReadableStream<Uint8Array>,
  cb: ByokStreamCallbacks,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { value, done: readDone } = await reader.read();
    if (readDone) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx = buffer.indexOf("\n\n");
    while (sepIdx !== -1) {
      const eventBlock = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      done = processEvent(eventBlock, cb) || done;
      sepIdx = buffer.indexOf("\n\n");
    }
  }
  // Flush any remaining buffered event (terminal newline missing).
  if (buffer.length > 0) {
    processEvent(buffer, cb);
  }
}

interface AnthropicSSEPayload {
  type?: string;
  delta?: { type?: string; text?: string };
}

function processEvent(eventBlock: string, cb: ByokStreamCallbacks): boolean {
  const lines = eventBlock.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const dataStr = line.slice("data: ".length);
    if (dataStr === "[DONE]") return true;
    let parsed: AnthropicSSEPayload;
    try {
      parsed = JSON.parse(dataStr) as AnthropicSSEPayload;
    } catch {
      continue;
    }
    if (parsed.type === "message_stop") return true;
    if (
      parsed.type === "content_block_delta" &&
      parsed.delta?.type === "text_delta" &&
      typeof parsed.delta.text === "string"
    ) {
      cb.onText(parsed.delta.text);
    }
  }
  return false;
}
