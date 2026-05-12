/**
 * Unified data access layer for live election data.
 * Manages session cache (in-memory, 1-hour TTL) and API calls.
 * Handles partial and full API failures gracefully.
 */

import type { LiveElectionData, ApiError } from "@/types/liveElection";
import { getVoterIdData } from "./voterIdData";
import { lookupState } from "./zipLookup";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: LiveElectionData;
  fetchedAt: number;
}

// Module-level session cache — survives across component re-renders
const sessionCache = new Map<string, CacheEntry>();

/**
 * Check if a cache entry is still valid (within TTL).
 */
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

/**
 * Fetch live election data for a zip code.
 * Uses session cache; falls back gracefully on API failure.
 */
export async function fetchLiveData(zip: string): Promise<LiveElectionData> {
  // Check session cache first
  const cached = sessionCache.get(zip);
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  const apiErrors: ApiError[] = [];

  // Determine state from zip (static lookup)
  const states = lookupState(zip);
  if (!states || states.length === 0) {
    // Unknown zip code — not found
    throw new Error("ZIP_NOT_FOUND");
  }
  const stateCode = states[0];

  // Fetch base state data (static JSON via dynamic import)
  let baseStateData: Awaited<ReturnType<typeof loadBaseStateData>> | null =
    null;
  try {
    baseStateData = await loadBaseStateData(stateCode);
  } catch {
    // Base state data load failed — will use minimal fallback
  }

  // Fetch live civic data from our API route
  let civicResult: Partial<LiveElectionData> = {};
  try {
    const res = await fetchWithTimeout(
      `/api/civic?zip=${encodeURIComponent(zip)}`,
      10_000,
    );
    if (res.ok) {
      const json = (await res.json()) as Partial<LiveElectionData>;
      civicResult = json;
    } else {
      const errJson = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      apiErrors.push({
        source: "civic",
        message: errJson.message || `Civic API returned ${res.status}`,
        code: String(res.status),
      });
    }
  } catch (error) {
    apiErrors.push({
      source: "civic",
      message: (error as Error).message || "Civic API unavailable",
    });
  }

  // Load voter ID data (static — never fails)
  const voterIdData = getVoterIdData(stateCode) ?? undefined;

  // Merge all data sources
  const liveData: LiveElectionData = {
    ...(baseStateData ?? createMinimalStateData(stateCode)),
    ...civicResult,
    voterIdData,
    fetchedAt: Date.now(),
    apiErrors: apiErrors.length > 0 ? apiErrors : undefined,
  };

  // Cache the result
  sessionCache.set(zip, { data: liveData, fetchedAt: Date.now() });

  return liveData;
}

/**
 * Clear the session cache (for testing or manual refresh).
 */
export function clearCache(zip?: string): void {
  if (zip) {
    sessionCache.delete(zip);
  } else {
    sessionCache.clear();
  }
}

/**
 * Check if a zip code result is cached.
 */
export function isCached(zip: string): boolean {
  const entry = sessionCache.get(zip);
  return !!entry && isCacheValid(entry);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Dynamic loaders for state static data
const STATE_DATA_LOADERS: Record<
  string,
  () => Promise<import("@/types/election").StateData>
> = {
  TX: () =>
    import("@/data/states/TX.json").then(
      (m) => m.default as unknown as import("@/types/election").StateData,
    ),
  CA: () =>
    import("@/data/states/CA.json").then(
      (m) => m.default as unknown as import("@/types/election").StateData,
    ),
  NH: () =>
    import("@/data/states/NH.json").then(
      (m) => m.default as unknown as import("@/types/election").StateData,
    ),
};

async function loadBaseStateData(
  stateCode: string,
): Promise<import("@/types/election").StateData | null> {
  const loader = STATE_DATA_LOADERS[stateCode];
  if (!loader) return null;
  return await loader();
}

function createMinimalStateData(
  stateCode: string,
): import("@/types/election").StateData {
  return {
    stateCode,
    stateName: stateCode,
    lastUpdated: new Date().toISOString().split("T")[0],
    elections: [],
    registration: {
      online: { available: false, deadline: null, url: "" },
      byMail: { deadline: "", sincePostmarked: false },
      inPerson: { deadline: "", sincePostmarked: false },
      sameDayRegistration: false,
      registrationCheckUrl: "",
    },
    earlyVoting: {
      available: false,
      startDate: null,
      endDate: null,
    },
    votingRules: {
      idRequired: false,
      acceptedIds: [],
      phonesAtPolls: "varies",
      phonesAtPollsDetail: "",
      additionalRules: [],
    },
    resources: {
      stateElectionWebsite: "",
      countyElectionLookup: "",
      sampleBallotLookup: "",
      pollingPlaceLookup: "",
    },
  };
}
