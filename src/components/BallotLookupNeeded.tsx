"use client";

import React, { useState, useCallback, useRef } from "react";
// NEEDS-KEY: errors.noContested* — redesign is EN-only; the prototype's
// NoContestedView (docs/design/2026-redesign/prototype/prototype-screens-c.jsx
// :215-378) drives this layout verbatim. ES strings noted inline per key.
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
  // Drives the big "Choose a .txt or .pdf file" dropzone button (the upload
  // card is the PRIMARY path per the prototype) — clicking it opens the
  // hidden native file input.
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      className="mx-auto my-6 w-full max-w-[640px] bg-paper-2 border border-rule rounded-xl p-6 md:p-9 shadow-[var(--shadow-card)]"
    >
      <header className="mb-5">
        {/* NEEDS-KEY: errors.noContestedEyebrow — EN "Sample ballot needed"
            / ES "Boleta de muestra requerida" (prototype-screens-c.jsx:285) */}
        <span className="inline-block font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic bg-civic-soft rounded px-2 py-1 mb-4">
          Sample ballot needed
        </span>
        {/* errors.noContestedTitle — EN below / ES "No pudimos confirmar tu boleta" */}
        <h2 className="font-serif text-[28px] md:text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink">
          We couldn&rsquo;t auto-confirm your ballot
        </h2>
        {/* errors.noContestedBody — verbatim from prototype-i18n.jsx:70-71 /
            ES "Civic no devolvió contiendas para tu dirección. Busca tu boleta
            de muestra abajo, luego pégala o súbela para saber qué contiendas
            investigar." */}
        <p className="mt-3.5 text-[15px] leading-[1.55] text-ink-2">
          Civic returned no contested races for your address. Look up your
          sample ballot below, then paste or upload it so we know which races to
          research.
        </p>
      </header>

      {/* Lookup links — bordered link cards per prototype .nc-links
          (prototype-c.css:308-314). */}
      <ul className="mb-[22px] grid gap-2 list-none p-0">
        <li>
          <a
            data-testid="ballot-lookup-link-state"
            href={state.resources.sampleBallotLookup}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3.5 py-3 border border-rule rounded-lg bg-paper font-medium text-[14px] text-civic hover:border-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors"
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
            className="block px-3.5 py-3 border border-rule rounded-lg bg-paper font-medium text-[14px] text-civic hover:border-civic hover:bg-[oklch(0.97_0.018_170)] transition-colors"
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

      {/* PRIMARY path — upload. Big dashed-civic dropzone button so the user
          can't miss it; placed ABOVE paste because uploading a county PDF is
          faster + lower-friction. Faithful to prototype-screens-c.jsx:303-336
          (.nc-upload-card). */}
      <div className="bg-paper border border-rule rounded-[10px] p-[18px] mb-3">
        <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">
          <span className="inline-grid place-items-center w-[22px] h-[22px] bg-civic text-paper-2 rounded-full font-mono text-[11px] font-bold tracking-normal">
            1
          </span>
          {/* NEEDS-KEY: errors.noContestedUploadHeading — EN "Upload your sample ballot" / ES "Sube tu boleta de muestra" */}
          <span>Upload your sample ballot</span>
        </div>
        <button
          type="button"
          disabled={isPdfLoading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3.5 w-full px-[18px] py-4 bg-paper-2 border-2 border-dashed border-civic rounded-[10px] cursor-pointer text-left text-ink hover:bg-[oklch(0.97_0.018_170)] hover:border-solid disabled:opacity-60 disabled:cursor-not-allowed transition-colors max-[600px]:flex-col max-[600px]:items-start"
        >
          <span
            className="inline-grid place-items-center w-11 h-11 shrink-0 rounded-full bg-civic text-paper-2"
            aria-hidden="true"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>
          <span className="flex flex-col gap-[3px] min-w-0">
            {/* NEEDS-KEY: errors.noContestedUploadMain — EN "Choose a .txt or .pdf file" */}
            <span className="font-serif font-semibold text-[17px] text-ink">
              {isPdfLoading
                ? "Reading your ballot…"
                : "Choose a .txt or .pdf file"}
            </span>
            {/* NEEDS-KEY: errors.noContestedUploadSub — EN below */}
            <span className="text-[13px] text-ink-3 leading-[1.45]">
              From your county elections office, or any sample ballot text
            </span>
          </span>
        </button>
        <input
          ref={fileInputRef}
          data-testid="ballot-lookup-upload"
          type="file"
          accept=".txt,.pdf,text/plain,application/pdf"
          className="hidden"
          disabled={isPdfLoading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <StatusMessages
          isPdfLoading={isPdfLoading}
          uploadNotice={uploadNotice}
          uploadError={uploadError}
        />
      </div>

      {/* OR divider (prototype .nc-or). */}
      <div className="flex items-center text-center my-[18px] font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-3">
        <span className="flex-1 h-px bg-rule" />
        <span className="px-3.5">or</span>
        <span className="flex-1 h-px bg-rule" />
      </div>

      {/* SECONDARY path — paste. Below upload because typing/pasting is slower
          and more error-prone. Faithful to prototype-screens-c.jsx:343-364
          (.nc-paste-card). */}
      <div className="bg-paper border border-rule rounded-[10px] p-[18px]">
        <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 mb-3">
          <span className="inline-grid place-items-center w-[22px] h-[22px] bg-civic text-paper-2 rounded-full font-mono text-[11px] font-bold tracking-normal">
            2
          </span>
          {/* NEEDS-KEY: errors.noContestedPasteHeading — EN "Paste the ballot text instead" / ES "Pega el texto de la boleta" */}
          <span>Paste the ballot text instead</span>
        </div>
        <textarea
          data-testid="ballot-lookup-textarea"
          value={text}
          onChange={handleTextChange}
          rows={7}
          maxLength={12000}
          placeholder="Paste text copied from your official sample ballot here..."
          aria-label="Paste your sample ballot text"
          className="w-full bg-paper-2 border border-rule rounded-lg px-3.5 py-3 font-serif text-[14px] text-ink focus:border-civic focus:outline-none transition-colors placeholder:text-ink-3 resize-y min-h-[140px] mb-3"
        />
        <button
          data-testid="ballot-lookup-confirm"
          type="button"
          disabled={!canSubmit || isPdfLoading}
          onClick={handleSubmit}
          className="w-full flex justify-center bg-civic text-paper-2 px-5 py-3 text-[14px] font-semibold rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed transition-colors"
        >
          Use this ballot
        </button>
      </div>

      {/* NEEDS-KEY: errors.noContestedPrivacy — verbatim from
          prototype-screens-c.jsx:369 / ES "Privacidad: no pegues tu nombre,
          dirección, teléfono ni correo — solo el texto de la boleta." */}
      <p className="mt-[18px] pt-3.5 border-t border-dashed border-rule-2 text-[12.5px] italic text-ink-3">
        Privacy: don&rsquo;t paste your name, address, phone, or email &mdash;
        only the ballot text.
      </p>
    </section>
  );
}
