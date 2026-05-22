/**
 * Chat-catch judgment sub-agent dispatcher.
 *
 * Spawns a SEPARATE small Anthropic Haiku call with the chat-catch judge
 * prompt (src/lib/prompts/chat-catch-judge.ts) and NO tools. The sub-call
 * decides whether the user's latest message expresses a NEW civic concern
 * not covered by their currently-locked themes — and if so, what neutral
 * noun phrase to surface as a proposed new theme.
 *
 * Why a separate sub-call (instead of inlining into the main chat call):
 *   The chat-catch judgment is orthogonal to the main race-deep-dive
 *   conversation. Inlining it would (a) burn main-conversation context
 *   on a per-message judgment that has nothing to do with the race the
 *   user is researching, and (b) couple the chip's appearance to whatever
 *   tool-use round-trip the main call happens to be in. A focused sub-call
 *   stays cheap, parallelizable, and deterministically fail-closed.
 *
 * Neutrality contract (fix J — the whole point of replacing keywords):
 *   On ANY failure mode (Anthropic error, malformed JSON, missing fields),
 *   the dispatcher returns `{ suggest: false }`. Never falls back to a
 *   keyword heuristic, never surfaces a half-baked theme name. A missing
 *   chat-catch chip is the correct neutral default.
 *
 * Budget accounting: usage from this sub-call is recorded via
 * `recordUsageAsync` so the community budget tier sees both the main
 * conversation AND the chat-catch call. Without this, the feature would
 * hide spend below the dashboard.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { prependSafetyHeader } from "../prompts/safety-header";
import {
  buildChatCatchJudgePrompt,
  type ChatCatchJudgeInput,
} from "../prompts/chat-catch-judge";
import { recordUsageAsync } from "./budget";

export type { ChatCatchJudgeInput };

const CHAT_CATCH_SUB_AGENT_MODEL = "claude-haiku-4-5-20251001";
// The output is one small JSON object. 200 is generous; the typical
// suggest:true response is well under 80 tokens.
const CHAT_CATCH_SUB_AGENT_MAX_TOKENS = 200;
// Lower temperature than the research sub-agent (0.3) — this is a
// judgment, not a generative task; we want consistent shape from the
// model on repeated calls with the same input.
const CHAT_CATCH_SUB_AGENT_TEMPERATURE = 0.2;

/**
 * Result of a chat-catch judgment call.
 *
 * When `suggest` is true the caller renders the soft chip with
 * `suggestedThemeName` as the candidate. When false (or on any failure),
 * the caller renders nothing — neutrality default.
 */
export interface ChatCatchJudgment {
  suggest: boolean;
  /** Neutral 3-7 word noun phrase from the model when suggest=true. */
  suggestedThemeName?: string;
  /** One-sentence rationale from the model when suggest=true. */
  summary?: string;
  /** Token usage from the sub-call. */
  usage: { input: number; output: number; searchCount: number };
}

/**
 * Strip optional markdown code fences (```json ... ```) around the JSON.
 * The system prompt says "JSON ONLY, no prose" but the model sometimes
 * still wraps its output in a fence — strip it before parsing.
 */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

interface ParsedJudgeOutput {
  suggest: unknown;
  suggested_theme_name?: unknown;
  summary?: unknown;
}

/**
 * Parse the model's JSON output and surface it as the canonical
 * ChatCatchJudgment shape. Fails closed (returns suggest:false) on any
 * parse error or shape mismatch — see the neutrality contract above.
 */
function parseJudgeOutput(rawText: string): Omit<ChatCatchJudgment, "usage"> {
  const stripped = stripCodeFences(rawText);
  let parsed: ParsedJudgeOutput;
  try {
    parsed = JSON.parse(stripped) as ParsedJudgeOutput;
  } catch {
    return { suggest: false };
  }
  if (typeof parsed.suggest !== "boolean") {
    return { suggest: false };
  }
  if (!parsed.suggest) {
    return { suggest: false };
  }
  // suggest:true → require a non-empty theme name. Without one we can't
  // render a useful chip; fail closed.
  const themeName =
    typeof parsed.suggested_theme_name === "string"
      ? parsed.suggested_theme_name.trim()
      : "";
  if (themeName.length === 0) {
    return { suggest: false };
  }
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : undefined;
  return {
    suggest: true,
    suggestedThemeName: themeName,
    ...(summary && summary.length > 0 ? { summary } : {}),
  };
}

/**
 * Run the chat-catch judgment sub-agent for one (message, themes) pair.
 *
 * Pure dispatcher: prompts, calls Anthropic, parses, records usage,
 * returns the result. No I/O beyond the API call and the usage record.
 *
 * Fail-closed semantics: ANY exception (Anthropic error, malformed JSON,
 * shape mismatch) is caught and surfaced as { suggest: false }. The route
 * layer doesn't need to special-case anything.
 */
export async function runChatCatchSubAgent(
  input: ChatCatchJudgeInput,
  client: Anthropic,
): Promise<ChatCatchJudgment> {
  const systemText = prependSafetyHeader(buildChatCatchJudgePrompt(input));

  let message: Anthropic.Message;
  try {
    message = (await client.messages.create({
      model: CHAT_CATCH_SUB_AGENT_MODEL,
      max_tokens: CHAT_CATCH_SUB_AGENT_MAX_TOKENS,
      temperature: CHAT_CATCH_SUB_AGENT_TEMPERATURE,
      system: systemText,
      // No tools — this is a text-only judgment call. See the file header.
      messages: [
        {
          role: "user",
          content:
            "Judge the message above and return the JSON object per the contract.",
        },
      ],
      stream: false,
    })) as Anthropic.Message;
  } catch {
    // Anthropic error (5xx, network, timeout) → neutral default. The
    // caller has no fallback path to take; chat continues normally.
    return {
      suggest: false,
      usage: { input: 0, output: 0, searchCount: 0 },
    };
  }

  // Defensive: filter to text-only blocks. The sub-call has no tools so
  // this should always just be a single text block, but we mirror the
  // research-sub-agent's hygiene so any future tool addition can't leak
  // raw content into the parsed output.
  const text = message.content
    .filter(
      (block): block is Anthropic.TextBlock =>
        (block as { type: string }).type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();

  const parsed = parseJudgeOutput(text);

  const usage = message.usage ?? null;
  const input_tokens =
    (usage as { input_tokens?: number } | null)?.input_tokens ?? 0;
  const output_tokens =
    (usage as { output_tokens?: number } | null)?.output_tokens ?? 0;
  const cached_input_tokens =
    (usage as { cache_read_input_tokens?: number } | null)
      ?.cache_read_input_tokens ?? 0;
  const cache_write_tokens =
    (usage as { cache_creation_input_tokens?: number } | null)
      ?.cache_creation_input_tokens ?? 0;

  // Record against the community budget so the sub-call's spend is
  // visible to the tier accounting. The chat-catch call has no
  // web_search → searchCount is always 0.
  if (
    input_tokens > 0 ||
    output_tokens > 0 ||
    cached_input_tokens > 0 ||
    cache_write_tokens > 0
  ) {
    await recordUsageAsync({
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      cachedInputTokens: cached_input_tokens,
      cacheWriteTokens: cache_write_tokens,
      searchCount: 0,
    });
  }

  return {
    ...parsed,
    usage: {
      input: input_tokens,
      output: output_tokens,
      searchCount: 0,
    },
  };
}
