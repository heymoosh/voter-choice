import { describe, it, expect } from "vitest";
import { buildContextBlock, buildFullPrompt } from "./promptBuilder";
import type { StateData, Election } from "../types/state";

const mockState: StateData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-runoff",
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
      deadline: "2026-02-02",
      url: "https://www.votetexas.gov/",
    },
    byMail: { deadline: "2026-02-02", sincePostmarked: true },
    inPerson: { deadline: "2026-02-02", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: { available: false, startDate: null, endDate: null, notes: "" },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

const mockElection: Election = mockState.elections[0];

describe("buildContextBlock", () => {
  it("includes state name in context block", () => {
    const block = buildContextBlock("73301", mockState, mockElection);
    expect(block).toContain("Texas");
  });

  it("includes zip code in context block", () => {
    const block = buildContextBlock("73301", mockState, mockElection);
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock("73301", mockState, mockElection);
    expect(block).toContain("2026 Texas Primary Runoff");
  });

  it("includes registration info", () => {
    const block = buildContextBlock("73301", mockState, mockElection);
    expect(block).toMatch(/registration/i);
  });

  it("handles null election gracefully", () => {
    const block = buildContextBlock("73301", mockState, null);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });
});

describe("buildFullPrompt", () => {
  it("contains the prompt text", () => {
    const full = buildFullPrompt("73301", mockState, mockElection);
    expect(full).toContain("nonpartisan civic research assistant");
  });

  it("appends the context block after the prompt", () => {
    const full = buildFullPrompt("73301", mockState, mockElection);
    const promptIdx = full.indexOf("nonpartisan civic research assistant");
    const contextIdx = full.indexOf("I'm voting in");
    expect(contextIdx).toBeGreaterThan(promptIdx);
  });
});
