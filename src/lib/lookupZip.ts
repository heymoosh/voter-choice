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

  // New York
  [100, 149, "NY"],

  // Florida
  [320, 349, "FL"],

  // Georgia
  [300, 319, "GA"],
  [398, 399, "GA"],

  // North Carolina
  [270, 289, "NC"],

  // New Hampshire
  [30, 38, "NH"],

  // Arizona
  [850, 865, "AZ"],

  // New Mexico
  [870, 884, "NM"],

  // Maine
  [39, 49, "ME"],

  // Vermont
  [50, 59, "VT"],

  // Massachusetts
  [10, 27, "MA"],

  // Rhode Island
  [28, 29, "RI"],

  // Connecticut
  [60, 69, "CT"],

  // New Jersey
  [70, 89, "NJ"],

  // Delaware
  [197, 199, "DE"],

  // Maryland
  [206, 212, "MD"],
  [214, 219, "MD"],

  // Pennsylvania
  [150, 196, "PA"],

  // Washington, D.C.
  [200, 205, "DC"],

  // SE batch
  // Alabama
  [350, 369, "AL"],

  // Arkansas
  [716, 729, "AR"],

  // Kentucky
  [400, 427, "KY"],

  // Louisiana
  [700, 714, "LA"],

  // Mississippi
  [386, 397, "MS"],

  // Oklahoma (730-731 and 734-749; 733-739 already covered by TX for border overlap)
  [730, 731, "OK"],
  [734, 749, "OK"],

  // South Carolina
  [290, 299, "SC"],

  // Tennessee
  [370, 385, "TN"],

  // Virginia: Northern VA suburbs start at 220; 201-219 are MD/DC
  [220, 246, "VA"],

  // West Virginia
  [247, 268, "WV"],

  // West + Mountain batch (Phase 2 W agent)
  // Alaska (995-999)
  [995, 999, "AK"],

  // Colorado (800-816)
  [800, 816, "CO"],

  // Hawaii (967-968)
  [967, 968, "HI"],

  // Idaho (832-838)
  [832, 838, "ID"],

  // Montana (590-599)
  [590, 599, "MT"],

  // Nevada (889-898)
  [889, 898, "NV"],

  // Oregon (970-979)
  [970, 979, "OR"],

  // Utah (840-847)
  [840, 847, "UT"],

  // Washington state (980-994)
  [980, 994, "WA"],

  // Wyoming (820-831)
  [820, 831, "WY"],

  // MW batch (Phase 2)
  // Illinois (600-629)
  [600, 629, "IL"],

  // Indiana (460-479)
  [460, 479, "IN"],

  // Iowa (500-528)
  [500, 528, "IA"],

  // Kansas (660-679)
  [660, 679, "KS"],

  // Michigan (480-499)
  [480, 499, "MI"],

  // Minnesota (550-567)
  [550, 567, "MN"],

  // Missouri (630-658)
  [630, 658, "MO"],

  // Nebraska (680-693)
  [680, 693, "NE"],

  // North Dakota (580-588)
  [580, 588, "ND"],

  // Ohio (430-458)
  [430, 458, "OH"],

  // South Dakota (570-577)
  [570, 577, "SD"],

  // Wisconsin (530-549)
  [530, 549, "WI"],
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
