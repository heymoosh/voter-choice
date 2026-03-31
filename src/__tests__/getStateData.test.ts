import { describe, it, expect } from "vitest";
import { getStateData } from "../lib/getStateData";

describe("getStateData", () => {
  it("loads TX data correctly", async () => {
    const data = await getStateData("TX");
    expect(data).not.toBeNull();
    expect(data!.stateCode).toBe("TX");
    expect(data!.stateName).toBe("Texas");
    expect(data!.elections.length).toBeGreaterThan(0);
  });

  it("loads CA data correctly", async () => {
    const data = await getStateData("CA");
    expect(data).not.toBeNull();
    expect(data!.stateCode).toBe("CA");
    expect(data!.stateName).toBe("California");
  });

  it("loads NH data correctly", async () => {
    const data = await getStateData("NH");
    expect(data).not.toBeNull();
    expect(data!.stateCode).toBe("NH");
    expect(data!.stateName).toBe("New Hampshire");
  });

  it("returns null for unknown state code", async () => {
    const data = await getStateData("XX");
    expect(data).toBeNull();
  });

  it("returns null for empty string", async () => {
    const data = await getStateData("");
    expect(data).toBeNull();
  });
});
