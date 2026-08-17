/**
 * scripts/ingest/_promise-extract-export.ts
 *
 * Step 1 of 3 in the subscription-based promise-extraction pipeline (see the
 * header of ./promise-extract.ts for why this replaced the old
 * direct-API script). NO Claude call here — this step only does network
 * fetching (of already-archived/captured pages) and local text conversion,
 * then writes batch files for a Claude Code workflow to extract from.
 *
 * Resumable by construction: candidates that already have a promise row for
 * the current EXTRACTION_MODEL_VERSION within the corpus's cycle window are
 * skipped (fetchAlreadyExtracted, same rule promise-extract.ts always used).
 * Re-running this after a partial import naturally emits only what's still
 * missing from the DB — this is how a run interrupted by (for example) the
 * old API's usage cap gets finished without redoing completed candidates.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-extract-export.ts \
 *     --corpus /tmp/spike-all-2026.json --out /tmp/promise-batches
 *   Flags: --candidate <candidates.id> (repeatable), --limit N, --max-pages N
 *          (default 6), --concurrency N (default 1), --dir <snapshot store
 *          dir>, --batch-size N (default 15), --force (requires --candidate).
 *
 * Output: <out>/batch-0001.json, batch-0002.json, … (each an array of
 * { candidateId, name, office, state, district, cycle, pages: [{ pageUrl,
 * archiveUrl, pageText }] }) plus <out>/manifest.json listing every batch
 * file path — pass that array as `batchFiles` to
 * scripts/ingest/_promise-extract.workflow.js.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_PAGES,
  MAX_PAGE_CHARS,
  cycleFromCorpus,
  fetchAlreadyExtracted,
  fetchCandidatePages,
  flagValue,
  flagValues,
  loadCorpusRows,
  mapWithConcurrency,
  type CorpusRow,
  type FetchStats,
} from "./promise-extract";
import { defaultSnapshotDir } from "./site-snapshot-store";

const DEFAULT_BATCH_SIZE = 15;

interface ExportedPage {
  pageUrl: string;
  archiveUrl: string;
  pageText: string;
}

interface ExportedCandidate {
  candidateId: string;
  name: string;
  office: string;
  state: string;
  district: string | null;
  cycle: number;
  pages: ExportedPage[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function exportCandidate(
  row: CorpusRow,
  cycle: number,
  maxPages: number,
  snapshotDir: string,
  stats: FetchStats,
): Promise<ExportedCandidate | null> {
  const pages = await fetchCandidatePages(
    row,
    maxPages,
    fetch,
    stats,
    snapshotDir,
  );
  if (pages.length === 0) return null;
  return {
    candidateId: row.candidateId,
    name: row.name,
    office: row.office,
    state: row.state,
    district: row.district,
    cycle,
    pages: pages.map((p) => ({
      pageUrl: p.originalUrl,
      archiveUrl: p.archiveUrl,
      pageText: p.text.slice(0, MAX_PAGE_CHARS),
    })),
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const corpusPath = flagValue(argv, "--corpus");
  const outDir = flagValue(argv, "--out");
  if (!corpusPath || !outDir) {
    process.stderr.write(
      "[promise-extract-export] --corpus <spike --json output file> and --out <batch dir> are required.\n",
    );
    process.exit(1);
  }
  const limit = Number(flagValue(argv, "--limit") ?? Infinity);
  const maxPages = Number(flagValue(argv, "--max-pages") ?? DEFAULT_MAX_PAGES);
  const concurrency = Number(
    flagValue(argv, "--concurrency") ?? DEFAULT_CONCURRENCY,
  );
  const batchSize = Number(
    flagValue(argv, "--batch-size") ?? DEFAULT_BATCH_SIZE,
  );
  const snapshotDir = flagValue(argv, "--dir") ?? defaultSnapshotDir();
  const candidateFilter = new Set(flagValues(argv, "--candidate"));
  const force = argv.includes("--force");
  if (force && candidateFilter.size === 0) {
    process.stderr.write(
      "[promise-extract-export] --force requires an explicit --candidate selector.\n",
    );
    process.exit(1);
  }

  const rawCorpus = readFileSync(corpusPath, "utf8");
  if (rawCorpus.trim().length === 0) {
    process.stderr.write(`[promise-extract-export] ${corpusPath} is empty.\n`);
    process.exit(1);
  }
  const corpusPayload = JSON.parse(rawCorpus) as unknown;
  let corpus = loadCorpusRows(corpusPayload);
  if (candidateFilter.size > 0) {
    corpus = corpus.filter((r) => candidateFilter.has(r.candidateId));
  }
  if (Number.isFinite(limit)) corpus = corpus.slice(0, limit);

  const corpusCycle = cycleFromCorpus(corpus) ?? 2026;
  process.stderr.write(
    `[promise-extract-export] ${corpus.length} corpus-ready candidates from ${corpusPath} ` +
      `(cycle=${corpusCycle} max_pages=${maxPages} concurrency=${concurrency} dir=${snapshotDir})\n`,
  );

  const db = requireDb();
  const already = force
    ? new Set<string>()
    : await fetchAlreadyExtracted(
        db,
        corpus.map((r) => r.candidateId),
        corpusCycle,
      );
  const pending = corpus.filter((r) => !already.has(r.candidateId));
  const skipped = corpus.length - pending.length;
  if (skipped > 0) {
    process.stderr.write(
      `[promise-extract-export] ${skipped} candidates already extracted — skipped (resumable)\n`,
    );
  }

  const stats: FetchStats = { pagesFetched: 0, pagesFailed: 0 };
  let done = 0;
  const results = await mapWithConcurrency(
    pending,
    concurrency,
    async (row) => {
      const exported = await exportCandidate(
        row,
        corpusCycle,
        maxPages,
        snapshotDir,
        stats,
      );
      done++;
      process.stderr.write(
        `[promise-extract-export] ${row.name} (${row.state}-${row.district ?? "?"}): ` +
          `${exported?.pages.length ?? 0} pages [${done}/${pending.length}]\n`,
      );
      return exported;
    },
  );
  const candidates = results.filter((r): r is ExportedCandidate => r !== null);

  mkdirSync(outDir, { recursive: true });
  const batches = chunk(candidates, batchSize);
  const batchFiles = batches.map((batch, i) => {
    const path = join(outDir, `batch-${String(i + 1).padStart(4, "0")}.json`);
    writeFileSync(path, JSON.stringify(batch, null, 2));
    return path;
  });
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ batchFiles, candidateCount: candidates.length }, null, 2),
  );

  process.stderr.write(
    `\n[promise-extract-export] done. candidates_exported=${candidates.length} ` +
      `pages=${stats.pagesFetched} page_failures=${stats.pagesFailed} ` +
      `batches=${batchFiles.length} manifest=${manifestPath}\n` +
      "Next: run scripts/ingest/_promise-extract.workflow.js in a Claude Code session " +
      `with args { batchFiles: <from manifest>, resultDir: "/tmp/promise-results" }.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(
    `[promise-extract-export] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
