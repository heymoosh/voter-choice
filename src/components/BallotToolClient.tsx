"use client";

import { useRef, useState } from "react";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import { lookupZip } from "@/lib/lookupZip";
import { getStateData } from "@/lib/getStateData";
import { generatePrompt } from "@/lib/generatePrompt";
import { findNextElection } from "@/lib/date-utils";
import type { AppState, StateData, Election } from "@/lib/types";

export function BallotToolClient() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleZipSubmit(zip: string) {
    setAppState({ stage: "loading" });

    const states = lookupZip(zip);
    if (!states) {
      setAppState({ stage: "not-found", zip });
      return;
    }
    if (states.length > 1) {
      setAppState({ stage: "multi-state", zip, states });
      return;
    }
    resolveState(zip, states[0]);
  }

  function resolveState(zip: string, stateCode: string) {
    const data = getStateData(stateCode);
    if (!data) {
      setAppState({ stage: "not-found", zip });
      return;
    }
    setAppState({ stage: "found", zip, stateData: data });
    // Move focus to results after render
    setTimeout(() => resultsRef.current?.focus(), 50);
  }

  function handleStateSelect(stateCode: string) {
    if (appState.stage !== "multi-state") return;
    resolveState(appState.zip, stateCode);
  }

  const today = new Date();

  function getElectionAndPrompt(
    stateData: StateData,
    zip: string,
  ): { election: Election | null; promptText: string } {
    const election = findNextElection(
      stateData.elections,
      today,
    ) as Election | null;
    if (!election) return { election: null, promptText: "" };
    const promptText = generatePrompt(stateData, zip, election);
    return { election, promptText };
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Zip form — always visible */}
      <ZipForm
        onSubmit={handleZipSubmit}
        disabled={appState.stage === "loading"}
      />

      {/* Loading */}
      {appState.stage === "loading" && (
        <div role="status" aria-live="polite" className="text-sm text-gray-500">
          Looking up your state…
        </div>
      )}

      {/* Not found */}
      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-6"
        >
          <h2 className="mb-1 font-semibold text-gray-900">
            Zip code not found
          </h2>
          <p className="text-sm text-gray-700">
            We don&apos;t have data for zip code <strong>{appState.zip}</strong>{" "}
            yet. We&apos;re working on adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 underline"
            >
              Find your state election website →
            </a>
          </p>
        </div>
      )}

      {/* Multi-state selector */}
      {appState.stage === "multi-state" && (
        <StateSelectorModal
          states={appState.states}
          onSelect={handleStateSelect}
          zip={appState.zip}
        />
      )}

      {/* Found — show state info + prompt */}
      {appState.stage === "found" &&
        (() => {
          const { election, promptText } = getElectionAndPrompt(
            appState.stateData,
            appState.zip,
          );
          return (
            <div
              ref={resultsRef}
              tabIndex={-1}
              className="flex flex-col gap-6 outline-none"
            >
              {election ? (
                <>
                  <StateInfoCard
                    stateData={appState.stateData}
                    election={election}
                    today={today}
                  />
                  <PromptOutput promptText={promptText} />
                </>
              ) : (
                <>
                  <StateInfoCard
                    stateData={appState.stateData}
                    election={
                      appState.stateData.elections[
                        appState.stateData.elections.length - 1
                      ]
                    }
                    today={today}
                  />
                  <div
                    data-testid="no-election-message"
                    role="status"
                    className="rounded-xl border border-gray-200 bg-gray-50 p-6"
                  >
                    <p className="text-sm text-gray-600">
                      No upcoming elections found for{" "}
                      <strong>{appState.stateData.stateName}</strong>. Check{" "}
                      <a
                        href={appState.stateData.resources.stateElectionWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 underline"
                      >
                        {appState.stateData.stateName} election website
                      </a>{" "}
                      for updates.
                    </p>
                  </div>
                </>
              )}
            </div>
          );
        })()}
    </div>
  );
}
