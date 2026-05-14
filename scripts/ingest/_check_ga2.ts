import { requireDb } from "../../db/client";
import { candidates } from "../../db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const db = requireDb();
  const rows = await db.select({ fullName: candidates.fullName, juris: candidates.jurisdiction }).from(candidates).where(sql`jurisdiction LIKE 'state-GA-%'`).limit(5);
  console.log(JSON.stringify(rows));
}
main().catch(console.error);
