/**
 * src/lib/server/pac-transparency-flag.test.ts
 *
 * The gate behind BOTH Part 6 display blocks. Default-OFF is the point:
 * sponsor attributions are auto-classified until a human curation pass has
 * run, so an accidental "on" would ship unvetted claims onto a voter card.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { isPacTransparencyEnabled } from "./pac-transparency-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isPacTransparencyEnabled", () => {
  it("is off when unset", () => {
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "");
    expect(isPacTransparencyEnabled()).toBe(false);
  });

  it('is on only for the exact string "true"', () => {
    vi.stubEnv("PAC_TRANSPARENCY_ENABLED", "true");
    expect(isPacTransparencyEnabled()).toBe(true);
  });

  it('reads "false" and other truthy-looking strings as OFF', () => {
    for (const value of ["false", "0", "1", "yes", "TRUE"]) {
      vi.stubEnv("PAC_TRANSPARENCY_ENABLED", value);
      expect(isPacTransparencyEnabled(), value).toBe(false);
    }
  });
});
