import type { StateData, Election } from "../types/state";

import txData from "../data/states/TX.json";
import caData from "../data/states/CA.json";
import nhData from "../data/states/NH.json";

const stateDataMap: Record<string, StateData> = {
  TX: txData as StateData,
  CA: caData as StateData,
  NH: nhData as StateData,
};

export function loadStateData(stateCode: string): StateData | null {
  return stateDataMap[stateCode] ?? null;
}

export function getNextElection(
  stateData: StateData,
  today: Date = new Date()
): Election | null {
  const todayStr = today.toISOString().split("T")[0];
  return stateData.elections.find((e) => e.date >= todayStr) ?? null;
}
