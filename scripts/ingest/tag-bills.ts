/**
 * scripts/ingest/tag-bills.ts
 *
 * Phase D — LLM-driven issue tagging for ingested bills.
 *
 * For every bill in the `bills` table that has no `issue_tags` row for the
 * current TAGGER_VERSION, this script calls Claude to classify the bill
 * against the canonical issue vocabulary in src/lib/canonicalIssues.ts,
 * then upserts the resulting tags into `issue_tags`.
 *
 * Model choice: claude-haiku-4-5-20251001
 *   Reasoning: The task is a bounded JSON classification — no reasoning depth
 *   needed, just pattern-matching against a ~15-entry vocabulary. Haiku is 5–8×
 *   cheaper than Sonnet for input tokens and the structured output is small
 *   (<512 tokens). The system-prompt cache means the vocabulary listing is paid
 *   once per run, not once per bill.
 *
 * Cost controls:
 *   - Default limit: 1000 bills per run (--limit / TAGGER_BILL_LIMIT).
 *   - Batch size: 50 bills per chunk with a 500ms pause between chunks to stay
 *     well under Anthropic's per-minute token limits.
 *   - Per-bill cost estimate logged to stderr for observability.
 *   - --dry-run / TAGGER_DRY_RUN=1 skips DB writes (useful for local testing).
 *
 * Prompt caching:
 *   The system prompt (canonical vocabulary) is identical across every bill in
 *   a run. We attach cache_control: { type: "ephemeral" } on the system block
 *   so the cache warms after the first request. After that, vocabulary tokens
 *   are billed at 10% of the input rate.
 *
 * Idempotency / resumability:
 *   Bills that already have an issue_tags row for TAGGER_VERSION are skipped
 *   by the WHERE filter. Kill and restart freely.
 *
 * Usage:
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills.ts
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills.ts --limit 100
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills.ts --dry-run
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql, notInArray } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { bills, issueTags } from "../../db/schema";
import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Bump this version string whenever you change the tagging prompt or canonical
 * vocabulary. Existing rows for the old version are left in place; only bills
 * lacking a row for TAGGER_VERSION are processed.
 */
export const TAGGER_VERSION = "claude-haiku-4-5-20251001-v1";

/**
 * Model used for tagging. Haiku is cheap and sufficient for this bounded
 * classification task. See module-level comment for reasoning.
 */
const TAGGER_MODEL = "claude-haiku-4-5-20251001";

/** Maximum output tokens — the response is a small JSON array. */
const MAX_TOKENS = 512;

/** Truncate bill summaries to keep prompts bounded and cost predictable. */
const MAX_SUMMARY_CHARS = 4000;

/** Default number of bills processed per run. */
const DEFAULT_LIMIT = 1000;

/** Number of bills processed per API-call chunk. */
const BATCH_SIZE = 50;

/** Milliseconds to pause between chunks to stay under rate limits. */
const INTER_BATCH_DELAY_MS = 500;

// Approximate Haiku pricing as of 2026-05 ($/million tokens).
// These are estimates used for stderr observability — not billed here.
const HAIKU_INPUT_COST_PER_MTK = 0.8;
const HAIKU_CACHED_COST_PER_MTK = 0.08; // 10% of input
const HAIKU_OUTPUT_COST_PER_MTK = 4.0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StanceLens = "in_favor" | "opposed";

export type RawTagEntry = {
  canonical_issue: unknown;
  stance_lens: unknown;
  confidence: unknown;
};

export type ValidatedTag = {
  canonicalIssue: string;
  stanceLens: StanceLens;
  confidence: number;
};

export type BillRow = {
  id: string;
  title: string;
  summary: string | null;
  jurisdiction: string;
};

export type TaggerRuntimeConfig = {
  limit: number;
  batchSize: number;
  dryRun: boolean;
  anthropicApiKey: string;
};

export type TaggerCounts = {
  billsQueried: number;
  billsTagged: number;
  billsSkipped: number;
  tagsUpserted: number;
  apiErrors: number;
  dbErrors: number;
  estimatedInputTokens: number;
  estimatedCachedTokens: number;
  estimatedOutputTokens: number;
};

// ---------------------------------------------------------------------------
// System prompt (cached across the entire run)
// ---------------------------------------------------------------------------

/**
 * Build the system prompt that describes the canonical issue vocabulary.
 * This is sent with every request but cached after the first call.
 */
export function buildSystemPrompt(): string {
  const issueList = Object.entries(CANONICAL_ISSUE_LABELS)
    .map(([id, label]) => `  - ${id}: ${label}`)
    .join("\n");

  return `You are a nonpartisan legislative analyst. Your job is to classify bills by canonical policy issues.

CANONICAL ISSUE IDs AND LABELS:
${issueList}

For each bill you receive, return a JSON array of tag objects. Each object must have exactly these fields:
  - "canonical_issue": one of the canonical issue IDs above (exact string match required)
  - "stance_lens": "in_favor" or "opposed" — what voting YEA on this bill MEANS for that issue
    * "in_favor": a YEA vote supports / expands / funds this issue
    * "opposed": a YEA vote restricts / cuts / opposes this issue
  - "confidence": a number from 0.0 to 1.0 representing your certainty

Rules:
1. Only include issues that are genuinely and substantively addressed by the bill.
2. Return an EMPTY array [] if the bill is:
   - A procedural motion (motion to table, motion to proceed, quorum call)
   - A naming bill (naming a post office, courthouse, etc.)
   - Not substantively related to any canonical issue
   We prefer EMPTY tags over WRONG tags.
3. A bill may have multiple tags if it genuinely spans multiple issues.
4. Respond with ONLY a valid JSON array — no markdown, no commentary, no code fences.

Example valid response (two tags):
[{"canonical_issue":"healthcare_affordability","stance_lens":"in_favor","confidence":0.92},{"canonical_issue":"economy_jobs","stance_lens":"opposed","confidence":0.71}]

Example valid response (no match):
[]`;
}

/**
 * Build the user message for a single bill.
 */
export function buildBillPrompt(bill: BillRow): string {
  const summary = bill.summary
    ? bill.summary.slice(0, MAX_SUMMARY_CHARS)
    : "(no summary available)";

  return `Classify this bill:

Title: ${bill.title}
Jurisdiction: ${bill.jurisdiction}
Summary: ${summary}`;
}

// ---------------------------------------------------------------------------
// Tag validation
// ---------------------------------------------------------------------------

const VALID_CANONICAL_ISSUES = new Set(Object.keys(CANONICAL_ISSUE_LABELS));
const VALID_STANCE_LENSES: Set<string> = new Set(["in_favor", "opposed"]);

/**
 * Parse and validate the Claude JSON response for a single bill.
 * Invalid entries are dropped with a one-line log; the array of valid
 * entries (possibly empty) is returned.
 */
export function parseAndValidateTags(
  rawJson: string,
  billId: string,
): ValidatedTag[] {
  // Strip markdown code fences if the model ignored the "no markdown" instruction
  const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : rawJson;
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    process.stderr.write(
      `[tag-bills] skip bill=${billId} reason=malformed_json\n`,
    );
    return [];
  }

  if (!Array.isArray(parsed)) {
    process.stderr.write(
      `[tag-bills] skip bill=${billId} reason=response_not_array\n`,
    );
    return [];
  }

  const valid: ValidatedTag[] = [];

  for (const entry of parsed) {
    const raw = entry as RawTagEntry;
    const canonicalIssue = raw.canonical_issue;
    const stanceLens = raw.stance_lens;
    const confidence = raw.confidence;

    if (typeof canonicalIssue !== "string") {
      process.stderr.write(
        `[tag-bills] drop bill=${billId} reason=non_string_canonical_issue\n`,
      );
      continue;
    }
    if (!VALID_CANONICAL_ISSUES.has(canonicalIssue)) {
      process.stderr.write(
        `[tag-bills] drop bill=${billId} canonical_issue=${canonicalIssue} reason=unknown_canonical_issue\n`,
      );
      continue;
    }
    if (
      typeof stanceLens !== "string" ||
      !VALID_STANCE_LENSES.has(stanceLens)
    ) {
      process.stderr.write(
        `[tag-bills] drop bill=${billId} stance_lens=${String(stanceLens)} reason=invalid_stance_lens\n`,
      );
      continue;
    }
    if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
      // Clamp rather than drop — a confidence of 1.0001 is a floating-point
      // noise issue, not an invalid response. Document: we clamp to [0, 1].
      if (typeof confidence === "number") {
        const clamped = Math.min(1, Math.max(0, confidence));
        process.stderr.write(
          `[tag-bills] clamp bill=${billId} canonical_issue=${canonicalIssue} confidence=${confidence} -> ${clamped}\n`,
        );
        valid.push({
          canonicalIssue,
          stanceLens: stanceLens as StanceLens,
          confidence: clamped,
        });
        continue;
      }
      process.stderr.write(
        `[tag-bills] drop bill=${billId} canonical_issue=${canonicalIssue} reason=invalid_confidence\n`,
      );
      continue;
    }

    valid.push({
      canonicalIssue,
      stanceLens: stanceLens as StanceLens,
      confidence,
    });
  }

  return valid;
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
// Core: tag a single bill via Claude
// ---------------------------------------------------------------------------

/**
 * Tag a single bill. Returns the validated tags (may be empty).
 * Throws on Anthropic API errors so the caller can log-and-skip.
 */
export async function tagBill(
  bill: BillRow,
  client: Anthropic,
  systemPrompt: string,
): Promise<{
  tags: ValidatedTag[];
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}> {
  const response = await client.messages.create({
    model: TAGGER_MODEL,
    max_tokens: MAX_TOKENS,
    // System prompt with prompt caching — identical across all bills in a run.
    // After the first request, the vocabulary block is served from Anthropic's
    // cache at 10% of input token cost.
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
  const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "[]";

  const tags = parseAndValidateTags(rawText, bill.id);

  return { tags, inputTokens, cachedTokens, outputTokens };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

/**
 * Fetch bills that have no issue_tags row for TAGGER_VERSION, up to limit.
 */
export async function fetchUntaggedBills(
  db: DbClient,
  limit: number,
): Promise<BillRow[]> {
  // Subquery: bill_ids that already have a tag for this tagger_version.
  const taggedBillIds = db
    .select({ billId: issueTags.billId })
    .from(issueTags)
    .where(sql`${issueTags.taggerVersion} = ${TAGGER_VERSION}`);

  const rows = await db
    .select({
      id: bills.id,
      title: bills.title,
      summary: bills.summary,
      jurisdiction: bills.jurisdiction,
    })
    .from(bills)
    .where(notInArray(bills.id, taggedBillIds))
    .limit(limit);

  return rows;
}

/**
 * Upsert valid tags into issue_tags. Returns the number of rows upserted.
 */
export async function upsertTags(
  db: DbClient,
  billId: string,
  tags: ValidatedTag[],
  dryRun: boolean,
): Promise<number> {
  if (tags.length === 0) return 0;
  if (dryRun) {
    process.stderr.write(
      `[tag-bills] dry_run bill=${billId} would_upsert=${tags.length} tags\n`,
    );
    return tags.length;
  }

  const now = new Date();
  const rows = tags.map((tag) => ({
    billId,
    canonicalIssue: tag.canonicalIssue,
    stanceLens: tag.stanceLens,
    taggerVersion: TAGGER_VERSION,
    taggerConfidence: String(tag.confidence),
    taggedAt: now,
  }));

  await db
    .insert(issueTags)
    .values(rows)
    .onConflictDoUpdate({
      target: [issueTags.billId, issueTags.canonicalIssue],
      set: {
        stanceLens: sql`excluded.stance_lens`,
        taggerVersion: sql`excluded.tagger_version`,
        taggerConfidence: sql`excluded.tagger_confidence`,
        taggedAt: now,
      },
    });

  return rows.length;
}

// ---------------------------------------------------------------------------
// Batch processing
// ---------------------------------------------------------------------------

/**
 * Process a single bill: call Claude, validate tags, upsert. Errors in any
 * step are logged and the bill is skipped — batch continues.
 */
export async function processBill(
  bill: BillRow,
  db: DbClient,
  client: Anthropic,
  systemPrompt: string,
  counts: TaggerCounts,
  dryRun: boolean,
): Promise<void> {
  if (!bill.title?.trim()) {
    process.stderr.write(
      `[tag-bills] skip bill=${bill.id} reason=missing_title\n`,
    );
    counts.billsSkipped += 1;
    return;
  }

  let tags: ValidatedTag[];
  let inputTokens: number;
  let cachedTokens: number;
  let outputTokens: number;

  try {
    ({ tags, inputTokens, cachedTokens, outputTokens } = await tagBill(
      bill,
      client,
      systemPrompt,
    ));
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    process.stderr.write(
      `[tag-bills] api_error bill=${bill.id} error=${message}\n`,
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
  process.stderr.write(
    `[tag-bills] bill=${bill.id} tags=${tags.length} ` +
      `tokens=in:${inputTokens}/cached:${cachedTokens}/out:${outputTokens} ` +
      `est_usd=${cost.estimatedUsd.toFixed(5)} ` +
      `running_usd=${runningCost.estimatedUsd.toFixed(4)}\n`,
  );

  try {
    const upserted = await upsertTags(db, bill.id, tags, dryRun);
    counts.tagsUpserted += upserted;
    counts.billsTagged += 1;
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    process.stderr.write(
      `[tag-bills] db_error bill=${bill.id} error=${message}\n`,
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

export function resolveTagBillsConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): TaggerRuntimeConfig {
  const limit =
    parseLimitFlag(argv) ??
    parsePositiveInteger(env.TAGGER_BILL_LIMIT, DEFAULT_LIMIT);
  const dryRun = argv.includes("--dry-run") || env.TAGGER_DRY_RUN === "1";
  const anthropicApiKey = env.ANTHROPIC_VOTER_API ?? "";

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

export async function tagBills({
  db = requireDb(),
  client,
  env = process.env,
  argv = process.argv,
}: {
  db?: DbClient;
  client?: Anthropic;
  env?: NodeJS.ProcessEnv;
  argv?: string[];
} = {}): Promise<TaggerCounts> {
  const config = resolveTagBillsConfig(env, argv);

  if (!config.anthropicApiKey) {
    throw new Error(
      "[tag-bills] ANTHROPIC_VOTER_API is not set. Cannot call Claude.",
    );
  }

  const anthropic = client ?? new Anthropic({ apiKey: config.anthropicApiKey });

  const systemPrompt = buildSystemPrompt();

  const counts: TaggerCounts = {
    billsQueried: 0,
    billsTagged: 0,
    billsSkipped: 0,
    tagsUpserted: 0,
    apiErrors: 0,
    dbErrors: 0,
    estimatedInputTokens: 0,
    estimatedCachedTokens: 0,
    estimatedOutputTokens: 0,
  };

  process.stderr.write(
    `[tag-bills] starting tagger_version=${TAGGER_VERSION} limit=${config.limit} dry_run=${config.dryRun}\n`,
  );

  const untagged = await fetchUntaggedBills(db, config.limit);
  counts.billsQueried = untagged.length;

  process.stderr.write(`[tag-bills] found ${untagged.length} bills to tag\n`);

  if (untagged.length === 0) {
    process.stderr.write(
      "[tag-bills] nothing to do — all bills already tagged for this version\n",
    );
    return counts;
  }

  const chunks = chunkArray(untagged, config.batchSize);

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    process.stderr.write(
      `[tag-bills] chunk=${chunkIdx + 1}/${chunks.length} size=${chunk.length}\n`,
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

    // Pause between chunks (not after the last one).
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
      "[tag-bills] complete",
      `tagger_version=${TAGGER_VERSION}`,
      `bills_queried=${counts.billsQueried}`,
      `bills_tagged=${counts.billsTagged}`,
      `bills_skipped=${counts.billsSkipped}`,
      `tags_upserted=${counts.tagsUpserted}`,
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
  tagBills().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[tag-bills] fatal: ${message}`);
    process.exitCode = 1;
  });
}
