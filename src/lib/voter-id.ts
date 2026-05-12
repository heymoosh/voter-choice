/**
 * Voter ID data loader.
 * Loads static JSON voter ID requirements per state.
 * Falls back to _default.json when a state file doesn't exist.
 */

import type { VoterIdData } from "./api-types";

export async function loadVoterIdData(
  stateCode: string,
): Promise<VoterIdData | null> {
  try {
    const data = await import(`@/data/voter-id/${stateCode}.json`);
    return data.default as VoterIdData;
  } catch {
    // State not found — try default
    try {
      const fallback = await import(`@/data/voter-id/_default.json`);
      const defaults = fallback.default as VoterIdData;
      return { ...defaults, state: stateCode };
    } catch {
      return null;
    }
  }
}
