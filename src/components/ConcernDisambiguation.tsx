"use client";

import React, { useState } from "react";
import {
  CANONICAL_ISSUES,
  issueKeyToSlug,
  type ConfirmedConcerns,
} from "@/lib/canonicalIssues";

// ---- Types -----------------------------------------------------------------

interface MatchedIssue {
  issue: string;
  quote: string;
  confidence: "high" | "medium" | "low";
}

interface DisambiguationResult {
  interpretation: string;
  matchedIssues: MatchedIssue[];
  unmatched: string[];
}

interface ConcernDisambiguationProps {
  onComplete: (concerns: ConfirmedConcerns) => void;
}

// ---- ConcernDisambiguation -------------------------------------------------

export function ConcernDisambiguation({
  onComplete,
}: ConcernDisambiguationProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DisambiguationResult | null>(null);
  const [checkedIssues, setCheckedIssues] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/disambiguate-concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernText: text }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? `API error: ${response.status}`);
      }

      const data: DisambiguationResult = await response.json();
      setResult(data);
      // Pre-check the matched issues
      const initialChecked = new Set(data.matchedIssues.map((m) => m.issue));
      setCheckedIssues(initialChecked);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleIssue(issueKey: string) {
    setCheckedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issueKey)) {
        next.delete(issueKey);
      } else {
        next.add(issueKey);
      }
      return next;
    });
  }

  function handleConfirm() {
    setConfirmed(true);
    onComplete({
      freeText: text.trim() || null,
      confirmedIssues: Array.from(checkedIssues),
      skipped: false,
    });
  }

  function handleSkip() {
    setConfirmed(true);
    onComplete({
      freeText: null,
      confirmedIssues: [],
      skipped: true,
    });
  }

  function handleRedo() {
    setResult(null);
    setCheckedIssues(new Set());
  }

  if (confirmed) {
    return (
      <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800">
        Concerns saved. The AI will take these into account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Anything specific on your mind?
        </h2>
        <p className="text-sm text-gray-500">
          Optional — describe what you care about in your own words (e.g.,
          &ldquo;I rent and can&rsquo;t afford housing in my city,&rdquo; or
          &ldquo;my kid has Type 1 diabetes&rdquo;). The AI will map it to the
          issues above.
        </p>
      </div>

      {/* Free text entry */}
      {!result && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="concern-text" className="sr-only">
              Describe your concerns
            </label>
            <textarea
              id="concern-text"
              data-testid="concern-disambiguation-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., I rent and can't afford housing in my city. My kid has Type 1 diabetes."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              aria-label="Describe your concerns in your own words"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {text.length}/500 characters
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2"
            >
              {error}
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              data-testid="concern-disambiguation-submit"
              disabled={!text.trim() || loading}
              className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Mapping...
                </span>
              ) : (
                "Map my concerns"
              )}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="px-5 py-2 text-gray-600 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors min-h-[44px]"
            >
              Skip
            </button>
          </div>
        </form>
      )}

      {/* Disambiguation result — confirmation panel */}
      {result && (
        <div
          data-testid="concern-mapping-confirmation"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
          role="region"
          aria-label="AI concern mapping — please review and confirm"
        >
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              We heard:
            </p>
            <blockquote className="text-sm text-blue-800 italic border-l-2 border-blue-300 pl-3">
              &ldquo;{text}&rdquo;
            </blockquote>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              AI interpretation:
            </p>
            <p className="text-sm text-blue-700">{result.interpretation}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Mapping to issues we track — confirm or adjust:
            </p>
            <ul className="space-y-2">
              {/* Show AI-matched issues first */}
              {result.matchedIssues.map((m) => {
                const slug = issueKeyToSlug(m.issue);
                return (
                  <li key={m.issue} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`issue-mapping-${slug}`}
                      data-testid={`concern-mapping-issue-${slug}`}
                      checked={checkedIssues.has(m.issue)}
                      onChange={() => toggleIssue(m.issue)}
                      aria-checked={checkedIssues.has(m.issue)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`issue-mapping-${slug}`}
                      className="text-sm text-gray-800 cursor-pointer"
                    >
                      <span className="font-medium">{m.issue}</span>
                      {m.quote && (
                        <span className="text-gray-500">
                          {" "}
                          — &ldquo;{m.quote}&rdquo;
                        </span>
                      )}
                      <span
                        className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                          m.confidence === "high"
                            ? "bg-green-100 text-green-700"
                            : m.confidence === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {m.confidence}
                      </span>
                    </label>
                  </li>
                );
              })}

              {/* Other issues the user can add */}
              {CANONICAL_ISSUES.filter(
                (i) => !result.matchedIssues.some((m) => m.issue === i.key),
              ).map((ci) => {
                const slug = issueKeyToSlug(ci.key);
                return (
                  <li key={ci.key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={`issue-mapping-${slug}`}
                      data-testid={`concern-mapping-issue-${slug}`}
                      checked={checkedIssues.has(ci.key)}
                      onChange={() => toggleIssue(ci.key)}
                      aria-checked={checkedIssues.has(ci.key)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`issue-mapping-${slug}`}
                      className="text-sm text-gray-500 cursor-pointer"
                    >
                      {ci.key}{" "}
                      <span className="text-xs text-gray-400">
                        (we didn&rsquo;t see a strong signal, but you can add
                        it)
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex gap-3 flex-wrap pt-1">
            <button
              data-testid="concern-confirm-button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors min-h-[44px]"
            >
              Confirm and continue
            </button>
            <button
              onClick={handleRedo}
              className="px-5 py-2 text-gray-600 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors min-h-[44px]"
            >
              Edit
            </button>
            <button
              onClick={handleSkip}
              className="px-5 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors min-h-[44px]"
            >
              Skip mapping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
