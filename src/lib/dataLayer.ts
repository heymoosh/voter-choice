/**
 * Unified data access layer for Phase 3.
 * All API calls happen server-side through this module.
 * UI components consume the unified ElectionDataResult type.
 */

import { fetchVoterInfo, fetchRepresentativeInfo } from "./civic/client";
import { getCached, setCached } from "./civic/cache";
import { mapCivicResponseToElectionInfo } from "./civic/mapper";
import { getVoterIdInfo } from "../data/voter-id/index";
import type { CivicElectionInfo } from "./civic/types";
import type { VoterIdInfo } from "../data/voter-id/index";

export type DataStatus = "ok" | "partial" | "fallback";

export interface ElectionDataResult {
  status: DataStatus;
  civicData: CivicElectionInfo | null;
  voterIdInfo: VoterIdInfo | null;
  stateCode: string;
  zip: string;
  errors: string[];
  fromCache: boolean;
}

/**
 * Fetch all election data for a zip code.
 * - Checks cache first (1-hour TTL)
 * - Fetches from Google Civic API (voter info + representatives)
 * - Loads voter ID from static JSON
 * - Returns graceful fallback if APIs fail
 */
export async function fetchElectionData(
  zip: string,
  stateCode: string,
): Promise<ElectionDataResult> {
  const errors: string[] = [];

  // Check cache first
  const cached = getCached(zip);
  if (cached) {
    const voterIdInfo = getVoterIdInfo(stateCode);
    return {
      status: "ok",
      civicData: cached,
      voterIdInfo,
      stateCode,
      zip,
      errors: [],
      fromCache: true,
    };
  }

  // Fetch voter info and representative info in parallel
  const [voterInfoResult, repInfoResult] = await Promise.all([
    fetchVoterInfo(zip),
    fetchRepresentativeInfo(zip),
  ]);

  if (voterInfoResult.error) {
    errors.push(`Voter info: ${voterInfoResult.error}`);
  }
  if (repInfoResult.error) {
    errors.push(`Representative info: ${repInfoResult.error}`);
  }

  // Load voter ID from static JSON (always available)
  const voterIdInfo = getVoterIdInfo(stateCode);

  // If civic API completely failed
  if (!voterInfoResult.data) {
    return {
      status: voterIdInfo ? "fallback" : "fallback",
      civicData: null,
      voterIdInfo,
      stateCode,
      zip,
      errors,
      fromCache: false,
    };
  }

  // Map civic response to unified model
  const civicData = mapCivicResponseToElectionInfo(
    voterInfoResult.data,
    repInfoResult.data,
  );

  // Cache successful result
  setCached(zip, civicData);

  // Determine status
  const status: DataStatus = errors.length > 0 ? "partial" : "ok";

  return {
    status,
    civicData,
    voterIdInfo,
    stateCode,
    zip,
    errors,
    fromCache: false,
  };
}
