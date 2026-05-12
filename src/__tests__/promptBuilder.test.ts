import { describe, it, expect } from "vitest";
import {
  buildContextBlock,
  buildFullPrompt,
  MAIN_PROMPT,
} from "@/lib/promptBuilder";
import type { StateData } from "@/types/state";

const mockTX: StateData = {
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
    startDate: "2026-10-20",
    endDate: "2026-10-30",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license or ID card", "U.S. passport"],
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
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes the election name", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("2026 Texas General Election");
  });

  it("includes election date", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("November 3, 2026");
  });

  it("includes registration deadlines", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("Registration deadlines");
  });

  it("includes voter ID information", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("Voter ID");
    expect(block).toContain("Required");
  });

  it("includes phones at polls info", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("Phones at polls");
  });

  it("includes sample ballot link", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain(
      "https://www.votetexas.gov/voting/ballot-board.html",
    );
  });

  it("includes county election office link", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block).toContain("https://www.votetexas.gov/voting/where.html");
  });

  it("ends with 'Help me with my ballot.'", () => {
    const block = buildContextBlock(mockTX, "73301");
    expect(block.trim().endsWith("Help me with my ballot.")).toBe(true);
  });
});

describe("buildFullPrompt", () => {
  it("combines main prompt and context block", () => {
    const prompt = buildFullPrompt(mockTX, "73301");
    expect(prompt).toContain(MAIN_PROMPT.slice(0, 50));
    expect(prompt).toContain("Texas");
    expect(prompt).toContain("73301");
  });

  it("uses separator between main prompt and context", () => {
    const prompt = buildFullPrompt(mockTX, "73301");
    expect(prompt).toContain("---");
  });
});
