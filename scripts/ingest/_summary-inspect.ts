/**
 * _summary-inspect.ts — eyeball recovery results (read-only, no DB).
 *   npx tsx scripts/ingest/_summary-inspect.ts <batchId>...
 */
import { readFileSync, existsSync } from "node:fs";
const WORK = "scripts/ingest/_pole-batches/_summary-work";

function main() {
  const ids = process.argv.slice(2);
  for (const batchId of ids) {
    const rp = `${WORK}/_results/${batchId}.json`;
    if (!existsSync(rp)) { console.log(`MISSING result: ${batchId}`); continue; }
    const result = JSON.parse(readFileSync(rp, "utf8"));
    const batch = JSON.parse(readFileSync(`${WORK}/${batchId}.json`, "utf8"));
    const textById = new Map(batch.bills.map((b: any) => [b.id, b.text]));
    console.log(`\n======== ${batchId} (issue=${result.issue}) — ${result.results.length} bills ========`);
    const dist: Record<string, number> = {};
    for (const r of result.results.slice(0, 8)) {
      const t = (textById.get(r.bill_id) ?? "").replace(/\s+/g, " ").slice(0, 75);
      const stance = r.pole_stance ? `[${r.pole_stance}/${r.confidence}]` : "";
      console.log(`\n  ${stance} ${t}`);
      console.log(`    → ${r.summary}`);
    }
    for (const r of result.results) dist[r.pole_stance ?? "—"] = (dist[r.pole_stance ?? "—"] ?? 0) + 1;
    console.log(`\n  stance dist: ${JSON.stringify(dist)}`);
  }
}
main();
