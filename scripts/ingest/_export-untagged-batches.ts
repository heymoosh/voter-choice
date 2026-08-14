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

  // Untagged = NO issue_tags row under ANY tagger version. The old filter
  // (`AND it.tagger_version = <haiku version>`) re-exported bills forever
  // once they were tagged under the agent-run version string — the export's
  // job is gap-filling, not version-scoped re-tagging.
  //
  // CONVERGENCE CAVEAT (2026-08-14): a bill the tagger judged and correctly
  // left untagged (procedural / no directional signal — the majority) has no
  // issue_tags row, so it re-exports on every run. The pool therefore
  // converges to a PLATEAU of legitimately-no-signal bills, not to zero —
  // when the true total (printed below) stops dropping between rounds, the
  // remainder is that plateau and tagging is done. An exact "judged under
  // version X, no tag" marker would need schema support; not built until the
  // plateau proves annoying in practice.
  const totalResult = await db.execute(
    sql`
    SELECT COUNT(*)::int AS n
    FROM bills b
    WHERE NOT EXISTS (
      SELECT 1 FROM issue_tags it
      WHERE it.bill_id = b.id
    )
  `,
  );
  const trueTotal = (totalResult.rows[0] as { n: number }).n;

  const result = await db.execute(
    sql`
    SELECT b.id, b.title, b.summary, b.jurisdiction
    FROM bills b
    WHERE NOT EXISTS (
      SELECT 1 FROM issue_tags it
      WHERE it.bill_id = b.id
    )
    ORDER BY b.id
    LIMIT 500
  `,
  );

  const billsData = result.rows as unknown[];
  console.log(
    `Total untagged bills: ${trueTotal}` +
      (trueTotal > billsData.length
        ? ` (exporting the first ${billsData.length}; re-run after inserting to page through)`
        : ""),
  );

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
