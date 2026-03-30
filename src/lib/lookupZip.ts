import zipData from "../data/zip-to-state.json";

const zipToState = zipData as Record<string, string[]>;

export function lookupZip(zipCode: string): string[] {
  if (!/^\d{5}$/.test(zipCode)) {
    return [];
  }
  return zipToState[zipCode] ?? [];
}
