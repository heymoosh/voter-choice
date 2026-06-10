/**
 * State-hint extraction from a free-text address, covering all 50 states + DC.
 * Used by /api/civic to narrow the Google election list when the voterinfo
 * call returns nothing for the default election (hints are matched against
 * Google election NAMES, e.g. "Texas Primary Election" — hence full names).
 */
import { lookupZip } from "./lookupZip";

/** Full jurisdiction-name table keyed by USPS code. */
export const STATE_HINT_NAMES: Record<string, string> = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

/**
 * Returns state name hints extracted from a free-text address string.
 *
 * Signals, most → least reliable (all matches are collected, deduped):
 *  1. ZIP code → `lookupZip` prefix ranges (border ZIPs may yield 2 states).
 *  2. Full state name anywhere (longest names checked first so
 *     "West Virginia" never reads as "Virginia", "Arkansas" never as "Kansas").
 *  3. Two-letter code immediately before the ZIP ("Austin, TX 78701") or
 *     trailing after a comma ("Austin, TX") — positional, so street
 *     directionals like "NE 5th Ave" can't false-positive.
 */
export function stateHintsFromAddress(address: string): string[] {
  const hints = new Set<string>();

  const zipMatch = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) {
    for (const code of lookupZip(zipMatch[1])) {
      const name = STATE_HINT_NAMES[code];
      if (name) hints.add(name);
    }
  }

  const namesLongestFirst = Object.values(STATE_HINT_NAMES).sort(
    (a, b) => b.length - a.length,
  );
  const lower = address.toLowerCase();
  const claimed: string[] = [];
  for (const name of namesLongestFirst) {
    if (!lower.includes(name.toLowerCase())) continue;
    // Skip names contained in an already-claimed longer name
    // ("Virginia" inside "West Virginia", "Kansas" inside "Arkansas").
    if (claimed.some((c) => c.toLowerCase().includes(name.toLowerCase()))) {
      continue;
    }
    claimed.push(name);
    hints.add(name);
  }

  const codeMatch =
    address.match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\b/) ??
    address.match(/,\s*([A-Za-z]{2})\s*$/);
  if (codeMatch) {
    const name = STATE_HINT_NAMES[codeMatch[1].toUpperCase()];
    if (name) hints.add(name);
  }

  return Array.from(hints);
}
