import { describe, it, expect } from "vitest";
import { generatePrompt } from "../generatePrompt";
import { getStateData } from "../getStateData";

describe("generatePrompt", () => {
  it("includes the state name in the prompt", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("Texas");
  });

  it("includes the zip code in the prompt", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("73301");
  });

  it("includes election info when a future election exists", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toMatch(/election/i);
  });

  it("includes registration deadline info", () => {
    const stateData = getStateData("CA")!;
    const result = generatePrompt(stateData, "90210", new Date("2026-05-11"));
    expect(result).toMatch(/registration/i);
  });

  it("includes sample ballot link", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("votetexas.gov");
  });

  it("starts with the ballot prompt preamble", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("nonpartisan civic research assistant");
  });
});
