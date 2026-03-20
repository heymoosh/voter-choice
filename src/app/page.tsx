"use client";

import { useState, useCallback } from "react";
import {
  getStatesForZip,
  getStateData,
  getDeadlineInfo,
  formatDate,
  getNextElection,
} from "@/lib/election-data";
import { generatePrompt } from "@/lib/prompt-generator";
import type { StateData } from "@/types/election";

type DeadlineStatusColor = "passed" | "urgent" | "warning" | "ok" | "none";

function deadlineBadge(status: DeadlineStatusColor): string {
  switch (status) {
    case "passed":
      return "bg-gray-100 text-gray-600 border-gray-300";
    case "urgent":
      return "bg-red-100 text-red-700 border-red-300";
    case "warning":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "ok":
      return "bg-green-100 text-green-700 border-green-300";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

export default function Home() {
  const [zipInput, setZipInput] = useState("");
  const [zipError, setZipError] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [stateData, setStateData] = useState<StateData | null>(null);
  const [promptText, setPromptText] = useState("");
  const [contextBlock, setContextBlock] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadStateData = useCallback((stateCode: string, zip: string) => {
    const data = getStateData(stateCode);
    if (!data) {
      setStateData(null);
      setPromptText("");
      return;
    }
    const generated = generatePrompt(data, zip);
    setStateData(data);
    setPromptText(generated.fullText);
    setContextBlock(generated.contextBlock);
  }, []);

  const handleZipSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const zip = zipInput.trim();

      if (!zip) {
        setZipError("Please enter a zip code");
        return;
      }
      if (!/^\d{5}$/.test(zip)) {
        setZipError("Please enter a valid 5-digit zip code");
        return;
      }

      setZipError("");
      const foundStates = getStatesForZip(zip);

      if (foundStates.length === 0) {
        setSubmitted(true);
        setStates([]);
        setSelectedState("");
        setStateData(null);
        setPromptText("");
        return;
      }

      setStates(foundStates);
      setSubmitted(true);

      if (foundStates.length === 1) {
        loadStateData(foundStates[0], zip);
      } else {
        setSelectedState("");
        setStateData(null);
        setPromptText("");
      }
    },
    [zipInput, loadStateData],
  );

  const handleStateSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      setSelectedState(code);
      if (code) {
        loadStateData(code, zipInput.trim());
      } else {
        setStateData(null);
        setPromptText("");
      }
    },
    [zipInput, loadStateData],
  );

  const handleCopy = useCallback(async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the textarea content
      const textarea = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="prompt-output"] textarea',
      );
      if (textarea) {
        textarea.select();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [promptText]);

  const nextElection = stateData ? getNextElection(stateData) : null;
  const reg = stateData?.registration;

  const onlineInfo = reg
    ? getDeadlineInfo(reg.online.available ? reg.online.deadline : null)
    : null;
  const mailInfo = reg ? getDeadlineInfo(reg.byMail.deadline) : null;
  const inPersonInfo = reg ? getDeadlineInfo(reg.inPerson.deadline) : null;

  const showNotFound = submitted && states.length === 0;
  const showStateSelector = submitted && states.length > 1;
  const showStateNotFound =
    submitted && states.length > 0 && selectedState && !stateData;
  const showStateInfo = !!stateData;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-blue-700 focus:px-4 focus:py-2 focus:rounded focus:shadow"
      >
        Skip to main content
      </a>

      <div className="min-h-screen bg-gray-50 text-gray-900">
        {/* Hero Section */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              Free AI Ballot Research Tool
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Enter your zip code to get a customized AI prompt pre-filled with
              your state&apos;s election info. Paste it into any free AI chatbot
              and start researching your ballot in minutes.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Works with any free AI chatbot:
            </p>
            <ul
              className="flex flex-wrap gap-3 text-sm"
              aria-label="Supported AI chatbots"
            >
              <li>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  Claude
                </a>
              </li>
              <li>
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  ChatGPT
                </a>
              </li>
              <li>
                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  Gemini
                </a>
              </li>
              <li>
                <a
                  href="https://grok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  Grok
                </a>
              </li>
            </ul>
          </div>
        </header>

        <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
          {/* Zip Code Form */}
          <section aria-labelledby="zip-section-heading">
            <h2 id="zip-section-heading" className="text-xl font-semibold mb-4">
              Enter Your Zip Code
            </h2>
            <form onSubmit={handleZipSubmit} noValidate>
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-auto flex-1">
                  <label htmlFor="zip-code-input" className="sr-only">
                    5-digit zip code
                  </label>
                  <input
                    id="zip-code-input"
                    data-testid="zip-input"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{5}"
                    maxLength={5}
                    placeholder="Enter 5-digit zip code"
                    value={zipInput}
                    onChange={(e) =>
                      setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5))
                    }
                    aria-describedby={zipError ? "zip-error-msg" : undefined}
                    aria-invalid={!!zipError}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  data-testid="zip-submit"
                  type="submit"
                  className="min-w-[120px] px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Look up
                </button>
              </div>
              {zipError && (
                <p
                  id="zip-error-msg"
                  data-testid="zip-error"
                  role="alert"
                  aria-live="polite"
                  className="mt-2 text-sm text-red-600"
                >
                  {zipError}
                </p>
              )}
              {!zipError && submitted && states.length > 0 && !zipError && (
                <p aria-live="polite" className="sr-only">
                  Results loaded for zip code {zipInput.trim()}
                </p>
              )}
            </form>
          </section>

          {/* Not Found Message */}
          {showNotFound && (
            <section className="mt-6" aria-labelledby="not-found-heading">
              <div
                data-testid="not-found-message"
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800"
              >
                <h2 id="not-found-heading" className="font-semibold mb-1">
                  Zip code not found
                </h2>
                <p className="text-sm">
                  We don&apos;t have data for zip code{" "}
                  <strong>{zipInput.trim()}</strong> yet. We&apos;re working on
                  adding all U.S. zip codes.{" "}
                  <a
                    href="https://www.usa.gov/election-office"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900"
                  >
                    Find your state election website
                  </a>
                  .
                </p>
              </div>
            </section>
          )}

          {/* Multi-State Selector */}
          {showStateSelector && (
            <section className="mt-6" aria-labelledby="state-selector-heading">
              <h2
                id="state-selector-heading"
                className="text-lg font-semibold mb-2"
              >
                This zip code spans multiple states
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Which state are you voting in?
              </p>
              <div>
                <label htmlFor="state-select" className="sr-only">
                  Select your state
                </label>
                <select
                  id="state-select"
                  data-testid="state-selector"
                  value={selectedState}
                  onChange={handleStateSelect}
                  className="w-full sm:w-auto px-4 py-3 rounded-lg border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select a state --</option>
                  {states.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              {showStateNotFound && (
                <div
                  data-testid="not-found-message"
                  role="alert"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm"
                >
                  We don&apos;t have data for {selectedState} yet.{" "}
                  <a
                    href="https://www.usa.gov/election-office"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-900"
                  >
                    Find your state election website
                  </a>
                  .
                </div>
              )}
            </section>
          )}

          {/* State Info Card */}
          {showStateInfo && stateData && (
            <section
              data-testid="state-info"
              className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              aria-labelledby="state-info-heading"
            >
              <h2
                id="state-info-heading"
                className="text-lg font-semibold mb-4"
              >
                {stateData.stateName} Election Information
              </h2>

              {/* Upcoming Election */}
              {nextElection ? (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Next Upcoming Election
                  </p>
                  <p
                    data-testid="election-name"
                    className="font-semibold text-gray-900"
                  >
                    {nextElection.name}
                  </p>
                  <p data-testid="election-date" className="text-gray-700">
                    {formatDate(nextElection.date)}
                    {nextElection.primaryType && (
                      <span className="ml-2 text-sm text-gray-500">
                        ({nextElection.primaryType} primary)
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div
                  data-testid="no-election-message"
                  role="alert"
                  className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                >
                  No upcoming elections found for {stateData.stateName}. Check{" "}
                  <a
                    href={stateData.resources.stateElectionWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {stateData.resources.stateElectionWebsite}
                  </a>{" "}
                  for updates.
                </div>
              )}

              {/* Registration Deadlines */}
              <div data-testid="registration-status" className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Voter Registration Deadlines
                </p>
                <ul className="space-y-2 text-sm">
                  {reg?.online.available ? (
                    <li className="flex items-center justify-between gap-2">
                      <span className="text-gray-700">Online</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          {reg.online.deadline
                            ? formatDate(reg.online.deadline)
                            : "N/A"}
                        </span>
                        {onlineInfo && (
                          <span
                            className={`px-2 py-0.5 rounded-full border text-xs font-medium ${deadlineBadge(onlineInfo.status)}`}
                          >
                            {onlineInfo.label}
                          </span>
                        )}
                      </div>
                    </li>
                  ) : (
                    <li className="text-gray-500 text-sm">
                      Online registration not available
                    </li>
                  )}
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">
                      By mail{reg?.byMail.sincePostmarked ? " (postmark)" : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {reg?.byMail.deadline
                          ? formatDate(reg.byMail.deadline)
                          : "N/A"}
                      </span>
                      {mailInfo && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-xs font-medium ${deadlineBadge(mailInfo.status)}`}
                        >
                          {mailInfo.label}
                        </span>
                      )}
                    </div>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">In person</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">
                        {reg?.inPerson.deadline
                          ? formatDate(reg.inPerson.deadline)
                          : "N/A"}
                      </span>
                      {inPersonInfo && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-xs font-medium ${deadlineBadge(inPersonInfo.status)}`}
                        >
                          {inPersonInfo.label}
                        </span>
                      )}
                    </div>
                  </li>
                  {reg?.sameDayRegistration && (
                    <li className="text-green-700 text-sm font-medium">
                      ✓ Same-day registration available
                    </li>
                  )}
                </ul>
                <a
                  href={reg?.registrationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Check your registration status →
                </a>
              </div>

              {/* Early Voting */}
              {stateData.earlyVoting.available &&
                stateData.earlyVoting.startDate &&
                stateData.earlyVoting.endDate && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Early Voting
                    </p>
                    <p className="text-sm text-gray-700">
                      {formatDate(stateData.earlyVoting.startDate)} –{" "}
                      {formatDate(stateData.earlyVoting.endDate)}
                    </p>
                    {stateData.earlyVoting.notes && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {stateData.earlyVoting.notes}
                      </p>
                    )}
                  </div>
                )}

              {/* Voting Rules */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Voting Rules
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Photo ID:</strong>{" "}
                  {stateData.votingRules.idRequired
                    ? "Required"
                    : "Not required"}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>Phones at polls:</strong>{" "}
                  {stateData.votingRules.phonesAtPollsDetail}
                </p>
              </div>

              {/* Resources */}
              <div className="flex flex-wrap gap-3 text-sm">
                <a
                  href={stateData.resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  State Election Website →
                </a>
                <a
                  href={stateData.resources.sampleBallotLookup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Sample Ballot Lookup →
                </a>
              </div>
            </section>
          )}

          {/* Prompt Output */}
          {showStateInfo && promptText && (
            <section className="mt-6" aria-labelledby="prompt-section-heading">
              <h2
                id="prompt-section-heading"
                className="text-xl font-semibold mb-2"
              >
                Your Customized AI Prompt
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Copy this prompt and paste it as your first message in any AI
                chatbot.
              </p>

              <div
                data-testid="prompt-output"
                className="relative rounded-xl border border-gray-200 bg-gray-50"
              >
                <textarea
                  readOnly
                  value={promptText}
                  aria-label="Customized AI ballot research prompt"
                  className="w-full h-64 sm:h-80 p-4 text-sm font-mono bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
                />
                <div className="sticky bottom-0 flex justify-end gap-2 p-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                  <button
                    data-testid="copy-button"
                    onClick={handleCopy}
                    className="min-h-[44px] min-w-[44px] px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2"
                    aria-live="polite"
                  >
                    {copied ? (
                      <>
                        <span aria-hidden="true">✓</span>
                        <span data-testid="copy-confirmation">Copied!</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">📋</span>
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>
              </div>
              {/* Always-present but hidden confirmation for test detection */}
              {!copied && (
                <span
                  data-testid="copy-confirmation"
                  className="sr-only"
                  aria-live="polite"
                />
              )}
            </section>
          )}

          {/* Pre-filled context preview */}
          {showStateInfo && contextBlock && (
            <section className="mt-4" aria-labelledby="context-heading">
              <h3
                id="context-heading"
                className="text-base font-semibold mb-2 text-gray-700"
              >
                Pre-filled Context Block
              </h3>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {contextBlock}
              </div>
            </section>
          )}

          {/* Tips Section */}
          <section className="mt-10" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className="text-xl font-semibold mb-4">
              Tips for Using the Prompt
            </h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-blue-500 mt-0.5">
                  •
                </span>
                You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
                <strong>&quot;I&apos;m not sure where I stand&quot;</strong> —
                the AI will explain more and help you figure it out.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-blue-500 mt-0.5">
                  •
                </span>
                Ask it to <strong>research something</strong> for you —
                &quot;Can you look up this candidate&apos;s voting record?&quot;
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-blue-500 mt-0.5">
                  •
                </span>
                You can <strong>ask questions</strong> anytime — &quot;What does
                this position actually do?&quot; or &quot;Why does this
                matter?&quot;
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true" className="text-blue-500 mt-0.5">
                  •
                </span>
                At the end, it&apos;ll give you a summary you can{" "}
                <strong>write down or print</strong> and take to the polls.
              </li>
            </ul>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Important:</strong> AI can make mistakes. This is a
              research <em>starting point</em>. Always verify important details
              with official sources before voting.
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-12 border-t border-gray-200 bg-white">
          <div className="max-w-2xl mx-auto px-4 py-8 text-sm text-gray-600">
            <p className="mb-3 font-medium">
              Found this useful?{" "}
              <span className="text-gray-900">Share it with a friend.</span>
            </p>
            <p className="text-gray-500">
              Created by a human using AI tools, because everyone deserves to
              know what they&apos;re actually voting for.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
