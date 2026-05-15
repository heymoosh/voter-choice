import { sql } from "drizzle-orm";
import { requireDb } from "./db/client";

async function main() {
  const db = requireDb();
  
  // Sample bills from our tagged batches
  const sampleIds = [
    "openstates-ocd-bill-5933b6a7-9f92-40e8-b188-695b3b489402", // Batch 36
    "openstates-ocd-bill-59367b9f-6766-44c9-9030-56bf10b2cc65", // Batch 36
    "openstates-ocd-bill-5939b29e-2f1c-4a29-b9c8-0bd72b56d5e4", // Batch 36
  ];
  
  console.log("Sample verified inserts from batch 36:");
  for (const billId of sampleIds) {
    const tag = await db.execute(
      sql`SELECT bill_id, canonical_issue, stance_lens, tagger_confidence FROM issue_tags WHERE bill_id = ${billId}`
    );
    
    if (tag.rows.length > 0) {
      console.log(`✓ ${billId}:`);
      console.log(`  Issue: ${tag.rows[0].canonical_issue}, Stance: ${tag.rows[0].stance_lens}, Confidence: ${tag.rows[0].tagger_confidence}`);
    }
  }
}

main().catch(console.error);
