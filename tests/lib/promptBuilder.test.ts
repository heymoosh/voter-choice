import { describe, it, expect } from "vitest";
import { buildContextBlock, buildFullPrompt } from "@/lib/promptBuilder";
import type { StateData } from "@/types/state";

const mockTXData: StateData = {
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
    online: { available: true, deadline: "2026-10-05", url: "https://www.votetexas.gov" },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-11-03", sincePostmarked: false },
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
    acceptedIds: ["Texas driver's license", "Texas ID card", "U.S. passport"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Texas law prohibits wireless communication devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

describe("buildContextBlock", () => {
  it("includes state name and zip", () => {
    const block = buildContextBlock(mockTXData, "73301");
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock(mockTXData, "73301");
    expect(block).toContain("2026 Texas General Election");
  });

  it("includes registration deadlines", () => {
    const block = buildContextBlock(mockTXData, "73301");
    expect(block).toContain("Registration deadlines");
    expect(block).toContain("2026-10-05");
  });

  it("includes sample ballot URL", () => {
    const block = buildContextBlock(mockTXData, "73301");
    expect(block).toContain("https://www.votetexas.gov/voting/ballot-board.html");
  });

  it("includes county election office URL", () => {
    const block = buildContextBlock(mockTXData, "73301");
    expect(block).toContain("https://www.votetexas.gov/voting/where.html");
  });

  it("shows 'No upcoming elections' when all elections are past", () => {
    const pastData: StateData = {
      ...mockTXData,
      elections: [
        {
          id: "tx-2022-general",
          name: "2022 Texas General Election",
          date: "2022-11-08",
          type: "general",
          isPrimary: false,
          primaryType: null,
        },
      ],
    };
    const block = buildContextBlock(pastData, "73301");
    expect(block).toContain("No upcoming elections found");
  });
});

describe("buildFullPrompt", () => {
  it("starts with civic assistant preamble", () => {
    const prompt = buildFullPrompt(mockTXData, "73301");
    expect(prompt).toContain("nonpartisan civic research assistant");
  });

  it("includes context block", () => {
    const prompt = buildFullPrompt(mockTXData, "73301");
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
  });
});
