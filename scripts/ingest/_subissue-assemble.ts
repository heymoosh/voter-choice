/**
 * _subissue-assemble.ts — Phase C assembly + coverage gate (read-only on files, no DB).
 *
 * Reads every _results/<batchId>.json, validates each entry's bill_id is actually in
 * its batch (drops hallucinated/extra ids), validates sub_issue is one of the 5
 * healthcare facets OR null (via parseAndValidateSubTag against
 * healthcare_affordability), and writes a single clean file for
 * _subissue-insert.ts. Reports any uncovered bills + the batches that need
 * re-tagging (authoritative M2 / coverage check).
 *
 *   npx tsx scripts/ingest/_subissue-assemble.ts
 * Output: scripts/ingest/_subissue-batches/_results/_all-subtags.json
 * Exit code 2 if any batch is missing/incomplete.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseAndValidateSubTag } from "../../src/lib/alignment/subIssues";

const PARENT_ISSUE = "healthcare_affordability";
const DIR = "scripts/ingest/_subissue-batches";
const OUT = `${DIR}/_results/_all-subtags.json`;

type SubTag = {
  bill_id: string;
  sub_issue: string | null;
  confidence: string;
};

function load(f: string) {
  return JSON.parse(readFileSync(f, "utf8"));
}

function main() {
  const manifest = load(`${DIR}/_manifest.json`) as Array<{
    path: string;
    resultPath: string;
    parent: string;
    batchId: string;
    count: number;
  }>;

  const all: Array<{
    bill_id: string;
    canonical_issue: string;
    sub_issue: string | null;
    confidence: string;
  }> = [];
  const cov = { tagged: 0, missing: 0, expected: 0 };
  const needRetag: string[] = [];
  let droppedExtra = 0;
  let droppedDup = 0;
  let assigned = 0;
  let nullCount = 0;

  for (const m of manifest) {
    cov.expected += m.count;

    if (!existsSync(m.resultPath)) {
      needRetag.push(m.batchId);
      cov.missing += m.count;
      continue;
    }
    const result = load(m.resultPath) as { tags: SubTag[] };
    const batch = load(m.path) as { bills: { bill_id: string }[] };
    const billIds = new Set(batch.bills.map((b) => b.bill_id));
    const taggedHere = new Set<string>();

    for (const t of result.tags) {
      if (!billIds.has(t.bill_id)) {
        droppedExtra++;
        continue;
      }
      if (taggedHere.has(t.bill_id)) {
        droppedDup++;
        continue;
      }
      // null and any invalid string both collapse to null (fall back to parent).
      const subIssue = parseAndValidateSubTag(t.sub_issue, PARENT_ISSUE);
      const confidence = ["high", "medium", "low"].includes(t.confidence)
        ? t.confidence
        : "low";
      all.push({
        bill_id: t.bill_id,
        canonical_issue: PARENT_ISSUE,
        sub_issue: subIssue,
        confidence,
      });
      if (subIssue) assigned++;
      else nullCount++;
      taggedHere.add(t.bill_id);
    }
    cov.tagged += taggedHere.size;
    const miss = billIds.size - taggedHere.size;
    if (miss > 0) {
      needRetag.push(m.batchId);
      cov.missing += miss;
    }
  }

  writeFileSync(OUT, JSON.stringify(all));

  console.log("=== COVERAGE (healthcare_affordability) ===");
  console.log(
    `${PARENT_ISSUE.padEnd(24)} tagged=${cov.tagged}/${cov.expected} missing=${cov.missing}`,
  );
  console.log(
    `\nTotal entries written: ${all.length} (assigned=${assigned} · null=${nullCount})`,
  );
  console.log(
    `Dropped: ${droppedExtra} extra (id not in batch) · ${droppedDup} dup`,
  );
  if (needRetag.length) {
    console.log(
      `\n⚠️  ${needRetag.length} batch(es) need re-tag (missing/incomplete):`,
    );
    console.log("  " + needRetag.join(", "));
    process.exit(2);
  }
  console.log(`\n✅ Full coverage. Clean sub-tags → ${OUT}`);
}

main();
