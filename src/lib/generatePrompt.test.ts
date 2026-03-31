import { describe, it, expect } from "vitest";
import { buildContextBlock, generatePrompt } from "./generatePrompt";
import type { StateData, Election } from "./types";

const mockElection: Election = {
  id: "tx-2026-runoff",
  name: "2026 Texas Primary Runoff",
  date: "2026-05-26",
  type: "runoff",
  isPrimary: false,
  primaryType: null,
};

const mockTX: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [mockElection],
  registration: {
    online: {
      available: true,
      deadline: "2026-05-04",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-05-04", sincePostmarked: true },
    inPerson: { deadline: "2026-05-04", sincePostmarked: false },
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
    acceptedIds: ["Texas driver's license", "U.S. passport"],
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

describe("buildContextBlock", () => {
  it("includes the state name and zip code", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes the election name and date", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("2026 Texas Primary Runoff");
    expect(block).toContain("2026");
  });

  it("includes registration deadline info", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("Registration deadlines");
  });

  it("includes early voting dates", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("Early voting");
    expect(block).toContain("May");
  });

  it("shows not available for no-early-voting state", () => {
    const nhData: StateData = {
      ...mockTX,
      stateName: "New Hampshire",
      earlyVoting: {
        available: false,
        startDate: null,
        endDate: null,
        notes: null,
      },
    };
    const block = buildContextBlock(nhData, "03031", mockElection);
    expect(block).toContain("Not available");
  });

  it("includes voter ID info when required", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("Required");
    expect(block).toContain("Texas driver's license");
  });

  it("shows not required for no-ID state", () => {
    const caData: StateData = {
      ...mockTX,
      stateName: "California",
      votingRules: {
        ...mockTX.votingRules,
        idRequired: false,
        acceptedIds: [],
      },
    };
    const block = buildContextBlock(caData, "90210", mockElection);
    expect(block).toContain("Not required");
  });

  it("includes sample ballot and county election office links", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain("votetexas.gov");
    expect(block).toContain("My sample ballot");
    expect(block).toContain("My county election office");
  });

  it("includes phones at polls detail", () => {
    const block = buildContextBlock(mockTX, "73301", mockElection);
    expect(block).toContain(
      "Texas law prohibits wireless communication devices",
    );
  });
});

describe("generatePrompt", () => {
  it("includes the full ballot prompt text", () => {
    const prompt = generatePrompt(mockTX, "73301", mockElection);
    expect(prompt).toContain("nonpartisan civic research assistant");
    expect(prompt).toContain("Let's start with Step 1");
  });

  it("includes the pre-filled context block", () => {
    const prompt = generatePrompt(mockTX, "73301", mockElection);
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
    expect(prompt).toContain("Help me with my ballot");
  });

  it("context block appears after main prompt", () => {
    const prompt = generatePrompt(mockTX, "73301", mockElection);
    const step1Pos = prompt.indexOf("Let's start with Step 1");
    const contextPos = prompt.indexOf("Hi! I'm voting in");
    expect(contextPos).toBeGreaterThan(step1Pos);
  });
});
