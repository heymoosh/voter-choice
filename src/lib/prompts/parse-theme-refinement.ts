import type { Theme } from "./types";
import { parseThemeExtraction } from "./parse-theme-extraction";

export interface ThemeRefinementResult {
  /** The model's conversational reply (fence removed). May be empty when the
   *  model emitted only the JSON fence. */
  prose: string;
  /** The FULL updated theme array, or null when the reply carried no
   *  parseable fence — a conversational-only turn; the caller keeps the
   *  prior themes. */
  themes: Theme[] | null;
}

const FENCE_RE = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;

/**
 * Parse a theme-refinement reply: prose + (optionally) one fenced JSON block
 * with the full updated theme array.
 *
 * Tolerances, in the spirit of parse-theme-extraction:
 *   - Takes the LAST fence when the model emits several (the contract says
 *     the updated array comes last).
 *   - A malformed or non-theme fence degrades to a conversational-only turn
 *     (themes: null) instead of throwing — the voter still has full manual
 *     editing, so keeping the prior list beats failing the whole turn.
 *   - Validation is delegated to parseThemeExtraction (canonical-issue and
 *     stance filtering included).
 */
export function parseThemeRefinement(raw: string): ThemeRefinementResult {
  const text = (raw || "").trim();
  const fences = [...text.matchAll(FENCE_RE)];
  if (fences.length === 0) {
    return { prose: text, themes: null };
  }

  const last = fences[fences.length - 1];
  const prose = (
    text.slice(0, last.index) + text.slice(last.index! + last[0].length)
  ).trim();

  let themes: Theme[] | null = null;
  try {
    const parsed = parseThemeExtraction(last[1]);
    themes = parsed.length > 0 ? parsed : null;
  } catch {
    themes = null; // malformed fence → conversational-only turn
  }

  return { prose, themes };
}
