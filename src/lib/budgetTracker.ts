/**
 * Server-side in-memory monthly budget tracker for Anthropic API spend.
 * Tracks estimated cumulative monthly spend using token counts.
 * Resets at the start of each calendar month.
 *
 * Note: This is an estimate for progressive UX warnings, not billing.
 * The hard cap is enforced by Anthropic Console workspace limits.
 *
 * Pricing: claude-sonnet-4-6
 *   Input:  $3.00 / 1M tokens
 *   Output: $15.00 / 1M tokens
 */

const MONTHLY_BUDGET_USD = 20.0;
const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

interface BudgetState {
  month: string; // "YYYY-MM"
  estimatedSpend: number; // USD
}

// Module-level singleton — lives for the process lifetime
let state: BudgetState = {
  month: getCurrentMonth(),
  estimatedSpend: 0,
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function ensureFreshMonth(): void {
  const current = getCurrentMonth();
  if (state.month !== current) {
    state = { month: current, estimatedSpend: 0 };
  }
}

/**
 * Record a completed API call's token usage.
 */
export function recordUsage(inputTokens: number, outputTokens: number): void {
  ensureFreshMonth();
  const cost =
    inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;
  state.estimatedSpend += cost;
}

/**
 * Get the current budget state.
 */
export function getBudgetState(): {
  estimatedSpend: number;
  budget: number;
  percentage: number;
  threshold: "normal" | "warning" | "critical" | "exhausted";
} {
  ensureFreshMonth();
  const percentage = (state.estimatedSpend / MONTHLY_BUDGET_USD) * 100;

  let threshold: "normal" | "warning" | "critical" | "exhausted";
  if (percentage >= 100) {
    threshold = "exhausted";
  } else if (percentage >= 90) {
    threshold = "critical";
  } else if (percentage >= 70) {
    threshold = "warning";
  } else {
    threshold = "normal";
  }

  return {
    estimatedSpend: state.estimatedSpend,
    budget: MONTHLY_BUDGET_USD,
    percentage,
    threshold,
  };
}

/**
 * Check if chat is available (budget not exhausted).
 */
export function isChatAvailable(): boolean {
  return getBudgetState().threshold !== "exhausted";
}
