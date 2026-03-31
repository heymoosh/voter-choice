import type { StateData } from "./types";

import txData from "@/data/states/TX.json";
import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";
import azData from "@/data/states/AZ.json";
import nmData from "@/data/states/NM.json";

const stateMap: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
  AZ: azData as StateData,
  NM: nmData as StateData,
};

/**
 * Get state election data for a given state code.
 * Returns null if the state is not in the dataset.
 */
export function getStateData(stateCode: string): StateData | null {
  return stateMap[stateCode.toUpperCase()] ?? null;
}
