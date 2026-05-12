import type { StateData } from "@/types/state";
import tx from "@/data/states/TX.json";
import ca from "@/data/states/CA.json";
import nh from "@/data/states/NH.json";
import zipToState from "@/data/zip-to-state.json";

const STATE_DATA: Record<string, StateData> = {
  TX: tx as StateData,
  CA: ca as StateData,
  NH: nh as StateData,
};

export function getStateData(code: string): StateData | null {
  return STATE_DATA[code.toUpperCase()] ?? null;
}

export function getAllStateCodes(): string[] {
  return Object.keys(STATE_DATA).sort();
}

export function getStateCodesForZip(zip: string): string[] {
  const codes = (zipToState as Record<string, string[]>)[zip];

  return codes ? [...codes] : [];
}

export function getStateName(code: string): string | null {
  return getStateData(code)?.stateName ?? null;
}
