/**
 * scripts/ingest/_smoke.ts
 *
 * Smoke test: connects to Neon, inserts a single test row into `bills`,
 * queries it back, deletes it, and exits with a success or failure code.
 *
 * Run manually against your Neon URL — NOT in automated CI for Phase A.
 *
 * Usage:
 *   DATABASE_URL=<neon-connection-string> npx tsx scripts/ingest/_smoke.ts
 *
 * Expected output on success:
 *   [smoke] Inserted test bill: smoke-test-<timestamp>
 *   [smoke] Queried back: smoke-test-<timestamp> — "Smoke test bill"
 *   [smoke] Deleted test bill.
 *   [smoke] PASS
 */

import { requireDb, DatabaseNotConfiguredError } from "../../db/client";
import { bills } from "../../db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("[smoke] Starting DB smoke test...");

  let db;
  try {
    db = requireDb();
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      console.error("[smoke] FAIL — DATABASE_URL is not set.");
      console.error(
        "  Set it via: DATABASE_URL=<neon-url> npx tsx scripts/ingest/_smoke.ts",
      );
      process.exit(1);
    }
    throw err;
  }

  const smokeId = `smoke-test-${Date.now()}`;

  try {
    // Insert
    await db.insert(bills).values({
      id: smokeId,
      title: "Smoke test bill",
      summary: "Inserted by _smoke.ts — safe to delete.",
      source: "smoke",
      sourceUrl: "https://example.com/smoke",
      jurisdiction: "smoke",
      introducedDate: new Date().toISOString().split("T")[0],
    });
    console.log(`[smoke] Inserted test bill: ${smokeId}`);

    // Query
    const rows = await db
      .select()
      .from(bills)
      .where(eq(bills.id, smokeId));

    if (rows.length !== 1) {
      throw new Error(`Expected 1 row, got ${rows.length}`);
    }
    console.log(
      `[smoke] Queried back: ${rows[0].id} — "${rows[0].title}"`,
    );

    // Delete
    await db.delete(bills).where(eq(bills.id, smokeId));
    console.log("[smoke] Deleted test bill.");

    console.log("[smoke] PASS");
    process.exit(0);
  } catch (err) {
    console.error("[smoke] FAIL:", err);
    // Best-effort cleanup
    try {
      await db.delete(bills).where(eq(bills.id, smokeId));
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

main();
