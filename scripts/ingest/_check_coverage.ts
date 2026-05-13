import { requireDb } from '../../db/client';
import { sql } from 'drizzle-orm';

async function main() {
  const db = requireDb();
  
  // Candidates with donor data by state
  const withData = await db.execute(sql`
    SELECT 
      CASE 
        WHEN c.jurisdiction LIKE 'state-%' THEN SUBSTRING(c.jurisdiction, 7, 2)
        WHEN c.jurisdiction LIKE 'federal-%' THEN 'FED'
        ELSE c.jurisdiction
      END as state,
      COUNT(DISTINCT da.candidate_id) as cands_with_data,
      COUNT(*) as rows
    FROM donor_aggregates da
    JOIN candidates c ON c.id = da.candidate_id
    GROUP BY state
    ORDER BY state
  `);

  // Total candidates by state
  const allCands = await db.execute(sql`
    SELECT 
      CASE 
        WHEN jurisdiction LIKE 'state-%' THEN SUBSTRING(jurisdiction, 7, 2)
        WHEN jurisdiction LIKE 'federal-%' THEN 'FED'
        ELSE jurisdiction
      END as state,
      COUNT(*) as total
    FROM candidates
    GROUP BY state
    ORDER BY state
  `);

  const totalMap = new Map<string, number>();
  allCands.rows.forEach((r: any) => totalMap.set(r.state, Number(r.total)));
  const dataMap = new Map<string, {cands: number, rows: number}>();
  withData.rows.forEach((r: any) => dataMap.set(r.state, {cands: Number(r.cands_with_data), rows: Number(r.rows)}));

  const allStates = [...new Set([...totalMap.keys(), ...dataMap.keys()])].sort();
  console.log('State | Total | WithData | Rows | %');
  let totalCands = 0, totalWithData = 0;
  for (const s of allStates) {
    const tot = totalMap.get(s) || 0;
    const d = dataMap.get(s) || {cands: 0, rows: 0};
    const pct = tot > 0 ? Math.round(d.cands * 100 / tot) : 0;
    console.log(`${s}: ${tot} total, ${d.cands} with data (${pct}%), ${d.rows} rows`);
    totalCands += tot;
    totalWithData += d.cands;
  }
  console.log(`\nTOTAL: ${totalCands} candidates, ${totalWithData} with data (${Math.round(totalWithData*100/totalCands)}%)`);
  console.log(`States with 0 data: ${allStates.filter(s => !dataMap.has(s)).join(', ')}`);
}

main().catch(err => { console.error(err); process.exit(1); });
