import { describe, it, expect } from "vitest";
import {
  getStateCodesForZip,
  getStateData,
  findNextElection,
} from "../stateData";
import { Election } from "../types";

describe("getStateCodesForZip", () => {
  it("returns Texas for 73301", () => {
    expect(getStateCodesForZip("73301")).toEqual(["TX"]);
  });

  it("returns California for 90210", () => {
    expect(getStateCodesForZip("90210")).toEqual(["CA"]);
  });

  it("returns New Hampshire for 03031", () => {
    expect(getStateCodesForZip("03031")).toEqual(["NH"]);
  });

  it("returns multiple states for multi-state zip 86515", () => {
    const codes = getStateCodesForZip("86515");
    expect(codes).toContain("AZ");
    expect(codes).toContain("NM");
    expect(codes.length).toBe(2);
  });

  it("returns empty array for unknown zip", () => {
    expect(getStateCodesForZip("00000")).toEqual([]);
  });
});

describe("getStateData", () => {
  it("loads Texas state data", () => {
    const data = getStateData("TX");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("Texas");
    expect(data?.stateCode).toBe("TX");
  });

  it("loads California state data", () => {
    const data = getStateData("CA");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("California");
  });

  it("loads New Hampshire state data", () => {
    const data = getStateData("NH");
    expect(data).not.toBeNull();
    expect(data?.stateName).toBe("New Hampshire");
  });

  it("returns null for unknown state", () => {
    expect(getStateData("ZZ")).toBeNull();
  });
});

describe("findNextElection", () => {
  const elections: Election[] = [
    {
      id: "past",
      name: "Past Election",
      date: "2026-03-03",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
    {
      id: "upcoming",
      name: "Upcoming Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "runoff",
      name: "Runoff Election",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
  ];

  const TODAY = new Date(2026, 4, 11); // May 11, 2026

  it("returns the next upcoming election", () => {
    const result = findNextElection(elections, TODAY);
    expect(result?.id).toBe("runoff");
    expect(result?.date).toBe("2026-05-26");
  });

  it("returns null when no upcoming elections", () => {
    const pastElections: Election[] = [
      {
        id: "old",
        name: "Old Election",
        date: "2025-11-03",
        type: "general",
        isPrimary: false,
        primaryType: null,
      },
    ];
    const result = findNextElection(pastElections, TODAY);
    expect(result).toBeNull();
  });

  it("includes election on same day as today", () => {
    const todayElections: Election[] = [
      {
        id: "today",
        name: "Today's Election",
        date: "2026-05-11",
        type: "primary",
        isPrimary: true,
        primaryType: "open",
      },
    ];
    const result = findNextElection(todayElections, TODAY);
    expect(result?.id).toBe("today");
  });

  it("returns null for empty elections array", () => {
    expect(findNextElection([], TODAY)).toBeNull();
  });
});
