import { describe, it, expect } from "vitest";
import type {
  StateElectionData,
  Election,
  VotingRules,
} from "@/types/election";

describe("Election type", () => {
  it("accepts all valid election types", () => {
    const types: Election["type"][] = [
      "primary",
      "general",
      "runoff",
      "special",
    ];
    for (const type of types) {
      const election: Election = {
        id: "test",
        name: "Test Election",
        date: "2026-11-03",
        type,
        isPrimary: type === "primary",
        primaryType: null,
      };
      expect(election.type).toBe(type);
    }
  });

  it("accepts all valid primary types", () => {
    const primaryTypes: Election["primaryType"][] = [
      "open",
      "closed",
      "semi-closed",
      "semi-open",
      null,
    ];
    for (const primaryType of primaryTypes) {
      const election: Election = {
        id: "test",
        name: "Test",
        date: "2026-11-03",
        type: "primary",
        isPrimary: true,
        primaryType,
      };
      expect(election.primaryType).toBe(primaryType);
    }
  });
});

describe("VotingRules type", () => {
  it("accepts all valid phonesAtPolls values", () => {
    const values: VotingRules["phonesAtPolls"][] = [
      "prohibited",
      "allowed",
      "varies",
    ];
    for (const v of values) {
      const rules: VotingRules = {
        idRequired: false,
        phonesAtPolls: v,
      };
      expect(rules.phonesAtPolls).toBe(v);
    }
  });

  it("accepts idRequired true with acceptedIds", () => {
    const rules: VotingRules = {
      idRequired: true,
      acceptedIds: ["driver's license", "passport"],
      phonesAtPolls: "allowed",
    };
    expect(rules.acceptedIds).toHaveLength(2);
  });
});

describe("StateElectionData structure", () => {
  it("has required fields for a minimal state", () => {
    const minimal: StateElectionData = {
      stateCode: "XX",
      stateName: "Test State",
      lastUpdated: "2026-01-01",
      elections: [],
      registration: {
        online: { deadline: null },
        byMail: { deadline: null },
        inPerson: { deadline: null },
        sameDayRegistration: false,
        registrationCheckUrl: "https://example.com",
      },
      earlyVoting: {
        available: false,
        startDate: null,
        endDate: null,
      },
      votingRules: {
        idRequired: false,
        phonesAtPolls: "allowed",
      },
      resources: {
        stateElectionWebsite: "https://example.com",
        countyElectionLookup: "https://example.com",
        sampleBallotLookup: "https://example.com",
        pollingPlaceLookup: "https://example.com",
      },
    };
    expect(minimal.stateCode).toBe("XX");
    expect(minimal.elections).toHaveLength(0);
    expect(minimal.registration.sameDayRegistration).toBe(false);
  });
});
