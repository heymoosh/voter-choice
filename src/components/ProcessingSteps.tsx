"use client";

import React, { useEffect, useState } from "react";

/**
 * ProcessingSteps
 *
 * Multi-step "the AI is doing real work" progress UI. Faithful port of the
 * prototype's `NoContestedProcessing`
 * (docs/design/2026-redesign/prototype/prototype-screens-c.jsx:380-427 +
 * `.nc-proc-*` styles in prototype-c.css:1897-2005).
 *
 * Per product direction (2026-05): ballot UPLOAD is fast, so this richer
 * loader is NOT used there — it's used at the genuinely slow step, where the
 * app assesses every candidate against the voter's ranked issues and scores
 * alignment. In this app that work rides the per-race `/api/chat` deep-dive
 * stream (which emits `[RACE_PATTERNS]` + `[ALIGNMENT_SCORES]`), so this
 * component replaces the inline skeleton that previously read
 * "Computing alignment scores…".
 *
 * Self-driven by default: it walks through `steps` on a timer and HOLDS on the
 * last step until it unmounts. Unlike the prototype mock (which auto-completes
 * after the last step), completion here is driven by the real stream closing —
 * the parent swaps in the result and this component unmounts — so we never
 * falsely mark every step done before the work is actually finished. Pass
 * `currentStep` to drive the active index from the parent instead.
 */
export interface ProcessingStepsProps {
  /** Mono micro-label above the heading. */
  eyebrow: string;
  /** Large serif heading. */
  heading: string;
  /** Ordered step labels. */
  steps: string[];
  /** Italic hint paragraph (gold left-border) at the bottom. */
  hint: string;
  /**
   * Parent-driven active step index. Omit to self-advance on a timer (the
   * default for the streaming-assessment use).
   */
  currentStep?: number;
  /** ms between auto-advances when self-driven. */
  stepIntervalMs?: number;
  "data-testid"?: string;
}

export function ProcessingSteps({
  eyebrow,
  heading,
  steps,
  hint,
  currentStep,
  stepIntervalMs = 2200,
  "data-testid": testId,
}: ProcessingStepsProps) {
  const isSelfDriven = currentStep === undefined;
  const stepCount = steps.length;
  const [autoStep, setAutoStep] = useState(0);

  useEffect(() => {
    if (!isSelfDriven || stepCount <= 1) return;
    const id = setInterval(() => {
      setAutoStep((s) => (s >= stepCount - 1 ? s : s + 1));
    }, stepIntervalMs);
    return () => clearInterval(id);
  }, [isSelfDriven, stepCount, stepIntervalMs]);

  const active = isSelfDriven ? autoStep : currentStep;

  return (
    <div className="py-2" data-testid={testId}>
      <header>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic mb-3.5">
          {eyebrow}
        </div>
        <h2 className="font-serif font-semibold text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.015em] text-ink mb-3.5">
          {heading}
        </h2>
      </header>

      <ol className="grid gap-1 list-none p-0 m-0 mb-6">
        {steps.map((step, i) => {
          const status =
            i < active ? "done" : i === active ? "active" : "pending";
          return (
            <li
              key={step}
              data-testid={`processing-step-${i}`}
              data-status={status}
              className={[
                "flex items-center gap-3 px-3.5 py-3.5 rounded-lg border text-[14px] md:text-[15px] leading-[1.4] transition-colors",
                status === "active"
                  ? "bg-[oklch(0.97_0.018_170)] border-civic text-ink font-semibold"
                  : status === "done"
                    ? "bg-paper border-rule-2 text-ink-2"
                    : "bg-paper border-rule-2 text-ink-3",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-grid place-items-center w-7 h-7 shrink-0 rounded-full font-mono text-[14px] font-bold",
                  status === "active"
                    ? "bg-civic text-paper-2"
                    : status === "done"
                      ? "bg-[oklch(0.62_0.13_145)] text-paper-2"
                      : "bg-tag-bg text-ink-3",
                ].join(" ")}
                aria-hidden="true"
              >
                {status === "done" ? (
                  "✓"
                ) : status === "active" ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-paper-2 border-t-transparent animate-spin" />
                ) : (
                  "○"
                )}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>

      <p className="px-4 py-3.5 bg-paper border-l-[3px] border-gold rounded-md text-[13px] leading-[1.55] text-ink-3 italic m-0">
        {hint}
      </p>
    </div>
  );
}
