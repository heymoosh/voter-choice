import type { BudgetStatus } from "./types";

/**
 * In-memory monthly budget tracker.
 * Tracks estimated API spend based on token counts.
 * Resets when the month changes.
 *
 * Budget cap: $20/month
 * Pricing estimate: claude-sonnet-4-6 ~$3/M input tokens, ~$15/M output tokens
 */

const MONTHLY_BUDGET_USD = 20;
const INPUT_TOKEN_COST = 3 / 1_000_000; // $3 per 1M input tokens
const OUTPUT_TOKEN_COST = 15 / 1_000_000; // $15 per 1M output tokens

let currentMonth: string = getCurrentMonth();
let cumulativeSpendUsd = 0;

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function resetIfNewMonth(): void {
  const month = getCurrentMonth();
  if (month !== currentMonth) {
    currentMonth = month;
    cumulativeSpendUsd = 0;
  }
}

/**
 * Record token usage from an API response and return the updated budget status.
 */
export function recordUsage(
  inputTokens: number,
  outputTokens: number,
): BudgetStatus {
  resetIfNewMonth();
  const cost =
    inputTokens * INPUT_TOKEN_COST + outputTokens * OUTPUT_TOKEN_COST;
  cumulativeSpendUsd += cost;
  return getBudgetStatus();
}

/**
 * Get current budget status without recording usage.
 */
export function getBudgetStatus(): BudgetStatus {
  resetIfNewMonth();
  const pct = cumulativeSpendUsd / MONTHLY_BUDGET_USD;
  if (pct >= 1.0) return "exhausted";
  if (pct >= 0.9) return "critical";
  if (pct >= 0.7) return "warning";
  return "ok";
}

/**
 * Get the current spend percentage (0-1).
 */
export function getBudgetPercent(): number {
  resetIfNewMonth();
  return Math.min(cumulativeSpendUsd / MONTHLY_BUDGET_USD, 1);
}

// Export for testing only
export function _resetForTesting(): void {
  currentMonth = getCurrentMonth();
  cumulativeSpendUsd = 0;
}
