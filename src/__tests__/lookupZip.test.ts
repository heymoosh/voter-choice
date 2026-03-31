import { describe, it, expect } from "vitest";
import { lookupZip } from "../lib/lookupZip";

describe("lookupZip", () => {
  it("returns single state for TX zip code", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns single state for CA zip code", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });

  it("returns single state for NH zip code", () => {
    expect(lookupZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toBeInstanceOf(Array);
    expect(result!.length).toBe(2);
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
  });

  it("returns null for unknown zip code", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupZip("")).toBeNull();
  });
});
