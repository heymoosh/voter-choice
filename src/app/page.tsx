"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildFullPrompt } from "@/lib/promptBuilder";
import { getStateCodesForZip, getStateData } from "@/lib/stateRegistry";
import {
  getDeadlineInfo,
  formatDate,
  getNextElection,
} from "@/lib/deadlineUtils";
import type { StateData } from "@/types/state";
import type { DeadlineStatus } from "@/lib/deadlineUtils";

const ZIP_PATTERN = /^\d{5}$/;

function DeadlineBadge({
  status,
  label,
}: {
  status: DeadlineStatus;
  label: string;
}) {
  const colorMap: Record<DeadlineStatus, string> = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    passed: "bg-gray-100 text-gray-600 border-gray-300",
    unavailable: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${colorMap[status]}`}
      aria-label={label}
    >
      {label}
    </span>
  );
}

function RegistrationRow({
  method,
  deadline,
  extra,
}: {
  method: string;
  deadline: string | null | undefined;
  extra?: string;
}) {
  const today = new Date();
  const info = getDeadlineInfo(deadline, today);
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-sm text-gray-700 font-medium min-w-0">
        {method}
        {info.date && (
          <span className="ml-1 text-gray-500 font-normal">
            — {formatDate(info.date)}
            {extra ? ` (${extra})` : ""}
          </span>
        )}
      </span>
      <DeadlineBadge status={info.status} label={info.label} />
    </div>
  );
}

function StateInfoCard({ stateData }: { stateData: StateData }) {
  const today = new Date();
  const nextElection = getNextElection(stateData.elections, today);
  const reg = stateData.registration;
  const ev = stateData.earlyVoting;
  const vr = stateData.votingRules;
  const res = stateData.resources;

  return (
    <div
      data-testid="state-info"
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          {stateData.stateName}
        </h2>
        {nextElection ? (
          <div className="mt-2 space-y-1">
            <p
              data-testid="election-name"
              className="text-base font-medium text-blue-700"
            >
              {nextElection.name}
            </p>
            <p data-testid="election-date" className="text-sm text-gray-600">
              {formatDate(nextElection.date)}
              {nextElection.primaryType && (
                <span className="ml-2 text-gray-500">
                  ({nextElection.primaryType} primary)
                </span>
              )}
            </p>
          </div>
        ) : (
          <p
            data-testid="no-election-message"
            className="mt-2 text-sm text-amber-700 bg-amber-50 rounded p-2"
          >
            No upcoming elections found for {stateData.stateName}. Check{" "}
            <a
              href={res.stateElectionWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {res.stateElectionWebsite}
            </a>{" "}
            for updates.
          </p>
        )}
      </div>

      <section aria-labelledby="reg-heading">
        <h3
          id="reg-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Registration Deadlines
        </h3>
        <div data-testid="registration-status" className="space-y-1">
          {reg.online.available && (
            <RegistrationRow method="Online" deadline={reg.online.deadline} />
          )}
          <RegistrationRow
            method="By Mail"
            deadline={reg.byMail.deadline}
            extra={reg.byMail.sincePostmarked ? "postmark" : "received"}
          />
          <RegistrationRow
            method="In Person"
            deadline={reg.inPerson.deadline}
          />
          {reg.sameDayRegistration && (
            <p className="text-xs text-green-700 font-medium mt-1">
              Same-day registration available
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="ev-heading">
        <h3
          id="ev-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Early Voting
        </h3>
        {ev.available && ev.startDate && ev.endDate ? (
          <p className="text-sm text-gray-700">
            {formatDate(ev.startDate)} – {formatDate(ev.endDate)}
            {ev.notes && <span className="text-gray-500"> · {ev.notes}</span>}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {ev.notes ?? "Not available — absentee voting only"}
          </p>
        )}
      </section>

      <section aria-labelledby="rules-heading">
        <h3
          id="rules-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Voting Rules
        </h3>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-medium">Voter ID: </span>
            {vr.idRequired ? (
              <span>
                Required · {vr.acceptedIds.slice(0, 2).join(", ")}
                {vr.acceptedIds.length > 2 ? ", and more" : ""}
              </span>
            ) : (
              <span>Not required</span>
            )}
          </p>
          <p>
            <span className="font-medium">Phones at polls: </span>
            <span className="capitalize">{vr.phonesAtPolls}</span>
          </p>
        </div>
      </section>

      <section aria-labelledby="links-heading">
        <h3
          id="links-heading"
          className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2"
        >
          Helpful Links
        </h3>
        <div className="space-y-1 text-sm">
          <a
            href={res.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            State Election Website
          </a>
          <a
            href={res.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Sample Ballot Lookup
          </a>
          <a
            href={res.countyElectionLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline focus:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            County Election Office
          </a>
        </div>
      </section>
    </div>
  );
}

function PromptOutputCard({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Fallback: select text
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      data-testid="prompt-output"
      className="bg-gray-50 rounded-xl border border-gray-200 p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Your Customized Prompt
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Copy this prompt and paste it as your first message in any AI
            chatbot.
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            aria-label={
              copied ? "Copied to clipboard" : "Copy prompt to clipboard"
            }
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] min-w-[44px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 transition-colors"
          >
            {copied ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span data-testid="copy-confirmation">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>

      <div
        role="region"
        aria-label="Customized ballot research prompt"
        className="bg-white border border-gray-200 rounded-lg p-4 max-h-80 overflow-y-auto"
      >
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
          {prompt}
        </pre>
      </div>

      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded p-3">
        <strong>Supported chatbots:</strong>{" "}
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Claude
        </a>
        ,{" "}
        <a
          href="https://chatgpt.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          ChatGPT
        </a>
        ,{" "}
        <a
          href="https://gemini.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Gemini
        </a>
        ,{" "}
        <a
          href="https://grok.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Grok
        </a>
      </div>
    </div>
  );
}

type AppState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "multi-state"; states: string[] }
  | { kind: "result"; stateCode: string; stateData: StateData; prompt: string };

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ kind: "idle" });
  const [selectedState, setSelectedState] = useState<string>("");
  const [validationError, setValidationError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const handleZipChange = useCallback(() => {
    if (validationError) setValidationError("");
  }, [validationError]);

  const processZip = useCallback((_zip?: string, stateOverride?: string) => {
    // Always read directly from DOM — supports both React state and Playwright fill()
    const rawValue = zipInputRef.current?.value ?? "";

    if (!rawValue) {
      setValidationError("Please enter a zip code");
      return;
    }
    if (/\D/.test(rawValue)) {
      setValidationError("Please enter a valid 5-digit zip code");
      return;
    }
    if (!ZIP_PATTERN.test(rawValue)) {
      setValidationError("Please enter a valid 5-digit zip code");
      return;
    }
    const zip5 = rawValue;

    setValidationError("");
    setAppState({ kind: "loading" });

    setTimeout(() => {
      const stateCodes = getStateCodesForZip(zip5);

      if (!stateCodes) {
        setAppState({ kind: "not-found" });
        return;
      }

      const code =
        stateOverride ?? (stateCodes.length === 1 ? stateCodes[0] : null);

      if (!code && stateCodes.length > 1) {
        setAppState({ kind: "multi-state", states: stateCodes });
        return;
      }

      const stateData = code ? getStateData(code) : null;

      if (!stateData || !code) {
        setAppState({ kind: "not-found" });
        return;
      }

      const prompt = buildFullPrompt(stateData, zip5);
      setAppState({ kind: "result", stateCode: code, stateData, prompt });
    }, 200);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      processZip();
    },
    [processZip],
  );

  const handleStateSelect = useCallback(
    (stateCode: string) => {
      setSelectedState(stateCode);
      processZip(undefined, stateCode);
    },
    [processZip],
  );

  useEffect(() => {
    if (appState.kind === "result" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [appState]);

  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
            Free civic tool
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
            Know What You&apos;re Voting For
          </h1>
        </div>
      </header>

      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8"
      >
        <section
          aria-labelledby="hero-heading"
          className="text-center sm:text-left"
        >
          <h2 id="hero-heading" className="text-xl font-semibold text-gray-900">
            Research your ballot in minutes with AI
          </h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Enter your zip code to get a customized research prompt. Paste it
            into any free AI chatbot — Claude, ChatGPT, Gemini, or Grok — and it
            will walk you through every race and issue on your ballot, based on
            what candidates have actually done.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            No accounts. No data stored. Your zip code never leaves your
            browser.
          </p>
        </section>

        <section
          aria-labelledby="zip-heading"
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
        >
          <h2
            id="zip-heading"
            className="text-base font-semibold text-gray-900 mb-4"
          >
            Enter your zip code
          </h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="zip-code-input" className="sr-only">
                  ZIP code
                </label>
                <input
                  id="zip-code-input"
                  ref={zipInputRef}
                  data-testid="zip-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  maxLength={9}
                  placeholder="e.g. 73301"
                  onChange={handleZipChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      processZip();
                    }
                  }}
                  aria-describedby={
                    validationError ? "zip-error-msg" : undefined
                  }
                  aria-invalid={!!validationError}
                  className={`w-full px-4 py-3 min-h-[44px] text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationError
                      ? "border-red-400 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                />
              </div>
              <button
                data-testid="zip-submit"
                type="submit"
                disabled={appState.kind === "loading"}
                className="px-6 py-3 min-h-[44px] min-w-[44px] bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {appState.kind === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
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
                    Looking up...
                  </span>
                ) : (
                  "Get My Prompt"
                )}
              </button>
            </div>

            {validationError && (
              <p
                id="zip-error-msg"
                data-testid="zip-error"
                role="alert"
                aria-live="polite"
                className="mt-2 text-sm text-red-600"
              >
                {validationError}
              </p>
            )}
          </form>
        </section>

        {appState.kind === "multi-state" && (
          <section
            aria-labelledby="state-select-heading"
            className="bg-white rounded-xl border border-amber-200 shadow-sm p-6"
          >
            <h2
              id="state-select-heading"
              className="text-base font-semibold text-gray-900 mb-2"
            >
              This zip code spans multiple states
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Which state are you voting in?
            </p>
            <div data-testid="state-selector" className="flex flex-wrap gap-3">
              {appState.states.map((code) => (
                <button
                  key={code}
                  onClick={() => handleStateSelect(code)}
                  aria-pressed={selectedState === code}
                  className={`px-6 py-3 min-h-[44px] text-sm font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                    selectedState === code
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </section>
        )}

        {appState.kind === "not-found" && (
          <div
            data-testid="not-found-message"
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-xl p-6"
          >
            <h2 className="text-base font-semibold text-amber-800 mb-1">
              Zip code not found
            </h2>
            <p className="text-sm text-amber-700">
              We don&apos;t have data for this zip code yet. We&apos;re working
              on adding all U.S. zip codes.{" "}
              <a
                href="https://www.usa.gov/election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                Find your state election website
              </a>
              .
            </p>
          </div>
        )}

        {appState.kind === "result" && (
          <div ref={resultRef} className="space-y-6">
            <StateInfoCard stateData={appState.stateData} />
            <PromptOutputCard prompt={appState.prompt} />
          </div>
        )}

        <section
          aria-labelledby="tips-heading"
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-3"
        >
          <h2
            id="tips-heading"
            className="text-base font-semibold text-gray-900"
          >
            Tips for using the prompt
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>
              You can say <strong>&quot;I don&apos;t know&quot;</strong> or{" "}
              <strong>&quot;I&apos;m not sure&quot;</strong> — the AI will
              explain more and help you figure it out.
            </li>
            <li>
              You can ask it to <strong>research something</strong> for you:
              &quot;Can you look up this candidate&apos;s voting record?&quot;
            </li>
            <li>
              You can <strong>ask questions</strong> anytime: &quot;What does
              this position actually do?&quot; or &quot;Why does this
              matter?&quot;
            </li>
            <li>
              At the end, it&apos;ll give you a{" "}
              <strong>printable summary</strong> to take to the polls.
            </li>
            <li className="text-amber-700">
              <strong>AI can make mistakes.</strong> This is a research starting
              point. Verify important facts with official sources.
            </li>
          </ul>
        </section>

        <footer className="text-center py-6 border-t border-gray-200 space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Share this tool</strong> with friends and family — it works
            for any state and any election.
          </p>
          <p className="text-xs text-gray-400">
            Created by a human using AI tools · No data stored ·{" "}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              View source
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
