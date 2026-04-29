import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordUsage,
  recordUsageAsync,
  getBudgetStatus,
  getBudgetStatusAsync,
  shouldAllowNewSession,
  shouldTriggerHandoff,
  _resetForTesting,
  _setSpendForTesting,
} from "./budget";

describe("budget", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  describe("durable budget store", () => {
    beforeEach(() => {
      vi.stubEnv("KV_REST_API_URL", "https://redis.example.test");
      vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    });

    it("reads shared budget spend when durable store is configured", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ result: "18" }), { status: 200 }),
      );

      await expect(getBudgetStatusAsync()).resolves.toMatchObject({
        tier: "handoff",
        percent: 90,
        estimatedSpendUSD: 18,
      });
    });

    it("records usage through durable store when configured", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(
          async () =>
            new Response(JSON.stringify({ result: "OK" }), { status: 200 }),
        );

      await recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://redis.example.test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
      expect(
        fetchMock.mock.calls.some(([, init]) =>
          String(init?.body).includes("HINCRBYFLOAT"),
        ),
      ).toBe(true);
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
