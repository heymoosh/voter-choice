"use client";

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";

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
 * SAMPLE_LONGFORM string. The "Use a starter profile" chip is rendered
 * but disabled (the file-picker flow is deferred per packet — implement
 * minimally or defer).
 * ────────────────────────────────────────────────────────────── */

export interface ColdOpenInputProps {
  /** Optional preloaded text — used by the rewrite path to restore the user's draft. */
  initialDraft?: string;
  /** Called with the trimmed text when the user submits. */
  onSubmit: (text: string) => void;
  /** When true, the textarea and Send are disabled. */
  disabled?: boolean;
  /** When true, the Send button is disabled (request in flight). */
  loading?: boolean;
}

export function ColdOpenInput({
  initialDraft = "",
  onSubmit,
  disabled = false,
  loading = false,
}: ColdOpenInputProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;
  const [draft, setDraft] = useState(initialDraft);

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
              title={t.coldOpenInputUseStarterProfileTooltip}
              aria-label={t.coldOpenInputUseStarterProfileTooltip}
              // Deferred to a follow-up packet — keep the chip visible so
              // the affordance is testable but the click is a no-op.
              onClick={() => {
                /* no-op (deferred) */
              }}
              disabled={disabled || loading}
              className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] bg-paper-2 border border-rule rounded-full text-ink-3 hover:border-civic hover:text-civic transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-help"
            >
              {t.coldOpenInputUseStarterProfile}
            </button>
          </div>
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
