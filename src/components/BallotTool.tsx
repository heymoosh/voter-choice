"use client";

import { useState, useCallback } from "react";
import { ZipForm } from "./ZipForm";
import { StateSelector } from "./StateSelector";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { lookupState, isValidZip } from "@/lib/zipLookup";
import { buildPrompt } from "@/lib/promptBuilder";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { StateData } from "@/types/election";
import type { Locale } from "@/lib/i18n/types";

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

async function loadState(
  stateCode: string,
  zip: string,
  currentLocale: Locale,
  onResult: (s: StateData, p: string) => void,
  onNotFound: () => void,
  onError: (msg: string) => void,
  errorMsg: string,
) {
  const loader = STATE_DATA_LOADERS[stateCode];
  if (!loader) {
    onNotFound();
    return;
  }
  try {
    const stateData = await loader();
    const promptText = buildPrompt(stateData, zip, currentLocale);
    onResult(stateData, promptText);
  } catch {
    onError(errorMsg);
  }
}

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

function BallotToolInner() {
  const { t, locale } = useTranslation();
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [zipError, setZipError] = useState<string | null>(null);

  const handleZipSubmit = useCallback(
    async (zip: string) => {
      if (!zip) {
        setZipError(t.errors.emptyZip);
        return;
      }
      if (!isValidZip(zip)) {
        setZipError(t.errors.invalidZip);
        return;
      }
      setZipError(null);
      setAppState({ stage: "loading" });

      const states = lookupState(zip);
      if (!states) {
        setAppState({ stage: "not-found" });
        return;
      }

      if (states.length > 1) {
        setAppState({ stage: "select-state", states, zip });
        return;
      }

      await loadState(
        states[0],
        zip,
        locale,
        (stateData, promptText) =>
          setAppState({ stage: "result", stateData, zip, promptText }),
        () => setAppState({ stage: "not-found" }),
        (msg) => setAppState({ stage: "error", message: msg }),
        t.errors.loadFailed,
      );
    },
    [t, locale],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      if (appState.stage !== "select-state") return;
      const { zip } = appState;
      setAppState({ stage: "loading" });
      await loadState(
        stateCode,
        zip,
        locale,
        (stateData, promptText) =>
          setAppState({ stage: "result", stateData, zip, promptText }),
        () => setAppState({ stage: "not-found" }),
        (msg) => setAppState({ stage: "error", message: msg }),
        t.errors.loadFailed,
      );
    },
    [appState, locale, t.errors.loadFailed],
  );

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
          aria-label={t.accessibility.loadingElectionInfo}
          className="flex items-center gap-2 text-gray-500 text-sm py-2"
        >
          <span
            className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          {t.loading}
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
            {t.errors.zipNotFound.heading}
          </p>
          <p className="text-amber-800 text-sm">
            {t.errors.zipNotFound.message}{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900 focus:text-amber-900 focus:outline-2 focus:outline-blue-500 rounded"
            >
              {t.errors.zipNotFound.linkText}
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

export function BallotTool() {
  return <BallotToolInner />;
}
