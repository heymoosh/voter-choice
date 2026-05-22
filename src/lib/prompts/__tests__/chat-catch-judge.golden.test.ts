import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildChatCatchJudgePrompt } from "../chat-catch-judge";

describe("buildChatCatchJudgePrompt — golden", () => {
  it("renders the verbatim prompt body with slots substituted", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage:
        "I'm worried about climate change and air quality in Houston this year.",
      currentThemes: [
        {
          name: "Healthcare costs",
          quotes: ["insulin keeps going up"],
        },
        {
          name: "Tax burden",
          quotes: ["property taxes are too high"],
        },
      ],
    });
    const golden = readFileSync(
      path.join(__dirname, "chat-catch-judge.golden.md"),
      "utf-8",
    );
    expect(rendered).toBe(golden);
  });

  it("includes both the suggest:true and suggest:false JSON return shapes", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage: "any",
      currentThemes: [],
    });
    expect(rendered).toMatch(/"suggest":\s*true/);
    expect(rendered).toMatch(/"suggest":\s*false/);
    expect(rendered).toMatch(/suggested_theme_name/);
    expect(rendered).toMatch(/summary/);
  });

  it("instructs the model to be conservative and neutral", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage: "any",
      currentThemes: [],
    });
    // Conservatism property — false positives erode trust, so the prompt must
    // tell the model to skew towards suggest:false on ambiguous cases.
    expect(rendered).toMatch(/conservative/i);
    // Neutrality property — no advocacy verbs, no party labels in the
    // suggested theme name. This is the WHOLE point of fix J.
    expect(rendered).toMatch(/neutral/i);
    expect(rendered).toMatch(/no advocacy verbs/i);
    expect(rendered).toMatch(/no party labels/i);
  });

  it("lists currently-locked themes inside a <current_themes> tag", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage: "test",
      currentThemes: [
        { name: "Healthcare", quotes: [] },
        { name: "Housing", quotes: [] },
      ],
    });
    expect(rendered).toMatch(/<current_themes>/);
    expect(rendered).toMatch(/<\/current_themes>/);
    expect(rendered).toMatch(/1\. Healthcare/);
    expect(rendered).toMatch(/2\. Housing/);
  });

  it("wraps the user message in a <message> tag", () => {
    const rendered = buildChatCatchJudgePrompt({
      userMessage: "I care about transit.",
      currentThemes: [],
    });
    expect(rendered).toMatch(/<message>I care about transit\.<\/message>/);
  });
});
