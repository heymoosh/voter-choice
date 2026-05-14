import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = requireDb();
  const house = await db.select({ fullName: candidates.fullName, juris: candidates.jurisdiction }).from(candidates).where(sql`jurisdiction LIKE 'state-GA-house-%'`).limit(10);
  const senate = await db.select({ fullName: candidates.fullName, juris: candidates.jurisdiction }).from(candidates).where(sql`jurisdiction LIKE 'state-GA-senate-%'`).limit(10);
  console.log('HOUSE:', house.map(r => r.fullName).join(', '));
  console.log('SENATE:', senate.map(r => r.fullName).join(', '));
  const total = await db.select({ count: sql<number>`count(*)` }).from(candidates).where(sql`jurisdiction LIKE 'state-GA-%'`);
  console.log('TOTAL GA:', total[0].count);
}
main().catch(console.error);
