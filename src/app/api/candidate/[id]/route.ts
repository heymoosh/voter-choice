import { NextRequest, NextResponse } from "next/server";
import { enrichCandidate } from "@/lib/enrichment/candidateEnrichment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const party = url.searchParams.get("party") ?? undefined;
  const office = url.searchParams.get("office") ?? undefined;
  const state = url.searchParams.get("state") ?? undefined;

  if (!name) {
    return NextResponse.json(
      { error: "Candidate name is required" },
      { status: 400 },
    );
  }

  try {
    const enrichment = await enrichCandidate({
      candidateId: id,
      candidateName: name,
      party,
      office,
      state,
    });
    return NextResponse.json(enrichment);
  } catch (err) {
    console.error("[api/candidate] unexpected error:", err);
    return NextResponse.json(
      { error: "Candidate enrichment temporarily unavailable" },
      { status: 503 },
    );
  }
}
