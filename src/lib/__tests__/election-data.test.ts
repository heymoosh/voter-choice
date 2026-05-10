import { describe, it, expect, vi } from "vitest";
import {
  getStatesForZip,
  isMultiStateZip,
  formatElectionDate,
} from "../election-data";

vi.mock("@/data/zip-to-state.json", () => ({
  default: {
    "73301": ["TX"],
    "90210": ["CA"],
    "86515": ["AZ", "NM"],
    "03031": ["NH"],
  },
}));

describe("getStatesForZip", () => {
  it("returns single state for single-state zip", () => {
    expect(getStatesForZip("73301")).toEqual(["TX"]);
  });

  it("returns multiple states for multi-state zip", () => {
    expect(getStatesForZip("86515")).toEqual(["AZ", "NM"]);
  });

  it("returns empty array for unknown zip", () => {
    expect(getStatesForZip("00000")).toEqual([]);
  });

  it("returns California for 90210", () => {
    expect(getStatesForZip("90210")).toEqual(["CA"]);
  });
});

describe("isMultiStateZip", () => {
  it("returns true for multi-state zip", () => {
    expect(isMultiStateZip("86515")).toBe(true);
  });

  it("returns false for single-state zip", () => {
    expect(isMultiStateZip("73301")).toBe(false);
  });

  it("returns false for unknown zip", () => {
    expect(isMultiStateZip("99999")).toBe(false);
  });
});

describe("formatElectionDate", () => {
  it("formats a date string to long form", () => {
    const result = formatElectionDate("2026-11-03");
    expect(result).toContain("2026");
    expect(result).toContain("November");
  });

  it("includes the day of week", () => {
    const result = formatElectionDate("2026-11-03");
    expect(result).toMatch(/Tuesday/i);
  });
});
