import { describe, it, expect } from "vitest";
import { lookupZip } from "./lookupZip";

describe("lookupZip", () => {
  it("returns TX for a known Texas zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns CA for a known California zip", () => {
    expect(lookupZip("90210")).toEqual(["CA"]);
  });

  it("returns NH for a known New Hampshire zip", () => {
    expect(lookupZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for a border zip", () => {
    const result = lookupZip("86515");
    expect(result).not.toBeNull();
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result!.length).toBe(2);
  });

  it("returns null for an unknown zip", () => {
    expect(lookupZip("00000")).toBeNull();
    expect(lookupZip("99999")).toBeNull();
  });
});
