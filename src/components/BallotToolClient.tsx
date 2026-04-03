"use client";

import { useState } from "react";
import { lookupZip } from "../lib/lookupZip";
import { getStateData } from "../lib/getStateData";
import { generatePrompt } from "../lib/generatePrompt";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { LookupResult } from "../types/election";

export function BallotToolClient() {
  const [result, setResult] = useState<LookupResult>({ status: "idle" });
  const [currentZip, setCurrentZip] = useState("");
  const { lang } = useLanguage();
  const t = translations[lang];

  async function handleZipSubmit(zip: string) {
    setCurrentZip(zip);
    setResult({ status: "loading" });

    const stateCodes = lookupZip(zip);

    if (stateCodes.length === 0) {
      setResult({ status: "not-found" });
      return;
    }

    if (stateCodes.length > 1) {
      setResult({ status: "multi-state", states: stateCodes });
      return;
    }

    await resolveState(stateCodes[0]);
  }

  async function resolveState(stateCode: string) {
    setResult({ status: "loading" });
    const state = await getStateData(stateCode);
    if (!state) {
      setResult({ status: "not-found" });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const hasUpcoming = state.elections.some((e) => e.date >= today);
    if (!hasUpcoming) {
      setResult({ status: "no-election", state });
      return;
    }

    setResult({ status: "found", state });
  }

  async function handleStateSelect(stateCode: string) {
    await resolveState(stateCode);
  }

  return (
    <div id="main-content">
      <ZipForm onSubmit={handleZipSubmit} />

      {result.status === "loading" && (
        <p className="mt-4 text-gray-600" role="status" aria-live="polite">
          {t.loading}
        </p>
      )}

      {result.status === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm"
        >
          {t.errors.notFound}{" "}
          <a
            href="https://www.usa.gov/states-and-territories"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Find your state election website
          </a>
          .
        </div>
      )}

      {result.status === "multi-state" && (
        <StateSelectorModal
          states={result.states}
          onSelect={handleStateSelect}
        />
      )}

      {result.status === "no-election" && (
        <div
          data-testid="no-election-message"
          role="alert"
          className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm"
        >
          {t.errors.noElection(result.state.stateName)}{" "}
          <a
            href={result.state.resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            {result.state.stateName} election website
          </a>
        </div>
      )}

      {result.status === "found" && (
        <div className="mt-6 space-y-6">
          <StateInfoCard state={result.state} />
          <PromptOutput
            promptText={
              generatePrompt(result.state, currentZip, undefined, lang).fullText
            }
          />
        </div>
      )}
    </div>
  );
}
