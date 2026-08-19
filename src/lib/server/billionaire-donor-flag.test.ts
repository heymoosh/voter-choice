/**
 * src/lib/server/billionaire-donor-flag.test.ts
 *
 * Default-OFF is the point: matched rows include low-confidence,
 * human-review-only entries, so an accidental "on" would ship unvetted or
 * possibly-wrong billionaire attributions to a voter.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { isBillionaireDonorMatchEnabled } from "./billionaire-donor-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isBillionaireDonorMatchEnabled", () => {
  it("is off when unset", () => {
    vi.stubEnv("BILLIONAIRE_DONOR_MATCH_ENABLED", "");
    expect(isBillionaireDonorMatchEnabled()).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    vi.stubEnv("BILLIONAIRE_DONOR_MATCH_ENABLED", "true");
    expect(isBillionaireDonorMatchEnabled()).toBe(true);
  });

  it('reads "false" and other truthy-looking strings as OFF', () => {
    for (const value of ["false", "0", "1", "yes", "TRUE"]) {
      vi.stubEnv("BILLIONAIRE_DONOR_MATCH_ENABLED", value);
      expect(isBillionaireDonorMatchEnabled(), value).toBe(false);
    }
  });
});
