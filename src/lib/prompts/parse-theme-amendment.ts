import type { Theme } from "./types";

/**
 * Parse the theme-amendment prompt's JSON response.
 *
 * Expected JSON shape (docs/design/2026-redesign/prompts.md §4):
 *   {
 *     "new_theme":      { "name": "...", "quotes": ["..."] },
 *     "suggested_rank": <integer>,
 *     "rescored": [
 *       { "race_id": "...", "verdict": "REVISIT" | "HOLD" | "N/A" }
 *     ]
 *   }
 *
 * D-1: the prompt no longer emits alignment scores (old_score/new_score) and
 * no longer ranks candidates against one another. Each `rescored` row carries
 * only a per-issue relevance `verdict`. Any legacy score fields in the payload
 * are simply ignored.
 *
 * Tolerates:
 *   · surrounding whitespace
 *   · ```json ... ``` or ``` ... ``` markdown fences
 *
 * Throws when:
 *   · top-level JSON is malformed
 *   · payload is not an object
 *   · `new_theme` is missing or malformed
 *
 * Drops malformed individual `rescored` items with `console.warn` and keeps
 * the valid ones — same defensive pattern as `parse-theme-extraction.ts`.
 * Returns `rescored: []` (with warn) when the whole field is missing.
 */

export interface ParsedRescoredRace {
  raceId: string;
  /**
   * The per-race verdict string from the prompt: "REVISIT" (the new priority
   * is relevant to this race), "HOLD" (not relevant / no change), or "N/A"
   * (proposition). D-1: a relevance signal only — never a score comparison or
   * a cross-candidate ranking. `undefined` when the prompt omitted it.
   */
  verdict?: string;
}

export interface ParsedThemeAmendment {
  newTheme: Theme;
  /** 1-indexed rank suggestion for where to insert the new theme. */
  suggestedRank: number;
  rescored: ParsedRescoredRace[];
}

function stripFences(rawJson: string): string {
  const cleaned = rawJson.trim();
  const fenced = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return fenced ? fenced[1].trim() : cleaned;
}

function parseSuggestedRank(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }
  return 1;
}

function parseRescoredArray(value: unknown): ParsedRescoredRace[] {
  if (value === undefined) {
    console.warn(
      "[parseThemeAmendment] missing rescored field; defaulting to []",
    );
    return [];
  }
  if (!Array.isArray(value)) {
    console.warn(
      "[parseThemeAmendment] rescored is not an array; defaulting to []",
      value,
    );
    return [];
  }
  const out: ParsedRescoredRace[] = [];
  for (const item of value) {
    if (isValidRescoredItem(item)) {
      out.push({
        raceId: item.race_id,
        verdict: typeof item.verdict === "string" ? item.verdict : undefined,
      });
    } else {
      console.warn(
        "[parseThemeAmendment] dropping malformed rescored item:",
        item,
      );
    }
  }
  return out;
}

export function parseThemeAmendment(rawJson: string): ParsedThemeAmendment {
  const cleaned = stripFences(rawJson);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Invalid theme amendment JSON: failed to parse — ${(err as Error).message}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      "Invalid theme amendment JSON: expected a top-level object.",
    );
  }

  const record = parsed as Record<string, unknown>;

  const newThemeRaw = record.new_theme;
  if (!isValidTheme(newThemeRaw)) {
    throw new Error(
      "Invalid theme amendment JSON: missing new_theme or malformed (need {name, quotes[]}).",
    );
  }

  return {
    newTheme: { name: newThemeRaw.name, quotes: [...newThemeRaw.quotes] },
    suggestedRank: parseSuggestedRank(record.suggested_rank),
    rescored: parseRescoredArray(record.rescored),
  };
}

function isValidTheme(
  item: unknown,
): item is { name: string; quotes: string[] } {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  if (typeof record.name !== "string") return false;
  if (!Array.isArray(record.quotes)) return false;
  return record.quotes.every((q) => typeof q === "string");
}

function isValidRescoredItem(item: unknown): item is {
  race_id: string;
  verdict?: unknown;
} {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  return typeof record.race_id === "string";
}
