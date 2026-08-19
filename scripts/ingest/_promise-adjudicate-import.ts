/**
 * scripts/ingest/_promise-adjudicate-import.ts
 *
 * Step 3 of 3 in the subscription-based promise-ADJUDICATION pipeline (see
 * the header of ./promise-adjudicate.ts). Upserts two kinds of verdicts:
 *
 * 1. deterministic.json (written by _promise-adjudicate-export.ts) — already
 *    a final VerdictRow[], no LLM involved, so no re-validation is needed
 *    beyond a basic shape check. Always upserted first.
 * 2. batch-NNNN.json / <batch>-results.json pairs (written by export.ts and
 *    _promise-adjudicate.workflow.js's agents respectively) — RE-VALIDATED
 *    with parseAndValidateVerdict against each promise's OWN actions list
 *    (the fabricated-evidence guard never trusts an agent's word), same
 *    verification posture _promise-extract-import.ts applies to quotes.
 *
 * A batch whose result file does not exist yet is reported as NOT YET
 * ADJUDICATED, distinct from a promise the agent genuinely rated
 * not_yet_rated — collapsing those two states would hide an unrun batch as
 * if it had been honestly adjudicated (the same class of bug
 * _promise-extract-import.ts's header warns about for extraction).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-import.ts \
 *     --batches /tmp/adjudicate-batches --results /tmp/adjudicate-results --dry-run   # inspect first
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-adjudicate-import.ts \
 *     --batches /tmp/adjudicate-batches --results /tmp/adjudicate-results             # write
 *   Flags: --dry-run, --json (emit upserted rows to stdout).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  flagValue,
  parseAndValidateVerdict,
  upsertVerdict,
  type PromiseWithActions,
  type VerdictRow,
} from "./promise-adjudicate";

interface AdjudicationResultEntry {
  promiseId: string;
  verdictJson: string;
}

function resultFileFor(batchPath: string, resultDir: string): string {
  const base = batchPath
    .split("/")
    .pop()!
    .replace(/\.json$/u, "");
  return join(resultDir, `${base}-results.json`);
}

function isVerdictRowShape(v: unknown): v is VerdictRow {
  if (v === null || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.promiseId === "string" &&
    typeof r.verdict === "string" &&
    typeof r.rationale === "string" &&
    typeof r.adjudicatorVersion === "string"
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const batchDir = flagValue(argv, "--batches");
  const resultDir = flagValue(argv, "--results");
  if (!batchDir || !resultDir) {
    process.stderr.write(
      "[promise-adjudicate-import] --batches <export --out dir> and --results <workflow resultDir> are required.\n",
    );
    process.exit(1);
  }
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");

  const db = requireDb();
  const allRows: VerdictRow[] = [];
  let rowsUpserted = 0;

  // --- deterministic.json: no LLM, no re-validation beyond shape -----------
  const deterministicPath = join(batchDir, "deterministic.json");
  let deterministicCount = 0;
  if (existsSync(deterministicPath)) {
    let rows: unknown[];
    try {
      rows = JSON.parse(readFileSync(deterministicPath, "utf8")) as unknown[];
    } catch (err) {
      process.stderr.write(
        `[promise-adjudicate-import] UNPARSEABLE ${deterministicPath}, skipping ` +
          `(${err instanceof Error ? err.message : String(err)})\n`,
      );
      rows = [];
    }
    for (const row of rows) {
      if (!isVerdictRowShape(row)) {
        process.stderr.write(
          `[promise-adjudicate-import] skipping malformed deterministic row: ${JSON.stringify(row)}\n`,
        );
        continue;
      }
      try {
        await upsertVerdict(db, row, dryRun);
        rowsUpserted++;
        deterministicCount++;
        allRows.push(row);
      } catch (err) {
        process.stderr.write(
          `[promise-adjudicate-import] db_error promise=${row.promiseId}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
  }

  // --- batch-*.json / <batch>-results.json: RE-VALIDATE against actions ---
  const batchFiles = existsSync(batchDir)
    ? readdirSync(batchDir)
        .filter((f) => /^batch-\d+\.json$/u.test(f))
        .sort()
        .map((f) => join(batchDir, f))
    : [];

  let promisesAdjudicated = 0;
  let promisesNotYetAdjudicated = 0;
  let batchesUnparseable = 0;

  for (const batchPath of batchFiles) {
    let promises: PromiseWithActions[];
    try {
      promises = JSON.parse(
        readFileSync(batchPath, "utf8"),
      ) as PromiseWithActions[];
    } catch (err) {
      batchesUnparseable++;
      process.stderr.write(
        `[promise-adjudicate-import] UNPARSEABLE batch file ${batchPath}, skipping ` +
          `(${err instanceof Error ? err.message : String(err)})\n`,
      );
      continue;
    }
    const resultPath = resultFileFor(batchPath, resultDir);
    if (!existsSync(resultPath)) {
      promisesNotYetAdjudicated += promises.length;
      process.stderr.write(
        `[promise-adjudicate-import] NOT YET ADJUDICATED: ${resultPath} missing — ` +
          `${promises.length} promises from ${batchPath} skipped (not "not_yet_rated", just not run yet)\n`,
      );
      continue;
    }

    let results: AdjudicationResultEntry[];
    try {
      results = JSON.parse(
        readFileSync(resultPath, "utf8"),
      ) as AdjudicationResultEntry[];
    } catch (err) {
      promisesNotYetAdjudicated += promises.length;
      process.stderr.write(
        `[promise-adjudicate-import] UNPARSEABLE result file ${resultPath}, treating ` +
          `${promises.length} promises from ${batchPath} as not-yet-adjudicated ` +
          `(${err instanceof Error ? err.message : String(err)})\n`,
      );
      continue;
    }

    const promiseById = new Map(promises.map((p) => [p.id, p]));
    const seen = new Set<string>();
    for (const entry of results) {
      const promise = promiseById.get(entry.promiseId);
      if (!promise) {
        process.stderr.write(
          `[promise-adjudicate-import] skip entry promise=${entry.promiseId} ` +
            "reason=no_matching_exported_promise (stale result file?)\n",
        );
        continue;
      }
      seen.add(entry.promiseId);
      const row = parseAndValidateVerdict(entry.verdictJson, promise);
      try {
        await upsertVerdict(db, row, dryRun);
        rowsUpserted++;
        promisesAdjudicated++;
        allRows.push(row);
      } catch (err) {
        process.stderr.write(
          `[promise-adjudicate-import] db_error promise=${row.promiseId}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
    const missing = promises.filter((p) => !seen.has(p.id));
    if (missing.length > 0) {
      promisesNotYetAdjudicated += missing.length;
      process.stderr.write(
        `[promise-adjudicate-import] ${missing.length} promise(s) from ${batchPath} had no entry ` +
          `in ${resultPath} (agent skipped them) — not-yet-adjudicated, not not_yet_rated\n`,
      );
    }
  }

  process.stderr.write(
    `\n[promise-adjudicate-import] done${dryRun ? " (dry-run)" : ""}. ` +
      `deterministic=${deterministicCount} llm_adjudicated=${promisesAdjudicated} ` +
      `not_yet_adjudicated=${promisesNotYetAdjudicated} upserted=${rowsUpserted}` +
      `${batchesUnparseable > 0 ? ` batches_unparseable=${batchesUnparseable}` : ""}\n` +
      (promisesNotYetAdjudicated > 0
        ? "Not-yet-adjudicated promises need the workflow run for their batch(es) before re-running this import.\n"
        : "") +
      (batchesUnparseable > 0
        ? `${batchesUnparseable} batch file(s) were unparseable and were skipped entirely — investigate before trusting this run's totals.\n`
        : ""),
  );

  if (asJson) {
    console.log(JSON.stringify(allRows, null, 2));
  }
}

main().catch((err) => {
  process.stderr.write(
    `[promise-adjudicate-import] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
