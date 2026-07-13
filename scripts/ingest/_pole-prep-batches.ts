/**
 * _pole-prep-batches.ts — Phase A of the Step-1 re-tag.
 *
 * READ-ONLY against the Neon alignment branch (.env.alignment). Pulls every old
 * issue_tags row for the 4 remaining contested issues, joins bills for title+summary,
 * and writes ~100-bill batch files + a manifest for the background tagging Workflow.
 *
 * No DB writes. Run from launch-production-federal:
 *   npx tsx scripts/ingest/_pole-prep-batches.ts
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const ISSUES = [
  "education_funding",
  "economy_jobs",
  "property_taxes",
  "energy_grid",
] as const;
const BATCH_SIZE = 100;
const SUMMARY_CAP = 4000;
const OUT_DIR = "scripts/ingest/_pole-batches";

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL")
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("ALIGNMENT_DATABASE_URL not found");
}

async function main() {
  const sql = neon(loadUrl());
  const absDir = resolve(OUT_DIR); // absolute — workflow agents don't share this cwd
  rmSync(absDir, { recursive: true, force: true });
  mkdirSync(absDir, { recursive: true });
  const resultsDir = `${absDir}/_results`;
  mkdirSync(resultsDir, { recursive: true });

  const manifest: Array<{
    path: string;
    resultPath: string;
    issue: string;
    batchId: string;
    count: number;
  }> = [];
  let grand = 0;
  let nullSummary = 0;

  for (const issue of ISSUES) {
    const rows = (await sql`
      SELECT it.bill_id AS bill_id, b.title AS title, b.summary AS summary
      FROM issue_tags it
      JOIN bills b ON b.id = it.bill_id
      WHERE it.canonical_issue = ${issue}
      ORDER BY it.bill_id
    `) as Array<{ bill_id: string; title: string; summary: string | null }>;

    const bills = rows.map((r) => {
      if (r.summary == null) nullSummary++;
      return {
        bill_id: r.bill_id,
        title: r.title,
        summary: r.summary ? r.summary.slice(0, SUMMARY_CAP) : null,
      };
    });
    grand += bills.length;

    let n = 0;
    for (let i = 0; i < bills.length; i += BATCH_SIZE) {
      const slice = bills.slice(i, i + BATCH_SIZE);
      n++;
      const batchId = `${issue}-${String(n).padStart(3, "0")}`;
      const path = `${absDir}/${batchId}.json`; // absolute path in manifest
      const resultPath = `${resultsDir}/${batchId}.json`; // agent writes results here (in-repo)
      writeFileSync(path, JSON.stringify({ issue, batchId, bills: slice }));
      manifest.push({ path, resultPath, issue, batchId, count: slice.length });
    }
    console.log(`${issue.padEnd(20)} ${bills.length} bills → ${n} batches`);
  }

  writeFileSync(`${absDir}/_manifest.json`, JSON.stringify(manifest, null, 2));
  console.log(
    `\nTOTAL ${grand} bills · ${manifest.length} batches · ${nullSummary} null-summary (${Math.round(
      (nullSummary / grand) * 100,
    )}%)`,
  );
  console.log(`Manifest: ${OUT_DIR}/_manifest.json`);
}

main().catch((e) => {
  console.error("PREP FAILED:", e.message);
  process.exit(1);
});
