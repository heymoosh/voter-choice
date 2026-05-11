"use client";

import { useState, useCallback, useRef } from "react";
import type { StateData, Election, DeadlineInfo } from "@/lib/types";
import { getStatesForZip, getStateData } from "@/lib/stateData";
import { calcDeadline, findNextElection, formatDate } from "@/lib/deadlines";
import { buildFullPrompt } from "@/lib/promptBuilder";

// ---------------------------------------------------------------------------
// App state machine
// ---------------------------------------------------------------------------

type AppState =
  | { stage: "idle" }
  | { stage: "state-select"; zip: string; stateCodes: string[] }
  | {
      stage: "result";
      zip: string;
      stateCode: string;
      stateData: StateData;
      election: Election | null;
    }
  | { stage: "not-found"; zip: string }
  | { stage: "error"; zip: string; message: string };

// ---------------------------------------------------------------------------
// Deadline badge
// ---------------------------------------------------------------------------

function DeadlineBadge({ info }: { info: DeadlineInfo }) {
  const colorMap = {
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    red: "bg-red-100 text-red-800 border-red-200",
    passed: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${colorMap[info.status]}`}
    >
      {info.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Registration status section
// ---------------------------------------------------------------------------

function RegistrationStatus({ stateData }: { stateData: StateData }) {
  const reg = stateData.registration;
  const online =
    reg.online.available && reg.online.deadline
      ? calcDeadline(reg.online.deadline)
      : null;
  const byMail = calcDeadline(reg.byMail.deadline);
  const inPerson = calcDeadline(reg.inPerson.deadline);

  return (
    <div data-testid="registration-status" className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Registration Deadlines
      </h3>
      <ul className="space-y-1.5 text-sm">
        {reg.online.available && online ? (
          <li className="flex items-center justify-between">
            <span className="text-gray-600">Online</span>
            <span className="flex items-center gap-2">
              <span className="text-gray-800">
                {formatDate(reg.online.deadline!)}
              </span>
              <DeadlineBadge info={online} />
            </span>
          </li>
        ) : (
          <li className="flex items-center justify-between">
            <span className="text-gray-600">Online</span>
            <span className="text-gray-400 text-xs">Not available</span>
          </li>
        )}
        <li className="flex items-center justify-between">
          <span className="text-gray-600">
            By mail{reg.byMail.sincePostmarked ? " (postmark)" : " (received)"}
          </span>
          <span className="flex items-center gap-2">
            <span className="text-gray-800">
              {formatDate(reg.byMail.deadline)}
            </span>
            <DeadlineBadge info={byMail} />
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-gray-600">In person</span>
          <span className="flex items-center gap-2">
            <span className="text-gray-800">
              {formatDate(reg.inPerson.deadline)}
            </span>
            <DeadlineBadge info={inPerson} />
          </span>
        </li>
        {reg.sameDayRegistration && (
          <li className="text-green-700 text-xs font-medium mt-1">
            Same-day registration available
          </li>
        )}
      </ul>
      {byMail.status === "passed" &&
        online?.status === "passed" &&
        inPerson.status === "passed" && (
          <p className="text-sm text-amber-800 bg-amber-50 rounded p-2 mt-2">
            Registration deadlines for this election have passed.{" "}
            <a
              href={reg.registrationCheckUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Check your registration status
            </a>
          </p>
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// State info card
// ---------------------------------------------------------------------------

function StateInfoCard({
  stateData,
  election,
}: {
  stateData: StateData;
  election: Election | null;
}) {
  const ev = stateData.earlyVoting;
  const rules = stateData.votingRules;
  const res = stateData.resources;

  return (
    <div
      data-testid="state-info"
      className="bg-white rounded-xl border border-gray-200 p-6 space-y-5"
      aria-label={`Election information for ${stateData.stateName}`}
    >
      <h2 className="text-xl font-bold text-gray-900">{stateData.stateName}</h2>

      {election ? (
        <div className="space-y-1">
          <p
            data-testid="election-name"
            className="text-base font-semibold text-gray-800"
          >
            {election.name}
          </p>
          <p data-testid="election-date" className="text-sm text-gray-600">
            {formatDate(election.date)}
            {election.primaryType && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                {election.primaryType} primary
              </span>
            )}
          </p>
        </div>
      ) : (
        <p data-testid="no-election-message" className="text-sm text-gray-500">
          No upcoming election found.{" "}
          <a
            href={res.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Check {stateData.stateName}&apos;s election website
          </a>{" "}
          for updates.
        </p>
      )}

      <RegistrationStatus stateData={stateData} />

      {/* Early Voting */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Early Voting
        </h3>
        {ev.available && ev.startDate && ev.endDate ? (
          <p className="text-sm text-gray-700">
            {formatDate(ev.startDate)} – {formatDate(ev.endDate)}
            {ev.notes && (
              <span className="block text-xs text-gray-500 mt-0.5">
                {ev.notes}
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Not available — absentee voting only
            {ev.notes && (
              <span className="block text-xs text-gray-400 mt-0.5">
                {ev.notes}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Voter ID */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Voter ID</h3>
        {rules.idRequired ? (
          <div>
            <p className="text-sm text-gray-700">Photo ID required</p>
            <ul className="mt-1 text-xs text-gray-500 list-disc list-inside space-y-0.5">
              {rules.acceptedIds.slice(0, 3).map((id) => (
                <li key={id}>{id}</li>
              ))}
              {rules.acceptedIds.length > 3 && (
                <li>and {rules.acceptedIds.length - 3} more</li>
              )}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-700">Not required</p>
        )}
      </div>

      {/* Phones at polls */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-1">
          Phones at Polls
        </h3>
        <p className="text-sm text-gray-600">{rules.phonesAtPollsDetail}</p>
      </div>

      {/* Resources */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Resources</h3>
        <ul className="space-y-1 text-sm">
          <li>
            <a
              href={res.stateElectionWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              State election website
            </a>
          </li>
          <li>
            <a
              href={res.countyElectionLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              County election office
            </a>
          </li>
          <li>
            <a
              href={res.sampleBallotLookup}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Sample ballot lookup
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prompt output
// ---------------------------------------------------------------------------

function PromptOutput({
  stateData,
  zip,
  election,
}: {
  stateData: StateData;
  zip: string;
  election: Election | null;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const fullPrompt = buildFullPrompt(stateData, zip, election);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setCopyFallback(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — show fallback
      setCopyFallback(true);
      if (textRef.current) {
        textRef.current.select();
      }
    }
  }, [fullPrompt]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Your Customized Prompt
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Copy this prompt and paste it as your first message in any AI
            chatbot
          </p>
        </div>
        <button
          data-testid="copy-button"
          onClick={handleCopy}
          aria-label="Copy prompt to clipboard"
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {copied ? (
            <span
              data-testid="copy-confirmation"
              className="flex items-center gap-1"
            >
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
              Copied!
            </span>
          ) : (
            "Copy to Clipboard"
          )}
        </button>
      </div>

      {copyFallback && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded p-2">
          Press Ctrl+C / Cmd+C to copy the selected text below.
        </p>
      )}

      <div
        data-testid="prompt-output"
        aria-label="Customized ballot research prompt"
        className="relative"
      >
        <textarea
          ref={textRef}
          readOnly
          value={fullPrompt}
          aria-label="Full ballot research prompt text"
          className="w-full h-64 p-4 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BallotTool component
// ---------------------------------------------------------------------------

export default function BallotTool() {
  const [zipInput, setZipInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });
  const [isLoading, setIsLoading] = useState(false);

  const validateZip = (value: string): string | null => {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d+$/.test(value)) return "Please enter a valid 5-digit zip code";
    if (value.length !== 5) return "Please enter a valid 5-digit zip code";
    return null;
  };

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const zip = zipInput.trim();
      const error = validateZip(zip);
      if (error) {
        setInputError(error);
        return;
      }
      setInputError(null);
      setIsLoading(true);

      // Simulate brief loading (static data is instant)
      setTimeout(() => {
        const stateCodes = getStatesForZip(zip);
        if (stateCodes.length === 0) {
          setAppState({ stage: "not-found", zip });
        } else if (stateCodes.length > 1) {
          setAppState({ stage: "state-select", zip, stateCodes });
        } else {
          const stateData = getStateData(stateCodes[0]);
          if (!stateData) {
            setAppState({ stage: "not-found", zip });
          } else {
            const election = findNextElection(stateData.elections);
            setAppState({
              stage: "result",
              zip,
              stateCode: stateCodes[0],
              stateData,
              election,
            });
          }
        }
        setIsLoading(false);
      }, 200);
    },
    [zipInput],
  );

  const handleStateSelect = useCallback(
    (stateCode: string) => {
      if (appState.stage !== "state-select") return;
      const stateData = getStateData(stateCode);
      if (!stateData) {
        setAppState({ stage: "not-found", zip: appState.zip });
        return;
      }
      const election = findNextElection(stateData.elections);
      setAppState({
        stage: "result",
        zip: appState.zip,
        stateCode,
        stateData,
        election,
      });
    },
    [appState],
  );

  return (
    <div className="space-y-6">
      {/* Zip Code Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        aria-label="Zip code lookup"
      >
        <div>
          <label
            htmlFor="zip-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter your zip code
          </label>
          <div className="flex gap-3">
            <input
              id="zip-input"
              data-testid="zip-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={zipInput}
              onChange={(e) => {
                setZipInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="e.g. 78701"
              aria-describedby={inputError ? "zip-error" : undefined}
              aria-invalid={!!inputError}
              className="flex-1 min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              data-testid="zip-submit"
              disabled={isLoading}
              aria-label="Look up election information"
              className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
            >
              {isLoading ? "Loading…" : "Look Up"}
            </button>
          </div>
          {inputError && (
            <p
              id="zip-error"
              data-testid="zip-error"
              role="alert"
              aria-live="polite"
              className="mt-2 text-sm text-red-600"
            >
              {inputError}
            </p>
          )}
        </div>
      </form>

      {/* State selector for multi-state zip codes */}
      {appState.stage === "state-select" && (
        <div
          data-testid="state-selector"
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-3"
          role="group"
          aria-labelledby="state-select-heading"
        >
          <p
            id="state-select-heading"
            className="text-sm font-semibold text-gray-700"
          >
            This zip code spans multiple states. Which state are you voting in?
          </p>
          <div className="flex flex-wrap gap-3">
            {appState.stateCodes.map((code) => (
              <button
                key={code}
                onClick={() => handleStateSelect(code)}
                className="min-h-[44px] px-5 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Not found message */}
      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          role="alert"
          aria-live="polite"
          className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800"
        >
          <p className="font-semibold mb-1">Zip code not found</p>
          <p>
            We don&apos;t have data for zip code <strong>{appState.zip}</strong>{" "}
            yet. We&apos;re working on adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/state-election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-900"
            >
              Find your state election office
            </a>
          </p>
        </div>
      )}

      {/* Results */}
      {appState.stage === "result" && (
        <>
          <StateInfoCard
            stateData={appState.stateData}
            election={appState.election}
          />
          <PromptOutput
            stateData={appState.stateData}
            zip={appState.zip}
            election={appState.election}
          />
        </>
      )}
    </div>
  );
}
