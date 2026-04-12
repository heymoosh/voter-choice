"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Notice } from "./ui/Notice";
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

type BudgetTier = "normal" | "notice" | "soft_close" | "handoff" | "exhausted";

interface BudgetStatus {
  tier: BudgetTier;
  percent: number;
}

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

function isChatAvailable(tier: BudgetTier): boolean {
  return tier === "normal" || tier === "notice";
}

function useBudgetCheck() {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus>({
    tier: "normal",
    percent: 0,
  });
  const [budgetChecked, setBudgetChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkBudget() {
      try {
        const res = await fetch("/api/chat");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.budget) setBudgetStatus(data.budget);
        }
      } catch {
        // Silently fail — default to showing chat
      } finally {
        if (!cancelled) setBudgetChecked(true);
      }
    }
    checkBudget();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBudgetUpdate = useCallback((budget: BudgetStatus) => {
    setBudgetStatus(budget);
  }, []);

  return { budgetStatus, budgetChecked, handleBudgetUpdate };
}

function PromptSection({
  isPrimary,
  promptText,
  lang,
}: {
  isPrimary: boolean;
  promptText: string;
  lang: Language;
}) {
  if (isPrimary) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-base">
          {lang === "es"
            ? "Copia este mensaje para investigar tu boleta"
            : "Copy this prompt to research your ballot"}
        </h3>
        <PromptOutput promptText={promptText} />
      </div>
    );
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-primary font-medium hover:underline">
        {lang === "es"
          ? "\u00bfPrefieres usar tu propio chatbot? Copia este mensaje"
          : "Prefer to use your own AI chatbot? Copy this prompt"}
      </summary>
      <div className="mt-3">
        <PromptOutput promptText={promptText} />
      </div>
    </details>
  );
}

function useAddressLookup() {
  const [addressStep, setAddressStep] = useState<AddressStep>("input");
  const [pollingData, setPollingData] = useState<PollingData | null>(null);

  async function handleSubmit(address: string) {
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

  function skip() {
    setAddressStep("skipped");
  }

  return { addressStep, pollingData, handleSubmit, skip };
}

function ChatCTA({ lang, onOpen }: { lang: Language; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        data-testid="chat-cta"
        variant="cta"
        size="lg"
        onClick={onOpen}
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
  );
}

function BudgetSoftCloseNotice({ lang }: { lang: Language }) {
  const t = translations[lang];
  return (
    <div data-testid="chat-disabled-message">
      <Notice variant="warning">
        <p className="font-semibold mb-1">{t.budget.softClose}</p>
        <p className="text-xs text-on-surface-muted">{t.budget.resetNote}</p>
      </Notice>
    </div>
  );
}

// eslint-disable-next-line complexity
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
  const address = useAddressLookup();
  const { budgetStatus, budgetChecked, handleBudgetUpdate } = useBudgetCheck();

  const addressDone = isAddressComplete(address.addressStep);
  const chatAvailable = isChatAvailable(budgetStatus.tier);
  const showChatCTA =
    !chatOpen && addressDone && (chatAvailable || !budgetChecked);
  const copyPasteIsPrimary = budgetChecked && !chatAvailable && !chatOpen;

  return (
    <div className="mt-6 space-y-6">
      <StateInfoCard state={state} />

      <PollingSection
        addressStep={address.addressStep}
        pollingData={address.pollingData}
        fallbackUrl={state.resources.pollingPlaceLookup}
        onSubmit={address.handleSubmit}
        onSkip={address.skip}
      />

      {copyPasteIsPrimary && addressDone && (
        <BudgetSoftCloseNotice lang={lang} />
      )}

      {showChatCTA && <ChatCTA lang={lang} onOpen={() => setChatOpen(true)} />}

      {chatOpen && (
        <ChatPanel
          state={state}
          zipCode={zipCode}
          pollingData={address.pollingData}
          onBudgetUpdate={handleBudgetUpdate}
        />
      )}

      {addressDone && (
        <PromptSection
          isPrimary={copyPasteIsPrimary}
          promptText={generatePrompt(state, zipCode, undefined, lang).fullText}
          lang={lang}
        />
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
