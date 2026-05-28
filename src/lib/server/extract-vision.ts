/**
 * Vision path for `/api/extract-ballot`.
 *
 * Calls Anthropic's Messages API ONCE per PDF page in parallel, sends
 * each page's PNG render + the standardized vision prompt, parses
 * JSON, and returns per-page extractions plus token usage.
 *
 * Retry policy (matches the bake-off): one retry on transient errors
 * (rate limit, network) with exponential backoff. JSON parse failures
 * also retry once with a stricter "JSON only" reminder.
 *
 * This module DOES NOT stitch — the route calls `stitchPages` after
 * collecting per-page results.
 */

import Anthropic from "@anthropic-ai/sdk";
import { VISION_DIRECT_PROMPT } from "./extract-prompt";
import type { PageExtraction } from "./extract-stitcher";

// Sonnet 4.5: latest in the sonnet-4 family per bake-off spec.
export const SONNET_MODEL = "claude-sonnet-4-5";
// 16384 covers Hidalgo-bilingual / FL-composite long pages without
// truncation (bake-off lesson). Per-page input tokens are unchanged
// regardless of parallelism, so this is purely an output-budget knob.
export const SONNET_MAX_TOKENS = 16384;

// Pricing per 1M tokens (Sonnet 4.5, 2025-09 pricing page).
export const SONNET_INPUT_USD_PER_M = 3.0;
export const SONNET_OUTPUT_USD_PER_M = 15.0;

export function sonnetCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  const inUsd = (inputTokens / 1_000_000) * SONNET_INPUT_USD_PER_M;
  const outUsd = (outputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_M;
  return Number((inUsd + outUsd).toFixed(6));
}

export interface PageImage {
  pageIndex: number; // 1-based
  pngBuffer: Buffer;
}

export interface PageVisionResult {
  page: PageExtraction;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
  outcome: "success" | "schema_invalid" | "failed_after_retry";
  error?: string;
}

export interface VisionExtractionResult {
  pageResults: PageVisionResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRetries: number;
  overallOutcome: "success" | "partial" | "failed";
}

// Parse Sonnet's JSON-only response — strip accidental code fences /
// "json" line prefix that some models still emit despite the prompt.
function parseSonnetJson(raw: string): unknown {
  let s = raw.trim();
  if (s.startsWith("```")) {
    const firstNl = s.indexOf("\n");
    if (firstNl > 0) s = s.slice(firstNl + 1);
    if (s.endsWith("```")) s = s.slice(0, -3);
    s = s.trim();
  }
  if (s.startsWith("json\n")) s = s.slice(5).trim();
  return JSON.parse(s);
}

interface CallArgs {
  client: Anthropic;
  promptText: string;
  imagePng: Buffer;
}

interface CallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
}

async function callSonnetVision(
  args: CallArgs,
  retries: number,
): Promise<CallResult> {
  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: "image/png"; data: string };
      }
  > = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: args.imagePng.toString("base64"),
      },
    },
    { type: "text", text: args.promptText },
  ];

  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= retries) {
    try {
      const resp = await args.client.messages.create({
        // SDK 0.39 declares Model as permissive `(string & {})`, so the
        // alias passes through. If "claude-sonnet-4-5" ever 404s, swap
        // to a dated variant via env var.
        model: SONNET_MODEL as Anthropic.Messages.Model,
        max_tokens: SONNET_MAX_TOKENS,
        messages: [
          {
            role: "user",
            content:
              content as unknown as Anthropic.Messages.ContentBlockParam[],
          },
        ],
      });
      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Sonnet returned no text content block");
      }
      return {
        text: textBlock.text,
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        attempts: attempt + 1,
      };
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > retries) break;
      const backoffMs = 1500 * Math.pow(2, attempt - 1);
      console.warn(
        `[extract-vision] Sonnet call failed (attempt ${attempt}): ${(err as Error).message}. Retrying in ${backoffMs}ms.`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

function emptyPage(): PageExtraction {
  return {
    election_metadata: {},
    sections: [],
  };
}

async function extractSinglePage(
  client: Anthropic,
  page: PageImage,
  totalPages: number,
): Promise<PageVisionResult> {
  const promptText = `${VISION_DIRECT_PROMPT}\n\nThis is page ${page.pageIndex} of ${totalPages}.`;
  let inputTokens = 0;
  let outputTokens = 0;
  let attempts = 0;

  try {
    const result = await callSonnetVision(
      { client, promptText, imagePng: page.pngBuffer },
      1,
    );
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;
    attempts += result.attempts;

    try {
      const parsed = parseSonnetJson(result.text) as PageExtraction;
      return {
        page: parsed,
        inputTokens,
        outputTokens,
        attempts,
        outcome: "success",
      };
    } catch {
      // Parse retry with stricter "JSON only" reminder.
      const retryPrompt = `${promptText}\n\nIMPORTANT: Return JSON only. No prose, no markdown fences, no commentary. The response must start with '{' and end with '}'.`;
      const retry = await callSonnetVision(
        { client, promptText: retryPrompt, imagePng: page.pngBuffer },
        1,
      );
      inputTokens += retry.inputTokens;
      outputTokens += retry.outputTokens;
      attempts += retry.attempts;
      try {
        const parsed = parseSonnetJson(retry.text) as PageExtraction;
        return {
          page: parsed,
          inputTokens,
          outputTokens,
          attempts,
          outcome: "success",
        };
      } catch (parseErr2) {
        return {
          page: emptyPage(),
          inputTokens,
          outputTokens,
          attempts,
          outcome: "schema_invalid",
          error: `page ${page.pageIndex}: ${(parseErr2 as Error).message}`,
        };
      }
    }
  } catch (err) {
    return {
      page: emptyPage(),
      inputTokens,
      outputTokens,
      attempts,
      outcome: "failed_after_retry",
      error: `page ${page.pageIndex}: ${(err as Error).message}`,
    };
  }
}

/**
 * Extract ballot data from a list of rendered page images via Sonnet
 * vision in parallel. Returns per-page results — the caller stitches.
 */
export async function extractWithVision(
  client: Anthropic,
  pages: PageImage[],
): Promise<VisionExtractionResult> {
  if (pages.length === 0) {
    return {
      pageResults: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRetries: 0,
      overallOutcome: "failed",
    };
  }

  // Promise.all — fan out per page. Sonnet's per-page throughput is
  // ~10–15s; serial wall-clock blew the 30s budget on multi-page
  // ballots in the bake-off, parallelism collapses it (decision.md
  // "Production integration plan", required for v1).
  const pageResults = await Promise.all(
    pages.map((p) => extractSinglePage(client, p, pages.length)),
  );

  const totalInputTokens = pageResults.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = pageResults.reduce((s, r) => s + r.outputTokens, 0);
  const totalRetries = pageResults.reduce(
    (s, r) => s + Math.max(0, r.attempts - 1),
    0,
  );

  const successes = pageResults.filter((r) => r.outcome === "success").length;
  let overallOutcome: VisionExtractionResult["overallOutcome"];
  if (successes === pageResults.length) overallOutcome = "success";
  else if (successes === 0) overallOutcome = "failed";
  else overallOutcome = "partial";

  return {
    pageResults,
    totalInputTokens,
    totalOutputTokens,
    totalRetries,
    overallOutcome,
  };
}

/**
 * Construct the Anthropic client with the same env-var precedence the
 * existing chat route uses (`ANTHROPIC_VOTER_API` first, fall back to
 * `ANTHROPIC_API_KEY`). Throws if neither is set.
 */
export function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "Missing Anthropic API key (need ANTHROPIC_VOTER_API or ANTHROPIC_API_KEY)",
    );
  }
  return new Anthropic({ apiKey: key });
}
