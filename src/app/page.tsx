"use client";

import { useState } from "react";
import { ZipCodeForm } from "@/components/ZipCodeForm";
import { StateInfoCard } from "@/components/StateInfoCard";
import { PromptOutput } from "@/components/PromptOutput";
import { StateSelectorModal } from "@/components/StateSelectorModal";
import { lookupState } from "@/lib/lookupState";
import { generatePrompt } from "@/lib/generatePrompt";
import type { StateElectionData } from "@/lib/types";

type AppState =
  | { stage: "idle" }
  | { stage: "loading" }
  | { stage: "not-found"; zip: string }
  | { stage: "multi-state"; zip: string; stateCodes: string[] }
  | { stage: "result"; zip: string; stateData: StateElectionData };

async function loadStateData(code: string): Promise<StateElectionData | null> {
  try {
    const mod = await import(`@/data/states/${code}.json`);
    return mod.default as StateElectionData;
  } catch {
    return null;
  }
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });

  async function handleZipSubmit(zip: string) {
    setAppState({ stage: "loading" });

    const stateCodes = lookupState(zip);

    if (stateCodes.length === 0) {
      setAppState({ stage: "not-found", zip });
      return;
    }

    if (stateCodes.length > 1) {
      setAppState({ stage: "multi-state", zip, stateCodes });
      return;
    }

    const stateData = await loadStateData(stateCodes[0]);
    if (!stateData) {
      setAppState({ stage: "not-found", zip });
      return;
    }

    setAppState({ stage: "result", zip, stateData });
  }

  async function handleStateSelect(code: string) {
    if (appState.stage !== "multi-state") return;
    const { zip } = appState;

    setAppState({ stage: "loading" });
    const stateData = await loadStateData(code);
    if (!stateData) {
      setAppState({ stage: "not-found", zip });
      return;
    }

    setAppState({ stage: "result", zip, stateData });
  }

  const promptText =
    appState.stage === "result"
      ? generatePrompt(appState.stateData, appState.zip)
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Research your ballot in minutes
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Enter your zip code to get your state&apos;s election info and a
            customized AI research prompt. Copy it, paste it into any free AI
            chatbot, and let it walk you through every race and issue.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            <span>Works with:</span>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              ChatGPT
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Gemini
            </a>
            <a
              href="https://grok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Grok
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        {/* Zip Code Entry */}
        <section className="mb-8">
          <ZipCodeForm
            onSubmit={handleZipSubmit}
            isLoading={appState.stage === "loading"}
          />
        </section>

        {/* Loading State */}
        {appState.stage === "loading" && (
          <div
            className="flex items-center gap-2 text-gray-500"
            aria-live="polite"
            role="status"
          >
            <svg
              className="w-5 h-5 animate-spin"
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
            <span>Looking up your state&apos;s election information...</span>
          </div>
        )}

        {/* Not Found */}
        {appState.stage === "not-found" && (
          <div
            data-testid="not-found-message"
            className="bg-amber-50 border border-amber-200 rounded-xl p-6"
            role="alert"
          >
            <h2 className="text-lg font-semibold text-amber-900 mb-2">
              Zip code not found
            </h2>
            <p className="text-amber-800 text-sm">
              We don&apos;t have data for zip code{" "}
              <strong>{appState.zip}</strong> yet. We&apos;re working on adding
              all U.S. zip codes. In the meantime, visit your{" "}
              <a
                href="https://www.usa.gov/state-election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                state election office
              </a>{" "}
              for election information.
            </p>
          </div>
        )}

        {/* Multi-state selector */}
        {appState.stage === "multi-state" && (
          <StateSelectorModal
            stateCodes={appState.stateCodes}
            onSelect={handleStateSelect}
          />
        )}

        {/* Results */}
        {appState.stage === "result" && promptText && (
          <div className="space-y-6">
            <StateInfoCard stateData={appState.stateData} />
            <PromptOutput promptText={promptText} />
          </div>
        )}

        {/* Tips Section */}
        <section className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            Tips for using the prompt
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <strong>You can say &ldquo;I don&apos;t know&rdquo;</strong> — the
              AI will explain more and help you figure it out
            </li>
            <li>
              <strong>Ask it to research</strong> something for you (&ldquo;Can
              you look up this candidate&apos;s voting record?&rdquo;)
            </li>
            <li>
              <strong>Ask questions anytime</strong> — &ldquo;What does this
              position actually do?&rdquo; or &ldquo;Why does this
              matter?&rdquo;
            </li>
            <li>
              <strong>Important:</strong> AI can make mistakes. This is a
              research starting point — always verify with official sources.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p className="mb-2">
            <strong>Share this tool</strong> with friends, family, and your
            community. The more people vote based on evidence, the better our
            elections get.
          </p>
          <p>
            Created by a human using AI tools, because everyone deserves to know
            what they&apos;re actually voting for.
          </p>
        </footer>
      </main>
    </div>
  );
}
