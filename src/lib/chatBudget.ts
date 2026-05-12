/**
 * Module-level monthly spend tracker for Anthropic API usage.
 * Tracks estimated token costs and enforces $20/month budget.
 * Resets on the first request of each new calendar month.
 */

import type { BudgetStatus } from "@/types/chat";

// Anthropic claude-sonnet-4-6 pricing (USD per 1M tokens, approximate)
const INPUT_COST_PER_M = 3.0;
const OUTPUT_COST_PER_M = 15.0;
const MONTHLY_BUDGET_USD = 20;

// Thresholds
const WARNING_THRESHOLD = 0.7; // 70%
const CRITICAL_THRESHOLD = 0.9; // 90%

interface MonthlySpend {
  month: string; // YYYY-MM format
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

let state: MonthlySpend = {
  month: currentMonth(),
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUsd: 0,
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ensureCurrentMonth(): void {
  const now = currentMonth();
  if (state.month !== now) {
    state = {
      month: now,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
    };
  }
}

export function recordTokenUsage(
  inputTokens: number,
  outputTokens: number,
): void {
  ensureCurrentMonth();
  state.inputTokens += inputTokens;
  state.outputTokens += outputTokens;
  state.estimatedCostUsd =
    (state.inputTokens / 1_000_000) * INPUT_COST_PER_M +
    (state.outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
}

export function getBudgetInfo(): {
  percentUsed: number;
  status: BudgetStatus;
  estimatedCostUsd: number;
} {
  ensureCurrentMonth();
  const percentUsed = Math.min(
    (state.estimatedCostUsd / MONTHLY_BUDGET_USD) * 100,
    100,
  );

  let status: BudgetStatus = "normal";
  if (percentUsed >= 100) {
    status = "exhausted";
  } else if (percentUsed >= CRITICAL_THRESHOLD * 100) {
    status = "critical";
  } else if (percentUsed >= WARNING_THRESHOLD * 100) {
    status = "warning";
  }

  return { percentUsed, status, estimatedCostUsd: state.estimatedCostUsd };
}

export function isExhausted(): boolean {
  return getBudgetInfo().status === "exhausted";
}

/** Exposed for testing only */
export function _resetForTesting(
  month: string,
  inputTokens = 0,
  outputTokens = 0,
): void {
  state = {
    month,
    inputTokens,
    outputTokens,
    estimatedCostUsd:
      (inputTokens / 1_000_000) * INPUT_COST_PER_M +
      (outputTokens / 1_000_000) * OUTPUT_COST_PER_M,
  };
}
