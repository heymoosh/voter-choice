/**
 * Focused research sub-agent prompt.
 *
 * Used by `runResearchSubAgent` (src/lib/server/research-sub-agent.ts) when the
 * main race-deep-dive Haiku calls the `research_candidate` tool. The sub-agent
 * runs in its own Anthropic call with web_search as the only tool and a strict
 * 3-bullet output contract so the main conversation never sees raw web pages —
 * just the distilled summary. This is the context-hygiene win the tool exists
 * to deliver.
 *
 * Composed with `prependSafetyHeader` at the call site (same pattern as the
 * other v2 prompt fleet members) — keep this body header-free.
 */
export interface ResearchCandidateInput {
  candidateName: string;
  jurisdiction: string;
  topic: string;
}

export function buildResearchCandidatePrompt(
  input: ResearchCandidateInput,
): string {
  return `You are a focused research sub-agent. Your job: research one specific topic about one candidate and return a concise 3-bullet summary.

Candidate:
  <candidate>
    name: ${input.candidateName}
    jurisdiction: ${input.jurisdiction}
  </candidate>

Topic to research:
  <topic>${input.topic}</topic>

Rules:
  · Use web_search (max 3 calls). Prefer Ballotpedia, OpenSecrets, congress.gov, state SOS sites, official campaign sites, local news.
  · Return EXACTLY this shape — 3 bullets, ≤30 words each, plus 1 sources line:

    · <fact 1 with a specific claim>
    · <fact 2 with a specific claim>
    · <fact 3 with a specific claim>
    sources: <URL 1>; <URL 2>; <URL 3>

  · If you can't find reliable info: return 1-2 bullets + a "no public record found" bullet. Don't invent.
  · No recommendation language. Facts only. No advocacy verbs.
  · Output is plain text. No markdown, no headers, no preamble.`;
}
