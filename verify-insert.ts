import { sql } from "drizzle-orm";
import { requireDb } from "./db/client";

async function main() {
  const db = requireDb();
  
  // Get count of issue tags
  const result = await db.execute(
    sql`SELECT COUNT(*) as total FROM issue_tags`
  );
  
  const issueDistribution = await db.execute(
    sql`SELECT canonical_issue, COUNT(*) as count FROM issue_tags GROUP BY canonical_issue ORDER BY count DESC LIMIT 15`
  );
  
  const stanceDistribution = await db.execute(
    sql`SELECT stance_lens, COUNT(*) as count FROM issue_tags GROUP BY stance_lens`
  );
  
  console.log("Total issue tags in database:", result.rows[0]);
  console.log("\nCanonical issues distribution:");
  issueDistribution.rows.forEach((r: any) => {
    console.log(`  ${r.canonical_issue}: ${r.count}`);
  });
  console.log("\nStance distribution:");
  stanceDistribution.rows.forEach((r: any) => {
    console.log(`  ${r.stance_lens}: ${r.count}`);
  });
}

main().catch(console.error);
