"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  lookupZip,
  loadStateData,
  getNextElection,
  formatDate,
  getDeadlineInfo,
  generateContextBlock,
  buildFullPrompt,
  type StateData,
  type Election,
  type DeadlineInfo,
} from "@/lib/ballot-data";
import { useLanguage } from "@/lib/i18n";
import { BALLOT_PROMPT_ES } from "@/lib/translations";

// ---- Types -----------------------------------------------------------------

interface AppState {
  step: "idle" | "loading" | "state-selector" | "result" | "error";
  zip: string;
  stateCodes: string[] | null;
  selectedStateCode: string | null;
  stateData: StateData | null;
  election: Election | null;
  errorType:
    | "empty"
    | "invalid"
    | "not-found"
    | "no-data"
    | "no-election"
    | null;
}

// ---- Deadline badge --------------------------------------------------------

function DeadlineBadge({ info }: { info: DeadlineInfo | null }) {
  if (!info) return null;
  const colorMap = {
    green: "bg-green-100 text-green-800 border-green-300",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
    red: "bg-red-100 text-red-800 border-red-300",
    passed: "bg-gray-100 text-gray-600 border-gray-300",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${colorMap[info.status]}`}
    >
      {info.label}
    </span>
  );
}

// ---- Language toggle -------------------------------------------------------

function LanguageToggle() {
  const { t, toggleLanguage } = useLanguage();
  return (
    <button
      data-testid="language-toggle"
      onClick={toggleLanguage}
      aria-label={`Switch to ${t.langToggleLabel}`}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-h-[44px] min-w-[44px] transition-colors"
    >
      {t.langToggleLabel}
    </button>
  );
}

// ---- Main page -------------------------------------------------------------

export default function Home() {
  const { t, lang } = useLanguage();
  const [zipInput, setZipInput] = useState("");
  const [appState, setAppState] = useState<AppState>({
    step: "idle",
    zip: "",
    stateCodes: null,
    selectedStateCode: null,
    stateData: null,
    election: null,
    errorType: null,
  });
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up copy timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ---- Validation ----------------------------------------------------------

  function validateZip(zip: string): string | null {
    if (!zip.trim()) return t.errorEmpty;
    if (!/^\d{5}$/.test(zip.trim())) return t.errorInvalidZip;
    return null;
  }

  // ---- State loading -------------------------------------------------------

  const loadState = useCallback(async (stateCode: string, zip: string) => {
    setAppState((prev) => ({ ...prev, step: "loading" }));
    const stateData = await loadStateData(stateCode);
    if (!stateData) {
      setAppState((prev) => ({
        ...prev,
        step: "error",
        errorType: "no-data",
      }));
      return;
    }
    const election = getNextElection(stateData.elections);
    setAppState((prev) => ({
      ...prev,
      step: "result",
      zip,
      selectedStateCode: stateCode,
      stateData,
      election,
      errorType: null,
    }));
  }, []);

  // ---- Submit handler ------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const zip = zipInput.trim();
    const err = validateZip(zip);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);

    const stateCodes = lookupZip(zip);
    if (!stateCodes) {
      setAppState((prev) => ({
        ...prev,
        step: "error",
        zip,
        errorType: "not-found",
        stateData: null,
        election: null,
      }));
      return;
    }

    if (stateCodes.length === 1) {
      await loadState(stateCodes[0], zip);
    } else {
      setAppState((prev) => ({
        ...prev,
        step: "state-selector",
        zip,
        stateCodes,
        stateData: null,
        election: null,
        errorType: null,
      }));
    }
  }

  // ---- Copy handler --------------------------------------------------------

  async function handleCopy() {
    if (!appState.stateData || !appState.zip) return;
    const contextBlock = generateContextBlock(
      appState.stateData,
      appState.zip,
      appState.election,
      t,
    );
    const ballotPrompt = lang === "es" ? BALLOT_PROMPT_ES : undefined;
    const fullPrompt = buildFullPrompt(contextBlock, ballotPrompt);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(fullPrompt);
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: select text in the prompt area
        const el = document.getElementById("prompt-text-area");
        if (el) {
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }
    } else {
      // Older browser fallback
      const el = document.getElementById("prompt-text-area");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  // ---- Derived values ------------------------------------------------------

  const { stateData, election } = appState;
  const today = new Date();

  const onlineDeadline = stateData
    ? getDeadlineInfo(stateData.registration.online.deadline, today, t)
    : null;
  const byMailDeadline = stateData
    ? getDeadlineInfo(stateData.registration.byMail.deadline, today, t)
    : null;
  const inPersonDeadline = stateData
    ? getDeadlineInfo(stateData.registration.inPerson.deadline, today, t)
    : null;

  const allDeadlinesPassed =
    stateData &&
    onlineDeadline?.status === "passed" &&
    byMailDeadline?.status === "passed" &&
    inPersonDeadline?.status === "passed";

  const contextBlock =
    stateData && appState.zip
      ? generateContextBlock(stateData, appState.zip, election, t)
      : "";
  const ballotPromptText = lang === "es" ? BALLOT_PROMPT_ES : undefined;
  const fullPrompt = contextBlock
    ? buildFullPrompt(contextBlock, ballotPromptText)
    : "";

  // ---- Render --------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Language toggle — always visible */}
      <LanguageToggle />

      {/* Skip to content */}
      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* ---- Hero ---- */}
        <section className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {t.heroTitle}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{t.heroSubtitle}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {[
              { name: "Claude", url: "https://claude.ai" },
              { name: "ChatGPT", url: "https://chatgpt.com" },
              { name: "Gemini", url: "https://gemini.google.com" },
              { name: "Grok", url: "https://grok.com" },
            ].map((chatbot) => (
              <a
                key={chatbot.name}
                href={chatbot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors min-h-[44px] min-w-[44px]"
              >
                {chatbot.name}
              </a>
            ))}
          </div>
        </section>

        {/* ---- Zip Input ---- */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            {t.step1Label}
          </h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label htmlFor="zip-input" className="sr-only">
                  {t.zipAriaLabel}
                </label>
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
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={t.zipPlaceholder}
                  className={`w-full px-4 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] ${
                    validationError
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 bg-white"
                  }`}
                  aria-describedby={
                    validationError ? "zip-error-msg" : undefined
                  }
                  aria-invalid={validationError ? "true" : undefined}
                />
              </div>
              <button
                data-testid="zip-submit"
                type="submit"
                disabled={appState.step === "loading"}
                className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px]"
              >
                {appState.step === "loading"
                  ? t.submitButtonLoading
                  : t.submitButton}
              </button>
            </div>

            {/* Validation error */}
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

        {/* ---- Loading ---- */}
        {appState.step === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="text-center py-8 text-gray-500"
          >
            <span className="sr-only">{t.loadingLabel}</span>
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ---- Not found ---- */}
        {appState.step === "error" && appState.errorType === "not-found" && (
          <div
            data-testid="not-found-message"
            role="alert"
            className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 mb-8"
          >
            <p className="font-medium">
              {t.notFoundTitle.replace("{zip}", appState.zip)}
            </p>
            <p className="text-sm mt-1">
              {t.notFoundBody}{" "}
              <a
                href="https://www.usa.gov/election-office"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                {t.notFoundLink}
              </a>
              .
            </p>
          </div>
        )}

        {/* ---- Multi-state selector ---- */}
        {appState.step === "state-selector" && appState.stateCodes && (
          <section className="mb-8 p-4 rounded-lg border border-blue-200 bg-blue-50">
            <h2 className="text-base font-semibold text-blue-900 mb-2">
              {t.stateSelectorPrompt}
            </h2>
            <div
              data-testid="state-selector"
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t.stateSelectorPrompt}
            >
              {appState.stateCodes.map((code) => (
                <button
                  key={code}
                  onClick={() => loadState(code, appState.zip)}
                  className="px-5 py-2 bg-white border border-blue-300 text-blue-800 font-medium rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] transition-colors"
                >
                  {code}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ---- Results ---- */}
        {appState.step === "result" && stateData && (
          <>
            {/* ---- All deadlines passed warning ---- */}
            {allDeadlinesPassed && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900"
              >
                <p className="font-medium">{t.deadlinesPassedTitle}</p>
                <p className="text-sm mt-1">
                  <a
                    href={stateData.registration.registrationCheckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {t.deadlinesPassedLink}
                  </a>{" "}
                  {t.deadlinesPassedBody}
                </p>
              </div>
            )}

            {/* ---- No upcoming election ---- */}
            {!election && (
              <div
                data-testid="no-election-message"
                role="alert"
                className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900"
              >
                <p>
                  {t.noElectionText.replace("{stateName}", stateData.stateName)}{" "}
                  <a
                    href={stateData.resources.stateElectionWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    {t.noElectionLink}
                  </a>
                  .
                </p>
              </div>
            )}

            {/* ---- State info card ---- */}
            <section
              data-testid="state-info"
              className="mb-8 p-5 rounded-xl border border-gray-200 bg-white shadow-sm"
              aria-label={t.stateInfoAriaLabel.replace(
                "{stateName}",
                stateData.stateName,
              )}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {t.stateInfoHeading.replace("{stateName}", stateData.stateName)}
              </h2>

              {/* Election */}
              {election && (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {t.nextElectionLabel}
                  </h3>
                  <p
                    data-testid="election-name"
                    className="font-semibold text-gray-900"
                  >
                    {election.name}
                  </p>
                  <p data-testid="election-date" className="text-gray-600">
                    {formatDate(election.date, lang)}
                    {election.isPrimary && election.primaryType && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({election.primaryType} {t.electionTypePrimary})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Registration deadlines */}
              <div
                data-testid="registration-status"
                className="mb-4 pb-4 border-b border-gray-100"
              >
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {t.registrationDeadlinesLabel}
                </h3>
                <ul className="space-y-2 text-sm">
                  {stateData.registration.online.available && (
                    <li className="flex items-center justify-between gap-2">
                      <span className="text-gray-700">
                        {t.registrationOnline}{" "}
                        <span className="text-gray-500">
                          (
                          {onlineDeadline
                            ? formatDate(onlineDeadline.date, lang)
                            : "—"}
                          )
                        </span>
                      </span>
                      <DeadlineBadge info={onlineDeadline} />
                    </li>
                  )}
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">
                      {t.registrationByMail}{" "}
                      <span className="text-gray-500">
                        (
                        {byMailDeadline
                          ? formatDate(byMailDeadline.date, lang)
                          : "—"}
                        )
                      </span>
                    </span>
                    <DeadlineBadge info={byMailDeadline} />
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-gray-700">
                      {t.registrationInPerson}{" "}
                      <span className="text-gray-500">
                        (
                        {inPersonDeadline
                          ? formatDate(inPersonDeadline.date, lang)
                          : "—"}
                        )
                      </span>
                    </span>
                    <DeadlineBadge info={inPersonDeadline} />
                  </li>
                  {stateData.registration.sameDayRegistration && (
                    <li className="text-green-700 font-medium">
                      {t.sameDayRegistration}
                    </li>
                  )}
                </ul>
                <a
                  href={stateData.registration.registrationCheckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-blue-700 underline hover:no-underline"
                >
                  {t.checkRegistrationLink}
                </a>
              </div>

              {/* Early voting */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t.earlyVotingLabel}
                </h3>
                {stateData.earlyVoting.available &&
                stateData.earlyVoting.startDate ? (
                  <p className="text-sm text-gray-700">
                    {formatDate(stateData.earlyVoting.startDate, lang)}{" "}
                    {t.earlyVotingThrough}{" "}
                    {formatDate(stateData.earlyVoting.endDate!, lang)}
                    {stateData.earlyVoting.notes && (
                      <span className="text-gray-500">
                        {" "}
                        · {stateData.earlyVoting.notes}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t.earlyVotingNotAvailable}
                  </p>
                )}
              </div>

              {/* Voting rules */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t.voterIdLabel}
                </h3>
                <p className="text-sm text-gray-700">
                  {stateData.votingRules.idRequired
                    ? `${t.voterIdRequired} ${stateData.votingRules.acceptedIds.join(", ")}`
                    : t.voterIdNotRequired}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{t.phonesAtPollsLabel} </span>
                  {stateData.votingRules.phonesAtPollsDetail}
                </p>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {t.officialResourcesLabel}
                </h3>
                <ul className="space-y-1 text-sm">
                  <li>
                    <a
                      href={stateData.resources.stateElectionWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:no-underline"
                    >
                      {t.stateElectionWebsiteLink}
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.resources.sampleBallotLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:no-underline"
                    >
                      {t.sampleBallotLink}
                    </a>
                  </li>
                  <li>
                    <a
                      href={stateData.resources.countyElectionLookup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline hover:no-underline"
                    >
                      {t.countyElectionLink}
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            {/* ---- Prompt output ---- */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {t.step2Label}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                {t.promptInstructions}
              </p>

              <div className="relative">
                <button
                  data-testid="copy-button"
                  onClick={handleCopy}
                  className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] min-w-[44px] transition-colors shadow-sm"
                  aria-label={copied ? t.copiedButton : t.copyButton}
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        data-testid="copy-confirmation"
                        className="text-green-700"
                      >
                        {t.copiedButton}
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      {t.copyButton}
                    </>
                  )}
                </button>

                <div
                  data-testid="prompt-output"
                  className="rounded-xl border border-gray-200 bg-gray-50 overflow-y-auto max-h-96 p-4 pr-4"
                  aria-label={t.promptAriaLabel}
                  role="region"
                >
                  <pre
                    id="prompt-text-area"
                    className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed pt-8"
                  >
                    {fullPrompt}
                  </pre>
                </div>
              </div>
            </section>

            {/* ---- Tips ---- */}
            <section
              className="mb-8 p-5 rounded-xl border border-gray-200 bg-white"
              aria-label={t.tipsAriaLabel}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {t.tipsHeading}
              </h2>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li dangerouslySetInnerHTML={{ __html: t.tip1 }} />
                <li dangerouslySetInnerHTML={{ __html: t.tip2 }} />
                <li dangerouslySetInnerHTML={{ __html: t.tip3 }} />
                <li dangerouslySetInnerHTML={{ __html: t.tip4 }} />
              </ul>
              <p
                className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3"
                dangerouslySetInnerHTML={{ __html: t.tipWarning }}
              />
            </section>
          </>
        )}

        {/* ---- Footer ---- */}
        <footer className="pt-8 border-t border-gray-200 text-sm text-gray-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p>
              <strong>{t.footerShare}</strong>
            </p>
            <p className="text-xs text-gray-400">{t.footerAttribution}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
