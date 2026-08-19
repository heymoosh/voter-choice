/**
 * scripts/ingest/_promise-adjudicate-export.ts
 *
 * Step 1 of 3 in the subscription-based promise-ADJUDICATION pipeline (see
 * the header of ./promise-adjudicate.ts for why this exists — no LLM call
 * here should use the metered Anthropic key, same policy as
 * promise-extract.ts). NO Claude call in this step: it only reads
 * `candidate_promises` + `promise_actions` from the DB and splits the result
 * into two output kinds.
 *
 * DETERMINISTIC promises (the run's --cycle window has not opened as of
 * --now) need no LLM at all — rubric §4.1, computed in code
 * (deterministicNotYetTestable). These are written straight to
 * <out>/deterministic.json as already-final VerdictRow objects; the import
 * step upserts them with no further validation needed (pure-function output,
 * nothing to re-check against a page).
 *
 * LLM promises (window open) are batched into <out>/batch-NNNN.json for a
 * Claude Code workflow to adjudicate, same shape convention as
 * _promise-extract-export.ts's batches.
 *
 * --cycle is REQUIRED (no default): a bulk fetch with no cycle scope would
 * sweep in every OTHER cycle's promises too (made_at is unfiltered) and
 * judge them against the wrong window — a real, silent mis-adjudication
 * risk once the table holds more than one cycle's rows, which it already
 * does (2026-08-19 finding). See fetchPromisesWithActions's cycle param.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-export.ts \
 *     --cycle 2022 --out /tmp/adjudicate-batches
 *   Flags: --promise <id> (repeatable), --limit N (default 10000),
 *          --now YYYY-MM-DD (clock override), --cycle N (required),
 *          --batch-size N (default 15).
 *
 * Output: <out>/deterministic.json (VerdictRow[], possibly empty) plus
 * <out>/batch-0001.json, … (each an array of { promiseId, candidateId,
 * canonicalIssue, promiseText, promiseType, conditionsDeadline, actions[] })
 * plus <out>/manifest.json listing every batch file path, the window, and
 * nowIso — pass those as args to _promise-adjudicate.workflow.js.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  deterministicNotYetTestable,
  fetchPromisesWithActions,
  flagValue,
  flagValues,
  termWindowForCycle,
  windowNotYetOpen,
  type PromiseWithActions,
} from "./promise-adjudicate";

const DEFAULT_BATCH_SIZE = 15;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const outDir = flagValue(argv, "--out");
  const cycleArg = flagValue(argv, "--cycle");
  if (!outDir || !cycleArg) {
    process.stderr.write(
      "[promise-adjudicate-export] --out <batch dir> and --cycle N are both required " +
        "(no default cycle here — a bulk export must be explicitly scoped to one cycle's " +
        "promises via made_at, or it would sweep in every other cycle's rows and judge them " +
        "against the wrong window; see fetchPromisesWithActions's cycle param).\n",
    );
    process.exit(1);
  }
  const cycle = Number(cycleArg);
  if (!Number.isInteger(cycle) || cycle <= 0) {
    process.stderr.write(
      `[promise-adjudicate-export] invalid --cycle value "${cycleArg}" — must be a positive integer year.\n`,
    );
    process.exit(1);
  }
  const limit = Number(flagValue(argv, "--limit") ?? 10_000);
  const promiseIds = flagValues(argv, "--promise");
  const nowIso =
    flagValue(argv, "--now") ?? new Date().toISOString().slice(0, 10);
  const window = termWindowForCycle(cycle);
  const batchSize = Number(
    flagValue(argv, "--batch-size") ?? DEFAULT_BATCH_SIZE,
  );

  const db = requireDb();
  const promises = await fetchPromisesWithActions(db, promiseIds, limit, cycle);
  process.stderr.write(
    `[promise-adjudicate-export] ${promises.length} promises (now=${nowIso} ` +
      `window=${window.start}..${window.end})\n`,
  );

  const preWindow = windowNotYetOpen(nowIso, window);
  mkdirSync(outDir, { recursive: true });

  let deterministic: PromiseWithActions[] = [];
  let needsLlm: PromiseWithActions[] = [];
  if (preWindow) {
    deterministic = promises;
  } else {
    needsLlm = promises;
  }

  const deterministicRows = deterministic.map((p) =>
    deterministicNotYetTestable(p, nowIso, window),
  );
  const deterministicPath = join(outDir, "deterministic.json");
  writeFileSync(deterministicPath, JSON.stringify(deterministicRows, null, 2));

  const batches = chunk(needsLlm, batchSize);
  const batchFiles = batches.map((batch, i) => {
    const path = join(outDir, `batch-${String(i + 1).padStart(4, "0")}.json`);
    writeFileSync(path, JSON.stringify(batch, null, 2));
    return path;
  });
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        batchFiles,
        deterministicCount: deterministicRows.length,
        llmCount: needsLlm.length,
        nowIso,
        window,
      },
      null,
      2,
    ),
  );

  process.stderr.write(
    `\n[promise-adjudicate-export] done. deterministic=${deterministicRows.length} ` +
      `(-> ${deterministicPath}, needs no LLM) llm_needed=${needsLlm.length} ` +
      `batches=${batchFiles.length} manifest=${manifestPath}\n` +
      (batchFiles.length > 0
        ? "Next: run scripts/ingest/_promise-adjudicate.workflow.js in a Claude Code session " +
          `with args { batchFiles: <from manifest>, resultDir: "/tmp/adjudicate-results" }.\n`
        : "No promises need LLM adjudication for this window — go straight to " +
          "_promise-adjudicate-import.ts to upsert the deterministic verdicts.\n"),
  );
}

main().catch((err) => {
  process.stderr.write(
    `[promise-adjudicate-export] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
