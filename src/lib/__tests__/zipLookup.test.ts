import { describe, it, expect } from "vitest";
import { lookupZip } from "../zipLookup";

describe("lookupZip", () => {
  it("returns TX for a known Texas zip code", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns CA for a known California zip code", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });

  it("returns NH for a known New Hampshire zip code", () => {
    expect(lookupZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for a multi-state zip code", () => {
    const result = lookupZip("86515");
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(1);
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
  });

  it("returns null for an unknown zip code", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(lookupZip("")).toBeNull();
  });
});
