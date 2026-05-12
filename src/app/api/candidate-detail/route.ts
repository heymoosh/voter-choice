import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CandidateDetail } from "@/lib/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { name?: string; office?: string; state?: string; party?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, office, state } = body;
  if (!name || !office || !state) {
    return NextResponse.json(
      { error: "name, office, and state are required" },
      { status: 400 },
    );
  }

  const fetchedAt = new Date().toISOString();

  const prompt = `Research the following political candidate and provide a structured summary:

Candidate: ${name}
Office: ${office}
State: ${state}${body.party ? `\nParty: ${body.party}` : ""}

Please search for and provide:
1. **Voting Record Summary** — Key votes, policy positions based on legislative record or stated positions (3-5 bullet points)
2. **Top Donors / Funding Sources** — Major financial backers or funding profile (3-5 items)
3. **Key Endorsements** — Notable endorsements from organizations, officials, or groups (3-5 items)

Format your response as JSON with this exact structure:
{
  "votingRecord": "Concise narrative summary with key votes/positions (2-3 sentences)",
  "topDonors": "Summary of funding sources (2-3 sentences)",
  "endorsements": "Key endorsements received (2-3 sentences)",
  "citations": ["url1", "url2", "url3"]
}

If you cannot find reliable information about this candidate, say so clearly in the relevant field. Only include verified, factual information with citations.`;

  try {
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          } as Parameters<
            typeof client.messages.create
          >[0]["tools"] extends (infer T)[]
            ? T
            : never,
        ],
        messages: [{ role: "user", content: prompt }],
      },
      {
        timeout: 30_000,
      },
    );

    // Extract text content from response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Try to parse as JSON
    let parsed: {
      votingRecord?: string;
      topDonors?: string;
      endorsements?: string;
      citations?: string[];
    } = {};
    try {
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch =
        textContent.match(/```json\s*([\s\S]*?)\s*```/) ??
        textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
      }
    } catch {
      // If not valid JSON, use the raw text in votingRecord
      parsed = {
        votingRecord: textContent.slice(0, 500),
        topDonors: "Unable to parse response",
        endorsements: "Unable to parse response",
        citations: [],
      };
    }

    const detail: CandidateDetail = {
      votingRecord:
        parsed.votingRecord ?? "No voting record information found.",
      topDonors: parsed.topDonors ?? "No donor information found.",
      endorsements: parsed.endorsements ?? "No endorsement information found.",
      citations: parsed.citations ?? [],
      fetchedAt,
    };

    return NextResponse.json(detail);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[candidate-detail] error:", message);

    // Return a partial error response rather than 500
    const detail: CandidateDetail = {
      votingRecord: "Candidate information temporarily unavailable.",
      topDonors: "Candidate information temporarily unavailable.",
      endorsements: "Candidate information temporarily unavailable.",
      citations: [],
      fetchedAt,
    };
    return NextResponse.json({ ...detail, error: message }, { status: 503 });
  }
}
