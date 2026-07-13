/**
 * _summary-idset.ts — build the {ocd-bill-id → our DB bill id} map for the bills we
 * want to recover summaries for (null-summary, tagged, openstates). Read-only on Neon.
 * Output: scripts/ingest/_pole-batches/_summary-idset.json  { "ocd-bill/<uuid>": "openstates-ocd-bill-<uuid>", ... }
 */
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

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

// "openstates-ocd-bill-<uuid>" → "ocd-bill/<uuid>"
const toOcd = (id: string) => id.replace(/^openstates-/, "").replace(/^ocd-bill-/, "ocd-bill/");

async function main() {
  const sql = neon(env("ALIGNMENT_DATABASE_URL"));
  const rows = (await sql`
    SELECT b.id
    FROM bills b
    WHERE b.summary IS NULL AND b.source = 'openstates'
      AND EXISTS (SELECT 1 FROM issue_tags it WHERE it.bill_id = b.id)`) as Array<{ id: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[toOcd(r.id)] = r.id;
  writeFileSync("scripts/ingest/_pole-batches/_summary-idset.json", JSON.stringify(map));
  console.log(`idset: ${rows.length} bills · distinct ocd ids: ${Object.keys(map).length}`);
  console.log("sample:", Object.entries(map)[0]);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
