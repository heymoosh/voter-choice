"use client";

import { useState } from "react";
import type { StateElectionData } from "@/types/election";
import {
  lookupZipCode,
  getStateElectionData,
  getNextElection,
  calculateDeadlineStatus,
  formatDate,
} from "@/lib/election-data";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";

export default function Home() {
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    states: string[];
    isMultiState: boolean;
  } | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLookupResult(null);
    setStateData(null);
    setSelectedState(null);
    setCustomPrompt("");

    if (!zipCode.trim()) {
      setError("Please enter a zip code");
      return;
    }

    if (!/^\d{5}$/.test(zipCode.trim())) {
      setError("Please enter a valid 5-digit zip code");
      return;
    }

    setLoading(true);

    const result = lookupZipCode(zipCode.trim());
    if (!result) {
      setError(
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
      );
      setLoading(false);
      return;
    }

    setLookupResult(result);

    if (result.isMultiState) {
      setLoading(false);
    } else {
      await loadStateData(result.states[0]);
    }
  };

  const handleStateSelect = async (stateCode: string) => {
    setSelectedState(stateCode);
    await loadStateData(stateCode);
  };

  const loadStateData = async (stateCode: string) => {
    setLoading(true);
    const data = await getStateElectionData(stateCode);

    if (!data) {
      setError(`Could not load election data for ${stateCode}`);
      setLoading(false);
      return;
    }

    setStateData(data);
    const prompt = generateCustomizedPrompt(zipCode.trim(), data);
    setCustomPrompt(prompt);
    setLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback - select text
      const textarea = document.querySelector('[data-testid="prompt-output"]');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.select();
      }
    }
  };

  const nextElection = stateData ? getNextElection(stateData.elections) : null;
  const onlineDeadline = stateData
    ? calculateDeadlineStatus(stateData.registration.online.deadline)
    : null;
  const byMailDeadline = stateData
    ? calculateDeadlineStatus(stateData.registration.byMail.deadline)
    : null;
  const inPersonDeadline = stateData
    ? calculateDeadlineStatus(stateData.registration.inPerson.deadline)
    : null;

  const getDeadlineColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-700";
      case "warning":
        return "text-yellow-700";
      case "urgent":
        return "text-red-700";
      case "passed":
        return "text-gray-500";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to content
      </a>

      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8"
      >
        {/* Hero */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Free AI Ballot Research Tool
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Get a customized AI prompt pre-filled with your local election
            information
          </p>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto">
            Enter your zip code, get your state&apos;s election dates and
            deadlines, then copy the customized prompt to any free AI chatbot
            (Claude, ChatGPT, Gemini, Grok) to research your ballot.
          </p>
        </header>

        {/* Zip Code Entry */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="zip-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Enter your zip code
              </label>
              <div className="flex gap-4">
                <input
                  id="zip-input"
                  data-testid="zip-input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{5}"
                  maxLength={5}
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  placeholder="12345"
                  aria-describedby={error ? "zip-error" : undefined}
                  aria-invalid={!!error}
                />
                <button
                  type="submit"
                  data-testid="zip-submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] font-medium"
                >
                  {loading ? "Loading..." : "Submit"}
                </button>
              </div>
            </div>

            {error && (
              <div
                id="zip-error"
                data-testid="zip-error"
                className="text-red-600 text-sm bg-red-50 p-3 rounded-md"
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}
          </form>
        </section>

        {/* Multi-State Selector */}
        {lookupResult && lookupResult.isMultiState && !selectedState && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              This zip code spans multiple states
            </h2>
            <p className="text-gray-600 mb-4">Which state are you voting in?</p>
            <div className="flex gap-4" data-testid="state-selector">
              {lookupResult.states.map((stateCode) => (
                <button
                  key={stateCode}
                  onClick={() => handleStateSelect(stateCode)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[44px] min-h-[44px] font-medium"
                >
                  {stateCode}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* State Info Display */}
        {stateData && nextElection && (
          <section
            data-testid="state-info"
            className="bg-white rounded-lg shadow-md p-6 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {stateData.stateName} Election Information
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Next Election
                </h3>
                <p
                  className="text-lg font-semibold"
                  data-testid="election-name"
                >
                  {nextElection.name}
                </p>
                <p className="text-gray-600" data-testid="election-date">
                  {formatDate(nextElection.date)}
                </p>
                {nextElection.isPrimary && nextElection.primaryType && (
                  <p className="text-sm text-gray-500 capitalize">
                    {nextElection.primaryType} primary
                  </p>
                )}
              </div>

              <div data-testid="registration-status">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Registration Deadlines
                </h3>
                <ul className="space-y-2">
                  {onlineDeadline && (
                    <li className="flex justify-between items-center">
                      <span>Online</span>
                      <span
                        className={`font-medium ${getDeadlineColor(onlineDeadline.status)}`}
                      >
                        {formatDate(onlineDeadline.date)} (
                        {onlineDeadline.statusText})
                      </span>
                    </li>
                  )}
                  {byMailDeadline && (
                    <li className="flex justify-between items-center">
                      <span>
                        By mail{" "}
                        {stateData.registration.byMail.sincePostmarked &&
                          "(postmarked)"}
                      </span>
                      <span
                        className={`font-medium ${getDeadlineColor(byMailDeadline.status)}`}
                      >
                        {formatDate(byMailDeadline.date)} (
                        {byMailDeadline.statusText})
                      </span>
                    </li>
                  )}
                  {inPersonDeadline && (
                    <li className="flex justify-between items-center">
                      <span>In person</span>
                      <span
                        className={`font-medium ${getDeadlineColor(inPersonDeadline.status)}`}
                      >
                        {formatDate(inPersonDeadline.date)} (
                        {inPersonDeadline.statusText})
                      </span>
                    </li>
                  )}
                </ul>
                {stateData.registration.sameDayRegistration && (
                  <p className="text-sm text-green-700 mt-2">
                    ✓ Same-day registration available
                  </p>
                )}
              </div>

              {stateData.earlyVoting.available &&
                stateData.earlyVoting.startDate &&
                stateData.earlyVoting.endDate && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Early Voting
                    </h3>
                    <p>
                      {formatDate(stateData.earlyVoting.startDate)} –{" "}
                      {formatDate(stateData.earlyVoting.endDate)}
                    </p>
                    {stateData.earlyVoting.notes && (
                      <p className="text-sm text-gray-600">
                        {stateData.earlyVoting.notes}
                      </p>
                    )}
                  </div>
                )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Resources
                </h3>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href={stateData.resources.sampleBallotLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Find my sample ballot
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.resources.countyElectionLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      My county election office
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.registration.registrationCheckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Check registration status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* No Election Found */}
        {stateData && !nextElection && (
          <section
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8"
            data-testid="no-election-message"
          >
            <p className="text-yellow-900">
              No upcoming elections found for {stateData.stateName}. Check{" "}
              <a
                href={stateData.resources.stateElectionWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                the state election website
              </a>{" "}
              for updates.
            </p>
          </section>
        )}

        {/* Not Found Message */}
        {error && error.includes("don't have data") && (
          <section
            className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8"
            data-testid="not-found-message"
          >
            <p className="text-gray-700 mb-4">{error}</p>
            <p className="text-sm text-gray-600">
              You can still find your state&apos;s election information at these
              resources:
            </p>
            <ul className="mt-2 text-sm space-y-1">
              <li>
                <a
                  href="https://www.usa.gov/election-office"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Find your state election office
                </a>
              </li>
            </ul>
          </section>
        )}

        {/* Customized Prompt Output */}
        {customPrompt && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                Your Customized AI Research Prompt
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Copy this prompt and paste it as your first message in any AI
                chatbot (Claude, ChatGPT, Gemini, Grok)
              </p>
            </div>

            <div className="relative">
              <textarea
                data-testid="prompt-output"
                readOnly
                value={customPrompt}
                className="w-full h-96 p-4 bg-gray-50 border border-gray-300 rounded-md font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Customized ballot research prompt"
              />
              <button
                onClick={handleCopy}
                data-testid="copy-button"
                className="mt-4 w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[44px] min-h-[44px] font-medium"
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
              {copied && (
                <span
                  data-testid="copy-confirmation"
                  className="ml-4 text-green-600 text-sm"
                  aria-live="polite"
                >
                  Prompt copied to clipboard!
                </span>
              )}
            </div>
          </section>
        )}

        {/* Tips */}
        <section className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Tips for using the prompt
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              • You can say &quot;I don&apos;t know&quot; or &quot;I&apos;m not
              sure&quot; — the AI will explain more
            </li>
            <li>
              • Ask it to research candidates: &quot;Can you look up their
              voting record?&quot;
            </li>
            <li>
              • Ask questions anytime: &quot;What does this position do?&quot;
              or &quot;Why does this matter?&quot;
            </li>
            <li>
              • Remember: AI can make mistakes. The prompt links you to official
              sources to verify anything important
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
          <p className="mb-2">Share this tool with other voters</p>
          <p>Created by a human using AI tools</p>
        </footer>
      </main>
    </div>
  );
}
