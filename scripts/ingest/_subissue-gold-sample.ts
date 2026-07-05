/**
 * _subissue-gold-sample.ts — build the BLIND gold sample for the sub-issue gate.
 *
 * Reads the re-tag output (_subissue-batches/_results/*.json) + the batch files
 * (for title/summary), then for each NON-NULL healthcare facet draws a stratified
 * sample (default 50/facet, evenly strided across the sorted id list for spread,
 * deterministic) and writes one BLIND gold batch per facet:
 *   { parent, batchId, bills: [{ bill_id, title, summary }] }     (NO sub_issue)
 * plus a manifest the gold oracle workflow consumes, and _tagger-labels.json
 * (bill_id -> the tagger's sub_issue) for the scorer to compare against.
 *
 * Read-only on the DB-free files. No DB.
 *   npx tsx scripts/ingest/_subissue-gold-sample.ts [--per 50]
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";

const SRC = "scripts/ingest/_subissue-batches";
const RESULTS = `${SRC}/_results`;
const OUT = "scripts/ingest/_subissue-gold";
const FACETS = [
  "drug_prices",
  "coverage_access",
  "provider_costs",
  "senior_care",
  "mental_behavioral_health",
];

function arg(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : def;
}

function main() {
  const per = arg("--per", 50);
  const manifest = JSON.parse(
    readFileSync(`${SRC}/_manifest.json`, "utf8"),
  ) as Array<{
    batchId: string;
    count: number;
  }>;

  // bill_id -> {title, summary} from the batch files.
  const meta: Record<string, { title: string; summary: string | null }> = {};
  for (const m of manifest) {
    const batch = JSON.parse(readFileSync(`${SRC}/${m.batchId}.json`, "utf8"));
    for (const b of batch.bills)
      meta[b.bill_id] = { title: b.title, summary: b.summary };
  }
  // tagger labels from the CLEANED assembled output (hallucinated ids already
  // dropped by assemble); restrict to ids that exist in the batch files.
  const all = `${RESULTS}/_all-subtags.json`;
  if (!existsSync(all))
    throw new Error(`missing ${all} — run _subissue-assemble.ts first`);
  const tagger: Record<string, string> = {}; // only non-null facets
  const allTags = JSON.parse(readFileSync(all, "utf8")) as Array<{
    bill_id: string;
    sub_issue: string | null;
  }>;
  for (const t of allTags)
    if (t.sub_issue && meta[t.bill_id]) tagger[t.bill_id] = t.sub_issue;

  // Group sampled bills by facet (deterministic even-stride over sorted ids).
  if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/_results`, { recursive: true });

  const manifestOut: Array<{
    path: string;
    parent: string;
    batchId: string;
    count: number;
  }> = [];
  const taggerLabels: Record<string, string> = {};
  const summary: Record<string, number> = {};

  for (const facet of FACETS) {
    const ids = Object.keys(tagger)
      .filter((id) => tagger[id] === facet)
      .sort();
    const picked: string[] =
      ids.length <= per
        ? ids
        : Array.from(
            { length: per },
            (_, k) => ids[Math.floor((k * ids.length) / per)],
          );
    summary[facet] = picked.length;
    const bills = picked.map((id) => ({
      bill_id: id,
      title: meta[id]?.title ?? "",
      summary: meta[id]?.summary ?? null,
    }));
    for (const id of picked) taggerLabels[id] = facet;
    const batchId = `gold-${facet}`;
    const path = resolve(`${OUT}/${batchId}.json`);
    writeFileSync(
      path,
      JSON.stringify(
        { parent: "healthcare_affordability", batchId, bills },
        null,
        2,
      ),
    );
    manifestOut.push({
      path,
      parent: "healthcare_affordability",
      batchId,
      count: bills.length,
    });
  }

  writeFileSync(`${OUT}/_manifest.json`, JSON.stringify(manifestOut, null, 2));
  writeFileSync(
    `${OUT}/_tagger-labels.json`,
    JSON.stringify(taggerLabels, null, 2),
  );

  console.log("gold sample written to", OUT);
  console.log("per-facet sampled:", summary);
  console.log(
    "total sampled:",
    Object.values(summary).reduce((a, b) => a + b, 0),
  );
  console.log("baseDir for oracle:", resolve(OUT));
}

main();
