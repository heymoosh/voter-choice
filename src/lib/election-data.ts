import type {
  StateElectionData,
  ZipLookupResult,
  Election,
} from "@/types/election";
import { getTodayISO } from "@/lib/date-utils";

// Static JSON imports — bundled at build time, no async fetching needed
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";
import zipToStateData from "@/data/zip-to-state.json";

const STATE_REGISTRY: Record<string, StateElectionData> = {
  TX: txData as StateElectionData,
  CA: caData as StateElectionData,
  NH: nhData as StateElectionData,
};

/**
 * Look up which state(s) a zip code belongs to.
 */
export function lookupZip(zip: string): ZipLookupResult {
  const states = (zipToStateData as Record<string, string[]>)[zip];
  if (!states || states.length === 0) return { type: "not-found" };
  if (states.length === 1)
    return { type: "single-state", stateCode: states[0] };
  return { type: "multi-state", states };
}

/**
 * Get state election data by state code.
 * Returns null if the state is not in the registry.
 */
export function getStateData(stateCode: string): StateElectionData | null {
  return STATE_REGISTRY[stateCode] ?? null;
}

/**
 * Find the next upcoming election for a state.
 * Uses ISO string comparison (timezone-safe for date-only comparisons).
 */
export function getNextElection(
  elections: readonly Election[],
): Election | null {
  const todayISO = getTodayISO();
  const upcoming = elections.filter((e) => e.date >= todayISO);
  if (upcoming.length === 0) return null;
  // Sort ascending and return the soonest
  return [...upcoming].sort((a, b) => a.date.localeCompare(b.date))[0];
}
