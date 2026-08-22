"use client";

/**
 * /dev/on-device-ai — internal dev comparison page for the on-device-AI
 * (WebLLM) spike. Runs the SAME cold-open theme-extraction task through two
 * paths side by side:
 *   - "cloud": the live Claude path, via POST /api/dev/theme-extraction-compare
 *   - "local": an in-browser WebLLM model, via src/lib/onDeviceAI/*
 *
 * Gated OFF by default behind NEXT_PUBLIC_LAUNCH_ON_DEVICE_AI. Per the
 * LAUNCH_* client-flag convention (src/lib/launch-flags.ts), this exact
 * literal expression is what Next.js statically inlines into the client
 * bundle — do not read it through a helper.
 *
 * Internal dev/test surface — plain, functional, no design-system polish.
 */

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import {
  SUPPORTED_WEBLLM_MODEL_IDS,
  isWebGPUSupported,
  createWebLLMEngine,
  type SupportedWebLLMModelId,
  type LoadProgress,
} from "../../../lib/onDeviceAI/webllmClient";
import {
  runLocalThemeExtraction,
  LocalThemeExtractionParseError,
} from "../../../lib/onDeviceAI/localThemeExtraction";
import type { Theme } from "../../../lib/prompts/types";

const ON_DEVICE_AI_ENABLED =
  process.env.NEXT_PUBLIC_LAUNCH_ON_DEVICE_AI === "true";

const DEFAULT_SAMPLE_TEXT =
  "I'm worried about the cost of healthcare and think we need stronger gun laws.";

interface CloudResultState {
  status: "idle" | "loading" | "done" | "error";
  themes?: Theme[];
  latencyMs?: number;
  error?: string;
}

interface LocalResultState {
  status: "idle" | "loading-model" | "running" | "done" | "error" | "skipped";
  themes?: Theme[];
  latencyMs?: number;
  error?: string;
  rawResponse?: string;
  progress?: LoadProgress;
}

function OnDeviceAIComparisonPage() {
  const [userConcernText, setUserConcernText] = useState(DEFAULT_SAMPLE_TEXT);
  const [selectedModelId, setSelectedModelId] =
    useState<SupportedWebLLMModelId>(SUPPORTED_WEBLLM_MODEL_IDS[0]);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [cloudResult, setCloudResult] = useState<CloudResultState>({
    status: "idle",
  });
  const [localResult, setLocalResult] = useState<LocalResultState>({
    status: "idle",
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setWebGPUSupported(isWebGPUSupported());
  }, []);

  async function runCloudComparison(text: string): Promise<void> {
    setCloudResult({ status: "loading" });
    try {
      const res = await fetch("/api/dev/theme-extraction-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userConcernText: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCloudResult({
          status: "error",
          error: typeof json.error === "string" ? json.error : "Request failed",
        });
        return;
      }
      setCloudResult({
        status: "done",
        themes: json.themes,
        latencyMs: json.latencyMs,
      });
    } catch (err) {
      setCloudResult({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function runLocalComparison(text: string): Promise<void> {
    if (!isWebGPUSupported()) {
      setLocalResult({ status: "skipped" });
      return;
    }
    setLocalResult({ status: "loading-model" });
    try {
      const engine = await createWebLLMEngine(selectedModelId, (progress) => {
        setLocalResult((prev) => ({
          ...prev,
          status: "loading-model",
          progress,
        }));
      });
      setLocalResult((prev) => ({ ...prev, status: "running" }));
      const startedAt = Date.now();
      const themes = await runLocalThemeExtraction(engine, text);
      const latencyMs = Date.now() - startedAt;
      setLocalResult({ status: "done", themes, latencyMs });
    } catch (err) {
      if (err instanceof LocalThemeExtractionParseError) {
        setLocalResult({
          status: "error",
          error: err.message,
          rawResponse: err.rawResponse,
        });
        return;
      }
      setLocalResult({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function runComparison(): Promise<void> {
    if (!userConcernText.trim() || running) return;
    setRunning(true);
    const text = userConcernText.trim();
    await Promise.all([runCloudComparison(text), runLocalComparison(text)]);
    setRunning(false);
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: 24,
        fontFamily: "monospace",
      }}
    >
      <h1>On-device AI comparison (dev only)</h1>
      <p>
        Compares the live cloud (Claude) cold-open theme-extraction path against
        an in-browser WebLLM model, for the same sample voter concern.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="concern-text"
          style={{ display: "block", fontWeight: "bold" }}
        >
          Sample voter concern
        </label>
        <textarea
          id="concern-text"
          value={userConcernText}
          onChange={(e) => setUserConcernText(e.target.value)}
          rows={4}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: "bold" }}>
          Local model
        </label>
        {SUPPORTED_WEBLLM_MODEL_IDS.map((modelId) => (
          <label key={modelId} style={{ display: "block" }}>
            <input
              type="radio"
              name="model"
              value={modelId}
              checked={selectedModelId === modelId}
              onChange={() => setSelectedModelId(modelId)}
              disabled={webGPUSupported === false}
            />{" "}
            {modelId}
          </label>
        ))}
      </div>

      {webGPUSupported === false && (
        <p style={{ color: "#a00", fontWeight: "bold" }}>
          WebGPU not supported in this browser — local-model controls are
          disabled. The cloud-only comparison can still run.
        </p>
      )}

      <button onClick={() => void runComparison()} disabled={running}>
        {running ? "Running…" : "Run comparison"}
      </button>

      <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
        <ResultPanel title="Cloud (Claude)" result={cloudResult} />
        <LocalResultPanel title="Local (WebLLM)" result={localResult} />
      </div>
    </div>
  );
}

function ResultPanel({
  title,
  result,
}: {
  title: string;
  result: CloudResultState;
}) {
  return (
    <div style={{ flex: 1, border: "1px solid #ccc", padding: 12 }}>
      <h2>{title}</h2>
      <p>Status: {result.status}</p>
      {result.latencyMs !== undefined && <p>Latency: {result.latencyMs} ms</p>}
      {result.error && <p style={{ color: "#a00" }}>Error: {result.error}</p>}
      {result.themes && (
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(result.themes, null, 2)}
        </pre>
      )}
    </div>
  );
}

function LocalResultPanel({
  title,
  result,
}: {
  title: string;
  result: LocalResultState;
}) {
  return (
    <div style={{ flex: 1, border: "1px solid #ccc", padding: 12 }}>
      <h2>{title}</h2>
      <p>Status: {result.status}</p>
      {result.status === "skipped" && <p>Skipped — WebGPU not supported.</p>}
      {result.progress && (
        <p>
          Loading model: {result.progress.text} (
          {Math.round(result.progress.progress * 100)}%) — this can take a while
          on first load (0.8–2GB download).
        </p>
      )}
      {result.latencyMs !== undefined && <p>Latency: {result.latencyMs} ms</p>}
      {result.error && <p style={{ color: "#a00" }}>Error: {result.error}</p>}
      {result.rawResponse && (
        <>
          <p style={{ fontWeight: "bold" }}>Raw model response (unparsed):</p>
          <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {result.rawResponse}
          </pre>
        </>
      )}
      {result.themes && (
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {JSON.stringify(result.themes, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function Page() {
  if (!ON_DEVICE_AI_ENABLED) {
    notFound();
  }
  return <OnDeviceAIComparisonPage />;
}
