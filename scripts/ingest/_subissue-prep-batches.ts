/**
 * _subissue-prep-batches.ts — Phase A of the healthcare sub-issue re-tag.
 *
 * READ-ONLY against the Neon alignment branch (.env.alignment). Pulls every old
 * issue_tags row whose canonical_issue = 'healthcare_affordability', joins bills
 * for title+summary, and writes ~100-bill batch files + a manifest for the
 * background sub-tagging Workflow.
 *
 * Scoped to healthcare ONLY — the sub-issue layer is piloted on
 * healthcare_affordability (see src/lib/alignment/subIssues.ts).
 *
 * No DB writes. Run from launch-production-federal:
 *   npx tsx scripts/ingest/_subissue-prep-batches.ts
 *   npx tsx scripts/ingest/_subissue-prep-batches.ts --dry-run   (log counts, write nothing)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const PARENT_ISSUE = "healthcare_affordability";
const BATCH_SIZE = 100;
const SUMMARY_CAP = 4000;
const OUT_DIR = "scripts/ingest/_subissue-batches";

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest
        .join("=")
        .trim()
        .replace(/^["']|["']$/g, "");
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sql = neon(loadUrl());

  const rows = (await sql`
    SELECT it.bill_id AS bill_id, b.title AS title, b.summary AS summary
    FROM issue_tags it
    JOIN bills b ON b.id = it.bill_id
    WHERE it.canonical_issue = ${PARENT_ISSUE}
    ORDER BY it.bill_id
  `) as Array<{ bill_id: string; title: string; summary: string | null }>;

  let nullSummary = 0;
  const bills = rows.map((r) => {
    if (r.summary == null) nullSummary++;
    return {
      bill_id: r.bill_id,
      title: r.title,
      summary: r.summary ? r.summary.slice(0, SUMMARY_CAP) : null,
    };
  });
  const batchCount = Math.ceil(bills.length / BATCH_SIZE);

  if (dryRun) {
    console.log(
      `[dry-run] ${PARENT_ISSUE.padEnd(24)} ${bills.length} bills → ${batchCount} batches (no files written)`,
    );
    console.log(
      `[dry-run] TOTAL ${bills.length} bills · ${batchCount} batches · ${nullSummary} null-summary (${
        bills.length ? Math.round((nullSummary / bills.length) * 100) : 0
      }%)`,
    );
    return;
  }

  const absDir = resolve(OUT_DIR); // absolute — workflow agents don't share this cwd
  rmSync(absDir, { recursive: true, force: true });
  mkdirSync(absDir, { recursive: true });
  const resultsDir = `${absDir}/_results`;
  mkdirSync(resultsDir, { recursive: true });

  const manifest: Array<{
    path: string;
    resultPath: string;
    parent: string;
    batchId: string;
    count: number;
  }> = [];

  let n = 0;
  for (let i = 0; i < bills.length; i += BATCH_SIZE) {
    const slice = bills.slice(i, i + BATCH_SIZE);
    n++;
    const batchId = `${PARENT_ISSUE}-${String(n).padStart(3, "0")}`;
    const path = `${absDir}/${batchId}.json`; // absolute path in manifest
    const resultPath = `${resultsDir}/${batchId}.json`; // agent writes results here (in-repo)
    writeFileSync(
      path,
      JSON.stringify({ parent: PARENT_ISSUE, batchId, bills: slice }),
    );
    manifest.push({
      path,
      resultPath,
      parent: PARENT_ISSUE,
      batchId,
      count: slice.length,
    });
  }
  console.log(
    `${PARENT_ISSUE.padEnd(24)} ${bills.length} bills → ${n} batches`,
  );

  writeFileSync(`${absDir}/_manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(
    `\nTOTAL ${bills.length} bills · ${manifest.length} batches · ${nullSummary} null-summary (${
      bills.length ? Math.round((nullSummary / bills.length) * 100) : 0
    }%)`,
  );
  console.log(`Manifest: ${OUT_DIR}/_manifest.json`);
}

main().catch((e) => {
  console.error("PREP FAILED:", e.message);
  process.exit(1);
});
