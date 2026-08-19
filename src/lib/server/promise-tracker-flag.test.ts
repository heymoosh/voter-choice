/**
 * src/lib/server/promise-tracker-flag.test.ts
 *
 * The gate behind the Part 5 promise ledger. Default-OFF is the point:
 * rubric §6.4 requires an independent human gold pass before any verdict is
 * shown, so an accidental "on" would ship unvetted kept/broken calls.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { isPromiseTrackerEnabled } from "./promise-tracker-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPromiseTrackerEnabled", () => {
  it("is off when unset", () => {
    vi.stubEnv("PROMISE_TRACKER_ENABLED", "");
    expect(isPromiseTrackerEnabled()).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    vi.stubEnv("PROMISE_TRACKER_ENABLED", "true");
    expect(isPromiseTrackerEnabled()).toBe(true);
  });

  it('reads "false" and other truthy-looking strings as OFF', () => {
    for (const value of ["false", "0", "1", "yes", "TRUE"]) {
      vi.stubEnv("PROMISE_TRACKER_ENABLED", value);
      expect(isPromiseTrackerEnabled(), value).toBe(false);
    }
  });
});
