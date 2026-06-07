/**
 * POST /api/extract-ballot
 *
 * Extracts structured ballot data from an uploaded PDF using a two-path
 * pipeline:
 *   1. Cheap path — pdfjs-dist text extraction → Sonnet post-processor
 *      normalizes the raw text to the target schema. Used when the
 *      detector decides the embedded text layer is usable.
 *   2. Vision path — render each PDF page to PNG, fan out per-page
 *      Sonnet vision calls in parallel, stitch results. Used when the
 *      text layer is garbled (NJ Camden shape) or empty.
 *
 * Response schema is documented in `extract-types.ts` (`BallotExtraction`)
 * and produced by `stitchPages`. The `_meta` field carries telemetry
 * (detector decision, latency, cost, retries) for production observability.
 *
 * Telemetry: every routing decision is logged via console.log JSON shape
 * so Vercel function logs can be tail-scraped post-launch to tune the
 * detector floors (per decision-design.md §"Threshold tuning is deferred
 * to production").
 */

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync } from "../../../lib/server/rate-limit";
import {
  isDurableStoreConfigured,
  redisCommand,
} from "../../../lib/server/durable-store";
import { recordBlock } from "../../../lib/server/usage-telemetry";
import {
  decideExtractionPath,
  scoreExtractedText,
  type PathDecision,
} from "../../../lib/server/extract-detector";
import {
  extractTextFromPdf,
  renderPdfPages,
} from "../../../lib/server/extract-pdfjs";
import {
  extractWithVision,
  getAnthropicClient,
  sonnetCostUsd,
  SONNET_MODEL,
  type PageImage,
} from "../../../lib/server/extract-vision";
import { buildPostProcessorPrompt } from "../../../lib/server/extract-prompt";
import {
  reconcilePageSamples,
  isLargeFormatPage,
  SAMPLE_COUNT,
} from "../../../lib/server/extract-sampler";
import {
  extractWithTextract,
  getTextractClient,
  TEXTRACT_COST_PER_PAGE_USD,
} from "../../../lib/server/extract-textract";
import {
  stitchPages,
  type PageExtraction,
} from "../../../lib/server/extract-stitcher";
import {
  toPublicExtractMeta,
  type BallotExtraction,
  type ExtractMeta,
  type ExtractionPath,
} from "../../../lib/server/extract-types";

export const runtime = "nodejs";
// Worst-case ballot is 14-page bilingual Hidalgo at ~90s wall-clock with
// per-page parallelism (per decision.md). Pad to 120s to cover network
// jitter and rate-limit backoff. Vercel Pro caps at 300s.
export const maxDuration = 120;

// 10MB local limit. Note: Vercel serverless functions have a platform
// body-size limit (4.5MB on Hobby, configurable on Pro). If a deployed
// upload trips the Vercel-level reject before reaching this handler,
// lower this value to match the deployed plan and surface the friendlier
// 413 error inline rather than a generic 413 from Vercel's gateway.
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_SESSION_ID_CHARS = 128;

// 16384 covers Hidalgo-bilingual / FL-composite long pages without
// truncation (matches vision module).
const SONNET_POST_PROCESSOR_MAX_TOKENS = 16384;

// Hash-based extraction cache (Fix 2). Content-addressed by SHA-256 of the
// uploaded PDF bytes: two voters in the same county uploading the same
// official sample ballot reuse one Sonnet vision extraction. The 30-day
// TTL is the upper bound — sample ballots can be reissued (typo fixes,
// late candidates) but rarely within a month, and 30 days easily spans
// the early-voting window where the same PDF gets uploaded most.
const EXTRACTION_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

function pdfBytesHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// Cache key version. Bumped to v2 (2026-05-28) to invalidate every
// pre-fix cache entry after the P0 Harris County TX metadata-leakage
// fix. Bumped to v3 (2026-06-04) for the F1 fix: large-format ballots
// had fabricated candidate names cached (and re-cached during diagnosis)
// under their PDF SHA — those poisoned entries MUST be evicted so uploads
// hit the new sample-and-reconcile pipeline instead of the stale read.
// Bumped to v4 (2026-06-05) for WS1: Textract large-format path +
// `low_confidence` field added to ExtractMeta/PublicExtractMeta. Output
// shape changed → stale v3 entries must be evicted so the new confidence
// flag is correctly populated on cache reads.
// Reusable: any future incident where the extraction shape could be
// quietly malformed (model regression, schema migration, etc.) should
// bump this counter to evict stale entries rather than patch validation
// onto reads.
// Bumped v4→v5 (2026-06-05): evict stale sampling-stopgap extractions so
// large-format ballots re-run through the now-wired Textract path.
// Bumped v5→v6 (2026-06-07): measure_text added to ExtractRace schema;
// evict cached extractions that lack ballot measure body text.
const EXTRACTION_CACHE_VERSION = "v6";

function extractionCacheKey(hash: string): string {
  return `voter-choice:extraction:${EXTRACTION_CACHE_VERSION}:${hash}`;
}

/**
 * Cache lookup. Returns the parsed `BallotExtraction` on hit, `null` on
 * miss / unconfigured backend / any Redis error. NEVER throws — extraction
 * MUST proceed even when caching is unavailable.
 */
async function readExtractionCache(
  hash: string,
): Promise<BallotExtraction | null> {
  if (!isDurableStoreConfigured()) return null;
  try {
    const raw = await redisCommand<string>(["GET", extractionCacheKey(hash)]);
    if (!raw) return null;
    return JSON.parse(raw) as BallotExtraction;
  } catch (err) {
    // Backend hiccup — log and degrade.
    logJson({
      event: "extract.cache_error",
      op: "read",
      hash_prefix: hash.slice(0, 8),
      message: (err as Error).message,
    });
    return null;
  }
}

/**
 * Fire-and-forget cache write. Telemetry-only — failures must not delay
 * the response. We `void` the promise rather than `await` so the user's
 * extracted ballot returns immediately.
 */
function writeExtractionCache(hash: string, payload: BallotExtraction): void {
  if (!isDurableStoreConfigured()) return;
  // The redisCommand wrapper returns null when Upstash is unconfigured —
  // but we already checked isDurableStoreConfigured() above. Wrap the
  // promise so a transport error doesn't crash the request.
  void (async () => {
    try {
      await redisCommand([
        "SETEX",
        extractionCacheKey(hash),
        EXTRACTION_CACHE_TTL_SECONDS,
        JSON.stringify(payload),
      ]);
    } catch (err) {
      logJson({
        event: "extract.cache_error",
        op: "write",
        hash_prefix: hash.slice(0, 8),
        message: (err as Error).message,
      });
    }
  })();
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

interface TelemetryDetectorLog {
  event: "extract.detector_decision";
  dictionary_ratio: number;
  ballot_vocab_hits: number;
  proper_noun_count: number;
  decision_reason: string;
  path_chosen: ExtractionPath;
  pdf_size_bytes: number;
  num_pages: number;
}

interface TelemetryCompletedLog {
  event: "extract.completed";
  path: ExtractionPath;
  pages: number;
  latency_ms: number;
  cost_usd: number;
  pdf_size_bytes: number;
  retries: number;
  outcome:
    | "success"
    | "vision_failed"
    | "pdfjs_failed_then_vision_succeeded"
    | "all_failed";
}

interface TelemetryCacheLog {
  event: "extract.cache_hit" | "extract.cache_miss";
  hash_prefix: string;
  pdf_size_bytes: number;
}

function logJson<T>(payload: T): void {
  try {
    console.log(JSON.stringify(payload));
  } catch {
    // Never throw from telemetry.
  }
}

function jsonError(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

interface ParsedFormData {
  buffer: Buffer;
  sizeBytes: number;
  fileName: string;
}

async function parseUpload(
  request: NextRequest,
): Promise<ParsedFormData | { error: NextResponse }> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { error: jsonError(400, { error: "Invalid multipart form data" }) };
  }
  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") {
    return {
      error: jsonError(400, {
        error: "Missing 'file' field (multipart upload required)",
      }),
    };
  }
  const file = fileEntry as File;
  if (file.size > MAX_PDF_BYTES) {
    return {
      error: jsonError(413, {
        error: `PDF too large (${file.size} bytes > ${MAX_PDF_BYTES})`,
      }),
    };
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, sizeBytes: file.size, fileName: file.name };
}

interface CheapPathResult {
  ok: true;
  page: PageExtraction;
  inputTokens: number;
  outputTokens: number;
}

interface CheapPathFailure {
  ok: false;
  error: string;
}

function parseJsonFromSonnet(raw: string): unknown {
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

async function runCheapPath(
  client: Anthropic,
  rawText: string,
): Promise<CheapPathResult | CheapPathFailure> {
  const prompt = buildPostProcessorPrompt(rawText);
  try {
    const resp = await client.messages.create({
      model: SONNET_MODEL as Anthropic.Messages.Model,
      max_tokens: SONNET_POST_PROCESSOR_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    });
    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "Sonnet returned no text content" };
    }
    let parsed: PageExtraction;
    try {
      parsed = parseJsonFromSonnet(textBlock.text) as PageExtraction;
    } catch (err) {
      return {
        ok: false,
        error: `Sonnet post-processor returned non-JSON: ${(err as Error).message}`,
      };
    }
    return {
      ok: true,
      page: parsed,
      inputTokens: resp.usage.input_tokens,
      outputTokens: resp.usage.output_tokens,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

interface VisionRunSuccess {
  error: null;
  pages: PageExtraction[];
  inputTokens: number;
  outputTokens: number;
  retries: number;
  usedTextract: boolean;
  isLargeFormat: boolean;
}
interface VisionRunFailure {
  error: Record<string, unknown>;
}

/**
 * Per-page vision fallback helper used by the Textract overflow handler.
 * Extracts a single page via Sonnet vision and returns the PageVisionResult.
 */
async function visionFallbackForPage(
  anthropicClient: Anthropic,
  page: PageImage,
  _totalPages: number,
): Promise<import("../../../lib/server/extract-vision").PageVisionResult> {
  const { extractWithVision: _ev } = await import(
    "../../../lib/server/extract-vision"
  );
  const result = await _ev(anthropicClient, [page]);
  return (
    result.pageResults[0] ?? {
      page: { election_metadata: {}, sections: [] },
      inputTokens: 0,
      outputTokens: 0,
      attempts: 0,
      outcome: "failed" as const,
      error: `page ${page.pageIndex}: vision fallback returned no result`,
    }
  );
}

async function runVisionPath(
  client: Anthropic,
  buffer: Buffer,
): Promise<VisionRunSuccess | VisionRunFailure> {
  let pages;
  try {
    pages = await renderPdfPages(new Uint8Array(buffer), { scale: 2.0 });
  } catch (err) {
    return {
      error: {
        error: `Failed to render PDF pages: ${(err as Error).message}`,
      },
    };
  }
  if (pages.length === 0) {
    return { error: { error: "PDF has no pages to render" } };
  }
  const images: PageImage[] = pages.map((p) => ({
    pageIndex: p.pageIndex,
    pngBuffer: p.pngBuffer,
  }));

  const hasLargeFormat = pages.some((p) =>
    isLargeFormatPage(p.width, p.height, 2.0),
  );

  // Large-format ballots → try Textract path (the real fix).
  // Fall back to the sampling-with-abstention stopgap if AWS creds are
  // absent or Textract throws, so the route never crashes.
  if (hasLargeFormat) {
    let textractClient;
    try {
      textractClient = getTextractClient();
    } catch (credErr) {
      // AWS creds missing → fall through to sampling stopgap below.
      console.warn(
        `[extract-ballot] Textract unavailable (${(credErr as Error).message}); falling back to sampling stopgap`,
      );
    }

    if (textractClient) {
      try {
        const textractResult = await extractWithTextract(
          textractClient,
          client,
          images,
          (p) => visionFallbackForPage(client, p, images.length),
        );
        if (textractResult.overallOutcome !== "failed") {
          return {
            error: null,
            pages: textractResult.pageResults.map((r) => r.page),
            inputTokens: textractResult.totalInputTokens,
            outputTokens: textractResult.totalOutputTokens,
            retries: textractResult.totalTextractRetries,
            usedTextract: true,
            isLargeFormat: true,
          };
        }
        // Textract failed → fall through to sampling stopgap.
        console.warn(
          "[extract-ballot] Textract extraction failed; falling back to sampling stopgap",
        );
      } catch (textractErr) {
        console.warn(
          `[extract-ballot] Textract threw (${(textractErr as Error).message}); falling back to sampling stopgap`,
        );
      }
    }

    // Sampling-with-abstention fallback (original stopgap for large-format).
    // NOTE: fans out SAMPLE_COUNT × pages concurrent vision calls.
    const samples = await Promise.all(
      Array.from({ length: SAMPLE_COUNT }, () =>
        extractWithVision(client, images),
      ),
    );
    const usable = samples.filter((s) => s.overallOutcome !== "failed");
    if (usable.length === 0) {
      const firstError = samples[0]?.pageResults.find((r) => r.error)?.error;
      return {
        error: {
          error: firstError ?? "All pages failed extraction",
          outcome: "all_failed",
        },
      };
    }
    const reconciled = reconcilePageSamples(
      usable.map((s) => s.pageResults.map((r) => r.page)),
    );
    return {
      error: null,
      pages: reconciled,
      inputTokens: samples.reduce((s, v) => s + v.totalInputTokens, 0),
      outputTokens: samples.reduce((s, v) => s + v.totalOutputTokens, 0),
      retries: samples.reduce((s, v) => s + v.totalRetries, 0),
      usedTextract: false,
      isLargeFormat: true,
    };
  }

  // Normal (non-large-format) ballots: single-shot vision.
  const vision = await extractWithVision(client, images);
  if (vision.overallOutcome === "failed") {
    const firstError = vision.pageResults.find((r) => r.error)?.error;
    return {
      error: {
        error: firstError ?? "All pages failed extraction",
        outcome: "all_failed",
      },
    };
  }
  return {
    error: null,
    pages: vision.pageResults.map((r) => r.page),
    inputTokens: vision.totalInputTokens,
    outputTokens: vision.totalOutputTokens,
    retries: vision.totalRetries,
    usedTextract: false,
    isLargeFormat: false,
  };
}

interface DispatchResult {
  pages: PageExtraction[];
  inputTokens: number;
  outputTokens: number;
  retries: number;
  finalPath: ExtractionPath;
  outcome: TelemetryCompletedLog["outcome"];
  errorBody: Record<string, unknown> | null;
  /** Set to true when the ballot has large-format pages (triggers voter-facing warning). */
  isLargeFormat: boolean;
}

async function dispatchExtraction(
  client: Anthropic,
  decision: PathDecision,
  rawText: string,
  buffer: Buffer,
): Promise<DispatchResult> {
  if (decision.path === "pdfjs") {
    const cheap = await runCheapPath(client, rawText);
    if (cheap.ok) {
      return {
        pages: [cheap.page],
        inputTokens: cheap.inputTokens,
        outputTokens: cheap.outputTokens,
        retries: 0,
        finalPath: "pdfjs",
        outcome: "success",
        errorBody: null,
        isLargeFormat: false,
      };
    }
    // Cheap path failed — try vision (may route to Textract) as fallback.
    const vision = await runVisionPath(client, buffer);
    if (vision.error) {
      return {
        pages: [],
        inputTokens: 0,
        outputTokens: 0,
        retries: 0,
        finalPath: "vision",
        outcome: "all_failed",
        errorBody: vision.error,
        isLargeFormat: false,
      };
    }
    return {
      pages: vision.pages,
      inputTokens: vision.inputTokens,
      outputTokens: vision.outputTokens,
      retries: vision.retries,
      finalPath: vision.usedTextract ? "textract" : "vision",
      outcome: "pdfjs_failed_then_vision_succeeded",
      errorBody: null,
      isLargeFormat: vision.isLargeFormat,
    };
  }
  // Direct vision dispatch (routes to Textract internally when large-format).
  const vision = await runVisionPath(client, buffer);
  if (vision.error) {
    return {
      pages: [],
      inputTokens: 0,
      outputTokens: 0,
      retries: 0,
      finalPath: "vision",
      outcome: "vision_failed",
      errorBody: vision.error,
      isLargeFormat: false,
    };
  }
  return {
    pages: vision.pages,
    inputTokens: vision.inputTokens,
    outputTokens: vision.outputTokens,
    retries: vision.retries,
    finalPath: vision.usedTextract ? "textract" : "vision",
    outcome: "success",
    errorBody: null,
    isLargeFormat: vision.isLargeFormat,
  };
}

interface PreflightOk {
  ok: true;
  buffer: Buffer;
  sizeBytes: number;
  client: Anthropic;
  // Surfaced so POST's later EXTRACTION_FAILED (500/502) telemetry has the
  // same client context the preflight gates used.
  ip: string;
  sessionId: string;
}
interface PreflightFail {
  ok: false;
  response: NextResponse;
}

async function preflight(
  request: NextRequest,
): Promise<PreflightOk | PreflightFail> {
  // Compute IP + sessionId up front (behavior-neutral) so every gate below —
  // including ORIGIN_MISMATCH and the 413/400 upload-parse failures — records
  // telemetry with full context.
  const ip = getClientIP(request);
  const sessionId =
    request.headers.get("x-session-id")?.slice(0, MAX_SESSION_ID_CHARS) ??
    "anon";

  if (!validateOrigin(request)) {
    recordBlock("ORIGIN_MISMATCH", { route: "extract-ballot", ip, sessionId });
    return {
      ok: false,
      response: jsonError(403, { error: "Origin not allowed" }),
    };
  }
  const parsed = await parseUpload(request);
  if ("error" in parsed) {
    // parseUpload returns 413 for an oversized PDF, else 400 for a malformed
    // / missing multipart upload. Distinguish by the response status.
    const status = parsed.error.status;
    recordBlock(status === 413 ? "PDF_TOO_LARGE" : "INVALID_REQUEST", {
      route: "extract-ballot",
      ip,
      sessionId,
      detail: { status },
    });
    return { ok: false, response: parsed.error };
  }
  const rateLimit = await checkRateLimitAsync(ip, sessionId, 1);
  if (!rateLimit.allowed) {
    recordBlock(rateLimit.code ?? "RATE_LIMIT_UNAVAILABLE", {
      route: "extract-ballot",
      ip,
      sessionId,
    });
    return {
      ok: false,
      response: jsonError(429, {
        error: rateLimit.error ?? "Rate limit exceeded",
        code: rateLimit.code,
      }),
    };
  }
  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch (err) {
    // Misconfiguration (missing API key) — surface as an extraction failure so
    // it's tallied alongside the pipeline 500/502s.
    recordBlock("EXTRACTION_FAILED", {
      route: "extract-ballot",
      ip,
      sessionId,
      detail: { status: 500, stage: "client_init" },
    });
    return {
      ok: false,
      response: jsonError(500, {
        error: `Extraction service misconfigured: ${(err as Error).message}`,
      }),
    };
  }
  return {
    ok: true,
    buffer: parsed.buffer,
    sizeBytes: parsed.sizeBytes,
    client,
    ip,
    sessionId,
  };
}

function buildResponse(
  dispatch: DispatchResult,
  decision: PathDecision,
  numPages: number,
  sizeBytes: number,
  latencyMs: number,
  costUsd: number,
): NextResponse {
  const stitched = stitchPages(dispatch.pages);
  // Full meta — kept for the telemetry log and (downstream) the durable
  // cache write. Never shipped to the client (PR D Fix 4).
  const fullMeta: ExtractMeta = {
    extraction_path: dispatch.finalPath,
    pages: numPages,
    latency_ms: latencyMs,
    cost_usd: Number(costUsd.toFixed(6)),
    detector_score: decision.score,
    ...(dispatch.isLargeFormat ? { low_confidence: true } : {}),
  };
  // Public meta — strip cost_usd + detector_score from what reaches the
  // browser. Keep extraction_path / pages / latency_ms / (optional)
  // cache_hit. See `PublicExtractMeta` in extract-types.ts.
  // Cast: BallotExtraction._meta is typed as the full ExtractMeta for the
  // route's internal call paths (cache write) but the wire JSON is the
  // public subset. Two voters in a row see the public shape only.
  const responseBody = {
    election_metadata: {
      election_date: stitched.election_metadata.election_date,
      election_type: stitched.election_metadata.election_type,
      jurisdiction: stitched.election_metadata.jurisdiction,
      ...(stitched.election_metadata.ballot_style
        ? { ballot_style: stitched.election_metadata.ballot_style }
        : {}),
    },
    sections: stitched.sections,
    _meta: toPublicExtractMeta(fullMeta),
  };
  const finalOutcome: TelemetryCompletedLog["outcome"] =
    responseBody.sections.length === 0 && dispatch.finalPath === "vision"
      ? "all_failed"
      : dispatch.outcome;
  logJson({
    event: "extract.completed",
    path: dispatch.finalPath,
    pages: numPages,
    latency_ms: latencyMs,
    cost_usd: costUsd,
    pdf_size_bytes: sizeBytes,
    retries: dispatch.retries,
    outcome: finalOutcome,
  } satisfies TelemetryCompletedLog);
  return NextResponse.json(responseBody, { status: 200 });
}

export async function POST(request: NextRequest) {
  const pre = await preflight(request);
  if (!pre.ok) return pre.response;
  const { buffer, sizeBytes, client, ip, sessionId } = pre;

  const t0 = Date.now();

  // Hash-based extraction cache (Fix 2). Two voters in the same county
  // uploading the same official sample-ballot PDF reuse one Sonnet vision
  // extraction. The hash is computed from PDF bytes only — no PII reaches
  // the cache key. We log the first 8 chars for debugging cardinality.
  const hash = pdfBytesHash(buffer);
  const cached = await readExtractionCache(hash);
  if (cached) {
    const hitLatencyMs = Date.now() - t0;
    logJson({
      event: "extract.cache_hit",
      hash_prefix: hash.slice(0, 8),
      pdf_size_bytes: sizeBytes,
    } satisfies TelemetryCacheLog);
    // Full meta — the cache stores the original detector_score / cost_usd
    // so future debugging from the durable store still has them.
    const cachedFullMeta: ExtractMeta = {
      ...cached._meta,
      extraction_path: "cached",
      latency_ms: hitLatencyMs,
      cache_hit: true,
    };
    // Strip telemetry-only fields before shipping to the client
    // (PR D Fix 4). The original storage payload is unchanged.
    const cachedResponseBody = {
      election_metadata: cached.election_metadata,
      sections: cached.sections,
      _meta: toPublicExtractMeta(cachedFullMeta),
    };
    return NextResponse.json(cachedResponseBody, { status: 200 });
  }
  logJson({
    event: "extract.cache_miss",
    hash_prefix: hash.slice(0, 8),
    pdf_size_bytes: sizeBytes,
  } satisfies TelemetryCacheLog);

  let pdfjsText: { text: string; numPages: number };
  try {
    pdfjsText = await extractTextFromPdf(new Uint8Array(buffer));
  } catch (err) {
    recordBlock("EXTRACTION_FAILED", {
      route: "extract-ballot",
      ip,
      sessionId,
      detail: { status: 500, stage: "pdf_read" },
    });
    return jsonError(500, {
      error: `Failed to read PDF: ${(err as Error).message}`,
    });
  }

  const detectorScore = scoreExtractedText(pdfjsText.text);
  const decision = decideExtractionPath(detectorScore);

  logJson({
    event: "extract.detector_decision",
    dictionary_ratio: Number(detectorScore.dictionary_ratio.toFixed(4)),
    ballot_vocab_hits: detectorScore.ballot_vocab_hits,
    proper_noun_count: detectorScore.proper_noun_count,
    decision_reason: decision.score.decision_reason,
    path_chosen: decision.path,
    pdf_size_bytes: sizeBytes,
    num_pages: pdfjsText.numPages,
  } satisfies TelemetryDetectorLog);

  const dispatch = await dispatchExtraction(
    client,
    decision,
    pdfjsText.text,
    buffer,
  );

  const latencyMs = Date.now() - t0;
  // For Textract path, include per-page Textract cost ($0.065/page) in addition
  // to Sonnet post-processor tokens. pdfjs/vision paths: Sonnet tokens only.
  const textractPageCost =
    dispatch.finalPath === "textract"
      ? Number((pdfjsText.numPages * TEXTRACT_COST_PER_PAGE_USD).toFixed(6))
      : 0;
  const costUsd = Number(
    (
      sonnetCostUsd(dispatch.inputTokens, dispatch.outputTokens) +
      textractPageCost
    ).toFixed(6),
  );

  if (dispatch.errorBody) {
    logJson({
      event: "extract.completed",
      path: dispatch.finalPath,
      pages: pdfjsText.numPages,
      latency_ms: latencyMs,
      cost_usd: costUsd,
      pdf_size_bytes: sizeBytes,
      retries: dispatch.retries,
      outcome: dispatch.outcome,
    } satisfies TelemetryCompletedLog);
    recordBlock("EXTRACTION_FAILED", {
      route: "extract-ballot",
      ip,
      sessionId,
      detail: { status: 502, stage: "dispatch", outcome: dispatch.outcome },
    });
    return jsonError(502, dispatch.errorBody);
  }

  const response = buildResponse(
    dispatch,
    decision,
    pdfjsText.numPages,
    sizeBytes,
    latencyMs,
    costUsd,
  );

  // Persist on the way out — fire-and-forget so cache writes never delay
  // the user response, and Redis hiccups never surface to the user.
  // Only cache when the dispatch actually produced sections; an empty
  // sections payload would poison the cache for that hash for 30 days.
  const stitched = stitchPages(dispatch.pages);
  if (stitched.sections.length > 0) {
    writeExtractionCache(hash, {
      election_metadata:
        stitched.election_metadata as BallotExtraction["election_metadata"],
      sections: stitched.sections,
      _meta: {
        extraction_path: dispatch.finalPath,
        pages: pdfjsText.numPages,
        latency_ms: latencyMs,
        cost_usd: Number(costUsd.toFixed(6)),
        detector_score: decision.score,
        ...(dispatch.isLargeFormat ? { low_confidence: true } : {}),
      },
    });
  }

  return response;
}
