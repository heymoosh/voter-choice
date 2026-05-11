"use client";

import { useState, useCallback, useMemo } from "react";
import { StateData, Election } from "@/lib/types";
import {
  getStateCodesForZip,
  getStateData,
  findNextElection,
} from "@/lib/stateData";
import { buildPrompt } from "@/lib/promptBuilder";
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
      promptText: string;
    }
  | { status: "not-found"; zipCode: string };

export default function BallotTool() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const today = useMemo(() => new Date(), []);

  const handleZipSubmit = useCallback(
    (zipCode: string) => {
      setAppState({ status: "loading" });

      // Simulate minimal async (prevents layout shift, per PROJECT_SPEC.md)
      setTimeout(() => {
        const stateCodes = getStateCodesForZip(zipCode);

        if (stateCodes.length === 0) {
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
        const promptText = buildPrompt(data, zipCode, election);

        setAppState({
          status: "result",
          zipCode,
          stateData: data,
          election,
          promptText,
        });
      }, 150);
    },
    [today],
  );

  const handleStateSelect = useCallback(
    (stateCode: string) => {
      if (appState.status !== "multi-state") return;
      const { zipCode } = appState;

      const data = getStateData(stateCode);
      if (!data) {
        setAppState({ status: "not-found", zipCode });
        return;
      }

      const election = findNextElection(data.elections, today);
      const promptText = buildPrompt(data, zipCode, election);

      setAppState({
        status: "result",
        zipCode,
        stateData: data,
        election,
        promptText,
      });
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
          <span>Looking up your zip code...</span>
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
          <h3 className="font-semibold text-base mb-1">Zip code not found</h3>
          <p className="text-sm">
            We don&apos;t have data for zip code{" "}
            <strong>{appState.zipCode}</strong> yet. We&apos;re working on
            adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              Find your state election website
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
          />
          <PromptOutput promptText={appState.promptText} />
        </>
      )}
    </div>
  );
}
