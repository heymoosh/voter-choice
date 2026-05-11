import { describe, it, expect } from "vitest";
import { lookupState } from "../lookupState";

describe("lookupState", () => {
  it("returns TX for a Texas zip code", () => {
    expect(lookupState("73301")).toEqual(["TX"]);
  });

  it("returns CA for a California zip code", () => {
    expect(lookupState("90210")).toEqual(["CA"]);
  });

  it("returns NH for a New Hampshire zip code", () => {
    expect(lookupState("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for a multi-state zip code", () => {
    expect(lookupState("86515")).toEqual(["AZ", "NM"]);
  });

  it("returns empty array for an unknown zip code", () => {
    expect(lookupState("00000")).toEqual([]);
  });

  it("returns empty array for a zip code not in the dataset", () => {
    expect(lookupState("99999")).toEqual([]);
  });
});
