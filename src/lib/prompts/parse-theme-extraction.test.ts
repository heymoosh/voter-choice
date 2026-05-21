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
});
