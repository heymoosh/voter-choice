import type { StateData } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonImport = () => Promise<{ default: any }>;

const stateModules: Record<string, JsonImport> = {
  TX: () => import("@/data/states/TX.json"),
  CA: () => import("@/data/states/CA.json"),
  NH: () => import("@/data/states/NH.json"),
};

/**
 * Load state election data for a given state code.
 * @returns StateData or null if state not found in dataset.
 */
export async function getStateData(
  stateCode: string,
): Promise<StateData | null> {
  const loader = stateModules[stateCode.toUpperCase()];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.default as StateData;
  } catch {
    return null;
  }
}
