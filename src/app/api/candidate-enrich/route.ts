import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CandidateEnrichment } from "@/lib/types";

const TIMEOUT_MS = 10_000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name) {
    return NextResponse.json(
      { error: "Missing required field: name" },
      { status: 400 },
    );
  }

  const { name, race, state } = body as {
    name: string;
    race?: string;
    state?: string;
  };

  // E2E_MOCK_APIS mode
  if (process.env.E2E_MOCK_APIS === "1") {
    const mockEnrichment: CandidateEnrichment = {
      votingRecord: `${name} has a moderate voting record with a focus on fiscal responsibility and infrastructure investment. Key votes include support for the 2023 Infrastructure Act.`,
      topDonors: `Top donors include various PACs and individual contributors across business and labor sectors.`,
      endorsements: `Endorsed by local business associations and community organizations.`,
      citations: [
        "https://ballotpedia.org (mock)",
        "https://www.fec.gov (mock)",
      ],
    };
    return NextResponse.json(mockEnrichment);
  }

  const apiKey =
    process.env.ANTHROPIC_VOTER_API || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });

  const prompt = [
    `Research the following political candidate and provide a structured summary:`,
    `Candidate: ${name}`,
    race ? `Race: ${race}` : null,
    state ? `State: ${state}` : null,
    ``,
    `Please search the web for information about this candidate and provide:`,
    `1. A brief voting record summary (2-3 sentences, key votes or positions)`,
    `2. Top donors or funding sources (1-2 sentences, from FEC or news sources)`,
    `3. Key endorsements (1-2 sentences)`,
    ``,
    `Format your response as JSON with keys: votingRecord, topDonors, endorsements, citations (array of URLs).`,
    `If you cannot find reliable information, indicate that in each field.`,
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal as AbortSignal },
    );
    clearTimeout(timer);

    // Extract text from response
    let responseText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        responseText = block.text;
        break;
      }
    }

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as CandidateEnrichment;
        return NextResponse.json(parsed);
      } catch {
        // Fall through to default
      }
    }

    // If we can't parse JSON, return the text as votingRecord
    const enrichment: CandidateEnrichment = {
      votingRecord: responseText || "Information not available",
      topDonors: "Information not available",
      endorsements: "Information not available",
      citations: [],
    };
    return NextResponse.json(enrichment);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: "Failed to fetch candidate information" },
      { status: 503 },
    );
  }
}
