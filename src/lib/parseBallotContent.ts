/**
 * Parses the raw text from a "MY BALLOT" block into structured data
 * for rendering as cards in the Research Portfolio view.
 *
 * The AI generates free-form ballot text. This parser extracts:
 * - Race selections (e.g., "U.S. Senate: John Smith (D)")
 * - Propositions with YES/NO votes
 * - A header/title line
 */

export interface BallotRace {
  office: string;
  candidate: string;
  party: string;
  reason: string;
}

export interface BallotProposition {
  number: string;
  title: string;
  vote: "yes" | "no";
  description: string;
}

export interface ParsedBallot {
  header: string;
  races: BallotRace[];
  propositions: BallotProposition[];
}

/**
 * Try to extract party from parenthesized text like "(D)" or "(Republican)"
 */
function extractParty(text: string): { name: string; party: string } {
  const match = text.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { name: match[1].trim(), party: match[2].trim() };
  }
  return { name: text.trim(), party: "" };
}

/**
 * Parse a single candidate line into structured data.
 */
function parseCandidateLine(raw: string): {
  candidate: string;
  party: string;
  reason: string;
} {
  const parts = raw.split(/\s*[—–-]\s*/);
  const candidateRaw = parts[0] || raw;
  const reason = parts.slice(1).join(" — ").trim();
  const { name, party } = extractParty(candidateRaw);
  return { candidate: name, party, reason };
}

const PROP_LINE_RE =
  /^(?:Prop(?:osition|\.)?[\s-]*)([\w.]+)[:\s]+\b(YES|NO|SÍ)\b\s*(?:[—–-]\s*(.*))?$/i;

const SIMPLE_PROP_RE = /^([\w.]+)[:\s]+\b(YES|NO|SÍ)\b\s*(?:[—–-]\s*(.*))?$/i;

const RACE_LINE_RE = /^([^:]{2,50}):\s+(.+)$/;

const SKIP_LABELS = new Set([
  "propositions",
  "proposiciones",
  "ballot measures",
  "medidas electorales",
  "notes",
  "notas",
  "location",
  "ubicación",
]);

const PROP_SECTION_LABELS = new Set([
  "propositions",
  "proposiciones",
  "ballot measures",
  "medidas electorales",
]);

function isSkippableLine(line: string): boolean {
  return !line || line.startsWith("===") || line.startsWith("---");
}

function isHeaderPrefix(line: string): boolean {
  return (
    line.startsWith("MY BALLOT") ||
    line.startsWith("MI BOLETA") ||
    line.startsWith("===") ||
    line.startsWith("---")
  );
}

function findHeader(lines: string[]): string {
  const headerLine =
    lines.find((l) => l.length > 0 && !isHeaderPrefix(l)) ?? "";
  return RACE_LINE_RE.test(headerLine) ? "" : headerLine;
}

function makeProp(match: RegExpMatchArray, prefix: string): BallotProposition {
  const vote = match[2].toUpperCase();
  return {
    number: `${prefix}${match[1]}`,
    title: match[3] || "",
    vote: vote === "NO" ? "no" : "yes",
    description: match[3] || "",
  };
}

function tryParseProposition(
  line: string,
  inPropositions: boolean,
): BallotProposition | null {
  const propMatch = line.match(PROP_LINE_RE);
  if (propMatch) return makeProp(propMatch, "Prop ");

  if (inPropositions) {
    const simpleProp = line.match(SIMPLE_PROP_RE);
    if (simpleProp) return makeProp(simpleProp, "Prop ");
  }

  return null;
}

function tryParseRace(line: string): BallotRace | null {
  const raceMatch = line.match(RACE_LINE_RE);
  if (!raceMatch) return null;

  const office = raceMatch[1].trim();
  if (SKIP_LABELS.has(office.toLowerCase())) return null;
  if (/^(?:MY BALLOT|MI BOLETA)/i.test(office)) return null;

  const { candidate, party, reason } = parseCandidateLine(raceMatch[2]);
  return { office, candidate, party, reason };
}

export function parseBallotContent(ballotText: string): ParsedBallot {
  const lines = ballotText.split("\n").map((l) => l.trim());
  const races: BallotRace[] = [];
  const propositions: BallotProposition[] = [];
  const header = findHeader(lines);
  let inPropositions = false;

  for (const line of lines) {
    if (isSkippableLine(line)) continue;
    if (line === header && header) continue;

    const lower = line.toLowerCase().replace(/:$/, "");
    if (SKIP_LABELS.has(lower)) {
      inPropositions = PROP_SECTION_LABELS.has(lower);
      continue;
    }

    const prop = tryParseProposition(line, inPropositions);
    if (prop) {
      propositions.push(prop);
      continue;
    }

    const race = tryParseRace(line);
    if (race) races.push(race);
  }

  return { header, races, propositions };
}
