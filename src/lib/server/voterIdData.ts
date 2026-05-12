import type { VoterIdData } from "@/lib/types";

// Supported states for voter ID static data
const SUPPORTED_STATES = new Set([
  "TX",
  "CA",
  "NH",
  "AZ",
  "NM",
  "FL",
  "NY",
  "GA",
  "PA",
  "MI",
]);

export function getVoterIdData(stateCode: string): VoterIdData | null {
  if (!SUPPORTED_STATES.has(stateCode)) return null;
  try {
    // Dynamic require for server-side JSON loading
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(`@/data/voter-id/${stateCode}.json`) as VoterIdData;
    return data;
  } catch {
    return null;
  }
}
