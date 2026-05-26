import type { Theme } from "./types";

// UTF-8 BOM that occasionally prepends model output when piped through tools.
const BOM = "﻿";

/**
 * Parse Claude's raw text response (which should be a JSON array of themes)
 * into a typed Theme[]. Tolerates:
 *   - A leading UTF-8 BOM and surrounding whitespace
 *   - ```json ... ``` or bare ``` ... ``` markdown fences (with or without a
 *     short preamble line such as "Here are the themes:")
 *   - A wrapping object whose first array-valued field contains the themes
 *     (e.g. `{"themes":[...]}`). Only unwraps when the array's elements look
 *     like themes, so we don't mis-unwrap a single-theme object.
 *
 * Drops individual malformed items (with console.warn) but only throws when
 * the entire payload is unusable (non-JSON, or no themes-shaped array found).
 *
 * Notes on what we deliberately do NOT do:
 *   - We do not normalize em-dashes, smart quotes, or other Unicode inside
 *     JSON string values. The theme-extraction prompt promises the user's
 *     EXACT words back; mutating those characters would break that contract.
 *   - We do not try to "rescue" malformed JSON (trailing commas, unescaped
 *     control characters inside string literals). Those are model-output
 *     bugs that should surface, not be silently coerced.
 */
export function parseThemeExtraction(rawJson: string): Theme[] {
  let cleaned = stripBomAndWhitespace(rawJson);

  // Strip a leading preamble line (anything that ends with `\n` before the
  // first `[`, `{`, or ```` ``` ```` opener). This handles cases where Haiku
  // says "Here are the themes:" before the JSON, with or without a fence.
  cleaned = stripPreamble(cleaned);

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

  const themesArray = coerceToThemesArray(parsed);
  if (themesArray === null) {
    throw new Error("Invalid theme JSON: expected an array at the top level.");
  }

  const valid: Theme[] = [];
  for (const item of themesArray) {
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

function stripBomAndWhitespace(input: string): string {
  let s = input;
  if (s.startsWith(BOM)) s = s.slice(BOM.length);
  return s.trim();
}

function stripPreamble(input: string): string {
  // If the payload starts with `[`, `{`, or a fence, leave it alone.
  if (/^[\[{`]/.test(input)) return input;

  // Otherwise find the first line that opens a structural token and drop
  // everything before it. We only strip up to one preceding newline of
  // preamble — we're not trying to "rescue" arbitrarily long prose blocks.
  const match = input.match(/(?:^|\n)\s*(```|\[|\{)/);
  if (!match || match.index === undefined) return input;
  const startOfStructured = match.index + match[0].length - match[1].length;
  return input.slice(startOfStructured).trim();
}

/**
 * Return the themes-shaped array from a parsed JSON payload.
 *
 * Accepts:
 *   - A top-level array (current contract).
 *   - A top-level object with at least one array-valued field whose first
 *     element looks like a Theme. Returns that array.
 *
 * Returns null if no themes-shaped array can be found.
 */
function coerceToThemesArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed !== "object" || parsed === null) return null;

  for (const value of Object.values(parsed as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0 && looksLikeTheme(value[0])) {
      return value;
    }
  }
  return null;
}

function looksLikeTheme(item: unknown): boolean {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  return typeof record.name === "string" && Array.isArray(record.quotes);
}

function isValidTheme(item: unknown): item is Theme {
  if (typeof item !== "object" || item === null) return false;
  const record = item as Record<string, unknown>;
  if (typeof record.name !== "string") return false;
  if (!Array.isArray(record.quotes)) return false;
  return record.quotes.every((q) => typeof q === "string");
}
