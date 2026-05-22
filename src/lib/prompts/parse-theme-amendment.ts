import type { Theme } from "./types";

/**
 * Parse the theme-amendment prompt's JSON response.
 *
 * Expected JSON shape (docs/design/2026-redesign/prompts.md §4):
 *   {
 *     "new_theme":      { "name": "...", "quotes": ["..."] },
 *     "suggested_rank": <integer>,
 *     "rescored": [
 *       { "race_id": "...", "old_score": 82, "new_score": 76,
 *         "verdict": "REVISIT" | "HOLD" | "N/A" }
 *     ]
 *   }
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
 *
 * The prompt also writes its own `verdict` per row, but the runtime uses
 * `decideVerdict()` to compute the verdict locally when per-candidate score
 * data is available. We surface the prompt's verdict as `verdictHint` so the
 * runtime can fall back to it in the v1 path where the runtime lacks
 * other-candidate scores.
 */

export interface ParsedRescoredRace {
  raceId: string;
  oldScore: number;
  newScore: number;
  /**
   * The verdict string from the prompt's JSON, if present. Used as a fallback
   * by the runtime when `otherCandidateScores` aren't available for the
   * `decideVerdict()` pure function. Treat as unverified — `decideVerdict()`
   * is the source of truth when its inputs are available.
   */
  verdictHint?: string;
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
        oldScore: item.old_score,
        newScore: item.new_score,
        verdictHint:
          typeof item.verdict === "string" ? item.verdict : undefined,
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
  old_score: number;
  new_score: number;
  verdict?: unknown;
} {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  if (typeof record.race_id !== "string") return false;
  if (typeof record.old_score !== "number") return false;
  if (typeof record.new_score !== "number") return false;
  return true;
}
