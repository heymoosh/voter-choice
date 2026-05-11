import { describe, it, expect } from "vitest";
import { lookupZip } from "@/lib/zipLookup";

describe("lookupZip", () => {
  it("returns TX for 73301", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns CA for 90210", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });

  it("returns NH for 03031", () => {
    expect(lookupZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for 86515", () => {
    const result = lookupZip("86515");
    expect(result).toBeTruthy();
    expect(result!.length).toBeGreaterThan(1);
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
  });

  it("returns null for unknown zip", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupZip("")).toBeNull();
  });
});
