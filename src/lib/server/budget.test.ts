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
  getBudgetWriteFailureStats,
  estimateSpendFromTotals,
  _resetForTesting,
  _setSpendForTesting,
  _setHandoffServedForTesting,
  _resetWriteFailureStatsForTesting,
} from "./budget";
import { _resetDurableStoreWarningForTesting } from "./durable-store";

describe("budget", () => {
  beforeEach(() => {
    _resetForTesting();
    _resetWriteFailureStatsForTesting();
    _resetDurableStoreWarningForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("durable store unconfigured in production (fail closed)", () => {
    // KV env deliberately left unset for this block.
    it("getBudgetStatusAsync fails closed (treats budget as exhausted) in prod", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const status = await getBudgetStatusAsync();

      // Blocked, NOT a silent $0 reset. Mirrors the Redis-error fail-closed path:
      // percent 100, handoffServed=false → tier "handoff" (voter still gets the
      // handoff completion) — but crucially not "normal"/0%.
      expect(status.percent).toBe(100);
      expect(status.estimatedSpendUSD).toBe(50);
      expect(status.tier).toBe("handoff");
      // A single loud structured warning is emitted.
      expect(errSpy).toHaveBeenCalledTimes(1);
      expect(String(errSpy.mock.calls[0][0])).toContain(
        "durable_store_unconfigured",
      );
    });

    it("recordUsageAsync does not populate per-instance memory in prod", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.spyOn(console, "error").mockImplementation(() => {});
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      await recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 });

      // No durable write attempted, and the sync in-memory path is not taken.
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(getBudgetStatus().estimatedSpendUSD).toBe(0);
    });

    it("dev/test with unconfigured store keeps in-memory fallback (unchanged)", async () => {
      // NODE_ENV is "test" here (not production) → no fail-closed.
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      _setSpendForTesting(6);

      const status = await getBudgetStatusAsync();

      expect(status.estimatedSpendUSD).toBe(6);
      expect(status.tier).toBe("normal");
      expect(errSpy).not.toHaveBeenCalled();
    });
  });

  describe("recordUsage", () => {
    it("starts at 0% with no usage", () => {
      const status = getBudgetStatus();
      expect(status.percent).toBe(0);
      expect(status.tier).toBe("normal");
      expect(status.estimatedSpendUSD).toBe(0);
    });

    it("tracks token costs correctly", () => {
      // Haiku 4.5 pricing: 1M input tokens at $1/M = $1, 1M output tokens at
      // $5/M = $5 => $6 total. $6 / $50 cap = 12%.
      recordUsage(1_000_000, 1_000_000);
      const status = getBudgetStatus();
      expect(status.estimatedSpendUSD).toBe(6);
      expect(status.percent).toBe(12);
    });

    it("accumulates across multiple calls", () => {
      // Haiku 4.5 input pricing: $1/M tokens.
      recordUsage(500_000, 0); // $0.50
      recordUsage(500_000, 0); // $0.50
      const status = getBudgetStatus();
      expect(status.estimatedSpendUSD).toBe(1);
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

  describe("durable write-failure signal", () => {
    beforeEach(() => {
      vi.stubEnv("KV_REST_API_URL", "https://redis.example.test");
      vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    });

    it("emits a structured budget_write_failed signal with an increasing count on persistent failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Redis connection refused"),
      );
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // recordUsageAsync must NOT throw even when the durable write fails.
      await expect(
        recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 }),
      ).resolves.toBeUndefined();
      await expect(
        recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 }),
      ).resolves.toBeUndefined();

      // Both failures logged a JSON structured signal.
      const signals = errSpy.mock.calls
        .map((c) => c[0])
        .filter((s): s is string => typeof s === "string")
        .map((s) => {
          try {
            return JSON.parse(s) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter(
          (o): o is Record<string, unknown> =>
            !!o && o.event === "budget_write_failed",
        );

      expect(signals).toHaveLength(2);
      // Count increases across consecutive failures.
      expect(signals[0].consecutiveFailures).toBe(1);
      expect(signals[0].totalFailures).toBe(1);
      expect(signals[1].consecutiveFailures).toBe(2);
      expect(signals[1].totalFailures).toBe(2);

      // Counters are also readable for observability/reconciliation.
      const stats = getBudgetWriteFailureStats();
      expect(stats.totalFailures).toBe(2);
      expect(stats.consecutiveFailures).toBe(2);
      expect(stats.lastFailureAt).toBeTypeOf("number");
    });

    it("resets the consecutive-failure streak after a successful durable write", async () => {
      let succeed = false;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        if (!succeed) throw new Error("Redis connection refused");
        return new Response(JSON.stringify({ result: "OK" }), { status: 200 });
      });
      vi.spyOn(console, "error").mockImplementation(() => {});

      await recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 }); // fail 1
      expect(getBudgetWriteFailureStats().consecutiveFailures).toBe(1);

      succeed = true;
      await recordUsageAsync({ inputTokens: 1_000_000, outputTokens: 0 }); // success
      const stats = getBudgetWriteFailureStats();
      expect(stats.consecutiveFailures).toBe(0); // streak reset
      expect(stats.totalFailures).toBe(1); // total preserved
    });
  });

  describe("estimateSpendFromTotals", () => {
    it("re-derives spend from token totals using the live pricing", () => {
      // 1M input @ $1/M + 1M output @ $5/M = $6.
      expect(
        estimateSpendFromTotals({
          totalInputTokens: 1_000_000,
          totalOutputTokens: 1_000_000,
          totalCachedInputTokens: 0,
          totalCacheWriteTokens: 0,
          totalSearchCount: 0,
        }),
      ).toBe(6);
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

    it("getBudgetStatusAsync fails CLOSED (exhausted/handoff) on Redis error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Redis connection refused"),
      );

      // Fail-closed: when Redis is unreadable we cannot confirm remaining budget,
      // so we treat the community key as fully spent (MONTHLY_BUDGET_USD) with
      // handoffServed=false. This stops new LLM spend on the shared key while
      // still allowing the voter to receive the handoff completion (tier="handoff",
      // not "exhausted"), rather than serving an open/zero-spend status that risks
      // uncapped spend during an outage.
      const status = await getBudgetStatusAsync();
      expect(status.tier).toBe("handoff"); // handoffServed=false → handoff not exhausted
      expect(status.percent).toBe(100);
      expect(status.estimatedSpendUSD).toBe(50);
    });
  });
});
