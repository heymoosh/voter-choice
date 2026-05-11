import TX from "@/data/states/TX.json";
import CA from "@/data/states/CA.json";
import NH from "@/data/states/NH.json";
import type { StateData } from "./types";

const stateMap: Record<string, StateData> = {
  TX: TX as StateData,
  CA: CA as StateData,
  NH: NH as StateData,
};

export function getStateData(stateCode: string): StateData | null {
  return stateMap[stateCode] ?? null;
}
