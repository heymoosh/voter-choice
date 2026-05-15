import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";

async function main() {
  const db = requireDb();
  const result = await db.execute(
    sql`SELECT COUNT(*) as count FROM issue_tags`,
  );
  console.log("Total issue_tags:", result.rows[0].count);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
