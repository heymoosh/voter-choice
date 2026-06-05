/**
 * Structured research sub-agent prompt.
 *
 * Used by `runStructuredCandidateResearch` (src/lib/server/research-sub-agent.ts)
 * to drive the new per-issue structured output path for no-record candidates.
 * Returns machine-readable JSON per issue so candidate-data.ts can persist it
 * directly — not the prose 3-bullet summary the original prompt returns.
 *
 * Composed with `prependSafetyHeader` at the call site (same pattern as the
 * rest of the prompt fleet) — keep this body header-free.
 *
 * Output contract: the model must return a single JSON array at the top level.
 * Each element covers ONE canonicalIssue and has:
 *   canonicalIssue: string  (echoed back from input)
 *   issueLabel: string
 *   resolvedStance: "in_favor" | "opposed" | "mixed" | "unclear"
 *   confidence: "high" | "medium" | "low"
 *   evidence: Array<{ summary: string, url: string }>  (1–3 items, real URLs only)
 *
 * Honesty bar: items with no real https?:// URL are dropped by the caller.
 * Issues the model can't find are permitted as "unclear" with low confidence
 * and zero evidence items (caller will then drop them as citation-less).
 */

export interface StructuredResearchInput {
  candidateName: string;
  jurisdiction: string;
  cycle: string;
  issues: Array<{ canonicalIssue: string; issueLabel: string }>;
}

export interface StructuredIssueResult {
  canonicalIssue: string;
  issueLabel: string;
  resolvedStance: "in_favor" | "opposed" | "mixed" | "unclear";
  confidence: "high" | "medium" | "low";
  evidence: Array<{ summary: string; url: string }>;
}

export function buildStructuredResearchPrompt(
  input: StructuredResearchInput,
): string {
  const issueList = input.issues
    .map((i) => `  - ${i.canonicalIssue}: ${i.issueLabel}`)
    .join("\n");

  return `You are a focused structured-research sub-agent. Research one candidate's STATED POSITIONS on a list of issues and return a JSON array. This is stated positions research — not voting records. The candidate may have no legislative record.

Candidate:
  <candidate>
    name: ${input.candidateName}
    jurisdiction: ${input.jurisdiction}
    cycle: ${input.cycle}
  </candidate>

Issues to research (you must return one entry per issue):
${issueList}

Rules:
  · Use web_search (max 3 calls). Prefer Ballotpedia, campaign site, local news, official statements. Avoid opinion or advocacy sites.
  · For EACH issue, determine the candidate's stated position and pick:
      resolvedStance: "in_favor" | "opposed" | "mixed" | "unclear"
      confidence: "high" (clear public statement/position paper) | "medium" (inferred from related statements/party/endorsements) | "low" (thin signal)
  · For each issue, provide 1–3 evidence items: each must have a REAL https:// URL and a ≤30-word summary of what the source says.
  · If you cannot find any reliable source for an issue, set resolvedStance:"unclear", confidence:"low", evidence:[].
  · NEVER fabricate URLs. Only cite URLs you actually retrieved from web_search. A fake URL is worse than no URL.
  · Output is ONLY a valid JSON array — no markdown, no preamble, no explanation. Start with [ and end with ].

Required output shape (one object per issue, in the same order as the input list):
[
  {
    "canonicalIssue": "<echoed from input>",
    "issueLabel": "<echoed from input>",
    "resolvedStance": "in_favor" | "opposed" | "mixed" | "unclear",
    "confidence": "high" | "medium" | "low",
    "evidence": [
      { "summary": "<≤30 words>", "url": "https://..." }
    ]
  }
]`;
}
