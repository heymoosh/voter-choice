import type { StateElectionData, ZipToStateMap } from "@/types/election";
import zipToStateData from "@/data/zip-to-state.json";

export async function getStateData(
  stateCode: string,
): Promise<StateElectionData | null> {
  try {
    const data = await import(`@/data/states/${stateCode}.json`);
    return data.default as StateElectionData;
  } catch {
    return null;
  }
}

export function getStatesForZip(zipCode: string): string[] | null {
  const zipMap = zipToStateData as ZipToStateMap;
  return zipMap[zipCode] || null;
}
