// Contender 2: Claude Sonnet vision direct.
//
// Renders each PDF page to PNG via pdfjs-dist + @napi-rs/canvas, then sends
// per-page to Claude with the vision prompt. Stitches per-page extractions
// into a single ballot extraction.
//
// Usage:
//   npx tsx runners/02-sonnet-vision.ts                 # all fixtures
//   npx tsx runners/02-sonnet-vision.ts <fixture.pdf>   # single fixture (basename)

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
  stitchPages,
  writeArtifacts,
  VISION_DIRECT_PROMPT,
  Ballot,
  Metrics,
} from "./_shared.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

const RUNNER_NAME = "02-sonnet-vision";

async function runFixture(client: ReturnType<typeof getAnthropicClient>, fixtureName: string): Promise<{
  metrics: Metrics;
  costUsd: number;
}> {
  const started = new Date();
  const pdfPath = fixturePath(fixtureName);
  console.log(`\n[${RUNNER_NAME}] fixture: ${fixtureName}`);
  console.log(`  rendering pages...`);
  const pages = await renderPdfPages(pdfPath, { scale: 2.0 });
  console.log(`  rendered ${pages.length} page(s)`);

  let inputTokens = 0;
  let outputTokens = 0;
  let retriesTotal = 0;
  let outcome: Metrics["outcome"] = "success";
  let errorMsg: string | undefined;
  const perPageJson: Ballot[] = [];
  const perPageRaw: Array<{ page: number; raw: string }> = [];

  for (const page of pages) {
    console.log(`  page ${page.pageIndex}/${pages.length}: ${(page.pngBuffer.byteLength / 1024).toFixed(0)} KiB`);
    try {
      const result = await callSonnetWithRetry(
        client,
        {
          promptText: `${VISION_DIRECT_PROMPT}\n\nThis is page ${page.pageIndex} of ${pages.length}.`,
          images: [page.pngBuffer],
        },
        1,
      );
      inputTokens += result.inputTokens;
      outputTokens += result.outputTokens;
      retriesTotal += result.attempts - 1;
      perPageRaw.push({ page: page.pageIndex, raw: result.text });
      try {
        const parsed = parseSonnetJson(result.text) as Ballot;
        perPageJson.push(parsed);
      } catch (parseErr) {
        // Retry once with stricter "JSON only" reminder.
        console.error(`  page ${page.pageIndex}: parse failed (${(parseErr as Error).message}); retrying with stricter prompt`);
        const retryResult = await callSonnetWithRetry(
          client,
          {
            promptText: `${VISION_DIRECT_PROMPT}\n\nThis is page ${page.pageIndex} of ${pages.length}.\n\nIMPORTANT: Return JSON only. No prose, no markdown fences, no commentary. The response must start with '{' and end with '}'.`,
            images: [page.pngBuffer],
          },
          1,
        );
        inputTokens += retryResult.inputTokens;
        outputTokens += retryResult.outputTokens;
        retriesTotal += 1 + (retryResult.attempts - 1);
        try {
          const parsed = parseSonnetJson(retryResult.text) as Ballot;
          perPageJson.push(parsed);
          // Overwrite the raw entry with the retry text.
          perPageRaw[perPageRaw.length - 1] = { page: page.pageIndex, raw: retryResult.text };
        } catch (parseErr2) {
          outcome = "schema_invalid";
          errorMsg = `page ${page.pageIndex}: ${(parseErr2 as Error).message}`;
          // Append a stub for the page.
          perPageJson.push({
            election_metadata: { election_date: null, election_type: null, jurisdiction: null },
            sections: [],
          });
          perPageRaw[perPageRaw.length - 1] = { page: page.pageIndex, raw: retryResult.text };
        }
      }
    } catch (err) {
      outcome = "failed_after_retry";
      errorMsg = `page ${page.pageIndex}: ${(err as Error).message}`;
      console.error(`  page ${page.pageIndex}: failed after retry: ${errorMsg}`);
      perPageJson.push({
        election_metadata: { election_date: null, election_type: null, jurisdiction: null },
        sections: [],
      });
      perPageRaw.push({ page: page.pageIndex, raw: `<error: ${errorMsg}>` });
      break; // Stop processing more pages of this fixture on hard failure.
    }
  }

  const stitched = stitchPages(perPageJson);
  // Attach per-page raw for debugging in the .raw.json (since this is the "upstream raw" for vision direct, the API outputs serve as the raw record).
  const rawSerialized = JSON.stringify(perPageRaw, null, 2);

  const completed = new Date();
  const latencyMs = completed.getTime() - started.getTime();
  const costUsd = sonnetCostUsd(inputTokens, outputTokens);

  const metrics: Metrics = {
    runner: RUNNER_NAME,
    fixture: fixtureName,
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
    latency_ms: latencyMs,
    cost_usd: costUsd,
    cost_breakdown: {
      sonnet_input_tokens: inputTokens,
      sonnet_output_tokens: outputTokens,
      sonnet_cost_usd: costUsd,
      pages: pages.length,
    },
    retries: retriesTotal,
    outcome,
    ...(errorMsg ? { error: errorMsg } : {}),
  };

  writeArtifacts(RUNNER_NAME, fixtureName, stitched, rawSerialized, metrics);
  console.log(
    `  done: ${pages.length}p, $${costUsd.toFixed(4)}, ${(latencyMs / 1000).toFixed(1)}s, outcome=${outcome}, retries=${retriesTotal}`,
  );

  return { metrics, costUsd };
}

async function main() {
  const argFixture = process.argv[2];
  const client = getAnthropicClient();
  const fixturesToRun = argFixture
    ? [argFixture]
    : FIXTURES;

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
      // Write a failure metrics record so we have a paper trail.
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
