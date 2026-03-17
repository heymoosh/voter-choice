"use client";

import { useState } from "react";
import {
  getStatesForZip,
  getStateData,
  getNextElection,
} from "@/lib/election-data";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";

export default function Home() {
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [states, setStates] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStates(null);
    setSelectedState(null);
    setCustomPrompt(null);

    // Validate input
    if (!zipCode) {
      setError("Please enter a zip code");
      return;
    }

    if (!/^\d{5}$/.test(zipCode)) {
      setError("Please enter a valid 5-digit zip code");
      return;
    }

    // Look up zip code
    const foundStates = getStatesForZip(zipCode);
    if (!foundStates) {
      setError(
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
      );
      return;
    }

    setStates(foundStates);

    // If only one state, show data immediately
    if (foundStates.length === 1) {
      handleStateSelection(foundStates[0]);
    }
  };

  const handleStateSelection = (stateCode: string) => {
    setSelectedState(stateCode);
    const stateData = getStateData(stateCode);

    if (!stateData) {
      setError("State data not available");
      return;
    }

    const nextElection = getNextElection(stateData);
    if (!nextElection) {
      setCustomPrompt(null);
      return;
    }

    const prompt = generateCustomizedPrompt(zipCode, stateData, nextElection);
    setCustomPrompt(prompt);
  };

  const handleCopyToClipboard = async () => {
    if (!customPrompt) return;

    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      const promptElement = document.getElementById("prompt-output");
      if (promptElement) {
        const range = document.createRange();
        range.selectNodeContents(promptElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const stateData = selectedState ? getStateData(selectedState) : null;
  const nextElection = stateData ? getNextElection(stateData) : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to content
      </a>

      <main
        id="main-content"
        className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12"
      >
        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Free AI Ballot Research Tool
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            Get a customized AI prompt pre-filled with your local election
            information. Paste it into any free AI chatbot to research your
            ballot.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Works with:
            </span>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ChatGPT
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Gemini
            </a>
            <a
              href="https://grok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Grok
            </a>
          </div>
        </section>

        {/* Zip Code Entry */}
        <section className="mb-8">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <label
                htmlFor="zip-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Enter your 5-digit zip code
              </label>
              <input
                id="zip-input"
                data-testid="zip-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg"
                placeholder="e.g., 78701"
              />
            </div>
            <div className="sm:self-end">
              <button
                type="submit"
                data-testid="zip-submit"
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors min-h-[44px] min-w-[44px]"
              >
                Get My Prompt
              </button>
            </div>
          </form>

          {error && (
            <div
              data-testid="zip-error"
              role="alert"
              className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200"
            >
              {error}
              {error.includes("don't have data") && (
                <a
                  href="https://www.usa.gov/election-office"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-sm text-red-700 dark:text-red-300 hover:underline"
                  data-testid="not-found-message"
                >
                  Find your state election website
                </a>
              )}
            </div>
          )}
        </section>

        {/* Multi-State Selector */}
        {states && states.length > 1 && !selectedState && (
          <section className="mb-8">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-900 dark:text-yellow-200 mb-3">
                This zip code spans multiple states. Which state are you voting
                in?
              </p>
              <div className="flex flex-wrap gap-2">
                {states.map((stateCode) => {
                  const data = getStateData(stateCode);
                  return (
                    <button
                      key={stateCode}
                      data-testid="state-selector"
                      onClick={() => handleStateSelection(stateCode)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                    >
                      {data?.stateName || stateCode}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* State Info Display */}
        {stateData && nextElection && (
          <section className="mb-8" data-testid="state-info">
            <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {stateData.stateName} Election Information
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                    Next Election
                  </h3>
                  <p
                    className="text-lg font-medium text-gray-900 dark:text-white"
                    data-testid="election-name"
                  >
                    {nextElection.name}
                  </p>
                  <p
                    className="text-gray-700 dark:text-gray-300"
                    data-testid="election-date"
                  >
                    {new Date(nextElection.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div data-testid="registration-status">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
                    Registration Deadlines
                  </h3>
                  <ul className="space-y-2">
                    {stateData.registration.online.available && (
                      <li className="flex items-start gap-2">
                        <DeadlineIndicator
                          deadline={stateData.registration.online.deadline}
                        />
                        <span className="text-gray-700 dark:text-gray-300">
                          Online:{" "}
                          {new Date(
                            stateData.registration.online.deadline!,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <DeadlineIndicator
                        deadline={stateData.registration.byMail.deadline}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        By mail:{" "}
                        {new Date(
                          stateData.registration.byMail.deadline!,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        (
                        {stateData.registration.byMail.sincePostmarked
                          ? "postmark"
                          : "received"}
                        )
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <DeadlineIndicator
                        deadline={stateData.registration.inPerson.deadline}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        In person:{" "}
                        {new Date(
                          stateData.registration.inPerson.deadline!,
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  </ul>
                </div>

                {stateData.earlyVoting.available && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
                      Early Voting
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {new Date(
                        stateData.earlyVoting.startDate!,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      –{" "}
                      {new Date(
                        stateData.earlyVoting.endDate!,
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {stateData.earlyVoting.notes && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {" "}
                          ({stateData.earlyVoting.notes})
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <a
                    href={stateData.resources.sampleBallotLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View sample ballot →
                  </a>
                  <a
                    href={stateData.resources.countyElectionLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    County election office →
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* No Election Message */}
        {stateData && !nextElection && (
          <section className="mb-8">
            <div
              data-testid="no-election-message"
              className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
            >
              No upcoming elections found for {stateData.stateName}. Check{" "}
              <a
                href={stateData.resources.stateElectionWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {stateData.stateName} election website
              </a>{" "}
              for updates.
            </div>
          </section>
        )}

        {/* Customized Prompt Output */}
        {customPrompt && (
          <section className="mb-12">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Your Customized Prompt
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Copy this prompt and paste it as your first message in any AI
                  chatbot
                </p>
              </div>
              <button
                onClick={handleCopyToClipboard}
                data-testid="copy-button"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors min-h-[44px] min-w-[44px] whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            {copied && (
              <div
                data-testid="copy-confirmation"
                role="status"
                aria-live="polite"
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 flex items-center gap-2"
              >
                <span>✓</span>
                <span>Copied to clipboard!</span>
              </div>
            )}

            <div
              id="prompt-output"
              data-testid="prompt-output"
              className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-auto max-h-[600px] whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-gray-100"
            >
              {customPrompt}
            </div>
          </section>
        )}

        {/* Tips Section */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Tips for Using This Tool
          </h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>
                You can say &ldquo;I don&rsquo;t know&rdquo; or &ldquo;I&rsquo;m not sure where I stand&rdquo; — the
                AI will explain more and help you figure it out
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>
                Ask it to research something for you (&ldquo;Can you look up this
                candidate&rsquo;s voting record?&rdquo;)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>
                Ask questions anytime (&ldquo;What does this position actually do?&rdquo; or
                &ldquo;Why does this matter?&rdquo;)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                •
              </span>
              <span>
                <strong>Important:</strong> AI can make mistakes. This is a
                research starting point. The AI will link you to official
                sources so you can verify anything that matters to you.
              </span>
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <p className="text-center text-gray-600 dark:text-gray-400 mb-2">
            Created by a human using AI tools
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            Share this tool with friends and family to help them research their
            ballot
          </p>
        </footer>
      </main>
    </div>
  );
}

function DeadlineIndicator({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return (
      <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mt-1.5" />
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let color = "bg-gray-400"; // passed or null
  let label = "Passed";

  if (diffDays >= 0) {
    if (diffDays <= 3) {
      color = "bg-red-500";
      label = "Urgent";
    } else if (diffDays <= 14) {
      color = "bg-yellow-500";
      label = "Soon";
    } else {
      color = "bg-green-500";
      label = "Upcoming";
    }
  }

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${color} mt-1.5`}
      title={label}
      aria-label={label}
    />
  );
}
