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

/**
 * Strip a trailing "(Vote for N)" affordance from an office name.
 *
 * Real sample ballots label every race uniformly — e.g.
 * "U.S. Senate (Vote for 1)" or "County Commissioners (Vote for 2)" —
 * but the workspace label and the office-collision map in
 * `parsedBallotToContests` both want a clean office string ("U.S. Senate",
 * "County Commissioners"). Apply this to every race, single- or multi-seat,
 * so the visible label never carries the meta-suffix.
 */
function stripVoteForSuffix(office: string): string {
  return office.replace(/\s*\(\s*Vote\s+for\s+\d+\s*\)\s*$/i, "").trim();
}

/**
 * Split a candidate list on commas — but ONLY between completed
 * candidate entries. We detect that by anchoring the split to a comma
 * that's immediately preceded by a closing paren (the end of a party
 * label like "(D)" or "(Democratic)"). That naturally rejects internal
 * commas inside a single name like "Louis Cappelli Jr, Sr" because the
 * "Jr" has no party paren after it.
 *
 * Examples that DO split:
 *   "Alice Smith (D), Bob Jones (R)" → ["Alice Smith (D)", "Bob Jones (R)"]
 *   "A (D), B (R), C (I)"            → ["A (D)", "B (R)", "C (I)"]
 *
 * Examples that do NOT split:
 *   "Louis Cappelli Jr, Sr (D)"      → ["Louis Cappelli Jr, Sr (D)"]
 *   "Alice Smith (D)" (no comma)     → ["Alice Smith (D)"]
 *
 * Trade-off: a list where party labels are omitted entirely (e.g.
 * "Alice Smith, Bob Jones, Carol Lee") will NOT split into three rows
 * — we'd treat it as a single "Alice Smith, Bob Jones, Carol Lee"
 * candidate name. That's acceptable for v1; every multi-candidate
 * ballot we've observed in the wild includes party labels.
 */
function splitCandidateList(raw: string): string[] {
  // Lookbehind for `)`: the comma that ends a candidate entry always
  // follows the party-label closing paren. JS supports lookbehind in
  // node ≥ 10 / modern browsers — already required by the rest of the
  // codebase, so safe to use here.
  return raw.split(/(?<=\)),\s*/).map((s) => s.trim());
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

function tryParseRace(line: string): BallotRace[] {
  const raceMatch = line.match(RACE_LINE_RE);
  if (!raceMatch) return [];

  const rawOffice = raceMatch[1].trim();
  if (SKIP_LABELS.has(rawOffice.toLowerCase())) return [];
  if (/^(?:MY BALLOT|MI BOLETA)/i.test(rawOffice)) return [];

  // Strip "(Vote for N)" from every race; the suffix is meta-data about
  // seat count, not part of the displayed office name.
  const office = stripVoteForSuffix(rawOffice);
  const candidateBlock = raceMatch[2];

  // Comma-separated multi-candidate list (e.g. "A (D), B (R), C (I)").
  // Detect by looking for a comma followed by a fresh capitalized name —
  // the same heuristic the splitter uses. Single-candidate lines fall
  // through to the em-dash-aware path so reason capture is preserved.
  const candidateChunks = splitCandidateList(candidateBlock);
  if (candidateChunks.length > 1) {
    return candidateChunks
      .filter((chunk) => chunk.length > 0)
      .map((chunk) => {
        const { name, party } = extractParty(chunk);
        return { office, candidate: name, party, reason: "" };
      });
  }

  const { candidate, party, reason } = parseCandidateLine(candidateBlock);
  return [{ office, candidate, party, reason }];
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

    const parsedRaces = tryParseRace(line);
    if (parsedRaces.length > 0) races.push(...parsedRaces);
  }

  return { header, races, propositions };
}
