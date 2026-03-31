import { describe, it, expect } from "vitest";
import type {
  StateElectionData,
  Election,
  Registration,
  VotingRules,
  Resources,
  DeadlineStatus,
} from "../lib/types";
import txData from "../data/states/TX.json";
import caData from "../data/states/CA.json";
import nhData from "../data/states/NH.json";

describe("TypeScript Type Definitions", () => {
  it("TX.json conforms to StateElectionData interface", () => {
    const tx: StateElectionData = txData as StateElectionData;
    expect(tx.stateCode).toBe("TX");
    expect(tx.stateName).toBe("Texas");
    expect(tx.lastUpdated).toBe("2026-03-01");
    expect(tx.elections).toBeInstanceOf(Array);
    expect(tx.elections.length).toBeGreaterThan(0);
    expect(tx.registration).toBeDefined();
    expect(tx.earlyVoting).toBeDefined();
    expect(tx.votingRules).toBeDefined();
    expect(tx.resources).toBeDefined();
  });

  it("CA.json conforms to StateElectionData interface", () => {
    const ca: StateElectionData = caData as StateElectionData;
    expect(ca.stateCode).toBe("CA");
    expect(ca.stateName).toBe("California");
    expect(ca.elections).toBeInstanceOf(Array);
    expect(ca.registration.sameDayRegistration).toBe(true);
  });

  it("NH.json conforms to StateElectionData interface", () => {
    const nh: StateElectionData = nhData as StateElectionData;
    expect(nh.stateCode).toBe("NH");
    expect(nh.stateName).toBe("New Hampshire");
    expect(nh.earlyVoting.available).toBe(false);
  });

  it("Election interface has required fields", () => {
    const election: Election = {
      id: "test-election",
      name: "Test Election",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    };
    expect(election.id).toBe("test-election");
    expect(election.type).toBe("general");
    expect(election.primaryType).toBeNull();
  });

  it("DeadlineStatus type accepts valid values", () => {
    const statuses: DeadlineStatus[] = ["safe", "warning", "urgent", "passed"];
    expect(statuses).toHaveLength(4);
    statuses.forEach((s) => {
      expect(["safe", "warning", "urgent", "passed"]).toContain(s);
    });
  });

  it("Registration interface handles all methods", () => {
    const reg: Registration = {
      online: {
        available: true,
        deadline: "2026-02-02",
        url: "https://example.com",
      },
      byMail: { deadline: "2026-02-02", sincePostmarked: true },
      inPerson: { deadline: "2026-02-02", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "https://example.com/check",
    };
    expect(reg.online.available).toBe(true);
    expect(reg.byMail.sincePostmarked).toBe(true);
    expect(reg.sameDayRegistration).toBe(false);
  });

  it("VotingRules interface handles all phone policies", () => {
    const policies: VotingRules["phonesAtPolls"][] = [
      "prohibited",
      "allowed",
      "varies",
    ];
    expect(policies).toHaveLength(3);
  });

  it("Resources interface has all required URLs", () => {
    const resources: Resources = {
      stateElectionWebsite: "https://example.com",
      countyElectionLookup: "https://example.com/county",
      sampleBallotLookup: "https://example.com/ballot",
      pollingPlaceLookup: "https://example.com/polling",
    };
    expect(Object.keys(resources)).toHaveLength(4);
  });
});
