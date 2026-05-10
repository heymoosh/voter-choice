/**
 * scripts/ingest/federal-votes.ts
 *
 * Phase A skeleton — no real ingest yet.
 * Phases B–C will populate this with GovTrack bulk + Congress.gov incremental logic.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> npx tsx scripts/ingest/federal-votes.ts
 */

import { getDb, DB_NOT_CONFIGURED } from "../../db/client";

async function main() {
  console.log("[federal-votes] Phase A skeleton — no-op.");

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    console.warn(
      "[federal-votes] DATABASE_URL is not set. Skipping DB connection check.",
    );
    process.exit(0);
  }

  console.log("[federal-votes] DB client ready. Phase A complete — exiting.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[federal-votes] Unexpected error:", err);
  process.exit(1);
});
