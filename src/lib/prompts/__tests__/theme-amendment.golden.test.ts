import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildThemeAmendmentPrompt } from "../theme-amendment";

describe("buildThemeAmendmentPrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildThemeAmendmentPrompt({
      userInput: "I worry about housing too.",
      themesList: "1. Healthcare",
      decidedJson: "[]",
    });
    const golden = readFileSync(
      path.join(__dirname, "theme-amendment.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });
});
