import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, releaseSession, _resetForTesting } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    _resetForTesting();
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
  });

  describe("concurrent session limit", () => {
    it("allows up to 3 concurrent sessions per IP", () => {
      expect(checkRateLimit("1.2.3.4", "sess-1", 1).allowed).toBe(true);
      expect(checkRateLimit("1.2.3.4", "sess-2", 1).allowed).toBe(true);
      expect(checkRateLimit("1.2.3.4", "sess-3", 1).allowed).toBe(true);
    });

    it("rejects 4th concurrent session", () => {
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
    it("allows up to 5 new sessions per day", () => {
      for (let i = 1; i <= 5; i++) {
        expect(checkRateLimit("1.2.3.4", `sess-${i}`, 1).allowed).toBe(true);
        releaseSession("1.2.3.4", `sess-${i}`);
      }
    });

    it("rejects 6th new session", () => {
      for (let i = 1; i <= 5; i++) {
        checkRateLimit("1.2.3.4", `sess-${i}`, 1);
        releaseSession("1.2.3.4", `sess-${i}`);
      }
      const result = checkRateLimit("1.2.3.4", "sess-6", 1);
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
});
