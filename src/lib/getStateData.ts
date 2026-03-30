import type { StateElectionData } from "../types/election";

type JsonImport = () => Promise<{ default: unknown }>;

const stateModules: Record<string, JsonImport> = {
  TX: () => import("../data/states/TX.json"),
  CA: () => import("../data/states/CA.json"),
  NH: () => import("../data/states/NH.json"),
  AZ: () => import("../data/states/AZ.json"),
  NM: () => import("../data/states/NM.json"),
};

export async function getStateData(
  stateCode: string,
): Promise<StateElectionData | null> {
  if (!stateCode) return null;
  const loader = stateModules[stateCode.toUpperCase()];
  if (!loader) return null;
  try {
    const data = await loader();
    return data.default as StateElectionData;
  } catch {
    return null;
  }
}
