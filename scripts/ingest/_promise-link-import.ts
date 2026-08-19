/**
 * scripts/ingest/_promise-link-import.ts
 *
 * Step 3 of 3 in the subscription-based promise-LINKING pipeline (see the
 * header of ./promise-link.ts). Reads the batch files
 * _promise-link-export.ts wrote (promise + its pre-fetched vote/cosponsor
 * matches) and the result files _promise-link.workflow.js's agents wrote
 * (classified pole side per promise), then applies the SAME pure
 * buildLinkRows() logic promise-link.ts always used to turn a classified
 * side + the official-record matches into toward/against link rows, and
 * upserts into `promise_actions`.
 *
 * A batch whose result file does not exist yet is reported as NOT YET
 * LINKED, distinct from a promise the agent genuinely classified "unclear"
 * — collapsing those two states would hide an unrun batch as if it had been
 * honestly classified.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-link-import.ts \
 *     --batches /tmp/link-batches --results /tmp/link-results --dry-run   # inspect first
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-link-import.ts \
 *     --batches /tmp/link-batches --results /tmp/link-results             # write
 *   Flags: --dry-run, --json (emit link rows + pole classifications to stdout).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  buildLinkRows,
  flagValue,
  parsePoleResponse,
  upsertLinkRows,
  type CosponsorMatch,
  type PromiseRow,
  type PromiseSide,
  type VoteMatch,
} from "./promise-link";

interface ExportedPromise extends PromiseRow {
  voteMatches: VoteMatch[];
  cosponsorMatches: CosponsorMatch[];
}

interface LinkResultEntry {
  promiseId: string;
  sideJson: string;
}

function resultFileFor(batchPath: string, resultDir: string): string {
  const base = batchPath
    .split("/")
    .pop()!
    .replace(/\.json$/u, "");
  return join(resultDir, `${base}-results.json`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const batchDir = flagValue(argv, "--batches");
  const resultDir = flagValue(argv, "--results");
  if (!batchDir || !resultDir) {
    process.stderr.write(
      "[promise-link-import] --batches <export --out dir> and --results <workflow resultDir> are required.\n",
    );
    process.exit(1);
  }
  const dryRun = argv.includes("--dry-run");
  const asJson = argv.includes("--json");

  const batchFiles = readdirSync(batchDir)
    .filter((f) => /^batch-\d+\.json$/u.test(f))
    .sort()
    .map((f) => join(batchDir, f));
  if (batchFiles.length === 0) {
    process.stderr.write(
      `[promise-link-import] no batch-*.json files in ${batchDir}.\n`,
    );
    process.exit(1);
  }

  const db = requireDb();
  const report: { promiseId: string; side: PromiseSide; actions: number }[] =
    [];
  let promisesLinked = 0;
  let promisesNotYetLinked = 0;
  let unclearCount = 0;
  let zeroActionCount = 0;
  let rowsUpserted = 0;
  let batchesUnparseable = 0;

  for (const batchPath of batchFiles) {
    let promises: ExportedPromise[];
    try {
      promises = JSON.parse(
        readFileSync(batchPath, "utf8"),
      ) as ExportedPromise[];
    } catch (err) {
      batchesUnparseable++;
      process.stderr.write(
        `[promise-link-import] UNPARSEABLE batch file ${batchPath}, skipping ` +
          `(${err instanceof Error ? err.message : String(err)})\n`,
      );
      continue;
    }
    const resultPath = resultFileFor(batchPath, resultDir);
    if (!existsSync(resultPath)) {
      promisesNotYetLinked += promises.length;
      process.stderr.write(
        `[promise-link-import] NOT YET LINKED: ${resultPath} missing — ` +
          `${promises.length} promises from ${batchPath} skipped (not "unclear", just not run yet)\n`,
      );
      continue;
    }

    let results: LinkResultEntry[];
    try {
      results = JSON.parse(
        readFileSync(resultPath, "utf8"),
      ) as LinkResultEntry[];
    } catch (err) {
      promisesNotYetLinked += promises.length;
      process.stderr.write(
        `[promise-link-import] UNPARSEABLE result file ${resultPath}, treating ` +
          `${promises.length} promises from ${batchPath} as not-yet-linked ` +
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
          `[promise-link-import] skip entry promise=${entry.promiseId} ` +
            "reason=no_matching_exported_promise (stale result file?)\n",
        );
        continue;
      }
      seen.add(entry.promiseId);
      const side = parsePoleResponse(entry.sideJson);

      if (side === "unclear") {
        unclearCount++;
        report.push({ promiseId: promise.id, side, actions: 0 });
        process.stderr.write(
          `[promise-link-import] unclear_side promise=${promise.id} issue=${promise.canonicalIssue} — ` +
            "no actions linked, needs human review\n",
        );
        promisesLinked++;
        continue;
      }

      const rows = buildLinkRows(
        promise,
        side,
        promise.voteMatches,
        promise.cosponsorMatches,
      );
      if (rows.length === 0) zeroActionCount++;
      try {
        rowsUpserted += await upsertLinkRows(db, rows, dryRun);
      } catch (err) {
        process.stderr.write(
          `[promise-link-import] db_error promise=${promise.id}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        continue;
      }
      report.push({ promiseId: promise.id, side, actions: rows.length });
      promisesLinked++;
    }
    const missing = promises.filter((p) => !seen.has(p.id));
    if (missing.length > 0) {
      promisesNotYetLinked += missing.length;
      process.stderr.write(
        `[promise-link-import] ${missing.length} promise(s) from ${batchPath} had no entry ` +
          `in ${resultPath} (agent skipped them) — not-yet-linked, not unclear\n`,
      );
    }
  }

  process.stderr.write(
    `\n[promise-link-import] done${dryRun ? " (dry-run)" : ""}. ` +
      `promises_linked=${promisesLinked} not_yet_linked=${promisesNotYetLinked} ` +
      `rows_upserted=${rowsUpserted} unclear_side=${unclearCount} zero_actions=${zeroActionCount}` +
      `${batchesUnparseable > 0 ? ` batches_unparseable=${batchesUnparseable}` : ""}\n` +
      "[promise-link-import] zero_actions is EXPECTED for challengers (no official record yet).\n" +
      (promisesNotYetLinked > 0
        ? "Not-yet-linked promises need the workflow run for their batch(es) before re-running this import.\n"
        : "") +
      (batchesUnparseable > 0
        ? `${batchesUnparseable} batch file(s) were unparseable and were skipped entirely — investigate before trusting this run's totals.\n`
        : ""),
  );

  if (asJson) console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  process.stderr.write(
    `[promise-link-import] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
