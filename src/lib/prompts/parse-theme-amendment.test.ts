import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseThemeAmendment } from "./parse-theme-amendment";

/**
 * Parser for the Phase 4 theme-amendment prompt response.
 *
 * Expected JSON shape (from docs/design/2026-redesign/prompts.md §4):
 *   {
 *     "new_theme": { "name": "...", "quotes": [...] },
 *     "suggested_rank": 1,
 *     "rescored": [
 *       { "race_id": "...", "old_score": 82, "new_score": 76,
 *         "verdict": "REVISIT" | "HOLD" | "N/A" }
 *     ]
 *   }
 *
 * Mirrors parse-theme-extraction's tolerance contract:
 *   · trim whitespace
 *   · strip ```json / ``` fences
 *   · throw on top-level JSON failure or missing top-level shape
 *   · drop individual malformed `rescored` items with console.warn
 *
 * `verdict` is preserved as `verdictHint` because runtime ultimately overrides
 * with the pure-function `decideVerdict()` (when candidate-score data is
 * available) — the hint is a fallback for v1 where the runtime lacks
 * per-candidate score data.
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
        {
          race_id: "us-house-tx-07",
          old_score: 82,
          new_score: 76,
          verdict: "REVISIT",
        },
        {
          race_id: "us-senate",
          old_score: 70,
          new_score: 70,
          verdict: "HOLD",
        },
        {
          race_id: "prop-1",
          old_score: 0,
          new_score: 0,
          verdict: "N/A",
        },
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
      {
        raceId: "us-house-tx-07",
        oldScore: 82,
        newScore: 76,
        verdictHint: "REVISIT",
      },
      {
        raceId: "us-senate",
        oldScore: 70,
        newScore: 70,
        verdictHint: "HOLD",
      },
      {
        raceId: "prop-1",
        oldScore: 0,
        newScore: 0,
        verdictHint: "N/A",
      },
    ]);
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

  it("drops malformed rescored items but keeps valid ones (with console.warn)", () => {
    const mixed = {
      ...fullPayload(),
      rescored: [
        {
          race_id: "good-1",
          old_score: 80,
          new_score: 70,
          verdict: "HOLD",
        },
        { race_id: "bad-no-scores", verdict: "HOLD" }, // missing scores
        { race_id: 123, old_score: 1, new_score: 2, verdict: "HOLD" }, // wrong type
        {
          race_id: "good-2",
          old_score: 50,
          new_score: 55,
          verdict: "HOLD",
        },
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

  it("preserves unknown verdict strings as verdictHint passthrough (undefined when missing)", () => {
    const payload = {
      new_theme: { name: "X", quotes: ["y"] },
      suggested_rank: 1,
      rescored: [
        {
          race_id: "no-verdict",
          old_score: 10,
          new_score: 5,
        },
      ],
    };
    const out = parseThemeAmendment(JSON.stringify(payload));
    expect(out.rescored[0]).toEqual({
      raceId: "no-verdict",
      oldScore: 10,
      newScore: 5,
      verdictHint: undefined,
    });
  });
});
