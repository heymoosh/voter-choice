/**
 * Structured output parsers for Phase 5.
 * Used by both Path A (chat) and Path B (copy-paste) to parse AI output.
 * Lenient parsers — external chatbots and streaming responses vary in whitespace.
 */

// ---- Types -----------------------------------------------------------------

export interface BallotChoice {
  race: string;
  pick: string;
}

export interface BallotData {
  county?: string;
  electionName?: string;
  electionDate?: string;
  choices: BallotChoice[];
  propositions: { number: string; vote: string }[];
  phonePolicy?: string;
  raw: string;
}

export interface VoterProfileData {
  date?: string;
  content: string;
}

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

export interface AlignmentScoresData {
  race: string;
  scores: CandidateAlignment[];
}

export interface ParseResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
}

// ---- Helpers ---------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export { slugify };

// ---- Ballot parser ---------------------------------------------------------

/**
 * Extract a MY BALLOT block from AI text.
 * Looks for the "MY BALLOT" marker and parses choices.
 */
export function parseBallot(text: string): ParseResult<BallotData> {
  if (!text || typeof text !== "string") {
    return { ok: false, data: null, error: "Empty input" };
  }

  // Find the MY BALLOT section
  const ballotMatch = text.match(/MY BALLOT[\s\S]*?(?=={3,}|END BALLOT|$)/i);
  if (!ballotMatch) {
    return { ok: false, data: null, error: "No MY BALLOT marker found" };
  }

  const section = ballotMatch[0];
  const lines = section
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract header line: "MY BALLOT — County — Election — Date"
  const headerMatch = section.match(
    /MY BALLOT\s*[—\-]\s*([^—\-\n]+?)\s*[—\-]\s*([^—\-\n]+?)\s*[—\-]\s*([^\n]+)/i,
  );

  const choices: BallotChoice[] = [];
  const propositions: { number: string; vote: string }[] = [];
  let inPropositions = false;
  let phonePolicy: string | undefined;

  for (const line of lines) {
    if (/^propositions?:/i.test(line)) {
      inPropositions = true;
      continue;
    }
    if (/^reminder:/i.test(line)) {
      phonePolicy = line.replace(/^reminder:\s*/i, "");
      continue;
    }
    if (/^generated with/i.test(line)) continue;
    if (/^this document/i.test(line)) continue;
    if (/^MY BALLOT/i.test(line)) continue;

    if (inPropositions) {
      // Format: "#: YES/NO" or "Prop 1: YES"
      const propMatch = line.match(
        /^(?:prop(?:osition)?\s*)?([0-9A-Z]+)\s*:\s*(YES|NO)/i,
      );
      if (propMatch) {
        propositions.push({
          number: propMatch[1],
          vote: propMatch[2].toUpperCase(),
        });
      }
    } else {
      // Format: "Race Name: Pick" or "Race Name — Pick"
      const choiceMatch = line.match(/^(.+?)\s*[:\—\-]\s*(.+)$/);
      if (choiceMatch && !choiceMatch[0].match(/^(step|note|reminder)/i)) {
        choices.push({
          race: choiceMatch[1].trim(),
          pick: choiceMatch[2].trim(),
        });
      }
    }
  }

  if (choices.length === 0 && propositions.length === 0) {
    return {
      ok: false,
      data: null,
      error: "No ballot choices found in section",
    };
  }

  return {
    ok: true,
    data: {
      county: headerMatch?.[1]?.trim(),
      electionName: headerMatch?.[2]?.trim(),
      electionDate: headerMatch?.[3]?.trim(),
      choices,
      propositions,
      phonePolicy,
      raw: section,
    },
  };
}

// ---- Voter profile parser --------------------------------------------------

/**
 * Extract a voter profile block from AI text.
 * Looks for === MY VOTER PROFILE === markers.
 */
export function parseVoterProfile(text: string): ParseResult<VoterProfileData> {
  if (!text || typeof text !== "string") {
    return { ok: false, data: null, error: "Empty input" };
  }

  const profileMatch = text.match(
    /={3,}\s*MY VOTER PROFILE[\s\S]*?={3,}\s*END VOTER PROFILE\s*={3,}/i,
  );

  if (!profileMatch) {
    // Fallback: look for the section headers
    const fallbackMatch = text.match(/={3,}\s*MY VOTER PROFILE[\s\S]*$/i);
    if (fallbackMatch) {
      const dateMatch = fallbackMatch[0].match(
        /MY VOTER PROFILE\s*[—\-]\s*([^\n=]+)/i,
      );
      return {
        ok: true,
        data: {
          date: dateMatch?.[1]?.trim(),
          content: fallbackMatch[0].trim(),
        },
      };
    }
    return { ok: false, data: null, error: "No voter profile marker found" };
  }

  const content = profileMatch[0];
  const dateMatch = content.match(/MY VOTER PROFILE\s*[—\-]\s*([^\n=]+)/i);

  return {
    ok: true,
    data: {
      date: dateMatch?.[1]?.trim(),
      content: content.trim(),
    },
  };
}

// ---- Alignment scores parser -----------------------------------------------

/**
 * Parse a [ALIGNMENT_SCORES] block from AI text.
 * Lenient about whitespace, indentation, and trailing commas.
 */
export function parseAlignmentScores(
  text: string,
): ParseResult<AlignmentScoresData> {
  if (!text || typeof text !== "string") {
    return { ok: false, data: null, error: "Empty input" };
  }

  const blockMatch = text.match(
    /\[ALIGNMENT_SCORES\]\s*([\s\S]*?)\s*\[\/ALIGNMENT_SCORES\]/i,
  );
  if (!blockMatch) {
    return {
      ok: false,
      data: null,
      error: "No [ALIGNMENT_SCORES] block found",
    };
  }

  let jsonText = blockMatch[1].trim();

  // Fix trailing commas (lenient parsing)
  jsonText = jsonText.replace(/,(\s*[}\]])/g, "$1");

  try {
    const parsed = JSON.parse(jsonText) as AlignmentScoresData;
    if (!parsed.race || !Array.isArray(parsed.scores)) {
      return {
        ok: false,
        data: null,
        error: "Invalid alignment scores structure",
      };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
