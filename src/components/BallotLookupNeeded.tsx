"use client";

import React, { useState, useCallback } from "react";
import type { StateElectionData } from "../types/election";
import {
  extractPdfText,
  isPdfFile,
  isTextFile,
  PDF_SCANNED_MIN_CHARS,
} from "../lib/pdf-extract";

/**
 * BallotLookupNeeded — Phase-6 fix-D ("ballot-before-themes").
 *
 * Pre-workspace surface that appears when the user has submitted an address
 * AND the Civic API returned zero contests (no auto-confirmed ballot). It
 * surfaces state-specific sample-ballot lookup links + county elections
 * office links, plus a paste/upload widget. When the user confirms a ballot
 * (paste or .txt/.pdf upload) we fire `onBallotConfirmed(text)` and the parent
 * transitions to the cold-open theme-extraction step.
 *
 * Rationale: without this gate the cold open extracts themes from text that
 * have no ballot to anchor to — wasting Haiku tokens and confusing the
 * voter. See README for the funnel: address → party gate → Civic check →
 * (this surface if Civic empty) → cold open → workspace.
 *
 * Fix for live bug 2 — accept .pdf in addition to .txt. The legacy
 * `UserSampleBallotInput` widget already supports PDF + OCR; we share that
 * machinery via `src/lib/pdf-extract.ts` so both surfaces stay in sync.
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
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  // Inline status notice for the upload widget — surfaces "OCR in
  // progress…", "PDF loaded", or a friendly error message. Keep this
  // separate from validation errors so the textarea/submit button never
  // gets blocked by an upload status.
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    if (isPdfFile(file)) {
      setIsPdfLoading(true);
      setUploadNotice("Extracting text from PDF…");
      try {
        const extracted = await extractPdfText(file, {
          onOcrStart: () =>
            setUploadNotice(
              "Scanned PDF — running OCR. This may take a moment…",
            ),
        });
        if (extracted.length < PDF_SCANNED_MIN_CHARS) {
          // OCR succeeded but the text is too short to be a real ballot
          // — surface a friendly error rather than feeding junk to the
          // theme extractor.
          setUploadError(
            "We couldn't read enough text from that PDF. Try saving the page as text, or paste the ballot text into the box below.",
          );
          setUploadNotice(null);
        } else {
          setText(extracted);
          setUploadNotice(
            "PDF text loaded — review and click Use this ballot.",
          );
        }
      } catch (err) {
        console.error("[ballot-lookup-needed] PDF extract failed", err);
        if (err instanceof Error && err.message === "PDF_LOAD_ERROR") {
          setUploadError(
            "We couldn't load the PDF reader. Refresh and try again, or paste the ballot text directly.",
          );
        } else if (err instanceof Error && err.message === "OCR_FAILED") {
          setUploadError(
            "Couldn't read the scanned PDF. Try a different file or paste the ballot text directly.",
          );
        } else {
          setUploadError(
            "Something went wrong reading that PDF. Try again or paste the ballot text directly.",
          );
        }
        setUploadNotice(null);
      } finally {
        setIsPdfLoading(false);
      }
      return;
    }
    if (!isTextFile(file)) {
      setUploadError(
        "Upload a .txt or .pdf file, or paste the ballot text into the box below.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result =
        ((ev as unknown as { target: { result: string } } | null)?.target
          ?.result as string | undefined) ?? "";
      if (typeof result === "string" && result.length > 0) {
        setText(result);
        setUploadNotice(".txt loaded — review and click Use this ballot.");
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
        {/* PR C — sentence-case sans primary CTA per prototype primary
            treatment. Mono uppercase is reserved for micro-labels. */}
        <button
          data-testid="ballot-lookup-confirm"
          type="button"
          disabled={!canSubmit || isPdfLoading}
          onClick={handleSubmit}
          className="bg-civic text-paper-2 px-4 py-3 text-[13.5px] font-semibold rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed transition-colors"
        >
          Use this ballot
        </button>
        <label
          className={`font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic hover:underline ${
            isPdfLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"
          }`}
        >
          {isPdfLoading ? "Extracting PDF…" : "Upload .txt or .pdf"}
          <input
            data-testid="ballot-lookup-upload"
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            className="sr-only"
            disabled={isPdfLoading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs italic text-ink-3">
          Privacy: don&rsquo;t paste your name, address, phone, or email.
        </p>
      </div>
      {uploadNotice && !uploadError && (
        <p
          data-testid="ballot-lookup-upload-notice"
          className="mt-3 text-xs text-ink-3"
          role="status"
        >
          {uploadNotice}
        </p>
      )}
      {uploadError && (
        <p
          data-testid="ballot-lookup-upload-error"
          className="mt-3 text-xs text-vote-red"
          role="alert"
        >
          {uploadError}
        </p>
      )}
    </section>
  );
}
