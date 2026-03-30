import { describe, it, expect } from "vitest";
import { generatePrompt } from "./generatePrompt";
import type { StateElectionData } from "../types/election";

// Minimal TX-like state data for testing
const txData: StateElectionData = {
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
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-04-27",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-04-27", sincePostmarked: true },
    inPerson: { deadline: "2026-04-27", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-11",
    endDate: "2026-05-22",
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
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

const noEarlyVotingData: StateElectionData = {
  ...txData,
  earlyVoting: { available: false, startDate: null, endDate: null },
};

describe("generatePrompt", () => {
  it("returns an object with basePrompt, contextBlock, and fullText", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result).toHaveProperty("basePrompt");
    expect(result).toHaveProperty("contextBlock");
    expect(result).toHaveProperty("fullText");
  });

  it("basePrompt contains the main AI assistant instructions", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.basePrompt).toContain("nonpartisan civic research assistant");
  });

  it("contextBlock contains state name", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("Texas");
  });

  it("contextBlock contains zip code", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("73301");
  });

  it("contextBlock contains election name", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("2026 Texas Primary Runoff");
  });

  it("contextBlock contains sample ballot link", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("votetexas.gov");
  });

  it("contextBlock contains county election office link", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("voting/where.html");
  });

  it("contextBlock contains voter ID info when idRequired is true", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("Texas driver");
  });

  it("contextBlock contains early voting dates when available", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("2026-05-11");
    expect(result.contextBlock).toContain("2026-05-22");
  });

  it("contextBlock contains 'absentee' notice when no early voting", () => {
    const result = generatePrompt(noEarlyVotingData, "73301", "2026-03-30");
    expect(result.contextBlock).toContain("absentee");
  });

  it("fullText contains both basePrompt and contextBlock", () => {
    const result = generatePrompt(txData, "73301", "2026-03-30");
    expect(result.fullText).toContain(result.basePrompt);
    expect(result.fullText).toContain(result.contextBlock);
  });
});
