"use client";

import { useState, useCallback } from "react";
import { lookupZip, getStateData, getNextElection } from "@/lib/election-data";
import { generatePrompt } from "@/lib/prompt-generator";
import type { StateElectionData, DeadlineStatus } from "@/types/election";

const STATE_NAMES: Record<string, string> = {
  TX: "Texas",
  CA: "California",
  NH: "New Hampshire",
  AZ: "Arizona",
  NM: "New Mexico",
  FL: "Florida",
  GA: "Georgia",
  NC: "North Carolina",
  NY: "New York",
};

function getDeadlineStatus(deadline: string | null): DeadlineStatus {
  if (!deadline) return "closed";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline + "T00:00:00");
  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "closed";
  if (diffDays <= 7) return "urgent";
  if (diffDays <= 30) return "approaching";
  return "on-track";
}

const DEADLINE_LABELS: Record<DeadlineStatus, string> = {
  urgent: "Closes soon",
  approaching: "Coming up",
  "on-track": "Open",
  closed: "Closed",
};

const DEADLINE_COLORS: Record<DeadlineStatus, string> = {
  urgent: "bg-red-100 text-red-800 border-red-300",
  approaching: "bg-yellow-100 text-yellow-800 border-yellow-300",
  "on-track": "bg-green-100 text-green-800 border-green-300",
  closed: "bg-gray-100 text-gray-600 border-gray-300",
};

type AppState =
  | { phase: "idle" }
  | { phase: "error"; message: string; type: "invalid" | "not-found" }
  | { phase: "select-state"; stateCodes: string[] }
  | {
      phase: "loaded";
      stateData: StateElectionData;
      zip: string;
      prompt: string;
    };

export default function Home() {
  const [zip, setZip] = useState("");
  const [app, setApp] = useState<AppState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const resolveState = useCallback(
    async (stateCode: string, zipCode: string) => {
      const data = await getStateData(stateCode);
      if (!data) {
        setApp({
          phase: "error",
          message: `State data for ${STATE_NAMES[stateCode] ?? stateCode} is not yet available. Please check back soon.`,
          type: "not-found",
        });
        return;
      }
      const prompt = generatePrompt(data, zipCode);
      setApp({ phase: "loaded", stateData: data, zip: zipCode, prompt });
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = zip.trim();

      if (!trimmed) {
        setApp({
          phase: "error",
          message: "Please enter a 5-digit zip code.",
          type: "invalid",
        });
        return;
      }

      if (!/^\d{5}$/.test(trimmed)) {
        setApp({
          phase: "error",
          message: "Please enter a valid 5-digit zip code (numbers only).",
          type: "invalid",
        });
        return;
      }

      setLoading(true);
      const result = lookupZip(trimmed);

      if (result.status === "not-found") {
        setApp({
          phase: "error",
          message:
            "Zip code not found. Please check your zip code and try again.",
          type: "not-found",
        });
        setLoading(false);
        return;
      }

      if (result.status === "multi") {
        setApp({ phase: "select-state", stateCodes: result.stateCodes });
        setLoading(false);
        return;
      }

      if (result.status === "single") {
        await resolveState(result.stateCode, trimmed);
      }
      setLoading(false);
    },
    [zip, resolveState],
  );

  const handleStateSelect = useCallback(
    async (stateCode: string) => {
      setLoading(true);
      await resolveState(stateCode, zip.trim());
      setLoading(false);
    },
    [zip, resolveState],
  );

  const handleCopy = useCallback(async () => {
    if (app.phase !== "loaded") return;
    try {
      await navigator.clipboard.writeText(app.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — textarea remains visible as manual fallback
    }
  }, [app]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6"
      >
        <div className="max-w-2xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Ballot Research Tool
            </h1>
            <p className="text-gray-600 text-base">
              Privacy-first ballot research for U.S. voters. Enter your zip code
              to get a customized AI research prompt — no data stored.
            </p>
          </header>

          {/* Zip Entry Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label
                  htmlFor="zip-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your zip code
                </label>
                <input
                  id="zip-input"
                  data-testid="zip-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="e.g. 78701"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 text-base"
                  aria-describedby={
                    app.phase === "error" ? "zip-error-msg" : undefined
                  }
                  aria-invalid={app.phase === "error" ? "true" : undefined}
                  autoComplete="postal-code"
                />
              </div>
              <div className="sm:self-end">
                <button
                  data-testid="zip-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] min-w-[44px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
                >
                  {loading ? "Looking up…" : "Look Up"}
                </button>
              </div>
            </div>
          </form>

          {/* Live region for dynamic updates */}
          <div aria-live="polite" aria-atomic="false">
            {/* Validation error */}
            {app.phase === "error" && app.type === "invalid" && (
              <p
                id="zip-error-msg"
                data-testid="zip-error"
                role="alert"
                className="bg-red-50 border border-red-300 text-red-800 rounded-lg px-4 py-3 mb-4 text-sm"
              >
                {app.message}
              </p>
            )}

            {/* Not-found error */}
            {app.phase === "error" && app.type === "not-found" && (
              <div
                data-testid="not-found-message"
                role="alert"
                className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-4 py-3 mb-4 text-sm"
              >
                {app.message}
              </div>
            )}

            {/* Multi-state selector */}
            {app.phase === "select-state" && (
              <div
                data-testid="state-selector"
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
              >
                <p className="text-gray-700 font-medium mb-4">
                  Zip code {zip} covers more than one state. Which state are you
                  in?
                </p>
                <div className="flex flex-wrap gap-3">
                  {app.stateCodes.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleStateSelect(code)}
                      className="min-h-[44px] min-w-[44px] px-5 py-2.5 bg-blue-50 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 border border-blue-300 text-blue-800 font-semibold rounded-lg transition-colors text-base"
                    >
                      {STATE_NAMES[code] ?? code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* State info card + prompt */}
            {app.phase === "loaded" &&
              (() => {
                const { stateData, zip: resolvedZip, prompt } = app;
                const nextElection = getNextElection(
                  stateData.elections,
                  today,
                );
                const regDeadline =
                  stateData.registration.inPerson.deadline ??
                  stateData.registration.byMail.deadline;
                const deadlineStatus = getDeadlineStatus(regDeadline);

                return (
                  <>
                    <section
                      data-testid="state-info"
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
                      aria-label={`Election information for ${stateData.stateName}`}
                    >
                      <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {stateData.stateName} — Election Info
                      </h2>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Next Election
                          </p>
                          <p
                            data-testid="election-name"
                            className="text-gray-900 font-medium"
                          >
                            {nextElection.name}
                          </p>
                          <p
                            data-testid="election-date"
                            className="text-gray-600 text-sm mt-0.5"
                          >
                            {new Date(
                              nextElection.date + "T00:00:00",
                            ).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Voter Registration
                          </p>
                          <div
                            data-testid="registration-status"
                            className="flex items-start gap-2"
                          >
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold shrink-0 ${DEADLINE_COLORS[deadlineStatus]}`}
                              aria-label={`Registration status: ${DEADLINE_LABELS[deadlineStatus]}`}
                            >
                              {DEADLINE_LABELS[deadlineStatus]}
                            </span>
                            <span className="text-gray-600 text-sm">
                              {regDeadline
                                ? `Deadline: ${regDeadline}`
                                : "Check state website for deadline"}
                              {stateData.registration.sameDayRegistration &&
                                " · Same-day available"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Photo ID
                          </p>
                          <p className="text-gray-700 text-sm">
                            {stateData.votingRules.idRequired
                              ? "Required"
                              : "Not required"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Early Voting
                          </p>
                          <p className="text-gray-700 text-sm">
                            {stateData.earlyVoting.available
                              ? `${stateData.earlyVoting.startDate} – ${stateData.earlyVoting.endDate}`
                              : "Not available"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h2 className="text-base font-bold text-gray-900">
                          Your Customized Research Prompt
                        </h2>
                        <div className="flex items-center gap-2">
                          <button
                            data-testid="copy-button"
                            onClick={handleCopy}
                            className="min-h-[44px] min-w-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
                            aria-label="Copy prompt to clipboard"
                          >
                            Copy Prompt
                          </button>
                          {copied && (
                            <span
                              data-testid="copy-confirmation"
                              className="text-green-700 text-sm font-medium"
                              role="status"
                            >
                              Copied!
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        Paste this into Claude, ChatGPT, Gemini, or Grok — zip
                        code {resolvedZip} is pre-filled.
                      </p>
                      <textarea
                        data-testid="prompt-output"
                        readOnly
                        value={prompt}
                        rows={14}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50 resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 font-mono"
                        aria-label="Generated AI research prompt"
                      />
                    </div>
                  </>
                );
              })()}
          </div>

          <footer className="mt-10 text-center text-xs text-gray-400">
            <p>
              No zip codes or personal data are stored or sent to any server.
              State data last updated: check state election websites for the
              most current deadlines.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
