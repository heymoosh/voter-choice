import { isDurableStoreConfigured, redisCommand } from "./durable-store";

// Anthropic pricing for Claude Sonnet (per 1M tokens)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;
// Cached input tokens are billed at 10% of normal input rate.
const CACHED_INPUT_COST_PER_MILLION = 0.3;
// Cache-creation tokens are billed at 1.25x normal input rate.
const CACHE_WRITE_COST_PER_MILLION = 3.75;
// Anthropic's web_search server tool is billed per 1000 searches.
const SEARCH_COST_PER_THOUSAND = 10.0;

const MONTHLY_BUDGET_USD = 50.0;

export type BudgetTier =
  | "normal"
  | "notice"
  | "soft_close"
  | "handoff"
  | "exhausted";

interface BudgetState {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalCacheWriteTokens: number;
  totalSearchCount: number;
  estimatedSpendUSD: number;
  resetAt: number; // timestamp for monthly reset
  // Tracks whether the reserved handoff completion has been served this month.
  // When true, the next request at/past exhaustion threshold returns 503.
  // When false, one more completion is allowed (at handoff tier) to let the
  // voter receive the full handoff block before we lock them out.
  handoffServed: boolean;
}

let state: BudgetState = createFreshState();

// Redis hash field name for the handoff flag.
const HANDOFF_SERVED_FIELD = "handoffServed";

function budgetKey(date = new Date()): string {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `voter-choice:budget:${month}`;
}

function monthlyResetSeconds(): number {
  const resetAt = createFreshState().resetAt;
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

function createFreshState(): BudgetState {
  const now = new Date();
  // Reset on the 1st of next month at midnight UTC
  const resetDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCachedInputTokens: 0,
    totalCacheWriteTokens: 0,
    totalSearchCount: 0,
    estimatedSpendUSD: 0,
    resetAt: resetDate.getTime(),
    handoffServed: false,
  };
}

function ensureFreshMonth(): void {
  if (Date.now() >= state.resetAt) {
    state = createFreshState();
  }
}

export interface UsageRecord {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  searchCount?: number;
}

function normalizeUsageRecord(
  inputOrRecord: number | UsageRecord,
  outputTokens?: number,
): UsageRecord {
  return typeof inputOrRecord === "number"
    ? { inputTokens: inputOrRecord, outputTokens: outputTokens ?? 0 }
    : inputOrRecord;
}

function estimateUsageCost(record: UsageRecord): number {
  return (
    (record.inputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (record.outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION +
    ((record.cachedInputTokens ?? 0) / 1_000_000) *
      CACHED_INPUT_COST_PER_MILLION +
    ((record.cacheWriteTokens ?? 0) / 1_000_000) *
      CACHE_WRITE_COST_PER_MILLION +
    ((record.searchCount ?? 0) / 1000) * SEARCH_COST_PER_THOUSAND
  );
}

export function recordUsage(
  inputOrRecord: number | UsageRecord,
  outputTokens?: number,
): void {
  ensureFreshMonth();

  const record = normalizeUsageRecord(inputOrRecord, outputTokens);

  state.totalInputTokens += record.inputTokens;
  state.totalOutputTokens += record.outputTokens;
  state.totalCachedInputTokens += record.cachedInputTokens ?? 0;
  state.totalCacheWriteTokens += record.cacheWriteTokens ?? 0;
  state.totalSearchCount += record.searchCount ?? 0;

  state.estimatedSpendUSD =
    (state.totalInputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (state.totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION +
    (state.totalCachedInputTokens / 1_000_000) * CACHED_INPUT_COST_PER_MILLION +
    (state.totalCacheWriteTokens / 1_000_000) * CACHE_WRITE_COST_PER_MILLION +
    (state.totalSearchCount / 1000) * SEARCH_COST_PER_THOUSAND;
}

export async function recordUsageAsync(
  inputOrRecord: number | UsageRecord,
  outputTokens?: number,
): Promise<void> {
  if (!isDurableStoreConfigured()) {
    recordUsage(inputOrRecord, outputTokens);
    return;
  }

  const record = normalizeUsageRecord(inputOrRecord, outputTokens);
  const cost = estimateUsageCost(record);

  try {
    const key = budgetKey();
    await Promise.all([
      redisCommand(["HINCRBYFLOAT", key, "estimatedSpendUSD", cost]),
      redisCommand(["HINCRBY", key, "totalInputTokens", record.inputTokens]),
      redisCommand(["HINCRBY", key, "totalOutputTokens", record.outputTokens]),
      redisCommand([
        "HINCRBY",
        key,
        "totalCachedInputTokens",
        record.cachedInputTokens ?? 0,
      ]),
      redisCommand([
        "HINCRBY",
        key,
        "totalCacheWriteTokens",
        record.cacheWriteTokens ?? 0,
      ]),
      redisCommand([
        "HINCRBY",
        key,
        "totalSearchCount",
        record.searchCount ?? 0,
      ]),
      redisCommand(["EXPIRE", key, monthlyResetSeconds()]),
    ]);
  } catch (err) {
    console.error("Durable budget usage record failed:", err);
  }
}

export function getBudgetPercent(): number {
  ensureFreshMonth();
  return Math.min(100, (state.estimatedSpendUSD / MONTHLY_BUDGET_USD) * 100);
}

export function getBudgetTier(): BudgetTier {
  const pct = getBudgetPercent();
  if (pct >= 100) {
    // Only report exhausted once the handoff has been served. If not yet served,
    // keep reporting handoff so one more completion can deliver the handoff block.
    return state.handoffServed ? "exhausted" : "handoff";
  }
  if (pct >= 90) return "handoff";
  if (pct >= 80) return "soft_close";
  if (pct >= 70) return "notice";
  return "normal";
}

export function getBudgetStatus(): {
  tier: BudgetTier;
  percent: number;
  estimatedSpendUSD: number;
} {
  ensureFreshMonth();
  return {
    tier: getBudgetTier(),
    percent: Math.round(getBudgetPercent()),
    estimatedSpendUSD: Math.round(state.estimatedSpendUSD * 100) / 100,
  };
}

function budgetStatusFromSpend(
  estimatedSpendUSD: number,
  handoffServed = false,
): {
  tier: BudgetTier;
  percent: number;
  estimatedSpendUSD: number;
} {
  const percent = Math.min(100, (estimatedSpendUSD / MONTHLY_BUDGET_USD) * 100);
  let tier: BudgetTier = "normal";
  if (percent >= 100) {
    // Only report exhausted once the handoff has been served.
    tier = handoffServed ? "exhausted" : "handoff";
  } else if (percent >= 90) tier = "handoff";
  else if (percent >= 80) tier = "soft_close";
  else if (percent >= 70) tier = "notice";
  return {
    tier,
    percent: Math.round(percent),
    estimatedSpendUSD: Math.round(estimatedSpendUSD * 100) / 100,
  };
}

export async function getBudgetStatusAsync(): Promise<{
  tier: BudgetTier;
  percent: number;
  estimatedSpendUSD: number;
}> {
  if (!isDurableStoreConfigured()) return getBudgetStatus();

  try {
    const key = budgetKey();
    const [spend, handoffFlag] = await Promise.all([
      redisCommand<string>(["HGET", key, "estimatedSpendUSD"]),
      redisCommand<string>(["HGET", key, HANDOFF_SERVED_FIELD]),
    ]);
    // Defensive: if the flag read returns null/undefined (field missing or
    // Redis transient error), treat as false so the voter gets their handoff.
    const handoffServed = handoffFlag === "1";
    return budgetStatusFromSpend(Number(spend ?? 0), handoffServed);
  } catch (err) {
    console.error("Durable budget status failed:", err);
    // On error, fall back to a safe state: assume handoff NOT yet served so
    // the voter can still receive the handoff completion.
    return budgetStatusFromSpend(MONTHLY_BUDGET_USD, false);
  }
}

export function shouldAllowNewSession(): boolean {
  const tier = getBudgetTier();
  // soft_close and above: don't admit new sessions
  return tier === "normal" || tier === "notice";
}

export async function shouldAllowNewSessionAsync(): Promise<boolean> {
  const tier = (await getBudgetStatusAsync()).tier;
  return tier === "normal" || tier === "notice";
}

export function shouldTriggerHandoff(): boolean {
  return getBudgetTier() === "handoff";
}

export async function shouldTriggerHandoffAsync(): Promise<boolean> {
  return (await getBudgetStatusAsync()).tier === "handoff";
}

/**
 * Mark that the reserved handoff completion has been served.
 * After this, `getBudgetTier()` / `getBudgetStatusAsync()` will report
 * `exhausted` instead of `handoff` when spend is at or past the cap.
 *
 * Persists to the durable store when configured so the flag survives a process
 * restart. Fails safe on error: in-memory flag is always flipped even if the
 * durable write fails, which is correct because the current process already
 * served the handoff.
 */
export async function markHandoffServed(): Promise<void> {
  ensureFreshMonth();
  state.handoffServed = true;

  if (!isDurableStoreConfigured()) return;

  try {
    const key = budgetKey();
    await Promise.all([
      redisCommand(["HSET", key, HANDOFF_SERVED_FIELD, "1"]),
      redisCommand(["EXPIRE", key, monthlyResetSeconds()]),
    ]);
  } catch (err) {
    console.error("Durable handoff-served flag write failed:", err);
    // Non-fatal: in-memory flag already set, so the current process is correct.
  }
}

/**
 * Check whether the reserved handoff completion has been served this month.
 *
 * In-memory only — the async path is via `getBudgetStatusAsync()`.
 * Defaults to false on any error so the voter always gets a chance at handoff.
 */
export function wasHandoffServed(): boolean {
  ensureFreshMonth();
  return state.handoffServed;
}

// For testing
export function _resetForTesting(): void {
  state = createFreshState();
}

export function _setSpendForTesting(usd: number): void {
  state.estimatedSpendUSD = usd;
}

export function _setHandoffServedForTesting(value: boolean): void {
  state.handoffServed = value;
}
