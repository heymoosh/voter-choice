import zipToStateData from "@/data/zip-to-state.json";

const ZIP_TO_STATE: Record<string, string[]> = zipToStateData as Record<
  string,
  string[]
>;

/**
 * Look up the state code(s) for a given 5-digit zip code.
 * Returns an array of state codes (e.g. ["TX"]) or null if not found.
 */
export function lookupState(zip: string): string[] | null {
  const states = ZIP_TO_STATE[zip];
  if (!states || states.length === 0) return null;
  return states;
}

/**
 * Validate that a string is a 5-digit numeric zip code.
 */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}
