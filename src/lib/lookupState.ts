import zipToState from "@/data/zip-to-state.json";

const zipMap = zipToState as Record<string, string[]>;

export function lookupState(zip: string): string[] | null {
  if (!zip) return null;
  const states = zipMap[zip];
  return states && states.length > 0 ? states : null;
}
