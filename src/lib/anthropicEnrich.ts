/**
 * Anthropic API client for candidate enrichment using web_search.
 * SERVER-SIDE ONLY — never import in client components.
 */

import type { CandidateEnrichment } from "@/types/liveElection";

const API_TIMEOUT_MS = 10_000;

export async function enrichCandidate(
  candidateName: string,
  race: string,
  state: string,
): Promise<CandidateEnrichment> {
  const apiKey =
    process.env.ANTHROPIC_VOTER_API || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const prompt = `You are a nonpartisan voter research assistant. Provide a brief, factual summary for the following candidate:

Candidate: ${candidateName}
Race: ${race}
State: ${state}

Please provide:
1. A brief voting record summary (2-3 sentences, if applicable — N/A for new candidates)
2. Top donors summary (1-2 sentences from FEC data or public records)
3. Key endorsements (1-2 sentences)

Format your response as JSON:
{
  "votingRecord": "...",
  "topDonors": "...",
  "endorsements": "...",
  "sources": ["source1", "source2"]
}

If you cannot find reliable information for any section, use "No public data available." Keep the response brief and factual.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 3,
          },
        ],
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textBlock = data.content.find(
      (block) => block.type === "text" && block.text,
    );

    if (!textBlock?.text) {
      return defaultEnrichment();
    }

    // Extract JSON from the response
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultEnrichment();
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<CandidateEnrichment>;
      return {
        votingRecord: parsed.votingRecord || "No public data available.",
        topDonors: parsed.topDonors || "No public data available.",
        endorsements: parsed.endorsements || "No public data available.",
        sources: parsed.sources || [],
      };
    } catch {
      return defaultEnrichment();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error("Anthropic API timed out after 10 seconds");
    }
    throw error;
  }
}

function defaultEnrichment(): CandidateEnrichment {
  return {
    votingRecord: "No public data available.",
    topDonors: "No public data available.",
    endorsements: "No public data available.",
    sources: [],
  };
}
