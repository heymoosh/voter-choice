import { describe, it, expect } from "vitest";
import { generatePrompt } from "../generatePrompt";
import type { StateElectionData } from "../types";

const TX_DATA: StateElectionData = {
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
    registrationCheckUrl: "https://example.com",
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
    phonesAtPollsDetail:
      "Texas law prohibits wireless communication devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

describe("generatePrompt", () => {
  const TODAY = new Date(2026, 4, 11); // May 11, 2026

  it("includes the state name", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt).toContain("Texas");
  });

  it("includes the zip code", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt).toContain("73301");
  });

  it("includes election information", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt.toLowerCase()).toContain("election");
  });

  it("includes registration deadline information", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt.toLowerCase()).toContain("registration");
  });

  it("includes the sample ballot link", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt).toContain("votetexas.gov");
  });

  it("includes voter ID information", () => {
    const prompt = generatePrompt(TX_DATA, "73301", TODAY);
    expect(prompt.toLowerCase()).toContain("voter id");
  });

  it("handles no upcoming election gracefully", () => {
    const dataWithPastElections = {
      ...TX_DATA,
      elections: [{ ...TX_DATA.elections[0], date: "2026-01-01" }],
    };
    const prompt = generatePrompt(dataWithPastElections, "73301", TODAY);
    expect(prompt).toContain("No upcoming election found");
  });
});
