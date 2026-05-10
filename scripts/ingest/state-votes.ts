/**
 * scripts/ingest/state-votes.ts
 *
 * Phase A skeleton — no real ingest yet.
 * Phase C will populate this with OpenStates multi-state matrix logic.
 *
 * Usage:
 *   STATE=TX DATABASE_URL=<neon-connection-string> npx tsx scripts/ingest/state-votes.ts
 */

import { getDb, DB_NOT_CONFIGURED } from "../../db/client";

async function main() {
  const state = process.env.STATE ?? "UNKNOWN";
  console.log(`[state-votes:${state}] Phase A skeleton — no-op.`);

  const db = getDb();
  if (db === DB_NOT_CONFIGURED) {
    console.warn(
      `[state-votes:${state}] DATABASE_URL is not set. Skipping DB connection check.`,
    );
    process.exit(0);
  }

  console.log(
    `[state-votes:${state}] DB client ready. Phase A complete — exiting.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[state-votes] Unexpected error:", err);
  process.exit(1);
});
