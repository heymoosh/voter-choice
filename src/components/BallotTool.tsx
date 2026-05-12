"use client";

import { useState, useCallback, useMemo } from "react";
import { StateData, Election, LiveElectionData } from "@/lib/types";
import {
  getStateCodesForZip,
  getStateData,
  findNextElection,
} from "@/lib/stateData";
import { fetchElectionData } from "@/lib/electionData";
import { buildPrompt } from "@/lib/promptBuilder";
import { useLanguage } from "@/lib/i18n";
import ZipForm from "./ZipForm";
import StateInfo from "./StateInfo";
import StateSelector from "./StateSelector";
import PromptOutput from "./PromptOutput";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; zipCode: string; stateCodes: string[] }
  | {
      status: "result";
      zipCode: string;
      stateData: StateData;
      election: Election | null;
      liveData?: LiveElectionData;
      isLiveLoading?: boolean;
    }
  | { status: "not-found"; zipCode: string };

export default function BallotTool() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const today = useMemo(() => new Date(), []);
  const { lang, t } = useLanguage();

  // Build the prompt on-the-fly based on current language so it updates when lang changes
  const promptText = useMemo(() => {
    if (appState.status !== "result") return "";
    return buildPrompt(
      appState.stateData,
      appState.zipCode,
      appState.election,
      lang,
    );
  }, [appState, lang]);

  const handleZipSubmit = useCallback(
    async (zipCode: string) => {
      setAppState({ status: "loading" });

      // Resolve static data first (fast, synchronous)
      const stateCodes = getStateCodesForZip(zipCode);

      if (stateCodes.length === 0) {
        // Try live API even for unknown zips — Civic might know the state
        try {
          const liveData = await fetchElectionData(zipCode);
          if (liveData.stateCodes.length > 0) {
            const stateCode = liveData.stateCodes[0];
            const data = getStateData(stateCode);
            if (data) {
              const election = findNextElection(data.elections, today);
              setAppState({
                status: "result",
                zipCode,
                stateData: data,
                election,
                liveData,
                isLiveLoading: false,
              });
              return;
            }
          }
        } catch {
          // Fall through to not-found
        }
        setAppState({ status: "not-found", zipCode });
        return;
      }

      if (stateCodes.length > 1) {
        setAppState({ status: "multi-state", zipCode, stateCodes });
        return;
      }

      const stateCode = stateCodes[0];
      const data = getStateData(stateCode);

      if (!data) {
        setAppState({ status: "not-found", zipCode });
        return;
      }

      const election = findNextElection(data.elections, today);

      // Show static results immediately, then fetch live data
      setAppState({
        status: "result",
        zipCode,
        stateData: data,
        election,
        isLiveLoading: true,
      });

      // Fetch live data in background (progressive loading)
      try {
        const liveData = await fetchElectionData(zipCode);
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, liveData, isLiveLoading: false };
        });
      } catch {
        // Live data unavailable — static data still shows
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, isLiveLoading: false };
        });
      }
    },
    [today],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      if (appState.status !== "multi-state") return;
      const { zipCode } = appState;

      const data = getStateData(stateCode);
      if (!data) {
        setAppState({ status: "not-found", zipCode });
        return;
      }

      const election = findNextElection(data.elections, today);

      setAppState({
        status: "result",
        zipCode,
        stateData: data,
        election,
        isLiveLoading: true,
      });

      // Fetch live data in background
      try {
        const liveData = await fetchElectionData(zipCode);
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, liveData, isLiveLoading: false };
        });
      } catch {
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, isLiveLoading: false };
        });
      }
    },
    [appState, today],
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Zip Code Entry */}
      <section aria-label="Zip code entry">
        <ZipForm
          onSubmit={handleZipSubmit}
          isLoading={appState.status === "loading"}
        />
      </section>

      {/* Loading indicator */}
      {appState.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Looking up your zip code"
          className="flex items-center gap-3 text-gray-600"
        >
          <svg
            className="w-5 h-5 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            {lang === "es"
              ? "Buscando tu código postal..."
              : "Looking up your zip code..."}
          </span>
        </div>
      )}

      {/* Not found */}
      {appState.status === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800"
        >
          <h3 className="font-semibold text-base mb-1">{t("notFoundTitle")}</h3>
          <p className="text-sm">
            {t("notFoundBody", { zip: appState.zipCode })}{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              {t("notFoundLink")}
            </a>
            .
          </p>
        </div>
      )}

      {/* Multi-state selector */}
      {appState.status === "multi-state" && (
        <StateSelector
          stateCodes={appState.stateCodes}
          selectedState={null}
          onSelect={handleStateSelect}
        />
      )}

      {/* Results */}
      {appState.status === "result" && (
        <>
          <StateInfo
            stateData={appState.stateData}
            election={appState.election}
            today={today}
            registrationCheckUrl={
              appState.stateData.registration.registrationCheckUrl
            }
            liveData={appState.liveData}
            isLiveLoading={appState.isLiveLoading}
          />
          <PromptOutput promptText={promptText} />
        </>
      )}
    </div>
  );
}
