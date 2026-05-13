import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";
async function main() {
  const db = requireDb();
  const vtRows = await db.select({ jurisdiction: candidates.jurisdiction, fullName: candidates.fullName }).from(candidates).where(sql`${candidates.jurisdiction} LIKE 'state-VT-%'`);
  const byJurisdiction: Record<string, string[]> = {};
  for (const r of vtRows) {
    byJurisdiction[r.jurisdiction] ??= [];
    byJurisdiction[r.jurisdiction].push(r.fullName);
  }
  console.log('VT jurisdictions:', JSON.stringify(Object.fromEntries(Object.entries(byJurisdiction).map(([k,v]) => [k, v.length])), null, 2));
  for (const [j, names] of Object.entries(byJurisdiction)) {
    console.log(`\n${j} samples:`, names.slice(0, 5));
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
