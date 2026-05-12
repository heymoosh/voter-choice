"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildFullPrompt } from "@/lib/promptBuilder";
import { getStateCodesForZip, getStateData } from "@/lib/stateRegistry";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { PollingLocation } from "@/components/PollingLocation";
import { BallotContests } from "@/components/BallotContests";
import { DataAttribution } from "@/components/DataAttribution";
import type { StateData } from "@/types/state";
import type { ElectionDataResult } from "@/lib/dataLayer";

type LoadState = {
  code: string;
  data: StateData;
  prompt: string;
  zip: string;
};

const ZIP_PATTERN = /^\d{5}$/;

function normalizeZip(value: string): string {
  return value.trim().slice(0, 5);
}

function getRegistrationStatusText(stateData: StateData): string {
  if (stateData.registration.sameDayRegistration) {
    return "Same-day registration available";
  }

  if (stateData.registration.online.available) {
    return `Register online by ${stateData.registration.online.deadline ?? "the deadline"}`;
  }

  return "Registration deadline information available";
}

function getElectionSummary(stateData: StateData, language: string): string {
  const upcoming = [...stateData.elections].sort((left, right) =>
    left.date.localeCompare(right.date),
  )[0];

  if (!upcoming) {
    return language === "es" ? "Sin datos de elección" : "No election data";
  }

  const date = new Date(`${upcoming.date}T00:00:00`);
  const locale = language === "es" ? "es-ES" : "en-US";
  const formatted = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  return `${upcoming.name} on ${formatted}`;
}

function ResultCard({
  stateData,
  prompt,
  onCopy,
  copyConfirmation,
  electionData,
  civicLoading,
}: {
  stateData: StateData;
  prompt: string;
  onCopy: () => void;
  copyConfirmation: boolean;
  electionData: ElectionDataResult | null;
  civicLoading: boolean;
}) {
  const { t, language } = useLanguage();

  const stateElectionUrl =
    stateData.resources.stateElectionWebsite ?? undefined;

  return (
    <section className="panel result-card" data-testid="state-info">
      <div className="row row-spread">
        <div>
          <p className="eyebrow">{t.stateSnapshotEyebrow}</p>
          <h2 className="result-title">{stateData.stateName}</h2>
          <p className="muted">
            {stateData.stateCode} · {t.updatedLabel} {stateData.lastUpdated}
          </p>
        </div>
        <button
          className="button button-secondary"
          data-testid="copy-button"
          onClick={onCopy}
          type="button"
        >
          {copyConfirmation ? t.copyButtonCopied : t.copyButton}
        </button>
      </div>

      {/* API error banners */}
      {electionData?.status === "partial" && (
        <ApiErrorBanner
          type="partial"
          stateElectionUrl={stateElectionUrl}
          stateName={stateData.stateName}
        />
      )}
      {electionData?.status === "fallback" && (
        <ApiErrorBanner
          type="full"
          stateElectionUrl={stateElectionUrl}
          stateName={stateData.stateName}
        />
      )}

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{t.electionLabel}</p>
          <p className="metric-value" data-testid="election-name">
            {electionData?.civicData?.election?.name ??
              stateData.elections[0]?.name ??
              t.noElectionData}
          </p>
          <p className="muted" data-testid="election-date">
            {getElectionSummary(stateData, language)}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{t.registrationLabel}</p>
          <p className="metric-value" data-testid="registration-status">
            {getRegistrationStatusText(stateData)}
          </p>
          <p className="muted">
            {t.registrationCheckPrefix}{" "}
            {stateData.registration.registrationCheckUrl}{" "}
            {t.registrationCheckSuffix}
          </p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">{t.earlyVotingLabel}</p>
          <p className="muted">
            {stateData.earlyVoting.available
              ? `${stateData.earlyVoting.startDate ?? "TBD"} ${t.earlyVotingThrough} ${stateData.earlyVoting.endDate ?? "TBD"}`
              : t.noEarlyVoting}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">{t.votingRulesLabel}</p>
          <p className="muted">
            {stateData.votingRules.phonesAtPolls === "prohibited"
              ? t.phonesProhibited
              : t.phonesPolicyVaries}
          </p>
        </div>
      </div>

      {/* Voter ID section (from static JSON) */}
      {electionData?.voterIdInfo && (
        <div className="metric-card voter-id-card">
          <p className="metric-label">{t.voterIdLabel}</p>
          <p className="metric-value">
            {electionData.voterIdInfo.voterIdRequired
              ? t.voterIdRequiredText
              : t.voterIdNotRequiredText}
          </p>
          {electionData.voterIdInfo.exceptions && (
            <p className="muted">{electionData.voterIdInfo.exceptions}</p>
          )}
          <p className="muted small">{t.voterIdVerifyNote}</p>
        </div>
      )}

      {/* Civic data section: polling location */}
      {civicLoading && !electionData?.civicData?.pollingLocation && (
        <LoadingSkeleton
          label={
            language === "es"
              ? "Cargando datos electorales..."
              : "Loading election data..."
          }
        />
      )}
      {electionData?.civicData?.pollingLocation && (
        <PollingLocation location={electionData.civicData.pollingLocation} />
      )}

      {/* Civic data section: ballot contests */}
      {civicLoading && !electionData?.civicData?.ballotContests.length && (
        <LoadingSkeleton
          label={language === "es" ? "Cargando boleta..." : "Loading ballot..."}
        />
      )}
      {electionData?.civicData?.ballotContests &&
        electionData.civicData.ballotContests.length > 0 && (
          <BallotContests
            contests={electionData.civicData.ballotContests}
            state={stateData.stateCode}
          />
        )}

      {/* Data attribution */}
      {electionData?.civicData && (
        <DataAttribution
          fetchedAt={electionData.civicData.fetchedAt}
          stateElectionUrl={stateElectionUrl}
        />
      )}

      <label className="prompt-label">
        <span className="eyebrow">{t.promptEyebrow}</span>
        <p className="prompt-instructions">{t.promptInstructions}</p>
        <pre className="prompt-box" data-testid="prompt-output">
          {prompt}
        </pre>
      </label>
    </section>
  );
}

function TipsSection() {
  const { t } = useLanguage();

  return (
    <section className="panel tips-section">
      <h2 className="tips-title">{t.tipsTitle}</h2>
      <ul className="tips-list">
        {t.tips.map((tip, index) => (
          <li key={index} className="tip-item">
            {tip}
          </li>
        ))}
      </ul>
      <p className="tips-warning">{t.tipsWarning}</p>
    </section>
  );
}

export default function Home() {
  const { t, language } = useLanguage();
  const [zipInput, setZipInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [civicLoading, setCivicLoading] = useState(false);
  const [copyConfirmation, setCopyConfirmation] = useState(false);
  const [stateChoices, setStateChoices] = useState<string[]>([]);
  const [result, setResult] = useState<LoadState | null>(null);
  const [electionData, setElectionData] = useState<ElectionDataResult | null>(
    null,
  );
  const [notFound, setNotFound] = useState<string | null>(null);

  const selectedCode = result?.code ?? null;
  const selectedState = useMemo(() => {
    if (!selectedCode) {
      return null;
    }

    return getStateData(selectedCode);
  }, [selectedCode]);

  // Rebuild prompt when language changes or civic data arrives
  useEffect(() => {
    if (result) {
      const stateData = getStateData(result.code);
      if (stateData) {
        const newPrompt = buildFullPrompt(
          stateData,
          result.zip,
          null,
          language,
          electionData?.civicData ?? null,
          electionData?.voterIdInfo ?? null,
        );
        setResult((prev) => (prev ? { ...prev, prompt: newPrompt } : null));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, electionData]);

  useEffect(() => {
    if (!copyConfirmation) {
      return;
    }

    const timeout = window.setTimeout(() => setCopyConfirmation(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyConfirmation]);

  async function copyPrompt() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result.prompt);
    setCopyConfirmation(true);
  }

  const fetchCivicData = useCallback(
    async (code: string, zip: string) => {
      setCivicLoading(true);
      setElectionData(null);
      try {
        const response = await fetch(
          `/api/election/${zip}?state=${encodeURIComponent(code)}`,
        );
        if (!response.ok) {
          throw new Error(`Election API error: ${response.status}`);
        }
        const data = (await response.json()) as ElectionDataResult;
        setElectionData(data);

        // Update prompt with enriched data
        const stateData = getStateData(code);
        if (stateData) {
          const enrichedPrompt = buildFullPrompt(
            stateData,
            zip,
            null,
            language,
            data.civicData,
            data.voterIdInfo,
          );
          setResult((prev) =>
            prev ? { ...prev, prompt: enrichedPrompt } : null,
          );
        }
      } catch (err) {
        console.error("[page] civic data fetch error:", err);
        // Silently degrade — static data still shows
      } finally {
        setCivicLoading(false);
      }
    },
    [language],
  );

  function loadState(code: string, zip: string) {
    const stateData = getStateData(code);
    if (!stateData) {
      setNotFound(
        `We don't have full state data for ${code} yet. This zip code spans multiple states, so choose the state you vote in.`,
      );
      return;
    }

    setLoading(true);
    try {
      setElectionData(null);
      setResult({
        code,
        data: stateData,
        prompt: buildFullPrompt(stateData, zip, null, language),
        zip,
      });
      setStateChoices([]);
      // Kick off civic data fetch in background (progressive)
      void fetchCivicData(code, zip);
    } finally {
      setLoading(false);
    }
  }

  function submitZip() {
    const zip = normalizeZip(zipInput);
    setCopyConfirmation(false);
    setNotFound(null);
    setResult(null);
    setElectionData(null);
    setStateChoices([]);

    if (!zip) {
      setError(t.errorEmptyZip);
      return;
    }

    if (!ZIP_PATTERN.test(zip)) {
      setError(t.errorInvalidZip);
      return;
    }

    setError(null);

    const codes = getStateCodesForZip(zip);
    if (codes.length === 0) {
      setNotFound(t.errorZipNotFound);
      return;
    }

    if (codes.length > 1) {
      setStateChoices(codes);
      return;
    }

    loadState(codes[0], zip);
  }

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>
      <main className="shell" id="main-content">
        <div className="shell-inner">
          <div className="page-header">
            <header className="hero">
              <p className="eyebrow">{t.heroEyebrow}</p>
              <h1 className="hero-title">{t.heroTitle}</h1>
              <p className="hero-copy">{t.heroCopy}</p>
              <p className="chatbot-label">{t.chatbotLinksLabel}</p>
              <div className="chatbot-links">
                <a
                  href="https://claude.ai"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Claude
                </a>
                <a
                  href="https://chatgpt.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  ChatGPT
                </a>
                <a
                  href="https://gemini.google.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Gemini
                </a>
                <a
                  href="https://grok.com"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Grok
                </a>
              </div>
            </header>
            <div className="language-toggle-wrapper">
              <LanguageToggle />
            </div>
          </div>

          <section className="panel">
            <form
              className="form-row"
              onSubmit={(event) => {
                event.preventDefault();
                submitZip();
              }}
            >
              <label className="zip-label">
                <span className="sr-only">{t.zipLabel}</span>
                <input
                  className="zip-input"
                  data-testid="zip-input"
                  inputMode="numeric"
                  maxLength={5}
                  onChange={(event) => {
                    setZipInput(event.target.value);
                    setError(null);
                    setNotFound(null);
                  }}
                  placeholder={t.zipPlaceholder}
                  value={zipInput}
                />
              </label>
              <button
                className="button button-primary"
                data-testid="zip-submit"
                disabled={loading}
                type="submit"
              >
                {loading ? t.submitButtonLoading : t.submitButton}
              </button>
            </form>

            {error ? (
              <p
                className="notice notice-error"
                data-testid="zip-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {notFound ? (
              <p
                className="notice notice-muted"
                data-testid="not-found-message"
                role="status"
              >
                {notFound}
              </p>
            ) : null}

            {stateChoices.length > 0 ? (
              <section className="state-selector" data-testid="state-selector">
                <p className="eyebrow">{t.stateSelectorEyebrow}</p>
                <h2 className="selector-title">{t.stateSelectorTitle}</h2>
                <div className="state-choice-row">
                  {stateChoices.map((code) => (
                    <button
                      key={code}
                      className="button button-ghost"
                      onClick={() => loadState(code, normalizeZip(zipInput))}
                      type="button"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </section>

          {selectedState && result ? (
            <ResultCard
              copyConfirmation={copyConfirmation}
              electionData={electionData}
              civicLoading={civicLoading}
              onCopy={() => {
                void copyPrompt();
              }}
              prompt={result.prompt}
              stateData={result.data}
            />
          ) : null}

          {copyConfirmation ? (
            <p
              className="copy-toast"
              data-testid="copy-confirmation"
              role="status"
            >
              {t.copyConfirmation}
            </p>
          ) : null}

          <TipsSection />

          <footer className="footer-note">
            <p className="footer-share">{t.footerShare}</p>
            <p>{t.footerAttribution}</p>
          </footer>
        </div>
      </main>
    </>
  );
}
