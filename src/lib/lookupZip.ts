import zipToState from "@/data/zip-to-state.json";

type ZipMap = Record<string, string[]>;
const zipMap = zipToState as ZipMap;

/**
 * Look up the state code(s) for a given 5-digit zip code.
 * Returns an array of state codes (usually one, sometimes two for border zips),
 * or null if the zip is not found in the dataset.
 */
export function lookupZip(zip: string): string[] | null {
  const states = zipMap[zip];
  return states && states.length > 0 ? states : null;
}
