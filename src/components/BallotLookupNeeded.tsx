"use client";

import React, { useState, useCallback, useRef } from "react";
import type { StateElectionData } from "../types/election";
import { isPdfFile, isTextFile } from "../lib/pdf-extract";
import { ballotJsonToText } from "../lib/ballot-json-to-text";
import type { BallotExtraction } from "../lib/server/extract-types";

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
 * Phase 6 (extract-ballot) — PDF uploads route through `/api/extract-ballot`
 * (server-side: pdfjs cheap path + Sonnet-vision escalation). The server
 * returns structured JSON; we adapt that to the plaintext shape the existing
 * prompt-fleet expects (via `ballotJsonToText`). On extraction failure we
 * surface the inline error and the manual paste textarea remains the floor
 * for everything that can't be auto-read.
 *
 * The legacy client-side tesseract.js path is gone for the English locale;
 * Spanish locale stays on `UserSampleBallotInput` (legacy widget) until UX
 * post-translation work — see the TODO in `UserSampleBallotInput.tsx`.
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
   *
   * `extraction` is the structured BallotExtraction returned by
   * `/api/extract-ballot` when the source was a PDF upload — the parent
   * persists this on a dedicated slot so the workspace race list can
   * derive from it without round-tripping through the lossy text parser.
   * Hand-pasted ballots and .txt uploads pass `undefined` for this arg;
   * the legacy text path still handles them.
   */
  onBallotConfirmed: (
    ballotText: string,
    extraction?: BallotExtraction | null,
  ) => void;
}

// Note: the local `ExtractMeta` / `ExtractResponse` interfaces that used to
// live here were stale after PR #58 — they declared `cost_usd: number` as
// required on `_meta`, but the server's `/api/extract-ballot` response only
// ships `PublicExtractMeta` (extraction_path / pages / latency_ms / optional
// cache_hit). Dropped both: `extractBallotPdf` now returns `BallotExtraction`
// directly (the canonical type from `src/lib/server/extract-types.ts`), and
// the local consumers (`ballotJsonToText`, `extractionRef`) only ever read
// `election_metadata` + `sections` — never `_meta`.

const SESSION_ID_STORAGE_KEY = "voter-choice:sessionId";

function getStoredSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function extractBallotPdf(file: File): Promise<BallotExtraction> {
  const formData = new FormData();
  formData.append("file", file);
  const sessionId = getStoredSessionId();
  const headers: HeadersInit = {};
  if (sessionId) headers["x-session-id"] = sessionId;
  const res = await fetch("/api/extract-ballot", {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = typeof body?.error === "string" ? body.error : "";
    } catch {
      // ignore
    }
    const err = new Error(detail || `Extraction failed (HTTP ${res.status})`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json() as Promise<BallotExtraction>;
}

interface StatusMessagesProps {
  isPdfLoading: boolean;
  uploadNotice: string | null;
  uploadError: string | null;
}

function StatusMessages({
  isPdfLoading,
  uploadNotice,
  uploadError,
}: StatusMessagesProps) {
  if (isPdfLoading) {
    return (
      <p
        data-testid="ballot-lookup-loading"
        className="mt-3 text-xs text-ink-3"
        role="status"
      >
        {uploadNotice ??
          "Reading your ballot — this can take 10–30 seconds for a typical ballot, longer for long ballots."}
      </p>
    );
  }
  if (uploadError) {
    return (
      <p
        data-testid="ballot-lookup-upload-error"
        className="mt-3 text-xs text-vote-red"
        role="alert"
      >
        {uploadError}
      </p>
    );
  }
  if (uploadNotice) {
    return (
      <p
        data-testid="ballot-lookup-upload-notice"
        className="mt-3 text-xs text-ink-3"
        role="status"
      >
        {uploadNotice}
      </p>
    );
  }
  return null;
}

interface CountyDisplay {
  link: string;
  label: string;
  instructions?: string;
}

function deriveCountyDisplay(
  state: StateElectionData,
  county: string | undefined,
): CountyDisplay {
  const resource = county ? state.countyResources?.[county] : undefined;
  const link = resource?.ballotLookup ?? state.resources.countyElectionLookup;
  let label: string;
  if (resource?.name) {
    label = `${resource.name} elections office`;
  } else if (county) {
    label = `${county} elections office`;
  } else {
    label = `${state.stateName} county elections office`;
  }
  return {
    link,
    label,
    instructions: resource?.ballotLookupInstructions,
  };
}

export function BallotLookupNeeded({
  state,
  county,
  onBallotConfirmed,
}: BallotLookupNeededProps) {
  const [text, setText] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Hold the structured BallotExtraction from `/api/extract-ballot` so we
  // can hand it back to the parent on Confirm alongside the serialized
  // text. Cleared when the user manually edits the textarea (the structured
  // payload no longer reflects what's about to be submitted) and when a
  // .txt file is loaded (no extraction available for plaintext uploads).
  const extractionRef = useRef<BallotExtraction | null>(null);

  const countyDisplay = deriveCountyDisplay(state, county);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onBallotConfirmed(trimmed, extractionRef.current);
  }, [canSubmit, onBallotConfirmed, trimmed]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      // Any manual edit invalidates the prior structured extraction —
      // the workspace should fall back to the text path the user just typed.
      extractionRef.current = null;
      setText(e.target.value);
    },
    [],
  );

  const handlePdfFile = useCallback(async (file: File) => {
    setUploadError(null);
    setIsPdfLoading(true);
    setUploadNotice(
      "Reading your ballot — this can take 10–30 seconds for a typical ballot, longer for long ballots.",
    );
    try {
      const result = await extractBallotPdf(file);
      const ballotText = ballotJsonToText(result);
      if (!ballotText) {
        setUploadError(
          "We couldn't read this PDF automatically. Try pasting your ballot text below.",
        );
        setUploadNotice(null);
        return;
      }
      // Park the structured extraction so the parent can derive workspace
      // races directly from it (bypassing the lossy text round-trip).
      extractionRef.current = result;
      setText(ballotText);
      setUploadNotice(
        "Ballot extracted — review the text below, then click Use this ballot.",
      );
    } catch (err) {
      console.error("[ballot-lookup-needed] extract failed", err);
      setUploadError(
        "We couldn't read this PDF automatically. Try pasting your ballot text below.",
      );
      setUploadNotice(null);
    } finally {
      setIsPdfLoading(false);
    }
  }, []);

  const handleTextFile = useCallback((file: File) => {
    setUploadError(null);
    // .txt uploads don't carry a structured extraction — clear any prior
    // payload so the parent falls back to the text-paste path.
    extractionRef.current = null;
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

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setUploadError(null);
      if (isPdfFile(file)) {
        await handlePdfFile(file);
        return;
      }
      if (!isTextFile(file)) {
        setUploadError(
          "Upload a .txt or .pdf file, or paste the ballot text into the box below.",
        );
        return;
      }
      handleTextFile(file);
    },
    [handlePdfFile, handleTextFile],
  );

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
        {/* Fix 2 — lookup links render sentence-case sans body text
            per the audit polish sweep. Mono uppercase is reserved for
            eyebrow / section-divider micro-labels, not navigational
            anchors that read as body content. */}
        <li>
          <a
            data-testid="ballot-lookup-link-state"
            href={state.resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[14px] font-medium text-civic underline decoration-civic-soft underline-offset-4 hover:decoration-civic"
          >
            Find your sample ballot ({state.stateName}) &rarr;
          </a>
        </li>
        <li>
          <a
            data-testid="ballot-lookup-link-county"
            href={countyDisplay.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-[14px] font-medium text-civic underline decoration-civic-soft underline-offset-4 hover:decoration-civic"
          >
            {countyDisplay.label} &rarr;
          </a>
          {countyDisplay.instructions && (
            <p className="mt-1 text-xs text-ink-3">
              {countyDisplay.instructions}
            </p>
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
          onChange={handleTextChange}
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
          disabled={!canSubmit || isPdfLoading}
          onClick={handleSubmit}
          className="bg-civic text-paper-2 px-4 py-3 text-[13.5px] font-semibold rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed transition-colors"
        >
          Use this ballot
        </button>
        {/* Fix 2 — upload affordance renders sentence-case sans per
            audit polish sweep. */}
        <label
          className={`font-sans text-[14px] font-medium text-civic hover:underline ${
            isPdfLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"
          }`}
        >
          {isPdfLoading ? "Reading your ballot…" : "Upload .txt or .pdf"}
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
      <StatusMessages
        isPdfLoading={isPdfLoading}
        uploadNotice={uploadNotice}
        uploadError={uploadError}
      />
    </section>
  );
}
