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
import { Button } from "./ui/Button";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { LookupResult, StateElectionData } from "../types/election";
import type { Language } from "../lib/translations";

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

  return (
    <div className="mt-6 space-y-6">
      <StateInfoCard state={state} />

      {/* Research My Ballot CTA */}
      {!chatOpen && (
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
              ? "Chat con IA gratis — tu conversación es privada"
              : "Free AI chat — your conversation stays private"}
          </p>
        </div>
      )}

      {/* Chat Panel */}
      {chatOpen && <ChatPanel state={state} zipCode={zipCode} />}

      {/* Copy/Paste Fallback - always available */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-primary font-medium hover:underline">
          {lang === "es"
            ? "¿Prefieres usar tu propio chatbot? Copia este mensaje"
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
