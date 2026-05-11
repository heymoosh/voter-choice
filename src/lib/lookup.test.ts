import { describe, it, expect } from "vitest";
import { zipLookupSync, findNextElection } from "./lookup";
import type { StateData } from "@/types";

describe("zipLookupSync", () => {
  it("returns single for a known TX zip code", () => {
    const result = zipLookupSync("73301");
    expect(result.type).toBe("single");
    expect(result.states).toEqual(["TX"]);
  });

  it("returns single for CA zip code", () => {
    const result = zipLookupSync("90210");
    expect(result.type).toBe("single");
    expect(result.states).toEqual(["CA"]);
  });

  it("returns single for NH zip code", () => {
    const result = zipLookupSync("03031");
    expect(result.type).toBe("single");
    expect(result.states).toEqual(["NH"]);
  });

  it("returns multi for a multi-state zip code", () => {
    const result = zipLookupSync("86515");
    expect(result.type).toBe("multi");
    expect(result.states).toContain("AZ");
    expect(result.states).toContain("NM");
    expect(result.states.length).toBe(2);
  });

  it("returns not-found for an unknown zip code", () => {
    const result = zipLookupSync("00000");
    expect(result.type).toBe("not-found");
    expect(result.states).toHaveLength(0);
  });

  it("returns not-found for a zip code with letters", () => {
    // "abcde" won't match any numeric zip
    const result = zipLookupSync("abcde");
    expect(result.type).toBe("not-found");
  });
});

describe("findNextElection", () => {
  const mockStateData: StateData = {
    stateCode: "TX",
    stateName: "Texas",
    lastUpdated: "2026-01-01",
    elections: [
      {
        id: "tx-2026-primary",
        name: "2026 Texas Primary",
        date: "2026-03-03",
        type: "primary",
        isPrimary: true,
        primaryType: "open",
      },
      {
        id: "tx-2026-general",
        name: "2026 Texas General",
        date: "2026-11-03",
        type: "general",
        isPrimary: false,
        primaryType: null,
      },
    ],
    registration: {
      online: {
        available: true,
        deadline: "2026-02-02",
        url: "https://example.com",
      },
      byMail: { deadline: "2026-02-02", sincePostmarked: true },
      inPerson: { deadline: "2026-02-02", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "https://example.com/check",
    },
    earlyVoting: {
      available: true,
      startDate: "2026-02-17",
      endDate: "2026-02-28",
      notes: null,
    },
    votingRules: {
      idRequired: true,
      acceptedIds: ["TX Driver License"],
      phonesAtPolls: "prohibited",
      phonesAtPollsDetail: "Prohibited",
      additionalRules: [],
    },
    resources: {
      stateElectionWebsite: "https://votetexas.gov",
      countyElectionLookup: "https://votetexas.gov/county",
      sampleBallotLookup: "https://votetexas.gov/ballot",
      pollingPlaceLookup: "https://votetexas.gov/poll",
    },
  };

  it("returns the next upcoming election after today", () => {
    const today = new Date("2026-01-15"); // before March primary
    const election = findNextElection(mockStateData, today);
    expect(election).not.toBeNull();
    expect(election?.id).toBe("tx-2026-primary");
  });

  it("returns the general election if the primary has passed", () => {
    const today = new Date("2026-05-01"); // after March primary
    const election = findNextElection(mockStateData, today);
    expect(election).not.toBeNull();
    expect(election?.id).toBe("tx-2026-general");
  });

  it("returns null when all elections have passed", () => {
    const today = new Date("2027-01-01"); // after all elections
    const election = findNextElection(mockStateData, today);
    expect(election).toBeNull();
  });

  it("includes an election on the same day as today", () => {
    const today = new Date("2026-03-03");
    const election = findNextElection(mockStateData, today);
    expect(election?.id).toBe("tx-2026-primary");
  });
});
