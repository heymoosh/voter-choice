/**
 * Adapter: structured BallotExtraction → plaintext ballot string.
 *
 * The new `/api/extract-ballot` route produces structured JSON conforming
 * to the bake-off target schema, but the existing prompt-fleet pipeline
 * (chat route, theme extraction, race deep-dive) expects a *string* —
 * see `setUserSampleBallotText` in `BallotToolClient.tsx` and the
 * `USER-PROVIDED SAMPLE BALLOT TEXT` block in `generatePrompt.ts`. That
 * string is treated as untrusted ballot content the downstream LLM
 * parses race-by-race.
 *
 * Rather than refactor the whole workspace to consume structured JSON
 * (out of Phase 6 scope), we serialize the JSON back into a clean text
 * format the existing prompts can parse. This keeps the change blast-
 * radius small: the new route is additive, the structured `_meta` lives
 * server-side for telemetry, and the workspace contract is unchanged.
 *
 * Future-us follow-up: once the workspace is updated to consume
 * structured ballots directly, this adapter can be deleted. Filed in
 * post-launch backlog.
 */

import type {
  BallotExtraction,
  ExtractCandidate,
  ExtractRace,
} from "./server/extract-types";

type AdapterInput = Pick<BallotExtraction, "election_metadata" | "sections">;

function fmtCandidate(c: ExtractCandidate): string {
  if (c.placeholder_reason === "write_in") {
    return "  - Write-in";
  }
  if (c.placeholder_reason === "no_petition_filed") {
    return "  - NO PETITION FILED";
  }
  const party = c.party ? ` (${c.party})` : "";
  return `  - ${c.name ?? "(unknown candidate)"}${party}`;
}

function fmtRace(r: ExtractRace): string[] {
  const headerParts: string[] = [];
  headerParts.push(r.office);
  if (r.district) headerParts.push(`District ${r.district}`);
  if (r.position) headerParts.push(`Position ${r.position}`);
  if (r.vote_for_n > 1) headerParts.push(`(vote for ${r.vote_for_n})`);
  if (r.party_context) headerParts.push(`[${r.party_context}]`);

  const lines: string[] = [];
  lines.push(`- ${headerParts.join(" — ")}`);
  for (const c of r.candidates) {
    lines.push(fmtCandidate(c));
  }
  return lines;
}

/**
 * Serialize a BallotExtraction to a plaintext block compatible with the
 * existing USER-PROVIDED SAMPLE BALLOT TEXT prompt slot. Returns empty
 * string if there are no sections — caller can decide what to do.
 */
function buildHeaderLines(meta: AdapterInput["election_metadata"]): string[] {
  const lines: string[] = [];
  const electionLabel: string[] = [];
  if (meta?.jurisdiction) electionLabel.push(meta.jurisdiction);
  if (meta?.election_date) electionLabel.push(meta.election_date);
  if (meta?.election_type) electionLabel.push(meta.election_type);
  if (electionLabel.length > 0) {
    lines.push(`Election: ${electionLabel.join(" — ")}`);
    lines.push("");
  }
  if (meta?.ballot_style) {
    lines.push(`Ballot style: ${meta.ballot_style}`);
    lines.push("");
  }
  return lines;
}

export function ballotJsonToText(input: AdapterInput): string {
  const sections = input.sections ?? [];
  if (sections.length === 0) return "";

  const lines: string[] = [...buildHeaderLines(input.election_metadata)];

  for (const section of sections) {
    lines.push(`## ${section.section_name}`);
    for (const race of section.races) {
      for (const raceLine of fmtRace(race)) {
        lines.push(raceLine);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
