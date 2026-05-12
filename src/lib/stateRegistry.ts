import caData from "@/data/states/CA.json";
import nhData from "@/data/states/NH.json";
import txData from "@/data/states/TX.json";
import zipToStateData from "@/data/zip-to-state.json";
import type { StateData } from "@/types/state";

const statesByCode: Record<string, StateData> = {
  CA: caData as StateData,
  NH: nhData as StateData,
  TX: txData as StateData,
};

const zipToState = zipToStateData as Record<string, string[]>;

export function getStateCodesForZip(zipCode: string): string[] {
  return zipToState[zipCode] ?? [];
}

export function getStateData(stateCode: string): StateData | null {
  return statesByCode[stateCode.toUpperCase()] ?? null;
}

export function getAvailableStateCodes(): string[] {
  return Object.keys(statesByCode).sort();
}
