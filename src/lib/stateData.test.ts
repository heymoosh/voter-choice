import { describe, test, expect } from "vitest";
import { getStatesForZip, getStateData } from "./stateData";

describe("getStatesForZip", () => {
  test("returns TX for Texas zip 73301", () => {
    const result = getStatesForZip("73301");
    expect(result).toEqual(["TX"]);
  });

  test("returns CA for California zip 90210", () => {
    const result = getStatesForZip("90210");
    expect(result).toEqual(["CA"]);
  });

  test("returns NH for New Hampshire zip 03031", () => {
    const result = getStatesForZip("03031");
    expect(result).toEqual(["NH"]);
  });

  test("returns multiple states for multi-state zip 86515", () => {
    const result = getStatesForZip("86515");
    expect(result).toContain("AZ");
    expect(result).toContain("NM");
    expect(result?.length).toBe(2);
  });

  test("returns null for unknown zip 00000", () => {
    const result = getStatesForZip("00000");
    expect(result).toBeNull();
  });
});

describe("getStateData", () => {
  test("returns TX data", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  test("returns CA data", () => {
    const data = getStateData("CA");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("California");
  });

  test("returns NH data", () => {
    const data = getStateData("NH");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("New Hampshire");
  });

  test("returns null for unknown state code", () => {
    const data = getStateData("ZZ");
    expect(data).toBeNull();
  });
});
