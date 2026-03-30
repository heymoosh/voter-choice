import { describe, it, expect } from "vitest";
import { lookupZip, loadStateData, computeRegistrationStatuses } from "../data";

const today = new Date("2026-03-21");

describe("lookupZip", () => {
  it("returns state codes for a known TX zip", () => {
    expect(lookupZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple states for a multi-state zip", () => {
    expect(lookupZip("86515")).toEqual(["AZ", "NM"]);
  });

  it("returns null for unknown zip", () => {
    expect(lookupZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(lookupZip("")).toBeNull();
  });
});

describe("loadStateData", () => {
  it("returns TX state data", () => {
    const data = loadStateData("TX");
    expect(data?.stateCode).toBe("TX");
    expect(data?.stateName).toBe("Texas");
    expect(data?.elections.length).toBeGreaterThan(0);
  });

  it("returns null for unknown state code", () => {
    expect(loadStateData("ZZ")).toBeNull();
  });
});

describe("computeRegistrationStatuses", () => {
  it("returns allPassed=true when all deadlines are in the past", () => {
    const txData = loadStateData("TX")!;
    // TX registration deadlines are 2026-02-02, before today 2026-03-21
    const result = computeRegistrationStatuses(txData.registration, today);
    expect(result.allPassed).toBe(true);
    expect(result.online.urgency).toBe("passed");
    expect(result.byMail.urgency).toBe("passed");
    expect(result.inPerson.urgency).toBe("passed");
  });
});
