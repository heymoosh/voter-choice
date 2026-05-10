import { describe, it, expect } from "vitest";
import { validateZip, lookupZip, getNextElection } from "@/lib/election-data";
import type { Election } from "@/types/election";

describe("validateZip", () => {
  it("accepts a valid 5-digit zip", () => {
    expect(validateZip("73301")).toBe(true);
  });

  it("accepts leading-zero zip", () => {
    expect(validateZip("03031")).toBe(true);
  });

  it("rejects 3-digit input", () => {
    expect(validateZip("123")).toBe(false);
  });

  it("rejects 6-digit input", () => {
    expect(validateZip("123456")).toBe(false);
  });

  it("rejects alphabetic input", () => {
    expect(validateZip("abcde")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateZip("")).toBe(false);
  });

  it("rejects zip with spaces", () => {
    expect(validateZip("123 5")).toBe(false);
  });
});

describe("lookupZip", () => {
  it("returns single state for TX zip", () => {
    const result = lookupZip("73301");
    expect(result).toEqual({ status: "single", stateCode: "TX" });
  });

  it("returns single state for CA zip", () => {
    const result = lookupZip("90210");
    expect(result).toEqual({ status: "single", stateCode: "CA" });
  });

  it("returns single state for NH zip", () => {
    const result = lookupZip("03031");
    expect(result).toEqual({ status: "single", stateCode: "NH" });
  });

  it("returns multi for 86515 (AZ/NM)", () => {
    const result = lookupZip("86515");
    expect(result.status).toBe("multi");
    if (result.status === "multi") {
      expect(result.stateCodes).toContain("AZ");
      expect(result.stateCodes).toContain("NM");
    }
  });

  it("returns not-found for unknown zip", () => {
    expect(lookupZip("00000")).toEqual({ status: "not-found" });
  });

  it("returns invalid for alphabetic input", () => {
    expect(lookupZip("abcde")).toEqual({ status: "invalid" });
  });

  it("returns invalid for empty string", () => {
    expect(lookupZip("")).toEqual({ status: "invalid" });
  });

  it("returns invalid for short input", () => {
    expect(lookupZip("123")).toEqual({ status: "invalid" });
  });
});

describe("getNextElection", () => {
  const elections: Election[] = [
    {
      id: "e1",
      name: "2026 Primary",
      date: "2026-03-03",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
    {
      id: "e2",
      name: "2026 Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "e3",
      name: "2026 General",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ];

  it("returns the next upcoming election when today is before all", () => {
    const result = getNextElection(elections, "2026-01-01");
    expect(result.id).toBe("e1");
  });

  it("returns the correct next election when first is past", () => {
    const result = getNextElection(elections, "2026-05-10");
    expect(result.id).toBe("e2");
  });

  it("returns the general when only it is future", () => {
    const result = getNextElection(elections, "2026-06-01");
    expect(result.id).toBe("e3");
  });

  it("returns most recent past election when all are past", () => {
    const result = getNextElection(elections, "2027-01-01");
    expect(result.id).toBe("e3");
  });
});
