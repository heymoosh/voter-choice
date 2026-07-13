/**
 * _pole-assemble.ts — Phase C assembly + coverage gate (read-only on files, no DB).
 *
 * Reads every _results/<batchId>.json, validates each tag's bill_id is actually in
 * its batch (drops hallucinated/extra ids), attaches canonical_issue, and writes a
 * single clean tags file for _pole-insert.ts. Reports any uncovered bills + the
 * batches that need re-tagging (authoritative M2 / coverage check).
 *
 *   npx tsx scripts/ingest/_pole-assemble.ts
 * Output: scripts/ingest/_pole-batches/_results/_all-tags.json
 * Exit code 2 if any batch is missing/incomplete.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "scripts/ingest/_pole-batches";
const OUT = `${DIR}/_results/_all-tags.json`;
const VALID = new Set(["in_favor", "opposed", "no_score"]);

type Tag = { bill_id: string; pole_stance: string; confidence: string };

function load(f: string) {
  return JSON.parse(readFileSync(f, "utf8"));
}

function main() {
  const manifest = load(`${DIR}/_manifest.json`) as Array<{
    path: string; resultPath: string; issue: string; batchId: string; count: number;
  }>;

  const all: Array<{ bill_id: string; canonical_issue: string; pole_stance: string; confidence: string }> = [];
  const perIssue: Record<string, { tagged: number; missing: number; expected: number }> = {};
  const needRetag: string[] = [];
  let droppedExtra = 0;
  let droppedInvalid = 0;

  for (const m of manifest) {
    perIssue[m.issue] ??= { tagged: 0, missing: 0, expected: 0 };
    perIssue[m.issue].expected += m.count;

    if (!existsSync(m.resultPath)) {
      needRetag.push(m.batchId);
      perIssue[m.issue].missing += m.count;
      continue;
    }
    const result = load(m.resultPath) as { tags: Tag[] };
    const batch = load(m.path) as { bills: { bill_id: string }[] };
    const billIds = new Set(batch.bills.map((b) => b.bill_id));
    const taggedHere = new Set<string>();

    for (const t of result.tags) {
      if (!billIds.has(t.bill_id)) { droppedExtra++; continue; }
      if (!VALID.has(t.pole_stance) || taggedHere.has(t.bill_id)) { droppedInvalid++; continue; }
      const confidence = ["high", "medium", "low"].includes(t.confidence) ? t.confidence : "low";
      all.push({ bill_id: t.bill_id, canonical_issue: m.issue, pole_stance: t.pole_stance, confidence });
      taggedHere.add(t.bill_id);
    }
    perIssue[m.issue].tagged += taggedHere.size;
    const miss = billIds.size - taggedHere.size;
    if (miss > 0) { needRetag.push(m.batchId); perIssue[m.issue].missing += miss; }
  }

  writeFileSync(OUT, JSON.stringify(all));

  console.log("=== COVERAGE (per issue) ===");
  for (const issue of Object.keys(perIssue)) {
    const p = perIssue[issue];
    console.log(`${issue.padEnd(20)} tagged=${p.tagged}/${p.expected} missing=${p.missing}`);
  }
  console.log(`\nTotal tags written: ${all.length}`);
  console.log(`Dropped: ${droppedExtra} extra (id not in batch) · ${droppedInvalid} invalid/dup`);
  if (needRetag.length) {
    console.log(`\n⚠️  ${needRetag.length} batch(es) need re-tag (missing/incomplete):`);
    console.log("  " + needRetag.join(", "));
    process.exit(2);
  }
  console.log(`\n✅ Full coverage. Clean tags → ${OUT}`);
}

main();
