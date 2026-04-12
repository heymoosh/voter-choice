"use client";

import { useState } from "react";
import { lookupZip } from "../lib/lookupZip";
import { getStateData } from "../lib/getStateData";
import { generatePrompt } from "../lib/generatePrompt";
import { ZipForm } from "./ZipForm";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { StateSelectorModal } from "./StateSelectorModal";
import { ChatPanel } from "./ChatPanel";
import { AddressInput } from "./AddressInput";
import {
  PollingLocationCard,
  PollingLocationFallback,
} from "./PollingLocationCard";
import { Button } from "./ui/Button";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { LookupResult, StateElectionData } from "../types/election";
import type { Language } from "../lib/translations";
import type { PollingLocation } from "./PollingLocationCard";

interface PollingData {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
}

type AddressStep = "input" | "loading" | "done" | "skipped" | "error";

function isAddressComplete(step: AddressStep): boolean {
  return step === "done" || step === "skipped" || step === "error";
}

function hasPollingResults(data: PollingData | null): data is PollingData {
  return (
    data !== null &&
    (data.pollingLocations.length > 0 || data.earlyVoteSites.length > 0)
  );
}

function PollingSection({
  addressStep,
  pollingData,
  fallbackUrl,
  onSubmit,
  onSkip,
}: {
  addressStep: AddressStep;
  pollingData: PollingData | null;
  fallbackUrl: string;
  onSubmit: (address: string) => void;
  onSkip: () => void;
}) {
  if (addressStep === "input" || addressStep === "loading") {
    return (
      <AddressInput
        onSubmit={onSubmit}
        onSkip={onSkip}
        isLoading={addressStep === "loading"}
      />
    );
  }

  if (addressStep === "done" && hasPollingResults(pollingData)) {
    return (
      <PollingLocationCard
        pollingLocations={pollingData.pollingLocations}
        earlyVoteSites={pollingData.earlyVoteSites}
        fallbackUrl={fallbackUrl}
      />
    );
  }

  if (
    addressStep === "error" ||
    (addressStep === "done" && !hasPollingResults(pollingData))
  ) {
    return <PollingLocationFallback fallbackUrl={fallbackUrl} />;
  }

  return null;
}

function ElectionResult({
  state,
  zipCode,
  lang,
}: {
  state: StateElectionData;
  zipCode: string;
  lang: Language;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [addressStep, setAddressStep] = useState<AddressStep>("input");
  const [pollingData, setPollingData] = useState<PollingData | null>(null);

  async function handleAddressSubmit(address: string) {
    setAddressStep("loading");

    try {
      const response = await fetch(
        `/api/civic?address=${encodeURIComponent(address)}`,
      );

      if (!response.ok) {
        setAddressStep("error");
        return;
      }

      const data: PollingData = await response.json();
      setPollingData(data);
      setAddressStep("done");
    } catch {
      setAddressStep("error");
    }
  }

  const addressDone = isAddressComplete(addressStep);

  return (
    <div className="mt-6 space-y-6">
      <StateInfoCard state={state} />

      <PollingSection
        addressStep={addressStep}
        pollingData={pollingData}
        fallbackUrl={state.resources.pollingPlaceLookup}
        onSubmit={handleAddressSubmit}
        onSkip={() => setAddressStep("skipped")}
      />

      {!chatOpen && addressDone && (
        <div className="flex flex-col gap-3">
          <Button
            data-testid="chat-cta"
            variant="cta"
            size="lg"
            onClick={() => setChatOpen(true)}
            className="w-full"
          >
            {lang === "es" ? "Investigar mi boleta" : "Research My Ballot"}
          </Button>
          <p className="text-xs text-on-surface-muted text-center">
            {lang === "es"
              ? "Chat con IA gratis \u2014 tu conversaci\u00f3n es privada"
              : "Free AI chat \u2014 your conversation stays private"}
          </p>
        </div>
      )}

      {chatOpen && (
        <ChatPanel state={state} zipCode={zipCode} pollingData={pollingData} />
      )}

      {addressDone && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-primary font-medium hover:underline">
            {lang === "es"
              ? "\u00bfPrefieres usar tu propio chatbot? Copia este mensaje"
              : "Prefer to use your own AI chatbot? Copy this prompt"}
          </summary>
          <div className="mt-3">
            <PromptOutput
              promptText={
                generatePrompt(state, zipCode, undefined, lang).fullText
              }
            />
          </div>
        </details>
      )}
    </div>
  );
}

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
        <p
          className="mt-4 text-on-surface-muted"
          role="status"
          aria-live="polite"
        >
          {t.loading}
        </p>
      )}

      {result.status === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="mt-4 p-4 bg-surface-low rounded-sm text-sm"
        >
          {t.errors.notFound}{" "}
          <a
            href="https://www.usa.gov/states-and-territories"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
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
          className="mt-4 p-4 bg-surface-low rounded-sm text-sm"
        >
          {t.errors.noElection(result.state.stateName)}{" "}
          <a
            href={result.state.resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-primary"
          >
            {result.state.stateName} election website
          </a>
        </div>
      )}

      {result.status === "found" && (
        <ElectionResult state={result.state} zipCode={currentZip} lang={lang} />
      )}
    </div>
  );
}
