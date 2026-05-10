"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStatesForZip, getStateData } from "@/lib/election-data";
import { generateCustomizedPrompt } from "@/lib/prompt-generator";
import { useLanguage } from "@/lib/language-context";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VoterProfile } from "@/components/VoterProfile";
import type { StateElectionData } from "@/types/election";

export default function Home() {
  const { t, language } = useLanguage();

  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [stateOptions, setStateOptions] = useState<string[] | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateElectionData | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voterProfile, setVoterProfile] = useState<string>("");

  const upcomingElection = stateData
    ? stateData.elections.find((e) => new Date(e.date) >= new Date()) || null
    : null;

  useEffect(() => {
    if (selectedState) {
      loadStateData(selectedState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState]);

  useEffect(() => {
    if (stateData) {
      setCustomPrompt(generateCustomizedPrompt(stateData, zipCode, language));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, stateData]);

  async function loadStateData(stateCode: string) {
    const data = await getStateData(stateCode);
    if (data) {
      setStateData(data);
      setCustomPrompt(generateCustomizedPrompt(data, zipCode, language));
    }
  }

  function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault();
    setZipError("");
    setNotFound(false);
    setStateOptions(null);
    setSelectedState(null);
    setStateData(null);
    setCustomPrompt("");

    if (!zipCode.trim()) {
      setZipError(t.errors.emptyZip);
      return;
    }

    if (!/^\d{5}$/.test(zipCode.trim())) {
      setZipError(t.errors.invalidZip);
      return;
    }

    setIsLoading(true);
    const states = getStatesForZip(zipCode.trim());

    if (!states) {
      setNotFound(true);
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
    const locale = language === "es" ? "es-US" : "en-US";
    const date = new Date(isoDate);
    return date.toLocaleDateString(locale, {
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

  function getDeadlineStatus(
    isoDate: string | null,
  ): "passed" | "urgent" | "warning" | "ok" {
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

    const { deadlineStatus } = t;
    const statusText =
      status === "passed"
        ? deadlineStatus.passed
        : status === "urgent"
          ? `${daysLeft} ${deadlineStatus.urgent}`
          : `${daysLeft} ${deadlineStatus.daysLeft}`;

    const postmarkSuffix =
      postmarked !== undefined
        ? postmarked
          ? language === "es"
            ? " (matasellos)"
            : " (postmarked)"
          : language === "es"
            ? " (recibido)"
            : " (received)"
        : "";

    return (
      <div>
        <strong>{label}:</strong>{" "}
        {isoDate ? (
          <>
            {formatDate(isoDate)}
            {postmarkSuffix} —{" "}
            <span className={statusColors[status]}>{statusText}</span>
          </>
        ) : language === "es" ? (
          "No disponible"
        ) : (
          "Not available"
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        {language === "es" ? "Ir al contenido principal" : "Skip to content"}
      </a>

      <header className="border-b border-gray-200 py-3 px-4">
        <div className="max-w-4xl mx-auto flex justify-end">
          <LanguageToggle />
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1 max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full"
      >
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            {t.hero.title}
          </h1>
          <p className="text-lg text-gray-700 mb-2">{t.hero.subtitle}</p>
          <p className="text-base text-gray-600 mb-4">{t.hero.description}</p>
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

        <section className="mb-8">
          <form
            onSubmit={handleZipSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="flex-1">
              <label htmlFor="zip-input" className="sr-only">
                {t.zipForm.label}
              </label>
              <input
                id="zip-input"
                data-testid="zip-input"
                type="text"
                inputMode="numeric"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder={t.zipForm.placeholder}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                aria-describedby={
                  zipError
                    ? "zip-error"
                    : notFound
                      ? "not-found-message"
                      : undefined
                }
              />
            </div>
            <button
              type="submit"
              data-testid="zip-submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[120px] min-h-[44px]"
            >
              {isLoading ? t.zipForm.loading : t.zipForm.submit}
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

          {notFound && (
            <p
              id="not-found-message"
              data-testid="not-found-message"
              className="mt-2 text-red-600 text-sm"
              role="alert"
            >
              {t.errors.notFound}
            </p>
          )}
        </section>

        {stateOptions && stateOptions.length > 1 && !selectedState && (
          <section className="mb-8" data-testid="state-selector">
            <p className="mb-3 font-semibold">{t.stateSelector.heading}</p>
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

        {stateData && (
          <section
            className="mb-8 border border-gray-300 rounded-lg p-6 bg-gray-50"
            data-testid="state-info"
          >
            <h2 className="text-2xl font-bold mb-4">{stateData.stateName}</h2>

            {upcomingElection ? (
              <>
                <div className="mb-3">
                  <h3
                    className="text-lg font-semibold"
                    data-testid="election-name"
                  >
                    {upcomingElection.name}
                  </h3>
                  <p data-testid="election-date" className="text-gray-700">
                    <strong>{t.stateInfo.electionDate}:</strong>{" "}
                    {formatDate(upcomingElection.date)}
                  </p>
                  <p className="text-gray-700">
                    <strong>{t.stateInfo.electionType}:</strong>{" "}
                    {upcomingElection.type}
                    {upcomingElection.isPrimary &&
                      upcomingElection.primaryType &&
                      ` (${upcomingElection.primaryType} primary)`}
                  </p>
                </div>

                <div className="mb-3" data-testid="registration-status">
                  <h4 className="font-semibold mb-1">
                    {t.stateInfo.registrationDeadlines}
                  </h4>
                  {renderDeadlineWithStatus(
                    stateData.registration.online.deadline,
                    t.stateInfo.online,
                  )}
                  {renderDeadlineWithStatus(
                    stateData.registration.byMail.deadline,
                    t.stateInfo.byMail,
                    stateData.registration.byMail.sincePostmarked,
                  )}
                  {renderDeadlineWithStatus(
                    stateData.registration.inPerson.deadline,
                    t.stateInfo.inPerson,
                    stateData.registration.inPerson.sincePostmarked,
                  )}
                  <div>
                    <strong>
                      {language === "es"
                        ? "Registro el mismo día:"
                        : "Same-day registration:"}
                    </strong>{" "}
                    {stateData.registration.sameDayRegistration
                      ? t.stateInfo.sameDayAvailable
                      : t.stateInfo.sameDayNotAvailable}
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">{t.stateInfo.earlyVoting}</h4>
                  <p className="text-gray-700">
                    {stateData.earlyVoting.available
                      ? `${formatDate(stateData.earlyVoting.startDate!)} — ${formatDate(stateData.earlyVoting.endDate!)}${stateData.earlyVoting.notes ? ` (${stateData.earlyVoting.notes})` : ""}`
                      : t.stateInfo.earlyVotingNotAvailable}
                  </p>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">{t.stateInfo.voterId}</h4>
                  <p className="text-gray-700">
                    {stateData.votingRules.idRequired
                      ? `${language === "es" ? "Requerida. IDs aceptadas:" : "Required. Accepted IDs:"} ${stateData.votingRules.acceptedIds?.join(", ")}`
                      : t.stateInfo.voterIdNotRequired}
                  </p>
                </div>

                <div className="mb-3">
                  <h4 className="font-semibold">{t.stateInfo.phonesAtPolls}</h4>
                  <p className="text-gray-700">
                    {stateData.votingRules.phonesAtPollsDetail ||
                      stateData.votingRules.phonesAtPolls}
                  </p>
                </div>

                <div className="space-y-1">
                  <a
                    href={stateData.resources.sampleBallotLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    {t.stateInfo.viewSampleBallot}
                  </a>
                  <a
                    href={stateData.resources.countyElectionLookup}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    {t.stateInfo.findCountyOffice}
                  </a>
                  <a
                    href={stateData.registration.registrationCheckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline block"
                  >
                    {t.stateInfo.checkRegistration}
                  </a>
                </div>
              </>
            ) : (
              <p data-testid="no-election-message" className="text-gray-700">
                {t.stateInfo.noUpcomingElection} {stateData.stateName}.{" "}
                <a
                  href={stateData.resources.stateElectionWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {language === "es"
                    ? "Ver sitio web electoral del estado"
                    : "Check the state election website"}
                </a>
              </p>
            )}
          </section>
        )}

        {customPrompt && (
          <section className="mb-8">
            <div className="mb-3">
              <h3 className="text-xl font-semibold mb-2">{t.prompt.heading}</h3>
              <p className="text-gray-700 text-sm">{t.prompt.description}</p>
            </div>
            <div
              id="prompt-output"
              data-testid="prompt-output"
              className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-3 whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto"
              role="region"
              aria-label={
                language === "es"
                  ? "Aviso de investigación electoral de IA personalizado"
                  : "Customized AI ballot research prompt"
              }
            >
              {customPrompt}
            </div>
            <button
              onClick={copyToClipboard}
              data-testid="copy-button"
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[44px]"
            >
              {copied ? t.prompt.copied : t.prompt.copyButton}
            </button>
            {copied && (
              <span
                data-testid="copy-confirmation"
                className="ml-3 text-green-600 font-semibold"
                role="status"
                aria-live="polite"
              >
                {t.prompt.copyConfirmation}
              </span>
            )}
          </section>
        )}

        <section className="mb-8">
          <VoterProfile profile={voterProfile} setProfile={setVoterProfile} />
        </section>

        <section className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3">{t.tips.heading}</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>{t.tips.tip1}</li>
            <li>{t.tips.tip2}</li>
            <li>{t.tips.tip3}</li>
            <li>
              <strong>
                {language === "es"
                  ? "La IA puede cometer errores."
                  : "AI can make mistakes."}
              </strong>{" "}
              {language === "es"
                ? "Este es un punto de partida. Verifica con fuentes oficiales."
                : "This is a research starting point. Verify with official sources."}
            </li>
          </ul>
        </section>
      </main>

      <footer className="bg-gray-100 border-t border-gray-300 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-700 mb-2">{t.footer.share}</p>
          <div className="flex justify-center gap-4 text-sm mb-2">
            <Link href="/privacy" className="text-blue-600 hover:underline">
              {t.footer.privacy}
            </Link>
            <Link href="/terms" className="text-blue-600 hover:underline">
              {t.footer.terms}
            </Link>
          </div>
          <p className="text-gray-600 text-sm">{t.footer.credit}</p>
        </div>
      </footer>
    </div>
  );
}
