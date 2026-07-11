import { describe, it, expect } from "vitest";
import { POLIS_STATEMENTS, isKnownPolisStatement } from "./statements";

describe("POLIS_STATEMENTS", () => {
  it("is a non-empty, deduplicated list", () => {
    expect(POLIS_STATEMENTS.length).toBeGreaterThan(0);
    expect(new Set(POLIS_STATEMENTS).size).toBe(POLIS_STATEMENTS.length);
  });

  it("carries no party framing in any statement text", () => {
    for (const s of POLIS_STATEMENTS) {
      expect(s.toLowerCase()).not.toMatch(
        /\b(democrat|republican|independent|d\/r\/i)\b/,
      );
    }
  });
});

describe("isKnownPolisStatement", () => {
  it("accepts every id in POLIS_STATEMENTS", () => {
    for (const s of POLIS_STATEMENTS) {
      expect(isKnownPolisStatement(s)).toBe(true);
    }
  });

  it("rejects an arbitrary/unknown string", () => {
    expect(isKnownPolisStatement("not a real statement")).toBe(false);
    expect(isKnownPolisStatement("")).toBe(false);
  });
});
