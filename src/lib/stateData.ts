import type { StateData } from "./types";
import zipToState from "@/data/zip-to-state.json";
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";

const STATE_DATA_MAP: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

type ZipMap = Record<string, string[]>;

/**
 * Get the state code(s) for a given zip code.
 * Returns an empty array if not found.
 */
export function getStatesForZip(zip: string): string[] {
  const map = zipToState as ZipMap;
  return map[zip] ?? [];
}

/**
 * Get state data for a given state code.
 * Returns null if not available.
 */
export function getStateData(stateCode: string): StateData | null {
  return STATE_DATA_MAP[stateCode.toUpperCase()] ?? null;
}
