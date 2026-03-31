import { describe, it, expect } from "vitest";
import { getStateData } from "./getStateData";

describe("getStateData", () => {
  it("returns Texas data for TX", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("TX");
    expect(data?.stateName).toBe("Texas");
    expect(data?.elections.length).toBeGreaterThan(0);
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

  it("returns Arizona data for AZ", () => {
    const data = getStateData("AZ");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Arizona");
  });

  it("returns New Mexico data for NM", () => {
    const data = getStateData("NM");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("New Mexico");
  });

  it("is case-insensitive", () => {
    const data = getStateData("tx");
    expect(data?.stateCode).toBe("TX");
  });

  it("returns null for an unknown state code", () => {
    expect(getStateData("ZZ")).toBeNull();
  });
});
