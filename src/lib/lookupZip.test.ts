import { describe, it, expect } from "vitest";
import { lookupZip } from "./lookupZip";

describe("lookupZip", () => {
  it("returns a single state for a single-state zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    const result = lookupZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for unknown zip", () => {
    expect(lookupZip("00001")).toEqual([]);
  });

  it("returns empty array for non-5-digit input", () => {
    expect(lookupZip("123")).toEqual([]);
    expect(lookupZip("123456")).toEqual([]);
  });

  it("returns empty array for non-numeric input", () => {
    expect(lookupZip("abcde")).toEqual([]);
  });

  it("returns California for a CA zip", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });
});
