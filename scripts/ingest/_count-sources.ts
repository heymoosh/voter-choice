import { requireDb } from "../../db/client";
import { sql } from "drizzle-orm";
async function main() {
  const db = requireDb();
  const rows = await db.execute(sql`
    SELECT source, COUNT(*) as rows, COUNT(DISTINCT candidate_id) as candidates
    FROM donor_aggregates
    GROUP BY source
    ORDER BY rows DESC
  `);
  console.log('=== Donor Aggregates by Source ===');
  for (const r of rows.rows) {
    console.log(`${String(r.source).padEnd(25)} rows=${r.rows} candidates=${r.candidates}`);
  }
  const total = await db.execute(sql`SELECT COUNT(*) as total, COUNT(DISTINCT candidate_id) as cands FROM donor_aggregates`);
  console.log('\nTOTAL:', total.rows[0]);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
