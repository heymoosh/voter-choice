import type { InitProgressReport, MLCEngine } from "@mlc-ai/web-llm";

export type { MLCEngine } from "@mlc-ai/web-llm";

export const SUPPORTED_WEBLLM_MODEL_IDS = [
  "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
] as const;

export type SupportedWebLLMModelId =
  (typeof SUPPORTED_WEBLLM_MODEL_IDS)[number];

export type LoadProgress = InitProgressReport;

export function isWebGPUSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export async function createWebLLMEngine(
  modelId: SupportedWebLLMModelId,
  onProgress?: (progress: LoadProgress) => void,
): Promise<MLCEngine> {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  return CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  });
}

export async function runChatCompletion(
  engine: MLCEngine,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const completion = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: false,
  });

  return completion.choices[0]?.message?.content ?? "";
}
