import { describe, it, expect } from "vitest";
import { getBudgetStatus, isChatAvailable } from "../budget";

describe("getBudgetStatus", () => {
  it("returns normal tier by default", () => {
    const status = getBudgetStatus();
    expect(status.tier).toBe("normal");
    expect(status.chatAvailable).toBe(true);
  });

  it("returns percentUsed as a number", () => {
    const status = getBudgetStatus();
    expect(typeof status.percentUsed).toBe("number");
    expect(status.percentUsed).toBeGreaterThanOrEqual(0);
  });
});

describe("isChatAvailable", () => {
  it("returns true when budget is not exhausted", () => {
    expect(isChatAvailable()).toBe(true);
  });
});
