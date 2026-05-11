import type { ZipToStateMap } from "@/types";
import zipData from "@/data/zip-to-state.json";

const zipToStateMap: ZipToStateMap = zipData as ZipToStateMap;

/**
 * Look up state code(s) for a given 5-digit zip code.
 * @returns Array of 2-letter state codes, or null if not found.
 */
export function lookupZip(zip: string): string[] | null {
  const states = zipToStateMap[zip];
  if (!states || states.length === 0) return null;
  return states;
}
