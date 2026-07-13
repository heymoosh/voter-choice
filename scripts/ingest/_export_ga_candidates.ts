import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";
import * as fs from "node:fs";

async function main() {
  const db = requireDb();
  const rows = await db.select({ 
    fullName: candidates.fullName,
    jurisdiction: candidates.jurisdiction
  }).from(candidates).where(sql`jurisdiction LIKE 'state-GA-%'`);
  
  const out = rows.map(r => ({ name: r.fullName, chamber: r.jurisdiction.includes('senate') ? 'senate' : 'house' }));
  fs.writeFileSync('/tmp/ga_candidates.json', JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} GA candidates`);
}
main().catch(console.error);
