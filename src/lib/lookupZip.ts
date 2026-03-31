import zipToState from '../data/zip-to-state.json';

export function lookupZip(zip: string): string[] | null {
  const result = (zipToState as Record<string, string[]>)[zip];
  return result ?? null;
}
