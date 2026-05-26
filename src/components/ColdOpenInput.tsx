"use client";

import React, { useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { Theme } from "../lib/prompts/types";

/* ──────────────────────────────────────────────────────────────
 * ColdOpenInput
 *
 * Free-form textarea + Send for the Phase 2 cold open. Rendered when
 * PROMPT_FLEET_V2 is on and locale is `en` (gated by ChatPanel — see
 * .ai/work-packets/redesign-phase-2-free-form-cold-open.md).
 *
 * Owns local textarea state. Parents pass `initialDraft` to preload the
 * box on the "Let me rewrite my message" path. Submit fires onSubmit with
 * the trimmed text — the parent is responsible for actually dispatching
 * the chat request.
 *
 * The "Show me an example" affordance fills the textarea with a localized
 * SAMPLE_LONGFORM string. The "Use a starter profile" chip opens a hidden
 * file input, reads a saved `.txt` voter profile (the artifact produced
 * by BallotToolClient#handleSaveProfile), parses its `## Priorities`
 * section into a `Theme[]`, and emits the payload via
 * `onStarterProfileLoaded` so the parent can transition the cold-open
 * phase machine straight to the themes-confirm step — bypassing Haiku
 * extraction entirely. Parse failures (bad file type, oversize, missing
 * Priorities block) surface a local inline error and leave the cold-open
 * state untouched so the voter can retry or type instead.
 * ────────────────────────────────────────────────────────────── */

/** Max size of a starter profile upload. Mirrors ProfileUpload.tsx. */
const MAX_FILE_SIZE = 10 * 1024;

/**
 * Parse the `## Priorities` block of a saved-profile `.txt` artifact into
 * an ordered list of theme names. Matches the exact format produced by
 * BallotToolClient.tsx#handleSaveProfile: `${rank}. ${name}` per line,
 * one theme per line, between `## Priorities` and the next blank line or
 * `## Decisions` header.
 *
 * Returns `null` when no `## Priorities` block is present OR the section
 * contains no parseable numbered items (e.g., the "(no themes locked)"
 * sentinel). Callers should treat `null` as a friendly error case.
 */
export function parsePrioritiesFromProfile(text: string): string[] | null {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.trim() === "## Priorities");
  if (headerIndex === -1) return null;

  const names: string[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the next markdown section header.
    if (line.startsWith("## ")) break;
    // Skip blank lines (the format uses one between section header and
    // body, plus a trailing blank before the next section).
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // `${rank}. ${name}` — allow any positive integer rank so a manually
    // edited profile with reordered ranks still parses.
    const match = trimmed.match(/^\d+\.\s+(.+)$/);
    if (!match) continue;
    const name = match[1].trim();
    if (name.length === 0) continue;
    names.push(name);
  }
  return names.length > 0 ? names : null;
}

export interface ColdOpenInputProps {
  /** Optional preloaded text — used by the rewrite path to restore the user's draft. */
  initialDraft?: string;
  /** Called with the trimmed text when the user submits. */
  onSubmit: (text: string) => void;
  /**
   * Called when the user uploads a parseable starter profile. The parent
   * is expected to advance the cold-open phase machine to the themes
   * confirmation step using the supplied themes. `originalText` is the
   * raw file contents — currently passed empty so the rewrite path lands
   * the user on a clean textarea (a starter-profile upload is not a
   * "draft" they wrote, so there's nothing to restore).
   */
  onStarterProfileLoaded?: (themes: Theme[], originalText: string) => void;
  /** When true, the textarea and Send are disabled. */
  disabled?: boolean;
  /** When true, the Send button is disabled (request in flight). */
  loading?: boolean;
}

export function ColdOpenInput({
  initialDraft = "",
  onSubmit,
  onStarterProfileLoaded,
  disabled = false,
  loading = false,
}: ColdOpenInputProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;
  const [draft, setDraft] = useState(initialDraft);
  const [starterError, setStarterError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmed = draft.trim();
  const canSubmit = trimmed.length > 0 && !disabled && !loading;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter submits. Plain Enter inserts a newline (multi-line
    // composition is expected on the cold open — voters often write a
    // paragraph or more).
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function showExample() {
    setDraft(t.coldOpenInputSampleLongform);
  }

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleStarterProfileClick() {
    // Clear any prior error so the click feels fresh, then pop the
    // native file picker.
    setStarterError(null);
    fileInputRef.current?.click();
  }

  function handleStarterProfileFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setStarterError(t.coldOpenParseError);
      resetFileInput();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setStarterError(t.coldOpenParseError);
      resetFileInput();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      const names = parsePrioritiesFromProfile(content);
      if (!names || names.length === 0) {
        setStarterError(t.coldOpenParseError);
        resetFileInput();
        return;
      }
      const themes: Theme[] = names.map((name) => ({
        name,
        // Mirror BallotToolClient.tsx (Phase 4 amend path) which wraps
        // the user's own paraphrase in quotes for the ThemeRanker quote
        // strip. For a starter-profile load we don't have a freeform
        // sentence to quote — fall back to the theme name itself so the
        // UI has something to render and the verbatim-quote downstream
        // checks have a non-empty input.
        quotes: [`"${name}"`],
      }));
      setStarterError(null);
      resetFileInput();
      // Pass empty `originalText` so the rewrite-from-themes path lands
      // the voter on a clean textarea — they didn't write a draft, they
      // uploaded a file, so there's nothing meaningful to restore.
      onStarterProfileLoaded?.(themes, "");
    };
    reader.onerror = () => {
      setStarterError(t.coldOpenParseError);
      resetFileInput();
    };
    reader.readAsText(file);
  }

  const isEmpty = draft.length === 0;

  return (
    <section
      data-testid="cold-open-input"
      className="bg-paper-2 border border-rule rounded-xl focus-within:border-civic transition-colors"
    >
      <div className="p-4 flex flex-col gap-3">
        <label
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic"
          htmlFor="cold-open-textarea"
        >
          {t.coldOpenInputLabel}
        </label>

        {isEmpty && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t.coldOpenInputLabel}
          >
            <button
              type="button"
              data-testid="cold-open-show-example"
              onClick={showExample}
              disabled={disabled || loading}
              className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] bg-paper-2 border border-rule rounded-full text-ink-2 hover:border-civic hover:text-civic transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.coldOpenInputShowExample}
            </button>
            <button
              type="button"
              data-testid="cold-open-use-starter-profile"
              aria-label={t.coldOpenInputUseStarterProfile}
              onClick={handleStarterProfileClick}
              disabled={disabled || loading}
              className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] bg-paper-2 border border-rule rounded-full text-ink-2 hover:border-civic hover:text-civic transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.coldOpenInputUseStarterProfile}
            </button>
            <input
              ref={fileInputRef}
              data-testid="cold-open-starter-profile-input"
              type="file"
              accept=".txt,text/plain"
              onChange={handleStarterProfileFile}
              className="hidden"
            />
          </div>
        )}

        {starterError && (
          <p
            data-testid="cold-open-starter-profile-error"
            role="alert"
            className="text-xs text-vote-red"
          >
            {starterError}
          </p>
        )}

        <div className="flex items-end gap-2 md:gap-4">
          <textarea
            id="cold-open-textarea"
            data-testid="cold-open-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.coldOpenInputPlaceholder}
            disabled={disabled}
            rows={5}
            className="flex-1 bg-paper border border-rule rounded-lg p-3 font-serif text-base text-ink placeholder:text-ink-3 focus:outline-none focus:border-civic transition-colors resize-y leading-relaxed disabled:opacity-50"
          />
          <button
            type="button"
            data-testid="cold-open-send"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={t.coldOpenInputSend}
            className="bg-civic text-paper-2 font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-3 rounded-lg flex items-center justify-center min-h-[44px] min-w-[44px] hover:bg-civic-2 focus:outline-none focus:ring-2 focus:ring-civic focus:ring-offset-2 disabled:bg-rule disabled:text-ink-3 disabled:pointer-events-none transition-colors shrink-0 active:scale-95"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3.5 10L16.5 3.5L10 16.5L8.5 11.5L3.5 10Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
