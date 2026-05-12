import { buildFullPrompt } from "@/lib/promptBuilder";
import type { OpenStatesCandidateContext } from "@/lib/openstates/types";
import type { StateData } from "@/types/state";

export async function loadStateData(
  code: string,
  zip: string,
  candidateContext?: OpenStatesCandidateContext | null,
): Promise<{ stateData: StateData; prompt: string }> {
  const res = await fetch(`/api/state/${code}`);
  if (!res.ok) throw new Error("State data unavailable");

  const stateData: StateData = await res.json();
  const prompt = buildFullPrompt(stateData, zip, candidateContext);

  return { stateData, prompt };
}
