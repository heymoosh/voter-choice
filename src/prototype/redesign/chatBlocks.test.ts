import { describe, it, expect } from "vitest";
import {
  stripChatMd,
  resolveChatBlock,
  CHAT_BLOCK_MESSAGES,
  CHAT_BUDGET_CODES,
} from "./chatBlocks";

describe("resolveChatBlock", () => {
  it("routes every budget code to the budget modal, never a banner", () => {
    for (const code of CHAT_BUDGET_CODES) {
      expect(resolveChatBlock(code)).toEqual({ budget: true, message: null });
    }
  });

  it("maps known non-budget codes to their block-specific banner message", () => {
    for (const [code, message] of Object.entries(CHAT_BLOCK_MESSAGES)) {
      expect(resolveChatBlock(code)).toEqual({ budget: false, message });
    }
  });

  it("resolves unknown / missing codes to the generic retry banner (null)", () => {
    expect(resolveChatBlock("AI_ERROR")).toEqual({
      budget: false,
      message: null,
    });
    expect(resolveChatBlock(undefined)).toEqual({
      budget: false,
      message: null,
    });
    expect(resolveChatBlock("")).toEqual({ budget: false, message: null });
  });
});

describe("stripChatMd", () => {
  it("strips bold, italic, code, and heading markers", () => {
    expect(stripChatMd("**bold** and *ital* and `code`")).toBe(
      "bold and ital and code",
    );
    expect(stripChatMd("## Heading\nbody")).toBe("Heading\nbody");
    expect(stripChatMd("__under__")).toBe("under");
  });

  it("leaves plain prose and empty strings untouched", () => {
    expect(stripChatMd("2 + 2 = 4, plain text.")).toBe(
      "2 + 2 = 4, plain text.",
    );
    expect(stripChatMd("")).toBe("");
  });
});
