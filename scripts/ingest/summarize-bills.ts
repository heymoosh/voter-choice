/**
 * scripts/ingest/summarize-bills.ts
 *
 * LLM-driven plain-language SHORT summaries for ingested bills.
 *
 * The raw `bills.summary` is the FULL multi-paragraph CRS (Congressional
 * Research Service) text, in HTML. It is far too long — and too markup-laden —
 * to show in a contributing-vote card. This script generates a true short
 * summary (≤2 sentences, plain language) and stores it in `bills.plain_summary`.
 * The UI prefers `plain_summary` over the raw CRS text (see
 * src/lib/server/alignment.ts narrative precedence). `bills.summary` is left
 * untouched.
 *
 * Model choice: claude-haiku-4-5-20251001
 *   Reasoning: bounded rewrite/compression of an existing summary — no reasoning
 *   depth required, small output (<256 tokens). Haiku is the cheapest model that
 *   produces clean prose; matches the tagger's cost discipline.
 *
 * Target selection:
 *   Bills with `summary IS NOT NULL AND plain_summary IS NULL`. PRIORITIZED so
 *   bills that are actually shown to users — those referenced by at least one
 *   `votes` row (contributing votes) — are summarized FIRST, then the rest by
 *   id for a stable, resumable order.
 *
 * Cost controls:
 *   - Default limit: 200 bills per run (--limit / SUMMARIZER_BILL_LIMIT).
 *   - Batch size: 50 bills per chunk with a 500ms pause between chunks.
 *   - --dry-run / SUMMARIZER_DRY_RUN=1 prints what it WOULD generate, no writes.
 *   - Per-bill + running cost estimate logged to stderr.
 *
 * Idempotency / resumability:
 *   The WHERE filter (`plain_summary IS NULL`) means already-summarized bills
 *   are skipped. Kill and restart freely.
 *
 * Usage:
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/summarize-bills.ts --dry-run
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/summarize-bills.ts --limit 200
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql, eq } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { bills } from "../../db/schema";
import { stripHtmlTags } from "./crs-summaries";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Model used for summarization. Haiku is cheap and sufficient for this bounded
 * compression task. See module-level comment for reasoning.
 */
const SUMMARIZER_MODEL = "claude-haiku-4-5-20251001";

/** Maximum output tokens — the response is at most two sentences. */
const MAX_TOKENS = 256;

/**
 * Cap on the stored summary length (characters). The prompt asks for ≤~240
 * chars; we enforce a hard cap here too so a chatty response can't blow past it.
 */
export const MAX_PLAIN_SUMMARY_CHARS = 280;

/** Truncate the (stripped) CRS input to keep prompts bounded and cheap. */
const MAX_INPUT_CHARS = 4000;

/** Default number of bills processed per run. */
const DEFAULT_LIMIT = 200;

/** Number of bills processed per API-call chunk. */
const BATCH_SIZE = 50;

/** Milliseconds to pause between chunks to stay under rate limits. */
const INTER_BATCH_DELAY_MS = 500;

// Approximate Haiku pricing as of 2026-05 ($/million tokens). Estimates used
// for stderr observability only — not billed here.
const HAIKU_INPUT_COST_PER_MTK = 0.8;
const HAIKU_CACHED_COST_PER_MTK = 0.08; // 10% of input
const HAIKU_OUTPUT_COST_PER_MTK = 4.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BillRow = {
  id: string;
  title: string;
  summary: string | null;
};

export type SummarizerRuntimeConfig = {
  limit: number;
  batchSize: number;
  dryRun: boolean;
  anthropicApiKey: string;
};

export type SummarizerCounts = {
  billsQueried: number;
  billsSummarized: number;
  billsSkipped: number;
  apiErrors: number;
  dbErrors: number;
  estimatedInputTokens: number;
  estimatedCachedTokens: number;
  estimatedOutputTokens: number;
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * System prompt — identical across every bill in a run, so it is cached after
 * the first request (10% of input cost thereafter). This is USER-FACING prose;
 * the spec is precise.
 */
export function buildSystemPrompt(): string {
  return `You are a nonpartisan legislative writer. You turn a long, technical bill summary into a short, plain-language one for ordinary readers.

Summarize what the bill does in AT MOST 2 sentences. Requirements:
- Plain language, active voice. Focus on the real-world impact for ordinary people.
- Neutral and factual. Do NOT editorialize or say whether the bill is good or bad.
- Avoid jargon. Avoid "This bill..." boilerplate.
- Keep it under ~240 characters.

Respond with ONLY the summary text — no preamble, no quotes, no markdown, no commentary.`;
}

/**
 * Build the user message for a single bill. The CRS summary is HTML-stripped
 * before sending (the raw value contains <p>, <b>, … markup).
 */
export function buildBillPrompt(bill: BillRow): string {
  const stripped = bill.summary ? stripHtmlTags(bill.summary) : "";
  const input = stripped.slice(0, MAX_INPUT_CHARS);

  return `Title: ${bill.title}

Summary:
${input}`;
}

// ---------------------------------------------------------------------------
// Response cleanup
// ---------------------------------------------------------------------------

/**
 * Clean the model's raw output into the final stored summary:
 *  - strip wrapping quotes the model sometimes adds,
 *  - collapse whitespace,
 *  - hard-cap at MAX_PLAIN_SUMMARY_CHARS on a word boundary with an ellipsis.
 * Returns null when the cleaned result is empty.
 */
export function cleanSummary(raw: string): string | null {
  let text = raw.trim();
  // Strip a single pair of wrapping quotes if present.
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (text.length <= MAX_PLAIN_SUMMARY_CHARS) return text;

  const slice = text.slice(0, MAX_PLAIN_SUMMARY_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim();
  return `${trimmed}…`;
}

// ---------------------------------------------------------------------------
// Cost estimator (stderr observability only — not billed here)
// ---------------------------------------------------------------------------

type CostEstimate = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  estimatedUsd: number;
};

export function estimateCost(
  inputTokens: number,
  cachedTokens: number,
  outputTokens: number,
): CostEstimate {
  const freshInputTokens = inputTokens - cachedTokens;
  const estimatedUsd =
    (freshInputTokens * HAIKU_INPUT_COST_PER_MTK) / 1_000_000 +
    (cachedTokens * HAIKU_CACHED_COST_PER_MTK) / 1_000_000 +
    (outputTokens * HAIKU_OUTPUT_COST_PER_MTK) / 1_000_000;
  return { inputTokens, cachedTokens, outputTokens, estimatedUsd };
}

// ---------------------------------------------------------------------------
// Core: summarize a single bill via Claude
// ---------------------------------------------------------------------------

/**
 * Summarize a single bill. Returns the cleaned plain summary (or null if the
 * model produced nothing usable). Throws on Anthropic API errors so the caller
 * can log-and-skip.
 */
export async function summarizeBill(
  bill: BillRow,
  client: Anthropic,
  systemPrompt: string,
): Promise<{
  summary: string | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}> {
  const response = await client.messages.create({
    model: SUMMARIZER_MODEL,
    max_tokens: MAX_TOKENS,
    // System prompt with prompt caching — identical across all bills in a run.
    system: [
      {
        type: "text" as const,
        text: systemPrompt,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [{ role: "user", content: buildBillPrompt(bill) }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const cachedTokens = response.usage?.cache_read_input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  const textBlock = response.content.find((b) => b.type === "text");
  const rawText = textBlock?.type === "text" ? textBlock.text : "";

  return {
    summary: cleanSummary(rawText),
    inputTokens,
    cachedTokens,
    outputTokens,
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Fetch bills that have a raw CRS summary but no plain summary yet, up to limit.
 *
 * Ordering (prioritization): bills referenced by at least one `votes` row come
 * FIRST (these are the contributing-vote bills users actually see), then the
 * rest. Within each group, order by id for a stable, resumable sequence.
 */
export async function fetchUnsummarizedBills(
  db: DbClient,
  limit: number,
): Promise<BillRow[]> {
  const rows = await db.execute(sql`
    SELECT b.id, b.title, b.summary
    FROM bills b
    WHERE b.summary IS NOT NULL
      AND b.plain_summary IS NULL
    ORDER BY
      (EXISTS (SELECT 1 FROM votes v WHERE v.bill_id = b.id)) DESC,
      b.id ASC
    LIMIT ${limit}
  `);

  return rows.rows as BillRow[];
}

/**
 * Write the generated plain summary to bills.plain_summary. No-op in dry-run.
 */
export async function storePlainSummary(
  db: DbClient,
  billId: string,
  summary: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    process.stderr.write(
      `[summarize-bills] dry_run bill=${billId} would_store="${summary}"\n`,
    );
    return;
  }
  await db
    .update(bills)
    .set({ plainSummary: summary })
    .where(eq(bills.id, billId));
}

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

/**
 * Process a single bill: call Claude, clean, store. Errors in any step are
 * logged and the bill is skipped — the batch continues.
 */
export async function processBill(
  bill: BillRow,
  db: DbClient,
  client: Anthropic,
  systemPrompt: string,
  counts: SummarizerCounts,
  dryRun: boolean,
): Promise<void> {
  if (!bill.title?.trim()) {
    process.stderr.write(
      `[summarize-bills] skip bill=${bill.id} reason=missing_title\n`,
    );
    counts.billsSkipped += 1;
    return;
  }
  if (!bill.summary?.trim()) {
    process.stderr.write(
      `[summarize-bills] skip bill=${bill.id} reason=empty_summary\n`,
    );
    counts.billsSkipped += 1;
    return;
  }

  let summary: string | null;
  let inputTokens: number;
  let cachedTokens: number;
  let outputTokens: number;

  try {
    ({ summary, inputTokens, cachedTokens, outputTokens } = await summarizeBill(
      bill,
      client,
      systemPrompt,
    ));
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    process.stderr.write(
      `[summarize-bills] api_error bill=${bill.id} error=${message}\n`,
    );
    counts.apiErrors += 1;
    counts.billsSkipped += 1;
    return;
  }

  // Accumulate token counts for cost reporting.
  counts.estimatedInputTokens += inputTokens;
  counts.estimatedCachedTokens += cachedTokens;
  counts.estimatedOutputTokens += outputTokens;

  const cost = estimateCost(inputTokens, cachedTokens, outputTokens);
  const runningCost = estimateCost(
    counts.estimatedInputTokens,
    counts.estimatedCachedTokens,
    counts.estimatedOutputTokens,
  );

  if (!summary) {
    process.stderr.write(
      `[summarize-bills] skip bill=${bill.id} reason=empty_response ` +
        `tokens=in:${inputTokens}/cached:${cachedTokens}/out:${outputTokens}\n`,
    );
    counts.billsSkipped += 1;
    return;
  }

  process.stderr.write(
    `[summarize-bills] bill=${bill.id} chars=${summary.length} ` +
      `tokens=in:${inputTokens}/cached:${cachedTokens}/out:${outputTokens} ` +
      `est_usd=${cost.estimatedUsd.toFixed(5)} ` +
      `running_usd=${runningCost.estimatedUsd.toFixed(4)}\n`,
  );

  try {
    await storePlainSummary(db, bill.id, summary, dryRun);
    counts.billsSummarized += 1;
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    process.stderr.write(
      `[summarize-bills] db_error bill=${bill.id} error=${message}\n`,
    );
    counts.dbErrors += 1;
    counts.billsSkipped += 1;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ---------------------------------------------------------------------------
// Runtime config
// ---------------------------------------------------------------------------

export function resolveSummarizeBillsConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): SummarizerRuntimeConfig {
  const limit =
    parseLimitFlag(argv) ??
    parsePositiveInteger(env.SUMMARIZER_BILL_LIMIT, DEFAULT_LIMIT);
  const dryRun = argv.includes("--dry-run") || env.SUMMARIZER_DRY_RUN === "1";
  const anthropicApiKey =
    env.ANTHROPIC_VOTER_API ?? env.ANTHROPIC_API_KEY ?? "";

  return {
    limit,
    batchSize: BATCH_SIZE,
    dryRun,
    anthropicApiKey,
  };
}

function parseLimitFlag(argv: string[]): number | null {
  const idx = argv.indexOf("--limit");
  if (idx === -1) return null;
  const value = argv[idx + 1];
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// Main entry point (exported for tests)
// ---------------------------------------------------------------------------

export async function summarizeBills({
  db = requireDb(),
  client,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  client?: Anthropic;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<SummarizerCounts> {
  const config = resolveSummarizeBillsConfig(env, argv);

  if (!config.anthropicApiKey) {
    throw new Error(
      "[summarize-bills] ANTHROPIC_VOTER_API is not set. Cannot call Claude.",
    );
  }

  const anthropic = client ?? new Anthropic({ apiKey: config.anthropicApiKey });

  const systemPrompt = buildSystemPrompt();

  const counts: SummarizerCounts = {
    billsQueried: 0,
    billsSummarized: 0,
    billsSkipped: 0,
    apiErrors: 0,
    dbErrors: 0,
    estimatedInputTokens: 0,
    estimatedCachedTokens: 0,
    estimatedOutputTokens: 0,
  };

  process.stderr.write(
    `[summarize-bills] starting model=${SUMMARIZER_MODEL} limit=${config.limit} dry_run=${config.dryRun}\n`,
  );

  const targets = await fetchUnsummarizedBills(db, config.limit);
  counts.billsQueried = targets.length;

  process.stderr.write(
    `[summarize-bills] found ${targets.length} bills to summarize\n`,
  );

  if (targets.length === 0) {
    process.stderr.write(
      "[summarize-bills] nothing to do — all bills with a summary already have a plain_summary\n",
    );
    return counts;
  }

  const chunks = chunkArray(targets, config.batchSize);

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    process.stderr.write(
      `[summarize-bills] chunk=${chunkIdx + 1}/${chunks.length} size=${chunk.length}\n`,
    );

    for (const bill of chunk) {
      await processBill(
        bill,
        db,
        anthropic,
        systemPrompt,
        counts,
        config.dryRun,
      );
    }

    if (chunkIdx < chunks.length - 1) {
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }

  const finalCost = estimateCost(
    counts.estimatedInputTokens,
    counts.estimatedCachedTokens,
    counts.estimatedOutputTokens,
  );

  console.log(
    [
      "[summarize-bills] complete",
      `model=${SUMMARIZER_MODEL}`,
      `bills_queried=${counts.billsQueried}`,
      `bills_summarized=${counts.billsSummarized}`,
      `bills_skipped=${counts.billsSkipped}`,
      `api_errors=${counts.apiErrors}`,
      `db_errors=${counts.dbErrors}`,
      `est_total_usd=${finalCost.estimatedUsd.toFixed(4)}`,
    ].join(" "),
  );

  return counts;
}

// ---------------------------------------------------------------------------
// CLI guard
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  summarizeBills().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[summarize-bills] fatal: ${message}`);
    process.exitCode = 1;
  });
}
