/**
 * Parses AI-generated ballot output and alignment score blocks.
 *
 * Ballot format (from docs/BALLOT_PROMPT.md):
 *   MY BALLOT — [County] — [Election Name] — [Date]
 *   [Race]: [Pick]
 *   ...
 *   Propositions:
 *   [#]: [YES / NO]
 *
 * Alignment block:
 *   [ALIGNMENT_SCORES]
 *   { ... json ... }
 *   [/ALIGNMENT_SCORES]
 */

export interface BallotEntry {
  race: string;
  pick: string;
  isProposition?: boolean;
}

export interface ParsedBallot {
  header: string; // "MY BALLOT — ..."
  entries: BallotEntry[];
  raw: string;
}

export interface AlignmentIssue {
  issue: string;
  userPriority: string;
  score: number;
  rationale: string;
  sources: string[];
}

export interface AlignmentCandidate {
  candidate: string;
  overall: number;
  issues: AlignmentIssue[];
}

export interface AlignmentScores {
  race: string;
  scores: AlignmentCandidate[];
}

/**
 * Extract the first MY BALLOT block from AI-generated text.
 * Returns null if no valid block found.
 */
export function parseBallotBlock(text: string): ParsedBallot | null {
  const lines = text.split("\n");
  const startIdx = lines.findIndex((l) =>
    l.trimStart().startsWith("MY BALLOT"),
  );

  if (startIdx === -1) return null;

  const header = lines[startIdx].trim();
  const entries: BallotEntry[] = [];
  let inPropositions = false;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Stop at triple dash, code block end, or double blank
    if (line === "---" || line === "```" || line === "===") break;
    if (!line && i > startIdx + 3 && entries.length > 0) {
      // Allow one blank line, stop on second consecutive blank
      if (i + 1 < lines.length && !lines[i + 1].trim()) break;
      continue;
    }

    if (!line) continue;

    if (line.toLowerCase().startsWith("proposition")) {
      inPropositions = true;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const race = line.slice(0, colonIdx).trim();
      const pick = line.slice(colonIdx + 1).trim();
      if (race && pick) {
        entries.push({ race, pick, isProposition: inPropositions });
      }
    }
  }

  if (entries.length === 0) return null;

  return {
    header,
    entries,
    raw: lines.slice(startIdx).join("\n"),
  };
}

/**
 * Parse the structured [ALIGNMENT_SCORES] block from AI text.
 * Lenient parser — handles whitespace/trailing commas.
 */
export function parseAlignmentScores(text: string): AlignmentScores | null {
  const match = text.match(
    /\[ALIGNMENT_SCORES\]([\s\S]*?)\[\/ALIGNMENT_SCORES\]/,
  );
  if (!match) return null;

  try {
    // Remove trailing commas before parsing (lenient)
    const cleaned = match[1].trim().replace(/,\s*([}\]])/g, "$1");

    return JSON.parse(cleaned) as AlignmentScores;
  } catch {
    return null;
  }
}

/**
 * Extract voter profile block from AI text.
 * Returns the raw profile string or null.
 */
export function extractVoterProfile(text: string): string | null {
  const startMarker = "=== MY VOTER PROFILE";
  const endMarker = "=== END VOTER PROFILE ===";

  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;

  const endIdx = text.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    // Return everything from start marker if end marker not yet present
    return text.slice(startIdx).trim();
  }

  return text.slice(startIdx, endIdx + endMarker.length).trim();
}

/**
 * Convert a name to a URL-safe slug.
 */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Render ballot as printable HTML string (opens in new tab).
 */
export function renderBallotHtml(
  ballot: ParsedBallot,
  language = "en",
): string {
  const reminderLabel =
    language === "es"
      ? "RECORDATORIO"
      : language === "ar"
        ? "تذكير"
        : language === "zh"
          ? "提醒"
          : language === "vi"
            ? "LƯU Ý"
            : "REMINDER";

  const noteLabel =
    language === "es"
      ? "Este documento son sus notas personales, no una boleta oficial."
      : language === "ar"
        ? "هذا المستند ملاحظاتك الشخصية وليس بطاقة اقتراع رسمية."
        : language === "zh"
          ? "本文件是您的个人记录，不是官方选票。"
          : language === "vi"
            ? "Tài liệu này là ghi chú cá nhân của bạn, không phải phiếu bầu chính thức."
            : "This document is your personal notes, not an official ballot.";

  const rows = ballot.entries
    .map(
      (e) =>
        `<tr><td class="race">${escapeHtml(e.race)}</td><td class="pick">${escapeHtml(e.pick)}</td></tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(ballot.header)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #000; background: #fff; }
  h1 { font-size: 1.1rem; border-bottom: 2px solid #000; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 6px 8px; vertical-align: top; }
  td.race { width: 60%; font-weight: bold; }
  td.pick { width: 40%; }
  tr:nth-child(even) { background: #f5f5f5; }
  .reminder { margin-top: 24px; font-size: 0.85rem; border-top: 1px solid #ccc; padding-top: 12px; }
  .note { color: #666; font-size: 0.8rem; margin-top: 16px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>${escapeHtml(ballot.header)}</h1>
<table>
${rows}
</table>
<p class="reminder"><strong>${reminderLabel}:</strong> Verify your choices at your official state election website before Election Day.</p>
<p class="note">${noteLabel}</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
