"use client";

import { useRef, useState } from "react";
import type {
  StateElectionData,
  Election,
  ZipLookupResult,
} from "@/types/election";
import { TEST_IDS } from "@/types/testids";
import { lookupZip, getStateData, getNextElection } from "@/lib/election-data";
import { generateFullPrompt } from "@/lib/prompt-generator";
import { ZipForm } from "@/components/ZipForm";
import { StateInfoCard } from "@/components/StateInfoCard";
import { PromptOutput } from "@/components/PromptOutput";

type AppState =
  | { status: "idle" }
  | { status: "multi-state"; states: string[]; zip: string }
  | {
      status: "result";
      stateData: StateElectionData;
      election: Election | null;
      zip: string;
    }
  | { status: "not-found"; zip: string };

export function BallotToolClient() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);

  const handleZipSubmit = (zip: string) => {
    const lookupResult: ZipLookupResult = lookupZip(zip);

    switch (lookupResult.type) {
      case "not-found":
        setAppState({ status: "not-found", zip });
        break;
      case "multi-state":
        setAppState({
          status: "multi-state",
          states: lookupResult.states,
          zip,
        });
        break;
      case "single-state":
        resolveState(lookupResult.stateCode, zip);
        break;
    }

    // Move focus to result area for keyboard users
    setTimeout(() => resultRef.current?.focus(), 50);
  };

  const resolveState = (stateCode: string, zip: string) => {
    const stateData = getStateData(stateCode);
    if (!stateData) {
      setAppState({ status: "not-found", zip });
      return;
    }
    const election = getNextElection(stateData.elections);
    setAppState({ status: "result", stateData, election, zip });
  };

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (appState.status !== "multi-state") return;
    const stateCode = e.target.value;
    if (!stateCode) return;
    resolveState(stateCode, appState.zip);
  };

  const fullPrompt =
    appState.status === "result"
      ? generateFullPrompt(appState.stateData, appState.zip, appState.election)
      : null;

  return (
    <div className="space-y-8">
      {/* Zip code entry */}
      <ZipForm onSubmit={handleZipSubmit} />

      {/* Results area */}
      <div
        ref={resultRef}
        tabIndex={-1}
        className="outline-none space-y-6"
        aria-live="polite"
      >
        {/* Not found */}
        {appState.status === "not-found" && (
          <div
            data-testid={TEST_IDS.NOT_FOUND_MESSAGE}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800"
            role="alert"
          >
            <p className="font-medium">
              We don&apos;t have data for zip code {appState.zip} yet.
            </p>
            <p className="text-sm mt-1">
              We&apos;re working on adding all U.S. zip codes. In the meantime,
              check your state&apos;s election website directly.
            </p>
          </div>
        )}

        {/* Multi-state selector */}
        {appState.status === "multi-state" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="font-medium text-blue-900">
              Zip code {appState.zip} spans multiple states. Which state are you
              voting in?
            </p>
            <div>
              <label htmlFor={TEST_IDS.STATE_SELECTOR} className="sr-only">
                Select your state
              </label>
              <select
                id={TEST_IDS.STATE_SELECTOR}
                data-testid={TEST_IDS.STATE_SELECTOR}
                onChange={handleStateSelect}
                defaultValue=""
                className="border-2 border-blue-300 rounded-lg px-4 py-2 text-gray-800 bg-white focus:outline-none focus:border-blue-500 min-h-[44px]"
              >
                <option value="" disabled>
                  Select a state...
                </option>
                {appState.states.map((code) => {
                  const sd = getStateData(code);
                  return (
                    <option key={code} value={code}>
                      {sd ? sd.stateName : code}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        )}

        {/* State info + prompt */}
        {appState.status === "result" && (
          <div className="space-y-6">
            <StateInfoCard
              state={appState.stateData}
              election={appState.election}
            />
            {fullPrompt && <PromptOutput promptText={fullPrompt} />}
          </div>
        )}
      </div>
    </div>
  );
}
