import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const rows = await sql`
    SELECT source, COUNT(DISTINCT candidate_id) as candidates, COUNT(*) as rows 
    FROM donor_aggregates GROUP BY source ORDER BY rows DESC`;
  let totalRows = 0;
  rows.forEach((r: any) => { console.log(`  ${r.source}: ${r.candidates} cands, ${r.rows} rows`); totalRows += parseInt(r.rows); });
  console.log(`Total: ${totalRows} rows`);
  const states = await sql`
    SELECT DISTINCT substring(c.jurisdiction from 7 for 2) as st 
    FROM donor_aggregates da JOIN candidates c ON c.id = da.candidate_id 
    WHERE c.jurisdiction LIKE 'state-%' ORDER BY st`;
  console.log(`States: ${states.map((r: any) => r.st).join(', ')}`);
}
main().catch(console.error);
