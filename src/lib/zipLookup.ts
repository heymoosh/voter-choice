import zipToState from "@/data/zip-to-state.json";

export function lookupZip(zip: string): string[] | null {
  const mapping = zipToState as Record<string, string[]>;
  return mapping[zip] ?? null;
}
