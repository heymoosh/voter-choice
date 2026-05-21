import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildThemeExtractionPrompt } from "../theme-extraction";

describe("buildThemeExtractionPrompt — golden", () => {
  it("renders the verbatim prompt body with userInput substituted", () => {
    const rendered = buildThemeExtractionPrompt({
      userInput: "I care about healthcare and ICE.",
    });
    const golden = readFileSync(
      path.join(__dirname, "theme-extraction.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });
});
