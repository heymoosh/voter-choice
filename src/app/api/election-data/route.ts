/**
 * GET /api/election-data?zip=XXXXX
 *
 * Server-side API route that aggregates live election data for a zip code.
 * API keys are never exposed to the client.
 *
 * Sources:
 * - Google Civic Information API (polling location, contests, districts)
 * - Static voter ID JSON (gap coverage)
 *
 * Caching: in-memory per zip code, 1-hour TTL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/api-cache";
import { fetchCivicVoterInfo } from "@/lib/civic-client";
import { loadVoterIdData } from "@/lib/voter-id";
import { lookupZip, loadStateData } from "@/lib/ballot-data";
import type { ElectionDataResponse, LiveElectionData } from "@/lib/api-types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip");

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json<ElectionDataResponse>(
      {
        data: null,
        error: "Invalid zip code",
        partial: false,
        fallback: false,
      },
      { status: 400 },
    );
  }

  // Check cache
  const cached = getCached(zip);
  if (cached) {
    return NextResponse.json<ElectionDataResponse>({
      data: cached,
      error: null,
      partial: false,
      fallback: false,
    });
  }

  // Resolve state from zip
  const stateCodes = lookupZip(zip);
  if (!stateCodes || stateCodes.length === 0) {
    return NextResponse.json<ElectionDataResponse>(
      {
        data: null,
        error: "Zip code not found",
        partial: false,
        fallback: false,
      },
      { status: 404 },
    );
  }

  const stateCode = stateCodes[0];
  const stateData = await loadStateData(stateCode);
  const stateName = stateData?.stateName ?? stateCode;

  // Fetch from Google Civic API
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY ?? "";
  let civicData = null;
  let civicError: string | null = null;

  if (apiKey) {
    const address = `${zip}, USA`;
    const result = await fetchCivicVoterInfo(address, apiKey);
    civicError = result.error;
    if (!result.error) {
      civicData = result;
    }
  } else {
    civicError = "Google Civic API key not configured";
    console.error("[election-data] GOOGLE_CIVIC_API_KEY not set");
  }

  // Load static voter ID data (always available)
  const voterIdData = await loadVoterIdData(stateCode);

  const liveData: LiveElectionData = {
    zip,
    stateName,
    stateCode,
    fetchedAt: new Date().toISOString(),
    civicDataAvailable: civicData !== null,
    civicDataError: civicError,
    pollingLocation: civicData?.pollingLocation ?? null,
    districts: civicData?.districts ?? null,
    contests: civicData?.contests ?? [],
    voterIdData,
  };

  // Cache the result
  setCached(zip, liveData);

  const allFailed = !civicData && !voterIdData;
  const partial = civicError !== null && voterIdData !== null;

  return NextResponse.json<ElectionDataResponse>({
    data: liveData,
    error: allFailed ? "All data sources unavailable" : null,
    partial,
    fallback: allFailed,
  });
}
