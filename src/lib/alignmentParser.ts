/**
 * Parser for [ALIGNMENT_SCORES] blocks emitted by the LLM.
 * Lenient about whitespace, indentation, and trailing commas.
 */

export interface AlignmentIssue {
  issue: string;
  userPriority: string;
  score: number;
  rationale: string;
  sources: string[];
}

export interface CandidateAlignment {
  candidate: string;
  overall: number;
  issues: AlignmentIssue[];
}

export interface AlignmentScores {
  race: string;
  scores: CandidateAlignment[];
}

/**
 * Extract and parse [ALIGNMENT_SCORES] block from LLM output.
 * Returns null if no valid block found.
 */
export function parseAlignmentScores(text: string): AlignmentScores | null {
  const match = text.match(
    /\[ALIGNMENT_SCORES\]([\s\S]*?)\[\/ALIGNMENT_SCORES\]/,
  );
  if (!match) return null;

  const jsonStr = match[1].trim();

  // Lenient cleanup: remove trailing commas before } and ]
  const cleaned = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  try {
    const parsed = JSON.parse(cleaned) as AlignmentScores;
    if (!parsed.race || !Array.isArray(parsed.scores)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Slugify a string for use in data-testid attributes.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get alignment label and color class based on score.
 */
export function getAlignmentLevel(score: number): "strong" | "mixed" | "weak" {
  if (score >= 70) return "strong";
  if (score >= 40) return "mixed";
  return "weak";
}

export function getAlignmentColorClass(
  level: "strong" | "mixed" | "weak",
): string {
  switch (level) {
    case "strong":
      return "text-green-700 bg-green-50 border-green-200";
    case "mixed":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "weak":
      return "text-red-700 bg-red-50 border-red-200";
  }
}

export function getAlignmentBarColor(
  level: "strong" | "mixed" | "weak",
): string {
  switch (level) {
    case "strong":
      return "bg-green-500";
    case "mixed":
      return "bg-amber-500";
    case "weak":
      return "bg-red-500";
  }
}
