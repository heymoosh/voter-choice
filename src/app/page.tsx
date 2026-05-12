"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildFullPrompt, getNextElection } from "@/lib/promptBuilder";
import { getStateCodesForZip, getStateData } from "@/lib/stateRegistry";
import type { StateData } from "@/types/state";

type LookupResult = {
  zipCode: string;
  stateCodes: string[];
  selectedStateCode: string | null;
};

type DeadlineStatus = "passed" | "urgent" | "warning" | "ok";

function validateZip(zipCode: string): string | null {
  if (!zipCode) {
    return "Please enter a zip code.";
  }
  if (!/^\d{5}$/.test(zipCode)) {
    return "Please enter a valid 5-digit zip code.";
  }
  return null;
}

function computeDeadline(
  deadline: string | null,
  today: string,
): { label: string; status: DeadlineStatus } {
  if (!deadline) return { label: "Not available", status: "ok" };
  if (deadline <= today) return { label: "Passed", status: "passed" };
  const days = Math.round(
    (new Date(`${deadline}T00:00:00`).getTime() -
      new Date(`${today}T00:00:00`).getTime()) /
      86400000,
  );
  if (days <= 3)
    return {
      label: `${days} day${days === 1 ? "" : "s"} left`,
      status: "urgent",
    };
  if (days <= 14) return { label: `${days} days left`, status: "warning" };
  return { label: `${days} days left`, status: "ok" };
}

const STATUS_COLORS: Record<DeadlineStatus, string> = {
  passed: "#6b7280",
  urgent: "#dc2626",
  warning: "#d97706",
  ok: "#16a34a",
};

function RegistrationStatus({
  stateData,
  today,
}: {
  stateData: StateData;
  today: string;
}) {
  const reg = stateData.registration;
  const online = reg.online.available
    ? computeDeadline(reg.online.deadline, today)
    : null;
  const mail = computeDeadline(reg.byMail.deadline, today);
  const inPerson = computeDeadline(reg.inPerson.deadline, today);

  return (
    <div data-testid="registration-status">
      {reg.sameDayRegistration && (
        <p
          style={{ color: "#16a34a", fontWeight: 600, marginBottom: "0.25rem" }}
        >
          Same-day registration available
        </p>
      )}
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "0.875rem",
        }}
      >
        <tbody>
          <tr>
            <td style={{ padding: "3px 8px 3px 0", fontWeight: 500 }}>
              Online:
            </td>
            <td style={{ padding: "3px 0" }}>
              {reg.online.available && online ? (
                <>
                  <span style={{ paddingRight: "0.5rem" }}>
                    {reg.online.deadline}
                  </span>
                  <span
                    style={{
                      color: STATUS_COLORS[online.status],
                      fontWeight: 500,
                    }}
                  >
                    {online.label}
                  </span>
                </>
              ) : (
                <span style={{ color: "#6b7280" }}>Not available</span>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 8px 3px 0", fontWeight: 500 }}>
              By mail:
            </td>
            <td style={{ padding: "3px 0" }}>
              <span style={{ paddingRight: "0.5rem" }}>
                {reg.byMail.deadline}
              </span>
              <span
                style={{ color: STATUS_COLORS[mail.status], fontWeight: 500 }}
              >
                {mail.label}
              </span>
              {reg.byMail.sincePostmarked && (
                <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
                  {" "}
                  (by postmark)
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "3px 8px 3px 0", fontWeight: 500 }}>
              In person:
            </td>
            <td style={{ padding: "3px 0" }}>
              <span style={{ paddingRight: "0.5rem" }}>
                {reg.inPerson.deadline}
              </span>
              <span
                style={{
                  color: STATUS_COLORS[inPerson.status],
                  fontWeight: 500,
                }}
              >
                {inPerson.label}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
        <a
          href={reg.registrationCheckUrl}
          rel="noopener noreferrer"
          style={{ color: "#2563eb" }}
          target="_blank"
        >
          Check your registration status
        </a>
      </p>
    </div>
  );
}

export default function Home() {
  const [zipInput, setZipInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const selectedStateData = useMemo(() => {
    if (!lookup?.selectedStateCode) return null;
    return getStateData(lookup.selectedStateCode);
  }, [lookup]);

  const election = useMemo(
    () => (selectedStateData ? getNextElection(selectedStateData) : null),
    [selectedStateData],
  );

  const prompt = useMemo(
    () =>
      selectedStateData
        ? buildFullPrompt(selectedStateData, lookup?.zipCode ?? zipInput)
        : "",
    [selectedStateData, lookup, zipInput],
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCopied(false);
    const zipCode = zipInput.trim();
    const validationError = validateZip(zipCode);
    if (validationError) {
      setError(validationError);
      setLookup(null);
      return;
    }
    const stateCodes = getStateCodesForZip(zipCode);
    setError(null);
    if (stateCodes.length === 0) {
      setLookup({ zipCode, stateCodes, selectedStateCode: null });
      return;
    }
    setLookup({
      zipCode,
      stateCodes,
      selectedStateCode: stateCodes.find((code) => getStateData(code)) ?? null,
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard API unavailable — fallback handled by UX hint
    }
    setCopied(true);
  }

  return (
    <>
      {/* Skip to content */}
      <a
        href="#main-content"
        onBlur={(e) => {
          e.currentTarget.style.left = "-9999px";
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = "0";
        }}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "0",
          zIndex: 100,
          background: "#1d4ed8",
          color: "white",
          padding: "0.5rem 1rem",
          fontWeight: 600,
        }}
      >
        Skip to main content
      </a>

      <main
        id="main-content"
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "1.5rem 1rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Hero Section */}
        <section
          aria-labelledby="hero-heading"
          style={{ marginBottom: "2rem" }}
        >
          <h1
            id="hero-heading"
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Free AI Ballot Research Tool
          </h1>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.6,
              marginBottom: "0.75rem",
            }}
          >
            Enter your zip code to get a customized AI prompt. Copy it and paste
            it as your first message in any free AI chatbot to get personalized,
            nonpartisan help researching your ballot.
          </p>
          <p style={{ fontSize: "0.9rem", marginBottom: "0" }}>
            Works with:{" "}
            <a
              href="https://claude.ai"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
              target="_blank"
            >
              Claude
            </a>
            {" · "}
            <a
              href="https://chatgpt.com"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
              target="_blank"
            >
              ChatGPT
            </a>
            {" · "}
            <a
              href="https://gemini.google.com"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
              target="_blank"
            >
              Gemini
            </a>
            {" · "}
            <a
              href="https://grok.com"
              rel="noopener noreferrer"
              style={{ color: "#2563eb" }}
              target="_blank"
            >
              Grok
            </a>
          </p>
        </section>

        {/* Zip Code Entry */}
        <section aria-labelledby="zip-heading" style={{ marginBottom: "2rem" }}>
          <h2
            id="zip-heading"
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Step 1: Enter your zip code
          </h2>
          <form noValidate onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxWidth: "420px",
              }}
            >
              <label htmlFor="zip-field" style={{ fontWeight: 600 }}>
                5-digit U.S. zip code
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  aria-describedby={error ? "zip-error" : undefined}
                  aria-invalid={error ? "true" : undefined}
                  autoComplete="postal-code"
                  data-testid="zip-input"
                  id="zip-field"
                  inputMode="numeric"
                  maxLength={5}
                  pattern="\d{5}"
                  placeholder="e.g. 73301"
                  style={{
                    flex: 1,
                    padding: "0.625rem 0.75rem",
                    border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`,
                    borderRadius: "0.375rem",
                    fontSize: "1rem",
                    minHeight: "44px",
                  }}
                  type="text"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                />
                <button
                  data-testid="zip-submit"
                  style={{
                    padding: "0.625rem 1.25rem",
                    backgroundColor: "#1d4ed8",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontWeight: 600,
                    fontSize: "1rem",
                    cursor: "pointer",
                    minHeight: "44px",
                    minWidth: "44px",
                  }}
                  type="submit"
                >
                  Look up
                </button>
              </div>
              {error && (
                <p
                  aria-live="polite"
                  data-testid="zip-error"
                  id="zip-error"
                  role="alert"
                  style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}
                >
                  {error}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* Not found */}
        {lookup && lookup.stateCodes.length === 0 && (
          <section
            aria-live="polite"
            data-testid="not-found-message"
            style={{
              padding: "1rem",
              backgroundColor: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Zip code not found
            </h2>
            <p style={{ margin: 0 }}>
              We don&apos;t have data for zip code{" "}
              <strong>{lookup.zipCode}</strong> yet. We&apos;re working on
              adding all U.S. zip codes.{" "}
              <a
                href="https://www.usa.gov/election-office"
                rel="noopener noreferrer"
                style={{ color: "#2563eb" }}
                target="_blank"
              >
                Find your state election website directory
              </a>
              .
            </p>
          </section>
        )}

        {/* Multi-state selector */}
        {lookup && lookup.stateCodes.length > 1 && (
          <section
            data-testid="state-selector"
            style={{
              padding: "1rem",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              This zip code spans multiple states. Which state are you voting
              in?
            </h2>
            <label
              htmlFor="state-select"
              style={{
                fontWeight: 500,
                display: "block",
                marginBottom: "0.25rem",
              }}
            >
              Select your state:
            </label>
            <select
              aria-label="Select your state"
              id="state-select"
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "1rem",
                minHeight: "44px",
              }}
              value={lookup.selectedStateCode ?? ""}
              onChange={(e) =>
                setLookup({
                  ...lookup,
                  selectedStateCode: e.target.value || null,
                })
              }
            >
              <option value="">-- Select a state --</option>
              {lookup.stateCodes.map((code) => (
                <option disabled={!getStateData(code)} key={code} value={code}>
                  {code}
                  {!getStateData(code) ? " (data coming soon)" : ""}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* State Info Card */}
        {selectedStateData && (
          <section
            aria-labelledby="state-info-heading"
            data-testid="state-info"
            style={{
              padding: "1.25rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
              backgroundColor: "#f9fafb",
            }}
          >
            <h2
              id="state-info-heading"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              {selectedStateData.stateName}
            </h2>

            {/* Election */}
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.075em",
                  color: "#6b7280",
                  marginBottom: "0.375rem",
                }}
              >
                Next Election
              </h3>
              {election ? (
                <>
                  <p
                    data-testid="election-name"
                    style={{ fontWeight: 600, marginBottom: "0.25rem" }}
                  >
                    {election.name}
                  </p>
                  <p data-testid="election-date" style={{ color: "#374151" }}>
                    {election.date}
                    {election.type && (
                      <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                        {" "}
                        ({election.type}
                        {election.primaryType
                          ? `, ${election.primaryType} primary`
                          : ""}
                        )
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <div data-testid="no-election-message">
                  <p style={{ color: "#6b7280" }}>
                    No upcoming elections found for{" "}
                    {selectedStateData.stateName}.{" "}
                    <a
                      href={selectedStateData.resources.stateElectionWebsite}
                      rel="noopener noreferrer"
                      style={{ color: "#2563eb" }}
                      target="_blank"
                    >
                      Check {selectedStateData.stateName} election website
                    </a>{" "}
                    for updates.
                  </p>
                </div>
              )}
            </div>

            {/* Early voting */}
            {selectedStateData.earlyVoting.available && (
              <div style={{ marginBottom: "1rem" }}>
                <h3
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.075em",
                    color: "#6b7280",
                    marginBottom: "0.375rem",
                  }}
                >
                  Early Voting
                </h3>
                <p>
                  {selectedStateData.earlyVoting.startDate} –{" "}
                  {selectedStateData.earlyVoting.endDate}
                </p>
                {selectedStateData.earlyVoting.notes && (
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {selectedStateData.earlyVoting.notes}
                  </p>
                )}
              </div>
            )}
            {!selectedStateData.earlyVoting.available && (
              <div style={{ marginBottom: "1rem" }}>
                <h3
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.075em",
                    color: "#6b7280",
                    marginBottom: "0.375rem",
                  }}
                >
                  Early Voting
                </h3>
                <p style={{ color: "#6b7280" }}>
                  {selectedStateData.earlyVoting.notes ||
                    "Not available — absentee voting only"}
                </p>
              </div>
            )}

            {/* Registration deadlines */}
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.075em",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
              >
                Voter Registration Deadlines
              </h3>
              <RegistrationStatus stateData={selectedStateData} today={today} />
            </div>

            {/* Voting rules */}
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.075em",
                  color: "#6b7280",
                  marginBottom: "0.375rem",
                }}
              >
                Voting Rules
              </h3>
              <p style={{ fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                <strong>Photo ID required:</strong>{" "}
                {selectedStateData.votingRules.idRequired ? "Yes" : "No"}
                {selectedStateData.votingRules.idRequired &&
                  selectedStateData.votingRules.acceptedIds.length > 0 && (
                    <span style={{ color: "#6b7280" }}>
                      {" "}
                      (accepted:{" "}
                      {selectedStateData.votingRules.acceptedIds
                        .slice(0, 2)
                        .join(", ")}
                      {selectedStateData.votingRules.acceptedIds.length > 2
                        ? `, +${selectedStateData.votingRules.acceptedIds.length - 2} more`
                        : ""}
                      )
                    </span>
                  )}
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                <strong>Phones at polls:</strong>{" "}
                {selectedStateData.votingRules.phonesAtPollsDetail}
              </p>
            </div>

            {/* Resources */}
            <div
              style={{
                paddingTop: "0.75rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <a
                href={selectedStateData.resources.sampleBallotLookup}
                rel="noopener noreferrer"
                style={{ color: "#2563eb", fontSize: "0.875rem" }}
                target="_blank"
              >
                Sample ballot lookup ↗
              </a>
              <a
                href={selectedStateData.resources.countyElectionLookup}
                rel="noopener noreferrer"
                style={{ color: "#2563eb", fontSize: "0.875rem" }}
                target="_blank"
              >
                County election office ↗
              </a>
              <a
                href={selectedStateData.resources.stateElectionWebsite}
                rel="noopener noreferrer"
                style={{ color: "#2563eb", fontSize: "0.875rem" }}
                target="_blank"
              >
                State election website ↗
              </a>
            </div>
          </section>
        )}

        {/* Prompt Output */}
        {selectedStateData && prompt && (
          <section
            aria-labelledby="prompt-heading"
            style={{ marginBottom: "2rem" }}
          >
            <h2
              id="prompt-heading"
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              Step 2: Copy your customized prompt
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                color: "#374151",
              }}
            >
              Copy this prompt and paste it as your first message in any AI
              chatbot.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                marginBottom: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                data-testid="copy-button"
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: copied ? "#16a34a" : "#1d4ed8",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  minHeight: "44px",
                  minWidth: "44px",
                  transition: "background-color 0.15s",
                }}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
              {copied && (
                <span
                  aria-live="polite"
                  data-testid="copy-confirmation"
                  style={{
                    color: "#16a34a",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                  }}
                >
                  Copied to clipboard!
                </span>
              )}
            </div>
            <pre
              aria-label="Your customized ballot research prompt"
              data-testid="prompt-output"
              style={{
                backgroundColor: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "0.5rem",
                padding: "1rem",
                fontSize: "0.8rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowY: "auto",
                maxHeight: "400px",
                lineHeight: 1.6,
                tabSize: 2,
              }}
            >
              {prompt}
            </pre>
          </section>
        )}

        {/* Tips Section */}
        <section
          aria-labelledby="tips-heading"
          style={{
            marginBottom: "2rem",
            padding: "1.25rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "0.5rem",
          }}
        >
          <h2
            id="tips-heading"
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Tips for Using the Prompt
          </h2>
          <ul style={{ lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
            <li>
              You can say <strong>&quot;I don&apos;t know&quot;</strong> — the
              AI will explain more and help you figure it out
            </li>
            <li>Ask it to research candidates&apos; voting records for you</li>
            <li>
              Ask questions anytime — you&apos;re having a conversation, not
              taking a test
            </li>
            <li>
              At the end, you&apos;ll get a summary you can write down or print
              to take to the polls
            </li>
            <li>
              <strong>AI can make mistakes.</strong> This is a research starting
              point — verify important info with official sources.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "1rem",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          <p>
            Share this tool with friends and family — the more informed voters,
            the better our elections get.
          </p>
          <p style={{ marginTop: "0.25rem" }}>
            Created by a human using AI tools.
          </p>
        </footer>
      </main>
    </>
  );
}
