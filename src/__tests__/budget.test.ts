import { describe, it, expect } from "vitest";
import { getBudgetTier, isChatAvailable } from "@/lib/budget";

describe("getBudgetTier", () => {
  const limit = 2000;

  it("returns normal when spend is 0", () => {
    expect(getBudgetTier(0, limit)).toBe("normal");
  });

  it("returns normal when spend is below 70%", () => {
    expect(getBudgetTier(1399, limit)).toBe("normal");
  });

  it("returns notice when spend is 70–80%", () => {
    expect(getBudgetTier(1400, limit)).toBe("notice");
    expect(getBudgetTier(1599, limit)).toBe("notice");
  });

  it("returns soft-close when spend is 80–90%", () => {
    expect(getBudgetTier(1600, limit)).toBe("soft-close");
    expect(getBudgetTier(1799, limit)).toBe("soft-close");
  });

  it("returns handoff when spend is 90–100%", () => {
    expect(getBudgetTier(1800, limit)).toBe("handoff");
    expect(getBudgetTier(1999, limit)).toBe("handoff");
  });

  it("returns exhausted when spend equals limit", () => {
    expect(getBudgetTier(2000, limit)).toBe("exhausted");
  });

  it("returns exhausted when spend exceeds limit", () => {
    expect(getBudgetTier(2100, limit)).toBe("exhausted");
  });
});

describe("isChatAvailable", () => {
  it("allows chat in normal tier", () => {
    expect(isChatAvailable("normal")).toBe(true);
  });

  it("allows chat in notice tier", () => {
    expect(isChatAvailable("notice")).toBe(true);
  });

  it("denies chat in soft-close tier", () => {
    expect(isChatAvailable("soft-close")).toBe(false);
  });

  it("denies chat in handoff tier", () => {
    expect(isChatAvailable("handoff")).toBe(false);
  });

  it("denies chat in exhausted tier", () => {
    expect(isChatAvailable("exhausted")).toBe(false);
  });
});
