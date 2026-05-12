/**
 * POST /api/candidate-detail
 *
 * Server-side route that fetches candidate enrichment data via Anthropic
 * with web_search enabled. Returns voting record, donors, and endorsements.
 *
 * Request body: { candidateName: string, office: string, state: string }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type {
  CandidateDetailResponse,
  CandidateEnrichment,
} from "@/lib/api-types";

export const runtime = "nodejs";

const TIMEOUT_MS = 30000;

interface RequestBody {
  candidateName: string;
  office: string;
  state: string;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json<CandidateDetailResponse>(
      { enrichment: null, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { candidateName, office, state } = body;
  if (!candidateName || !office || !state) {
    return NextResponse.json<CandidateDetailResponse>(
      { enrichment: null, error: "Missing required fields" },
      { status: 400 },
    );
  }

  const apiKey =
    process.env.ANTHROPIC_VOTER_API ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[candidate-detail] ANTHROPIC_VOTER_API not set");
    return NextResponse.json<CandidateDetailResponse>(
      { enrichment: null, error: "Candidate research service unavailable" },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a nonpartisan civic research assistant. Research the following candidate and provide a concise, factual summary based on publicly available information.

Candidate: ${candidateName}
Office sought: ${office}
State: ${state}

Please provide:
1. A 2-3 sentence summary of the candidate's background and key positions
2. A brief voting record summary (if they hold or have held office) — 2-3 bullet points
3. Top 2-3 donor categories or notable funders (from FEC or state filings)
4. Key endorsements (2-3 most notable)
5. Your sources (links or source names)

Format your response as JSON with these fields:
{
  "summary": "...",
  "votingRecord": "...",
  "topDonors": "...",
  "endorsements": "...",
  "sources": ["...", "..."]
}

If information is not available or the candidate is not found, use "Information not available" for that field. Always be factual and nonpartisan.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
      },
      { signal: controller.signal },
    );

    // Extract text from response content blocks
    const textContent = response.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join("");

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json<CandidateDetailResponse>({
        enrichment: null,
        error: "Could not parse candidate research results",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]) as Omit<
      CandidateEnrichment,
      "fetchedAt"
    >;
    const enrichment: CandidateEnrichment = {
      ...parsed,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json<CandidateDetailResponse>({
      enrichment,
      error: null,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json<CandidateDetailResponse>(
        { enrichment: null, error: "Research timed out. Try again." },
        { status: 504 },
      );
    }
    console.error("[candidate-detail] Error:", err);
    return NextResponse.json<CandidateDetailResponse>(
      {
        enrichment: null,
        error: "Research service error. Try again later.",
      },
      { status: 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
