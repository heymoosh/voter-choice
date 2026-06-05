/**
 * _summary-batch.ts — build length-batched work for summary recovery.
 *
 * Reads _summary-text.jsonl (recovered raw_text) + _summary-issuemap.json.
 * - Contested bills → one SINGLE-ISSUE batch entry per contested issue (focused poles,
 *   no env/energy cross-contamination). Agent returns summary + pole_stance.
 * - Valence-only bills → summary-only batches (issue=null). Agent returns summary.
 * Batches by total text length. Writes batch files + manifest.
 *
 *   npx tsx scripts/ingest/_summary-batch.ts
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const DIR = "scripts/ingest/_pole-batches";
const OUT = `${DIR}/_summary-work`;
const TRUNC = 6000;        // chars of raw_text fed per bill
const MAX_BILLS = 14;
const MAX_CHARS = 80000;   // per batch

interface Row { id: string; text: string }

function main() {
  const abs = resolve(OUT);
  rmSync(abs, { recursive: true, force: true });
  mkdirSync(`${abs}/_results`, { recursive: true });

  const issuemap: Record<string, { contested: string[]; all: string[] }> =
    JSON.parse(readFileSync(`${DIR}/_summary-issuemap.json`, "utf8"));
  const lines = readFileSync(`${DIR}/_summary-text.jsonl`, "utf8").split("\n").filter(Boolean);

  // bucket key = issue (contested) or "__summary_only__"
  const buckets: Record<string, Row[]> = {};
  for (const line of lines) {
    const o = JSON.parse(line) as { id: string; text: string };
    const text = o.text.slice(0, TRUNC);
    const m = issuemap[o.id];
    const contested = m?.contested ?? [];
    if (contested.length === 0) {
      (buckets["__summary_only__"] ??= []).push({ id: o.id, text });
    } else {
      for (const issue of contested) (buckets[issue] ??= []).push({ id: o.id, text });
    }
  }

  const manifest: Array<{ batchId: string; issue: string | null; resultPath: string; count: number }> = [];
  for (const [key, rows] of Object.entries(buckets)) {
    const issue = key === "__summary_only__" ? null : key;
    let batch: Row[] = [];
    let chars = 0;
    let n = 0;
    const flush = () => {
      if (!batch.length) return;
      n++;
      const batchId = `${key}-${String(n).padStart(3, "0")}`;
      writeFileSync(`${abs}/${batchId}.json`, JSON.stringify({ batchId, issue, bills: batch }));
      manifest.push({ batchId, issue, resultPath: `${abs}/_results/${batchId}.json`, count: batch.length });
      batch = []; chars = 0;
    };
    for (const r of rows) {
      if (batch.length >= MAX_BILLS || chars + r.text.length > MAX_CHARS) flush();
      batch.push(r); chars += r.text.length;
    }
    flush();
  }

  writeFileSync(`${abs}/_manifest.json`, JSON.stringify(manifest));
  // also write the compact args (baseDir + batches w/o resultPath) for the workflow
  const baseDir = abs;
  const batches = manifest.map((m) => ({ batchId: m.batchId, issue: m.issue, count: m.count }));
  writeFileSync(`${abs}/_run-args.json`, JSON.stringify({ baseDir, batches }));

  const contestedBatches = manifest.filter((m) => m.issue).length;
  const summaryBatches = manifest.filter((m) => !m.issue).length;
  const billPairs = manifest.reduce((s, m) => s + m.count, 0);
  console.log(`batches: ${manifest.length} (contested ${contestedBatches}, summary-only ${summaryBatches})`);
  console.log(`bill-issue pairs: ${billPairs}`);
  console.log("per-issue batch counts:");
  const byIssue: Record<string, number> = {};
  for (const m of manifest) byIssue[m.issue ?? "summary_only"] = (byIssue[m.issue ?? "summary_only"] ?? 0) + 1;
  for (const [k, v] of Object.entries(byIssue)) console.log(`  ${k.padEnd(22)} ${v}`);
}
main();
