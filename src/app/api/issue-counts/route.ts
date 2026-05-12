/**
 * GET /api/issue-counts?countyFips=<fips>
 * Returns anonymous aggregate counts for all issues in a county.
 * Gracefully returns empty counts if Upstash is unavailable.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCountyCounts, isUpstashAvailable } from "@/lib/upstashClient";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const countyFips = req.nextUrl.searchParams.get("countyFips");

  if (!countyFips) {
    return NextResponse.json({ error: "Missing countyFips" }, { status: 400 });
  }

  // Graceful degrade if Upstash not configured
  if (!isUpstashAvailable()) {
    return NextResponse.json({
      countyFips,
      issueCounts: {},
      totalRespondents: null,
    });
  }

  const counts = await getCountyCounts(countyFips);

  return NextResponse.json({
    countyFips,
    issueCounts: counts ?? {},
    totalRespondents: null,
  });
}
