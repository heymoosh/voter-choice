/**
 * scripts/ops/budget-reconcile.ts
 *
 * Durable budget-spend RECONCILIATION report.
 *
 * Why this exists
 * ---------------
 * The chat budget cap is enforced against a durable spend counter in the
 * KV/Redis store (`voter-choice:budget:YYYY-MM`). Each request bumps that
 * counter with HINCRBYFLOAT/HINCRBY (src/lib/server/budget.ts). If one of those
 * writes fails, the failure is now logged as a structured `budget_write_failed`
 * signal with a running count — but the dropped spend is gone: the durable
 * counter under-counts what Anthropic actually billed, so the cap leaks with no
 * visibility. Those failure counters live in-process (serverless: per-instance,
 * not persisted), so this script can't read them directly. What it CAN do is
 * surface the durable snapshot and an internal drift check so a human can
 * compare it against the real Anthropic console usage.
 *
 * What it reports
 * ---------------
 *   1. The durable snapshot for the month: stored `estimatedSpendUSD`, token
 *      totals, percent of cap, and tier.
 *   2. An INTERNAL drift indicator: spend re-derived from the stored token
 *      totals (same pricing as live tracking) vs. the stored `estimatedSpendUSD`.
 *      A gap beyond rounding means SOME spend writes were dropped while others
 *      landed (a partial durable write) — direct evidence of the leak.
 *   3. A reminder to compare (1) against the Anthropic console's month-to-date
 *      usage for the same window — the only external source of truth for real
 *      billed spend.
 *
 * Usage: npx tsx scripts/ops/budget-reconcile.ts [--month YYYY-MM]
 *   Reads the same KV/Redis env as the app (KV_REST_API_URL / KV_REST_API_TOKEN
 *   or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). With --month, inspect
 *   a specific month key; default is the current UTC month.
 * Exit code 0 = report printed. 1 = store not configured / read error.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), true); // dev=true -> loads .env.local

import {
  isDurableStoreConfigured,
  redisCommand,
} from "../../src/lib/server/durable-store";
import {
  MONTHLY_BUDGET_USD,
  budgetKey,
  estimateSpendFromTotals,
  type UsageTotals,
} from "../../src/lib/server/budget";

/** Parse the durable hash (HGETALL flat array) into token totals + stored spend. */
function parseSnapshot(hash: Record<string, string>): {
  totals: UsageTotals;
  storedSpendUSD: number;
  handoffServed: boolean;
} {
  const num = (k: string) => Number(hash[k] ?? 0) || 0;
  return {
    totals: {
      totalInputTokens: num("totalInputTokens"),
      totalOutputTokens: num("totalOutputTokens"),
      totalCachedInputTokens: num("totalCachedInputTokens"),
      totalCacheWriteTokens: num("totalCacheWriteTokens"),
      totalSearchCount: num("totalSearchCount"),
    },
    storedSpendUSD: num("estimatedSpendUSD"),
    handoffServed: hash["handoffServed"] === "1",
  };
}

/** HGETALL returns a flat [field, value, field, value, ...] array. */
function flatToRecord(flat: string[] | null): Record<string, string> {
  const rec: Record<string, string> = {};
  if (!flat) return rec;
  for (let i = 0; i + 1 < flat.length; i += 2) rec[flat[i]] = flat[i + 1];
  return rec;
}

function monthKey(argv: string[]): string {
  const i = argv.indexOf("--month");
  if (i !== -1 && argv[i + 1]) {
    const [y, m] = argv[i + 1].split("-").map(Number);
    if (y && m) return budgetKey(new Date(Date.UTC(y, m - 1, 1)));
  }
  return budgetKey();
}

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  if (!isDurableStoreConfigured()) {
    console.error(
      "✗ durable store not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing) — nothing to reconcile.",
    );
    return 1;
  }

  const key = monthKey(argv);
  console.log(`Budget reconciliation for durable key: ${key}\n`);

  let hash: Record<string, string>;
  try {
    hash = flatToRecord(await redisCommand<string[]>(["HGETALL", key]));
  } catch (err) {
    console.error("✗ failed to read durable budget snapshot:", err);
    return 1;
  }

  if (Object.keys(hash).length === 0) {
    console.log(
      "· no durable budget data for this month yet (no spend recorded, or wrong month).",
    );
    return 0;
  }

  const { totals, storedSpendUSD, handoffServed } = parseSnapshot(hash);
  const derivedSpendUSD = estimateSpendFromTotals(totals);
  const percent = Math.min(100, (storedSpendUSD / MONTHLY_BUDGET_USD) * 100);

  console.log("Durable snapshot:");
  console.table({
    "stored estimatedSpendUSD": `$${storedSpendUSD.toFixed(4)}`,
    "percent of cap": `${percent.toFixed(1)}%  (cap $${MONTHLY_BUDGET_USD})`,
    handoffServed,
    totalInputTokens: totals.totalInputTokens,
    totalOutputTokens: totals.totalOutputTokens,
    totalCachedInputTokens: totals.totalCachedInputTokens,
    totalCacheWriteTokens: totals.totalCacheWriteTokens,
    totalSearchCount: totals.totalSearchCount,
  });

  // Internal drift indicator: spend re-derived from stored token counts vs. the
  // stored spend field. Equal (to rounding) = writes stayed consistent. A gap =
  // some spend writes were dropped while token writes landed (or vice versa).
  const drift = derivedSpendUSD - storedSpendUSD;
  const driftAbs = Math.abs(drift);
  // 1 cent tolerance for float accumulation across many HINCRBYFLOAT ops.
  const TOLERANCE_USD = 0.01;
  console.log("\nInternal consistency check (token-derived vs stored spend):");
  console.log(`  token-derived spend: $${derivedSpendUSD.toFixed(4)}`);
  console.log(`  stored spend:        $${storedSpendUSD.toFixed(4)}`);
  if (driftAbs <= TOLERANCE_USD) {
    console.log(
      `  ✓ consistent (drift $${drift.toFixed(4)} within $${TOLERANCE_USD} tolerance)`,
    );
  } else {
    console.log(
      `  ✗ DRIFT $${drift.toFixed(4)} — stored spend and token counts disagree;` +
        " some durable writes were likely dropped. Check logs for" +
        ' event:"budget_write_failed".',
    );
  }

  console.log(
    "\nNext: compare the stored spend above against the Anthropic console" +
      " month-to-date usage for this window (the external source of truth for" +
      " real billed spend). A durable value materially BELOW the console" +
      " indicates dropped spend writes leaking the cap.",
  );

  return 0;
}

// Run only as CLI, not when imported by a test.
import { fileURLToPath } from "node:url";
import path from "node:path";
function isInvokedDirectly(): boolean {
  try {
    const entry = process.argv?.[1];
    if (!entry) return false;
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) {
  main().then((code) => process.exit(code));
}
