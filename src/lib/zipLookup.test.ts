import { describe, it, expect } from "vitest";
import { lookupZip } from "./zipLookup";

describe("lookupZip", () => {
  it("returns state codes for a known TX zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple state codes for multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns null for unknown zip code", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(lookupZip("abcde")).toBeNull();
  });

  it("returns null for wrong length", () => {
    expect(lookupZip("123")).toBeNull();
  });

  it("returns CA for 90210", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });
});
