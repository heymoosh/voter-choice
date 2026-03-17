"use client";

import { useState, useEffect } from "react";
import { getStatesForZip, getStateData } from "@/lib/election-data";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";
import type { StateElectionData, Election } from "@/types/election";

export default function Home() {
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [stateOptions, setStateOptions] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const upcomingElection = stateData
    ? stateData.elections.find((e) => new Date(e.date) >= new Date()) || null
    : null;

  useEffect(() => {
    if (selectedState) {
      loadStateData(selectedState);
    }
  }, [selectedState]);

  async function loadStateData(stateCode: string) {
    const data = await getStateData(stateCode);
    if (data) {
      setStateData(data);
      const prompt = generateCustomizedPrompt(data, zipCode);
      setCustomPrompt(prompt);
    }
  }

  function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault();
    setZipError("");
    setStateOptions(null);
    setSelectedState(null);
    setStateData(null);
    setCustomPrompt("");

    if (!zipCode.trim()) {
      setZipError("Please enter a zip code");
      return;
    }

    if (!/^\d{5}$/.test(zipCode.trim())) {
      setZipError("Please enter a valid 5-digit zip code");
      return;
    }

    setIsLoading(true);
    const states = getStatesForZip(zipCode.trim());

    if (!states) {
      setZipError(
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
      );
      setIsLoading(false);
      return;
    }

    setStateOptions(states);
    if (states.length === 1) {
      setSelectedState(states[0]);
    }
    setIsLoading(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      const promptArea = document.getElementById("prompt-output");
      if (promptArea) {
        const range = document.createRange();
        range.selectNodeContents(promptArea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function calculateDaysUntil(isoDate: string | null): number | null {
    if (!isoDate) return null;
    const deadline = new Date(isoDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function getDeadlineStatus(isoDate: string | null): "passed" | "urgent" | "warning" | "ok" {
    const daysLeft = calculateDaysUntil(isoDate);
    if (daysLeft === null || daysLeft < 0) return "passed";
    if (daysLeft <= 3) return "urgent";
    if (daysLeft <= 14) return "warning";
    return "ok";
  }

  function renderDeadlineWithStatus(
    isoDate: string | null,
    label: string,
    postmarked?: boolean,
  ) {
    const status = getDeadlineStatus(isoDate);
    const daysLeft = calculateDaysUntil(isoDate);
    const statusColors = {
      passed: "text-gray-500",
      urgent: "text-red-600 font-semibold",
      warning: "text-yellow-600 font-semibold",
      ok: "text-green-600",
    };

    const statusText =
      status === "passed"
        ? "Passed"
        : status === "urgent"
          ? `${daysLeft} days left (URGENT)`
          : status === "warning"
            ? `${daysLeft} days left`
            : `${daysLeft} days left`;

    const postmarkSuffix = postmarked !== undefined ? (postmarked ? " (postmarked)" : " (received)") : "";

    return (
      <div>
        <strong>{label}:</strong>{" "}
        {isoDate ? (
          <>
            {formatDate(isoDate)}
            {postmarkSuffix} —{" "}
            <span className={statusColors[status]}>{statusText}</span>
          </>
        ) : (
          "Not available"
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to content
      </a>

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Hero Section */}
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            Free AI Ballot Research Tool
          </h1>
          <p className="text-lg text-gray-700 mb-2">
            Enter your zip code to get a customized AI prompt pre-filled with your state's
            election info, deadlines, and resources.
          </p>
          <p className="text-base text-gray-600 mb-4">
            Copy the prompt and paste it into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Claude
            </a>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ChatGPT
            </a>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Gemini
            </a>
            <a
              href="https://grok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Grok
            </a>
          </div>
        </section>

        {/* Zip Code Entry */}
        <section className="mb-8">
          <form onSubmit={handleZipSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="zip-input" className="sr-only">
                Enter your zip code
              </label>
              <input
                id="zip-input"
                data-testid="zip-input"
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter your 5-digit zip code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                aria-describedby={zipError ? "zip-error" : undefined}
              />
            </div>
            <button
              type="submit"
              data-testid="zip-submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[120px] min-h-[44px]"
            >
              {isLoading ? "Loading..." : "Get Prompt"}
            </button>
          </form>
          {zipError && (
            <p
              id="zip-error"
              data-testid="zip-error"
              className="mt-2 text-red-600 text-sm"
              role="alert"
            >
              {zipError}
            </p>
          )}
        </section>

        {/* State Selector (multi-state zip codes) */}
        {stateOptions && stateOptions.length > 1 && !selectedState && (
          <section className="mb-8" data-testid="state-selector">
            <p className="mb-3 font-semibold">This zip code spans multiple states. Which state are you voting in?</p>
            <div className="flex flex-wrap gap-2">
              {stateOptions.map((state) => (
                <button
                  key={state}
                  onClick={() => setSelectedState(state)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg min-h-[44px] min-w-[44px]"
                >
                  {state}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* State Info Display */}
        {stateData && (
          <section className="mb-8 border border-gray-300 rounded-lg p-6 bg-gray-50" data-testid="state-info">
            <h2 className="text-2xl font-bold mb-4">{stateData.stateName}</h2>

            {upcomingElection ? (
              <>
                <div className="mb-3">
                  <h3 className="text-lg font-semibold" data-testid="election-name">
                    {upcomingElection.name}
                  </h3>
                  <p data-testid="election-date" className="text-gray-700">
                    <strong>Date:</strong> {formatDate(upcomingElection.date)}
                  </p>
                  <p className="text-gray-700">
                    <strong>Type:</strong> {upcomingElection.type}
                    {upcomingElection.isPrimary && upcomingElection.primaryType && ` (${upcomingElection.primaryType} primary)`}
                  </p>
                </div>

                <div className="mb-3" data-testid="registration-status">
                  <h4 className="font-semibold mb-1">Registration Deadlines</h4>
                  {renderDeadlineWithStatus(
                    stateData.registration.online.deadline,
                    "Online",
                  )}
                  {renderDeadlineWithStatus(
                    stateData.registration.byMail.deadline,
                    "By mail",
                    stateData.registration.byMail.sincePostmarked,
                  )}
                  {renderDeadlineWithStatus(
                    stateData.registration.inPerson.deadline,
                    "In person",
                    stateData.registration.inPerson.sincePostmarked,
                  )}
                  <div>
                    <strong>Same-day registration:</strong>{" "}
                    {stateData.registration.sameDayRegistration ? "Available" : "Not available"}
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">Early Voting</h4>
                  <p className="text-gray-700">
                    {stateData.earlyVoting.available
                      ? `${formatDate(stateData.earlyVoting.startDate!)} through ${formatDate(stateData.earlyVoting.endDate!)}${stateData.earlyVoting.notes ? ` (${stateData.earlyVoting.notes})` : ""}`
                      : "Not available — absentee voting only"}
                  </p>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">Voter ID</h4>
                  <p className="text-gray-700">
                    {stateData.votingRules.idRequired
                      ? `Required. Accepted IDs: ${stateData.votingRules.acceptedIds?.join(", ")}`
                      : "Not required"}
                  </p>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">Phones at Polls</h4>
                  <p className="text-gray-700">
                    {stateData.votingRules.phonesAtPollsDetail || stateData.votingRules.phonesAtPolls}
                  </p>
                </div>

                <div className="space-y-1">
                  <a
                    href={stateData.resources.sampleBallotLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    View sample ballot
                  </a>
                  <a
                    href={stateData.resources.countyElectionLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    Find county election office
                  </a>
                  <a
                    href={stateData.registration.registrationCheckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    Check registration status
                  </a>
                </div>
              </>
            ) : (
              <p data-testid="no-election-message" className="text-gray-700">
                No upcoming elections are currently scheduled for {stateData.stateName}. Check{" "}
                <a
                  href={stateData.resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  the state election website
                </a>{" "}
                for updates.
              </p>
            )}
          </section>
        )}

        {/* Customized Prompt Output */}
        {customPrompt && (
          <section className="mb-8">
            <div className="mb-3">
              <h3 className="text-xl font-semibold mb-2">Your Customized AI Prompt</h3>
              <p className="text-gray-700 text-sm">
                Copy this prompt and paste it as your first message in any AI chatbot.
              </p>
            </div>
            <div
              id="prompt-output"
              data-testid="prompt-output"
              className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-3 whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto"
              role="region"
              aria-label="Customized AI ballot research prompt"
            >
              {customPrompt}
            </div>
            <button
              onClick={copyToClipboard}
              data-testid="copy-button"
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            {copied && (
              <span
                data-testid="copy-confirmation"
                className="ml-3 text-green-600 font-semibold"
                role="status"
                aria-live="polite"
              >
                ✓ Copied
              </span>
            )}
          </section>
        )}

        {/* Tips Section */}
        <section className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">Tips for Using the Prompt</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>You can say "I don't know" or "I'm not sure" — the AI will explain more and help you figure it out.</li>
            <li>Ask it to research something for you: "Can you look up this candidate's voting record?"</li>
            <li>Ask questions anytime: "What does this position actually do?" or "Why does this matter?"</li>
            <li>
              <strong>AI can make mistakes.</strong> This is a research starting point. Verify with official sources.
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-700 mb-2">
            <strong>Share this tool</strong> with friends and family who want to make informed voting decisions.
          </p>
          <p className="text-gray-600 text-sm">Created by a human using AI tools</p>
        </div>
      </footer>
    </div>
  );
}
