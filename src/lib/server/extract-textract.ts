/**
 * Textract large-format fallback path for `/api/extract-ballot`.
 *
 * Decision context: Textract's form-native OCR reads dense small-text
 * columns correctly (NJ R-Senate 4/4: Lebovics, Murphy, Zdan, Tabor)
 * where vision downscaling hallucinates. Textract costs ~5× so it is
 * used ONLY for large-format ballots (page area > 1 MP at scale 2.0,
 * per `isLargeFormatPage` in extract-sampler.ts).
 *
 * Architecture:
 *   1. For each rendered page: AnalyzeDocument(FORMS, TABLES).
 *   2. Filter blocks: keep LINE/WORD/KEY_VALUE_SET/TABLE/CELL; drop
 *      PAGE/SELECTION_ELEMENT/MERGED_CELL; strip Geometry/Confidence.
 *   3. Serialize filtered blocks (compact JSON) → Sonnet post-processor
 *      per page using the same prompt as the vision path (consistent
 *      BallotExtraction schema output).
 *   4. Stitch per-page results via the existing `stitchPages`.
 *
 * Token-overflow guard (FL Orange lesson): large/dense ballots can emit
 * >200K tokens from Textract across all pages. We process per-page and
 * estimate ~4 chars/token. If a single page's block JSON exceeds the
 * ~120K-token budget, we degrade gracefully: fall back to the vision
 * extraction for that page rather than crashing.
 *
 * Credentials: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
 * from environment.
 */

import {
  AnalyzeDocumentCommand,
  TextractClient,
  type Block,
} from "@aws-sdk/client-textract";
import Anthropic from "@anthropic-ai/sdk";
import {
  SONNET_MODEL,
  SONNET_MAX_TOKENS,
  type PageImage,
  type PageVisionResult,
} from "./extract-vision";
import { buildPostProcessorPrompt } from "./extract-prompt";
import type { PageExtraction } from "./extract-stitcher";

// AnalyzeDocument FORMS = $0.05/page, +TABLES = $0.015/page → $0.065/page.
export const TEXTRACT_COST_PER_PAGE_USD = 0.065;

// Safe budget for a single Sonnet post-processor call: ~120K tokens
// (= 480K chars at 4 chars/token). A page exceeding this degrades to
// the vision fallback rather than crashing the post-processor.
const TEXTRACT_SAFE_CHARS = 480_000;

// Block types worth keeping for Sonnet normalization.
// WORD kept alongside LINE for form-field fragments on edge cases.
const KEEP_BLOCK_TYPES = new Set([
  "LINE",
  "WORD",
  "KEY_VALUE_SET",
  "TABLE",
  "CELL",
]);

// ---- Block leaning (strip Geometry/Confidence noise) ----

interface LeanBlock {
  Id?: string;
  BlockType?: string;
  Text?: string;
  EntityTypes?: string[];
  Relationships?: Array<{ Type?: string; Ids?: string[] }>;
  RowIndex?: number;
  ColumnIndex?: number;
  RowSpan?: number;
  ColumnSpan?: number;
  Page?: number;
}

function leanBlock(b: Block, pageIndex: number): LeanBlock | null {
  if (!b.BlockType || !KEEP_BLOCK_TYPES.has(b.BlockType)) return null;
  const out: LeanBlock = { BlockType: b.BlockType, Page: pageIndex };
  if (b.Id) out.Id = b.Id;
  if (b.Text) out.Text = b.Text;
  if (b.EntityTypes && b.EntityTypes.length > 0)
    out.EntityTypes = b.EntityTypes;
  if (b.Relationships && b.Relationships.length > 0) {
    out.Relationships = b.Relationships.map((r) => ({
      Type: r.Type,
      Ids: r.Ids,
    }));
  }
  if (b.RowIndex !== undefined) out.RowIndex = b.RowIndex;
  if (b.ColumnIndex !== undefined) out.ColumnIndex = b.ColumnIndex;
  if (b.RowSpan !== undefined && b.RowSpan > 1) out.RowSpan = b.RowSpan;
  if (b.ColumnSpan !== undefined && b.ColumnSpan > 1)
    out.ColumnSpan = b.ColumnSpan;
  return out;
}

// ---- Textract call with throttle retry ----

const TEXTRACT_RETRYABLE = new Set([
  "ThrottlingException",
  "ProvisionedThroughputExceededException",
  "InternalServerError",
  "ServiceUnavailable",
]);

async function analyzeWithRetry(
  client: TextractClient,
  pageBuffer: Buffer,
  pageIndex: number,
): Promise<{ blocks: Block[]; attempts: number }> {
  const maxRetries = 1;
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= maxRetries) {
    try {
      const cmd = new AnalyzeDocumentCommand({
        Document: { Bytes: pageBuffer },
        FeatureTypes: ["FORMS", "TABLES"],
      });
      const resp = await client.send(cmd);
      return { blocks: resp.Blocks ?? [], attempts: attempt + 1 };
    } catch (err) {
      lastErr = err;
      const errName = (err as Error & { name?: string }).name ?? "";
      if (!TEXTRACT_RETRYABLE.has(errName) || attempt >= maxRetries) throw err;
      attempt += 1;
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.warn(
        `[extract-textract] page ${pageIndex}: Textract ${errName}, retry in ${backoffMs}ms`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

// ---- Sonnet post-processor (text-only, same prompt as pdfjs path) ----

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

async function callSonnetPostProcessor(
  client: Anthropic,
  blocksJson: string,
): Promise<{
  page: PageExtraction;
  inputTokens: number;
  outputTokens: number;
  attempts: number;
}> {
  const prompt = buildPostProcessorPrompt(blocksJson);
  let attempt = 0;
  let lastErr: unknown = null;
  while (attempt <= 1) {
    try {
      const resp = await client.messages.create({
        model: SONNET_MODEL as Anthropic.Messages.Model,
        max_tokens: SONNET_MAX_TOKENS,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      });
      const textBlock = resp.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Sonnet returned no text content block");
      }
      try {
        const parsed = parseSonnetJson(textBlock.text) as PageExtraction;
        return {
          page: parsed,
          inputTokens: resp.usage.input_tokens,
          outputTokens: resp.usage.output_tokens,
          attempts: attempt + 1,
        };
      } catch {
        if (attempt >= 1) throw new Error("Sonnet returned non-JSON on retry");
        // First parse failure → retry with strict JSON-only reminder.
        const strictPrompt = `${prompt}\n\nIMPORTANT: Return JSON only. No prose, no markdown fences, no commentary. The response must start with '{' and end with '}'.`;
        attempt += 1;
        const resp2 = await client.messages.create({
          model: SONNET_MODEL as Anthropic.Messages.Model,
          max_tokens: SONNET_MAX_TOKENS,
          messages: [
            { role: "user", content: [{ type: "text", text: strictPrompt }] },
          ],
        });
        const tb2 = resp2.content.find((b) => b.type === "text");
        if (!tb2 || tb2.type !== "text")
          throw new Error("Sonnet returned no text on retry");
        const parsed2 = parseSonnetJson(tb2.text) as PageExtraction;
        return {
          page: parsed2,
          inputTokens: resp.usage.input_tokens + resp2.usage.input_tokens,
          outputTokens: resp.usage.output_tokens + resp2.usage.output_tokens,
          attempts: attempt + 1,
        };
      }
    } catch (err) {
      lastErr = err;
      attempt += 1;
      if (attempt > 1) break;
      const backoffMs = 1500;
      console.warn(
        `[extract-textract] Sonnet call failed (attempt ${attempt}): ${(err as Error).message}. Retrying in ${backoffMs}ms.`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

// ---- Public result types ----

export interface PageTextractResult {
  page: PageExtraction;
  inputTokens: number;
  outputTokens: number;
  textractRetries: number;
  sonnetAttempts: number;
  outcome: "success" | "overflow_vision_fallback" | "failed";
  error?: string;
}

export interface TextractExtractionResult {
  pageResults: PageTextractResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTextractRetries: number;
  overallOutcome: "success" | "partial" | "failed";
}

// ---- AWS client constructor ----

/**
 * Build a TextractClient from standard AWS env vars.
 * Throws (early) if credentials are absent so the route can fall back
 * to the vision sampling stopgap rather than hitting Textract with no creds.
 */
export function getTextractClient(): TextractClient {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing AWS credentials (need AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)",
    );
  }
  return new TextractClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
  });
}

// ---- Per-page Textract + Sonnet extraction ----

async function extractSinglePageWithTextract(
  textractClient: TextractClient,
  anthropicClient: Anthropic,
  page: PageImage,
  totalPages: number,
  visionFallback: (p: PageImage) => Promise<PageVisionResult>,
): Promise<PageTextractResult> {
  // Step 1: Textract OCR for this page.
  let rawBlocks: Block[] = [];
  let textractRetries = 0;
  try {
    const { blocks, attempts } = await analyzeWithRetry(
      textractClient,
      page.pngBuffer,
      page.pageIndex,
    );
    rawBlocks = blocks;
    textractRetries = attempts - 1;
  } catch (err) {
    return {
      page: { election_metadata: {}, sections: [] },
      inputTokens: 0,
      outputTokens: 0,
      textractRetries,
      sonnetAttempts: 0,
      outcome: "failed",
      error: `textract page ${page.pageIndex}: ${(err as Error).message}`,
    };
  }

  // Step 2: Lean + serialize blocks.
  const leanBlocks: LeanBlock[] = [];
  for (const b of rawBlocks) {
    const l = leanBlock(b, page.pageIndex);
    if (l) leanBlocks.push(l);
  }
  const blocksJson = JSON.stringify(leanBlocks);

  // Step 3: Overflow guard — if single page exceeds safe budget, fall back
  // to vision for this page rather than blowing the Sonnet post-processor.
  if (blocksJson.length > TEXTRACT_SAFE_CHARS) {
    console.warn(
      `[extract-textract] page ${page.pageIndex}: block JSON ${(blocksJson.length / 1024).toFixed(0)}KB > ${(TEXTRACT_SAFE_CHARS / 1024).toFixed(0)}KB budget → vision fallback`,
    );
    const visionResult = await visionFallback(page);
    return {
      page: visionResult.page,
      inputTokens: visionResult.inputTokens,
      outputTokens: visionResult.outputTokens,
      textractRetries,
      sonnetAttempts: visionResult.attempts,
      outcome: "overflow_vision_fallback",
      error: `page ${page.pageIndex}: Textract block overflow, used vision`,
    };
  }

  // Step 4: Sonnet post-processor.
  try {
    const sonnetResult = await callSonnetPostProcessor(
      anthropicClient,
      blocksJson,
    );
    return {
      page: sonnetResult.page,
      inputTokens: sonnetResult.inputTokens,
      outputTokens: sonnetResult.outputTokens,
      textractRetries,
      sonnetAttempts: sonnetResult.attempts,
      outcome: "success",
    };
  } catch (err) {
    return {
      page: { election_metadata: {}, sections: [] },
      inputTokens: 0,
      outputTokens: 0,
      textractRetries,
      sonnetAttempts: 0,
      outcome: "failed",
      error: `sonnet page ${page.pageIndex}: ${(err as Error).message}`,
    };
  }
}

// ---- Main export ----

/**
 * Extract ballot data from rendered page images via AWS Textract + Sonnet.
 *
 * Processes each page in parallel. For any page whose Textract block JSON
 * exceeds the ~120K-token budget, degrades to the vision path for that page.
 *
 * @param textractClient  Pre-constructed TextractClient.
 * @param anthropicClient Pre-constructed Anthropic client.
 * @param pages           Rendered pages (same shape as vision path).
 * @param visionFallback  Per-page vision function for overflow degradation.
 */
export async function extractWithTextract(
  textractClient: TextractClient,
  anthropicClient: Anthropic,
  pages: PageImage[],
  visionFallback: (p: PageImage) => Promise<PageVisionResult>,
): Promise<TextractExtractionResult> {
  if (pages.length === 0) {
    return {
      pageResults: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTextractRetries: 0,
      overallOutcome: "failed",
    };
  }

  // Fan out per-page in parallel.
  const pageResults = await Promise.all(
    pages.map((p) =>
      extractSinglePageWithTextract(
        textractClient,
        anthropicClient,
        p,
        pages.length,
        visionFallback,
      ),
    ),
  );

  const totalInputTokens = pageResults.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = pageResults.reduce((s, r) => s + r.outputTokens, 0);
  const totalTextractRetries = pageResults.reduce(
    (s, r) => s + r.textractRetries,
    0,
  );

  const successes = pageResults.filter(
    (r) => r.outcome === "success" || r.outcome === "overflow_vision_fallback",
  ).length;
  let overallOutcome: TextractExtractionResult["overallOutcome"];
  if (successes === pageResults.length) overallOutcome = "success";
  else if (successes === 0) overallOutcome = "failed";
  else overallOutcome = "partial";

  return {
    pageResults,
    totalInputTokens,
    totalOutputTokens,
    totalTextractRetries,
    overallOutcome,
  };
}
