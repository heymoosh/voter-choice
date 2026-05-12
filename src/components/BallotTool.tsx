"use client";

import { useState, useCallback } from "react";
import { ZipForm } from "./ZipForm";
import { StateSelector } from "./StateSelector";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import ChatWindow from "./ChatWindow";
import BallotBuilder from "./BallotBuilder";
import VoterProfilePanel from "./VoterProfilePanel";
import { isValidZip } from "@/lib/zipLookup";
import { fetchLiveData } from "@/lib/dataAccess";
import {
  buildPrompt,
  buildSystemPrompt,
  buildPromptWithProfile,
} from "@/lib/promptBuilder";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { LiveElectionData } from "@/types/liveElection";
import type { Locale } from "@/lib/i18n/types";

type AppState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "error"; message: string }
  | { stage: "not-found" }
  | { stage: "select-state"; states: string[]; zip: string }
  | {
      stage: "result";
      stateData: LiveElectionData;
      zip: string;
      promptText: string;
    };

function BallotToolInner() {
  const { t, locale } = useTranslation();
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [zipError, setZipError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [voterProfile, setVoterProfile] = useState<string | undefined>(
    undefined,
  );

  const handleZipSubmit = useCallback(
    async (zip: string) => {
      if (!zip) {
        setZipError(t.errors.emptyZip);
        return;
      }
      if (!isValidZip(zip)) {
        setZipError(t.errors.invalidZip);
        return;
      }
      setZipError(null);
      setChatOpen(false);
      setAppState({ stage: "loading" });

      await loadLiveData(zip, locale, setAppState, t.errors.loadFailed);
    },
    [t, locale],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      if (appState.stage !== "select-state") return;
      const { zip } = appState;
      setAppState({ stage: "loading" });
      await loadLiveData(
        zip,
        locale,
        setAppState,
        t.errors.loadFailed,
        stateCode,
      );
    },
    [appState, locale, t.errors.loadFailed],
  );

  const isLoading = appState.stage === "loading";

  const systemPrompt =
    appState.stage === "result"
      ? buildSystemPrompt(
          appState.stateData,
          appState.zip,
          locale,
          voterProfile,
        )
      : "";

  const promptTextWithProfile =
    appState.stage === "result"
      ? buildPromptWithProfile(
          appState.stateData,
          appState.zip,
          locale,
          voterProfile,
        )
      : "";

  return (
    <div className="space-y-6">
      {/* Voter Profile Upload (top of page) */}
      <VoterProfilePanel
        onProfileLoaded={setVoterProfile}
        labels={t.phase5?.profile}
      />

      {/* Zip Form */}
      <div>
        <ZipForm onSubmit={handleZipSubmit} isLoading={isLoading} />

        {/* Validation error */}
        {zipError && (
          <p
            data-testid="zip-error"
            role="alert"
            aria-live="polite"
            className="mt-2 text-red-600 text-sm font-medium"
          >
            {zipError}
          </p>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          data-testid="data-loading"
          role="status"
          aria-label={t.accessibility.loadingElectionInfo}
          className="flex items-center gap-2 text-gray-500 text-sm py-2"
        >
          <span
            className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          {t.liveData?.loading ?? t.loading}
        </div>
      )}

      {/* Not found */}
      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-xl p-5"
        >
          <p className="font-semibold text-amber-900 mb-1">
            {t.errors.zipNotFound.heading}
          </p>
          <p className="text-amber-800 text-sm">
            {t.errors.zipNotFound.message}{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900 focus:text-amber-900 focus:outline-2 focus:outline-blue-500 rounded"
            >
              {t.errors.zipNotFound.linkText}
            </a>
          </p>
        </div>
      )}

      {/* Error */}
      {appState.stage === "error" && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-5"
        >
          <p className="text-red-800 text-sm">{appState.message}</p>
        </div>
      )}

      {/* State selector for multi-state zip */}
      {appState.stage === "select-state" && (
        <StateSelector states={appState.states} onSelect={handleStateSelect} />
      )}

      {/* Results */}
      {appState.stage === "result" && (
        <div className="space-y-8">
          <StateInfoCard stateData={appState.stateData} />

          {/* Chat CTA */}
          {!chatOpen && (
            <button
              data-testid="chat-cta"
              onClick={() => setChatOpen(true)}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm"
            >
              {t.phase5?.chat?.ctaButton ?? "Research My Ballot with AI"}
            </button>
          )}

          {/* Chat Window */}
          {chatOpen && (
            <ChatWindow
              systemPrompt={systemPrompt}
              locale={locale}
              labels={{
                ...t.phase5?.chat,
                alignment: t.phase5?.alignment,
                ballot: t.phase5?.ballot,
                profile: t.phase5?.profile,
              }}
              onClose={() => setChatOpen(false)}
            />
          )}

          {/* Path B: Copy-paste prompt (enhanced with profile) */}
          <PromptOutput promptText={promptTextWithProfile} />

          {/* Path B: Ballot builder */}
          <BallotBuilder locale={locale} labels={t.phase5?.ballot} />
        </div>
      )}
    </div>
  );
}

export function BallotTool() {
  return <BallotToolInner />;
}

// ---------------------------------------------------------------------------
// Data loading helper
// ---------------------------------------------------------------------------

async function loadLiveData(
  zip: string,
  locale: Locale,
  setAppState: (s: AppState) => void,
  errorMsg: string,
  _forcedState?: string,
): Promise<void> {
  try {
    // Handle multi-state zip codes — check static zip lookup first
    const { lookupState } = await import("@/lib/zipLookup");
    const states = lookupState(zip);
    if (!states || states.length === 0) {
      setAppState({ stage: "not-found" });
      return;
    }
    if (states.length > 1 && !_forcedState) {
      setAppState({ stage: "select-state", states, zip });
      return;
    }

    const liveData = await fetchLiveData(zip);
    const promptText = buildPrompt(liveData, zip, locale);
    setAppState({ stage: "result", stateData: liveData, zip, promptText });
  } catch (error) {
    if ((error as Error).message === "ZIP_NOT_FOUND") {
      setAppState({ stage: "not-found" });
      return;
    }
    console.error("[BallotTool] loadLiveData error:", error);
    setAppState({ stage: "error", message: errorMsg });
  }
}
