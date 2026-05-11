import { describe, it, expect } from "vitest";
import { lookupState, isValidZip } from "../zipLookup";

describe("lookupState", () => {
  it("returns TX for a Texas zip code", () => {
    const result = lookupState("73301");
    expect(result).toEqual(["TX"]);
  });

  it("returns CA for a California zip code", () => {
    const result = lookupState("90210");
    expect(result).toEqual(["CA"]);
  });

  it("returns NH for a New Hampshire zip code", () => {
    const result = lookupState("03031");
    expect(result).toEqual(["NH"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    const result = lookupState("86515");
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThan(1);
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
  });

  it("returns null for an unknown zip code", () => {
    const result = lookupState("00000");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", () => {
    const result = lookupState("");
    expect(result).toBeNull();
  });
});

describe("isValidZip", () => {
  it("accepts a valid 5-digit zip", () => {
    expect(isValidZip("73301")).toBe(true);
  });

  it("accepts a zip with leading zeros", () => {
    expect(isValidZip("03031")).toBe(true);
  });

  it("rejects alphabetic input", () => {
    expect(isValidZip("abcde")).toBe(false);
  });

  it("rejects too-short input", () => {
    expect(isValidZip("123")).toBe(false);
  });

  it("rejects too-long input", () => {
    expect(isValidZip("123456")).toBe(false);
  });

  it("rejects mixed alphanumeric", () => {
    expect(isValidZip("1234a")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidZip("")).toBe(false);
  });
});
