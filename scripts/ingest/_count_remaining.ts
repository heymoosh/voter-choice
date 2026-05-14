import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = requireDb();
  const states = ['IL', 'KS', 'DE', 'NM', 'SD', 'WY', 'ND', 'NJ'];
  for (const st of states) {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(candidates).where(sql`jurisdiction LIKE ${'state-' + st + '-%'}`);
    console.log(`${st}: ${rows[0].count} candidates`);
  }
}
main().catch(console.error);
