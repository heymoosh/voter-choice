import { describe, it, expect } from "vitest";
import { buildPrompt, buildContextBlock } from "./prompt-builder";
import type { StateData, Election } from "@/types";

const mockStateData: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-01-01",
  elections: [],
  registration: {
    online: {
      available: true,
      deadline: "2026-02-02",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-02-02", sincePostmarked: true },
    inPerson: { deadline: "2026-02-02", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-02-17",
    endDate: "2026-02-28",
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

const mockElection: Election = {
  id: "tx-2026-primary",
  name: "2026 Texas Primary Election",
  date: "2026-03-03",
  type: "primary",
  isPrimary: true,
  primaryType: "open",
};

describe("buildContextBlock", () => {
  it("includes state name", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("Texas");
  });

  it("includes the zip code", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("2026 Texas Primary Election");
  });

  it("includes registration info", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("Registration deadlines");
  });

  it("includes early voting info", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("Early voting");
  });

  it("includes voter ID info", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("Voter ID");
    expect(block).toContain("Required");
  });

  it("includes phones at polls info", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("Phones at polls");
  });

  it("includes sample ballot link", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("ballot-board");
  });

  it("includes county election office link", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block).toContain("where.html");
  });

  it("ends with 'Help me with my ballot.'", () => {
    const block = buildContextBlock(mockStateData, "73301", mockElection);
    expect(block.trim()).toMatch(/Help me with my ballot\.$/);
  });

  it("handles null election gracefully", () => {
    const block = buildContextBlock(mockStateData, "73301", null);
    expect(block).toContain("No upcoming election found");
  });
});

describe("buildPrompt", () => {
  it("starts with the ballot prompt base text", () => {
    const prompt = buildPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("nonpartisan civic research assistant");
  });

  it("contains the context block with state name", () => {
    const prompt = buildPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
  });

  it("has a separator between base prompt and context", () => {
    const prompt = buildPrompt(mockStateData, "73301", mockElection);
    expect(prompt).toContain("---");
  });
});
