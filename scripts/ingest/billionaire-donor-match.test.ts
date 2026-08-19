import { describe, expect, it } from "vitest";
import { parseFecDate, resolveCommittee } from "./billionaire-donor-match";

describe("parseFecDate", () => {
  it("parses MMDDYYYY into ISO YYYY-MM-DD", () => {
    expect(parseFecDate("01312026")).toBe("2026-01-31");
  });

  it("returns null for blank or malformed input", () => {
    expect(parseFecDate("")).toBeNull();
    expect(parseFecDate("2026")).toBeNull();
    expect(parseFecDate("13312026")).toBeNull(); // month 13
    expect(parseFecDate("01402026")).toBeNull(); // day 40
  });

  it("returns null for a range-valid but impossible calendar date", () => {
    // FEC bulk files do contain garbage dates like this — Date.UTC would
    // silently normalize it to March 3 rather than reject it, so the
    // roundtrip check is load-bearing, not redundant with the range check.
    expect(parseFecDate("02312026")).toBeNull(); // Feb 31 doesn't exist
  });
});

describe("resolveCommittee", () => {
  const candidateCommittees = new Map([["C001", "candidate-uuid-1"]]);
  const pacCommittees = new Set(["C002"]);

  it("resolves a candidate's principal committee", () => {
    expect(
      resolveCommittee("C001", candidateCommittees, pacCommittees),
    ).toEqual({ type: "candidate", candidateId: "candidate-uuid-1" });
  });

  it("resolves an active PAC committee with candidateId null", () => {
    expect(
      resolveCommittee("C002", candidateCommittees, pacCommittees),
    ).toEqual({ type: "pac", candidateId: null });
  });

  it("returns null for an untracked committee", () => {
    expect(
      resolveCommittee("C999", candidateCommittees, pacCommittees),
    ).toBeNull();
  });

  it("prefers the candidate mapping if a committee id somehow appears in both", () => {
    const both = new Set(["C001"]);
    expect(resolveCommittee("C001", candidateCommittees, both)).toEqual({
      type: "candidate",
      candidateId: "candidate-uuid-1",
    });
  });
});
