// Contender 3: docling + Claude Sonnet post-processor.
//
// Invokes the Python docling script via the bakeoff venv's Python interpreter,
// captures the markdown output, and feeds it to Sonnet (text-only) with the
// standardized post-processor prompt.
//
// Usage:
//   npx tsx runners/03-docling-sonnet.ts                 # all fixtures
//   npx tsx runners/03-docling-sonnet.ts <fixture.pdf>   # single fixture

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  FIXTURES,
  FIXTURES_DIR,
  fixturePath,
  fixtureBasename,
  BAKEOFF_DIR,
  getAnthropicClient,
  callSonnetWithRetry,
  parseSonnetJson,
  sonnetCostUsd,
  buildPostProcessorPrompt,
  writeArtifacts,
  Ballot,
  Metrics,
} from "./_shared.js";

const RUNNER_NAME = "03-docling-sonnet";
const PYTHON_BIN = join(BAKEOFF_DIR, ".venv", "bin", "python3");
const DOCLING_SCRIPT = join(BAKEOFF_DIR, "runners", "03-docling-extract.py");

type DoclingResult = {
  markdown: string;
  doclingLatencyMs: number;
};

function runDocling(pdfPath: string): DoclingResult {
  const result = spawnSync(PYTHON_BIN, [DOCLING_SCRIPT, pdfPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024, // 64 MiB for safety on large docs
  });
  if (result.status !== 0) {
    const stderr = result.stderr || "";
    throw new Error(
      `docling exited with status ${result.status}: ${stderr.slice(-400)}`,
    );
  }
  // Parse DOCLING_ELAPSED_MS=<n> from stderr.
  let doclingLatencyMs = 0;
  const m = /DOCLING_ELAPSED_MS=(\d+)/.exec(result.stderr || "");
  if (m) doclingLatencyMs = Number(m[1]);
  return { markdown: result.stdout, doclingLatencyMs };
}

async function runFixture(
  client: ReturnType<typeof getAnthropicClient>,
  fixtureName: string,
): Promise<{ metrics: Metrics; costUsd: number }> {
  const started = new Date();
  const pdfPath = fixturePath(fixtureName);
  console.log(`\n[${RUNNER_NAME}] fixture: ${fixtureName}`);

  // Step 1: docling extraction.
  let docling: DoclingResult;
  try {
    docling = runDocling(pdfPath);
    console.log(
      `  docling: ${docling.doclingLatencyMs}ms, ${docling.markdown.length} chars markdown`,
    );
  } catch (err) {
    const completed = new Date();
    const errorMsg = `docling failed: ${(err as Error).message}`;
    console.error(`  ${errorMsg}`);
    const metrics: Metrics = {
      runner: RUNNER_NAME,
      fixture: fixtureName,
      started_at: started.toISOString(),
      completed_at: completed.toISOString(),
      latency_ms: completed.getTime() - started.getTime(),
      cost_usd: 0,
      cost_breakdown: { docling_cost_usd: 0 },
      retries: 0,
      outcome: "failed_after_retry",
      error: errorMsg,
    };
    writeArtifacts(RUNNER_NAME, fixtureName, null, null, metrics);
    return { metrics, costUsd: 0 };
  }

  // Step 2: Sonnet post-processor (text-only).
  let inputTokens = 0;
  let outputTokens = 0;
  let retriesTotal = 0;
  let outcome: Metrics["outcome"] = "success";
  let errorMsg: string | undefined;
  let parsed: Ballot | null = null;

  try {
    const prompt = buildPostProcessorPrompt(docling.markdown);
    const result = await callSonnetWithRetry(client, { promptText: prompt }, 1);
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;
    retriesTotal = result.attempts - 1;
    try {
      parsed = parseSonnetJson(result.text) as Ballot;
    } catch (parseErr) {
      console.error(`  sonnet parse failed (${(parseErr as Error).message}); retrying with stricter prompt`);
      const retry = await callSonnetWithRetry(
        client,
        {
          promptText: `${prompt}\n\nIMPORTANT: Return JSON only. No prose, no markdown fences, no commentary. The response must start with '{' and end with '}'.`,
        },
        1,
      );
      inputTokens += retry.inputTokens;
      outputTokens += retry.outputTokens;
      retriesTotal += 1 + (retry.attempts - 1);
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
  const sonnetCost = sonnetCostUsd(inputTokens, outputTokens);
  const costUsd = sonnetCost; // docling is free.

  const metrics: Metrics = {
    runner: RUNNER_NAME,
    fixture: fixtureName,
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
    latency_ms: latencyMs,
    cost_usd: costUsd,
    cost_breakdown: {
      docling_latency_ms: docling.doclingLatencyMs,
      docling_cost_usd: 0,
      sonnet_input_tokens: inputTokens,
      sonnet_output_tokens: outputTokens,
      sonnet_cost_usd: sonnetCost,
    },
    retries: retriesTotal,
    outcome,
    ...(errorMsg ? { error: errorMsg } : {}),
  };

  writeArtifacts(RUNNER_NAME, fixtureName, parsed, docling.markdown, metrics);
  console.log(
    `  done: $${costUsd.toFixed(4)}, ${(latencyMs / 1000).toFixed(1)}s, outcome=${outcome}, retries=${retriesTotal}`,
  );

  return { metrics, costUsd };
}

async function main() {
  const argFixture = process.argv[2];
  const client = getAnthropicClient();
  const fixturesToRun = argFixture ? [argFixture] : FIXTURES;

  console.log(`[${RUNNER_NAME}] running ${fixturesToRun.length} fixture(s)`);
  let totalCost = 0;
  for (const f of fixturesToRun) {
    if (!existsSync(fixturePath(f)) && !existsSync(join(FIXTURES_DIR, f))) {
      console.error(`fixture not found: ${f}`);
      continue;
    }
    try {
      const result = await runFixture(client, fixtureBasename(fixturePath(f)));
      totalCost += result.costUsd;
      console.log(`  running cost total: $${totalCost.toFixed(4)}`);
      if (totalCost > 4.0) {
        console.error(`WARNING: bakeoff cost > $4 (current: $${totalCost.toFixed(4)}). Continuing — spec budget is $5.`);
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
