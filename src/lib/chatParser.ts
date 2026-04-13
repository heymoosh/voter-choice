/**
 * Parses structured [CANDIDATES] and [PROPOSITION] JSON blocks
 * from assistant messages. Returns structured data and cleaned
 * display text with the raw JSON blocks removed.
 */

export interface CandidateData {
  name: string;
  status: "incumbent" | "challenger" | "newcomer";
  focus: string;
  party?: string;
}

export interface CandidatesBlock {
  type: "candidates";
  race: string;
  candidates: CandidateData[];
}

export interface PropositionBlock {
  type: "proposition";
  number: string;
  title: string;
  description: string;
  recommendation: "yes" | "no" | "undecided";
  reasoning: string;
}

export type StructuredBlock = CandidatesBlock | PropositionBlock;

export interface ParsedMessage {
  displayText: string;
  blocks: StructuredBlock[];
}

const CANDIDATES_RE = /\[CANDIDATES\]([\s\S]*?)\[\/CANDIDATES\]/g;
const PROPOSITION_RE = /\[PROPOSITION\]([\s\S]*?)\[\/PROPOSITION\]/g;

function tryParseJSON(raw: string): unknown | null {
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

function isValidStatus(
  s: unknown,
): s is "incumbent" | "challenger" | "newcomer" {
  return s === "incumbent" || s === "challenger" || s === "newcomer";
}

function isValidRecommendation(s: unknown): s is "yes" | "no" | "undecided" {
  return s === "yes" || s === "no" || s === "undecided";
}

function parseCandidate(c: unknown): CandidateData | null {
  if (!c || typeof c !== "object") return null;
  const cObj = c as Record<string, unknown>;
  if (typeof cObj.name !== "string" || typeof cObj.focus !== "string")
    return null;
  return {
    name: cObj.name,
    status: isValidStatus(cObj.status) ? cObj.status : "newcomer",
    focus: cObj.focus,
    party: typeof cObj.party === "string" ? cObj.party : undefined,
  };
}

function parseCandidatesBlock(raw: string): CandidatesBlock | null {
  const data = tryParseJSON(raw);
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  if (typeof obj.race !== "string" || !Array.isArray(obj.candidates))
    return null;

  const candidates = obj.candidates
    .map(parseCandidate)
    .filter((c): c is CandidateData => c !== null);

  if (candidates.length === 0) return null;

  return { type: "candidates", race: obj.race, candidates };
}

function parsePropositionBlock(raw: string): PropositionBlock | null {
  const data = tryParseJSON(raw);
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  if (typeof obj.number !== "string" || typeof obj.title !== "string")
    return null;

  const desc = typeof obj.description === "string" ? obj.description : "";
  const rec = isValidRecommendation(obj.recommendation)
    ? obj.recommendation
    : "undecided";
  const reasoning = typeof obj.reasoning === "string" ? obj.reasoning : "";

  return {
    type: "proposition",
    number: obj.number,
    title: obj.title,
    description: desc,
    recommendation: rec,
    reasoning,
  };
}

export function parseStructuredContent(content: string): ParsedMessage {
  const blocks: StructuredBlock[] = [];

  // Extract candidates blocks
  let match: RegExpExecArray | null;

  const candidatesRe = new RegExp(CANDIDATES_RE.source, "g");
  while ((match = candidatesRe.exec(content)) !== null) {
    const block = parseCandidatesBlock(match[1]);
    if (block) blocks.push(block);
  }

  const propositionRe = new RegExp(PROPOSITION_RE.source, "g");
  while ((match = propositionRe.exec(content)) !== null) {
    const block = parsePropositionBlock(match[1]);
    if (block) blocks.push(block);
  }

  // Remove raw blocks from display text
  const displayText = content
    .replace(CANDIDATES_RE, "")
    .replace(PROPOSITION_RE, "")
    .trim();

  return { displayText, blocks };
}

/**
 * Tracks research progress based on which structured content types
 * have appeared across all messages in the conversation.
 */
export interface ResearchProgress {
  /** 0-100 estimated percentage */
  percent: number;
  /** Races where the user has confirmed a selection */
  selections: SelectionEntry[];
  /** Whether candidates have been discussed */
  hasCandidates: boolean;
  /** Whether propositions have been discussed */
  hasPropositions: boolean;
  /** Whether a ballot has been generated */
  hasBallot: boolean;
}

export interface SelectionEntry {
  race: string;
  pick: string;
}

const BALLOT_MARKER = /MY BALLOT|MI BOLETA/i;
const PROFILE_MARKER = /MY VOTER PROFILE|MI PERFIL DE VOTANTE/i;

export function computeProgress(
  allBlocks: StructuredBlock[],
  messageCount: number,
  fullContent: string,
): ResearchProgress {
  const hasCandidates = allBlocks.some((b) => b.type === "candidates");
  const hasPropositions = allBlocks.some((b) => b.type === "proposition");
  const hasBallot = BALLOT_MARKER.test(fullContent);
  const hasProfile = PROFILE_MARKER.test(fullContent);

  // Build selections from proposition recommendations
  const selections: SelectionEntry[] = [];
  for (const b of allBlocks) {
    if (b.type === "proposition" && b.recommendation !== "undecided") {
      selections.push({
        race: b.number,
        pick: b.recommendation.toUpperCase(),
      });
    }
  }

  // Estimate progress:
  // - Conversation started: 10%
  // - Issues discussed (messageCount > 4): +15%
  // - Candidates presented: +25%
  // - Propositions presented: +20%
  // - Ballot generated: +20%
  // - Profile generated: +10%
  let percent = 10;
  if (messageCount > 4) percent += 15;
  if (hasCandidates) percent += 25;
  if (hasPropositions) percent += 20;
  if (hasBallot) percent += 20;
  if (hasProfile) percent += 10;

  return {
    percent: Math.min(percent, 100),
    selections,
    hasCandidates,
    hasPropositions,
    hasBallot,
  };
}
