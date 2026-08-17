/**
 * scripts/ingest/_promise-extract-import.ts
 *
 * Step 3 of 3 in the subscription-based promise-extraction pipeline (see the
 * header of ./promise-extract.ts). Reads the batch files
 * _promise-extract-export.ts wrote and the result files
 * _promise-extract.workflow.js's agents wrote, RE-VALIDATES every extraction
 * against the original exported page text (the verbatim-quote gate never
 * trusts an agent's word — see parseAndValidatePromises /
 * quoteAppearsInSource in promise-extract.ts), and upserts into
 * `candidate_promises`.
 *
 * A batch whose result file does not exist yet is reported as NOT YET
 * EXTRACTED, distinct from a candidate the agent genuinely found zero
 * promises for — collapsing those two states is exactly the bug that made
 * the old API-cap outage (2026-08-17) look like "no promise corpus" for
 * ~400 candidates that were never actually checked.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-extract-import.ts \
 *     --batches /tmp/promise-batches --results /tmp/promise-results --dry-run   # inspect first
 *   npx tsx --env-file=.env.local scripts/ingest/_promise-extract-import.ts \
 *     --batches /tmp/promise-batches --results /tmp/promise-results             # write
 *   Flags: --dry-run, --json (emit upserted rows to stdout).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { requireDb } from "../../db/client";
import {
  DEFAULT_VENUE,
  EXTRACTION_MODEL_VERSION,
  captureDateFromArchiveUrl,
  computePromiseId,
  dedupeByNormalizedText,
  flagValue,
  parseAndValidatePromises,
  upsertPromises,
  type ExtractedPromiseRow,
} from "./promise-extract";

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

interface ExtractionResultEntry {
  candidateId: string;
  pageUrl: string;
  archiveUrl: string;
  promisesJson: string;
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
      "[promise-extract-import] --batches <export --out dir> and --results <workflow resultDir> are required.\n",
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
      `[promise-extract-import] no batch-*.json files in ${batchDir}.\n`,
    );
    process.exit(1);
  }

  const db = requireDb();
  const allRows: ExtractedPromiseRow[] = [];
  let candidatesImported = 0;
  let candidatesNotYetExtracted = 0;
  let rowsUpserted = 0;

  for (const batchPath of batchFiles) {
    const candidates = JSON.parse(
      readFileSync(batchPath, "utf8"),
    ) as ExportedCandidate[];
    const resultPath = resultFileFor(batchPath, resultDir);

    if (!existsSync(resultPath)) {
      candidatesNotYetExtracted += candidates.length;
      process.stderr.write(
        `[promise-extract-import] NOT YET EXTRACTED: ${resultPath} missing — ` +
          `${candidates.length} candidates from ${batchPath} skipped (not "zero promises", just not run yet)\n`,
      );
      continue;
    }

    const results = JSON.parse(
      readFileSync(resultPath, "utf8"),
    ) as ExtractionResultEntry[];

    // pageText lookup keyed by candidateId + pageUrl (the export/import contract).
    const pageTextByKey = new Map<string, string>();
    for (const c of candidates) {
      for (const p of c.pages)
        pageTextByKey.set(`${c.candidateId}::${p.pageUrl}`, p.pageText);
    }

    const rowsByCandidate = new Map<string, ExtractedPromiseRow[]>();
    for (const entry of results) {
      const pageText = pageTextByKey.get(
        `${entry.candidateId}::${entry.pageUrl}`,
      );
      if (pageText === undefined) {
        process.stderr.write(
          `[promise-extract-import] skip entry candidate=${entry.candidateId} page=${entry.pageUrl} ` +
            "reason=no_matching_exported_page (stale result file?)\n",
        );
        continue;
      }
      const validated = parseAndValidatePromises(
        entry.promisesJson,
        pageText,
        entry.pageUrl,
      );
      const rows: ExtractedPromiseRow[] = validated.map((p) => ({
        id: computePromiseId(
          entry.candidateId,
          entry.archiveUrl,
          p.promiseText,
        ),
        candidateId: entry.candidateId,
        canonicalIssue: p.canonicalIssue,
        subIssue: p.subIssue,
        promiseText: p.promiseText,
        madeAt: captureDateFromArchiveUrl(entry.archiveUrl),
        venue: DEFAULT_VENUE,
        sourceUrl: entry.pageUrl,
        archiveUrl: entry.archiveUrl,
        extractionModelVersion: EXTRACTION_MODEL_VERSION,
        promiseType: p.promiseType,
        conditionsDeadline: p.conditionsDeadline,
      }));
      const existing = rowsByCandidate.get(entry.candidateId) ?? [];
      rowsByCandidate.set(entry.candidateId, existing.concat(rows));
    }

    for (const c of candidates) {
      candidatesImported++;
      const rows = dedupeByNormalizedText(
        rowsByCandidate.get(c.candidateId) ?? [],
      );
      if (rows.length > 0) {
        try {
          rowsUpserted += await upsertPromises(db, rows, dryRun);
        } catch (err) {
          process.stderr.write(
            `[promise-extract-import] db_error candidate=${c.candidateId}: ${err instanceof Error ? err.message : String(err)}\n`,
          );
          continue;
        }
      }
      if (!asJson) {
        console.log(
          `${String(rows.length).padStart(3)}  ${c.name}${rows.length === 0 ? "  (no promise corpus from this capture)" : ""}`,
        );
      }
      allRows.push(...rows);
    }
  }

  process.stderr.write(
    `\n[promise-extract-import] done. candidates_imported=${candidatesImported} ` +
      `candidates_not_yet_extracted=${candidatesNotYetExtracted} promises=${allRows.length} ` +
      `upserted=${rowsUpserted}${dryRun ? " (dry-run)" : ""}\n` +
      (candidatesNotYetExtracted > 0
        ? "Not-yet-extracted candidates need the workflow run for their batch(es) before re-running this import.\n"
        : ""),
  );

  if (asJson) {
    console.log(JSON.stringify(allRows, null, 2));
  }
}

main().catch((err) => {
  process.stderr.write(
    `[promise-extract-import] fatal: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
