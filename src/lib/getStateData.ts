import TX from "@/data/states/TX.json";
import CA from "@/data/states/CA.json";
import NH from "@/data/states/NH.json";
import type { StateData } from "./types";

const stateMap: Record<string, StateData> = {
  TX: TX as unknown as StateData,
  CA: CA as unknown as StateData,
  NH: NH as unknown as StateData,
};

export function getStateData(stateCode: string): StateData | null {
  return stateMap[stateCode] ?? null;
}
