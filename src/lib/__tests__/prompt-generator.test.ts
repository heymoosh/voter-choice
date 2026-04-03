import { describe, it, expect } from "vitest";
import { generatePromptText, buildContextBlock } from "../prompt-generator";
import { loadStateData } from "../data";

const today = new Date("2026-03-21");
const txData = loadStateData("TX")!;

describe("buildContextBlock", () => {
  it("includes state name and zip", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("includes election name", () => {
    const block = buildContextBlock(txData, "73301", today);
    // TX has a future election (runoff 2026-05-26, general 2026-11-03)
    expect(block).toContain("2026 Texas");
  });

  it("includes sample ballot URL", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("votetexas.gov");
  });

  it("includes voter ID info when required", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Voter ID");
  });

  it("includes phones at polls info", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block).toContain("Phones at polls");
  });

  it("includes 'Help me with my ballot.' at the end", () => {
    const block = buildContextBlock(txData, "73301", today);
    expect(block.trim()).toMatch(/Help me with my ballot\.$/);
  });
});

describe("generatePromptText", () => {
  it("starts with the ballot prompt text", () => {
    const text = generatePromptText(txData, "73301", today);
    expect(text).toContain("nonpartisan civic research assistant");
  });

  it("contains the context block", () => {
    const text = generatePromptText(txData, "73301", today);
    expect(text).toContain("Hi! I'm voting in");
    expect(text).toContain("Texas");
  });
});

import type { Language } from "../translations";

describe("buildContextBlock — Spanish (lang='es')", () => {
  it("opens with Spanish greeting", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block).toContain("¡Hola!");
    expect(block).toContain("Texas");
    expect(block).toContain("73301");
  });

  it("uses Spanish date format", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    // TX election dates should appear in Spanish format
    expect(block).toMatch(/de [a-z]+ de 20\d\d/);
  });

  it("uses Spanish section labels", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block).toContain("Elección:");
    expect(block).toContain("Votación anticipada:");
    expect(block).toContain("Mi código postal es");
  });

  it("ends with Spanish CTA", () => {
    const block = buildContextBlock(txData, "73301", today, "es");
    expect(block.trim()).toMatch(/Ayúdame con mi boleta\.$/);
  });

  it("keeps data values (URLs) unchanged in Spanish context", () => {
    const enBlock = buildContextBlock(txData, "73301", today, "en");
    const esBlock = buildContextBlock(txData, "73301", today, "es");
    // URLs should appear in both blocks
    expect(enBlock).toContain("votetexas.gov");
    expect(esBlock).toContain("votetexas.gov");
  });
});

describe("generatePromptText — Spanish (lang='es')", () => {
  it("contains Spanish prompt text", () => {
    const text = generatePromptText(txData, "73301", today, "es");
    expect(text).toContain("asistente cívico no partidario");
  });

  it("contains Spanish context block", () => {
    const text = generatePromptText(txData, "73301", today, "es");
    expect(text).toContain("¡Hola!");
    expect(text).toContain("Ayúdame con mi boleta.");
  });

  it("English call still works unchanged", () => {
    const text = generatePromptText(txData, "73301", today, "en");
    expect(text).toContain("nonpartisan civic research assistant");
    expect(text).toContain("Hi! I'm voting in");
  });
});
