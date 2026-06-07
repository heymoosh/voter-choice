/**
 * _summary-flipcheck.ts — measure the no_score→confident recovery.
 *   before: snapshot current pole_v1 stance for the (bill,issue) pairs the recovery re-tags.
 *   after : compare new stances → transition matrix + recovered count.
 *
 *   npx tsx scripts/ingest/_summary-flipcheck.ts before
 *   npx tsx scripts/ingest/_summary-flipcheck.ts after
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const W = "scripts/ingest/_pole-batches/_summary-work";
const SNAP = `${W}/_summary-before.json`;

function env(n: string): string {
  const r = readFileSync(".env.alignment", "utf8");
  for (const l of r.split("\n")) {
    const t = l.trim();
    if (t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    if (k.trim() === n) return v.join("=").trim().replace(/^["']|["']$/g, "");
  }
  throw new Error(n);
}

// collect (bill_id, issue) pairs the recovery assigned a stance to
function recoveryPairs(): Array<{ bill: string; issue: string }> {
  const man = JSON.parse(readFileSync(`${W}/_manifest.json`, "utf8")) as Array<{ batchId: string; issue: string | null }>;
  const pairs: Array<{ bill: string; issue: string }> = [];
  for (const m of man) {
    if (!m.issue) continue;
    const rp = `${W}/_results/${m.batchId}.json`;
    const r = JSON.parse(readFileSync(rp, "utf8")) as { results: Array<{ bill_id: string; pole_stance?: string }> };
    for (const x of r.results) if (x.pole_stance) pairs.push({ bill: x.bill_id, issue: m.issue });
  }
  return pairs;
}

async function main() {
  const mode = process.argv[2];
  const sql = neon(env("ALIGNMENT_DATABASE_URL"));
  const pairs = recoveryPairs();

  // fetch current stance for each pair in chunks
  const stance = new Map<string, string>();
  const CHUNK = 800;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const c = pairs.slice(i, i + CHUNK);
    const rows = (await sql`
      SELECT bill_id, canonical_issue, pole_stance FROM issue_tags_pole_v1
      WHERE (bill_id, canonical_issue) IN (
        SELECT unnest(${c.map((p) => p.bill)}::text[]), unnest(${c.map((p) => p.issue)}::text[]))`) as Array<{ bill_id: string; canonical_issue: string; pole_stance: string }>;
    for (const r of rows) stance.set(`${r.bill_id}|${r.canonical_issue}`, r.pole_stance);
  }

  if (mode === "before") {
    const snap: Record<string, string> = {};
    const dist: Record<string, number> = {};
    for (const p of pairs) {
      const s = stance.get(`${p.bill}|${p.issue}`) ?? "absent";
      snap[`${p.bill}|${p.issue}`] = s;
      dist[s] = (dist[s] ?? 0) + 1;
    }
    writeFileSync(SNAP, JSON.stringify(snap));
    console.log(`BEFORE snapshot: ${pairs.length} recovery pairs`);
    console.log("current stance dist:", JSON.stringify(dist));
  } else if (mode === "after") {
    const before: Record<string, string> = JSON.parse(readFileSync(SNAP, "utf8"));
    const matrix: Record<string, number> = {};
    let recovered = 0; // no_score → confident
    for (const p of pairs) {
      const key = `${p.bill}|${p.issue}`;
      const o = before[key] ?? "absent";
      const n = stance.get(key) ?? "absent";
      matrix[`${o} → ${n}`] = (matrix[`${o} → ${n}`] ?? 0) + 1;
      if (o === "no_score" && (n === "in_favor" || n === "opposed")) recovered++;
    }
    console.log(`AFTER: ${pairs.length} recovery pairs`);
    console.log("transition matrix (old → new):");
    for (const [k, v] of Object.entries(matrix).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(24)} ${v}`);
    console.log(`\n✅ RECOVERED (no_score → confident): ${recovered}`);
  } else {
    console.error("usage: _summary-flipcheck.ts before|after");
    process.exit(1);
  }
}
main().catch((e) => { console.error("FLIPCHECK FAILED:", e.message); process.exit(1); });
