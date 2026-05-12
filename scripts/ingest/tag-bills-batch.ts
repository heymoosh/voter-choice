/**
 * scripts/ingest/tag-bills-batch.ts
 *
 * Batch-API variant of tag-bills.ts. Submits all untagged bills to the
 * Anthropic Message Batches API (fire-and-forget, no per-minute rate limits)
 * and writes results back once the batch ends.
 *
 * Mode 1 — Submit:
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills-batch.ts --submit
 *
 * Mode 2 — Collect:
 *   DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills-batch.ts --collect [<batch_id>]
 *   If no batch_id arg, reads from BATCH_ID_FILE.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { sql } from "drizzle-orm";
import { requireDb, type DbClient } from "../../db/client";
import { issueTags } from "../../db/schema";
import {
  TAGGER_VERSION,
  buildSystemPrompt,
  buildBillPrompt,
  parseAndValidateTags,
  fetchUntaggedBills,
  type BillRow,
  type ValidatedTag,
} from "./tag-bills";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAGGER_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 256;

/** Anthropic hard limit per batch submission. */
const ANTHROPIC_BATCH_MAX = 10_000;

/** Upper bound on untagged bills to fetch. */
const FETCH_LIMIT = 65_000;

/** File where batch IDs are persisted between submit and collect runs. */
const BATCH_ID_FILE = "/tmp/tag-bills-batch-id.txt";

/** Poll interval in milliseconds while waiting for batch completion. */
const POLL_INTERVAL_MS = 30_000;

/** Maximum polling iterations (~24 h at 30 s each). */
const MAX_POLL_ITERATIONS = 2_880;

// Regex required by Anthropic for custom_id values.
const VALID_CUSTOM_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sanitizeBillId(billId: string): string | null {
  if (VALID_CUSTOM_ID_RE.test(billId)) return billId;
  // Replace unsupported chars with underscores and truncate to 64 chars.
  const sanitized = billId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  if (!VALID_CUSTOM_ID_RE.test(sanitized)) return null;
  return sanitized;
}

function buildBatchRequest(
  bill: BillRow,
  systemPrompt: string,
): Anthropic.Messages.Batches.BatchCreateParams.Request | null {
  const customId = sanitizeBillId(bill.id);
  if (!customId) {
    process.stderr.write(
      `[tag-bills-batch] skip bill=${bill.id} reason=invalid_custom_id\n`,
    );
    return null;
  }
  return {
    custom_id: customId,
    params: {
      model: TAGGER_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [{ role: "user", content: buildBillPrompt(bill) }],
    },
  };
}

// ---------------------------------------------------------------------------
// Submit mode
// ---------------------------------------------------------------------------

async function submitBatches(
  bills: BillRow[],
  client: Anthropic,
  systemPrompt: string,
): Promise<string[]> {
  const chunks = chunkArray(bills, ANTHROPIC_BATCH_MAX);
  const batchIds: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const requests = chunk
      .filter((b) => b.title?.trim())
      .map((b) => buildBatchRequest(b, systemPrompt))
      .filter(
        (r): r is Anthropic.Messages.Batches.BatchCreateParams.Request =>
          r !== null,
      );

    if (requests.length === 0) {
      process.stderr.write(
        `[tag-bills-batch] chunk=${i + 1}/${chunks.length} skipped — no valid requests\n`,
      );
      continue;
    }

    const batch = await client.messages.batches.create({ requests });
    batchIds.push(batch.id);
    process.stderr.write(
      `[tag-bills-batch] submitted chunk=${i + 1}/${chunks.length} batch_id=${batch.id} requests=${requests.length}\n`,
    );
  }

  return batchIds;
}

// ---------------------------------------------------------------------------
// Collect mode — poll
// ---------------------------------------------------------------------------

async function pollUntilEnded(
  batchId: string,
  client: Anthropic,
): Promise<void> {
  const started = Date.now();

  for (let iter = 0; iter < MAX_POLL_ITERATIONS; iter++) {
    const status = await client.messages.batches.retrieve(batchId);
    const elapsedMin = ((Date.now() - started) / 60_000).toFixed(1);
    process.stderr.write(
      `[tag-bills-batch] batch_id=${batchId} status=${status.processing_status} counts=${JSON.stringify(status.request_counts)} elapsed=${elapsedMin}m\n`,
    );
    if (status.processing_status === "ended") return;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `[tag-bills-batch] timed out waiting for batch_id=${batchId} after ${MAX_POLL_ITERATIONS} polls`,
  );
}

// ---------------------------------------------------------------------------
// Collect mode — process results
// ---------------------------------------------------------------------------

type CollectCounts = {
  billsProcessed: number;
  billsTagged: number;
  billsSkipped: number;
  tagsUpserted: number;
  apiErrors: number;
  dbErrors: number;
};

async function processResults(
  batchId: string,
  client: Anthropic,
  db: DbClient,
): Promise<CollectCounts> {
  const counts: CollectCounts = {
    billsProcessed: 0,
    billsTagged: 0,
    billsSkipped: 0,
    tagsUpserted: 0,
    apiErrors: 0,
    dbErrors: 0,
  };

  const decoder = await client.messages.batches.results(batchId);

  for await (const result of decoder) {
    const billId = result.custom_id;
    counts.billsProcessed += 1;

    if (result.result.type === "canceled") {
      process.stderr.write(`[tag-bills-batch] canceled bill=${billId}\n`);
      counts.billsSkipped += 1;
      continue;
    }
    if (result.result.type === "expired") {
      process.stderr.write(`[tag-bills-batch] expired bill=${billId}\n`);
      counts.billsSkipped += 1;
      continue;
    }
    if (result.result.type === "errored") {
      process.stderr.write(
        `[tag-bills-batch] api_error bill=${billId} error=${JSON.stringify(result.result.error)}\n`,
      );
      counts.apiErrors += 1;
      counts.billsSkipped += 1;
      continue;
    }

    const textBlock = result.result.message.content.find(
      (b) => b.type === "text",
    );
    const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "[]";
    const tags = parseAndValidateTags(rawText, billId);

    const upserted = await upsertTagsForBill(db, billId, tags, counts);
    if (upserted >= 0) {
      counts.tagsUpserted += upserted;
      counts.billsTagged += 1;
    }
  }

  return counts;
}

async function upsertTagsForBill(
  db: DbClient,
  billId: string,
  tags: ValidatedTag[],
  counts: CollectCounts,
): Promise<number> {
  if (tags.length === 0) return 0;

  const now = new Date();
  const rows = tags.map((tag) => ({
    billId,
    canonicalIssue: tag.canonicalIssue,
    stanceLens: tag.stanceLens,
    taggerVersion: TAGGER_VERSION,
    taggerConfidence: String(tag.confidence),
    taggedAt: now,
  }));

  try {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message.replace(/\s+/gu, " ") : "unknown";
    process.stderr.write(
      `[tag-bills-batch] db_error bill=${billId} error=${message}\n`,
    );
    counts.dbErrors += 1;
    counts.billsSkipped += 1;
    return -1;
  }
}

// ---------------------------------------------------------------------------
// CLI — submit
// ---------------------------------------------------------------------------

async function runSubmit(): Promise<void> {
  const anthropicApiKey = process.env.ANTHROPIC_VOTER_API ?? "";
  if (!anthropicApiKey) {
    throw new Error("[tag-bills-batch] ANTHROPIC_VOTER_API is not set.");
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const db = requireDb();
  const systemPrompt = buildSystemPrompt();

  process.stderr.write(
    `[tag-bills-batch] fetching untagged bills (limit=${FETCH_LIMIT})…\n`,
  );
  const bills = await fetchUntaggedBills(db, FETCH_LIMIT);

  if (bills.length === 0) {
    console.log(
      "[tag-bills-batch] nothing to submit — all bills already tagged for this version",
    );
    return;
  }

  process.stderr.write(
    `[tag-bills-batch] found ${bills.length} untagged bills\n`,
  );

  const batchIds = await submitBatches(bills, client, systemPrompt);

  if (batchIds.length === 0) {
    console.log("[tag-bills-batch] no batches submitted (all bills filtered)");
    return;
  }

  writeFileSync(BATCH_ID_FILE, batchIds.join("\n"), "utf8");

  console.log(
    `Submitted ${bills.length} bills in ${batchIds.length} batches. Batch IDs saved to ${BATCH_ID_FILE}`,
  );
  console.log("To collect results when ready:");
  console.log(
    `  DATABASE_URL=<neon> ANTHROPIC_VOTER_API=<key> npx tsx scripts/ingest/tag-bills-batch.ts --collect`,
  );
}

// ---------------------------------------------------------------------------
// CLI — collect
// ---------------------------------------------------------------------------

async function runCollect(batchIdArg: string | undefined): Promise<void> {
  const anthropicApiKey = process.env.ANTHROPIC_VOTER_API ?? "";
  if (!anthropicApiKey) {
    throw new Error("[tag-bills-batch] ANTHROPIC_VOTER_API is not set.");
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const db = requireDb();

  const batchIds = resolveBatchIds(batchIdArg);
  process.stderr.write(
    `[tag-bills-batch] collecting ${batchIds.length} batch(es)\n`,
  );

  const totals: CollectCounts = {
    billsProcessed: 0,
    billsTagged: 0,
    billsSkipped: 0,
    tagsUpserted: 0,
    apiErrors: 0,
    dbErrors: 0,
  };

  for (const batchId of batchIds) {
    process.stderr.write(`[tag-bills-batch] polling batch_id=${batchId}\n`);
    await pollUntilEnded(batchId, client);

    process.stderr.write(
      `[tag-bills-batch] processing results batch_id=${batchId}\n`,
    );
    const counts = await processResults(batchId, client, db);
    accumulateCounts(totals, counts);
  }

  console.log(
    [
      "[tag-bills-batch] complete",
      `tagger_version=${TAGGER_VERSION}`,
      `batches=${batchIds.length}`,
      `bills_processed=${totals.billsProcessed}`,
      `bills_tagged=${totals.billsTagged}`,
      `bills_skipped=${totals.billsSkipped}`,
      `tags_upserted=${totals.tagsUpserted}`,
      `api_errors=${totals.apiErrors}`,
      `db_errors=${totals.dbErrors}`,
    ].join(" "),
  );
}

function resolveBatchIds(batchIdArg: string | undefined): string[] {
  if (batchIdArg) return [batchIdArg];
  try {
    const contents = readFileSync(BATCH_ID_FILE, "utf8").trim();
    const ids = contents
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      throw new Error(`${BATCH_ID_FILE} is empty`);
    }
    return ids;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[tag-bills-batch] cannot resolve batch IDs — pass <batch_id> or run --submit first (${message})`,
    );
  }
}

function accumulateCounts(totals: CollectCounts, counts: CollectCounts): void {
  totals.billsProcessed += counts.billsProcessed;
  totals.billsTagged += counts.billsTagged;
  totals.billsSkipped += counts.billsSkipped;
  totals.tagsUpserted += counts.tagsUpserted;
  totals.apiErrors += counts.apiErrors;
  totals.dbErrors += counts.dbErrors;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function isCliExecution(): boolean {
  const entrypoint = process.argv[1];
  if (!entrypoint) return false;
  return import.meta.url === pathToFileURL(resolve(entrypoint)).href;
}

if (isCliExecution()) {
  const args = process.argv.slice(2);
  const mode = args[0];

  if (mode === "--submit") {
    runSubmit().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[tag-bills-batch] fatal: ${message}`);
      process.exitCode = 1;
    });
  } else if (mode === "--collect") {
    const batchIdArg = args[1];
    runCollect(batchIdArg).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[tag-bills-batch] fatal: ${message}`);
      process.exitCode = 1;
    });
  } else {
    console.error(
      "Usage:\n" +
        "  npx tsx scripts/ingest/tag-bills-batch.ts --submit\n" +
        "  npx tsx scripts/ingest/tag-bills-batch.ts --collect [<batch_id>]",
    );
    process.exitCode = 1;
  }
}
