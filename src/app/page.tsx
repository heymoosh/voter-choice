"use client";

import { useState } from "react";
import { ZipForm } from "@/components/ZipForm";
import { StateSelector } from "@/components/StateSelector";
import { StateInfoCard } from "@/components/StateInfoCard";
import { PromptOutput } from "@/components/PromptOutput";
import { TipsSection } from "@/components/TipsSection";
import { Footer } from "@/components/Footer";
import { LanguageToggle } from "@/components/LanguageToggle";
import { generatePrompt } from "@/lib/generatePrompt";
import { useLanguage, tStr } from "@/lib/i18n";
import type { BallotData, DataStatus } from "@/lib/types";

export default function Home() {
  const [pageState, setPageState] = useState<DataStatus>({ status: "idle" });
  const { language } = useLanguage();

  async function handleZipSubmit(zip: string) {
    setPageState({ status: "loading", zip });

    try {
      const res = await fetch(
        `/api/ballot-data?zip=${encodeURIComponent(zip)}`,
      );
      if (!res.ok) {
        if (res.status === 404) {
          setPageState({ status: "not-found", zip });
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as BallotData & {
        multiState?: boolean;
        stateCodes?: string[];
        error?: string;
      };

      if (data.error === "ZIP code not found") {
        setPageState({ status: "not-found", zip });
        return;
      }

      if (data.multiState && data.stateCodes) {
        setPageState({
          status: "multi-state",
          stateCodes: data.stateCodes,
          zip,
        });
        return;
      }

      setPageState({ status: "result", ballotData: data as BallotData, zip });
    } catch {
      setPageState({ status: "not-found", zip });
    }
  }

  async function handleStateSelect(stateCode: string) {
    if (pageState.status !== "multi-state") return;
    const { zip } = pageState;
    setPageState({ status: "loading", zip });

    try {
      const res = await fetch(
        `/api/ballot-data?zip=${encodeURIComponent(zip)}&state=${encodeURIComponent(stateCode)}`,
      );
      if (!res.ok) {
        setPageState({ status: "not-found", zip });
        return;
      }
      const data = (await res.json()) as BallotData;
      setPageState({ status: "result", ballotData: data, zip });
    } catch {
      setPageState({ status: "not-found", zip });
    }
  }

  // Regenerate prompt reactively when language changes
  const promptText =
    pageState.status === "result"
      ? generatePrompt(
          // Provide a StateData-compatible view for backward compat
          {
            stateCode: pageState.ballotData.stateCode,
            stateName: pageState.ballotData.stateName,
            lastUpdated: pageState.ballotData.fetchedAt,
            elections: pageState.ballotData.elections,
            registration: pageState.ballotData.registration,
            earlyVoting: pageState.ballotData.earlyVoting,
            votingRules: pageState.ballotData.votingRules,
            resources: pageState.ballotData.resources,
          },
          pageState.zip,
          new Date(),
          language,
          pageState.ballotData,
        )
      : "";

  const chatbots = [
    { name: "Claude", url: "https://claude.ai" },
    { name: "ChatGPT", url: "https://chatgpt.com" },
    { name: "Gemini", url: "https://gemini.google.com" },
    { name: "Grok", url: "https://grok.com" },
  ];

  const isLoading = pageState.status === "loading";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header with language toggle */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-2 flex justify-end">
        <LanguageToggle />
      </header>

      <main
        id="main-content"
        className="max-w-2xl mx-auto px-4 py-8 sm:px-6 sm:py-12 space-y-10"
      >
        {/* Hero Section */}
        <section aria-labelledby="hero-heading" className="space-y-3">
          <h1
            id="hero-heading"
            className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight"
          >
            {tStr(language, "heroHeadline")}
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            {tStr(language, "heroSubtitle")}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
            <span>{tStr(language, "worksWith")}</span>
            {chatbots.map(({ name, url }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                {name}
              </a>
            ))}
          </div>
        </section>

        {/* Zip Code Entry */}
        <section aria-labelledby="zip-section-heading">
          <h2 id="zip-section-heading" className="sr-only">
            {tStr(language, "zipLabel")}
          </h2>
          <ZipForm
            onSubmit={handleZipSubmit}
            language={language}
            isLoading={isLoading}
          />
        </section>

        {/* Loading State */}
        {pageState.status === "loading" && (
          <div
            data-testid="data-loading"
            role="status"
            aria-live="polite"
            className="flex items-center gap-3 text-gray-600"
          >
            <div
              className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>{tStr(language, "loadingElectionData")}</span>
          </div>
        )}

        {/* Not Found Message */}
        {pageState.status === "not-found" && (
          <div
            data-testid="not-found-message"
            role="alert"
            aria-live="polite"
            className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800"
          >
            <p className="font-medium">
              {tStr(language, "notFoundPrefix")}{" "}
              <strong>{pageState.zip}</strong>
              {language === "es" ? " aún." : " yet."}
            </p>
            <p className="text-sm mt-1">
              {tStr(language, "notFoundSuffix")}{" "}
              <a
                href="https://www.usa.gov/state-election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                usa.gov/state-election-office
              </a>
              .
            </p>
          </div>
        )}

        {/* Multi-State Selector */}
        {pageState.status === "multi-state" && (
          <StateSelector
            stateCodes={pageState.stateCodes}
            onSelect={handleStateSelect}
            language={language}
          />
        )}

        {/* Results: State Info + Prompt */}
        {pageState.status === "result" && (
          <>
            {/* Partial API error banner */}
            {pageState.ballotData.errors.length > 0 &&
              !pageState.ballotData.apiFullError && (
                <div
                  data-testid="api-partial-error"
                  role="alert"
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm"
                >
                  <p>
                    {tStr(language, "apiPartialError")}{" "}
                    <a
                      href={pageState.ballotData.resources.stateElectionWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {tStr(language, "stateElectionWebsite")}
                    </a>
                    {language === "es"
                      ? " para más detalles."
                      : " for complete details."}
                  </p>
                </div>
              )}

            {/* Full API error banner */}
            {pageState.ballotData.apiFullError && (
              <div
                data-testid="api-full-error"
                role="alert"
                className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm"
              >
                <p>
                  {tStr(language, "apiFullError")}{" "}
                  <a
                    href={pageState.ballotData.resources.stateElectionWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {tStr(language, "stateElectionWebsite")}
                  </a>
                </p>
              </div>
            )}

            <StateInfoCard
              ballotData={pageState.ballotData}
              language={language}
            />
            <PromptOutput promptText={promptText} language={language} />
          </>
        )}

        {/* Tips */}
        <TipsSection language={language} />

        {/* Footer */}
        <Footer language={language} />
      </main>
    </div>
  );
}
