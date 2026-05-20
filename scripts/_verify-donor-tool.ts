/**
 * scripts/_verify-donor-tool.ts
 *
 * One-shot verification script for the lookup_donor_coalition tool path.
 * Seeds a synthetic candidate + donor aggregates, queries the live
 * lookupDonorCoalition function (which the chat tool calls), prints the
 * result, then deletes the seeded rows. Idempotent.
 *
 * Usage:
 *   cd /Users/Muxin/Documents/GitHub/voter-choice-fixes
 *   npx tsx --env-file=.env.local scripts/_verify-donor-tool.ts
 */

import { sql } from "drizzle-orm";
import { requireDb } from "../db/client";
import { candidates, donorAggregates } from "../db/schema";
import { lookupDonorCoalition } from "../src/lib/server/donors";

const TEST_CANDIDATE_ID = "verify-donor-tool-2026-05-19";
const TEST_NAME = "Verify Donor Tool";
const TEST_JURISDICTION = "federal-house";
const TEST_CYCLE = "2026";
const TEST_BUCKETS = [
  { label: "Small individual donors (under $200)", amount: "240000.00" },
  { label: "Large individual donors ($200+)", amount: "138462.00" },
  { label: "Healthcare industry", amount: "83077.00" },
];

async function cleanup(db: ReturnType<typeof requireDb>) {
  await db
    .delete(donorAggregates)
    .where(sql`${donorAggregates.candidateId} = ${TEST_CANDIDATE_ID}`);
  await db
    .delete(candidates)
    .where(sql`${candidates.id} = ${TEST_CANDIDATE_ID}`);
}

async function main() {
  const db = requireDb();
  console.log("[verify] Cleaning any prior seed…");
  await cleanup(db);

  console.log("[verify] Seeding candidate + 3 donor buckets…");
  await db.insert(candidates).values({
    id: TEST_CANDIDATE_ID,
    fullName: TEST_NAME,
    sourceId: "verify-script",
    jurisdiction: TEST_JURISDICTION,
    isIncumbent: true,
  });
  for (const bucket of TEST_BUCKETS) {
    await db.insert(donorAggregates).values({
      candidateId: TEST_CANDIDATE_ID,
      electionCycle: TEST_CYCLE,
      bucketLabel: bucket.label,
      amountTotal: bucket.amount,
      source: "verify-script",
      sourceUrl: "https://example.invalid/verify",
    });
  }

  console.log("[verify] Calling lookupDonorCoalition(...)…");
  const result = await lookupDonorCoalition(
    TEST_NAME,
    "US",
    TEST_JURISDICTION,
    TEST_CYCLE,
  );

  console.log("\n=== RESULT ===");
  console.log(JSON.stringify(result, null, 2));

  console.log("\n[verify] Cleaning up seeded rows…");
  await cleanup(db);

  console.log("[verify] Done.");

  if (!result.found) {
    console.error(
      "[verify] FAIL — expected found:true but got",
      JSON.stringify(result),
    );
    process.exit(1);
  }
  const expectedTotal = TEST_BUCKETS.reduce(
    (sum, b) => sum + Number(b.amount),
    0,
  );
  if (Math.abs(result.totalRaised - expectedTotal) > 0.01) {
    console.error(
      `[verify] FAIL — expected totalRaised ${expectedTotal}, got ${result.totalRaised}`,
    );
    process.exit(1);
  }
  if (result.buckets.length !== TEST_BUCKETS.length) {
    console.error(
      `[verify] FAIL — expected ${TEST_BUCKETS.length} buckets, got ${result.buckets.length}`,
    );
    process.exit(1);
  }
  const percentSum = result.buckets.reduce((s, b) => s + b.percent, 0);
  if (Math.abs(percentSum - 100) > 2) {
    console.error(
      `[verify] FAIL — bucket percents should sum to ~100, got ${percentSum}`,
    );
    process.exit(1);
  }
  console.log("\n[verify] PASS — all assertions met.");
}

main().catch((err) => {
  console.error("[verify] ERROR", err);
  process.exit(1);
});
