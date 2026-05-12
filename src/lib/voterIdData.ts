import type { VoterIdInfo } from "./types";

/**
 * Load voter ID requirements for a given state code.
 * Returns null if state file not found (should not happen for valid US state codes).
 *
 * This is a dynamic import so the individual JSON files are only loaded on demand.
 */
export async function getVoterIdInfo(
  stateCode: string,
): Promise<VoterIdInfo | null> {
  try {
    const data = await import(
      `../data/voter-id/${stateCode.toUpperCase()}.json`
    );
    return data.default as VoterIdInfo;
  } catch {
    return null;
  }
}

/**
 * Synchronous version for server-side use (API routes).
 * Uses dynamic require — only available in Node.js (not browser).
 */
export function getVoterIdInfoSync(stateCode: string): VoterIdInfo | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(
      `../data/voter-id/${stateCode.toUpperCase()}.json`,
    ) as VoterIdInfo;
    return data;
  } catch {
    return null;
  }
}
