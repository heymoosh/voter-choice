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

  return (
    <>
      {/*
       * PR B — prototype `.co-input` shape:
       *   • textarea on top, full-width inside the card
       *   • dashed-top-rule meta row below: mono auto-saving hint (left) +
       *     sentence-case "Send →" text button (right)
       *   • chips ("Show me an example", "Use a starter profile") sit
       *     OUTSIDE the card in a separate row beneath it
       * See docs/design-source-of-truth/2026-redesign/prototype/prototype.css
       * lines 407-452 + prototype-views.jsx ColdOpenView lines 186-201.
       */}
      <section
        data-testid="cold-open-input"
        className="bg-paper-2 border border-rule rounded-xl p-3.5 focus-within:border-civic transition-colors"
      >
        <textarea
          id="cold-open-textarea"
          data-testid="cold-open-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.coldOpenInputPlaceholder}
          aria-label={t.coldOpenInputLabel}
          disabled={disabled}
          rows={5}
          className="block w-full bg-transparent border-0 p-0 font-serif text-[15px] text-ink placeholder:text-ink-3 focus:outline-none resize-y leading-relaxed disabled:opacity-50 min-h-[140px]"
        />
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-dashed border-rule pt-2.5">
          <span
            data-testid="cold-open-auto-saving-hint"
            className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3"
          >
            {t.coldOpenAutoSavingHint}
          </span>
          <button
            type="button"
            data-testid="cold-open-send"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-label={t.coldOpenInputSend}
            className="bg-civic text-paper-2 rounded-lg px-[18px] py-2.5 text-[13.5px] font-semibold hover:bg-civic-2 focus:outline-none focus:ring-2 focus:ring-civic focus:ring-offset-2 disabled:bg-rule disabled:text-ink-3 disabled:pointer-events-none transition-colors shrink-0 active:scale-95"
          >
            {t.coldOpenInputSend} →
          </button>
        </div>
      </section>

      {starterError && (
        <p
          data-testid="cold-open-starter-profile-error"
          role="alert"
          className="mt-2 text-xs text-vote-red"
        >
          {starterError}
        </p>
      )}

      {/* PR D — prototype shows BOTH starter chips for the ENTIRE `prompt`
          phase regardless of textarea content (prototype-views.jsx 252-255;
          chip visibility does not depend on draft length). The prior
          `isEmpty` gate hid them as soon as the user typed — dropped. */}
      <div
        className="mt-3 ml-1 flex flex-wrap gap-1.5"
        role="group"
        aria-label={t.coldOpenInputLabel}
      >
        <button
          type="button"
          data-testid="cold-open-show-example"
          onClick={showExample}
          disabled={disabled || loading}
          // PR B — prototype `.starter-chips .sc` is sentence-case sans
          // (font-size 12.5px), pill-shaped, not mono uppercase.
          className="bg-paper border border-rule text-ink-2 text-[12.5px] rounded-full px-3 py-[7px] hover:text-ink hover:border-ink-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.coldOpenInputShowExample}
        </button>
        <button
          type="button"
          data-testid="cold-open-use-starter-profile"
          aria-label={t.coldOpenInputUseStarterProfile}
          onClick={handleStarterProfileClick}
          disabled={disabled || loading}
          className="bg-paper border border-rule text-ink-2 text-[12.5px] rounded-full px-3 py-[7px] hover:text-ink hover:border-ink-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    </>
  );
}
