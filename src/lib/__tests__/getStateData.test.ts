import { describe, it, expect } from "vitest";
import { getStateData } from "../getStateData";

describe("getStateData", () => {
  it("returns Texas state data for TX", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  it("returns California state data for CA", () => {
    const data = getStateData("CA");
    expect(data?.stateName).toBe("California");
  });

  it("returns null for unknown state code", () => {
    expect(getStateData("ZZ")).toBeNull();
  });

  it("returns elections array", () => {
    const data = getStateData("TX");
    expect(Array.isArray(data?.elections)).toBe(true);
    expect(data!.elections.length).toBeGreaterThan(0);
  });
});
