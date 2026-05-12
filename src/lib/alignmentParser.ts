import type { AlignmentScoresBlock } from "./types";

/**
 * Parses an [ALIGNMENT_SCORES]...[/ALIGNMENT_SCORES] block from AI output.
 * Returns null if no valid block is found or parsing fails.
 * Lenient about whitespace and trailing commas.
 */
export function parseAlignmentScores(
  text: string,
): AlignmentScoresBlock | null {
  const match = text.match(
    /\[ALIGNMENT_SCORES\]([\s\S]*?)\[\/ALIGNMENT_SCORES\]/i,
  );
  if (!match) return null;

  const jsonText = match[1].trim();

  // Try strict JSON first
  try {
    const parsed = JSON.parse(jsonText) as AlignmentScoresBlock;
    if (isValidAlignmentBlock(parsed)) return parsed;
    return null;
  } catch {
    // Try lenient parse: strip trailing commas
    try {
      const cleaned = jsonText
        .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
        .replace(/'/g, '"'); // replace single quotes
      const parsed = JSON.parse(cleaned) as AlignmentScoresBlock;
      if (isValidAlignmentBlock(parsed)) return parsed;
      return null;
    } catch {
      return null;
    }
  }
}

function isValidAlignmentBlock(data: unknown): data is AlignmentScoresBlock {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.race === "string" &&
    Array.isArray(obj.scores) &&
    obj.scores.every(
      (s: unknown) =>
        s !== null &&
        typeof s === "object" &&
        typeof (s as Record<string, unknown>).candidate === "string" &&
        typeof (s as Record<string, unknown>).overall === "number",
    )
  );
}

/**
 * Creates a URL-safe slug from a candidate name for use in data-testid attributes.
 */
export function candidateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Returns alignment label and color class based on score.
 */
export function alignmentLevel(score: number): "strong" | "mixed" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 40) return "mixed";
  return "weak";
}
