import { describe, it, expect } from "vitest";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";
import type { StateElectionData } from "@/types/election";

const texasData: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-05-10",
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
      url: "https://example.com",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://example.com/check",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-13",
    endDate: "2026-10-30",
    notes: "Hours vary by county",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license", "U.S. passport"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "No phones in the voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://votetexas.gov",
    countyElectionLookup: "https://votetexas.gov/county",
    sampleBallotLookup: "https://votetexas.gov/sample",
    pollingPlaceLookup: "https://votetexas.gov/polling",
  },
};

const noElectionData: StateElectionData = {
  ...texasData,
  elections: [],
};

describe("generateCustomizedPrompt", () => {
  describe("English output", () => {
    it("contains state name", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("Texas");
    });

    it("contains zip code", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("73301");
    });

    it("contains election name", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("2026 Texas General Election");
    });

    it("contains registration deadline info", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("registration");
    });

    it("contains early voting info", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("early voting");
    });

    it("contains voter ID info", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt.toLowerCase()).toContain("voter id");
    });

    it("contains sample ballot link", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("votetexas.gov/sample");
    });

    it("contains the main prompt instructions", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("nonpartisan civic research assistant");
    });

    it("handles no upcoming elections gracefully", () => {
      const prompt = generateCustomizedPrompt(noElectionData, "73301", "en");
      expect(prompt).toContain("No upcoming elections");
      expect(prompt).toContain("Texas");
    });

    it("shows same-day registration as not available for TX", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toContain("Not available");
    });

    it("default language is en when not specified", () => {
      const promptDefault = generateCustomizedPrompt(texasData, "73301");
      const promptEn = generateCustomizedPrompt(texasData, "73301", "en");
      expect(promptDefault).toEqual(promptEn);
    });
  });

  describe("Spanish output", () => {
    it("contains state name in Spanish prompt", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "es");
      expect(prompt).toContain("Texas");
    });

    it("contains zip code in Spanish prompt", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "es");
      expect(prompt).toContain("73301");
    });

    it("uses Spanish greeting", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "es");
      expect(prompt).toContain("Hola");
    });

    it("Spanish prompt includes election info", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "es");
      expect(prompt).toContain("Elección");
    });

    it("Spanish no-election prompt is in Spanish", () => {
      const prompt = generateCustomizedPrompt(noElectionData, "73301", "es");
      expect(prompt).toContain("No hay elecciones");
    });
  });

  describe("deadline formatting", () => {
    it("marks future deadline as ok or warning", () => {
      const prompt = generateCustomizedPrompt(texasData, "73301", "en");
      expect(prompt).toMatch(/days left|passed/i);
    });
  });
});
