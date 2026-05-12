/**
 * Budget tracker for Anthropic API usage.
 * Tracks estimated cumulative spend per calendar month.
 * Uses a simple JSON file — the ONE exception to the "no persistent storage" rule.
 *
 * Pricing (claude-sonnet-4-6 as of 2026):
 *   Input: ~$3.00 / 1M tokens
 *   Output: ~$15.00 / 1M tokens
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const BUDGET_FILE = join(process.cwd(), "data", "budget-state.json");
const MONTHLY_BUDGET_USD = 20.0;
const INPUT_COST_PER_TOKEN = 3.0 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000;

interface BudgetState {
  month: string; // "YYYY-MM"
  inputTokens: number;
  outputTokens: number;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function readState(): BudgetState {
  try {
    const raw = readFileSync(BUDGET_FILE, "utf-8");
    const state = JSON.parse(raw) as BudgetState;
    // Reset if month changed
    if (state.month !== currentMonth()) {
      return { month: currentMonth(), inputTokens: 0, outputTokens: 0 };
    }
    return state;
  } catch {
    return { month: currentMonth(), inputTokens: 0, outputTokens: 0 };
  }
}

function writeState(state: BudgetState): void {
  try {
    writeFileSync(BUDGET_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // Non-fatal — budget tracking is best-effort
  }
}

export function estimatedSpendUsd(state: BudgetState): number {
  return (
    state.inputTokens * INPUT_COST_PER_TOKEN +
    state.outputTokens * OUTPUT_COST_PER_TOKEN
  );
}

export function getBudgetStatus(): {
  spentUsd: number;
  remainingUsd: number;
  percentUsed: number;
  tier: "normal" | "warning" | "critical" | "exhausted";
} {
  const state = readState();
  const spentUsd = estimatedSpendUsd(state);
  const percentUsed = (spentUsd / MONTHLY_BUDGET_USD) * 100;

  let tier: "normal" | "warning" | "critical" | "exhausted";
  if (percentUsed >= 100) {
    tier = "exhausted";
  } else if (percentUsed >= 90) {
    tier = "critical";
  } else if (percentUsed >= 70) {
    tier = "warning";
  } else {
    tier = "normal";
  }

  return {
    spentUsd,
    remainingUsd: MONTHLY_BUDGET_USD - spentUsd,
    percentUsed,
    tier,
  };
}

export function recordUsage(inputTokens: number, outputTokens: number): void {
  const state = readState();
  state.inputTokens += inputTokens;
  state.outputTokens += outputTokens;
  writeState(state);
}
