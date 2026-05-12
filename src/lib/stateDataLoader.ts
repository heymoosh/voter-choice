import { buildFullPrompt } from "@/lib/promptBuilder";
import type { CandidateContext } from "@/lib/openstates/types";
import type { StateData } from "@/types/state";

export type LoadedStateData = {
  stateData: StateData;
  prompt: string;
};

export async function loadStateData(
  stateCode: string,
  zipCode: string,
  candidate?: CandidateContext | null,
): Promise<LoadedStateData> {
  const response = await fetch(`/api/state/${stateCode}`);

  if (!response.ok) {
    throw new Error(`State data unavailable for ${stateCode}`);
  }

  const stateData = (await response.json()) as StateData;
  return {
    stateData,
    prompt: buildFullPrompt(stateData, zipCode, candidate),
  };
}
