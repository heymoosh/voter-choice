"use client";

import { useState } from "react";
import { ZipEntry } from "./ZipEntry";
import { StateSelector } from "./StateSelector";
import { StateInfoCard } from "./StateInfoCard";
import { PromptOutput } from "./PromptOutput";
import { TipsSection } from "./TipsSection";
import { lookupZip } from "../../lib/zipLookup";
import { loadStateData, getNextElection } from "../../lib/stateData";
import { buildFullPrompt } from "../../lib/promptBuilder";
import type { StateData, Election } from "../../types/state";

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "multi-state"; zip: string; stateCodes: string[] }
  | { status: "not-found"; zip: string }
  | { status: "no-data"; zip: string; stateCode: string }
  | {
      status: "ready";
      zip: string;
      stateData: StateData;
      election: Election | null;
      fullPrompt: string;
    };

export function BallotTool() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });

  function handleZipSubmit(zip: string) {
    setAppState({ status: "loading" });

    // Simulated async for loading state (all data is synchronous in practice)
    const stateCodes = lookupZip(zip);

    if (!stateCodes) {
      setAppState({ status: "not-found", zip });
      return;
    }

    if (stateCodes.length > 1) {
      setAppState({ status: "multi-state", zip, stateCodes });
      return;
    }

    loadStateForCode(zip, stateCodes[0]);
  }

  function loadStateForCode(zip: string, stateCode: string) {
    const stateData = loadStateData(stateCode);

    if (!stateData) {
      setAppState({ status: "not-found", zip });
      return;
    }

    const election = getNextElection(stateData);
    const fullPrompt = buildFullPrompt(zip, stateData, election);

    setAppState({
      status: "ready",
      zip,
      stateData,
      election,
      fullPrompt,
    });
  }

  function handleStateSelect(stateCode: string) {
    if (appState.status !== "multi-state") return;
    const stateData = loadStateData(stateCode);
    if (!stateData) {
      setAppState({ status: "not-found", zip: appState.zip });
      return;
    }
    loadStateForCode(appState.zip, stateCode);
  }

  function handleReset() {
    setAppState({ status: "idle" });
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Skip-to-content target */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white text-blue-700 px-4 py-2 rounded shadow font-medium z-50"
      >
        Skip to main content
      </a>

      {/* Hero section */}
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          Free AI Ballot Research Tool
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
          Enter your ZIP code to get a customized AI ballot research prompt.
          Paste it into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok —
          to walk through every race and issue on your ballot.
        </p>
        <div
          className="flex flex-wrap gap-3 pt-1"
          aria-label="Supported AI chatbots"
        >
          {[
            { name: "Claude", url: "https://claude.ai" },
            { name: "ChatGPT", url: "https://chatgpt.com" },
            { name: "Gemini", url: "https://gemini.google.com" },
            { name: "Grok", url: "https://grok.com" },
          ].map((bot) => (
            <a
              key={bot.name}
              href={bot.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              {bot.name}
            </a>
          ))}
        </div>
      </header>

      {/* Main content */}
      <div id="main-content" className="space-y-6">
        {/* Zip entry — always shown */}
        <ZipEntry
          onSubmit={handleZipSubmit}
          isLoading={appState.status === "loading"}
        />

        {/* Loading */}
        {appState.status === "loading" && (
          <p className="text-gray-500 text-sm" role="status" aria-live="polite">
            Looking up your state…
          </p>
        )}

        {/* Not found */}
        {appState.status === "not-found" && (
          <div
            data-testid="not-found-message"
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-gray-800"
          >
            <p className="font-semibold mb-1">
              We don&apos;t have data for ZIP code{" "}
              <strong>{appState.zip}</strong> yet.
            </p>
            <p>
              We&apos;re working on adding all U.S. ZIP codes. In the meantime,
              visit your{" "}
              <a
                href="https://www.usa.gov/election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-700 hover:text-blue-900"
              >
                state election website directory
              </a>{" "}
              for official information.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="mt-3 text-blue-700 underline text-sm hover:text-blue-900 focus:outline-none"
            >
              Try a different ZIP code
            </button>
          </div>
        )}

        {/* Multi-state selector */}
        {appState.status === "multi-state" && (
          <StateSelector
            stateCodes={appState.stateCodes}
            onSelect={handleStateSelect}
          />
        )}

        {/* Ready state — show info + prompt */}
        {appState.status === "ready" && (
          <>
            <StateInfoCard
              stateData={appState.stateData}
              election={appState.election}
              zip={appState.zip}
            />
            <PromptOutput fullPromptText={appState.fullPrompt} />
            <TipsSection />
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-700 underline hover:text-blue-900 focus:outline-none"
            >
              Look up a different ZIP code
            </button>
          </>
        )}
      </div>
    </main>
  );
}
