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

describe("generatePrompt (Vietnamese)", () => {
  it("returns Vietnamese prompt when language is vi", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "vi",
    );
    expect(result).toContain("không đảng phái");
  });

  it("returns Vietnamese context greeting when language is vi", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "vi",
    );
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("formats dates in Vietnamese style (d tháng m, y)", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "vi",
    );
    expect(result).toMatch(/\d+ tháng \d+, \d{4}/);
  });
});

describe("generatePrompt (Chinese)", () => {
  it("returns Chinese prompt when language is zh", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "zh",
    );
    expect(result).toContain("无党派公民研究助手");
  });

  it("returns Chinese context greeting", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "zh",
    );
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("formats dates in Chinese style (y年m月d日)", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "zh",
    );
    expect(result).toMatch(/\d{4}年\d+月\d+日/);
  });
});

describe("generatePrompt (Arabic)", () => {
  it("returns Arabic prompt when language is ar", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "ar",
    );
    expect(result).toContain("غير حزبي");
  });

  it("returns Arabic context greeting", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "ar",
    );
    expect(result).toContain("Texas");
    expect(result).toContain("73301");
  });

  it("includes sample ballot link in Arabic mode", () => {
    const stateData = getStateData("TX")!;
    const result = generatePrompt(
      stateData,
      "73301",
      new Date("2026-05-11"),
      "ar",
    );
    expect(result).toContain("votetexas.gov");
  });
});
