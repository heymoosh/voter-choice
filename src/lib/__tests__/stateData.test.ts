import { describe, it, expect } from "vitest";
import { getStatesForZip, getStateData } from "../stateData";

describe("getStatesForZip", () => {
  it("returns TX for a Texas zip code", () => {
    expect(getStatesForZip("73301")).toEqual(["TX"]);
  });

  it("returns CA for a California zip code", () => {
    expect(getStatesForZip("90210")).toEqual(["CA"]);
  });

  it("returns NH for a New Hampshire zip code", () => {
    expect(getStatesForZip("03301")).toEqual(["NH"]);
  });

  it("returns multiple states for a multi-state zip code", () => {
    const result = getStatesForZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result).toHaveLength(2);
  });

  it("returns empty array for unknown zip code", () => {
    expect(getStatesForZip("00000")).toEqual([]);
  });

  it("returns empty array for a zip with different length", () => {
    expect(getStatesForZip("1234")).toEqual([]);
  });
});

describe("getStateData", () => {
  it("returns Texas data for TX", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  it("returns California data for CA", () => {
    const data = getStateData("CA");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("California");
  });

  it("returns New Hampshire data for NH", () => {
    const data = getStateData("NH");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("New Hampshire");
  });

  it("returns null for unknown state code", () => {
    expect(getStateData("ZZ")).toBeNull();
  });

  it("is case-insensitive", () => {
    const lower = getStateData("tx");
    const upper = getStateData("TX");
    expect(lower?.stateName).toBe(upper?.stateName);
  });

  it("Texas data has correct elections structure", () => {
    const data = getStateData("TX");
    expect(data?.elections).toBeDefined();
    expect(Array.isArray(data?.elections)).toBe(true);
    expect(data!.elections.length).toBeGreaterThan(0);
  });

  it("Texas data has required registration fields", () => {
    const data = getStateData("TX");
    expect(data?.registration.online).toBeDefined();
    expect(data?.registration.byMail).toBeDefined();
    expect(data?.registration.inPerson).toBeDefined();
  });
});
