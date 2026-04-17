// Anthropic pricing for Claude Sonnet (per 1M tokens)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;
// Cached input tokens are billed at 10% of normal input rate.
const CACHED_INPUT_COST_PER_MILLION = 0.3;
// Cache-creation tokens are billed at 1.25x normal input rate.
const CACHE_WRITE_COST_PER_MILLION = 3.75;
// Anthropic's web_search server tool is billed per 1000 searches.
const SEARCH_COST_PER_THOUSAND = 10.0;

const MONTHLY_BUDGET_USD = 20.0;

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
}

let state: BudgetState = createFreshState();

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

export function recordUsage(
  inputOrRecord: number | UsageRecord,
  outputTokens?: number,
): void {
  ensureFreshMonth();

  const record: UsageRecord =
    typeof inputOrRecord === "number"
      ? { inputTokens: inputOrRecord, outputTokens: outputTokens ?? 0 }
      : inputOrRecord;

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

export function getBudgetPercent(): number {
  ensureFreshMonth();
  return Math.min(100, (state.estimatedSpendUSD / MONTHLY_BUDGET_USD) * 100);
}

export function getBudgetTier(): BudgetTier {
  const pct = getBudgetPercent();
  if (pct >= 100) return "exhausted";
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

export function shouldAllowNewSession(): boolean {
  const tier = getBudgetTier();
  // soft_close and above: don't admit new sessions
  return tier === "normal" || tier === "notice";
}

export function shouldTriggerHandoff(): boolean {
  return getBudgetTier() === "handoff";
}

// For testing
export function _resetForTesting(): void {
  state = createFreshState();
}

export function _setSpendForTesting(usd: number): void {
  state.estimatedSpendUSD = usd;
}
