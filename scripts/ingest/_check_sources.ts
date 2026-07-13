import { requireDb } from '../../db/client';
import { sql } from 'drizzle-orm';

async function main() {
  const db = requireDb();
  for (const state of ['WY','AK','NH','PA','VA','TN','WI','MS','OR','KS']) {
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
}
main().catch(err => { console.error(err); process.exit(1); });
