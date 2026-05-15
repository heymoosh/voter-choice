/**
 * Export untagged bills to 4 batch files for manual processing.
 * Usage: DATABASE_URL=<neon> npx tsx scripts/ingest/_export-untagged-batches.ts
 */

import { requireDb } from "../../db/client";
import { sql } from "drizzle-orm";
import * as fs from "node:fs";

interface BillRow {
  id: string;
  title: string;
  summary: string | null;
  jurisdiction: string;
}

async function main() {
  const db = requireDb();

  const TAGGER_VERSION = "claude-haiku-4-5-20251001-v1";

  // Fetch untagged bills
  const result = await db.execute(
    sql`
    SELECT b.id, b.title, b.summary, b.jurisdiction
    FROM bills b
    WHERE NOT EXISTS (
      SELECT 1 FROM issue_tags it
      WHERE it.bill_id = b.id
        AND it.tagger_version = ${TAGGER_VERSION}
    )
    ORDER BY b.id
    LIMIT 500
  `
  );

  const billsData = result.rows as unknown[];
  console.log("Total untagged bills:", billsData.length);

  if (billsData.length === 0) {
    console.log("No untagged bills found");
    return;
  }

  // Split into 4 batches
  const batchSize = Math.ceil(billsData.length / 4);
  for (let i = 0; i < 4; i++) {
    const start = i * batchSize;
    const end = Math.min((i + 1) * batchSize, billsData.length);
    const batch = billsData.slice(start, end);
    const filePath = `/tmp/untagged-batch-${40 + i}.json`;
    fs.writeFileSync(filePath, JSON.stringify(batch, null, 2));
    console.log(`Batch ${40 + i}: ${batch.length} bills -> ${filePath}`);
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
