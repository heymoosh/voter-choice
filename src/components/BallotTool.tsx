"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { StateData, Election, LiveElectionData } from "@/lib/types";
import {
  getStateCodesForZip,
  getStateData,
  findNextElection,
} from "@/lib/stateData";
import { fetchElectionData } from "@/lib/electionData";
import {
  buildPrompt,
  buildRankingPreamble,
  buildConcernsPreamble,
} from "@/lib/promptBuilder";
import { useLanguage } from "@/lib/i18n";
import { RankedIssues, ConfirmedConcerns } from "@/lib/canonicalIssues";
import ZipForm from "./ZipForm";
import StateInfo from "./StateInfo";
import StateSelector from "./StateSelector";
import PromptOutput from "./PromptOutput";
import ChatWindow from "./ChatWindow";
import BallotDownload from "./BallotDownload";
import VoterProfileUpload from "./VoterProfileUpload";
import IssueRanking from "./IssueRanking";
import ConcernDisambiguation from "./ConcernDisambiguation";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; zipCode: string; stateCodes: string[] }
  | {
      status: "result";
      zipCode: string;
      stateData: StateData;
      election: Election | null;
      liveData?: LiveElectionData;
      isLiveLoading?: boolean;
    }
  | { status: "not-found"; zipCode: string };

export default function BallotTool() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const today = useMemo(() => new Date(), []);
  const { lang, t } = useLanguage();

  // Phase 5: Chat state
  const [showChat, setShowChat] = useState(false);
  const [voterProfile, setVoterProfile] = useState<string | null>(null);

  // Phase 6: Issue ranking + concern disambiguation state
  type Phase6Step = "ranking" | "concerns" | "done";
  const [phase6Step, setPhase6Step] = useState<Phase6Step | null>(null);
  const [rankedIssues, setRankedIssues] = useState<RankedIssues | null>(null);
  const [confirmedConcerns, setConfirmedConcerns] =
    useState<ConfirmedConcerns | null>(null);
  const [issueCounts, setIssueCounts] = useState<Record<string, number> | null>(
    null,
  );
  const [countyFips, setCountyFips] = useState<string | null>(null);

  // Fetch county FIPS from live data when available
  useEffect(() => {
    if (appState.status === "result" && appState.liveData?.districts?.county) {
      // Use Google Civic county info if available; fall back to a known FIPS pattern
      const fipsRaw = appState.liveData.districts.county;
      // If it looks like a FIPS code already, use it
      if (/^\d{5}$/.test(fipsRaw)) {
        setCountyFips(fipsRaw);
      }
    }
  }, [appState]);

  // Fetch issue counts when we have a county FIPS
  useEffect(() => {
    if (!countyFips) return;
    fetch(`/api/issue-counts?countyFips=${encodeURIComponent(countyFips)}`)
      .then((r) => r.json())
      .then((data: { issueCounts?: Record<string, number> }) => {
        if (data.issueCounts) setIssueCounts(data.issueCounts);
      })
      .catch(() => {});
  }, [countyFips]);

  // Build the prompt on-the-fly based on current language so it updates when lang changes
  const promptText = useMemo(() => {
    if (appState.status !== "result") return "";
    return buildPrompt(
      appState.stateData,
      appState.zipCode,
      appState.election,
      lang,
    );
  }, [appState, lang]);

  // Build Phase 6 enriched system prompt
  const enrichedSystemPrompt = useMemo(() => {
    let prompt = promptText;
    if (rankedIssues) {
      prompt = buildRankingPreamble(rankedIssues) + "\n\n" + prompt;
    }
    if (confirmedConcerns && !confirmedConcerns.skipped) {
      prompt = buildConcernsPreamble(confirmedConcerns) + "\n\n" + prompt;
    }
    return prompt;
  }, [promptText, rankedIssues, confirmedConcerns]);

  // Build Phase 6 enriched copy-paste context
  const enrichedPromptText = useMemo(() => {
    let prompt = promptText;
    if (rankedIssues && !rankedIssues.skipped) {
      const top3 = rankedIssues.ordered.slice(0, 3);
      prompt =
        `[VOTER PRIORITIES]\n${top3.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n[/VOTER PRIORITIES]\n\n` +
        prompt;
    }
    if (confirmedConcerns && !confirmedConcerns.skipped) {
      prompt =
        `[VOTER CONFIRMED CONCERNS]\n${JSON.stringify({ primaryIssues: confirmedConcerns.primaryIssues, rationale: confirmedConcerns.rationale }, null, 2)}\n[/VOTER CONFIRMED CONCERNS]\n\n` +
        prompt;
    }
    return prompt;
  }, [promptText, rankedIssues, confirmedConcerns]);

  const handleRankingConfirm = useCallback(
    async (ranking: RankedIssues) => {
      setRankedIssues(ranking);
      // Increment counters for ranked issues (fire and forget)
      if (countyFips) {
        ranking.ordered.forEach((slug) => {
          fetch("/api/issue-counts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countyFips, issueSlug: slug }),
          }).catch(() => {});
        });
      }
      setPhase6Step("concerns");
    },
    [countyFips],
  );

  const handleRankingSkip = useCallback(() => {
    setRankedIssues({
      ordered: [],
      skipped: true,
      timestamp: new Date().toISOString(),
    });
    setPhase6Step("concerns");
  }, []);

  const handleConcernsConfirm = useCallback((concerns: ConfirmedConcerns) => {
    setConfirmedConcerns(concerns);
    setPhase6Step("done");
    setShowChat(true);
  }, []);

  const handleConcernsSkip = useCallback(() => {
    setConfirmedConcerns({
      primaryIssues: [],
      originalText: "",
      rationale: "",
      skipped: true,
    });
    setPhase6Step("done");
    setShowChat(true);
  }, []);

  const handleOpenChat = useCallback(() => {
    // Start Phase 6 flow before opening chat
    setPhase6Step("ranking");
  }, []);

  const handleZipSubmit = useCallback(
    async (zipCode: string) => {
      setAppState({ status: "loading" });

      // Resolve static data first (fast, synchronous)
      const stateCodes = getStateCodesForZip(zipCode);

      if (stateCodes.length === 0) {
        // Try live API even for unknown zips — Civic might know the state
        try {
          const liveData = await fetchElectionData(zipCode);
          if (liveData.stateCodes.length > 0) {
            const stateCode = liveData.stateCodes[0];
            const data = getStateData(stateCode);
            if (data) {
              const election = findNextElection(data.elections, today);
              setAppState({
                status: "result",
                zipCode,
                stateData: data,
                election,
                liveData,
                isLiveLoading: false,
              });
              return;
            }
          }
        } catch {
          // Fall through to not-found
        }
        setAppState({ status: "not-found", zipCode });
        return;
      }

      if (stateCodes.length > 1) {
        setAppState({ status: "multi-state", zipCode, stateCodes });
        return;
      }

      const stateCode = stateCodes[0];
      const data = getStateData(stateCode);

      if (!data) {
        setAppState({ status: "not-found", zipCode });
        return;
      }

      const election = findNextElection(data.elections, today);

      // Show static results immediately, then fetch live data
      setAppState({
        status: "result",
        zipCode,
        stateData: data,
        election,
        isLiveLoading: true,
      });

      // Fetch live data in background (progressive loading)
      try {
        const liveData = await fetchElectionData(zipCode);
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, liveData, isLiveLoading: false };
        });
      } catch {
        // Live data unavailable — static data still shows
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, isLiveLoading: false };
        });
      }
    },
    [today],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      if (appState.status !== "multi-state") return;
      const { zipCode } = appState;

      const data = getStateData(stateCode);
      if (!data) {
        setAppState({ status: "not-found", zipCode });
        return;
      }

      const election = findNextElection(data.elections, today);

      setAppState({
        status: "result",
        zipCode,
        stateData: data,
        election,
        isLiveLoading: true,
      });

      // Fetch live data in background
      try {
        const liveData = await fetchElectionData(zipCode);
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, liveData, isLiveLoading: false };
        });
      } catch {
        setAppState((prev) => {
          if (prev.status !== "result") return prev;
          return { ...prev, isLiveLoading: false };
        });
      }
    },
    [appState, today],
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Phase 5: Voter Profile Upload (top of page for returning voters) */}
      <section aria-label="Returning voter profile upload">
        <VoterProfileUpload
          onProfileLoaded={setVoterProfile}
          uploadedProfile={voterProfile}
          onDismiss={() => setVoterProfile(null)}
        />
      </section>

      {/* Zip Code Entry */}
      <section aria-label="Zip code entry">
        <ZipForm
          onSubmit={handleZipSubmit}
          isLoading={appState.status === "loading"}
        />
      </section>

      {/* Loading indicator */}
      {appState.status === "loading" && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Looking up your zip code"
          className="flex items-center gap-3 text-gray-600"
        >
          <svg
            className="w-5 h-5 animate-spin text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>
            {lang === "es"
              ? "Buscando tu código postal..."
              : "Looking up your zip code..."}
          </span>
        </div>
      )}

      {/* Not found */}
      {appState.status === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800"
        >
          <h3 className="font-semibold text-base mb-1">{t("notFoundTitle")}</h3>
          <p className="text-sm">
            {t("notFoundBody", { zip: appState.zipCode })}{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              {t("notFoundLink")}
            </a>
            .
          </p>
        </div>
      )}

      {/* Multi-state selector */}
      {appState.status === "multi-state" && (
        <StateSelector
          stateCodes={appState.stateCodes}
          selectedState={null}
          onSelect={handleStateSelect}
        />
      )}

      {/* Results */}
      {appState.status === "result" && (
        <>
          <StateInfo
            stateData={appState.stateData}
            election={appState.election}
            today={today}
            registrationCheckUrl={
              appState.stateData.registration.registrationCheckUrl
            }
            liveData={appState.liveData}
            isLiveLoading={appState.isLiveLoading}
          />

          {/* Phase 6: Issue Ranking + Concern Disambiguation flow */}
          {phase6Step === "ranking" && (
            <section
              aria-label="Issue priority ranking"
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
            >
              <IssueRanking
                onConfirm={handleRankingConfirm}
                onSkip={handleRankingSkip}
                countyFips={countyFips ?? undefined}
                issueCounts={issueCounts ?? undefined}
              />
            </section>
          )}

          {phase6Step === "concerns" && (
            <section
              aria-label="Concern disambiguation"
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
            >
              <ConcernDisambiguation
                onConfirm={handleConcernsConfirm}
                onSkip={handleConcernsSkip}
              />
            </section>
          )}

          {/* Phase 5 + 6: Chat CTA and Chat Window */}
          <section aria-label="AI ballot research chat">
            {phase6Step === null && !showChat ? (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <button
                  data-testid="chat-cta"
                  onClick={handleOpenChat}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  {t("chatCtaButton")}
                </button>
                <span className="text-sm text-gray-500">
                  — or scroll down to copy the prompt for any AI chatbot
                </span>
              </div>
            ) : showChat ? (
              <ChatWindow
                systemPrompt={enrichedSystemPrompt}
                voterProfile={voterProfile}
                rankedIssues={rankedIssues}
                confirmedConcerns={confirmedConcerns}
                county={appState.stateData?.stateName}
                electionName={
                  appState.liveData?.electionName ?? appState.election?.name
                }
                electionDate={
                  appState.liveData?.electionDate ?? appState.election?.date
                }
                phonePolicyNote={
                  appState.stateData?.votingRules?.phonesAtPollsDetail
                }
                onClose={() => {
                  setShowChat(false);
                  setPhase6Step(null);
                }}
              />
            ) : null}
          </section>

          <PromptOutput promptText={enrichedPromptText} />

          {/* Phase 5: Path B ballot builder */}
          <section
            aria-label={t("pathBSectionHeading")}
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {t("pathBSectionHeading")}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                After your AI conversation, paste your results here to download
                your ballot.
              </p>
            </div>
            <div className="p-6">
              <BallotDownload
                county={appState.stateData?.stateName}
                electionName={
                  appState.liveData?.electionName ?? appState.election?.name
                }
                electionDate={
                  appState.liveData?.electionDate ?? appState.election?.date
                }
                phonePolicyNote={
                  appState.stateData?.votingRules?.phonesAtPollsDetail
                }
                showPathB={true}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
