/**
 * Parses "MY BALLOT" structured output from AI response text.
 * Returns BallotData or null if the marker is missing or content is unparseable.
 */

import type { BallotData } from "@/types/chat";

const BALLOT_MARKER = "MY BALLOT";
const SECTION_END_MARKERS = ["=== END", "[END", "MY VOTER PROFILE", "OUTPUT B"];

/**
 * Extract ballot data from text containing the MY BALLOT marker.
 * Handles both structured AI output (from Path A) and pasted text (from Path B).
 */
export function parseBallot(text: string): BallotData | null {
  // Find the MY BALLOT header line
  const markerIdx = text.indexOf(BALLOT_MARKER);
  if (markerIdx === -1) return null;

  // Find where the ballot section ends
  let endIdx = text.length;
  for (const endMarker of SECTION_END_MARKERS) {
    const idx = text.indexOf(endMarker, markerIdx + BALLOT_MARKER.length);
    if (idx !== -1 && idx < endIdx) {
      endIdx = idx;
    }
  }

  const ballotSection = text.slice(markerIdx, endIdx).trim();
  const lines = ballotSection
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const data: BallotData = {
    entries: [],
    propositions: [],
  };

  // Parse header line: MY BALLOT — County — Election Name — Date
  const headerLine = lines[0];
  if (headerLine) {
    const parts = headerLine.split("—").map((s) => s.trim());
    if (parts.length >= 4) {
      data.county = parts[1];
      data.electionName = parts[2];
      data.date = parts[3];
    } else if (parts.length >= 3) {
      data.county = parts[1];
      data.electionName = parts[2];
    }
  }

  let inPropositions = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.toLowerCase().startsWith("proposition") ||
      line.toLowerCase() === "propositions:"
    ) {
      inPropositions = true;
      continue;
    }

    if (line.toLowerCase().startsWith("reminder:")) {
      data.phonePolicy = line.replace(/^reminder:\s*/i, "");
      continue;
    }

    if (line.toLowerCase().startsWith("generated with")) {
      continue;
    }

    if (line.toLowerCase().startsWith("this document")) {
      continue;
    }

    if (inPropositions) {
      // "#: YES/NO" format
      const propMatch = line.match(/^([^:]+):\s*(YES|NO|Yes|No|yes|no)$/i);
      if (propMatch) {
        data.propositions.push({
          number: propMatch[1].trim(),
          vote: propMatch[2].toUpperCase(),
        });
      }
    } else {
      // "Race Name: My Pick" format
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const race = line.slice(0, colonIdx).trim();
        const pick = line.slice(colonIdx + 1).trim();
        if (race && pick && race !== BALLOT_MARKER) {
          data.entries.push({ race, pick });
        }
      }
    }
  }

  // Return null if we got no meaningful content
  if (data.entries.length === 0 && data.propositions.length === 0) {
    return null;
  }

  return data;
}
