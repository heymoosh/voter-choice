import { describe, it, expect, beforeEach } from "vitest";
import {
  recordUsage,
  getBudgetStatus,
  shouldAllowNewSession,
  shouldTriggerHandoff,
  _resetForTesting,
  _setSpendForTesting,
} from "./budget";

describe("budget", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  describe("recordUsage", () => {
    it("starts at 0% with no usage", () => {
      const status = getBudgetStatus();
      expect(status.percent).toBe(0);
      expect(status.tier).toBe("normal");
      expect(status.estimatedSpendUSD).toBe(0);
    });

    it("tracks token costs correctly", () => {
      // 1M input tokens at $3/M = $3, 1M output tokens at $15/M = $15 => $18 total
      recordUsage(1_000_000, 1_000_000);
      const status = getBudgetStatus();
      expect(status.estimatedSpendUSD).toBe(18);
      expect(status.percent).toBe(90);
    });

    it("accumulates across multiple calls", () => {
      recordUsage(500_000, 0); // $1.50
      recordUsage(500_000, 0); // $1.50
      const status = getBudgetStatus();
      expect(status.estimatedSpendUSD).toBe(3);
    });
  });

  describe("budget tiers", () => {
    it("returns normal below 70%", () => {
      _setSpendForTesting(13.99);
      expect(getBudgetStatus().tier).toBe("normal");
    });

    it("returns notice at 70%", () => {
      _setSpendForTesting(14.0);
      expect(getBudgetStatus().tier).toBe("notice");
    });

    it("returns soft_close at 80%", () => {
      _setSpendForTesting(16.0);
      expect(getBudgetStatus().tier).toBe("soft_close");
    });

    it("returns handoff at 90%", () => {
      _setSpendForTesting(18.0);
      expect(getBudgetStatus().tier).toBe("handoff");
    });

    it("returns exhausted at 100%", () => {
      _setSpendForTesting(20.0);
      expect(getBudgetStatus().tier).toBe("exhausted");
    });
  });

  describe("shouldAllowNewSession", () => {
    it("allows at normal tier", () => {
      _setSpendForTesting(0);
      expect(shouldAllowNewSession()).toBe(true);
    });

    it("allows at notice tier", () => {
      _setSpendForTesting(14.0);
      expect(shouldAllowNewSession()).toBe(true);
    });

    it("blocks at soft_close tier", () => {
      _setSpendForTesting(16.0);
      expect(shouldAllowNewSession()).toBe(false);
    });

    it("blocks at exhausted tier", () => {
      _setSpendForTesting(20.0);
      expect(shouldAllowNewSession()).toBe(false);
    });
  });

  describe("shouldTriggerHandoff", () => {
    it("does not trigger below 90%", () => {
      _setSpendForTesting(17.99);
      expect(shouldTriggerHandoff()).toBe(false);
    });

    it("triggers at 90%", () => {
      _setSpendForTesting(18.0);
      expect(shouldTriggerHandoff()).toBe(true);
    });

    it("does not trigger at 100% (already exhausted)", () => {
      _setSpendForTesting(20.0);
      expect(shouldTriggerHandoff()).toBe(false);
    });
  });
});
