"use client";

import { useState } from "react";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import {
  lookupZip,
  loadStateData,
  computeRegistrationStatuses,
} from "../lib/data";
import { getNextElection } from "../lib/date-utils";
import { generatePromptText } from "../lib/prompt-generator";
import { useLanguage } from "../lib/i18n";
import type {
  StateData,
  Election,
  RegistrationStatuses,
} from "../types/election";

type AppState =
  | { stage: "idle" }
  | { stage: "multi-state"; zip: string; stateCodes: string[] }
  | {
      stage: "result";
      zip: string;
      stateData: StateData;
      nextElection: Election | null;
      regStatuses: RegistrationStatuses;
      promptText: string;
    }
  | { stage: "not-found"; zip: string };

export function BallotToolClient() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const { lang, t } = useLanguage();

  const today = new Date();

  function handleZipSubmit(zip: string) {
    setIsLoading(true);
    const stateCodes = lookupZip(zip);

    if (!stateCodes) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    if (stateCodes.length > 1) {
      setAppState({ stage: "multi-state", zip, stateCodes });
      setIsLoading(false);
      return;
    }

    resolveState(zip, stateCodes[0]);
  }

  function resolveState(zip: string, stateCode: string) {
    const stateData = loadStateData(stateCode);

    if (!stateData) {
      setAppState({ stage: "not-found", zip });
      setIsLoading(false);
      return;
    }

    const nextElection = getNextElection(stateData.elections, today);
    const regStatuses = computeRegistrationStatuses(
      stateData.registration,
      today,
    );
    const promptText = generatePromptText(stateData, zip, today, lang);

    setAppState({
      stage: "result",
      zip,
      stateData,
      nextElection,
      regStatuses,
      promptText,
    });
    setIsLoading(false);
  }

  function handleStateSelect(stateCode: string) {
    if (appState.stage !== "multi-state") return;
    resolveState(appState.zip, stateCode);
  }

  function handleStateCancel() {
    setAppState({ stage: "idle" });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ZipForm onSubmit={handleZipSubmit} isLoading={isLoading} />

      {appState.stage === "multi-state" && (
        <StateSelectorModal
          stateCodes={appState.stateCodes}
          onSelect={handleStateSelect}
          onCancel={handleStateCancel}
        />
      )}

      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800"
        >
          <p className="font-semibold mb-1">{t.notFound.title}</p>
          <p className="text-sm">
            {t.notFound.description(appState.zip)}{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {t.notFound.linkText}
            </a>
            .
          </p>
        </div>
      )}

      {appState.stage === "result" && (
        <>
          <div className="mt-6">
            <StateInfoCard
              stateData={appState.stateData}
              nextElection={appState.nextElection}
              regStatuses={appState.regStatuses}
              today={today}
            />
          </div>
          <PromptOutput promptText={appState.promptText} />
        </>
      )}
    </div>
  );
}
