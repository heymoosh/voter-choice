import { NextRequest, NextResponse } from "next/server";
import { fetchElectionData } from "@/lib/dataLayer";

const ZIP_PATTERN = /^\d{5}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ zip: string }> },
): Promise<NextResponse> {
  const { zip } = await params;

  if (!ZIP_PATTERN.test(zip)) {
    return NextResponse.json(
      { error: "Invalid zip code format" },
      { status: 400 },
    );
  }

  // We need a state code to look up voter ID data.
  // The client passes it as a query param.
  const url = new URL(_request.url);
  const stateCode = url.searchParams.get("state") ?? "";

  try {
    const result = await fetchElectionData(zip, stateCode);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/election] unexpected error:", err);
    return NextResponse.json(
      { error: "Election data temporarily unavailable" },
      { status: 503 },
    );
  }
}
