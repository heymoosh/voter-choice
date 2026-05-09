import { describe, it, expect } from "vitest";
import { getStateData, getFallbackStateData } from "./getStateData";

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

  // ── runoffRules per-state tests ──────────────────────────────────────────

  it("TX has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("TX");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toBeTruthy();
    // Preserve TX copy verbatim — the word "Texas" must appear
    expect(data?.runoffRules.ruleExplanation).toContain("Texas");
  });

  it("GA has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("GA");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toBeTruthy();
    expect(data?.runoffRules.ruleExplanation).toContain("Georgia");
  });

  it("NC has hasRunoff=true but partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("NC");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("CA has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("CA");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("NY has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("NY");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("FL has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("FL");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  // ── All six v2 states load with required fields ──────────────────────────

  const v2States = ["TX", "CA", "NY", "FL", "GA", "NC"] as const;
  v2States.forEach((code) => {
    it(`${code} loads with all required StateElectionData fields`, async () => {
      const data = await getStateData(code);
      expect(data).not.toBeNull();
      expect(data?.stateCode).toBe(code);
      expect(data?.stateName).toBeTruthy();
      expect(data?.elections.length).toBeGreaterThan(0);
      expect(data?.registration).toBeDefined();
      expect(data?.earlyVoting).toBeDefined();
      expect(data?.votingRules).toBeDefined();
      expect(data?.resources).toBeDefined();
      expect(data?.runoffRules).toBeDefined();
      // Confirmed states should not have "unconfirmed" status
      expect(data?.coverageStatus).not.toBe("unconfirmed");
    });
  });

  // ── Fallback for unpopulated states ─────────────────────────────────────

  it("returns a fallback with coverageStatus=unconfirmed for an unpopulated state like WY", async () => {
    const data = await getStateData("WY");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("WY");
    expect(data?.stateName).toBe("Wyoming");
    expect(data?.coverageStatus).toBe("unconfirmed");
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("fallback for WY includes a general election in the future", async () => {
    const data = await getStateData("WY");
    expect(data?.elections.length).toBeGreaterThan(0);
    expect(data?.elections[0].type).toBe("general");
  });

  it("fallback for WY has vote.gov as the state election website", async () => {
    const data = await getStateData("WY");
    expect(data?.resources.stateElectionWebsite).toContain("vote.gov");
  });

  it("getFallbackStateData returns correct stateName for WY", () => {
    const data = getFallbackStateData("WY");
    expect(data.stateName).toBe("Wyoming");
    expect(data.coverageStatus).toBe("unconfirmed");
  });

  it("getFallbackStateData for unknown code falls back to the code itself as stateName", () => {
    const data = getFallbackStateData("ZZ");
    expect(data.stateName).toBe("ZZ");
    expect(data.coverageStatus).toBe("unconfirmed");
  });

  it("returns null (not a fallback) for a completely invalid/non-US code XX", async () => {
    const data = await getStateData("XX");
    expect(data).toBeNull();
  });
});
