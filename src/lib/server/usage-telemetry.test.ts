/**
 * src/lib/server/usage-telemetry.test.ts
 *
 * Focused tests for the usage-block telemetry module:
 *  - recordBlock ALWAYS logs the canonical `usage.blocked` shape (event,
 *    reason, route, hashed ip, session, merged detail, ISO ts).
 *  - the IP is hashed (never logged in the clear).
 *  - recordBlock fire-and-forget increments the per-reason daily counter when
 *    the durable store is configured (INCR + EXPIRE).
 *  - recordBlock NEVER throws — not when redisCommand rejects, not when the
 *    store is unconfigured.
 *  - getBlockStats reads the per-reason counters and returns { reason: count }.
 *
 * durable-store is mocked so we control isDurableStoreConfigured + redisCommand.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redisStub = vi.hoisted(() => ({
  configured: true,
  shouldThrow: false,
  // key -> stringified count
  counters: new Map<string, string>(),
  calls: [] as Array<(string | number)[]>,
}));

vi.mock("./durable-store", () => ({
  isDurableStoreConfigured: vi.fn(() => redisStub.configured),
  redisCommand: vi.fn(async (cmd: (string | number)[]) => {
    redisStub.calls.push(cmd);
    if (!redisStub.configured) return null;
    if (redisStub.shouldThrow) throw new Error("Upstash unavailable");
    const [verb, key] = cmd;
    if (verb === "INCR") {
      const next = Number(redisStub.counters.get(String(key)) ?? 0) + 1;
      redisStub.counters.set(String(key), String(next));
      return next;
    }
    if (verb === "GET") {
      return redisStub.counters.get(String(key)) ?? null;
    }
    if (verb === "EXPIRE") return 1;
    return null;
  }),
}));

import { recordBlock, getBlockStats } from "./usage-telemetry";

/** Wait for the fire-and-forget counter microtask(s) to settle. */
async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("usage-telemetry", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    redisStub.configured = true;
    redisStub.shouldThrow = false;
    redisStub.counters.clear();
    redisStub.calls = [];
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function lastLogJson(): Record<string, unknown> {
    const calls = logSpy.mock.calls;
    return JSON.parse(String(calls[calls.length - 1][0]));
  }

  describe("recordBlock — logging", () => {
    it("logs the canonical usage.blocked shape", () => {
      recordBlock("SESSION_LIMIT", {
        route: "chat",
        ip: "203.0.113.7",
        sessionId: "sess-abc",
        detail: { messageCount: 61 },
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const log = lastLogJson();
      expect(log.event).toBe("usage.blocked");
      expect(log.reason).toBe("SESSION_LIMIT");
      expect(log.route).toBe("chat");
      expect(log.session).toBe("sess-abc");
      // detail is merged at the top level.
      expect(log.messageCount).toBe(61);
      // ts is an ISO-8601 timestamp.
      expect(typeof log.ts).toBe("string");
      expect(() => new Date(log.ts as string).toISOString()).not.toThrow();
    });

    it("hashes the IP and never logs it in the clear", () => {
      recordBlock("ORIGIN_MISMATCH", { route: "chat", ip: "203.0.113.7" });
      const log = lastLogJson();
      expect(log.ip).toBeUndefined();
      // First 10 hex chars of sha256("203.0.113.7").
      expect(typeof log.ip_hash).toBe("string");
      expect(log.ip_hash).toMatch(/^[0-9a-f]{10}$/);
      expect(String(log.ip_hash)).not.toContain("203.0.113.7");
    });

    it("omits ip_hash and session when not provided", () => {
      recordBlock("INVALID_REQUEST", { route: "extract-ballot" });
      const log = lastLogJson();
      expect(log).not.toHaveProperty("ip_hash");
      expect(log).not.toHaveProperty("session");
      expect(log.route).toBe("extract-ballot");
    });
  });

  describe("recordBlock — counters", () => {
    it("increments the per-reason daily counter (INCR + EXPIRE) when configured", async () => {
      recordBlock("DAILY_LIMIT", { route: "chat", ip: "198.51.100.4" });
      await flushAsync();

      const day = new Date().toISOString().slice(0, 10);
      const key = `voter-choice:blocks:${day}:DAILY_LIMIT`;
      const verbs = redisStub.calls.map((c) => String(c[0]));
      expect(verbs).toContain("INCR");
      expect(verbs).toContain("EXPIRE");
      expect(redisStub.calls.some((c) => String(c[1]) === key)).toBe(true);
      expect(redisStub.counters.get(key)).toBe("1");
    });

    it("skips the counter entirely when the store is unconfigured", async () => {
      redisStub.configured = false;
      recordBlock("BUDGET_EXHAUSTED", { route: "chat" });
      await flushAsync();
      expect(redisStub.calls.length).toBe(0);
      // Logging still happened.
      expect(logSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("recordBlock — never throws", () => {
    it("does not throw when redisCommand rejects", async () => {
      redisStub.shouldThrow = true;
      expect(() =>
        recordBlock("RATE_LIMIT_UNAVAILABLE", {
          route: "chat",
          ip: "192.0.2.1",
        }),
      ).not.toThrow();
      // The log line still fired despite the Redis failure.
      expect(logSpy).toHaveBeenCalledTimes(1);
      // Let the rejected fire-and-forget promise settle without an unhandled
      // rejection — recordBlock swallowed it internally.
      await flushAsync();
    });

    it("does not throw even if console.log throws", () => {
      logSpy.mockImplementation(() => {
        throw new Error("stdout closed");
      });
      expect(() => recordBlock("AI_ERROR", { route: "chat" })).not.toThrow();
    });
  });

  describe("getBlockStats", () => {
    it("returns { reason: count } for non-zero counters", async () => {
      recordBlock("SESSION_LIMIT", { route: "chat" });
      recordBlock("SESSION_LIMIT", { route: "chat" });
      recordBlock("API_OVERLOADED", { route: "chat" });
      await flushAsync();

      const stats = await getBlockStats();
      expect(stats.SESSION_LIMIT).toBe(2);
      expect(stats.API_OVERLOADED).toBe(1);
      // Reasons with no blocks are omitted.
      expect(stats).not.toHaveProperty("DAILY_LIMIT");
    });

    it("returns {} when the store is unconfigured", async () => {
      redisStub.configured = false;
      const stats = await getBlockStats();
      expect(stats).toEqual({});
    });

    it("returns {} on redis error rather than throwing", async () => {
      redisStub.shouldThrow = true;
      await expect(getBlockStats()).resolves.toEqual({});
    });
  });
});
