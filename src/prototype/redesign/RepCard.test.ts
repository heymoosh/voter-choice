import { describe, it, expect } from "vitest";
import { getPartyMeta2, topFundingIndustries } from "./RepCard";

describe("topFundingIndustries", () => {
  it("takes the top N non-issue-PAC slices, in data order", () => {
    const donorCoalition = [
      { label: "Energy & utilities", amount: 1, percent: 28 },
      { label: "Real estate", amount: 2, percent: 22 },
      { label: "Finance & banking", amount: 3, percent: 19 },
      { label: "Construction", amount: 4, percent: 11 },
    ];
    expect(topFundingIndustries(donorCoalition)).toEqual([
      "Energy & utilities",
      "Real estate",
      "Finance & banking",
    ]);
  });

  it("excludes named issue-PAC slices", () => {
    const donorCoalition = [
      { label: "Clean Energy PAC", amount: 1, isIssuePAC: true },
      { label: "Real estate", amount: 2 },
    ];
    expect(topFundingIndustries(donorCoalition)).toEqual(["Real estate"]);
  });

  it("returns [] for null/empty donorCoalition — honest omission, no fake data", () => {
    expect(topFundingIndustries(null)).toEqual([]);
    expect(topFundingIndustries([])).toEqual([]);
  });
});

describe("getPartyMeta2", () => {
  it("renders party names through t(), not hardcoded English", () => {
    const t = (key: string) =>
      ({
        "repCard.partyRepublican": "Republicano",
        "repCard.partyDemocrat": "Demócrata",
        "repCard.partyIndependent": "Independiente",
      })[key] ?? key;

    const meta = getPartyMeta2(t);
    expect(meta.Republican.name).toBe("Republicano");
    expect(meta.Democrat.name).toBe("Demócrata");
    expect(meta.Independent.name).toBe("Independiente");
  });

  it("keeps the code/pipClass fields stable regardless of t()", () => {
    const t = (key: string) => key;
    const meta = getPartyMeta2(t);
    expect(meta.Republican).toMatchObject({ code: "R", pipClass: "rep" });
    expect(meta.Democrat).toMatchObject({ code: "D", pipClass: "dem" });
    expect(meta.Independent).toMatchObject({ code: "I", pipClass: "ind" });
  });
});
