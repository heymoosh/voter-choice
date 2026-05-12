"use client";

import { useState, useCallback } from "react";
import {
  CANONICAL_ISSUES,
  ConfirmedConcerns,
  getIssueLabel,
} from "@/lib/canonicalIssues";

interface DisambiguateResponse {
  matchedIssues: string[];
  rationale: string;
}

interface ConcernDisambiguationProps {
  onConfirm: (concerns: ConfirmedConcerns) => void;
  onSkip: () => void;
}

export default function ConcernDisambiguation({
  onConfirm,
  onSkip,
}: ConcernDisambiguationProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<DisambiguateResponse | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/disambiguate-concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      const data: DisambiguateResponse = await res.json();
      setMapping(data);
      setSelectedIssues(data.matchedIssues);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze concerns",
      );
    } finally {
      setIsLoading(false);
    }
  }, [text]);

  const toggleIssue = useCallback((slug: string) => {
    setSelectedIssues((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm({
      primaryIssues: selectedIssues,
      originalText: text.trim(),
      rationale: mapping?.rationale ?? "",
      skipped: false,
    });
  }, [selectedIssues, text, mapping, onConfirm]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Anything specific on your mind?
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Describe what you care about in your own words. The AI will map it to
          relevant issues for the research assistant.
        </p>
        <p className="text-xs text-gray-400 mt-1 italic">
          e.g., &ldquo;I rent and can&apos;t afford housing in my city&rdquo; or
          &ldquo;my kid has Type 1 diabetes&rdquo;
        </p>
      </div>

      {!mapping ? (
        <div className="space-y-3">
          <textarea
            data-testid="concern-disambiguation-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your concern here..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded p-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              data-testid="concern-disambiguation-submit"
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Analyzing..." : "Analyze My Concerns"}
            </button>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div data-testid="concern-mapping-confirmation" className="space-y-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-900 mb-1">
              AI Interpretation
            </p>
            <p className="text-sm text-blue-800">{mapping.rationale}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Confirm the issues that match your concern:
            </p>
            <div className="space-y-2">
              {CANONICAL_ISSUES.map((issue) => {
                const isChecked = selectedIssues.includes(issue.slug);
                const isHighlighted = mapping.matchedIssues.includes(
                  issue.slug,
                );
                return (
                  <label
                    key={issue.slug}
                    data-testid={`concern-mapping-issue-${issue.slug}`}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIssue(issue.slug)}
                      aria-checked={isChecked}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-800">
                      {getIssueLabel(issue.slug)}
                    </span>
                    {isHighlighted && (
                      <span className="text-xs text-blue-600 ml-auto">
                        AI matched
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              data-testid="concern-confirm-button"
              onClick={handleConfirm}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Confirm ({selectedIssues.length} issue
              {selectedIssues.length !== 1 ? "s" : ""} selected)
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
