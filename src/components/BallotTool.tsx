"use client";

import { useState, useCallback } from "react";
import { ZipForm } from "./ZipForm";
import { StateSelector } from "./StateSelector";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { lookupState, isValidZip } from "@/lib/zipLookup";
import { buildPrompt } from "@/lib/promptBuilder";
import type { StateData } from "@/types/election";

// Dynamic imports of state data — loaded on demand
const STATE_DATA_LOADERS: Record<string, () => Promise<StateData>> = {
  TX: () =>
    import("@/data/states/TX.json").then(
      (m) => m.default as unknown as StateData,
    ),
  CA: () =>
    import("@/data/states/CA.json").then(
      (m) => m.default as unknown as StateData,
    ),
  NH: () =>
    import("@/data/states/NH.json").then(
      (m) => m.default as unknown as StateData,
    ),
};

type AppState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "error"; message: string }
  | { stage: "not-found" }
  | { stage: "select-state"; states: string[]; zip: string }
  | {
      stage: "result";
      stateData: StateData;
      zip: string;
      promptText: string;
    };

export function BallotTool() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [zipError, setZipError] = useState<string | null>(null);

  const handleZipSubmit = useCallback(async (zip: string) => {
    // Validate
    if (!zip) {
      setZipError("Please enter a zip code");
      return;
    }
    if (!isValidZip(zip)) {
      setZipError("Please enter a valid 5-digit zip code");
      return;
    }
    setZipError(null);
    setAppState({ stage: "loading" });

    // Lookup state(s)
    const states = lookupState(zip);
    if (!states) {
      setAppState({ stage: "not-found" });
      return;
    }

    if (states.length > 1) {
      setAppState({ stage: "select-state", states, zip });
      return;
    }

    await loadStateData(states[0], zip);
  }, []);

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      if (appState.stage !== "select-state") return;
      const { zip } = appState;
      setAppState({ stage: "loading" });
      await loadStateData(stateCode, zip);
    },
    [appState],
  );

  async function loadStateData(stateCode: string, zip: string) {
    const loader = STATE_DATA_LOADERS[stateCode];
    if (!loader) {
      // State code exists in zip data but no data file — show not found
      setAppState({ stage: "not-found" });
      return;
    }

    try {
      const stateData = await loader();
      const promptText = buildPrompt(stateData, zip);
      setAppState({ stage: "result", stateData, zip, promptText });
    } catch {
      setAppState({
        stage: "error",
        message: "Failed to load state data. Please try again.",
      });
    }
  }

  const isLoading = appState.stage === "loading";

  return (
    <div className="space-y-6">
      {/* Zip Form */}
      <div>
        <ZipForm onSubmit={handleZipSubmit} isLoading={isLoading} />

        {/* Validation error */}
        {zipError && (
          <p
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="mt-2 text-red-600 text-sm font-medium"
          >
            {zipError}
          </p>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          role="status"
          aria-label="Loading election information"
          className="flex items-center gap-2 text-gray-500 text-sm py-2"
        >
          <span
            className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          Looking up your election info…
        </div>
      )}

      {/* Not found */}
      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-xl p-5"
        >
          <p className="font-semibold text-amber-900 mb-1">
            Zip code not found
          </p>
          <p className="text-amber-800 text-sm">
            We don&apos;t have data for this zip code yet. We&apos;re working on
            adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900 focus:text-amber-900 focus:outline-2 focus:outline-blue-500 rounded"
            >
              Find your state election website
            </a>
          </p>
        </div>
      )}

      {/* Error */}
      {appState.stage === "error" && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-5"
        >
          <p className="text-red-800 text-sm">{appState.message}</p>
        </div>
      )}

      {/* State selector for multi-state zip */}
      {appState.stage === "select-state" && (
        <StateSelector states={appState.states} onSelect={handleStateSelect} />
      )}

      {/* Results */}
      {appState.stage === "result" && (
        <div className="space-y-8">
          <StateInfoCard stateData={appState.stateData} />
          <PromptOutput promptText={appState.promptText} />
        </div>
      )}
    </div>
  );
}
