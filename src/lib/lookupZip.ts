import zipOverrides from "../data/zip-to-state.json";

const overrides = zipOverrides as Record<string, string[]>;

/**
 * USPS 3-digit prefix ranges mapped to state codes.
 * Covers all states we have election data for.
 * Source: USPS Publication 65.
 */
const prefixRanges: [number, number, string][] = [
  // Texas
  [733, 739, "TX"],
  [750, 799, "TX"],
  [885, 885, "TX"],

  // California
  [900, 961, "CA"],

  // New Hampshire
  [30, 38, "NH"],

  // Arizona
  [850, 865, "AZ"],

  // New Mexico
  [870, 884, "NM"],
];

function lookupByPrefix(zip: string): string[] {
  const prefix = parseInt(zip.substring(0, 3), 10);
  const matches = new Set<string>();
  for (const [lo, hi, state] of prefixRanges) {
    if (prefix >= lo && prefix <= hi) {
      matches.add(state);
    }
  }
  return Array.from(matches);
}

export function lookupZip(zipCode: string): string[] {
  if (!/^\d{5}$/.test(zipCode)) {
    return [];
  }

  // Explicit overrides take priority (e.g. border zips spanning two states)
  if (overrides[zipCode]) {
    return overrides[zipCode];
  }

  return lookupByPrefix(zipCode);
}
