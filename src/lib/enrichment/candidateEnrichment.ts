import type { CandidateEnrichment, EnrichmentRequest } from "./types";

const TIMEOUT_MS = 15_000; // Allow more time for web_search

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_VOTER_API or ANTHROPIC_API_KEY not configured");
  }
  return key;
}

/**
 * Use Anthropic web_search to research a candidate's voting record,
 * donors, endorsements, and issue positions.
 * Always runs server-side (API key never exposed to client).
 */
export async function enrichCandidate(
  request: EnrichmentRequest,
): Promise<CandidateEnrichment> {
  const base: CandidateEnrichment = {
    candidateId: request.candidateId,
    candidateName: request.candidateName,
    fetchedAt: new Date().toISOString(),
  };

  try {
    const key = getAnthropicKey();
    const officePart = request.office ? ` running for ${request.office}` : "";
    const partyPart = request.party ? ` (${request.party})` : "";
    const statePart = request.state ? ` in ${request.state}` : "";

    const systemPrompt = `You are a nonpartisan voter research assistant.
Search the web for factual information about candidates and return structured summaries.
Focus on: voting records from official sources, FEC campaign finance data, verified endorsements.
Be factual and cite your sources. Keep each section to 2-3 sentences maximum.
Return ONLY valid JSON. No markdown, no explanation outside the JSON object.`;

    const userPrompt = `Research the candidate: ${request.candidateName}${partyPart}${officePart}${statePart}.
Search Ballotpedia, Vote Smart, FEC.gov, and official news sources.
Return a JSON object with these fields:
{
  "votingRecord": "Brief summary of voting record or legislative positions (2-3 sentences)",
  "topDonors": "Top donor industries or notable donors from FEC filings (2-3 sentences)",
  "endorsements": "Notable endorsements from organizations or officials (2-3 sentences)",
  "issuePositions": "Key stated positions on major issues (2-3 sentences)",
  "sourceUrls": ["url1", "url2", "url3"]
}
If no reliable information is found for a field, use null for that field.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "web-search-2025-03-05",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 3,
            },
          ],
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg =
        (errBody as { error?: { message?: string } }).error?.message ??
        `Anthropic API error ${response.status}`;
      console.error("[enrichment] API error:", errMsg);
      return { ...base, error: errMsg };
    }

    const result = await response.json();

    // Extract text from the last content block (after any tool_use turns)
    const textBlock = (
      result as {
        content: { type: string; text?: string }[];
      }
    ).content
      ?.filter((block) => block.type === "text")
      .pop();

    if (!textBlock?.text) {
      return { ...base, error: "No text response from enrichment API" };
    }

    // Parse the JSON response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ...base, error: "Could not parse enrichment response" };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      votingRecord?: string | null;
      topDonors?: string | null;
      endorsements?: string | null;
      issuePositions?: string | null;
      sourceUrls?: string[];
    };

    return {
      ...base,
      votingRecord: parsed.votingRecord ?? undefined,
      topDonors: parsed.topDonors ?? undefined,
      endorsements: parsed.endorsements ?? undefined,
      issuePositions: parsed.issuePositions ?? undefined,
      sourceUrls: parsed.sourceUrls ?? undefined,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const msg = isTimeout
      ? "Candidate enrichment timed out"
      : "Candidate enrichment unavailable";
    console.error("[enrichment]", msg, err);
    return { ...base, error: msg };
  }
}
