import { NextRequest, NextResponse } from "next/server";
import { lookupState } from "@/lib/lookupState";
import { getStateData } from "@/lib/getStateData";
import {
  fetchCivicData,
  normalizeCivicResponse,
} from "@/lib/server/civicClient";
import { ballotDataCache } from "@/lib/server/dataCache";
import { getVoterIdData } from "@/lib/server/voterIdData";
import { getMockFixture } from "@/lib/server/mockFixtures";
import type { BallotData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip")?.trim() ?? "";
  const stateParam = searchParams.get("state")?.trim() ?? "";

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Invalid zip code" }, { status: 400 });
  }

  // E2E_MOCK_APIS mode: return fixture data immediately
  if (process.env.E2E_MOCK_APIS === "1") {
    // First check for multi-state (respects real zip-to-state mapping)
    const stateCodesForMock = lookupState(zip);
    if (stateCodesForMock && stateCodesForMock.length > 1 && !stateParam) {
      return NextResponse.json({
        multiState: true,
        stateCodes: stateCodesForMock,
      });
    }

    const fixture = getMockFixture(zip);
    if (fixture) {
      // Override state if stateParam provided (multi-state scenario)
      if (stateParam && stateParam !== fixture.stateCode) {
        // Build a minimal fixture for the requested state
        const stateData = getStateData(stateParam);
        if (stateData) {
          const mockData: BallotData = {
            ...fixture,
            stateCode: stateParam,
            stateName: stateData.stateName,
            zip,
            fetchedAt: new Date().toISOString(),
            elections: stateData.elections,
            registration: stateData.registration,
            earlyVoting: stateData.earlyVoting,
            votingRules: stateData.votingRules,
            resources: stateData.resources,
          };
          return NextResponse.json(mockData);
        }
      }
      return NextResponse.json({
        ...fixture,
        fetchedAt: new Date().toISOString(),
      });
    }
    // Fall through to real data for unknown zips
  }

  // Check cache
  const cacheKey = stateParam ? `${zip}:${stateParam}` : zip;
  const cached = ballotDataCache.get(cacheKey) as BallotData | null;
  if (cached) {
    return NextResponse.json(cached);
  }

  // Determine state
  const stateCodes = lookupState(zip);
  if (!stateCodes) {
    return NextResponse.json({ error: "ZIP code not found" }, { status: 404 });
  }

  // If multi-state and stateParam not provided, return list for selector
  if (stateCodes.length > 1 && !stateParam) {
    return NextResponse.json({ multiState: true, stateCodes });
  }

  const stateCode = stateParam || stateCodes[0];
  const stateData = getStateData(stateCode);
  if (!stateData) {
    return NextResponse.json(
      { error: "State data not found" },
      { status: 404 },
    );
  }

  const errors: string[] = [];
  let apiFullError = false;

  // Fetch from Google Civic API
  let pollingLocation: BallotData["pollingLocation"] = null;
  let ballotContests: BallotData["ballotContests"] = [];
  let districts: BallotData["districts"] = {};

  const civicRaw = await fetchCivicData(zip);
  if (civicRaw) {
    const normalized = normalizeCivicResponse(
      civicRaw,
      zip,
      stateCode,
      stateData.stateName,
    );
    pollingLocation = normalized.pollingLocation;
    ballotContests = normalized.ballotContests;
    districts = normalized.districts;
  } else {
    errors.push("civic");
  }

  // If Civic failed and we have no static data either, it's a full error
  if (errors.length > 0 && !stateData) {
    apiFullError = true;
  }

  // Load voter ID static data
  const voterIdData = getVoterIdData(stateCode);

  const ballotData: BallotData = {
    stateCode,
    stateName: stateData.stateName,
    zip,
    fetchedAt: new Date().toISOString(),
    districts,
    elections: stateData.elections,
    registration: stateData.registration,
    earlyVoting: stateData.earlyVoting,
    votingRules: stateData.votingRules,
    resources: stateData.resources,
    pollingLocation,
    ballotContests,
    voterIdData,
    errors,
    apiFullError,
  };

  // Cache the result
  ballotDataCache.set(cacheKey, ballotData);

  return NextResponse.json(ballotData);
}
