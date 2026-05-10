import { describe, it, expect, beforeEach } from "vitest";
import { BudgetManager, BudgetTier, getTierForPercentage } from "@/lib/budget";

describe("getTierForPercentage", () => {
  it("returns Normal for 0%", () => {
    expect(getTierForPercentage(0)).toBe(BudgetTier.Normal);
  });

  it("returns Normal for 69%", () => {
    expect(getTierForPercentage(69)).toBe(BudgetTier.Normal);
  });

  it("returns Notice for 75%", () => {
    expect(getTierForPercentage(75)).toBe(BudgetTier.Notice);
  });

  it("returns SoftClose for 85%", () => {
    expect(getTierForPercentage(85)).toBe(BudgetTier.SoftClose);
  });

  it("returns Handoff for 92%", () => {
    expect(getTierForPercentage(92)).toBe(BudgetTier.Handoff);
  });

  it("returns Exhausted for 100%", () => {
    expect(getTierForPercentage(100)).toBe(BudgetTier.Exhausted);
  });
});

describe("BudgetManager", () => {
  let manager: BudgetManager;

  beforeEach(() => {
    manager = new BudgetManager();
    manager.resetForTest();
  });

  it("starts at Normal tier", async () => {
    const status = await manager.getStatus();
    expect(status.tier).toBe(BudgetTier.Normal);
    expect(status.isChatAvailable).toBe(true);
  });

  it("allows recording spend", async () => {
    await manager.recordSpend(1.5);
    const status = await manager.getStatus();
    expect(status.totalSpent).toBeGreaterThan(0);
  });

  it("chat is unavailable when exhausted", async () => {
    await manager.setSpendForTest(21);
    const status = await manager.getStatus();
    expect(status.isChatAvailable).toBe(false);
  });

  it("shows notice tier at 75%", async () => {
    await manager.setSpendForTest(15); // 75% of $20
    const status = await manager.getStatus();
    expect(status.tier).toBe(BudgetTier.Notice);
    expect(status.showNotice).toBe(true);
    expect(status.isChatAvailable).toBe(true);
  });

  it("chat unavailable at soft-close tier", async () => {
    await manager.setSpendForTest(17); // 85%
    const status = await manager.getStatus();
    expect(status.tier).toBe(BudgetTier.SoftClose);
    expect(status.isChatAvailable).toBe(false);
  });
});
