import { StateData, ZipLookup, Election } from "./types";
import zipToStateData from "../data/zip-to-state.json";
import txData from "../data/states/TX.json";
import caData from "../data/states/CA.json";
import nhData from "../data/states/NH.json";

const zipToState: ZipLookup = zipToStateData as ZipLookup;

const stateDataMap: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

/**
 * Look up state codes for a given zip code.
 * Returns an empty array if zip not found.
 */
export function getStateCodesForZip(zipCode: string): string[] {
  return zipToState[zipCode] ?? [];
}

/**
 * Load state data by state code.
 * Returns null if state not in dataset.
 */
export function getStateData(stateCode: string): StateData | null {
  return stateDataMap[stateCode] ?? null;
}

/**
 * Find the next upcoming election on or after today.
 * Returns null if no upcoming elections exist.
 */
export function findNextElection(
  elections: Election[],
  today: Date,
): Election | null {
  const todayStr = today.toISOString().split("T")[0];
  const upcoming = elections.filter((e) => e.date >= todayStr);
  if (upcoming.length === 0) return null;
  // Sort by date ascending and return first
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0];
}
