"use client";

import { useState } from "react";
import { CANONICAL_ISSUES, slugForIssue } from "@/lib/canonicalIssues";
import type { ConfirmedConcerns, DisambiguatedIssue } from "@/lib/types";

type DisambiguateApiResponse = {
  interpretation: string;
  matchedIssues: DisambiguatedIssue[];
  unmatched: string[];
  error?: string;
};

type ConcernDisambiguationProps = {
  onConfirm: (concerns: ConfirmedConcerns) => void;
};

export function ConcernDisambiguation({
  onConfirm,
}: ConcernDisambiguationProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [matchedIssues, setMatchedIssues] = useState<DisambiguatedIssue[]>([]);
  const [checkedIssues, setCheckedIssues] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/disambiguate-concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernText: text }),
      });
      const data = (await res.json()) as DisambiguateApiResponse;

      if (!res.ok || data.error) {
        setError(
          data.error ?? "Failed to process your concerns. Please try again.",
        );
        return;
      }

      setInterpretation(data.interpretation);
      setMatchedIssues(data.matchedIssues ?? []);
      // Pre-check matched issues
      setCheckedIssues(new Set(data.matchedIssues?.map((m) => m.issue) ?? []));
      setShowConfirmation(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleIssue(issue: string) {
    setCheckedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issue)) {
        next.delete(issue);
      } else {
        next.add(issue);
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirm({
      freeText: text.trim() || null,
      confirmedIssues: Array.from(checkedIssues),
      skipped: false,
    });
  }

  function handleSkip() {
    onConfirm({
      freeText: null,
      confirmedIssues: [],
      skipped: true,
    });
  }

  function handleEdit() {
    setShowConfirmation(false);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Anything specific you want the AI to know about your priorities?
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          For example: &ldquo;I rent and can&apos;t afford housing in my
          city,&rdquo; or &ldquo;my kid has Type 1 diabetes.&rdquo; We&apos;ll
          map this to issues we track.
        </p>
      </div>

      {!showConfirmation ? (
        <div className="space-y-3">
          <textarea
            data-testid="concern-disambiguation-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what matters most to you..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            aria-label="Describe your concerns"
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Skip this step
            </button>
            <button
              data-testid="concern-disambiguation-submit"
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-5 py-2 text-sm min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? "Analyzing…" : "Map my concerns"}
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="concern-mapping-confirmation"
          className="space-y-4 bg-gray-50 border border-gray-200 rounded-xl p-4"
        >
          <div>
            <p className="text-sm font-semibold text-gray-700">We heard:</p>
            <blockquote className="text-sm text-gray-600 italic mt-1 pl-3 border-l-2 border-gray-300">
              &ldquo;{text}&rdquo;
            </blockquote>
          </div>

          {interpretation && (
            <p className="text-sm text-gray-500">{interpretation}</p>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Mapping to issues we track:
            </p>
            <ul className="space-y-2">
              {/* Matched issues first */}
              {matchedIssues.map((m) => {
                const slug = slugForIssue(m.issue);
                const checked = checkedIssues.has(m.issue);
                return (
                  <li key={m.issue}>
                    <label
                      className="flex items-start gap-2 cursor-pointer"
                      data-testid={`concern-mapping-issue-${slug}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIssue(m.issue)}
                        aria-checked={checked}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-800">
                        <strong>{m.issue}</strong>
                        {m.quote && (
                          <span className="text-gray-500 ml-1">
                            — &ldquo;{m.quote}&rdquo;
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
              {/* Unmatched canonical issues the user can optionally add */}
              {CANONICAL_ISSUES.filter(
                (ci) => !matchedIssues.find((m) => m.issue === ci.key),
              )
                .filter((ci) => checkedIssues.has(ci.key))
                .map((ci) => (
                  <li key={ci.key}>
                    <label
                      className="flex items-start gap-2 cursor-pointer"
                      data-testid={`concern-mapping-issue-${ci.slug}`}
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleIssue(ci.key)}
                        aria-checked={true}
                        className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-800">
                        <strong>{ci.key}</strong>
                        <span className="text-gray-400 ml-1">(you added)</span>
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleEdit}
              className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Edit
            </button>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Skip mapping
            </button>
            <button
              data-testid="concern-confirm-button"
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-5 py-2 text-sm min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Confirm and continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
