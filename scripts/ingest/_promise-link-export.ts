/**
 * scripts/ingest/_promise-link-export.ts
 *
 * Step 1 of 3 in the subscription-based promise-LINKING pipeline (see the
 * header of ./promise-link.ts for why this exists — no LLM call here should
 * use the metered Anthropic key, same policy as promise-extract.ts). NO
 * Claude call in this step: it only reads `candidate_promises` and its
 * candidates' issue-matched votes/cosponsorships from the DB (deterministic,
 * pure SQL) and batches the result for a Claude Code workflow to classify.
 *
 * The one non-mechanical input the linker needs per promise is which SIDE of
 * the issue's pole axis the promise text takes — that classification is the
 * only thing the workflow's subagents do; everything else (matching votes
 * and cosponsorships to the promise's candidate + canonical_issue, and
 * turning a classified side into toward/against link rows) is pure code,
 * already done here / left to the import step.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-link-export.ts \
 *     --out /tmp/link-batches
 *   Flags: --promise <id> (repeatable), --limit N (default 10000),
 *          --batch-size N (default 30).
 *
 * Output: <out>/batch-0001.json, … (each an array of { promiseId,
 * candidateId, canonicalIssue, promiseText, promiseType, conditionsDeadline,
 * voteMatches[], cosponsorMatches[] }) plus <out>/manifest.json listing
 * every batch file path — pass that array as `batchFiles` to
 * scripts/ingest/_promise-link.workflow.js.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  fetchCosponsorMatches,
  fetchPromises,
  fetchVoteMatches,
  flagValue,
  flagValues,
  type CosponsorMatch,
  type PromiseRow,
  type VoteMatch,
} from "./promise-link";

const DEFAULT_BATCH_SIZE = 30;

interface ExportedPromise extends PromiseRow {
  voteMatches: VoteMatch[];
  cosponsorMatches: CosponsorMatch[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const outDir = flagValue(argv, "--out");
  if (!outDir) {
    process.stderr.write(
      "[promise-link-export] --out <batch dir> is required.\n",
    );
    process.exit(1);
  }
  const limit = Number(flagValue(argv, "--limit") ?? 10_000);
  const promiseIds = flagValues(argv, "--promise");
  const batchSize = Number(
    flagValue(argv, "--batch-size") ?? DEFAULT_BATCH_SIZE,
  );

  const db = requireDb();
  const promises = await fetchPromises(db, promiseIds, limit);
  process.stderr.write(
    `[promise-link-export] ${promises.length} promises to link\n`,
  );

  const exported: ExportedPromise[] = [];
  let done = 0;
  for (const promise of promises) {
    const [voteMatches, cosponsorMatches] = await Promise.all([
      fetchVoteMatches(db, promise.candidateId, promise.canonicalIssue),
      fetchCosponsorMatches(db, promise.candidateId, promise.canonicalIssue),
    ]);
    exported.push({ ...promise, voteMatches, cosponsorMatches });
    done++;
    if (done % 50 === 0 || done === promises.length) {
      process.stderr.write(
        `[promise-link-export] matched ${done}/${promises.length}\n`,
      );
    }
  }

  mkdirSync(outDir, { recursive: true });
  const batches = chunk(exported, batchSize);
  const batchFiles = batches.map((batch, i) => {
    const path = join(outDir, `batch-${String(i + 1).padStart(4, "0")}.json`);
    writeFileSync(path, JSON.stringify(batch, null, 2));
    return path;
  });
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ batchFiles, promiseCount: exported.length }, null, 2),
  );

  process.stderr.write(
    `\n[promise-link-export] done. promises_exported=${exported.length} ` +
      `batches=${batchFiles.length} manifest=${manifestPath}\n` +
      "Next: run scripts/ingest/_promise-link.workflow.js in a Claude Code session " +
      `with args { batchFiles: <from manifest>, resultDir: "/tmp/link-results" }.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `[promise-link-export] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
