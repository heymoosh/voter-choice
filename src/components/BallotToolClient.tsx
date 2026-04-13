"use client";

import { useState, useEffect, useCallback } from "react";
import { lookupZip } from "../lib/lookupZip";
import { getStateData } from "../lib/getStateData";
import { generatePrompt } from "../lib/generatePrompt";
import { ZipForm } from "./ZipForm";
import { StateSelectorModal } from "./StateSelectorModal";
import { ProfileUpload } from "./ProfileUpload";
import { ResearchLayout } from "./ResearchLayout";
import { useLanguage } from "../lib/i18n";
import { useResearchMode } from "../lib/researchMode";
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

function ElectionResult({
  state,
  zipCode,
  lang,
}: {
  state: StateElectionData;
  zipCode: string;
  lang: Language;
}) {
  const [voterProfile, setVoterProfile] = useState<string | null>(null);
  const address = useAddressLookup();
  const { budgetStatus, budgetChecked, handleBudgetUpdate } = useBudgetCheck();
  const { setResearch } = useResearchMode();

  // Enter research mode on mount
  useEffect(() => {
    setResearch(true);
    return () => setResearch(false);
  }, [setResearch]);

  const chatAvailable = isChatAvailable(budgetStatus.tier);
  const copyPasteIsPrimary = budgetChecked && !chatAvailable;

  const promptText = voterProfile
    ? generatePrompt(state, zipCode, undefined, lang).fullText +
      "\n\n---\n\n[BEGIN USER VOTER PROFILE]\n" +
      voterProfile +
      "\n[END USER VOTER PROFILE]"
    : generatePrompt(state, zipCode, undefined, lang).fullText;

  return (
    <>
      {/* Profile upload banner (shown before research starts if no profile) */}
      {!voterProfile && (
        <div className="px-6 py-3 bg-surface-low border-b border-outline-variant/20">
          <div className="max-w-3xl mx-auto">
            <ProfileUpload onProfileLoaded={setVoterProfile} />
          </div>
        </div>
      )}

      <ResearchLayout
        state={state}
        zipCode={zipCode}
        addressStep={address.addressStep}
        pollingData={address.pollingData}
        onAddressSubmit={address.handleSubmit}
        onAddressSkip={address.skip}
        budgetStatus={budgetStatus}
        budgetChecked={budgetChecked}
        onBudgetUpdate={handleBudgetUpdate}
        voterProfile={voterProfile}
        promptText={promptText}
        copyPasteIsPrimary={copyPasteIsPrimary}
      />
    </>
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

  // When a state is found, render the full research layout (no zip form visible)
  if (result.status === "found") {
    return (
      <ElectionResult state={result.state} zipCode={currentZip} lang={lang} />
    );
  }

  // Pre-research: show zip form and status messages
  return (
    <div>
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
    </div>
  );
}
