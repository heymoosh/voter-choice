"use client";

/**
 * LoadingView
 *
 * Address → ballot-loading state. Shown after the user submits their address
 * and while the app is geocoding, precinct lookup, race fetch, and donor history
 * load in parallel. Animates through each step sequentially, then calls `onDone`
 * when all steps finish.
 *
 * Source: docs/design/2026-redesign/prototype/prototype-views.jsx — LoadingView
 * Target: src/components/LoadingView.tsx (new — Phase 3, COMPONENT_MAP §2)
 *
 * Intended mount point: conditionally rendered by BallotToolClient (or its
 * host) while the civic/ballot fetch is in-flight, replacing the AddressInput
 * form. Pass the canonical address string for display and `onDone` to hand off
 * back to the workspace once the real data is ready.
 *
 *   {phase === "loading" && (
 *     <LoadingView address={submittedAddress} onDone={() => setPhase("workspace")} />
 *   )}
 *
 * Note: the prototype's LoadingView calls its own `onDone` on a timer for demo
 * purposes. In the real app the parent drives the transition — call `onDone`
 * when your fetch resolves rather than wiring up the internal timer.
 */

import React, { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadingViewProps {
  /** The address string to display under the heading. */
  address: string;
  /**
   * Called after all steps finish animating.
   * In the real app, call this when your data fetch resolves instead of
   * relying on the internal step timer.
   */
  onDone: () => void;
  /**
   * When true, the component manages its own step-timer for demo/testing.
   * When false (default for production), the parent controls when `onDone`
   * is called and the steps animate as a purely visual indicator.
   */
  selfAdvance?: boolean;
}

// ---------------------------------------------------------------------------
// Loading steps
// These mirror the prototype exactly and are sourced from the `loadingSteps`
// keys in translations.ts (consumed via useLanguage() inside the component).
// ---------------------------------------------------------------------------

const STEP_INTERVAL_MS = 600;
const DONE_DELAY_MS = 350;

// ---------------------------------------------------------------------------
// Inline AppNav — mirrors PageContent.tsx AppNav (no i18n needed here,
// kept minimal so LoadingView is self-contained).
// ---------------------------------------------------------------------------

function AppNav() {
  return (
    <header
      role="banner"
      className="flex items-center justify-between px-4 md:px-14 py-5 w-full bg-paper border-b border-rule-2"
    >
      <Link
        href="/"
        className="flex items-center gap-[10px] font-serif font-semibold text-[19px] tracking-[-0.01em] text-ink cursor-pointer no-underline"
        aria-label="Voter Choice — home"
      >
        <span
          aria-hidden="true"
          className="inline-grid place-items-center w-[22px] h-[22px] bg-civic text-paper-2 rounded-[4px] font-serif font-semibold text-[14px]"
        >
          V
        </span>
        <span>Voter Choice</span>
      </Link>
      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-7 text-[14px] text-ink-2"
      >
        <a href="#how-it-works" className="hover:text-ink transition-colors">
          How it works
        </a>
        <a href="#the-record" className="hover:text-ink transition-colors">
          The record
        </a>
        <a href="#about" className="hover:text-ink transition-colors">
          About
        </a>
      </nav>
      <LanguageToggle variant="inline" />
    </header>
  );
}

// ---------------------------------------------------------------------------
// LoadingView
// ---------------------------------------------------------------------------

export function LoadingView({
  address,
  onDone,
  selfAdvance = true,
}: LoadingViewProps) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [step, setStep] = useState(0);

  // Step labels — consume the existing `loadingSteps` keys in translations.ts.
  const steps = [
    t.loadingSteps.stepGeocode,
    t.loadingSteps.stepPrecinct,
    t.loadingSteps.stepRaces,
    t.loadingSteps.stepDonors,
  ];

  useEffect(() => {
    // Always animate the step checklist forward so the card reads as
    // actively "processing your ballot" — even in production where the
    // PARENT (not this internal timer) decides when the real civic/ballot
    // fetch resolves and unmounts us. Only the `onDone` CALL is gated on
    // `selfAdvance`; the visual step progression runs regardless. Without
    // this, `selfAdvance=false` froze all four steps at "pending" and the
    // screen flashed by as a lifeless static card (live-review fix 2026-05).
    if (step >= steps.length) {
      // All four steps revealed. The self-advancing demo/test path hands
      // control back via onDone; the parent-driven production path holds
      // this "all done" frame (spinner still turning) until the awaited
      // fetch resolves and the parent swaps to the next view.
      if (!selfAdvance) return;
      const t = setTimeout(onDone, DONE_DELAY_MS);
      return () => clearTimeout(t);
    }
    const id = setTimeout(() => setStep((s) => s + 1), STEP_INTERVAL_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selfAdvance]);

  return (
    <>
      <AppNav />
      {/* loading-screen: full viewport centred */}
      <div
        data-testid="loading-view"
        className="min-h-[calc(100vh-80px)] grid place-items-center px-14 py-20"
      >
        {/* loading-card */}
        <div className="max-w-[520px] w-full text-center">
          {/* Spinner — pulse element from prototype */}
          <div
            aria-hidden="true"
            className={[
              "w-16 h-16 mx-auto mb-7",
              "rounded-full",
              "border-2 border-civic-soft border-t-civic",
              "animate-spin",
            ].join(" ")}
            style={{
              animationDuration: "1.1s",
              animationTimingFunction: "linear",
            }}
          />

          {/* Heading */}
          <h2 className="font-serif font-semibold text-[32px] tracking-[-0.015em] text-ink m-0 mb-3">
            {t.loadingSteps.pullBallotHeading}
          </h2>

          {/* Address display — monospace pill */}
          <div
            className={[
              "font-mono text-[13px] text-ink-2",
              "bg-paper-2 border border-rule rounded-lg",
              "px-[18px] py-[10px]",
              "inline-block mb-[22px]",
            ].join(" ")}
          >
            {address}
          </div>

          {/* Step list */}
          <ul
            className={[
              "list-none m-0 p-0",
              "flex flex-col gap-[10px]",
              "font-mono text-[12.5px] uppercase tracking-[0.12em] text-ink-3",
            ].join(" ")}
            role="status"
            aria-live="polite"
            aria-label={t.loading}
          >
            {steps.map((label, i) => {
              const isDone = i < step;
              const isActive = i === step;
              return (
                <li
                  key={i}
                  className={[
                    "flex items-center justify-center gap-[10px]",
                    isDone ? "text-ink" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {/* Check circle */}
                  <span
                    className={[
                      "w-3 h-3 rounded-full shrink-0",
                      isDone
                        ? // Done: filled civic circle with checkmark
                          "bg-civic border-civic border-[1.5px] relative"
                        : isActive
                          ? // Active: spinning ring
                            "border-[1.5px] border-civic border-t-transparent rounded-full animate-spin"
                          : // Pending: empty rule-coloured ring
                            "border-[1.5px] border-rule",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      isDone
                        ? // Checkmark rendered via CSS — approximate the prototype's
                          // ::after pseudo-element via inline SVG icon instead
                          {}
                        : isActive
                          ? {
                              animationDuration: "0.9s",
                              animationTimingFunction: "linear",
                            }
                          : {}
                    }
                    aria-hidden="true"
                  >
                    {isDone && (
                      // Inline check — replicates .done .ck::after
                      <svg
                        viewBox="0 0 12 12"
                        className="absolute inset-0 w-full h-full"
                        fill="none"
                        stroke="var(--paper-2)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="2.5,6 5,8.5 9.5,3.5" />
                      </svg>
                    )}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
