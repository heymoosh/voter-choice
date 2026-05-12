import { NextRequest, NextResponse } from "next/server";
import { enrichCandidate } from "@/lib/anthropicEnrich";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { candidateName, race, state } = body as {
    candidateName?: unknown;
    race?: unknown;
    state?: unknown;
  };

  if (
    typeof candidateName !== "string" ||
    !candidateName.trim() ||
    typeof race !== "string" ||
    typeof state !== "string"
  ) {
    return NextResponse.json(
      {
        error: "missing_fields",
        message: "candidateName, race, and state are required",
      },
      { status: 400 },
    );
  }

  try {
    const enrichment = await enrichCandidate(candidateName.trim(), race, state);
    return NextResponse.json(enrichment);
  } catch (error) {
    console.error("[candidate/route] Enrichment error:", error);
    return NextResponse.json(
      {
        error: "enrichment_unavailable",
        message:
          error instanceof Error
            ? error.message
            : "Candidate enrichment unavailable",
      },
      { status: 503 },
    );
  }
}
