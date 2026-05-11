"use client";

import { useState } from "react";
import { ZipForm } from "@/components/ZipForm";
import { StateSelector } from "@/components/StateSelector";
import { StateInfoCard } from "@/components/StateInfoCard";
import { PromptOutput } from "@/components/PromptOutput";
import { TipsSection } from "@/components/TipsSection";
import { Footer } from "@/components/Footer";
import { lookupState } from "@/lib/lookupState";
import { getStateData } from "@/lib/getStateData";
import { generatePrompt } from "@/lib/generatePrompt";
import type { StateData } from "@/lib/types";

type PageState =
  | { status: "idle" }
  | { status: "multi-state"; stateCodes: string[]; zip: string }
  | { status: "result"; stateData: StateData; zip: string; prompt: string }
  | { status: "not-found"; zip: string };

export default function Home() {
  const [pageState, setPageState] = useState<PageState>({ status: "idle" });

  function handleZipSubmit(zip: string) {
    const stateCodes = lookupState(zip);

    if (!stateCodes) {
      setPageState({ status: "not-found", zip });
      return;
    }

    if (stateCodes.length > 1) {
      setPageState({ status: "multi-state", stateCodes, zip });
      return;
    }

    resolveState(zip, stateCodes[0]);
  }

  function handleStateSelect(stateCode: string) {
    if (pageState.status === "multi-state") {
      resolveState(pageState.zip, stateCode);
    }
  }

  function resolveState(zip: string, stateCode: string) {
    const stateData = getStateData(stateCode);

    if (!stateData) {
      setPageState({ status: "not-found", zip });
      return;
    }

    const prompt = generatePrompt(stateData, zip);
    setPageState({ status: "result", stateData, zip, prompt });
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            Know What You&apos;re Voting For
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Enter your zip code to get a customized AI prompt that walks you
            through every race and issue on your ballot. Copy it into any free
            AI chatbot — no account required.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
            <span>Works with:</span>
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map(({ name, url }) => (
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
            Look up your state
          </h2>
          <ZipForm onSubmit={handleZipSubmit} />
        </section>

        {/* Not Found Message */}
        {pageState.status === "not-found" && (
          <div
            data-testid="not-found-message"
            role="alert"
            aria-live="polite"
            className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-800"
          >
            <p className="font-medium">
              We don&apos;t have data for zip code{" "}
              <strong>{pageState.zip}</strong> yet.
            </p>
            <p className="text-sm mt-1">
              We&apos;re working on adding all U.S. zip codes. In the meantime,
              find your state election office at{" "}
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
          />
        )}

        {/* Results: State Info + Prompt */}
        {pageState.status === "result" && (
          <>
            <StateInfoCard stateData={pageState.stateData} />
            <PromptOutput promptText={pageState.prompt} />
          </>
        )}

        {/* Tips */}
        <TipsSection />

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}
