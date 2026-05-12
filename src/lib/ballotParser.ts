import type { ParsedBallot, BallotEntry } from "./types";

/**
 * Parses a "MY BALLOT" block from AI output.
 * Returns null if no valid block is found.
 */
export function parseBallot(text: string): ParsedBallot | null {
  // Find the MY BALLOT marker and header line
  const markerMatch = text.match(
    /MY BALLOT\s*[—–-]+\s*(.+?)\s*[—–-]+\s*(.+?)\s*[—–-]+\s*(.+?)(?:\n|$)/i,
  );
  if (!markerMatch) return null;

  const county = markerMatch[1].trim();
  const electionName = markerMatch[2].trim();
  const date = markerMatch[3].trim();

  // Extract content after the header line
  const headerEnd = text.indexOf(markerMatch[0]) + markerMatch[0].length;
  const body = text.slice(headerEnd);

  // Extract REMINDER line if present
  const reminderMatch = body.match(/^REMINDER:\s*(.+)$/im);
  const reminder = reminderMatch ? reminderMatch[1].trim() : undefined;

  // Parse entries: lines with "Something: Something"
  // Stop at REMINDER, "Generated with", or end
  const stopPattern = /^(REMINDER:|Generated with|This document)/im;
  const stopMatch = body.search(stopPattern);
  const entriesText = stopMatch >= 0 ? body.slice(0, stopMatch) : body;

  const entries: BallotEntry[] = [];
  const lines = entriesText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Match "Race: Choice" or "Race : Choice"
    const colonIdx = trimmed.lastIndexOf(":");
    if (colonIdx > 0) {
      const race = trimmed.slice(0, colonIdx).trim();
      const choice = trimmed.slice(colonIdx + 1).trim();
      if (race && choice) {
        entries.push({ race, choice });
      }
    }
  }

  if (entries.length === 0) return null;

  return { county, electionName, date, entries, reminder };
}

/**
 * Formats a parsed ballot as printable HTML.
 */
export function formatBallotHtml(ballot: ParsedBallot): string {
  const entriesHtml = ballot.entries
    .map(
      (e) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:600;">${escHtml(e.race)}</td>` +
        `<td style="padding:4px 0;">${escHtml(e.choice)}</td></tr>`,
    )
    .join("");

  const reminderHtml = ballot.reminder
    ? `<p style="margin-top:16px;font-size:13px;border-top:1px solid #ccc;padding-top:12px;">` +
      `<strong>REMINDER:</strong> ${escHtml(ballot.reminder)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>My Ballot</title>
<style>
  body { font-family: Georgia, serif; max-width: 600px; margin: 40px auto; padding: 20px; font-size: 15px; color: #111; }
  h1 { font-size: 20px; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>MY BALLOT — ${escHtml(ballot.county)} — ${escHtml(ballot.electionName)} — ${escHtml(ballot.date)}</h1>
<table>
${entriesHtml}
</table>
${reminderHtml}
<p style="margin-top:20px;font-size:12px;color:#666;">Generated with VoterChoice — voterchoice.org<br>
This document is your personal notes, not an official ballot.</p>
</body>
</html>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
