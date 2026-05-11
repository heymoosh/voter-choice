import type { LookupResult, StateData, ZipToStateMap } from "@/types";
import zipToStateJson from "@/data/zip-to-state.json";

// Dynamically load state data
const STATE_DATA_MAP: Record<string, StateData> = {};

async function loadStateData(stateCode: string): Promise<StateData | null> {
  if (STATE_DATA_MAP[stateCode]) {
    return STATE_DATA_MAP[stateCode];
  }

  try {
    // Import state data dynamically based on state code
    let data: StateData | null = null;
    switch (stateCode) {
      case "TX": {
        const mod = await import("@/data/states/TX.json");
        data = mod.default as StateData;
        break;
      }
      case "CA": {
        const mod = await import("@/data/states/CA.json");
        data = mod.default as StateData;
        break;
      }
      case "NH": {
        const mod = await import("@/data/states/NH.json");
        data = mod.default as StateData;
        break;
      }
      default:
        return null;
    }

    if (data) {
      STATE_DATA_MAP[stateCode] = data;
    }
    return data;
  } catch {
    return null;
  }
}

export function findNextElection(
  stateData: StateData,
  today: Date,
): import("@/types").Election | null {
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  const upcoming = stateData.elections.filter((e) => e.date >= todayStr);
  if (upcoming.length === 0) return null;
  // Sort ascending by date and return the first
  upcoming.sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0];
}

/**
 * Synchronous zip lookup — returns preliminary result.
 * For full stateData, use zipLookupAsync.
 */
export function zipLookupSync(zip: string): {
  type: "single" | "multi" | "not-found";
  states: string[];
} {
  const map = zipToStateJson as ZipToStateMap;
  const states = map[zip];

  if (!states || states.length === 0) {
    return { type: "not-found", states: [] };
  }

  if (states.length > 1) {
    return { type: "multi", states };
  }

  return { type: "single", states };
}

/**
 * Full async zip lookup — resolves state data for the given zip and optional selected state.
 */
export async function zipLookupAsync(
  zip: string,
  selectedState?: string,
): Promise<LookupResult> {
  const map = zipToStateJson as ZipToStateMap;
  const states = map[zip];
  const today = new Date();

  if (!states || states.length === 0) {
    return {
      type: "not-found",
      states: [],
      selectedState: null,
      stateData: null,
      nextElection: null,
    };
  }

  if (states.length > 1 && !selectedState) {
    return {
      type: "multi",
      states,
      selectedState: null,
      stateData: null,
      nextElection: null,
    };
  }

  const stateCode = selectedState ?? states[0];
  const stateData = await loadStateData(stateCode);

  if (!stateData) {
    return {
      type: "not-found",
      states,
      selectedState: stateCode,
      stateData: null,
      nextElection: null,
    };
  }

  const nextElection = findNextElection(stateData, today);

  return {
    type: states.length > 1 ? "multi" : "single",
    states,
    selectedState: stateCode,
    stateData,
    nextElection,
  };
}
