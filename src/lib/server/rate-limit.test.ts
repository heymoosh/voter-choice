import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  checkRateLimitAsync,
  releaseSession,
  _resetForTesting,
} from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("session message limit", () => {
    it("allows messages under the limit", () => {
      const result = checkRateLimit("1.2.3.4", "sess-1", 1);
      expect(result.allowed).toBe(true);
    });

    it("allows exactly 60 messages", () => {
      const result = checkRateLimit("1.2.3.4", "sess-1", 60);
      expect(result.allowed).toBe(true);
    });

    it("rejects message 61", () => {
      const result = checkRateLimit("1.2.3.4", "sess-1", 61);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("SESSION_LIMIT");
    });

    it("rejects under-reported continuation after server-side count reaches the limit", () => {
      expect(checkRateLimit("1.2.3.4", "sess-1", 60).allowed).toBe(true);
      const result = checkRateLimit("1.2.3.4", "sess-1", 1);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("SESSION_LIMIT");
    });
  });

  describe("concurrent session limit", () => {
    beforeEach(() => {
      vi.stubEnv("CHAT_CONCURRENT_SESSION_LIMIT", "3");
    });

    it("allows up to configured concurrent sessions per IP", () => {
      expect(checkRateLimit("1.2.3.4", "sess-1", 1).allowed).toBe(true);
      expect(checkRateLimit("1.2.3.4", "sess-2", 1).allowed).toBe(true);
      expect(checkRateLimit("1.2.3.4", "sess-3", 1).allowed).toBe(true);
    });

    it("rejects the next concurrent session after the configured limit", () => {
      checkRateLimit("1.2.3.4", "sess-1", 1);
      checkRateLimit("1.2.3.4", "sess-2", 1);
      checkRateLimit("1.2.3.4", "sess-3", 1);
      const result = checkRateLimit("1.2.3.4", "sess-4", 1);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("CONCURRENT_LIMIT");
    });

    it("allows new session after releasing one", () => {
      checkRateLimit("1.2.3.4", "sess-1", 1);
      checkRateLimit("1.2.3.4", "sess-2", 1);
      checkRateLimit("1.2.3.4", "sess-3", 1);
      releaseSession("1.2.3.4", "sess-1");
      const result = checkRateLimit("1.2.3.4", "sess-4", 1);
      expect(result.allowed).toBe(true);
    });

    it("allows existing session to continue sending messages", () => {
      checkRateLimit("1.2.3.4", "sess-1", 1);
      checkRateLimit("1.2.3.4", "sess-2", 1);
      checkRateLimit("1.2.3.4", "sess-3", 1);
      // sess-1 already exists, should be allowed
      const result = checkRateLimit("1.2.3.4", "sess-1", 2);
      expect(result.allowed).toBe(true);
    });
  });

  describe("daily session limit", () => {
    const DAILY_LIMIT_TEST = 4;

    beforeEach(() => {
      vi.stubEnv("CHAT_DAILY_SESSION_LIMIT", String(DAILY_LIMIT_TEST));
    });

    it(`allows up to ${DAILY_LIMIT_TEST} new sessions per day`, () => {
      for (let i = 1; i <= DAILY_LIMIT_TEST; i++) {
        expect(checkRateLimit("1.2.3.4", `sess-${i}`, 1).allowed).toBe(true);
        releaseSession("1.2.3.4", `sess-${i}`);
      }
    });

    it(`rejects the ${DAILY_LIMIT_TEST + 1}th new session`, () => {
      for (let i = 1; i <= DAILY_LIMIT_TEST; i++) {
        checkRateLimit("1.2.3.4", `sess-${i}`, 1);
        releaseSession("1.2.3.4", `sess-${i}`);
      }
      const result = checkRateLimit(
        "1.2.3.4",
        `sess-${DAILY_LIMIT_TEST + 1}`,
        1,
      );
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("DAILY_LIMIT");
    });
  });

  describe("IP isolation", () => {
    it("tracks limits per IP independently", () => {
      checkRateLimit("1.1.1.1", "sess-1", 1);
      checkRateLimit("1.1.1.1", "sess-2", 1);
      checkRateLimit("1.1.1.1", "sess-3", 1);
      // Different IP should be unaffected
      const result = checkRateLimit("2.2.2.2", "sess-1", 1);
      expect(result.allowed).toBe(true);
    });
  });

  describe("durable rate limit store", () => {
    beforeEach(() => {
      vi.stubEnv("KV_REST_API_URL", "https://redis.example.test");
      vi.stubEnv("KV_REST_API_TOKEN", "test-token");
    });

    it("uses durable Redis-compatible commands when configured", async () => {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockImplementation(async (_input, init) => {
          const command = JSON.parse(String(init?.body)) as unknown[];
          const name = command[0];
          const result =
            name === "INCR"
              ? 1
              : name === "ZSCORE"
                ? null
                : name === "ZCARD"
                  ? 1
                  : name === "SET"
                    ? "OK"
                    : 1;
          return new Response(JSON.stringify({ result }), { status: 200 });
        });

      await expect(
        checkRateLimitAsync("1.2.3.4", "sess-1", 1),
      ).resolves.toEqual({ allowed: true });
      expect(
        fetchMock.mock.calls.some(([, init]) =>
          String(init?.body).includes("ZADD"),
        ),
      ).toBe(true);
    });
  });
});
