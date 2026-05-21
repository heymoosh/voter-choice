import type { Theme } from "./types";

/**
 * Parse Claude's raw text response (which should be a JSON array of themes)
 * into a typed Theme[]. Tolerates:
 *   - Surrounding whitespace
 *   - ```json ... ``` or bare ``` ... ``` markdown fences
 *
 * Drops individual malformed items (with console.warn) but only throws when
 * the entire payload is unusable (non-JSON, non-array).
 */
export function parseThemeExtraction(rawJson: string): Theme[] {
  let cleaned = rawJson.trim();

  // Strip ```json or ``` fences if present (matches both styles).
  const fenced = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenced) {
    cleaned = fenced[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Invalid theme JSON: failed to parse — ${(err as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid theme JSON: expected an array at the top level.");
  }

  const valid: Theme[] = [];
  for (const item of parsed) {
    if (isValidTheme(item)) {
      valid.push({ name: item.name, quotes: [...item.quotes] });
    } else {
      console.warn(
        "[parseThemeExtraction] dropping malformed theme item:",
        item,
      );
    }
  }

  return valid;
}

function isValidTheme(item: unknown): item is Theme {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  if (typeof record.name !== "string") return false;
  if (!Array.isArray(record.quotes)) return false;
  return record.quotes.every((q) => typeof q === "string");
}
