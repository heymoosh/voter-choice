/**
 * Export ALREADY-TAGGED bills for the vocabulary-v2 DELTA re-tag — the
 * one-shot migration pass that pole-vocab-v2 (PR #510) makes necessary.
 *
 * WHY: promise→bill linking is a deterministic join on canonical_issue. The
 * v2 vocabulary added six ids (trade_tariffs, curriculum_culture,
 * redistricting_reform, election_security_disinformation,
 * congressional_term_limits, retirement_income_security), and promises are
 * re-filing under them — but every bill tagged BEFORE v2 was only ever
 * judged against the old 16-id vocabulary, and _export-untagged-batches.ts
 * deliberately skips bills that have any tag. Without this pass, a promise
 * under a new id can never link to a pre-v2-tagged bill.
 *
 * WHAT: exports every bill that (a) already has at least one issue_tags row
 * and (b) has no tag under any of the six new ids, WITH its existing tags as
 * context. The companion workflow (_vocab-delta-retag.workflow.js) judges
 * those bills against ONLY the six new ids; existing tags are never touched.
 *
 * ONE-SHOT BY DESIGN: a bill judged against the new ids that matches none
 * gets no row, so it would re-export on a second run — convergence is
 * human-managed (run export → workflow → inserts ONCE; the vast majority of
 * bills legitimately match none of the six). This mirrors how the promise
 * re-extract convergence is being tracked by hand.
 *
 * Usage: npx tsx --env-file=.env.local scripts/ingest/_export-vocab-delta-batches.ts
 */

import * as fs from "node:fs";
import { sql } from "drizzle-orm";
import { requireDb } from "../../db/client";
import { CANONICAL_ISSUE_LABELS } from "../../src/lib/canonicalIssues";

/**
 * The pole-vocab-v2 additions (2026-08-13 vocabulary-gap review). Kept here —
 * not in canonicalIssues.ts — because "which ids are new" only matters to
 * this one-shot migration, not to the vocabulary itself.
 */
const NEW_V2_ISSUE_IDS = [
  "trade_tariffs",
  "curriculum_culture",
  "redistricting_reform",
  "election_security_disinformation",
  "congressional_term_limits",
  "retirement_income_security",
] as const;

const BATCH_COUNT = 4;

async function main() {
  for (const id of NEW_V2_ISSUE_IDS) {
    if (!(id in CANONICAL_ISSUE_LABELS)) {
      throw new Error(`NEW_V2_ISSUE_IDS entry "${id}" is not a canonical id`);
    }
  }

  const db = requireDb();
  const result = await db.execute(
    sql`
    SELECT b.id, b.title, b.summary, b.jurisdiction,
           array_agg(it.canonical_issue || ':' || it.stance_lens
                     ORDER BY it.canonical_issue) AS existing_tags
    FROM bills b
    JOIN issue_tags it ON it.bill_id = b.id
    WHERE NOT EXISTS (
      SELECT 1 FROM issue_tags nt
      WHERE nt.bill_id = b.id
        AND nt.canonical_issue IN (${sql.join(
          NEW_V2_ISSUE_IDS.map((id) => sql`${id}`),
          sql`, `,
        )})
    )
    GROUP BY b.id, b.title, b.summary, b.jurisdiction
    ORDER BY b.id
  `,
  );

  const rows = result.rows as unknown[];
  console.log(`Tagged bills not yet judged against the v2 ids: ${rows.length}`);
  if (rows.length === 0) {
    console.log("Nothing to export — delta pass already covered every bill.");
    return;
  }

  const batchSize = Math.ceil(rows.length / BATCH_COUNT);
  for (let i = 0; i < BATCH_COUNT; i++) {
    const batch = rows.slice(i * batchSize, (i + 1) * batchSize);
    if (batch.length === 0) continue;
    const filePath = `/tmp/vocab-delta-batch-${i}.json`;
    fs.writeFileSync(filePath, JSON.stringify(batch, null, 2));
    console.log(`Batch ${i}: ${batch.length} bills -> ${filePath}`);
  }
  console.log(
    "Next: in a Claude Code session, run scripts/ingest/_vocab-delta-retag.workflow.js",
  );
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
