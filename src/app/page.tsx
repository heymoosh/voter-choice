"use client";
import { ZipForm } from "@/components/ZipForm";
import { StateInfoCard } from "@/components/StateInfoCard";
import { StateSelector } from "@/components/StateSelector";
import { PromptOutput } from "@/components/PromptOutput";
import { TipsSection } from "@/components/TipsSection";
import { Footer } from "@/components/Footer";
import { useElectionData } from "@/hooks/useElectionData";

export default function Home() {
  const { state, lookup, selectState } = useElectionData();

  return (
    <div className="min-h-screen bg-gray-50">
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero */}
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Know What You&apos;re Voting For
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto">
            Enter your zip code to get a customized AI research prompt for your
            ballot. Paste it into any free AI chatbot — Claude, ChatGPT, Gemini,
            or Grok — and get personalized help with every race and issue.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-sm">
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
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
              >
                {bot.name}
              </a>
            ))}
          </div>
        </header>

        {/* Zip Code Entry */}
        <section aria-labelledby="zip-section-label" className="mb-8">
          <h2 id="zip-section-label" className="sr-only">
            Enter your zip code
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <ZipForm onSubmit={lookup} disabled={state.status === "loading"} />
            {state.status === "loading" && (
              <p className="mt-3 text-sm text-gray-500 animate-pulse">
                Looking up election information...
              </p>
            )}
            {state.status === "not-found" && (
              <p
                data-testid="not-found-message"
                role="alert"
                className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2"
              >
                We don&apos;t have data for this zip code yet. We&apos;re
                working on adding all U.S. zip codes.{" "}
                <a
                  href="https://www.usa.gov/election-office"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find your state election website
                </a>
                .
              </p>
            )}
            {state.status === "error" && (
              <p
                role="alert"
                className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2"
              >
                {state.message}
              </p>
            )}
          </div>
        </section>

        {/* Multi-state selector */}
        {state.status === "multi-state" && (
          <section className="mb-8">
            <StateSelector
              stateCodes={state.stateCodes}
              onSelect={(code) => selectState(code, state.zip)}
            />
          </section>
        )}

        {/* Results */}
        {state.status === "loaded" && (
          <div className="space-y-6">
            <StateInfoCard stateData={state.stateData} />
            <PromptOutput prompt={state.prompt} />
            <TipsSection />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
