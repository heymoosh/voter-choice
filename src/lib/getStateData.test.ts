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

  // ── WY — now a confirmed Phase 2 W-batch fixture ────────────────────────

  it("returns confirmed StateElectionData for WY (Phase 2 W-batch populated)", async () => {
    const data = await getStateData("WY");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("WY");
    expect(data?.stateName).toBe("Wyoming");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("WY fixture includes at least one election", async () => {
    const data = await getStateData("WY");
    expect(data?.elections.length).toBeGreaterThan(0);
  });

  it("WY fixture has the Wyoming SoS as the state election website", async () => {
    const data = await getStateData("WY");
    expect(data?.resources.stateElectionWebsite).toContain("wyo.gov");
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

  // ── Phase 2 NE + DC batch ────────────────────────────────────────────────

  it("returns StateElectionData for ME", async () => {
    const data = await getStateData("ME");
    expect(data?.stateCode).toBe("ME");
    expect(data?.stateName).toBe("Maine");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for VT", async () => {
    const data = await getStateData("VT");
    expect(data?.stateCode).toBe("VT");
    expect(data?.stateName).toBe("Vermont");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for MA", async () => {
    const data = await getStateData("MA");
    expect(data?.stateCode).toBe("MA");
    expect(data?.stateName).toBe("Massachusetts");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for RI", async () => {
    const data = await getStateData("RI");
    expect(data?.stateCode).toBe("RI");
    expect(data?.stateName).toBe("Rhode Island");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for CT", async () => {
    const data = await getStateData("CT");
    expect(data?.stateCode).toBe("CT");
    expect(data?.stateName).toBe("Connecticut");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for NJ", async () => {
    const data = await getStateData("NJ");
    expect(data?.stateCode).toBe("NJ");
    expect(data?.stateName).toBe("New Jersey");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for DE", async () => {
    const data = await getStateData("DE");
    expect(data?.stateCode).toBe("DE");
    expect(data?.stateName).toBe("Delaware");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for MD", async () => {
    const data = await getStateData("MD");
    expect(data?.stateCode).toBe("MD");
    expect(data?.stateName).toBe("Maryland");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for PA", async () => {
    const data = await getStateData("PA");
    expect(data?.stateCode).toBe("PA");
    expect(data?.stateName).toBe("Pennsylvania");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  it("returns StateElectionData for DC", async () => {
    const data = await getStateData("DC");
    expect(data?.stateCode).toBe("DC");
    expect(data?.stateName).toBe("Washington, D.C.");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
  });

  // ── Phase 2 SE batch ─────────────────────────────────────────────────────

  it("AL has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("AL");
    expect(data?.stateCode).toBe("AL");
    expect(data?.stateName).toBe("Alabama");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("Alabama");
  });

  it("AR has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("AR");
    expect(data?.stateCode).toBe("AR");
    expect(data?.stateName).toBe("Arkansas");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("Arkansas");
  });

  it("KY has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("KY");
    expect(data?.stateCode).toBe("KY");
    expect(data?.stateName).toBe("Kentucky");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("LA has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("LA");
    expect(data?.stateCode).toBe("LA");
    expect(data?.stateName).toBe("Louisiana");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("MS has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("MS");
    expect(data?.stateCode).toBe("MS");
    expect(data?.stateName).toBe("Mississippi");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("Mississippi");
  });

  it("OK has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("OK");
    expect(data?.stateCode).toBe("OK");
    expect(data?.stateName).toBe("Oklahoma");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("Oklahoma");
  });

  it("SC has partyLockedToFirstRoundPrimary=true and hasRunoff=true", async () => {
    const data = await getStateData("SC");
    expect(data?.stateCode).toBe("SC");
    expect(data?.stateName).toBe("South Carolina");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("South Carolina");
  });

  it("TN has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("TN");
    expect(data?.stateCode).toBe("TN");
    expect(data?.stateName).toBe("Tennessee");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("VA has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("VA");
    expect(data?.stateCode).toBe("VA");
    expect(data?.stateName).toBe("Virginia");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("WV has hasRunoff=false and partyLockedToFirstRoundPrimary=false", async () => {
    const data = await getStateData("WV");
    expect(data?.stateCode).toBe("WV");
    expect(data?.stateName).toBe("West Virginia");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  // ── West + Mountain batch (Phase 2 W agent) ─────────────────────────────

  it("AK loads with stateCode and stateName and coverageStatus confirmed", async () => {
    const data = await getStateData("AK");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("AK");
    expect(data?.stateName).toBe("Alaska");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("CO loads as a universal vote-by-mail state with coverageStatus confirmed", async () => {
    const data = await getStateData("CO");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("CO");
    expect(data?.stateName).toBe("Colorado");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.voteByMail?.universal).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
  });

  it("HI loads as a universal vote-by-mail state with coverageStatus confirmed", async () => {
    const data = await getStateData("HI");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("HI");
    expect(data?.stateName).toBe("Hawaii");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.voteByMail?.universal).toBe(true);
  });

  it("ID loads with photo ID required and same-day registration", async () => {
    const data = await getStateData("ID");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("ID");
    expect(data?.stateName).toBe("Idaho");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.votingRules.idRequired).toBe(true);
    expect(data?.registration.sameDayRegistration).toBe(true);
  });

  it("MT loads with photo ID required and coverageStatus confirmed", async () => {
    const data = await getStateData("MT");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("MT");
    expect(data?.stateName).toBe("Montana");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.votingRules.idRequired).toBe(true);
  });

  it("NV loads with no ID required and coverageStatus confirmed", async () => {
    const data = await getStateData("NV");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("NV");
    expect(data?.stateName).toBe("Nevada");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.votingRules.idRequired).toBe(false);
  });

  it("OR loads as a universal vote-by-mail state with coverageStatus confirmed", async () => {
    const data = await getStateData("OR");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("OR");
    expect(data?.stateName).toBe("Oregon");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.voteByMail?.universal).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
  });

  it("UT loads as a universal vote-by-mail state with coverageStatus confirmed", async () => {
    const data = await getStateData("UT");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("UT");
    expect(data?.stateName).toBe("Utah");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.voteByMail?.universal).toBe(true);
  });

  it("WA loads as a universal vote-by-mail state with no ID required", async () => {
    const data = await getStateData("WA");
    expect(data).not.toBeNull();
    expect(data?.stateCode).toBe("WA");
    expect(data?.stateName).toBe("Washington");
    expect(data?.coverageStatus).toBe("confirmed");
    expect(data?.voteByMail?.universal).toBe(true);
    expect(data?.votingRules.idRequired).toBe(false);
  });

  // ── Phase 2 MW batch ─────────────────────────────────────────────────────

  it("IL loads with required fields and no runoff", async () => {
    const data = await getStateData("IL");
    expect(data?.stateCode).toBe("IL");
    expect(data?.stateName).toBe("Illinois");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("IN loads with required fields and no runoff", async () => {
    const data = await getStateData("IN");
    expect(data?.stateCode).toBe("IN");
    expect(data?.stateName).toBe("Indiana");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("IA loads with same-day registration and no runoff", async () => {
    const data = await getStateData("IA");
    expect(data?.stateCode).toBe("IA");
    expect(data?.stateName).toBe("Iowa");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.registration.sameDayRegistration).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("KS loads with required fields and no runoff", async () => {
    const data = await getStateData("KS");
    expect(data?.stateCode).toBe("KS");
    expect(data?.stateName).toBe("Kansas");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("MI loads with same-day registration and no runoff", async () => {
    const data = await getStateData("MI");
    expect(data?.stateCode).toBe("MI");
    expect(data?.stateName).toBe("Michigan");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.registration.sameDayRegistration).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("MN loads with same-day registration and no runoff", async () => {
    const data = await getStateData("MN");
    expect(data?.stateCode).toBe("MN");
    expect(data?.stateName).toBe("Minnesota");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.registration.sameDayRegistration).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("MO loads with required fields and no runoff", async () => {
    const data = await getStateData("MO");
    expect(data?.stateCode).toBe("MO");
    expect(data?.stateName).toBe("Missouri");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("NE loads with nonpartisan-legislature annotation and no runoff", async () => {
    const data = await getStateData("NE");
    expect(data?.stateCode).toBe("NE");
    expect(data?.stateName).toBe("Nebraska");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    // Nebraska Legislature is nonpartisan; no party lock applies
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("ND loads with no-voter-registration annotation (online.available=false)", async () => {
    const data = await getStateData("ND");
    expect(data?.stateCode).toBe("ND");
    expect(data?.stateName).toBe("North Dakota");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    // ND has no voter registration; online registration should be unavailable
    expect(data?.registration.online.available).toBe(false);
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("OH loads with required fields and no runoff", async () => {
    const data = await getStateData("OH");
    expect(data?.stateCode).toBe("OH");
    expect(data?.stateName).toBe("Ohio");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });

  it("SD has party-locked runoff with ruleExplanation containing 'South Dakota'", async () => {
    const data = await getStateData("SD");
    expect(data?.stateCode).toBe("SD");
    expect(data?.stateName).toBe("South Dakota");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.runoffRules.hasRunoff).toBe(true);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(true);
    expect(data?.runoffRules.ruleExplanation).toContain("South Dakota");
  });

  it("WI loads with same-day registration and no runoff", async () => {
    const data = await getStateData("WI");
    expect(data?.stateCode).toBe("WI");
    expect(data?.stateName).toBe("Wisconsin");
    expect(data?.coverageStatus).not.toBe("unconfirmed");
    expect(data?.registration.sameDayRegistration).toBe(true);
    expect(data?.runoffRules.hasRunoff).toBe(false);
    expect(data?.runoffRules.partyLockedToFirstRoundPrimary).toBe(false);
  });
});
