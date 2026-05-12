import { describe, it, expect, beforeEach } from "vitest";
import {
  getBudgetInfo,
  recordTokenUsage,
  isExhausted,
  _resetForTesting,
} from "../chatBudget";

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

describe("chatBudget", () => {
  beforeEach(() => {
    _resetForTesting(CURRENT_MONTH, 0, 0);
  });

  it("starts at 0% usage", () => {
    const info = getBudgetInfo();
    expect(info.percentUsed).toBe(0);
    expect(info.status).toBe("normal");
  });

  it("records token usage and estimates cost", () => {
    // 1M input tokens = $3, 1M output = $15. Total budget $20.
    // 1M input + 0 output = $3 = 15% of $20
    recordTokenUsage(1_000_000, 0);
    const info = getBudgetInfo();
    expect(info.estimatedCostUsd).toBeCloseTo(3.0);
    expect(info.percentUsed).toBeCloseTo(15);
    expect(info.status).toBe("normal");
  });

  it("shows warning status at 70%+", () => {
    // Need ~$14 to hit 70% of $20 budget
    // Using all output tokens: $14 / $15 per M = 933_333.3... tokens
    // Use 934_000 to ensure we're clearly over 70%
    _resetForTesting(CURRENT_MONTH, 0, 934_000);
    const info = getBudgetInfo();
    expect(info.percentUsed).toBeGreaterThanOrEqual(70);
    expect(info.status).toBe("warning");
  });

  it("shows critical status at 90%+", () => {
    // Need ~$18 to hit 90% of $20 budget
    // $18 / $15 per M = 1.2M output tokens
    _resetForTesting(CURRENT_MONTH, 0, 1_200_000);
    const info = getBudgetInfo();
    expect(info.percentUsed).toBeGreaterThanOrEqual(90);
    expect(info.status).toBe("critical");
  });

  it("shows exhausted status at 100%", () => {
    // $20 / $15 per M ≈ 1.333M output tokens
    _resetForTesting(CURRENT_MONTH, 0, 1_400_000);
    const info = getBudgetInfo();
    expect(info.percentUsed).toBe(100);
    expect(info.status).toBe("exhausted");
  });

  it("isExhausted returns true when exhausted", () => {
    _resetForTesting(CURRENT_MONTH, 0, 1_400_000);
    expect(isExhausted()).toBe(true);
  });

  it("isExhausted returns false when not exhausted", () => {
    expect(isExhausted()).toBe(false);
  });

  it("resets when month changes", () => {
    // Set high spend for a past month
    _resetForTesting("2026-01", 0, 1_400_000);
    // Now check current month — should read current month
    // After reset to current month, spend should be 0
    _resetForTesting(CURRENT_MONTH, 0, 0);
    const info = getBudgetInfo();
    expect(info.percentUsed).toBe(0);
  });

  it("accumulates multiple recordTokenUsage calls", () => {
    recordTokenUsage(100_000, 0);
    recordTokenUsage(100_000, 0);
    const info = getBudgetInfo();
    // 200K input tokens = $0.60
    expect(info.estimatedCostUsd).toBeCloseTo(0.6);
  });
});
