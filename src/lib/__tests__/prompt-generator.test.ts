import { describe, it, expect } from "vitest";
import { generateBallotPrompt } from "../prompt-generator";
import type { StateData, Election } from "@/types/election";

const mockStateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
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
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-31",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Texas law prohibits wireless devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

const mockElection: Election = {
  id: "tx-2026-general",
  name: "2026 Texas General Election",
  date: "2026-11-03",
  type: "general",
  isPrimary: false,
  primaryType: null,
};

describe("generateBallotPrompt", () => {
  it("includes state name in output", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt).toContain("Texas");
  });

  it("includes zip code in output", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt).toContain("73301");
  });

  it("includes election name", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt).toContain("2026 Texas General Election");
  });

  it("includes voting rules content", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt.toLowerCase()).toContain("photo id");
  });

  it("includes official election website", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt).toContain("votetexas.gov");
  });

  it("handles null election gracefully", () => {
    const prompt = generateBallotPrompt(mockStateData, null, "73301");
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("No upcoming election data");
  });

  it("returns a non-empty string", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("mentions registration deadline", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt.toLowerCase()).toContain("registration");
  });

  it("includes polling place resource link", () => {
    const prompt = generateBallotPrompt(mockStateData, mockElection, "73301");
    expect(prompt).toContain("polling");
  });
});
