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
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitAsync } from "../../../lib/server/rate-limit";
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
} from "../../../lib/server/extract-vision";
import { buildPostProcessorPrompt } from "../../../lib/server/extract-prompt";
import {
  stitchPages,
  type PageExtraction,
} from "../../../lib/server/extract-stitcher";
import type {
  BallotExtraction,
  ExtractMeta,
  ExtractionPath,
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
}
interface VisionRunFailure {
  error: Record<string, unknown>;
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
  const vision = await extractWithVision(
    client,
    pages.map((p) => ({ pageIndex: p.pageIndex, pngBuffer: p.pngBuffer })),
  );
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
      };
    }
    // Cheap path failed — try vision as fallback before giving up.
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
      };
    }
    return {
      pages: vision.pages,
      inputTokens: vision.inputTokens,
      outputTokens: vision.outputTokens,
      retries: vision.retries,
      finalPath: "vision",
      outcome: "pdfjs_failed_then_vision_succeeded",
      errorBody: null,
    };
  }
  // Direct vision dispatch.
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
    };
  }
  return {
    pages: vision.pages,
    inputTokens: vision.inputTokens,
    outputTokens: vision.outputTokens,
    retries: vision.retries,
    finalPath: "vision",
    outcome: "success",
    errorBody: null,
  };
}

interface PreflightOk {
  ok: true;
  buffer: Buffer;
  sizeBytes: number;
  client: Anthropic;
}
interface PreflightFail {
  ok: false;
  response: NextResponse;
}

async function preflight(
  request: NextRequest,
): Promise<PreflightOk | PreflightFail> {
  if (!validateOrigin(request)) {
    return {
      ok: false,
      response: jsonError(403, { error: "Origin not allowed" }),
    };
  }
  const ip = getClientIP(request);
  const parsed = await parseUpload(request);
  if ("error" in parsed) return { ok: false, response: parsed.error };
  const sessionId =
    request.headers.get("x-session-id")?.slice(0, MAX_SESSION_ID_CHARS) ??
    "anon";
  const rateLimit = await checkRateLimitAsync(ip, sessionId, 1);
  if (!rateLimit.allowed) {
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
  const meta: ExtractMeta = {
    extraction_path: dispatch.finalPath,
    pages: numPages,
    latency_ms: latencyMs,
    cost_usd: Number(costUsd.toFixed(6)),
    detector_score: decision.score,
  };
  const response: BallotExtraction = {
    election_metadata: {
      election_date: stitched.election_metadata.election_date,
      election_type: stitched.election_metadata.election_type,
      jurisdiction: stitched.election_metadata.jurisdiction,
      ...(stitched.election_metadata.ballot_style
        ? { ballot_style: stitched.election_metadata.ballot_style }
        : {}),
    },
    sections: stitched.sections,
    _meta: meta,
  };
  const finalOutcome: TelemetryCompletedLog["outcome"] =
    response.sections.length === 0 && dispatch.finalPath === "vision"
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
  return NextResponse.json(response, { status: 200 });
}

export async function POST(request: NextRequest) {
  const pre = await preflight(request);
  if (!pre.ok) return pre.response;
  const { buffer, sizeBytes, client } = pre;

  const t0 = Date.now();
  let pdfjsText: { text: string; numPages: number };
  try {
    pdfjsText = await extractTextFromPdf(new Uint8Array(buffer));
  } catch (err) {
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
  const costUsd = sonnetCostUsd(dispatch.inputTokens, dispatch.outputTokens);

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
    return jsonError(502, dispatch.errorBody);
  }

  return buildResponse(
    dispatch,
    decision,
    pdfjsText.numPages,
    sizeBytes,
    latencyMs,
    costUsd,
  );
}
