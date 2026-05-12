"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFullPrompt } from "@/lib/promptBuilder";
import { getStateCodesForZip, getStateData } from "@/lib/stateRegistry";
import type { StateData } from "@/types/state";

type LoadState = {
  code: string;
  data: StateData;
  prompt: string;
};

const ZIP_PATTERN = /^\d{5}$/;

function normalizeZip(value: string): string {
  return value.trim().slice(0, 5);
}

function getRegistrationStatus(stateData: StateData): string {
  if (stateData.registration.sameDayRegistration) {
    return "Same-day registration available";
  }

  if (stateData.registration.online.available) {
    return `Register online by ${stateData.registration.online.deadline ?? "the deadline"}`;
  }

  return "Registration deadline information available";
}

function getElectionSummary(stateData: StateData): string {
  const upcoming = [...stateData.elections].sort((left, right) =>
    left.date.localeCompare(right.date),
  )[0];

  return upcoming
    ? `${upcoming.name} on ${upcoming.date}`
    : "No upcoming election found";
}

function ResultCard({
  stateData,
  prompt,
  onCopy,
}: {
  stateData: StateData;
  prompt: string;
  onCopy: () => void;
}) {
  return (
    <section className="panel result-card" data-testid="state-info">
      <div className="row row-spread">
        <div>
          <p className="eyebrow">State snapshot</p>
          <h2 className="result-title">{stateData.stateName}</h2>
          <p className="muted">
            {stateData.stateCode} · Updated {stateData.lastUpdated}
          </p>
        </div>
        <button
          className="button button-secondary"
          data-testid="copy-button"
          onClick={onCopy}
          type="button"
        >
          Copy prompt
        </button>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Election</p>
          <p className="metric-value" data-testid="election-name">
            {stateData.elections[0]?.name ?? "No election data"}
          </p>
          <p className="muted" data-testid="election-date">
            {getElectionSummary(stateData)}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Registration</p>
          <p className="metric-value" data-testid="registration-status">
            {getRegistrationStatus(stateData)}
          </p>
          <p className="muted">
            Check {stateData.registration.registrationCheckUrl} before Election
            Day.
          </p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Early voting</p>
          <p className="muted">
            {stateData.earlyVoting.available
              ? `${stateData.earlyVoting.startDate ?? "TBD"} through ${stateData.earlyVoting.endDate ?? "TBD"}`
              : "Not available"}
          </p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Voting rules</p>
          <p className="muted">
            {stateData.votingRules.phonesAtPolls === "prohibited"
              ? "Phones are prohibited at the polls."
              : "Phone policy varies or is allowed."}
          </p>
        </div>
      </div>

      <label className="prompt-label">
        <span className="eyebrow">Customized prompt</span>
        <pre className="prompt-box" data-testid="prompt-output">
          {prompt}
        </pre>
      </label>
    </section>
  );
}

export default function Home() {
  const [zipInput, setZipInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyConfirmation, setCopyConfirmation] = useState(false);
  const [stateChoices, setStateChoices] = useState<string[]>([]);
  const [result, setResult] = useState<LoadState | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);

  const selectedCode = result?.code ?? null;
  const selectedState = useMemo(() => {
    if (!selectedCode) {
      return null;
    }

    return getStateData(selectedCode);
  }, [selectedCode]);

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
      setResult({
        code,
        data: stateData,
        prompt: buildFullPrompt(stateData, zip),
      });
      setStateChoices([]);
    } finally {
      setLoading(false);
    }
  }

  function submitZip() {
    const zip = normalizeZip(zipInput);
    setCopyConfirmation(false);
    setNotFound(null);
    setResult(null);
    setStateChoices([]);

    if (!zip) {
      setError("Please enter a zip code.");
      return;
    }

    if (!ZIP_PATTERN.test(zip)) {
      setError("Please enter a valid 5-digit zip code.");
      return;
    }

    setError(null);

    const codes = getStateCodesForZip(zip);
    if (codes.length === 0) {
      setNotFound(
        "We don't have data for this zip code yet. We're working on adding all U.S. zip codes.",
      );
      return;
    }

    if (codes.length > 1) {
      setStateChoices(codes);
      return;
    }

    loadState(codes[0], zip);
  }

  return (
    <main className="shell">
      <div className="shell-inner">
        <header className="hero">
          <p className="eyebrow">Voter Choice</p>
          <h1 className="hero-title">
            Ballot research, with local election context and candidate history.
          </h1>
          <p className="hero-copy">
            Enter a zip code to see the state election context, a copyable
            prompt, and any OpenStates enrichment we can match for the office or
            candidate.
          </p>
        </header>

        <section className="panel">
          <form
            className="form-row"
            onSubmit={(event) => {
              event.preventDefault();
              submitZip();
            }}
          >
            <label className="zip-label">
              <span className="sr-only">Zip code</span>
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
                placeholder="Enter your 5-digit zip code"
                value={zipInput}
              />
            </label>
            <button
              className="button button-primary"
              data-testid="zip-submit"
              disabled={loading}
              type="submit"
            >
              {loading ? "Loading..." : "Research ballot"}
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
              <p className="eyebrow">This zip spans multiple states</p>
              <h2 className="selector-title">Which state are you voting in?</h2>
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
            Prompt copied
          </p>
        ) : null}

        <footer className="footer-note">
          The prompt includes the current state context and stays optional for
          missing OpenStates data. If a candidate match is unavailable, the app
          falls back to the normal election prompt.
        </footer>
      </div>
    </main>
  );
}
