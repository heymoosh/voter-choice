/**
 * _gold-sample.ts — build the offline GOLD SAMPLE for the cutover validation gate.
 *
 * READ-ONLY against the Neon alignment branch (.env.alignment). For each of the 12
 * contested issues, draws a stratified, reproducible sample of bills spanning pole_v1's
 * in_favor / opposed / no_score classes (preferring bills WITH a summary — null-summary
 * bills carry no directional signal and just inflate the abstain rate). The sample is the
 * set an independent oracle panel will label BLIND, then we measure pole_v1's per-issue
 * inversion rate against the adjudicated oracle.
 *
 * Stratify-by-pole_v1 is fine: pole_v1's label drives *which* bills we pick, but it is
 * NEVER written into the batch files the oracle sees. It is held aside in `_gold-pv.json`
 * for the later comparison.
 *
 * Output (scripts/ingest/_gold-batches/):
 *   - <issue>-NNN.json   { issue, batchId, bills:[{bill_id,title,summary}] }   ← oracle reads these (BLIND)
 *   - _results/          (empty; oracle panel writes here, one file per (batch,juror))
 *   - _manifest.json     [{ path, issue, batchId, count }]
 *   - _gold-pv.json      { "<bill_id>|<issue>": { pole_stance, confidence } }  ← held aside
 *
 *   npx tsx scripts/ingest/_gold-sample.ts
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const ISSUES = [
  "gun_rights_safety",
  "immigration",
  "border_security",
  "reproductive_rights",
  "public_safety",
  "crime_public_safety",
  "environment_climate",
  "election_integrity",
  "economy_jobs",
  "education_funding",
  "property_taxes",
  "energy_grid",
] as const;

// Per-issue, per-stratum target counts. Confident classes are oversampled because the
// inversion metric's denominator is "bills both pole_v1 and oracle call confidently".
const QUOTA = { in_favor: 20, opposed: 20, no_score: 12 } as const;
const SEED = "gold-2026-06-06"; // deterministic md5 shuffle key
const SUMMARY_CAP = 4000;
const BATCH_SIZE = 50;
const OUT_DIR = "scripts/ingest/_gold-batches";

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

interface Bill {
  bill_id: string;
  title: string;
  summary: string | null;
  pv_stance: string;
  pv_conf: string | null;
}

async function main() {
  const sql = neon(loadUrl());
  const absDir = resolve(OUT_DIR);
  rmSync(absDir, { recursive: true, force: true });
  mkdirSync(`${absDir}/_results`, { recursive: true });

  const manifest: Array<{ path: string; issue: string; batchId: string; count: number }> = [];
  const pvAside: Record<string, { pole_stance: string; confidence: string | null }> = {};
  let grand = 0;

  for (const issue of ISSUES) {
    const picked: Bill[] = [];
    const takenIds = new Set<string>();

    for (const stance of ["in_favor", "opposed", "no_score"] as const) {
      const quota = QUOTA[stance];
      // Deterministic shuffle via md5(bill_id||seed); summary-bearing bills first so the
      // confident strata are informative. Pull 3x quota then prefer with-summary.
      const rows = (await sql`
        SELECT p.bill_id AS bill_id, b.title AS title, b.summary AS summary,
               p.pole_stance AS pv_stance, p.tagger_confidence AS pv_conf
        FROM issue_tags_pole_v1 p
        JOIN bills b ON b.id = p.bill_id
        WHERE p.canonical_issue = ${issue} AND p.pole_stance = ${stance}
        ORDER BY (b.summary IS NULL), md5(p.bill_id || ${SEED})
        LIMIT ${quota}
      `) as Bill[];
      for (const r of rows) {
        if (takenIds.has(r.bill_id)) continue;
        takenIds.add(r.bill_id);
        picked.push(r);
      }
    }

    // Record pole_v1 answers aside (held back from the oracle), then strip them.
    for (const b of picked) {
      pvAside[`${b.bill_id}|${issue}`] = { pole_stance: b.pv_stance, confidence: b.pv_conf };
    }

    let n = 0;
    for (let i = 0; i < picked.length; i += BATCH_SIZE) {
      const slice = picked.slice(i, i + BATCH_SIZE).map((b) => ({
        bill_id: b.bill_id,
        title: b.title,
        summary: b.summary ? b.summary.slice(0, SUMMARY_CAP) : null,
      }));
      n++;
      const batchId = `${issue}-${String(n).padStart(3, "0")}`;
      const path = `${OUT_DIR}/${batchId}.json`;
      writeFileSync(`${absDir}/${batchId}.json`, JSON.stringify({ issue, batchId, bills: slice }));
      manifest.push({ path, issue, batchId, count: slice.length });
    }
    grand += picked.length;
    const byStance = picked.reduce(
      (m, b) => ((m[b.pv_stance] = (m[b.pv_stance] || 0) + 1), m),
      {} as Record<string, number>,
    );
    const withSum = picked.filter((b) => b.summary != null).length;
    console.log(
      `${issue.padEnd(20)} ${String(picked.length).padStart(3)} bills ` +
        `[pv ${byStance.in_favor || 0}/${byStance.opposed || 0}/${byStance.no_score || 0}] ` +
        `withSummary=${withSum} → ${n} batch(es)`,
    );
  }

  writeFileSync(`${absDir}/_manifest.json`, JSON.stringify(manifest, null, 2));
  writeFileSync(`${absDir}/_gold-pv.json`, JSON.stringify(pvAside, null, 2));
  console.log(
    `\nTOTAL ${grand} bills · ${manifest.length} batches · pv answers held aside in _gold-pv.json`,
  );
  console.log(`Manifest: ${OUT_DIR}/_manifest.json`);
}

main().catch((e) => {
  console.error("GOLD-SAMPLE FAILED:", e.message);
  process.exit(1);
});
