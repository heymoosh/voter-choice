import type { StateData } from "@/types/state";
import zipToStateData from "@/data/zip-to-state.json";
import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";

const zipToState = zipToStateData as Record<string, string[]>;

const stateMap: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

/**
 * Returns the state code(s) for a given zip code, or null if not found.
 */
export function getStateCodesForZip(zip: string): string[] | null {
  const codes = zipToState[zip];
  if (!codes || codes.length === 0) return null;
  return codes;
}

/**
 * Returns the StateData for a given state code, or null if not found.
 */
export function getStateData(stateCode: string): StateData | null {
  return stateMap[stateCode] ?? null;
}
