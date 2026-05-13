import { requireDb } from "../../db/client";
import { sql } from "drizzle-orm";
async function main() {
  const db = requireDb();
  // Get all states that have candidates
  const candRows = await db.execute(sql`
    SELECT jurisdiction, COUNT(*) as n
    FROM candidates
    WHERE jurisdiction LIKE 'state-%'
    GROUP BY jurisdiction
    ORDER BY jurisdiction
  `);
  // Get states that have donor data
  const donorRows = await db.execute(sql`
    SELECT DISTINCT c.jurisdiction
    FROM candidates c
    JOIN donor_aggregates da ON da.candidate_id = c.id
    WHERE c.jurisdiction LIKE 'state-%'
  `);
  const donorJurisdictions = new Set(donorRows.rows.map(r => String(r.jurisdiction)));
  
  console.log('All jurisdictions with candidates:');
  const stateMap: Record<string, number> = {};
  for (const r of candRows.rows) {
    const j = String(r.jurisdiction);
    stateMap[j] = Number(r.n);
  }
  
  // Extract unique states
  const states = new Set<string>();
  for (const j of Object.keys(stateMap)) {
    const m = j.match(/state-([A-Z]+)-/);
    if (m) states.add(m[1]);
  }
  
  // Check which states have full data (both jurisdictions covered)
  const donorStates = new Set<string>();
  for (const j of donorJurisdictions) {
    const m = j.match(/state-([A-Z]+)-/);
    if (m) donorStates.add(m[1]);
  }
  
  console.log('\nStates WITH donor data:', [...donorStates].sort().join(', '));
  console.log('\nStates WITHOUT donor data:');
  const missing = [...states].filter(s => !donorStates.has(s)).sort();
  for (const s of missing) {
    const houseJ = `state-${s}-house`;
    const senateJ = `state-${s}-senate`;
    const h = stateMap[houseJ] ?? 0;
    const sen = stateMap[senateJ] ?? 0;
    console.log(`  ${s}: house=${h} senate=${sen}`);
  }
  console.log(`\nTotal missing: ${missing.length} states`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
