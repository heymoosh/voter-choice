import { describe, it, expect } from "vitest";
import { generatePrompt } from "../generatePrompt";
import { getStateData } from "../getStateData";

describe("generatePrompt (English)", () => {
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

describe("generatePrompt (Spanish)", () => {
  it("returns Spanish prompt when language is es", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "es",
    );
    expect(result).toContain("asistente cívico no partidista");
  });

  it("returns Spanish context greeting when language is es", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "es",
    );
    expect(result).toContain("¡Hola! Voy a votar en");
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("returns English prompt by default (no language param)", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(stateData, "73301", new Date("2026-05-11"));
    expect(result).toContain("nonpartisan civic research assistant");
  });

  it("formats dates in Spanish locale in es mode", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "es",
    );
    // Spanish date format includes "de" between components
    expect(result).toMatch(/de \d{4}/);
  });

  it("Spanish closing matches spec", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "es",
    );
    expect(result).toContain("Ayúdame con mi boleta.");
  });

  it("includes sample ballot link in Spanish mode", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "es",
    );
    expect(result).toContain("votetexas.gov");
  });
});
