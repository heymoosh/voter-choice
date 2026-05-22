import { describe, it, expect } from "vitest";
import { shouldSuggestAmend } from "./chat-catch-heuristic";

/**
 * The chat-catch heuristic is the conservative new-concern detector that
 * decides whether to surface a soft "want to add this as a theme?" proposal
 * in the workspace chat. Per the packet:
 *
 *   "Workers must NOT trigger chat catches aggressively — false positives
 *   are worse than misses."
 *
 * The v1 rules:
 *   · message must be >= 50 chars
 *   · message must contain at least one domain-flagged keyword
 *   · NONE of the user's currently-locked themes already covers the keyword
 *     (case-insensitive substring match against theme name OR theme quote)
 */

const NO_THEMES = [] as { name: string; quotes: string[] }[];

describe("shouldSuggestAmend", () => {
  it("does NOT trigger on very short acknowledgements", () => {
    const out = shouldSuggestAmend({
      message: "ok",
      currentThemes: NO_THEMES,
    });
    expect(out.suggest).toBe(false);
  });

  it("does NOT trigger on a short follow-up question with no domain term", () => {
    const out = shouldSuggestAmend({
      message: "tell me more",
      currentThemes: NO_THEMES,
    });
    expect(out.suggest).toBe(false);
  });

  it("does NOT trigger on a long message without any domain keyword", () => {
    const out = shouldSuggestAmend({
      message:
        "Can you give me a longer explanation about how this race works and what's at stake here for someone living in my area?",
      currentThemes: NO_THEMES,
    });
    expect(out.suggest).toBe(false);
  });

  it("triggers on a long message mentioning a domain keyword absent from themes", () => {
    const out = shouldSuggestAmend({
      message:
        "I am genuinely worried about climate change and air quality in Houston this year because of the refineries.",
      currentThemes: [
        { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
      ],
    });
    expect(out.suggest).toBe(true);
    expect(out.suggestedKeywords).toContain("climate");
  });

  it("does NOT trigger when a domain keyword is already covered by a locked theme name", () => {
    const out = shouldSuggestAmend({
      message:
        "I'm really worried about climate change and what's happening to my city.",
      currentThemes: [
        { name: "Climate change & air quality", quotes: ["smog every summer"] },
      ],
    });
    expect(out.suggest).toBe(false);
  });

  it("does NOT trigger when a domain keyword is covered by a locked theme quote", () => {
    const out = shouldSuggestAmend({
      message:
        "I am genuinely worried about climate change and air quality in Houston this year because of the refineries.",
      currentThemes: [
        {
          name: "Environment",
          quotes: ["climate is changing and I can feel it"],
        },
      ],
    });
    expect(out.suggest).toBe(false);
  });

  it("triggers when the message mentions school funding and themes lack it", () => {
    const out = shouldSuggestAmend({
      message:
        "What I really care about is school funding here in Houston because my kids' school is falling apart.",
      currentThemes: [{ name: "Tax burden", quotes: ["taxes too high"] }],
    });
    expect(out.suggest).toBe(true);
    expect(out.suggestedKeywords?.some((k) => k.includes("school"))).toBe(true);
  });

  it("is case-insensitive when matching keywords AND existing themes", () => {
    const out = shouldSuggestAmend({
      message:
        "What I really care about is SCHOOL FUNDING here in Houston because my kids' school is falling apart.",
      currentThemes: [
        { name: "Public schools and teachers", quotes: ["teachers underpaid"] },
      ],
    });
    expect(out.suggest).toBe(false);
  });

  it("does NOT trigger when message is below the 50-char boundary even with a keyword", () => {
    // 48 chars — below the threshold.
    const msg = "I'm worried about ICE and police in my city now";
    expect(msg.length).toBeLessThan(50);
    const out = shouldSuggestAmend({
      message: msg,
      currentThemes: NO_THEMES,
    });
    expect(out.suggest).toBe(false);
  });

  it("triggers at the 50-char threshold when a domain keyword is present", () => {
    const msg =
      "I'm really worried about ICE in my neighborhood now ahead of the runoffs.";
    expect(msg.length).toBeGreaterThanOrEqual(50);
    const out = shouldSuggestAmend({
      message: msg,
      currentThemes: NO_THEMES,
    });
    expect(out.suggest).toBe(true);
  });
});
