import { requireDb } from '../../db/client';
import { sql } from 'drizzle-orm';
async function main() {
  const db = requireDb();
  for (const state of ['OR','MS','KS']) {
    const r = await db.execute(sql`
      SELECT DISTINCT da.source, COUNT(DISTINCT da.candidate_id) as cands
      FROM donor_aggregates da
      JOIN candidates c ON c.id = da.candidate_id
      WHERE c.jurisdiction LIKE ${'state-' + state + '-%'}
      GROUP BY da.source
    `);
    const sources = r.rows.map((x: any) => x.source + '(' + x.cands + ')').join(', ');
    console.log(state + ': ' + (sources || 'none'));
  }
  
  // Check VA total
  const va = await db.execute(sql`
    SELECT COUNT(DISTINCT candidate_id) as cands, COUNT(*) as rows
    FROM donor_aggregates da
    JOIN candidates c ON c.id = da.candidate_id
    WHERE c.jurisdiction LIKE 'state-VA-%'
  `);
  console.log('VA total:', va.rows[0]);
}
main().catch(err => { console.error(err); process.exit(1); });
