"use client";

import { useState } from "react";
import {
  CANONICAL_ISSUES,
  type ConfirmedConcerns,
} from "@/lib/canonicalIssues";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface MatchedIssue {
  issue: string;
  quote: string;
  confidence: "high" | "medium" | "low";
}

interface DisambiguationResponse {
  interpretation: string;
  matchedIssues: MatchedIssue[];
  unmatched: string[];
}

interface ConcernDisambiguationProps {
  onConcernsConfirmed: (concerns: ConfirmedConcerns) => void;
}

export function ConcernDisambiguation({
  onConcernsConfirmed,
}: ConcernDisambiguationProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disambig, setDisambig] = useState<DisambiguationResponse | null>(null);
  const [checkedIssues, setCheckedIssues] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setDisambig(null);

    try {
      const res = await fetch("/api/disambiguate-concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernText: trimmed }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? "Disambiguation failed");
      }

      const data = (await res.json()) as DisambiguationResponse;
      setDisambig(data);

      // Pre-check high/medium confidence matches
      const preChecked = new Set<string>(
        data.matchedIssues
          .filter((m) => m.confidence !== "low")
          .map((m) =>
            m.issue
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, ""),
          ),
      );
      setCheckedIssues(preChecked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggleIssue(slug: string) {
    setCheckedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function handleConfirm() {
    setConfirmed(true);
    onConcernsConfirmed({
      freeText: text.trim() || null,
      confirmedIssues: Array.from(checkedIssues),
      skipped: false,
    });
  }

  function handleSkip() {
    setConfirmed(true);
    onConcernsConfirmed({
      freeText: null,
      confirmedIssues: [],
      skipped: true,
    });
  }

  function handleRedo() {
    setDisambig(null);
    setCheckedIssues(new Set());
  }

  if (confirmed) {
    return (
      <div className="concern-disambiguation-confirmed">
        <p className="notice notice-success">
          {checkedIssues.size > 0
            ? `Added ${checkedIssues.size} concern(s) to your profile.`
            : "Concerns step skipped."}
        </p>
      </div>
    );
  }

  return (
    <div className="concern-disambiguation-container">
      <h3 className="concern-disambiguation-title">
        {t.concernDisambiguationTitle}
      </h3>

      {!disambig ? (
        <div className="concern-input-section">
          <p className="concern-privacy-note">{t.concernPrivacyNote}</p>
          <textarea
            className="concern-input"
            data-testid="concern-disambiguation-input"
            placeholder={t.concernDisambiguationPlaceholder}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <div className="concern-input-actions">
            <button
              className="button button-secondary"
              onClick={handleSkip}
              type="button"
            >
              {t.concernSkipButton}
            </button>
            <button
              className="button button-primary"
              data-testid="concern-disambiguation-submit"
              onClick={() => void handleSubmit()}
              disabled={loading || !text.trim()}
              type="button"
            >
              {loading ? "Mapping…" : t.concernDisambiguationSubmit}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="concern-mapping-confirmation"
          data-testid="concern-mapping-confirmation"
        >
          <p className="concern-mapping-title">{t.concernMappingTitle}</p>

          <blockquote className="concern-original-text">
            &ldquo;{text}&rdquo;
          </blockquote>

          {disambig.interpretation && (
            <p className="concern-interpretation">{disambig.interpretation}</p>
          )}

          <div className="concern-issue-list">
            {CANONICAL_ISSUES.map((issue) => {
              const matched = disambig.matchedIssues.find(
                (m) =>
                  m.issue
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "") === issue.slug,
              );
              const isChecked = checkedIssues.has(issue.slug);

              return (
                <label
                  key={issue.key}
                  className={`concern-issue-row ${matched ? "concern-issue-row--matched" : ""}`}
                  data-testid={`concern-mapping-issue-${issue.slug}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleIssue(issue.slug)}
                    aria-checked={isChecked}
                  />
                  <span className="concern-issue-label">{issue.label}</span>
                  {matched && (
                    <span className="concern-issue-quote">
                      — &ldquo;{matched.quote}&rdquo;
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="concern-confirmation-actions">
            <button
              className="button button-ghost"
              onClick={handleRedo}
              type="button"
            >
              Re-enter text
            </button>
            <button
              className="button button-secondary"
              onClick={handleSkip}
              type="button"
            >
              {t.concernSkipButton}
            </button>
            <button
              className="button button-primary"
              data-testid="concern-confirm-button"
              onClick={handleConfirm}
              type="button"
            >
              {t.concernConfirmButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
