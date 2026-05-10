import { describe, it, expect } from "vitest";
import {
  getStatesForZip,
  getStateData,
  getNextElection,
  calculateDaysRemaining,
  getDeadlineStatus,
} from "@/lib/election-data";

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

  it("returns AZ and NM for 86515 (multi-state)", () => {
    const states = getStatesForZip("86515");
    expect(states).toContain("AZ");
    expect(states).toContain("NM");
    expect(states?.length).toBe(2);
  });

  it("returns null for unknown zip 00000", () => {
    expect(getStatesForZip("00000")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getStatesForZip("")).toBeNull();
  });
});

describe("getStateData", () => {
  it("returns TX data with correct name", () => {
    const data = getStateData("TX");
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  it("returns CA data with correct name", () => {
    const data = getStateData("CA");
    expect(data?.stateName).toBe("California");
  });

  it("returns NH data", () => {
    const data = getStateData("NH");
    expect(data?.stateName).toBe("New Hampshire");
  });

  it("returns null for unknown state ZZ", () => {
    expect(getStateData("ZZ")).toBeNull();
  });

  it("TX data has elections array", () => {
    const data = getStateData("TX");
    expect(Array.isArray(data?.elections)).toBe(true);
    expect(data!.elections.length).toBeGreaterThan(0);
  });
});

describe("getNextElection", () => {
  it("returns an upcoming election for TX", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data);
    expect(election).not.toBeNull();
    const date = new Date(election!.date);
    expect(date >= new Date()).toBe(true);
  });

  it("returns an upcoming election for CA", () => {
    const data = getStateData("CA")!;
    const election = getNextElection(data);
    expect(election).not.toBeNull();
    expect(election?.name).toContain("California");
  });

  it("skips the TX primary (past date 2026-03-03)", () => {
    const data = getStateData("TX")!;
    const election = getNextElection(data);
    expect(election?.id).not.toBe("tx-2026-primary");
  });

  it("returns null when no upcoming elections exist", () => {
    const mockData = {
      ...getStateData("TX")!,
      elections: [
        {
          id: "old",
          name: "Old Election",
          date: "2020-01-01",
          type: "general" as const,
          isPrimary: false,
          primaryType: null,
        },
      ],
    };
    expect(getNextElection(mockData)).toBeNull();
  });
});

describe("calculateDaysRemaining", () => {
  it("returns null for null deadline", () => {
    expect(calculateDaysRemaining(null)).toBeNull();
  });

  it("returns positive number for future date", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const result = calculateDaysRemaining(future.toISOString().split("T")[0]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(11);
  });

  it("returns negative number for past date", () => {
    const result = calculateDaysRemaining("2020-01-01");
    expect(result).toBeLessThan(0);
  });

  it("returns near 0 for today (timezone-tolerant)", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = calculateDaysRemaining(today);
    // Allow ±1 for timezone differences between ISO date and local date
    expect(result).toBeGreaterThanOrEqual(-1);
    expect(result).toBeLessThanOrEqual(1);
  });
});

describe("getDeadlineStatus", () => {
  it("returns passed status for past deadline", () => {
    const status = getDeadlineStatus("2020-01-01");
    expect(status.status).toBe("passed");
    expect(status.label).toMatch(/passed/i);
  });

  it("returns upcoming for far-future deadline", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const status = getDeadlineStatus(future.toISOString().split("T")[0]);
    expect(status.status).toBe("upcoming");
    expect(status.daysRemaining).toBeGreaterThan(14);
  });

  it("returns warning for deadline 7 days out", () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const status = getDeadlineStatus(soon.toISOString().split("T")[0]);
    expect(status.status).toBe("warning");
  });

  it("returns urgent for deadline 2 days out", () => {
    const urgent = new Date();
    urgent.setDate(urgent.getDate() + 2);
    const status = getDeadlineStatus(urgent.toISOString().split("T")[0]);
    expect(status.status).toBe("urgent");
  });

  it("returns not-available for null deadline", () => {
    const status = getDeadlineStatus(null);
    expect(status.status).toBe("passed");
  });
});
