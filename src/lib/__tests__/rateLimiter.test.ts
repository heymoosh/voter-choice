import { describe, it, expect, beforeEach } from "vitest";
import {
  tryStartSession,
  endSession,
  isSessionAtMessageLimit,
  _clearForTesting,
  MAX_CONCURRENT,
  MAX_DAILY,
  MAX_MESSAGES_PER_SESSION,
} from "../rateLimiter";

describe("rateLimiter", () => {
  beforeEach(() => {
    _clearForTesting();
  });

  it("allows a new session for a fresh IP", () => {
    const result = tryStartSession("192.168.1.1", "session-1");
    expect(result.allowed).toBe(true);
  });

  it("allows up to MAX_CONCURRENT concurrent sessions", () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < MAX_CONCURRENT; i++) {
      const result = tryStartSession(ip, `session-${i}`);
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects when MAX_CONCURRENT sessions are active", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < MAX_CONCURRENT; i++) {
      tryStartSession(ip, `session-${i}`);
    }
    const result = tryStartSession(ip, "session-overflow");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("concurrent_limit");
    }
  });

  it("allows new session after ending one", () => {
    const ip = "10.0.0.3";
    for (let i = 0; i < MAX_CONCURRENT; i++) {
      tryStartSession(ip, `session-${i}`);
    }
    // End one session
    endSession(ip, "session-0");
    // Should allow a new one now (concurrent slots freed)
    // But daily limit may be hit — need to check
    // MAX_CONCURRENT=3, MAX_DAILY=5, so we've used 3 daily slots
    const result = tryStartSession(ip, "session-new");
    expect(result.allowed).toBe(true);
  });

  it("rejects after MAX_DAILY sessions regardless of concurrent", () => {
    const ip = "10.0.0.4";
    for (let i = 0; i < MAX_DAILY; i++) {
      tryStartSession(ip, `session-${i}`);
      // End immediately to free concurrent slot
      endSession(ip, `session-${i}`);
    }
    // Next session should fail due to daily limit
    const result = tryStartSession(ip, "session-over-daily");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe("daily_limit");
    }
  });

  it("endSession removes the session from active set", () => {
    const ip = "10.0.0.5";
    tryStartSession(ip, "session-a");
    endSession(ip, "session-a");
    // After ending, the concurrent slot is freed
    // We now have 0 active sessions
    const result = tryStartSession(ip, "session-b");
    expect(result.allowed).toBe(true);
  });

  it("isSessionAtMessageLimit returns false below limit", () => {
    expect(isSessionAtMessageLimit(MAX_MESSAGES_PER_SESSION - 1)).toBe(false);
  });

  it("isSessionAtMessageLimit returns true at limit", () => {
    expect(isSessionAtMessageLimit(MAX_MESSAGES_PER_SESSION)).toBe(true);
  });

  it("isSessionAtMessageLimit returns true above limit", () => {
    expect(isSessionAtMessageLimit(MAX_MESSAGES_PER_SESSION + 10)).toBe(true);
  });

  it("different IPs have independent limits", () => {
    const ip1 = "10.0.1.1";
    const ip2 = "10.0.1.2";

    // Fill ip1's concurrent limit
    for (let i = 0; i < MAX_CONCURRENT; i++) {
      tryStartSession(ip1, `ip1-session-${i}`);
    }

    // ip2 should still be able to start sessions
    const result = tryStartSession(ip2, "ip2-session-0");
    expect(result.allowed).toBe(true);
  });
});
