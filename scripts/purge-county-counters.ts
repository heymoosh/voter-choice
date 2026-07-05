/**
 * scripts/purge-county-counters.ts
 *
 * One-off ops cleanup: delete the county-level Polis counters from the durable
 * store (Upstash). We no longer collect or display county-level location, so
 * this removes the previously-collected county data.
 *
 * Scope guarantee: this ONLY ever touches keys matching
 * `voter-choice:counters:county:*`. State-level (`…:counters:state:*`) and
 * dedupe (`…:dedupe:*`) keys are never touched, and every key is re-checked to
 * start with the county prefix before it is unlinked.
 *
 * Usage:
 *   npx tsx scripts/purge-county-counters.ts            # DRY RUN (lists only)
 *   npx tsx scripts/purge-county-counters.ts --yes      # actually delete
 *
 * Requires KV_REST_API_URL/TOKEN (or UPSTASH_REDIS_REST_URL/TOKEN) in the
 * environment — loaded here from .env.local via @next/env.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import {
  isDurableStoreConfigured,
  redisCommand,
} from "../src/lib/server/durable-store";

const COUNTY_PATTERN = "voter-choice:counters:county:*";
const COUNTY_PREFIX = "voter-choice:counters:county:";
const STATE_PATTERN = "voter-choice:counters:state:*";
const BATCH = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const apply = process.argv.includes("--yes");

  if (!isDurableStoreConfigured()) {
    console.error(
      "[purge] Durable store is NOT configured (no KV/UPSTASH env). Aborting.",
    );
    process.exit(1);
  }

  const countyKeys =
    (await redisCommand<string[]>(["KEYS", COUNTY_PATTERN])) ?? [];
  const stateKeysBefore =
    (await redisCommand<string[]>(["KEYS", STATE_PATTERN])) ?? [];

  console.log(`[purge] county keys matched : ${countyKeys.length}`);
  console.log(
    `[purge] state keys present  : ${stateKeysBefore.length} (must stay untouched)`,
  );
  if (countyKeys.length > 0) {
    console.log("[purge] sample county keys:");
    for (const k of countyKeys.slice(0, 10)) console.log(`         ${k}`);
  }

  // Defense-in-depth: never delete anything outside the county prefix.
  const unsafe = countyKeys.filter((k) => !k.startsWith(COUNTY_PREFIX));
  if (unsafe.length > 0) {
    console.error(
      `[purge] ABORT: ${unsafe.length} matched key(s) do not start with "${COUNTY_PREFIX}":`,
      unsafe.slice(0, 5),
    );
    process.exit(1);
  }

  if (countyKeys.length === 0) {
    console.log("[purge] Nothing to delete. Done.");
    return;
  }

  if (!apply) {
    console.log(
      `\n[purge] DRY RUN — would UNLINK ${countyKeys.length} county key(s). ` +
        "Re-run with --yes to delete.",
    );
    return;
  }

  let deleted = 0;
  for (const batch of chunk(countyKeys, BATCH)) {
    const n = (await redisCommand<number>(["UNLINK", ...batch])) ?? 0;
    deleted += n;
    console.log(
      `[purge] unlinked batch of ${batch.length} (running total: ${deleted})`,
    );
  }

  // Verify.
  const countyAfter =
    (await redisCommand<string[]>(["KEYS", COUNTY_PATTERN])) ?? [];
  const stateAfter =
    (await redisCommand<string[]>(["KEYS", STATE_PATTERN])) ?? [];
  console.log(`\n[purge] deleted            : ${deleted}`);
  console.log(
    `[purge] county keys remaining: ${countyAfter.length} (expect 0)`,
  );
  console.log(
    `[purge] state keys remaining : ${stateAfter.length} (expect ${stateKeysBefore.length}, unchanged)`,
  );

  if (
    countyAfter.length !== 0 ||
    stateAfter.length !== stateKeysBefore.length
  ) {
    console.error(
      "[purge] VERIFICATION FAILED — investigate before trusting the result.",
    );
    process.exit(1);
  }
  console.log("[purge] PASS — county counters removed; state counters intact.");
}

main().catch((err) => {
  console.error("[purge] ERROR:", err);
  process.exit(1);
});
