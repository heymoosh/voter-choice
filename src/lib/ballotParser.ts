/**
 * Parser for the MY BALLOT structured output from LLM.
 */

export interface BallotEntry {
  race: string;
  choice: string;
}

export interface ParsedBallot {
  county?: string;
  electionName?: string;
  electionDate?: string;
  races: BallotEntry[];
  propositions: BallotEntry[];
  reminder?: string;
}

/**
 * Parse the MY BALLOT section from LLM output or user paste.
 * Returns null if the MY BALLOT marker is not found.
 */
export function parseBallotOutput(text: string): ParsedBallot | null {
  // Look for MY BALLOT marker (in various languages)
  const ballotMatch = text.match(
    /(?:MY BALLOT|MI BOLETA|LÁ PHIẾU CỦA TÔI|我的选票|ورقة اقتراعي)[^\n]*\n([\s\S]*?)(?:\n\n---|\n\nGenerated with|$)/i,
  );

  if (!ballotMatch) return null;

  const content = ballotMatch[0];
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ParsedBallot = {
    races: [],
    propositions: [],
  };

  // Parse header line
  const headerMatch = content.match(
    /(?:MY BALLOT|MI BOLETA|LÁ PHIẾU CỦA TÔI|我的选票|ورقة اقتراعي)\s*[—-]\s*([^—\-\n]+?)(?:\s*[—-]\s*([^—\-\n]+?))?(?:\s*[—-]\s*([^\n]+))?$/im,
  );
  if (headerMatch) {
    result.county = headerMatch[1]?.trim();
    result.electionName = headerMatch[2]?.trim();
    result.electionDate = headerMatch[3]?.trim();
  }

  let inPropositions = false;

  for (const line of lines) {
    if (
      /^(?:Propositions?|Proposiciones?|Đề Xuất|提案|المقترحات):/i.test(line)
    ) {
      inPropositions = true;
      continue;
    }
    if (/^(?:REMINDER|RECORDATORIO|NHẮC NHỞ|提醒|تذكير):/i.test(line)) {
      result.reminder = line.replace(/^[^:]+:\s*/, "");
      continue;
    }
    if (/^Generated with|^This document/i.test(line)) continue;

    // Parse race: choice entries
    const entryMatch = line.match(/^(.+?):\s*(.+)$/);
    if (entryMatch) {
      const entry: BallotEntry = {
        race: entryMatch[1].trim(),
        choice: entryMatch[2].trim(),
      };

      // Skip header line itself
      if (
        /MY BALLOT|MI BOLETA|LÁ PHIẾU|我的选票|ورقة اقتراعي/i.test(entry.race)
      ) {
        continue;
      }

      if (inPropositions) {
        result.propositions.push(entry);
      } else {
        result.races.push(entry);
      }
    }
  }

  if (result.races.length === 0 && result.propositions.length === 0) {
    return null;
  }

  return result;
}

/**
 * Parse voter profile output from LLM.
 * Returns the raw content between === MY VOTER PROFILE === markers.
 */
export function parseVoterProfile(text: string): string | null {
  const match = text.match(
    /={3}\s*(?:MY VOTER PROFILE|MI PERFIL DE VOTANTE|HỒ SƠ CỬ TRI|我的选民档案|ملف الناخب)[^\n]*={3}([\s\S]*?)={3}\s*END(?:[\s\S]*?)={3}/i,
  );
  if (!match) return null;
  return match[0].trim();
}
