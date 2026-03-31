import type { StateElectionData } from './types';

const stateModules: Record<string, () => Promise<{ default: StateElectionData }>> = {
  TX: () => import('../data/states/TX.json') as Promise<{ default: StateElectionData }>,
  CA: () => import('../data/states/CA.json') as Promise<{ default: StateElectionData }>,
  NH: () => import('../data/states/NH.json') as Promise<{ default: StateElectionData }>,
};

export async function getStateData(stateCode: string): Promise<StateElectionData | null> {
  const loader = stateModules[stateCode];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}
