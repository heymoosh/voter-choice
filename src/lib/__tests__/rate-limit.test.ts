import { describe, it, expect } from "vitest";
import {
  checkSessionLimit,
  checkIpLimits,
  startSession,
  recordMessage,
} from "../rate-limit";

describe("checkSessionLimit", () => {
  it("allows a new session", () => {
    const result = checkSessionLimit("new-session-123");
    expect(result.allowed).toBe(true);
  });

  it("allows an existing session with few messages", () => {
    const sessionId = "test-session-few";
    startSession(sessionId, "1.2.3.4");
    recordMessage(sessionId);
    recordMessage(sessionId);
    const result = checkSessionLimit(sessionId);
    expect(result.allowed).toBe(true);
  });
});

describe("checkIpLimits", () => {
  it("allows first session for an IP", () => {
    const result = checkIpLimits("192.168.1.1", true);
    expect(result.allowed).toBe(true);
  });

  it("allows non-new session for an IP", () => {
    const result = checkIpLimits("10.0.0.1", false);
    expect(result.allowed).toBe(true);
  });
});

describe("startSession", () => {
  it("does not throw when starting a session", () => {
    expect(() => startSession("session-abc", "1.1.1.1")).not.toThrow();
  });
});
