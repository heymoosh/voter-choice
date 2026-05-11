import zipToState from "@/data/zip-to-state.json";

const ZIP_MAP: Record<string, string[]> = zipToState as Record<
  string,
  string[]
>;

/**
 * Look up state code(s) for a given zip code.
 * Returns an array of state codes (empty if not found, multiple if multi-state).
 */
export function lookupState(zip: string): string[] {
  return ZIP_MAP[zip] ?? [];
}
