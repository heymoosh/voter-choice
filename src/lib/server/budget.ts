// Anthropic pricing for Claude Sonnet (per 1M tokens)
const INPUT_COST_PER_MILLION = 3.0;
const OUTPUT_COST_PER_MILLION = 15.0;

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
    estimatedSpendUSD: 0,
    resetAt: resetDate.getTime(),
  };
}

function ensureFreshMonth(): void {
  if (Date.now() >= state.resetAt) {
    state = createFreshState();
  }
}

export function recordUsage(inputTokens: number, outputTokens: number): void {
  ensureFreshMonth();
  state.totalInputTokens += inputTokens;
  state.totalOutputTokens += outputTokens;
  state.estimatedSpendUSD =
    (state.totalInputTokens / 1_000_000) * INPUT_COST_PER_MILLION +
    (state.totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
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
