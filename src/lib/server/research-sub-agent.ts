/**
 * Research sub-agent dispatcher.
 *
 * Spawns a SEPARATE Anthropic Haiku call with the focused-research prompt
 * (src/lib/prompts/research-candidate.ts) and `web_search` as the only
 * tool. The sub-call burns its own context on raw web pages and returns
 * ONLY a distilled 3-bullet summary, which the chat route then feeds back
 * to the main conversation as a tool_result. The main race-deep-dive
 * conversation never sees raw web content — that's the context-hygiene
 * win the `research_candidate` tool exists to deliver.
 *
 * The Anthropic client is dependency-injected so the chat route can pass
 * the same instance it already constructed (one API key, one place to
 * configure). Calls are non-streaming because the sub-call's output is
 * a single short distilled message — streaming buys nothing here.
 *
 * Budget accounting: usage from this sub-call is recorded via
 * `recordUsageAsync` so the community budget tier sees both the main
 * conversation AND the sub-call. Without this, the tool would hide
 * spend below the dashboard.
 *
 * Usage-metrics accounting: usage is ALSO recorded via `recordChatUsage`
 * (chat_usage_metrics, callKind "research") — the content-free, per-call
 * instrumentation that lets us see WHY the community budget drained
 * (call counts / token totals / model / timestamp over time) without
 * storing any message text, candidate name, or other identifying content.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { prependSafetyHeader } from "../prompts/safety-header";
import { frameUntrustedRetrievedData } from "../prompts/untrusted-framing";
import {
  buildResearchCandidatePrompt,
  type ResearchCandidateInput,
} from "../prompts/research-candidate";
import {
  buildStructuredResearchPrompt,
  type StructuredResearchInput,
  type StructuredIssueResult,
} from "../prompts/research-candidate-structured";
import { recordUsageAsync } from "./budget";
import { recordChatUsage } from "./chat-usage-metrics";

export type {
  ResearchCandidateInput,
  StructuredResearchInput,
  StructuredIssueResult,
};

const RESEARCH_SUB_AGENT_MODEL = "claude-haiku-4-5-20251001";
const RESEARCH_SUB_AGENT_MAX_TOKENS = 400; // distilled output; not raw pages.
const RESEARCH_SUB_AGENT_MAX_WEB_SEARCH = 3;
// Structured research produces JSON — allow more tokens so the array fits
// (each issue ~150 tokens × N issues). 6 issues × 200 = 1200, cap at 1500.
const STRUCTURED_RESEARCH_MAX_TOKENS = 1500;
// Threshold below which we consider the sub-call's text "no useful info".
// Three bullets at ≤30 words each ≈ 200–400 chars; anything well under that
// can't be a valid distilled answer.
const UNAVAILABLE_MIN_CHARS = 20;

// The SDK 0.39.0 doesn't yet type the server tool counter; use the same
// shape the chat route uses to extract it.
type UsageWithServerTools =
  { server_tool_use?: { web_search_requests?: number } } | null | undefined;

function extractSearchCount(usage: UsageWithServerTools): number {
  return (
    (usage as { server_tool_use?: { web_search_requests?: number } })
      ?.server_tool_use?.web_search_requests ?? 0
  );
}

/**
 * Result of a sub-agent research call.
 *
 * `summary` is the distilled text that gets fed back to the main
 * conversation as the tool_result content. `usage` exposes the sub-call's
 * token + search counts so callers can surface them in logs (the actual
 * billing call lives inside the dispatcher). `unavailable` is true when
 * the sub-agent couldn't produce useful output — the chat route should
 * mark the tool_result with this flag so the main model knows to fall
 * back to "no public record found" language.
 */
export interface ResearchResult {
  /**
   * 3-bullet distilled summary plus sources line, wrapped in untrusted-data
   * delimiters (see frameUntrustedRetrievedData). This is web-derived content
   * fed back to the main model as tool_result, so it carries the framing at its
   * source. Empty string when the sub-call produced nothing (unavailable).
   */
  summary: string;
  /** Token / search usage from the sub-call. */
  usage: { input: number; output: number; searchCount: number };
  /** True when the sub-call returned essentially empty text. */
  unavailable?: boolean;
}

/**
 * Run the focused research sub-agent for one candidate × topic.
 *
 * Pure dispatcher: prompts, calls Anthropic, distills, records usage,
 * returns the result. No I/O beyond the API call and the usage record.
 */
export async function runResearchSubAgent(
  input: ResearchCandidateInput,
  client: Anthropic,
): Promise<ResearchResult> {
  const systemText = prependSafetyHeader(buildResearchCandidatePrompt(input));

  // SDK 0.39.0 doesn't yet type server tools (web_search) — cast through
  // unknown the same way the chat route does in route.ts.
  const tools = [
    {
      type: "web_search_20250305" as const,
      name: "web_search",
      max_uses: RESEARCH_SUB_AGENT_MAX_WEB_SEARCH,
    },
  ] as unknown as Anthropic.Tool[];

  const message = (await client.messages.create({
    model: RESEARCH_SUB_AGENT_MODEL,
    max_tokens: RESEARCH_SUB_AGENT_MAX_TOKENS,
    temperature: 0.3,
    system: systemText,
    tools,
    // Single user turn: the system prompt already carries the full instruction
    // set. The user message is a thin trigger so the model has a turn to
    // respond to.
    messages: [
      {
        role: "user",
        content: "Begin research and return the 3-bullet summary.",
      },
    ],
    stream: false,
  })) as Anthropic.Message;

  // Filter to text-only blocks. Anthropic may return server_tool_use and
  // web_search_tool_result blocks alongside text — those contain raw page
  // content we MUST NOT leak into the returned summary.
  const summary = message.content
    .filter(
      (block): block is Anthropic.TextBlock =>
        (block as { type: string }).type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();

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
  const searchCount = extractSearchCount(usage as UsageWithServerTools);

  // Record against the community budget so the sub-call's spend is visible
  // to the tier accounting. recordUsageAsync handles the durable-store
  // bookkeeping; we just hand it the same shape the chat route uses.
  if (
    input_tokens > 0 ||
    output_tokens > 0 ||
    cached_input_tokens > 0 ||
    cache_write_tokens > 0 ||
    searchCount > 0
  ) {
    await recordUsageAsync({
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      cachedInputTokens: cached_input_tokens,
      cacheWriteTokens: cache_write_tokens,
      searchCount,
    });
    // Anonymous per-request cost telemetry — same fail-soft helper the chat
    // route uses, discriminated as call_kind:'research' so the sub-call's
    // spend is visible in chat_usage_metrics. Stores NO identifier
    // (no session, no IP, no address, no prompt text).
    await recordChatUsage(
      {
        inputTokens: input_tokens,
        cacheReadTokens: cached_input_tokens,
        cacheWriteTokens: cache_write_tokens,
        outputTokens: output_tokens,
        webSearchCount: searchCount,
      },
      { model: RESEARCH_SUB_AGENT_MODEL, callKind: "research" },
    );
  }

  const unavailable = summary.length < UNAVAILABLE_MIN_CHARS;

  // Indirect prompt injection defense: this text is distilled from arbitrary
  // web pages and is fed straight back into the main model as tool_result
  // content. Frame it as untrusted data so embedded instructions can't steer
  // the main conversation. Unavailability is computed on the raw length above,
  // before framing inflates it.
  const framedSummary =
    summary.length > 0 ? frameUntrustedRetrievedData(summary) : summary;

  return {
    summary: framedSummary,
    usage: {
      input: input_tokens,
      output: output_tokens,
      searchCount,
    },
    ...(unavailable ? { unavailable: true } : {}),
  };
}

/**
 * Result of a structured research call.
 *
 * `issues` contains one entry per issue in the request (some may have empty
 * evidence when the model couldn't find reliable sources — callers must drop
 * those before persisting). `usage` mirrors the prose sub-agent's shape for
 * uniform budget accounting.
 */
export interface StructuredResearchResult {
  issues: StructuredIssueResult[];
  usage: { input: number; output: number; searchCount: number };
}

/**
 * Run the structured research sub-agent for one candidate × N issues.
 *
 * Returns per-issue resolvedStance + confidence + evidence[]. Evidence items
 * with no real URL are left in the raw output; the caller (candidate-data.ts)
 * filters them before persisting.
 *
 * Budget accounting: same recordUsageAsync pattern as `runResearchSubAgent`.
 */
export async function runStructuredCandidateResearch(
  input: StructuredResearchInput,
  client: Anthropic,
): Promise<StructuredResearchResult> {
  const systemText = prependSafetyHeader(buildStructuredResearchPrompt(input));

  const tools = [
    {
      type: "web_search_20250305" as const,
      name: "web_search",
      max_uses: RESEARCH_SUB_AGENT_MAX_WEB_SEARCH,
    },
  ] as unknown as Anthropic.Tool[];

  const message = (await client.messages.create({
    model: RESEARCH_SUB_AGENT_MODEL,
    max_tokens: STRUCTURED_RESEARCH_MAX_TOKENS,
    temperature: 0.1, // lower temp for structured JSON output
    system: systemText,
    tools,
    messages: [
      {
        role: "user",
        content: "Begin research and return the JSON array.",
      },
    ],
    stream: false,
  })) as Anthropic.Message;

  // Extract text-only blocks; discard raw web content blocks.
  const rawText = message.content
    .filter(
      (block): block is Anthropic.TextBlock =>
        (block as { type: string }).type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();

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
  const searchCount = extractSearchCount(usage as UsageWithServerTools);

  if (
    input_tokens > 0 ||
    output_tokens > 0 ||
    cached_input_tokens > 0 ||
    cache_write_tokens > 0 ||
    searchCount > 0
  ) {
    await recordUsageAsync({
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      cachedInputTokens: cached_input_tokens,
      cacheWriteTokens: cache_write_tokens,
      searchCount,
    });
    // Anonymous per-request cost telemetry — same content-free policy as the
    // prose sub-agent above (call_kind:'research', counts only, NO PII).
    await recordChatUsage(
      {
        inputTokens: input_tokens,
        cacheReadTokens: cached_input_tokens,
        cacheWriteTokens: cache_write_tokens,
        outputTokens: output_tokens,
        webSearchCount: searchCount,
      },
      { model: RESEARCH_SUB_AGENT_MODEL, callKind: "research" },
    );
  }

  // Parse JSON — be permissive about leading/trailing text the model may emit.
  let issues: StructuredIssueResult[] = [];
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        issues = parsed
          .filter(
            (item): item is StructuredIssueResult =>
              item !== null &&
              typeof item === "object" &&
              typeof (item as Record<string, unknown>).canonicalIssue ===
                "string" &&
              typeof (item as Record<string, unknown>).issueLabel ===
                "string" &&
              typeof (item as Record<string, unknown>).resolvedStance ===
                "string" &&
              typeof (item as Record<string, unknown>).confidence === "string",
          )
          .map((item) => ({
            ...item,
            evidence: Array.isArray(item.evidence) ? item.evidence : [],
          }));
      }
    } catch {
      // JSON parse failed — return empty array; caller handles gracefully.
    }
  }

  return {
    issues,
    usage: {
      input: input_tokens,
      output: output_tokens,
      searchCount,
    },
  };
}
