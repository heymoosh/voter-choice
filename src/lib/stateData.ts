import type { StateData } from "./types";
import zipToStateJson from "@/data/zip-to-state.json";
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";

const zipToState = zipToStateJson as Record<string, string[]>;

const stateDataMap: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

/**
 * Look up states for a given zip code.
 * Returns null if zip is not found.
 */
export function getStatesForZip(zip: string): string[] | null {
  const states = zipToState[zip];
  return states && states.length > 0 ? states : null;
}

/**
 * Get state data for a given state code.
 */
export function getStateData(stateCode: string): StateData | null {
  return stateDataMap[stateCode] ?? null;
}
