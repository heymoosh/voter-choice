import { describe, it, expect } from "vitest";
import { lookupState } from "../lookupState";

describe("lookupState", () => {
  it("returns state codes for a known Texas zip", () => {
    expect(lookupState("73301")).toEqual(["TX"]);
  });

  it("returns state codes for a known California zip", () => {
    expect(lookupState("90210")).toEqual(["CA"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    const result = lookupState("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns null for an unknown zip code", () => {
    expect(lookupState("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupState("")).toBeNull();
  });
});
