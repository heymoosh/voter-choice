"use client";

import React, { useState, useCallback } from "react";
import type { StateElectionData } from "../types/election";

/**
 * BallotLookupNeeded — Phase-6 fix-D ("ballot-before-themes").
 *
 * Pre-workspace surface that appears when the user has submitted an address
 * AND the Civic API returned zero contests (no auto-confirmed ballot). It
 * surfaces state-specific sample-ballot lookup links + county elections
 * office links, plus a paste/upload widget. When the user confirms a ballot
 * (paste or .txt upload) we fire `onBallotConfirmed(text)` and the parent
 * transitions to the cold-open theme-extraction step.
 *
 * Rationale: without this gate the cold open extracts themes from text that
 * have no ballot to anchor to — wasting Haiku tokens and confusing the
 * voter. See README for the funnel: address → party gate → Civic check →
 * (this surface if Civic empty) → cold open → workspace.
 *
 * Keep this lightweight: text + .txt upload only. The legacy
 * `UserSampleBallotInput` in ResearchLayout owns the PDF/OCR flow for
 * flag-off users; we deliberately don't duplicate that machinery here.
 */
export interface BallotLookupNeededProps {
  /** State data — source for `resources.sampleBallotLookup` and `countyResources`. */
  state: StateElectionData;
  /**
   * Civic-returned county (or zip-derived fallback) for surfacing the
   * county elections office link with the right label.
   */
  county?: string;
  /**
   * Fires when the user has pasted or uploaded a ballot and clicked
   * "Use this ballot". The parent should set userSampleBallotText and
   * transition out of the needs-ballot state.
   */
  onBallotConfirmed: (ballotText: string) => void;
}

export function BallotLookupNeeded({
  state,
  county,
  onBallotConfirmed,
}: BallotLookupNeededProps) {
  const [text, setText] = useState("");

  const countyResource = county ? state.countyResources?.[county] : undefined;
  const countyLink =
    countyResource?.ballotLookup ?? state.resources.countyElectionLookup;
  const countyLabel = countyResource?.name
    ? `${countyResource.name} elections office`
    : county
      ? `${county} elections office`
      : `${state.stateName} county elections office`;
  const countyInstructions = countyResource?.ballotLookupInstructions;

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onBallotConfirmed(trimmed);
  }, [canSubmit, onBallotConfirmed, trimmed]);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result =
        ((ev as unknown as { target: { result: string } } | null)?.target
          ?.result as string | undefined) ?? "";
      if (typeof result === "string" && result.length > 0) {
        setText(result);
      }
    };
    reader.readAsText(file);
  }, []);

  return (
    <section
      data-testid="ballot-lookup-needed"
      className="mx-auto my-6 max-w-3xl bg-paper-2 border border-rule rounded-xl p-4 md:p-6"
    >
      <header className="mb-4">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">
          We couldn&rsquo;t auto-confirm your ballot
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          Google Civic doesn&rsquo;t have complete data for your address. Look
          up your sample ballot using the links below, then paste or upload it
          so we know which races to research.
        </p>
      </header>

      <ul className="mb-5 space-y-2 text-sm">
        <li>
          <a
            data-testid="ballot-lookup-link-state"
            href={state.resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic underline decoration-civic-soft underline-offset-4 hover:decoration-civic"
          >
            Find your sample ballot ({state.stateName}) &rarr;
          </a>
        </li>
        <li>
          <a
            data-testid="ballot-lookup-link-county"
            href={countyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic underline decoration-civic-soft underline-offset-4 hover:decoration-civic"
          >
            {countyLabel} &rarr;
          </a>
          {countyInstructions && (
            <p className="mt-1 text-xs text-ink-3">{countyInstructions}</p>
          )}
        </li>
      </ul>

      <label className="block">
        <span className="block font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 mb-2">
          Paste your sample ballot text
        </span>
        <textarea
          data-testid="ballot-lookup-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          maxLength={12000}
          placeholder="Paste text copied from your official sample ballot here..."
          className="w-full bg-paper border border-rule rounded-lg px-4 py-3 font-serif text-sm text-ink focus:border-civic focus:outline-none transition-colors placeholder:text-ink-3 resize-y"
        />
      </label>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <button
          data-testid="ballot-lookup-confirm"
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="bg-civic text-paper-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed transition-colors"
        >
          Use this ballot
        </button>
        <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic hover:underline cursor-pointer">
          Upload .txt
          <input
            data-testid="ballot-lookup-upload"
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs italic text-ink-3">
          Privacy: don&rsquo;t paste your name, address, phone, or email.
        </p>
      </div>
    </section>
  );
}
