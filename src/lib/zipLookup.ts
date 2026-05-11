import zipToState from "../data/zip-to-state.json";

const zipMap = zipToState as Record<string, string[]>;

export function lookupZip(zip: string): string[] | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return zipMap[zip] ?? null;
}
