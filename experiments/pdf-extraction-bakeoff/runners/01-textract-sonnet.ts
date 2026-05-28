// Contender 1: AWS Textract Forms+Tables + Claude Sonnet post-processor.
//
// Per fixture:
//   1. Render each PDF page to PNG (via shared renderPdfPages).
//   2. AnalyzeDocument with FeatureTypes=["FORMS","TABLES"] per page IN PARALLEL.
//   3. Filter Block types to useful set, strip Geometry/Confidence noise (keeps
//      Sonnet input under 50K tokens for the 14-page Hidalgo fixture).
//   4. Concatenate filtered blocks across pages → upstream raw output string.
//   5. Hand the raw string to Sonnet with the SAME standardized post-processor
//      prompt that C3 uses (fair-comparison rule).
//
// Tactical decisions (per advisor pre-write review):
// - PNG (not JPEG) — Textract accepts both; existing renderPdfPages produces
//   PNG; the JPEG savings aren't worth modifying _shared.ts.
// - Per-page parallelism via Promise.all on Textract calls (Phase 4 lesson #3).
// - Compact JSON.stringify (no indent) for Sonnet input. Pretty-printed only
//   in the .raw.json artifact for human readability.
// - Block filter: keep LINE, KEY_VALUE_SET, TABLE, CELL, WORD; drop PAGE,
//   SELECTION_ELEMENT, MERGED_CELL. Strip Geometry, Polygon, Confidence per
//   block. EntityTypes preserved (distinguishes KEY vs VALUE in KEY_VALUE_SET).
// - Split retry policies: Textract throttling retries here, Sonnet retries use
//   _shared.callSonnetWithRetry as in C3.
//
// Usage:
//   npx tsx runners/01-textract-sonnet.ts                 # all fixtures
//   npx tsx runners/01-textract-sonnet.ts <fixture.pdf>   # single fixture

import {
  AnalyzeDocumentCommand,
  TextractClient,
  type Block,
} from "@aws-sdk/client-textract";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  FIXTURES,
  FIXTURES_DIR,
  fixturePath,
  fixtureBasename,
  renderPdfPages,
  getAnthropicClient,
  callSonnetWithRetry,
  parseSonnetJson,
  sonnetCostUsd,
  buildPostProcessorPrompt,
  writeArtifacts,
  loadEnvLocal,
  Ballot,
  Metrics,
} from "./_shared.js";

const RUNNER_NAME = "01-textract-sonnet";

// AnalyzeDocument FORMS = $0.05/page, +TABLES = $0.015/page, combined = $0.065/page.
const TEXTRACT_COST_PER_PAGE_USD = 0.065;

// Block types worth keeping for downstream Sonnet normalization. WORD is kept
// alongside LINE because some form fields fragment across the line / word
// boundary. Empirically LINE is enough for ballot text but WORD adds <30%
// blocks for safety on edge cases.
const KEEP_BLOCK_TYPES = new Set([
  "LINE",
  "WORD",
  "KEY_VALUE_SET",
  "TABLE",
  "CELL",
]);

// Lean down each block: drop Geometry, Polygon, ColumnSpan ≤1, RowSpan ≤1,
// Confidence. Preserve Id (relationship pointers), BlockType, Text,
// EntityTypes (KEY vs VALUE), Relationships, RowIndex, ColumnIndex, RowSpan,
// ColumnSpan (for TABLE/CELL structure).
type LeanBlock = {
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
};

function leanBlock(b: Block, pageIndex: number): LeanBlock | null {
  if (!b.BlockType || !KEEP_BLOCK_TYPES.has(b.BlockType)) return null;
  const out: LeanBlock = {
    BlockType: b.BlockType,
    Page: pageIndex,
  };
  if (b.Id) out.Id = b.Id;
  if (b.Text) out.Text = b.Text;
  if (b.EntityTypes && b.EntityTypes.length > 0) out.EntityTypes = b.EntityTypes;
  if (b.Relationships && b.Relationships.length > 0) {
    out.Relationships = b.Relationships.map((r) => ({
      Type: r.Type,
      Ids: r.Ids,
    }));
  }
  if (b.RowIndex !== undefined) out.RowIndex = b.RowIndex;
  if (b.ColumnIndex !== undefined) out.ColumnIndex = b.ColumnIndex;
  if (b.RowSpan !== undefined && b.RowSpan > 1) out.RowSpan = b.RowSpan;
  if (b.ColumnSpan !== undefined && b.ColumnSpan > 1) out.ColumnSpan = b.ColumnSpan;
  return out;
}

// Retry Textract on throttling-class errors with exp backoff (1s, 2s).
async function analyzeWithRetry(
  client: TextractClient,
  pageBuffer: Buffer,
  pageIndex: number,
): Promise<{ blocks: Block[]; attempts: number }> {
  const RETRYABLE = new Set([
    "ThrottlingException",
    "ProvisionedThroughputExceededException",
    "InternalServerError",
    "ServiceUnavailable",
  ]);
  let attempt = 0;
  const maxRetries = 1; // one retry per spec
  let lastErr: unknown = null;
  while (attempt <= maxRetries) {
    try {
      const cmd = new AnalyzeDocumentCommand({
        Document: { Bytes: pageBuffer },
        FeatureTypes: ["FORMS", "TABLES"],
      });
      const resp = await client.send(cmd);
      return {
        blocks: resp.Blocks ?? [],
        attempts: attempt + 1,
      };
    } catch (err) {
      lastErr = err;
      const errName = (err as Error & { name?: string }).name || "";
      if (!RETRYABLE.has(errName) || attempt >= maxRetries) {
        throw err;
      }
      attempt += 1;
      const backoffMs = 1000 * Math.pow(2, attempt - 1);
      console.error(
        `  page ${pageIndex}: Textract ${errName}, retry in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`,
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

async function runFixture(
  textract: TextractClient,
  anthropic: ReturnType<typeof getAnthropicClient>,
  fixtureName: string,
): Promise<{ metrics: Metrics; costUsd: number }> {
  const started = new Date();
  const pdfPath = fixturePath(fixtureName);
  console.log(`\n[${RUNNER_NAME}] fixture: ${fixtureName}`);
  console.log(`  rendering pages...`);
  const pages = await renderPdfPages(pdfPath, { scale: 2.0 });
  console.log(`  rendered ${pages.length} page(s)`);

  // --- Step 1: Textract per-page in parallel ---
  let textractRetries = 0;
  let allBlocks: LeanBlock[] = [];
  let textractFailed = false;
  let textractError: string | undefined;
  try {
    const results = await Promise.all(
      pages.map(async (page) => {
        const t0 = Date.now();
        const { blocks: rawBlocks, attempts } = await analyzeWithRetry(
          textract,
          page.pngBuffer,
          page.pageIndex,
        );
        const dt = Date.now() - t0;
        const lean: LeanBlock[] = [];
        for (const b of rawBlocks) {
          const l = leanBlock(b, page.pageIndex);
          if (l) lean.push(l);
        }
        console.log(
          `  page ${page.pageIndex}: textract ${dt}ms, ${rawBlocks.length} raw → ${lean.length} kept blocks (retries=${attempts - 1})`,
        );
        return { pageIndex: page.pageIndex, blocks: lean, retries: attempts - 1 };
      }),
    );
    // Preserve page order in concatenation.
    results.sort((a, b) => a.pageIndex - b.pageIndex);
    for (const r of results) {
      allBlocks.push(...r.blocks);
      textractRetries += r.retries;
    }
  } catch (err) {
    textractFailed = true;
    textractError = `textract failed: ${(err as Error).message}`;
    console.error(`  ${textractError}`);
  }

  if (textractFailed) {
    const completed = new Date();
    const metrics: Metrics = {
      runner: RUNNER_NAME,
      fixture: fixtureName,
      started_at: started.toISOString(),
      completed_at: completed.toISOString(),
      latency_ms: completed.getTime() - started.getTime(),
      cost_usd: 0,
      cost_breakdown: {
        textract_pages: pages.length,
        textract_cost_usd: 0,
        sonnet_input_tokens: 0,
        sonnet_output_tokens: 0,
        sonnet_cost_usd: 0,
      },
      retries: textractRetries,
      outcome: "failed_after_retry",
      error: textractError,
    };
    writeArtifacts(RUNNER_NAME, fixtureName, null, null, metrics);
    return { metrics, costUsd: 0 };
  }

  // Compact stringify for the prompt; pretty for the .raw.json artifact.
  const compactRaw = JSON.stringify(allBlocks);
  const prettyRaw = JSON.stringify(allBlocks, null, 2);
  console.log(
    `  total kept blocks: ${allBlocks.length}; compact size: ${(compactRaw.length / 1024).toFixed(1)} KiB`,
  );

  // --- Step 2: Sonnet post-processor (text-only) ---
  let inputTokens = 0;
  let outputTokens = 0;
  let sonnetRetries = 0;
  let outcome: Metrics["outcome"] = "success";
  let errorMsg: string | undefined;
  let parsed: Ballot | null = null;

  try {
    const prompt = buildPostProcessorPrompt(compactRaw);
    const result = await callSonnetWithRetry(anthropic, { promptText: prompt }, 1);
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    sonnetRetries = result.attempts - 1;
    try {
      parsed = parseSonnetJson(result.text) as Ballot;
    } catch (parseErr) {
      console.error(
        `  sonnet parse failed (${(parseErr as Error).message}); retrying with stricter prompt`,
      );
      const retry = await callSonnetWithRetry(
        anthropic,
        {
          promptText: `${prompt}\n\nIMPORTANT: Return JSON only. No prose, no markdown fences, no commentary. The response must start with '{' and end with '}'.`,
        },
        1,
      );
      inputTokens += retry.inputTokens;
      outputTokens += retry.outputTokens;
      sonnetRetries += 1 + (retry.attempts - 1);
      try {
        parsed = parseSonnetJson(retry.text) as Ballot;
      } catch (parseErr2) {
        outcome = "schema_invalid";
        errorMsg = `sonnet returned non-JSON: ${(parseErr2 as Error).message}`;
        parsed = null;
      }
    }
  } catch (err) {
    outcome = "failed_after_retry";
    errorMsg = `sonnet call failed: ${(err as Error).message}`;
    parsed = null;
  }

  const completed = new Date();
  const latencyMs = completed.getTime() - started.getTime();
  const textractCost = Number((pages.length * TEXTRACT_COST_PER_PAGE_USD).toFixed(6));
  const sonnetCost = sonnetCostUsd(inputTokens, outputTokens);
  const costUsd = Number((textractCost + sonnetCost).toFixed(6));

  const metrics: Metrics = {
    runner: RUNNER_NAME,
    fixture: fixtureName,
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
    latency_ms: latencyMs,
    cost_usd: costUsd,
    cost_breakdown: {
      textract_pages: pages.length,
      textract_cost_usd: textractCost,
      sonnet_input_tokens: inputTokens,
      sonnet_output_tokens: outputTokens,
      sonnet_cost_usd: sonnetCost,
    },
    retries: textractRetries + sonnetRetries,
    outcome,
    ...(errorMsg ? { error: errorMsg } : {}),
  };

  writeArtifacts(RUNNER_NAME, fixtureName, parsed, prettyRaw, metrics);
  console.log(
    `  done: ${pages.length}p, $${costUsd.toFixed(4)} (textract=$${textractCost.toFixed(4)}, sonnet=$${sonnetCost.toFixed(4)}), ${(latencyMs / 1000).toFixed(1)}s, outcome=${outcome}, retries=${textractRetries + sonnetRetries}`,
  );

  return { metrics, costUsd };
}

async function main() {
  const argFixture = process.argv[2];
  // Load env before instantiating the AWS client so AWS_* env vars are set.
  loadEnvLocal();
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error(
      "Missing AWS credentials in env or .env.local. Need AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.",
    );
    process.exit(1);
  }
  const textract = new TextractClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const anthropic = getAnthropicClient();

  const fixturesToRun = argFixture ? [argFixture] : FIXTURES;
  console.log(`[${RUNNER_NAME}] running ${fixturesToRun.length} fixture(s)`);
  let totalCost = 0;
  for (const f of fixturesToRun) {
    if (!existsSync(fixturePath(f)) && !existsSync(join(FIXTURES_DIR, f))) {
      console.error(`fixture not found: ${f}`);
      continue;
    }
    try {
      const result = await runFixture(textract, anthropic, fixtureBasename(fixturePath(f)));
      totalCost += result.costUsd;
      console.log(`  running cost total: $${totalCost.toFixed(4)}`);
      if (totalCost > 4.0) {
        console.error(
          `WARNING: bakeoff cost > $4 (current: $${totalCost.toFixed(4)}). Continuing — spec budget is $5.`,
        );
      }
    } catch (err) {
      console.error(`  fixture ${f} hard-failed: ${(err as Error).message}`);
      const failMetrics: Metrics = {
        runner: RUNNER_NAME,
        fixture: f,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        latency_ms: 0,
        cost_usd: 0,
        cost_breakdown: {},
        retries: 0,
        outcome: "failed_after_retry",
        error: (err as Error).message,
      };
      writeArtifacts(RUNNER_NAME, f, null, null, failMetrics);
    }
  }
  console.log(`\n[${RUNNER_NAME}] total cost: $${totalCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
