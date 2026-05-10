import { describe, it, expect } from "vitest";
import {
  checkNewSession,
  startSession,
  checkMessage,
  recordMessage,
  endSession,
} from "@/lib/rate-limit";

describe("rate limiting", () => {
  describe("checkNewSession", () => {
    it("allows a new session from a fresh IP", () => {
      const result = checkNewSession("10.0.0.1");
      expect(result.allowed).toBe(true);
    });

    it("allows up to 3 concurrent sessions per IP", () => {
      const ip = "10.0.1.1";
      const ids = ["s1", "s2", "s3"];
      for (const id of ids) {
        const check = checkNewSession(ip);
        expect(check.allowed).toBe(true);
        startSession(ip, id);
      }
      const fourth = checkNewSession(ip);
      expect(fourth.allowed).toBe(false);
      for (const id of ids) {
        endSession(ip, id);
      }
    });

    it("blocks when concurrent limit is reached", () => {
      const ip = "10.0.2.1";
      startSession(ip, "concurrent-1");
      startSession(ip, "concurrent-2");
      startSession(ip, "concurrent-3");
      const result = checkNewSession(ip);
      expect(result.allowed).toBe(false);
      endSession(ip, "concurrent-1");
      endSession(ip, "concurrent-2");
      endSession(ip, "concurrent-3");
    });
  });

  describe("checkMessage", () => {
    it("allows messages for a started session", () => {
      const ip = "10.0.3.1";
      const sid = "msg-session-1";
      startSession(ip, sid);
      const result = checkMessage(sid);
      expect(result.allowed).toBe(true);
      endSession(ip, sid);
    });

    it("rejects messages for unknown session", () => {
      const result = checkMessage("nonexistent-session-xyz");
      expect(result.allowed).toBe(false);
    });

    it("records messages without throwing", () => {
      const ip = "10.0.4.1";
      const sid = "msg-record-1";
      startSession(ip, sid);
      expect(() => recordMessage(sid)).not.toThrow();
      endSession(ip, sid);
    });
  });

  describe("endSession", () => {
    it("ends a session without throwing", () => {
      const ip = "10.0.5.1";
      const sid = "end-session-1";
      startSession(ip, sid);
      expect(() => endSession(ip, sid)).not.toThrow();
    });

    it("allows a new session after ending one", () => {
      const ip = "10.0.6.1";
      startSession(ip, "end-allow-1");
      startSession(ip, "end-allow-2");
      startSession(ip, "end-allow-3");
      endSession(ip, "end-allow-3");
      const result = checkNewSession(ip);
      expect(result.allowed).toBe(true);
      endSession(ip, "end-allow-1");
      endSession(ip, "end-allow-2");
    });
  });
});
