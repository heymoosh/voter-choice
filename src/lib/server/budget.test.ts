import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  recordUsage,
  recordUsageAsync,
  getBudgetStatus,
  getBudgetStatusAsync,
  shouldAllowNewSession,
  shouldTriggerHandoff,
  markHandoffServed,
  wasHandoffServed,
  _resetForTesting,
  _setSpendForTesting,
  _setHandoffServedForTesting,
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
      // $18 / $50 cap = 36%
      recordUsage(1_000_000, 1_000_000);
      const status = getBudgetStatus();
      expect(status.estimatedSpendUSD).toBe(18);
      expect(status.percent).toBe(36);
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
      // Two parallel HGET calls: estimatedSpendUSD and handoffServed.
      // Mock per-command so each gets the correct value.
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as string[];
        if (body.includes("estimatedSpendUSD")) {
          // $45 = 90% of $50 cap => handoff tier
          return new Response(JSON.stringify({ result: "45" }), {
            status: 200,
          });
        }
        // handoffServed not set
        return new Response(JSON.stringify({ result: null }), {
          status: 200,
        });
      });

      await expect(getBudgetStatusAsync()).resolves.toMatchObject({
        tier: "handoff",
        percent: 90,
        estimatedSpendUSD: 45,
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
    // Cap is $50. Tier boundaries: notice=70%=$35, soft_close=80%=$40,
    // handoff=90%=$45, exhausted=100%=$50 (only when handoffServed=true).

    it("returns normal below 70%", () => {
      _setSpendForTesting(34.99);
      expect(getBudgetStatus().tier).toBe("normal");
    });

    it("returns notice at 70%", () => {
      _setSpendForTesting(35.0);
      expect(getBudgetStatus().tier).toBe("notice");
    });

    it("returns soft_close at 80%", () => {
      _setSpendForTesting(40.0);
      expect(getBudgetStatus().tier).toBe("soft_close");
    });

    it("returns handoff at 90%", () => {
      _setSpendForTesting(45.0);
      expect(getBudgetStatus().tier).toBe("handoff");
    });

    it("returns handoff at 100% when handoffServed is false", () => {
      // Handoff not yet served — tier stays handoff so one more completion
      // can deliver the handoff block before we lock the voter out.
      _setSpendForTesting(50.0);
      _setHandoffServedForTesting(false);
      expect(getBudgetStatus().tier).toBe("handoff");
    });

    it("returns exhausted at 100% only when handoffServed is true", () => {
      _setSpendForTesting(50.0);
      _setHandoffServedForTesting(true);
      expect(getBudgetStatus().tier).toBe("exhausted");
    });
  });

  describe("shouldAllowNewSession", () => {
    it("allows at normal tier", () => {
      _setSpendForTesting(0);
      expect(shouldAllowNewSession()).toBe(true);
    });

    it("allows at notice tier", () => {
      _setSpendForTesting(35.0);
      expect(shouldAllowNewSession()).toBe(true);
    });

    it("blocks at soft_close tier", () => {
      _setSpendForTesting(40.0);
      expect(shouldAllowNewSession()).toBe(false);
    });

    it("blocks at exhausted tier", () => {
      _setSpendForTesting(50.0);
      _setHandoffServedForTesting(true);
      expect(shouldAllowNewSession()).toBe(false);
    });
  });

  describe("shouldTriggerHandoff", () => {
    it("does not trigger below 90%", () => {
      _setSpendForTesting(44.99);
      expect(shouldTriggerHandoff()).toBe(false);
    });

    it("triggers at 90%", () => {
      _setSpendForTesting(45.0);
      expect(shouldTriggerHandoff()).toBe(true);
    });

    it("triggers at 100% when handoffServed is false (tier coerces to handoff)", () => {
      // When spend is past cap and handoffServed=false, tier is "handoff"
      // so shouldTriggerHandoff returns true, enabling the handoff injection.
      _setSpendForTesting(50.0);
      _setHandoffServedForTesting(false);
      expect(shouldTriggerHandoff()).toBe(true);
    });

    it("does not trigger at 100% when handoffServed is true (already exhausted)", () => {
      _setSpendForTesting(50.0);
      _setHandoffServedForTesting(true);
      expect(shouldTriggerHandoff()).toBe(false);
    });
  });

  describe("handoffServed flag", () => {
    it("initial state: handoffServed is false", () => {
      expect(wasHandoffServed()).toBe(false);
    });

    it("markHandoffServed() flips the flag to true", async () => {
      expect(wasHandoffServed()).toBe(false);
      await markHandoffServed();
      expect(wasHandoffServed()).toBe(true);
    });

    it("at 100% spend with handoffServed=false, tier is handoff", () => {
      _setSpendForTesting(50.0);
      expect(getBudgetStatus().tier).toBe("handoff");
    });

    it("at 100% spend, tier becomes exhausted after markHandoffServed()", async () => {
      _setSpendForTesting(50.0);
      expect(getBudgetStatus().tier).toBe("handoff");
      await markHandoffServed();
      expect(getBudgetStatus().tier).toBe("exhausted");
    });

    it("_resetForTesting() resets handoffServed to false", async () => {
      await markHandoffServed();
      expect(wasHandoffServed()).toBe(true);
      _resetForTesting();
      expect(wasHandoffServed()).toBe(false);
    });

    it("_setHandoffServedForTesting() sets the flag directly", () => {
      _setHandoffServedForTesting(true);
      expect(wasHandoffServed()).toBe(true);
      _setHandoffServedForTesting(false);
      expect(wasHandoffServed()).toBe(false);
    });
  });

  describe("durable budget store — handoffServed flag", () => {
    beforeEach(() => {
      vi.stubEnv("KV_REST_API_URL", "https://redis.example.test");
      vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    });

    it("getBudgetStatusAsync uses handoffServed=false when flag field is missing", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as string[];
        // estimatedSpendUSD => return $50 (at cap), handoffServed field => null
        if (body.includes("estimatedSpendUSD")) {
          return new Response(JSON.stringify({ result: "50" }), {
            status: 200,
          });
        }
        // handoffServed field missing — return null
        return new Response(JSON.stringify({ result: null }), {
          status: 200,
        });
      });

      const status = await getBudgetStatusAsync();
      // flag missing → defaults to false → tier is handoff, not exhausted
      expect(status.tier).toBe("handoff");
    });

    it("getBudgetStatusAsync reports exhausted when handoffServed flag is '1'", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
        const body = JSON.parse(String(init?.body)) as string[];
        if (body.includes("estimatedSpendUSD")) {
          return new Response(JSON.stringify({ result: "50" }), {
            status: 200,
          });
        }
        // handoffServed field is set
        return new Response(JSON.stringify({ result: "1" }), {
          status: 200,
        });
      });

      const status = await getBudgetStatusAsync();
      expect(status.tier).toBe("exhausted");
    });

    it("markHandoffServed() writes handoffServed=1 to durable store", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(
          async () =>
            new Response(JSON.stringify({ result: "OK" }), { status: 200 }),
        );

      await markHandoffServed();

      // Should have called HSET with handoffServed and "1"
      const hsetCall = fetchMock.mock.calls.find(([, init]) => {
        const body = JSON.parse(String(init?.body));
        return (
          Array.isArray(body) &&
          body[0] === "HSET" &&
          body.includes("handoffServed") &&
          body.includes("1")
        );
      });
      expect(hsetCall).toBeDefined();
    });

    it("markHandoffServed() still sets in-memory flag even when durable write fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Redis connection refused"),
      );

      // Should not throw
      await expect(markHandoffServed()).resolves.toBeUndefined();
      // In-memory flag should be set
      expect(wasHandoffServed()).toBe(true);
    });

    it("getBudgetStatusAsync defaults to handoffServed=false on Redis error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Redis connection refused"),
      );

      // Error path: budget returns MONTHLY_BUDGET_USD with handoffServed=false
      const status = await getBudgetStatusAsync();
      // At cap, handoffServed=false → tier is handoff (not exhausted)
      expect(status.tier).toBe("handoff");
    });
  });
});
