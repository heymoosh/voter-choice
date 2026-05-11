"use client";

import { useState, useCallback } from "react";
import { ZipCodeForm } from "@/components/ZipCodeForm";
import { StateSelector } from "@/components/StateSelector";
import { StateInfo } from "@/components/StateInfo";
import { PromptOutput } from "@/components/PromptOutput";
import { NotFoundMessage } from "@/components/NotFoundMessage";
import { NoElectionMessage } from "@/components/NoElectionMessage";
import { zipLookupAsync } from "@/lib/lookup";
import { buildPrompt } from "@/lib/prompt-builder";
import type { LookupResult } from "@/types";

type AppStatus =
  | "idle"
  | "loading"
  | "not-found"
  | "multi-state"
  | "no-election"
  | "ready";

interface AppState {
  status: AppStatus;
  zipCode: string;
  result: LookupResult | null;
  promptText: string;
}

const CHATBOT_LINKS = [
  { name: "Claude", url: "https://claude.ai", emoji: "🤖" },
  { name: "ChatGPT", url: "https://chatgpt.com", emoji: "💬" },
  { name: "Gemini", url: "https://gemini.google.com", emoji: "✨" },
  { name: "Grok", url: "https://grok.com", emoji: "⚡" },
];

export default function Home() {
  const [state, setState] = useState<AppState>({
    status: "idle",
    zipCode: "",
    result: null,
    promptText: "",
  });

  const today = new Date();

  const handleZipSubmit = useCallback(async (zip: string) => {
    setState((prev) => ({ ...prev, status: "loading", zipCode: zip }));

    try {
      const result = await zipLookupAsync(zip);

      if (result.type === "not-found") {
        setState((prev) => ({
          ...prev,
          status: "not-found",
          result,
        }));
        return;
      }

      if (result.type === "multi" && !result.selectedState) {
        setState((prev) => ({
          ...prev,
          status: "multi-state",
          result,
        }));
        return;
      }

      if (!result.stateData) {
        setState((prev) => ({
          ...prev,
          status: "not-found",
          result,
        }));
        return;
      }

      if (!result.nextElection) {
        setState((prev) => ({
          ...prev,
          status: "no-election",
          result,
        }));
        return;
      }

      const promptText = buildPrompt(
        result.stateData,
        zip,
        result.nextElection,
      );

      setState((prev) => ({
        ...prev,
        status: "ready",
        result,
        promptText,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        status: "not-found",
        result: null,
      }));
    }
  }, []);

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      const zip = state.zipCode;
      setState((prev) => ({ ...prev, status: "loading" }));

      try {
        const result = await zipLookupAsync(zip, stateCode);

        if (!result.stateData) {
          setState((prev) => ({ ...prev, status: "not-found", result }));
          return;
        }

        if (!result.nextElection) {
          setState((prev) => ({ ...prev, status: "no-election", result }));
          return;
        }

        const promptText = buildPrompt(
          result.stateData,
          zip,
          result.nextElection,
        );

        setState((prev) => ({
          ...prev,
          status: "ready",
          result,
          promptText,
        }));
      } catch {
        setState((prev) => ({ ...prev, status: "not-found", result: null }));
      }
    },
    [state.zipCode],
  );

  const handleReset = useCallback(() => {
    setState({
      status: "idle",
      zipCode: "",
      result: null,
      promptText: "",
    });
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <main
          id="main-content"
          className="max-w-3xl mx-auto px-4 py-8 sm:py-12"
        >
          {/* Hero Section */}
          <header className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Free AI Ballot Research for Every U.S. Voter
            </h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-4">
              Enter your zip code to get a personalized ballot research prompt.
              Copy it into any free AI chatbot and start researching your ballot
              — candidates, propositions, and deadlines — in minutes.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              No account. No tracking. No data stored. Your zip code stays in
              your browser.
            </p>

            {/* Chatbot links */}
            <div className="flex flex-wrap justify-center gap-3">
              {CHATBOT_LINKS.map((bot) => (
                <a
                  key={bot.name}
                  href={bot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[36px]"
                >
                  <span aria-hidden="true">{bot.emoji}</span>
                  {bot.name}
                </a>
              ))}
            </div>
          </header>

          {/* Zip Code Entry */}
          <section
            aria-labelledby="zip-entry-heading"
            className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8 mb-8"
          >
            <h2
              id="zip-entry-heading"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Step 1: Enter your zip code
            </h2>

            {state.status !== "idle" && (
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-gray-500">
                  Looking up:{" "}
                  <strong className="text-gray-900">{state.zipCode}</strong>
                </span>
                <button
                  onClick={handleReset}
                  className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded min-h-[44px] px-2"
                >
                  Start over
                </button>
              </div>
            )}

            <ZipCodeForm
              onSubmit={handleZipSubmit}
              loading={state.status === "loading"}
            />
          </section>

          {/* Results area */}
          <div className="space-y-6">
            {/* Not found */}
            {state.status === "not-found" && (
              <NotFoundMessage zipCode={state.zipCode} />
            )}

            {/* Multi-state selector */}
            {state.status === "multi-state" && state.result && (
              <StateSelector
                states={state.result.states}
                onSelect={handleStateSelect}
              />
            )}

            {/* No upcoming election */}
            {state.status === "no-election" && state.result?.stateData && (
              <>
                <StateInfo
                  stateData={state.result.stateData}
                  nextElection={null}
                  today={today}
                />
                <NoElectionMessage stateData={state.result.stateData} />
              </>
            )}

            {/* Ready: show state info + prompt */}
            {state.status === "ready" &&
              state.result?.stateData &&
              state.result.nextElection && (
                <>
                  <StateInfo
                    stateData={state.result.stateData}
                    nextElection={state.result.nextElection}
                    today={today}
                  />

                  <section
                    aria-labelledby="prompt-section-heading"
                    className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 sm:p-8"
                  >
                    <h2
                      id="prompt-section-heading"
                      className="text-lg font-semibold text-gray-900 mb-4"
                    >
                      Step 2: Copy your research prompt
                    </h2>
                    <PromptOutput promptText={state.promptText} />
                  </section>
                </>
              )}
          </div>

          {/* Tips Section */}
          <section
            aria-labelledby="tips-heading"
            className="mt-10 bg-amber-50 border border-amber-100 rounded-xl p-6"
          >
            <h2
              id="tips-heading"
              className="text-base font-semibold text-amber-900 mb-3"
            >
              Tips for the best results
            </h2>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ✓
                </span>
                You can say <strong>&ldquo;I don&apos;t know&rdquo;</strong> —
                the AI will explain more and help you figure it out
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ✓
                </span>
                Ask it to <strong>research something</strong> for you
                (&ldquo;Can you look up this candidate&apos;s voting
                record?&rdquo;)
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ✓
                </span>
                At the end, ask for a <strong>printable summary</strong> you can
                take to the polls
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="shrink-0">
                  ⚠
                </span>
                <strong>AI can make mistakes.</strong> This is a research
                starting point — always verify with official sources.
              </li>
            </ul>
          </section>

          {/* Footer */}
          <footer className="mt-10 text-center text-sm text-gray-500 space-y-2">
            <p>
              <strong>Share this tool</strong> with friends, family, or your
              community.{" "}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator
                      .share({
                        title: "Free AI Ballot Research Tool",
                        text: "Research your ballot with AI — free, no account needed",
                        url: window.location.href,
                      })
                      .catch(() => {});
                  } else {
                    navigator.clipboard
                      .writeText(window.location.href)
                      .catch(() => {});
                  }
                }}
                className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Share link
              </button>
            </p>
            <p className="text-gray-400">
              Created by a human using AI tools, because everyone deserves to
              know what they&apos;re actually voting for.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}
