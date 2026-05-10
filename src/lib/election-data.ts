import zipToStateData from "@/data/zip-to-state.json";
import type {
  ZipLookupResult,
  StateElectionData,
  Election,
  ZipToStateMap,
} from "@/types/election";

const zipToState = zipToStateData as ZipToStateMap;

export function validateZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export function lookupZip(zip: string): ZipLookupResult {
  if (!validateZip(zip)) return { status: "invalid" };
  const states = zipToState[zip];
  if (!states || states.length === 0) return { status: "not-found" };
  if (states.length === 1) return { status: "single", stateCode: states[0] };
  return { status: "multi", stateCodes: states };
}

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

export function getNextElection(
  elections: Election[],
  today: string,
): Election {
  const todayMs = new Date(today + "T00:00:00").getTime();
  const future = elections
    .filter((e) => new Date(e.date + "T00:00:00").getTime() >= todayMs)
    .sort(
      (a, b) =>
        new Date(a.date + "T00:00:00").getTime() -
        new Date(b.date + "T00:00:00").getTime(),
    );
  if (future.length > 0) return future[0];
  return elections
    .slice()
    .sort(
      (a, b) =>
        new Date(b.date + "T00:00:00").getTime() -
        new Date(a.date + "T00:00:00").getTime(),
    )[0];
}
