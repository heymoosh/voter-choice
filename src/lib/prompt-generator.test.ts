import { describe, it, expect } from "vitest";
import { generateCustomPrompt } from "./prompt-generator";
import type { StateElectionData } from "@/types/election";

const mockStateData: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-01-01",
  elections: [
    {
      id: "tx-2026-primary",
      name: "2026 Texas Primary Election",
      date: "2099-03-03",
      type: "primary",
      isPrimary: true,
      primaryType: "open",
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2099-02-02",
      url: "https://example.com/register",
    },
    byMail: {
      deadline: "2099-02-02",
      sincePostmarked: true,
    },
    inPerson: {
      deadline: "2099-02-02",
      sincePostmarked: false,
    },
    sameDayRegistration: false,
    registrationCheckUrl: "https://example.com/check",
  },
  earlyVoting: {
    available: true,
    startDate: "2099-02-17",
    endDate: "2099-02-28",
    notes: "Check county for hours",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Driver's License", "Passport"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in voting room",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://votetexas.gov",
    countyElectionLookup: "https://example.com/county",
    sampleBallotLookup: "https://example.com/ballot",
    pollingPlaceLookup: "https://example.com/polling",
  },
};

describe("generateCustomPrompt", () => {
  it("generates an English prompt by default", () => {
    const prompt = generateCustomPrompt("73301", mockStateData, "en");
    expect(prompt).toContain("Hi! I'm voting in **Texas**");
    expect(prompt).toContain("Help me with my ballot.");
    expect(prompt).toContain("nonpartisan civic research assistant");
  });

  it("generates a Spanish prompt when lang is es", () => {
    const prompt = generateCustomPrompt("73301", mockStateData, "es");
    expect(prompt).toContain("¡Hola! Voy a votar en **Texas**");
    expect(prompt).toContain("Ayúdame con mi boleta.");
    expect(prompt).toContain("asistente cívico no partidista");
  });

  it("includes zip code in the context block", () => {
    const promptEn = generateCustomPrompt("73301", mockStateData, "en");
    expect(promptEn).toContain("73301");
    const promptEs = generateCustomPrompt("73301", mockStateData, "es");
    expect(promptEs).toContain("73301");
  });

  it("formats dates in Spanish for Spanish prompts", () => {
    const prompt = generateCustomPrompt("73301", mockStateData, "es");
    expect(prompt).toContain("de marzo de 2099");
  });

  it("formats dates in English for English prompts", () => {
    const prompt = generateCustomPrompt("73301", mockStateData, "en");
    expect(prompt).toContain("March");
  });

  it("translates registration labels in Spanish", () => {
    const prompt = generateCustomPrompt("73301", mockStateData, "es");
    expect(prompt).toContain("Fechas límite de registro");
    expect(prompt).toContain("fecha de matasellos");
  });
});
