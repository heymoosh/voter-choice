import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";
async function main() {
  const db = requireDb();
  const house = await db.select({ fullName: candidates.fullName }).from(candidates).where(sql`${candidates.jurisdiction} = 'state-UT-house'`);
  const senate = await db.select({ fullName: candidates.fullName }).from(candidates).where(sql`${candidates.jurisdiction} = 'state-UT-senate'`);
  console.log(`UT house=${house.length} senate=${senate.length}`);
  console.log('Sample house:', house.slice(0,5).map(c => c.fullName));
  console.log('Sample senate:', senate.slice(0,3).map(c => c.fullName));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
