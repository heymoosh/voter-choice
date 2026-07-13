import { requireDb } from '../../db/client';
import { sql } from 'drizzle-orm';
async function main() {
  const db = requireDb();
  const r = await db.execute(sql`SELECT full_name FROM candidates WHERE jurisdiction LIKE 'state-WI-%' LIMIT 20`);
  console.log('WI DB candidates sample:');
  r.rows.forEach((x: any) => console.log('  ' + x.full_name));
  
  const r2 = await db.execute(sql`
    SELECT c.full_name FROM donor_aggregates da 
    JOIN candidates c ON c.id = da.candidate_id 
    WHERE c.jurisdiction LIKE 'state-WI-%'
    GROUP BY c.full_name LIMIT 15`);
  console.log('\nWI candidates WITH donor data:');
  r2.rows.forEach((x: any) => console.log('  ' + x.full_name));
}
main().catch(err => { console.error(err); process.exit(1); });
