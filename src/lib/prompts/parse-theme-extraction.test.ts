import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseThemeExtraction } from "./parse-theme-extraction";

describe("parseThemeExtraction", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("parses a valid JSON array into Theme[]", () => {
    const raw = JSON.stringify([
      { name: "Healthcare costs", quotes: ["mom's insulin keeps going up"] },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([
      { name: "Healthcare costs", quotes: ["mom's insulin keeps going up"] },
    ]);
  });

  it("strips ```json ... ``` fences before parsing", () => {
    const raw = '```json\n[{"name":"Housing","quotes":["rent is up"]}]\n```';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Housing", quotes: ["rent is up"] }]);
  });

  it("strips bare ``` ... ``` fences before parsing", () => {
    const raw = '```\n[{"name":"Schools","quotes":["my kid"]}]\n```';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Schools", quotes: ["my kid"] }]);
  });

  it("trims surrounding whitespace before parsing", () => {
    const raw = '   \n  [{"name":"X","quotes":["y"]}]  \n  ';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "X", quotes: ["y"] }]);
  });

  it("drops items missing the quotes field but keeps valid items (with console.warn)", () => {
    const raw = JSON.stringify([
      { name: "Valid theme", quotes: ["good quote"] },
      { name: "Bad theme — no quotes" },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Valid theme", quotes: ["good quote"] }]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("drops items with missing name field but keeps valid items", () => {
    const raw = JSON.stringify([
      { quotes: ["orphan quote"] },
      { name: "Good", quotes: ["good"] },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Good", quotes: ["good"] }]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("drops items where quotes is not an array of strings", () => {
    const raw = JSON.stringify([
      { name: "Bad", quotes: "not an array" },
      { name: "Valid", quotes: ["yes"] },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Valid", quotes: ["yes"] }]);
    expect(warnSpy).toHaveBeenCalled();
  });

  // --- canonicalIssue + stance threading (PIVOT P1) ---
  //
  // These fields let the deterministic /api/race-data endpoint score
  // candidates via lookupAlignment without an LLM. The parser must preserve
  // them when well-formed and silently drop them when not (rather than
  // poisoning the alignment lookup with a bad/unknown issue id).

  it("preserves a valid canonicalIssue + stance on the theme", () => {
    const raw = JSON.stringify([
      {
        name: "Insulin costs",
        quotes: ["insulin keeps going up"],
        canonicalIssue: "healthcare_affordability",
        stance: "in_favor",
      },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([
      {
        name: "Insulin costs",
        quotes: ["insulin keeps going up"],
        canonicalIssue: "healthcare_affordability",
        stance: "in_favor",
      },
    ]);
  });

  it("drops an unknown canonicalIssue but keeps the theme", () => {
    const raw = JSON.stringify([
      {
        name: "Vibes",
        quotes: ["good vibes"],
        canonicalIssue: "not_a_real_issue",
        stance: "in_favor",
      },
    ]);
    const result = parseThemeExtraction(raw);
    // Theme survives; bad issue id is stripped; valid stance kept.
    expect(result).toEqual([
      { name: "Vibes", quotes: ["good vibes"], stance: "in_favor" },
    ]);
  });

  it("drops an invalid stance value but keeps the theme + valid canonicalIssue", () => {
    const raw = JSON.stringify([
      {
        name: "Rent",
        quotes: ["rent up 30%"],
        canonicalIssue: "housing_affordability",
        stance: "maybe",
      },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([
      {
        name: "Rent",
        quotes: ["rent up 30%"],
        canonicalIssue: "housing_affordability",
      },
    ]);
  });

  it("omits both fields when the model doesn't emit them (back-compat)", () => {
    const raw = JSON.stringify([
      { name: "Schools", quotes: ["my kid's school"] },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Schools", quotes: ["my kid's school"] }]);
  });

  it("preserves opposed stance", () => {
    const raw = JSON.stringify([
      {
        name: "New highway",
        quotes: ["stop the highway"],
        canonicalIssue: "water_infrastructure",
        stance: "opposed",
      },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result[0].stance).toBe("opposed");
  });

  it("returns [] for an empty array input", () => {
    const result = parseThemeExtraction("[]");
    expect(result).toEqual([]);
  });

  it("returns [] when all items are dropped as malformed", () => {
    const raw = JSON.stringify([{ name: 123 }, { quotes: ["only"] }]);
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("throws when the parsed JSON is not an array", () => {
    expect(() => parseThemeExtraction('{"name":"X","quotes":["y"]}')).toThrow(
      /Invalid theme JSON/,
    );
  });

  it("throws on malformed JSON", () => {
    expect(() => parseThemeExtraction("{not json")).toThrow(
      /Invalid theme JSON/,
    );
  });

  // --- Defensive cleanup against common Haiku output deviations ---
  //
  // The prompt asks for "JSON only", but in practice the model occasionally
  // emits a preamble line or wraps the array in an outer object. The parser
  // should tolerate both shapes so the cold-open doesn't surface
  // `coldOpenParseError` for harmless surface variation.

  it("extracts the outermost array when Haiku prepends a preamble line", () => {
    const raw =
      'Here are the themes:\n[{"name":"Healthcare","quotes":["insulin"]}]';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Healthcare", quotes: ["insulin"] }]);
  });

  it("extracts the array from a preamble + ```json fence combo", () => {
    const raw =
      'Sure — here you go:\n```json\n[{"name":"X","quotes":["y"]}]\n```';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "X", quotes: ["y"] }]);
  });

  it("extracts the array from a preamble + bare fence combo", () => {
    const raw = 'Here:\n```\n[{"name":"X","quotes":["y"]}]\n```';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "X", quotes: ["y"] }]);
  });

  it("unwraps an outer object that contains a single themes array", () => {
    const raw = '{"themes":[{"name":"Healthcare","quotes":["insulin"]}]}';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Healthcare", quotes: ["insulin"] }]);
  });

  it("unwraps when the outer object's array key is something other than 'themes'", () => {
    const raw = '{"result":[{"name":"Schools","quotes":["my kid"]}]}';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "Schools", quotes: ["my kid"] }]);
  });

  it("preserves em-dashes verbatim inside theme names and quotes", () => {
    // "EXACT words" is a hard contract from the prompt. Don't normalize.
    const raw = JSON.stringify([
      {
        name: "Healthcare costs — Mom's insulin",
        quotes: ["insulin keeps going up — last month $400"],
      },
    ]);
    const result = parseThemeExtraction(raw);
    expect(result[0].name).toContain("—");
    expect(result[0].quotes[0]).toContain("—");
  });

  it("preserves smart quotes verbatim inside JSON string values", () => {
    const raw =
      '[{"name":"Housing","quotes":["rent went up \\u201Cagain\\u201D"]}]';
    const result = parseThemeExtraction(raw);
    expect(result[0].quotes[0]).toBe("rent went up “again”");
  });

  it("strips a UTF-8 BOM at the start of the payload", () => {
    const raw = '﻿[{"name":"X","quotes":["y"]}]';
    const result = parseThemeExtraction(raw);
    expect(result).toEqual([{ name: "X", quotes: ["y"] }]);
  });
});
