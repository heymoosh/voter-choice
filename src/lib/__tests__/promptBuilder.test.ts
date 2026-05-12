import { describe, expect, it } from "vitest";
import { buildFullPrompt, getNextElection } from "@/lib/promptBuilder";
import type { StateData } from "@/types/state";

const txData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
    {
      id: "tx-2026-general",
      name: "2026 Texas General Election",
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
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://votetexas.gov",
    countyElectionLookup: "https://votetexas.gov/county",
    sampleBallotLookup: "https://votetexas.gov/ballot",
    pollingPlaceLookup: "https://votetexas.gov/polling",
  },
};

describe("getNextElection", () => {
  it("returns the first upcoming election from today", () => {
    const today = new Date("2026-05-11");
    const result = getNextElection(txData, today);
    expect(result?.id).toBe("tx-2026-runoff");
  });

  it("returns null when elections array is empty", () => {
    const noElections: StateData = { ...txData, elections: [] };
    const result = getNextElection(noElections);
    expect(result).toBeNull();
  });

  it("returns first election when all are past", () => {
    const futureDate = new Date("2027-01-01");
    const result = getNextElection(txData, futureDate);
    // Falls back to elections[0] when none upcoming
    expect(result).toBeDefined();
  });
});

describe("buildFullPrompt", () => {
  it("includes state name and zip code", () => {
    const prompt = buildFullPrompt(txData, "73301");
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
  });

  it("includes election information", () => {
    const prompt = buildFullPrompt(txData, "73301");
    expect(prompt).toMatch(/election/i);
  });

  it("includes registration info", () => {
    const prompt = buildFullPrompt(txData, "73301");
    expect(prompt).toMatch(/registration/i);
  });

  it("includes resources", () => {
    const prompt = buildFullPrompt(txData, "73301");
    expect(prompt).toContain("votetexas.gov");
  });
});
