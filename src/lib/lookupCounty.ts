import txZipToCounty from "../data/tx-zip-to-county.json";

const txMap = txZipToCounty as Record<string, string>;

/**
 * Look up the county for a Texas zip code.
 * Returns the county name (e.g. "Harris") or null if not mapped.
 * This is a best-effort mapping for major metros — Google Civic
 * provides a more authoritative county via address lookup.
 */
export function lookupCounty(
  stateCode: string,
  zipCode: string,
): string | null {
  if (stateCode !== "TX") return null;
  return txMap[zipCode] ?? null;
}
