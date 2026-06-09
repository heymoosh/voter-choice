/**
 * _gold-sample-more.ts — draw an ADDITIONAL gold sample for ONE issue, excluding bills already
 * sampled (in _gold-pv.json), and APPEND to the existing _gold-batches sample (new batch files +
 * manifest + _gold-pv). Used to strengthen a weak-denominator issue (e.g. public_safety) before
 * the ship/blank call. READ-ONLY on the DB except it writes new batch input files locally.
 *
 *   npx tsx scripts/ingest/_gold-sample-more.ts <issue> [inFavorQ] [opposedQ] [noScoreQ]
 *   (defaults 40 / 40 / 20)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

const SEED = "gold-2026-06-06";
const SUMMARY_CAP = 4000;
const BATCH_SIZE = 50;
const OUT_DIR = "scripts/ingest/_gold-batches";
const BASE = resolve(OUT_DIR);

function loadUrl(): string {
  const raw = readFileSync(".env.alignment", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "ALIGNMENT_DATABASE_URL") return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no url");
}

async function main() {
  const issue = process.argv[2];
  if (!issue) throw new Error("usage: _gold-sample-more.ts <issue> [inFavorQ opposedQ noScoreQ]");
  const Q = {
    in_favor: Number(process.argv[3] ?? 40),
    opposed: Number(process.argv[4] ?? 40),
    no_score: Number(process.argv[5] ?? 20),
  };

  const manifest = JSON.parse(readFileSync(`${BASE}/_manifest.json`, "utf8")) as Array<{
    path: string; issue: string; batchId: string; count: number;
  }>;
  const pvAside = JSON.parse(readFileSync(`${BASE}/_gold-pv.json`, "utf8")) as Record<
    string, { pole_stance: string; confidence: string | null }
  >;
  // already-sampled bill_ids for this issue (to exclude)
  const existingIds = Object.keys(pvAside)
    .filter((k) => k.endsWith(`|${issue}`))
    .map((k) => k.slice(0, k.lastIndexOf("|")));
  // next batch index for this issue
  const used = manifest.filter((m) => m.issue === issue).map((m) => Number(m.batchId.split("-").pop()));
  let nextN = (used.length ? Math.max(...used) : 0) + 1;

  const sql = neon(loadUrl());
  const picked: Array<{ bill_id: string; title: string; summary: string | null; pv_stance: string; pv_conf: string | null }> = [];
  for (const stance of ["in_favor", "opposed", "no_score"] as const) {
    const rows = (await sql`
      SELECT p.bill_id AS bill_id, b.title AS title, b.summary AS summary,
             p.pole_stance AS pv_stance, p.tagger_confidence AS pv_conf
      FROM issue_tags_pole_v1 p JOIN bills b ON b.id = p.bill_id
      WHERE p.canonical_issue = ${issue} AND p.pole_stance = ${stance}
        AND NOT (p.bill_id = ANY(${existingIds}))
      ORDER BY (b.summary IS NULL), md5(p.bill_id || ${SEED})
      LIMIT ${Q[stance]}
    `) as Array<{ bill_id: string; title: string; summary: string | null; pv_stance: string; pv_conf: string | null }>;
    picked.push(...rows);
  }

  for (const b of picked) pvAside[`${b.bill_id}|${issue}`] = { pole_stance: b.pv_stance, confidence: b.pv_conf };

  const newBatches: Array<{ path: string; issue: string; batchId: string; count: number }> = [];
  for (let i = 0; i < picked.length; i += BATCH_SIZE) {
    const slice = picked.slice(i, i + BATCH_SIZE).map((b) => ({
      bill_id: b.bill_id, title: b.title, summary: b.summary ? b.summary.slice(0, SUMMARY_CAP) : null,
    }));
    const batchId = `${issue}-${String(nextN++).padStart(3, "0")}`;
    const path = `${OUT_DIR}/${batchId}.json`;
    writeFileSync(`${BASE}/${batchId}.json`, JSON.stringify({ issue, batchId, bills: slice }));
    newBatches.push({ path, issue, batchId, count: slice.length });
  }

  writeFileSync(`${BASE}/_manifest.json`, JSON.stringify([...manifest, ...newBatches], null, 2));
  writeFileSync(`${BASE}/_gold-pv.json`, JSON.stringify(pvAside, null, 2));
  const byStance = picked.reduce((m, b) => ((m[b.pv_stance] = (m[b.pv_stance] || 0) + 1), m), {} as Record<string, number>);
  console.log(`${issue}: +${picked.length} NEW bills [pv ${byStance.in_favor || 0}/${byStance.opposed || 0}/${byStance.no_score || 0}] ` +
    `(excluded ${existingIds.length} already-sampled) → ${newBatches.length} new batch(es): ${newBatches.map((b) => b.batchId).join(", ")}`);
  console.log(`Run the oracle panel on the new batches, then re-assemble + re-validate.`);
  console.log(JSON.stringify(newBatches.map((b) => ({ issue: b.issue, batchId: b.batchId, count: b.count }))));
}

main().catch((e) => { console.error("SAMPLE-MORE FAILED:", e.message); process.exit(1); });
