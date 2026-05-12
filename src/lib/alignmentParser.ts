/**
 * Parses [ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES] blocks from AI response text.
 * Returns parsed AlignmentScores or null on failure (graceful degradation).
 * Lenient: handles extra whitespace, trailing commas.
 */

import type { AlignmentScores } from "@/types/chat";

const BLOCK_OPEN = "[ALIGNMENT_SCORES]";
const BLOCK_CLOSE = "[/ALIGNMENT_SCORES]";

/**
 * Extract and parse the alignment scores block from raw text.
 * Returns null if block is absent or JSON is unparseable.
 */
export function parseAlignmentScores(text: string): AlignmentScores | null {
  const startIdx = text.indexOf(BLOCK_OPEN);
  const endIdx = text.indexOf(BLOCK_CLOSE);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  const jsonText = text.slice(startIdx + BLOCK_OPEN.length, endIdx).trim();

  // Remove trailing commas before } or ] (common from LLM output)
  const cleaned = jsonText.replace(/,(\s*[}\]])/g, "$1");

  try {
    const parsed = JSON.parse(cleaned) as AlignmentScores;
    // Basic validation
    if (
      !parsed ||
      typeof parsed.race !== "string" ||
      !Array.isArray(parsed.scores)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Slugify a string for use in data-testid attributes.
 * Example: "Jane Doe" -> "jane-doe"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Strip the [ALIGNMENT_SCORES] block from text, returning only the visible content.
 */
export function stripAlignmentBlock(text: string): string {
  const startIdx = text.indexOf(BLOCK_OPEN);
  const endIdx = text.indexOf(BLOCK_CLOSE);
  if (startIdx === -1 || endIdx === -1) return text;
  return (
    text.slice(0, startIdx) + text.slice(endIdx + BLOCK_CLOSE.length)
  ).trim();
}
