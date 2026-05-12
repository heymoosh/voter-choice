import { NextRequest, NextResponse } from "next/server";
import { fetchCivicData } from "@/lib/civicApi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: "invalid_zip", message: "A valid 5-digit zip code is required" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchCivicData(zip);
    return NextResponse.json({
      ...data,
      fetchedAt: Date.now(),
    });
  } catch (error) {
    console.error("[civic/route] Civic API error:", error);
    return NextResponse.json(
      {
        error: "civic_unavailable",
        message:
          error instanceof Error ? error.message : "Civic API unavailable",
      },
      { status: 503 },
    );
  }
}
