import { describe, it, expect } from "vitest";
import { generatePrompt } from "@/lib/prompt-generator";
import type { StateElectionData } from "@/types/election";

const txState: StateElectionData = {
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
    acceptedIds: ["Texas driver's license", "U.S. passport"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail:
      "Texas law prohibits wireless devices in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://votetexas.gov",
    countyElectionLookup: "https://votetexas.gov/county",
    sampleBallotLookup: "https://votetexas.gov/ballot",
    pollingPlaceLookup: "https://votetexas.gov/polling",
  },
};

const caState: StateElectionData = {
  stateCode: "CA",
  stateName: "California",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "ca-2026-primary",
      name: "2026 California Primary",
      date: "2026-06-02",
      type: "primary",
      isPrimary: true,
      primaryType: "semi-closed",
    },
    {
      id: "ca-2026-general",
      name: "2026 California General",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: { available: true, deadline: "2026-05-18", url: "https://ca.gov" },
    byMail: { deadline: "2026-05-18", sincePostmarked: true },
    inPerson: { deadline: "2026-06-02", sincePostmarked: false },
    sameDayRegistration: true,
    registrationCheckUrl: "https://ca.gov/check",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-04",
    endDate: "2026-06-01",
    notes: "Vote centers open 29 days before election.",
  },
  votingRules: {
    idRequired: false,
    acceptedIds: [],
    phonesAtPolls: "allowed",
    phonesAtPollsDetail: "Phones allowed.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://sos.ca.gov",
    countyElectionLookup: "https://sos.ca.gov/county",
    sampleBallotLookup: "https://sos.ca.gov/ballot",
    pollingPlaceLookup: "https://sos.ca.gov/polling",
  },
};

describe("generatePrompt", () => {
  it("contains the state name for Texas", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).toContain("Texas");
  });

  it("contains the zip code for Texas", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).toContain("73301");
  });

  it("contains 'election' keyword", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt.toLowerCase()).toContain("election");
  });

  it("contains 'registration' keyword", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt.toLowerCase()).toContain("registration");
  });

  it("contains the state name for California", () => {
    const prompt = generatePrompt(caState, "90210");
    expect(prompt).toContain("California");
  });

  it("contains the zip code for California", () => {
    const prompt = generatePrompt(caState, "90210");
    expect(prompt).toContain("90210");
  });

  it("does not contain undefined or null as text", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).not.toContain("undefined");
    expect(prompt).not.toContain("null");
  });

  it("does not contain placeholder text N/A", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).not.toMatch(/\bN\/A\b/);
  });

  it("includes the next election name", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).toContain("2026 Texas");
  });

  it("mentions phone policy details", () => {
    const prompt = generatePrompt(txState, "73301");
    expect(prompt).toContain("prohibits");
  });
});
