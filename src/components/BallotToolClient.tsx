"use client";

import { useState, useEffect, useCallback } from "react";
import { lookupZip } from "../lib/lookupZip";
import { lookupCounty } from "../lib/lookupCounty";
import { getStateData } from "../lib/getStateData";
import { generatePrompt } from "../lib/generatePrompt";
import { ZipForm, extractZip, extractState } from "./ZipForm";
import { StateSelectorModal } from "./StateSelectorModal";
import { ProfileUpload } from "./ProfileUpload";
import { ResearchLayout } from "./ResearchLayout";
import { useLanguage } from "../lib/i18n";
import { useResearchMode } from "../lib/researchMode";
import { translations } from "../lib/translations";
import type { LookupResult, StateElectionData } from "../types/election";
import type { Language } from "../lib/translations";
import type { PollingLocation } from "./PollingLocationCard";

interface CivicCandidate {
  name: string;
  party: string;
}

interface CivicContest {
  office: string;
  district: string;
  type: string;
  candidates: CivicCandidate[];
}

interface PollingData {
  pollingLocations: PollingLocation[];
  earlyVoteSites: PollingLocation[];
  contests?: CivicContest[];
  county?: string;
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

/** Fetch civic data (polling locations + contests) from Google Civic API. */
async function fetchCivicData(address: string): Promise<PollingData | null> {
  try {
    const response = await fetch(
      `/api/civic?address=${encodeURIComponent(address)}`,
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function ElectionResult({
  state,
  zipCode,
  address,
  lang,
  initialPollingData,
}: {
  state: StateElectionData;
  zipCode: string;
  address: string;
  lang: Language;
  initialPollingData: PollingData | null;
}) {
  const [voterProfile, setVoterProfile] = useState<string | null>(null);
  const [addressStep] = useState<AddressStep>(
    initialPollingData ? "done" : "skipped",
  );
  const [pollingData] = useState<PollingData | null>(initialPollingData);
  const { budgetStatus, budgetChecked, handleBudgetUpdate } = useBudgetCheck();
  const { setResearch } = useResearchMode();

  // Resolve county: prefer civic API county, fall back to zip-based lookup
  const civicCounty = initialPollingData?.county ?? null;
  const zipCounty = lookupCounty(state.stateCode, zipCode);
  const countyForPrompt = civicCounty ?? zipCounty ?? undefined;

  // Enter research mode on mount
  useEffect(() => {
    setResearch(true);
    return () => setResearch(false);
  }, [setResearch]);

  const chatAvailable = isChatAvailable(budgetStatus.tier);
  const copyPasteIsPrimary = budgetChecked && !chatAvailable;

  const pollingForPrompt = initialPollingData
    ? {
        pollingLocations: initialPollingData.pollingLocations,
        earlyVoteSites: initialPollingData.earlyVoteSites,
        contests: initialPollingData.contests,
        county: initialPollingData.county,
      }
    : undefined;

  const promptText = voterProfile
    ? generatePrompt(
        state,
        zipCode,
        undefined,
        lang,
        pollingForPrompt,
        countyForPrompt,
      ).fullText +
      "\n\n---\n\n[BEGIN USER VOTER PROFILE]\n" +
      voterProfile +
      "\n[END USER VOTER PROFILE]"
    : generatePrompt(
        state,
        zipCode,
        undefined,
        lang,
        pollingForPrompt,
        countyForPrompt,
      ).fullText;

  // Stub handlers — address was already collected on the home page
  const handleAddressSubmit = useCallback(async (address: string) => {
    // No-op: address was collected upfront
    void address;
  }, []);
  const handleAddressSkip = useCallback(() => {}, []);

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
        address={address}
        addressStep={addressStep}
        pollingData={pollingData}
        onAddressSubmit={handleAddressSubmit}
        onAddressSkip={handleAddressSkip}
        budgetStatus={budgetStatus}
        budgetChecked={budgetChecked}
        onBudgetUpdate={handleBudgetUpdate}
        voterProfile={voterProfile}
        promptText={promptText}
        copyPasteIsPrimary={copyPasteIsPrimary}
        countyName={countyForPrompt}
      />
    </>
  );
}

export function BallotToolClient() {
  const [result, setResult] = useState<LookupResult>({ status: "idle" });
  const [currentZip, setCurrentZip] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");
  const [pollingData, setPollingData] = useState<PollingData | null>(null);
  const { lang } = useLanguage();
  const t = translations[lang];

  async function handleAddressSubmit(address: string) {
    setCurrentAddress(address);
    const zip = extractZip(address);
    let stateCode: string | null = null;

    if (zip) {
      setCurrentZip(zip);
      const stateCodes = lookupZip(zip);

      if (stateCodes.length === 0) {
        setResult({ status: "not-found" });
        return;
      }

      if (stateCodes.length > 1) {
        setResult({ status: "multi-state", states: stateCodes });
        return;
      }
      stateCode = stateCodes[0];
    } else {
      // No ZIP — extract state directly from address text (e.g. "Houston, TX, USA")
      stateCode = extractState(address);
      if (!stateCode) return;
      setCurrentZip("");
    }

    setResult({ status: "loading" });

    // Run state data lookup and civic API call in parallel
    const [state, civic] = await Promise.all([
      getStateData(stateCode),
      fetchCivicData(address),
    ]);

    if (civic) setPollingData(civic);

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

  // When a state is found, render the full research layout
  if (result.status === "found") {
    return (
      <ElectionResult
        state={result.state}
        zipCode={currentZip}
        address={currentAddress}
        lang={lang}
        initialPollingData={pollingData}
      />
    );
  }

  // Pre-research: show address form and status messages
  return (
    <div>
      <ZipForm onSubmit={handleAddressSubmit} />

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
