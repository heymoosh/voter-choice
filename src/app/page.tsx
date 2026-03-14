"use client";

import { useState } from "react";
import {
  lookupStatesByZip,
  getStateData,
  getNextElection,
  getDeadlineStatus,
  formatDate,
} from "@/lib/election-data";
import { generateCustomPrompt } from "@/lib/prompt-generator";
import type { StateElectionData } from "@/types/election";

export default function Home() {
  const [zipCode, setZipCode] = useState("");
  const [error, setError] = useState("");
  const [states, setStates] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStates(null);
    setSelectedState(null);
    setStateData(null);
    setCustomPrompt("");

    if (!zipCode.trim()) {
      setError("Please enter a zip code");
      return;
    }

    if (!/^\d{5}$/.test(zipCode)) {
      setError("Please enter a valid 5-digit zip code");
      return;
    }

    const foundStates = lookupStatesByZip(zipCode);

    if (!foundStates) {
      setError(
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
      );
      return;
    }

    setStates(foundStates);

    if (foundStates.length === 1) {
      selectState(foundStates[0]);
    }
  };

  const selectState = (stateCode: string) => {
    setSelectedState(stateCode);
    const data = getStateData(stateCode);

    if (!data) {
      setError("State data not found");
      return;
    }

    setStateData(data);
    setCustomPrompt(generateCustomPrompt(zipCode, data));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const election = stateData ? getNextElection(stateData) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
      >
        Skip to content
      </a>

      <main id="main" className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Ballot Research Tool
          </h1>
          <p className="text-xl text-gray-700 mb-4">
            Get a customized AI prompt with your local election information
          </p>
          <p className="text-gray-600 mb-6">
            Enter your zip code to generate a personalized ballot research
            prompt. Copy it and paste into any free AI chatbot (Claude, ChatGPT,
            Gemini, Grok) to research your ballot.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Claude
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://chatgpt.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ChatGPT
            </a>
            <span className="text-gray-400">•</span>
            <a
              href="https://gemini.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Gemini
            </a>
            <span className="text-gray-400">•</span>
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
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="zip-input"
              className="block text-lg font-medium text-gray-900 mb-2"
            >
              Enter Your Zip Code
            </label>
            <div className="flex gap-4">
              <input
                id="zip-input"
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="12345"
                data-testid="zip-input"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                aria-describedby={error ? "zip-error" : undefined}
              />
              <button
                type="submit"
                data-testid="zip-submit"
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[120px]"
              >
                Submit
              </button>
            </div>
            {error && (
              <p
                id="zip-error"
                data-testid="zip-error"
                role="alert"
                aria-live="polite"
                className="mt-2 text-red-600"
              >
                {error}
              </p>
            )}
          </form>
        </section>

        {/* Multi-State Selector */}
        {states && states.length > 1 && !selectedState && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              This zip code spans multiple states. Which state are you voting
              in?
            </h2>
            <div className="flex flex-wrap gap-4">
              {states.map((stateCode) => (
                <button
                  key={stateCode}
                  onClick={() => selectState(stateCode)}
                  data-testid="state-selector"
                  className="px-6 py-3 bg-gray-100 hover:bg-blue-100 border border-gray-300 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                >
                  {stateCode}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* State Info Display */}
        {stateData && election && (
          <section
            data-testid="state-info"
            className="bg-white rounded-lg shadow-md p-6 mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {stateData.stateName} Election Information
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Upcoming Election
                </h3>
                <p data-testid="election-name" className="text-gray-700">
                  {election.name}
                </p>
                <p data-testid="election-date" className="text-gray-600">
                  {formatDate(election.date)}
                </p>
                {election.isPrimary && (
                  <p className="text-gray-600">
                    Type: {election.primaryType} primary
                  </p>
                )}
              </div>

              <div data-testid="registration-status">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Registration Deadlines
                </h3>
                <div className="space-y-2">
                  {stateData.registration.online.available &&
                    stateData.registration.online.deadline && (
                      <DeadlineItem
                        label="Online"
                        deadline={stateData.registration.online.deadline}
                      />
                    )}
                  <DeadlineItem
                    label="By Mail"
                    deadline={stateData.registration.byMail.deadline}
                    note={
                      stateData.registration.byMail.sincePostmarked
                        ? "postmark date"
                        : "received date"
                    }
                  />
                  <DeadlineItem
                    label="In Person"
                    deadline={stateData.registration.inPerson.deadline}
                  />
                </div>
                {stateData.registration.sameDayRegistration && (
                  <p className="mt-2 text-green-700 font-medium">
                    Same-day registration available
                  </p>
                )}
              </div>

              {stateData.earlyVoting.available && (
                <div>
                  <h3 className="font-semibold text-gray-900">Early Voting</h3>
                  <p className="text-gray-700">
                    {formatDate(stateData.earlyVoting.startDate!)} through{" "}
                    {formatDate(stateData.earlyVoting.endDate!)}
                  </p>
                  {stateData.earlyVoting.notes && (
                    <p className="text-gray-600 text-sm">
                      {stateData.earlyVoting.notes}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900">Resources</h3>
                <ul className="space-y-1">
                  <li>
                    <a
                      href={stateData.resources.sampleBallotLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Sample Ballot Lookup
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.resources.countyElectionLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      County Election Office
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.registration.registrationCheckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Check Registration Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* No Election Message */}
        {stateData && !election && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <p data-testid="no-election-message" className="text-gray-900">
              No upcoming elections found for {stateData.stateName}. Check{" "}
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
          </section>
        )}

        {/* Not Found Message */}
        {error.includes("don't have data") && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <p data-testid="not-found-message" className="text-gray-900 mb-2">
              {error}
            </p>
          </section>
        )}

        {/* Customized Prompt Output */}
        {customPrompt && (
          <section className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Customized Ballot Research Prompt
            </h2>
            <p className="text-gray-700 mb-4">
              Copy this prompt and paste it as your first message in any AI
              chatbot. Your state-specific information is already included.
            </p>

            <div className="relative">
              <pre
                data-testid="prompt-output"
                className="bg-gray-50 border border-gray-300 rounded-md p-4 overflow-x-auto whitespace-pre-wrap break-words text-sm mb-4 max-h-96 overflow-y-auto"
              >
                {customPrompt}
              </pre>

              <button
                onClick={handleCopy}
                data-testid="copy-button"
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>

              {copied && (
                <span
                  data-testid="copy-confirmation"
                  className="ml-3 text-green-600 font-medium"
                  role="status"
                  aria-live="polite"
                >
                  Copied!
                </span>
              )}
            </div>
          </section>
        )}

        {/* Tips Section */}
        <section className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Tips for Using This Tool
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>
              • You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
              <strong>&quot;I&apos;m not sure where I stand&quot;</strong> — the
              AI will explain more
            </li>
            <li>
              • Ask it to{" "}
              <strong>research candidates&apos; voting records</strong> and
              track records
            </li>
            <li>
              • Ask questions anytime: &quot;What does this position actually
              do?&quot; or &quot;Why does this matter?&quot;
            </li>
            <li>
              • <strong>AI can make mistakes.</strong> This is a research
              starting point — verify with official sources
            </li>
            <li>
              • Many states prohibit phones at polling places. Print or write
              down your final ballot choices
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-600 py-8 border-t border-gray-200">
          <p className="mb-2 font-medium">Share this tool with others</p>
          <p className="text-sm">
            Created by a human using AI tools · Everyone deserves to know what
            they&apos;re voting for
          </p>
        </footer>
      </main>
    </div>
  );
}

function DeadlineItem({
  label,
  deadline,
  note,
}: {
  label: string;
  deadline: string;
  note?: string;
}) {
  const { isPassed, daysRemaining, status } = getDeadlineStatus(deadline);

  const statusColors = {
    passed: "text-gray-500",
    urgent: "text-red-600",
    warning: "text-yellow-700",
    good: "text-green-700",
  };

  const statusText = isPassed
    ? "Passed"
    : daysRemaining === 0
      ? "Today"
      : daysRemaining === 1
        ? "1 day left"
        : `${daysRemaining} days left`;

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-700">
        {label}: {formatDate(deadline)}
        {note && <span className="text-gray-500 text-sm"> ({note})</span>}
      </span>
      <span className={`font-medium ${statusColors[status]}`}>
        {statusText}
      </span>
    </div>
  );
}
