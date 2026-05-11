"use client";

import { useState, useCallback, useRef } from "react";
import type { StateData, Election } from "@/lib/types";
import { getStatesForZip, getStateData } from "@/lib/stateData";
import { calcDeadline, findNextElection, formatDate } from "@/lib/deadlines";
import { buildFullPrompt } from "@/lib/promptBuilder";

// --- Types ---

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
  | { stage: "not-found"; zip: string };

// --- Deadline badge ---

function DeadlineBadge({
  label,
  status,
  date,
}: {
  label: string;
  status: string;
  date: string | null;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    passed: "bg-gray-100 text-gray-500 border-gray-300",
    "not-available": "bg-gray-100 text-gray-500 border-gray-300",
  };
  const cls = colorMap[status] ?? colorMap.passed;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}
    >
      {date ? formatDate(date) : "N/A"} — {label}
    </span>
  );
}

// --- Registration Deadlines sub-component ---

function RegistrationDeadlines({
  registration,
}: {
  registration: StateData["registration"];
}) {
  const onlineDeadline = calcDeadline(
    registration.online.available ? registration.online.deadline : null,
  );
  const mailDeadline = calcDeadline(registration.byMail.deadline);
  const inPersonDeadline = calcDeadline(registration.inPerson.deadline);

  return (
    <div>
      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
        Registration Deadlines
      </p>
      <div data-testid="registration-status" className="space-y-2">
        {registration.online.available ? (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-gray-700">Online</span>
            <DeadlineBadge
              label={onlineDeadline.label}
              status={onlineDeadline.status}
              date={onlineDeadline.date}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Online registration not available
          </p>
        )}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm text-gray-700">By Mail</span>
          <DeadlineBadge
            label={mailDeadline.label}
            status={mailDeadline.status}
            date={mailDeadline.date}
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm text-gray-700">In Person</span>
          <DeadlineBadge
            label={inPersonDeadline.label}
            status={inPersonDeadline.status}
            date={inPersonDeadline.date}
          />
        </div>
        {registration.sameDayRegistration && (
          <p className="text-sm text-green-700 font-medium">
            ✓ Same-day registration available
          </p>
        )}
      </div>
    </div>
  );
}

// --- State Info Card ---

function StateInfoCard({
  stateData,
  election,
}: {
  stateData: StateData;
  election: Election | null;
}) {
  const { stateName, earlyVoting, votingRules, resources, registration } =
    stateData;

  return (
    <div
      data-testid="state-info"
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          🗳️
        </span>
        <h2 className="text-xl font-bold text-gray-900">{stateName}</h2>
      </div>

      {/* Election */}
      {election ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Next Election
          </p>
          <p
            data-testid="election-name"
            className="text-lg font-semibold text-gray-900"
          >
            {election.name}
          </p>
          <p data-testid="election-date" className="text-gray-700">
            {formatDate(election.date)}
          </p>
          <p className="text-sm text-gray-500 capitalize">
            Type: {election.type}
            {election.primaryType ? ` (${election.primaryType})` : ""}
          </p>
        </div>
      ) : (
        <div data-testid="no-election-message" className="text-gray-600">
          No upcoming elections found for {stateName}. Check{" "}
          <a
            href={resources.stateElectionWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            the state election website
          </a>{" "}
          for updates.
        </div>
      )}

      <RegistrationDeadlines registration={registration} />

      {/* Early voting */}
      <div>
        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Early Voting
        </p>
        {earlyVoting.available &&
        earlyVoting.startDate &&
        earlyVoting.endDate ? (
          <p className="text-sm text-gray-700">
            {formatDate(earlyVoting.startDate)} –{" "}
            {formatDate(earlyVoting.endDate)}
            {earlyVoting.notes ? (
              <span className="text-gray-500"> ({earlyVoting.notes})</span>
            ) : null}
          </p>
        ) : (
          <p className="text-sm text-gray-500">{earlyVoting.notes}</p>
        )}
      </div>

      {/* Voting rules */}
      <div>
        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Voter ID
        </p>
        <p className="text-sm text-gray-700">
          {votingRules.idRequired ? "Required" : "Not required"}
        </p>
      </div>

      {/* Resources */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        <a
          href={resources.sampleBallotLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          Sample Ballot Lookup →
        </a>
        <a
          href={resources.countyElectionLookup}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          County Election Office →
        </a>
        <a
          href={resources.stateElectionWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          State Election Website →
        </a>
      </div>
    </div>
  );
}

// --- Prompt Output ---

function PromptOutput({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text
      if (textRef.current) {
        textRef.current.select();
      }
    }
  }, [prompt]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Your Customized Ballot Research Prompt
          </h2>
          <p className="text-sm text-gray-600">
            Copy this prompt and paste it as your first message in any AI
            chatbot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="copy-button"
            onClick={handleCopy}
            className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label="Copy prompt to clipboard"
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          {copied && (
            <span
              data-testid="copy-confirmation"
              className="text-green-600 font-medium text-sm flex items-center gap-1"
              aria-live="polite"
            >
              ✓ Copied!
            </span>
          )}
        </div>
      </div>

      <div
        data-testid="prompt-output"
        className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
        role="region"
        aria-label="Ballot research prompt"
      >
        <textarea
          ref={textRef}
          readOnly
          value={prompt}
          className="w-full min-h-[300px] max-h-[500px] p-4 bg-transparent font-mono text-sm text-gray-800 resize-none overflow-auto focus:outline-none"
          aria-label="Customized ballot research prompt text"
        />
      </div>
    </div>
  );
}

// --- Main BallotTool component ---

export default function BallotTool() {
  const [zipInput, setZipInput] = useState("");
  const [error, setError] = useState("");
  const [appState, setAppState] = useState<AppState>({ stage: "idle" });

  const validate = (value: string): string | null => {
    if (!value.trim()) return "Please enter a zip code";
    if (!/^\d+$/.test(value)) return "Please enter a valid 5-digit zip code";
    if (value.length !== 5) return "Please enter a valid 5-digit zip code";
    return null;
  };

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const validationError = validate(zipInput);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError("");

      const stateCodes = getStatesForZip(zipInput);
      if (!stateCodes) {
        setAppState({ stage: "not-found", zip: zipInput });
        return;
      }

      if (stateCodes.length > 1) {
        setAppState({ stage: "state-select", zip: zipInput, stateCodes });
        return;
      }

      const stateCode = stateCodes[0];
      const stateData = getStateData(stateCode);
      if (!stateData) {
        setAppState({ stage: "not-found", zip: zipInput });
        return;
      }

      const election = findNextElection(stateData.elections);
      setAppState({
        stage: "result",
        zip: zipInput,
        stateCode,
        stateData,
        election,
      });
    },
    [zipInput],
  );

  const handleStateSelect = useCallback(
    (stateCode: string) => {
      const stateData = getStateData(stateCode);
      if (!stateData) return;

      const zip = appState.stage === "state-select" ? appState.zip : zipInput;
      const election = findNextElection(stateData.elections);
      setAppState({ stage: "result", zip, stateCode, stateData, election });
    },
    [appState, zipInput],
  );

  return (
    <div className="space-y-8">
      {/* Zip code form */}
      <section aria-labelledby="zip-form-heading">
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                htmlFor="zip-input"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Your 5-digit U.S. zip code
              </label>
              <input
                id="zip-input"
                data-testid="zip-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                value={zipInput}
                onChange={(e) => {
                  setZipInput(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="e.g. 73301"
                className="w-full min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={error ? "zip-error" : undefined}
                aria-invalid={!!error}
                autoComplete="postal-code"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                data-testid="zip-submit"
                className="min-h-[44px] min-w-[44px] w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Look Up My Ballot
              </button>
            </div>
          </div>

          {error && (
            <p
              id="zip-error"
              data-testid="zip-error"
              className="text-red-600 text-sm"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </form>
      </section>

      {/* State selector for multi-state zip */}
      {appState.stage === "state-select" && (
        <section aria-labelledby="state-select-heading">
          <h2
            id="state-select-heading"
            className="text-lg font-semibold text-gray-900 mb-3"
          >
            This zip code spans multiple states. Which state are you voting in?
          </h2>
          <div
            data-testid="state-selector"
            className="flex flex-wrap gap-3"
            role="group"
            aria-label="Select your state"
          >
            {appState.stateCodes.map((code) => {
              const sd = getStateData(code);
              return (
                <button
                  key={code}
                  onClick={() => handleStateSelect(code)}
                  className="min-h-[44px] px-5 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {sd ? sd.stateName : code}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Not found */}
      {appState.stage === "not-found" && (
        <div
          data-testid="not-found-message"
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-yellow-900"
          role="alert"
        >
          <p className="font-semibold mb-1">Zip code not found</p>
          <p className="text-sm">
            We don&apos;t have data for zip code <strong>{appState.zip}</strong>{" "}
            yet. We&apos;re working on adding all U.S. zip codes.{" "}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-yellow-800 hover:text-yellow-900"
            >
              Find your state election website →
            </a>
          </p>
        </div>
      )}

      {/* Results */}
      {appState.stage === "result" && (
        <div className="space-y-8">
          <StateInfoCard
            stateData={appState.stateData}
            election={appState.election}
          />
          {appState.election ? (
            <PromptOutput
              prompt={buildFullPrompt(
                appState.stateData,
                appState.zip,
                appState.election,
              )}
            />
          ) : (
            <p className="text-gray-600">
              No upcoming election found — prompt cannot be generated yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
