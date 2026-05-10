/**
 * scripts/ingest/tag-bills.ts
 *
 * Phase A skeleton — no real tagging yet.
 * Phase D will populate this with LLM-based issue-tagging logic via Claude.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> npx tsx scripts/ingest/tag-bills.ts
 */

import { getDb, DB_NOT_CONFIGURED } from "../../db/client";

async function main() {
  console.log("[tag-bills] Phase A skeleton — no-op.");

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    console.warn(
      "[tag-bills] DATABASE_URL is not set. Skipping DB connection check.",
    );
    process.exit(0);
  }

  console.log("[tag-bills] DB client ready. Phase A complete — exiting.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[tag-bills] Unexpected error:", err);
  process.exit(1);
});
