import { describe, it, expect } from "vitest";
import { buildCustomizedPrompt } from "../promptBuilder";
import type { StateData, Election } from "@/types";

const mockStateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: {
      deadline: "2026-10-05",
      sincePostmarked: true,
    },
    inPerson: {
      deadline: "2026-10-05",
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: [
      "Texas driver's license or ID card",
      "U.S. passport",
      "Military ID",
    ],
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

const mockElection: Election = {
  id: "tx-2026-general",
  name: "2026 Texas General Election",
  date: "2026-11-03",
  type: "general",
  isPrimary: false,
  primaryType: null,
};

describe("buildCustomizedPrompt", () => {
  it("includes the state name in the output", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("Texas");
  });

  it("includes the zip code in the context block", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("73301");
  });

  it("includes the election name", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("2026 Texas General Election");
  });

  it("includes registration deadline information", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt.toLowerCase()).toContain("registration");
  });

  it("includes voter ID information", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt.toLowerCase()).toContain("voter id");
  });

  it("includes early voting information", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt.toLowerCase()).toContain("early voting");
  });

  it("includes sample ballot and county election office links", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain(mockStateData.resources.sampleBallotLookup);
    expect(prompt).toContain(mockStateData.resources.countyElectionLookup);
  });

  it("includes 'Help me with my ballot' in the context block", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("Help me with my ballot");
  });

  it("combines the base prompt with the context block", () => {
    const prompt = buildCustomizedPrompt(mockStateData, "73301", mockElection);
    // Base prompt starts with this phrase
    expect(prompt).toContain("nonpartisan civic research assistant");
    // Context block starts with Hi!
    expect(prompt).toContain("Hi!");
  });
});
