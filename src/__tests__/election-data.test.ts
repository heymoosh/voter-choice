import { describe, it, expect } from "vitest";
import { getStatesForZip } from "@/lib/election-data";

describe("getStatesForZip", () => {
  it("returns TX for 73301", () => {
    expect(getStatesForZip("73301")).toEqual(["TX"]);
  });

  it("returns CA for 90210", () => {
    expect(getStatesForZip("90210")).toEqual(["CA"]);
  });

  it("returns NH for 03031", () => {
    expect(getStatesForZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for multi-state zip 86515", () => {
    const result = getStatesForZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns null for unknown zip code", () => {
    expect(getStatesForZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getStatesForZip("")).toBeNull();
  });

  it("returns AZ for 85001", () => {
    expect(getStatesForZip("85001")).toEqual(["AZ"]);
  });

  it("returns FL for 32801", () => {
    expect(getStatesForZip("32801")).toEqual(["FL"]);
  });

  it("returns GA for 30301", () => {
    expect(getStatesForZip("30301")).toEqual(["GA"]);
  });

  it("returns NC for 27601", () => {
    expect(getStatesForZip("27601")).toEqual(["NC"]);
  });

  it("returns NM for 87101", () => {
    expect(getStatesForZip("87101")).toEqual(["NM"]);
  });

  it("returns NY for 10001", () => {
    expect(getStatesForZip("10001")).toEqual(["NY"]);
  });
});
