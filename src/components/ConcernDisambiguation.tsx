"use client";

import React, { useState, useCallback } from "react";
import {
  makeConfirmedConcerns,
  makeSkippedConcerns,
  type ConfirmedConcerns,
  type DisambiguationResult,
  type DisambiguationMatch,
} from "@/lib/confirmedConcerns";
import { LABEL_TO_KEY } from "@/lib/canonicalIssues";

interface ConcernDisambiguationProps {
  onConfirm: (concerns: ConfirmedConcerns) => void;
  labels?: {
    heading?: string;
    placeholder?: string;
    submitButton?: string;
    skipButton?: string;
    confirmButton?: string;
    editButton?: string;
    weHeard?: string;
    mappingTo?: string;
    noMatchesFound?: string;
  };
}

type Step =
  | { type: "input" }
  | { type: "loading" }
  | {
      type: "confirmation";
      freeText: string;
      result: DisambiguationResult;
      checked: Set<string>;
    }
  | { type: "error"; message: string };

export default function ConcernDisambiguation({
  onConfirm,
  labels = {},
}: ConcernDisambiguationProps) {
  const [step, setStep] = useState<Step>({ type: "input" });
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    setStep({ type: "loading" });
    try {
      const res = await fetch("/api/disambiguate-concerns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernText: text }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as DisambiguationResult;
      const initialChecked = new Set<string>(
        data.matchedIssues.map((m) => m.issue),
      );
      setStep({
        type: "confirmation",
        freeText: text,
        result: data,
        checked: initialChecked,
      });
    } catch {
      setStep({
        type: "error",
        message:
          "Could not reach the disambiguation service. Try again or skip.",
      });
    }
  }, [inputValue]);

  const handleSkip = useCallback(() => {
    onConfirm(makeSkippedConcerns());
  }, [onConfirm]);

  const handleEdit = useCallback(() => {
    setStep({ type: "input" });
  }, []);

  const handleToggle = useCallback((issue: string) => {
    setStep((prev) => {
      if (prev.type !== "confirmation") return prev;
      const next = new Set(prev.checked);
      if (next.has(issue)) {
        next.delete(issue);
      } else {
        next.add(issue);
      }
      return { ...prev, checked: next };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (step.type !== "confirmation") return;
    const confirmedIssues = Array.from(step.checked);
    onConfirm(makeConfirmedConcerns(step.freeText, confirmedIssues));
  }, [step, onConfirm]);

  if (step.type === "input" || step.type === "error") {
    return (
      <section aria-labelledby="concern-heading" className="space-y-3">
        <h3
          id="concern-heading"
          className="text-lg font-semibold text-gray-900"
        >
          {labels.heading ?? "Anything else on your mind?"}
        </h3>
        {step.type === "error" && (
          <div
            role="alert"
            className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2"
          >
            {step.message}
          </div>
        )}
        <textarea
          data-testid="concern-disambiguation-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            labels.placeholder ??
            "e.g. 'I rent and can't afford housing in my city,' or 'my kid has Type 1 diabetes'"
          }
          rows={3}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          aria-label="Describe your specific concerns"
        />
        <div className="flex gap-3 flex-wrap">
          <button
            data-testid="concern-disambiguation-submit"
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {labels.submitButton ?? "Map to issues"}
          </button>
          <button
            onClick={handleSkip}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px]"
          >
            {labels.skipButton ?? "Skip — just use my rankings"}
          </button>
        </div>
      </section>
    );
  }

  if (step.type === "loading") {
    return (
      <div
        className="py-4 text-sm text-gray-500"
        aria-live="polite"
        role="status"
      >
        <span className="animate-pulse">Analyzing your concerns…</span>
      </div>
    );
  }

  // confirmation step
  const { freeText, result, checked } = step;
  const allIssues: DisambiguationMatch[] =
    result.matchedIssues.length > 0 ? result.matchedIssues : [];

  return (
    <section
      data-testid="concern-mapping-confirmation"
      aria-labelledby="concern-confirm-heading"
      className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50"
    >
      <h3
        id="concern-confirm-heading"
        className="text-base font-semibold text-gray-900"
      >
        {labels.weHeard ?? "We heard:"}
      </h3>
      <blockquote className="text-sm text-gray-700 italic border-l-2 border-blue-300 pl-3">
        {freeText}
      </blockquote>

      {allIssues.length > 0 ? (
        <>
          <p className="text-sm text-gray-600">
            {labels.mappingTo ?? "Mapping to issues we track:"}
          </p>
          <fieldset>
            <legend className="sr-only">Select which issues to include</legend>
            <div className="space-y-2">
              {allIssues.map((match) => {
                const slug =
                  LABEL_TO_KEY[match.issue] ??
                  match.issue.toLowerCase().replace(/\s+/g, "-");
                return (
                  <label
                    key={match.issue}
                    data-testid={`concern-mapping-issue-${slug}`}
                    className="flex items-start gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(match.issue)}
                      onChange={() => handleToggle(match.issue)}
                      aria-checked={checked.has(match.issue)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-gray-800">
                        {match.issue}
                      </span>
                      {match.quote && (
                        <span className="text-gray-500">
                          {" "}
                          — &ldquo;{match.quote}&rdquo;
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          {labels.noMatchesFound ??
            "No specific issues detected. You can add issues manually or skip."}
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          data-testid="concern-confirm-button"
          onClick={handleConfirm}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px]"
        >
          {labels.confirmButton ?? "Confirm and continue"}
        </button>
        <button
          onClick={handleEdit}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px]"
        >
          {labels.editButton ?? "Edit my response"}
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm min-h-[44px] underline"
        >
          {labels.skipButton ?? "Skip mapping"}
        </button>
      </div>
    </section>
  );
}
