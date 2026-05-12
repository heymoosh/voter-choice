/**
 * ConfirmedConcerns type and helpers for Phase 6 concern disambiguation.
 * No client-side persistence.
 */

export interface DisambiguationMatch {
  issue: string; // canonical issue label (e.g. "Housing")
  quote: string; // relevant quote from free text
  confidence: "high" | "medium" | "low";
}

export interface DisambiguationResult {
  interpretation: string;
  matchedIssues: DisambiguationMatch[];
  unmatched: string[];
}

export interface ConfirmedConcerns {
  freeText: string | null;
  confirmedIssues: string[]; // canonical label keys the user checked
  skipped: boolean;
}

/** Create a skipped/empty ConfirmedConcerns */
export function makeSkippedConcerns(): ConfirmedConcerns {
  return {
    freeText: null,
    confirmedIssues: [],
    skipped: true,
  };
}

/** Create confirmed concerns from user-checked issues */
export function makeConfirmedConcerns(
  freeText: string,
  confirmedIssues: string[],
): ConfirmedConcerns {
  return {
    freeText,
    confirmedIssues,
    skipped: false,
  };
}

/**
 * Build the structured blocks for the copy-paste prompt (Path B).
 */
export function buildConcernBlocks(
  concerns: ConfirmedConcerns,
  interpretation?: string,
): string {
  if (concerns.skipped || !concerns.freeText) return "";

  const interpretationBlock = interpretation
    ? `\n\n[CONCERN_INTERPRETATION]\n${JSON.stringify({ freeText: concerns.freeText, confirmedIssues: concerns.confirmedIssues }, null, 2)}\n[/CONCERN_INTERPRETATION]`
    : "";

  const confirmedBlock = `\n\n[VOTER CONFIRMED CONCERNS]\n${JSON.stringify({ primaryIssues: concerns.confirmedIssues, rationale: "User confirmed AI mapping" }, null, 2)}\n[/VOTER CONFIRMED CONCERNS]`;

  return interpretationBlock + confirmedBlock;
}

/**
 * Build the inline concerns section for the chat system prompt (Path A).
 */
export function buildConcernsPromptSection(
  concerns: ConfirmedConcerns,
): string {
  if (concerns.skipped || concerns.confirmedIssues.length === 0) return "";
  return `\n\nVOTER'S CONFIRMED CONCERNS:\nFree text: "${concerns.freeText}"\nConfirmed issues: ${concerns.confirmedIssues.join(", ")}`;
}
