import type { StateElectionData } from "./types";

const stateModules: Record<string, () => Promise<unknown>> = {
  TX: () => import("../data/states/TX.json"),
  CA: () => import("../data/states/CA.json"),
  NH: () => import("../data/states/NH.json"),
};

export async function getStateData(
  stateCode: string,
): Promise<StateElectionData | null> {
  const loader = stateModules[stateCode];
  if (!loader) return null;
  const mod = (await loader()) as { default: StateElectionData };
  return mod.default;
}
