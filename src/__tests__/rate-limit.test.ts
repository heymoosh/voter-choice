import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("allows new session creation for fresh IP", async () => {
    const result = await limiter.checkNewSession("1.2.3.4");
    expect(result.allowed).toBe(true);
  });

  it("blocks IP after 5 sessions in a day", async () => {
    const ip = "10.0.0.1";
    for (let i = 0; i < 5; i++) {
      await limiter.recordNewSession(ip, `session-${i}`);
    }
    const result = await limiter.checkNewSession(ip);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/daily/i);
  });

  it("blocks IP with 3+ concurrent sessions", async () => {
    const ip = "10.0.0.2";
    await limiter.recordNewSession(ip, "sess-a");
    await limiter.recordNewSession(ip, "sess-b");
    await limiter.recordNewSession(ip, "sess-c");
    const result = await limiter.checkNewSession(ip);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/concurrent/i);
  });

  it("allows session after ending concurrent sessions", async () => {
    const ip = "10.0.0.3";
    await limiter.recordNewSession(ip, "sess-x");
    await limiter.recordNewSession(ip, "sess-y");
    await limiter.recordNewSession(ip, "sess-z");
    await limiter.endSession(ip, "sess-x");
    const result = await limiter.checkNewSession(ip);
    expect(result.allowed).toBe(true);
  });

  it("blocks message after 60 in session", async () => {
    const session = "long-session";
    for (let i = 0; i < 60; i++) {
      await limiter.recordMessage(session);
    }
    const result = await limiter.checkMessage(session);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/message/i);
  });

  it("allows messages under the limit", async () => {
    const session = "short-session";
    await limiter.recordMessage(session);
    const result = await limiter.checkMessage(session);
    expect(result.allowed).toBe(true);
  });
});
