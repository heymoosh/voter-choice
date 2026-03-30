import { describe, it, expect } from "vitest";
import { getStateData } from "./getStateData";

describe("getStateData", () => {
  it("returns StateElectionData for a known state code TX", async () => {
    const data = await getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("TX");
    expect(data?.stateName).toBe("Texas");
    expect(data?.elections).toBeInstanceOf(Array);
    expect(data?.elections.length).toBeGreaterThan(0);
  });

  it("returns StateElectionData for CA", async () => {
    const data = await getStateData("CA");
    expect(data?.stateCode).toBe("CA");
    expect(data?.stateName).toBe("California");
  });

  it("returns StateElectionData for NH", async () => {
    const data = await getStateData("NH");
    expect(data?.stateCode).toBe("NH");
  });

  it("returns null for an unknown state code", async () => {
    const data = await getStateData("XX");
    expect(data).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const data = await getStateData("");
    expect(data).toBeNull();
  });

  it("returns data with all required fields for TX", async () => {
    const data = await getStateData("TX");
    expect(data?.registration).toBeDefined();
    expect(data?.earlyVoting).toBeDefined();
    expect(data?.votingRules).toBeDefined();
    expect(data?.resources).toBeDefined();
  });
});
