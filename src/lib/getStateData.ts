import type { StateElectionData } from "../types/election";

const stateModules: Record<string, () => Promise<{ default: StateElectionData }>> = {
  TX: () => import("../data/states/TX.json"),
  CA: () => import("../data/states/CA.json"),
  NH: () => import("../data/states/NH.json"),
  AZ: () => import("../data/states/AZ.json"),
  NM: () => import("../data/states/NM.json"),
};

export async function getStateData(stateCode: string): Promise<StateElectionData | null> {
  if (!stateCode) return null;
  const loader = stateModules[stateCode.toUpperCase()];
  if (!loader) return null;
  try {
    const module = await loader();
    return module.default as StateElectionData;
  } catch {
    return null;
  }
}
