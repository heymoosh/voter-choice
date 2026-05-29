import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseThemeAmendment } from "./parse-theme-amendment";

/**
 * Parser for the Phase 6 theme-amendment prompt response (D-1 reframe).
 *
 * Expected JSON shape (from docs/design/2026-redesign/prompts.md §4):
 *   {
 *     "new_theme": { "name": "...", "quotes": [...] },
 *     "suggested_rank": 1,
 *     "rescored": [
 *       { "race_id": "...", "verdict": "REVISIT" | "HOLD" | "N/A" }
 *     ]
 *   }
 *
 * D-1: rows no longer carry alignment scores. Each row is just a per-issue
 * relevance verdict. Any legacy score fields are ignored.
 *
 * Mirrors parse-theme-extraction's tolerance contract:
 *   · trim whitespace
 *   · strip ```json / ``` fences
 *   · throw on top-level JSON failure or missing top-level shape
 *   · drop individual `rescored` items with a non-string race_id (console.warn)
 */
describe("parseThemeAmendment", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function fullPayload() {
    return {
      new_theme: {
        name: "School funding",
        quotes: ["kids' schools are crumbling"],
      },
      suggested_rank: 1,
      rescored: [
        { race_id: "us-house-tx-07", verdict: "REVISIT" },
        { race_id: "us-senate", verdict: "HOLD" },
        { race_id: "prop-1", verdict: "N/A" },
      ],
    };
  }

  it("parses a valid JSON payload into the expected shape", () => {
    const raw = JSON.stringify(fullPayload());
    const out = parseThemeAmendment(raw);
    expect(out.newTheme).toEqual({
      name: "School funding",
      quotes: ["kids' schools are crumbling"],
    });
    expect(out.suggestedRank).toBe(1);
    expect(out.rescored).toEqual([
      { raceId: "us-house-tx-07", verdict: "REVISIT" },
      { raceId: "us-senate", verdict: "HOLD" },
      { raceId: "prop-1", verdict: "N/A" },
    ]);
  });

  it("ignores legacy score fields if a model still emits them", () => {
    const legacy = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: 1,
      rescored: [
        {
          race_id: "us-senate",
          old_score: 82,
          new_score: 76,
          verdict: "REVISIT",
        },
      ],
    };
    const out = parseThemeAmendment(JSON.stringify(legacy));
    expect(out.rescored).toEqual([{ raceId: "us-senate", verdict: "REVISIT" }]);
  });

  it("strips ```json ... ``` fences before parsing", () => {
    const raw = "```json\n" + JSON.stringify(fullPayload()) + "\n```";
    const out = parseThemeAmendment(raw);
    expect(out.newTheme.name).toBe("School funding");
  });

  it("strips bare ``` ... ``` fences before parsing", () => {
    const raw = "```\n" + JSON.stringify(fullPayload()) + "\n```";
    const out = parseThemeAmendment(raw);
    expect(out.suggestedRank).toBe(1);
  });

  it("trims surrounding whitespace before parsing", () => {
    const raw = "   \n  " + JSON.stringify(fullPayload()) + "   \n  ";
    const out = parseThemeAmendment(raw);
    expect(out.rescored).toHaveLength(3);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseThemeAmendment("{not json")).toThrow(
      /Invalid theme amendment JSON/,
    );
  });

  it("throws when the payload is not an object", () => {
    expect(() => parseThemeAmendment("[1, 2, 3]")).toThrow(
      /Invalid theme amendment JSON/,
    );
  });

  it("throws when new_theme is missing", () => {
    const broken = { ...fullPayload(), new_theme: undefined };
    expect(() => parseThemeAmendment(JSON.stringify(broken))).toThrow(
      /missing new_theme/,
    );
  });

  it("throws when new_theme is malformed (no name)", () => {
    const broken = {
      ...fullPayload(),
      new_theme: { quotes: ["just a quote"] },
    };
    expect(() => parseThemeAmendment(JSON.stringify(broken))).toThrow(
      /missing new_theme/,
    );
  });

  it("returns rescored=[] when the rescored field is missing (with console.warn)", () => {
    const partial = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: 2,
    };
    const out = parseThemeAmendment(JSON.stringify(partial));
    expect(out.rescored).toEqual([]);
    expect(out.suggestedRank).toBe(2);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("drops items with a non-string race_id but keeps valid ones (with console.warn)", () => {
    const mixed = {
      ...fullPayload(),
      rescored: [
        { race_id: "good-1", verdict: "HOLD" },
        { verdict: "HOLD" }, // missing race_id
        { race_id: 123, verdict: "HOLD" }, // wrong type
        { race_id: "good-2", verdict: "REVISIT" },
      ],
    };
    const out = parseThemeAmendment(JSON.stringify(mixed));
    expect(out.rescored).toHaveLength(2);
    expect(out.rescored[0].raceId).toBe("good-1");
    expect(out.rescored[1].raceId).toBe("good-2");
    expect(warnSpy).toHaveBeenCalled();
  });

  it("defaults suggestedRank to 1 when missing or non-numeric", () => {
    const noRank = {
      new_theme: { name: "X", quotes: ["y"] },
      rescored: [],
    };
    expect(parseThemeAmendment(JSON.stringify(noRank)).suggestedRank).toBe(1);

    const badRank = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: "first",
      rescored: [],
    };
    expect(parseThemeAmendment(JSON.stringify(badRank)).suggestedRank).toBe(1);
  });

  it("accepts an empty rescored array", () => {
    const payload = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: 1,
      rescored: [],
    };
    const out = parseThemeAmendment(JSON.stringify(payload));
    expect(out.rescored).toEqual([]);
  });

  it("sets verdict to undefined when the prompt omitted it", () => {
    const payload = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: 1,
      rescored: [{ race_id: "no-verdict" }],
    };
    const out = parseThemeAmendment(JSON.stringify(payload));
    expect(out.rescored[0]).toEqual({
      raceId: "no-verdict",
      verdict: undefined,
    });
  });
});
