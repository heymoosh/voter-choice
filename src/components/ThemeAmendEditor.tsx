"use client";

import React, { useState, useCallback } from "react";
import { ThemeRanker } from "./ThemeRanker";
import type { Theme } from "../lib/prompts/types";

/**
 * Phase 6 — inline mid-session theme amendment editor.
 *
 * Renders in the workspace chat thread (NOT a modal, NOT a sidebar) when the
 * user clicks the rail's "Edit themes" link OR accepts a chat-catch
 * proposal. Two entry paths, one editor:
 *
 *   · Rail entry: no candidate-new-theme. User adds one via free-text inputs
 *     (name + context-as-quote), or just reranks/removes existing themes.
 *   · Chat-catch entry: candidate-new-theme is pre-filled from the triggering
 *     message. The verbatim-quote contract is enforced upstream (the chip is
 *     read-only display; the editor still accepts free-text overrides via
 *     the name input).
 *
 * The component is "dumb" — it owns local state for the new-theme draft and
 * the rerank order, and emits the full payload via `onSave`. Re-scoring is
 * handled by ChatPanel after `onSave` resolves.
 *
 * Reuses the Phase 2 `ThemeRanker` primitive for the rerank UI. Per the
 * packet's overlap/bloat note: "Two ranker implementations (one in cold open,
 * one in amend editor) — share the primitive."
 */

export interface DecidedRaceSummary {
  raceId: string;
  raceLabel: string;
  raceType: "choice" | "proposition";
}

export interface AmendmentPayload {
  /** Post-edit themes (rerank + add/rename/remove), including the new theme. */
  updatedThemes: Theme[];
  /** When set, the new theme inserted into `updatedThemes` by the editor. */
  newTheme?: Theme;
  /** 1-indexed rank for the new theme. */
  suggestedRank?: number;
}

export interface ThemeAmendEditorProps {
  /** Pre-amendment themes (read-only snapshot). */
  currentThemes: Theme[];
  /** Pre-filled candidate from chat-catch entry. Undefined for rail entry. */
  candidateNewTheme?: Theme;
  /**
   * Triggering message that produced the candidate-new-theme. Used to
   * validate the verbatim-quote contract upstream. The editor itself does not
   * mutate quotes; it relies on the candidate input shape.
   */
  triggeringMessage?: string;
  /** Decided races — passed through to the chat route's amendment payload. */
  decidedRaces: DecidedRaceSummary[];
  onSave: (payload: AmendmentPayload) => void | Promise<void>;
  onDiscard: () => void;
  /** When true, disables the action buttons and surfaces the spinner. */
  inFlight?: boolean;
}

export function ThemeAmendEditor({
  currentThemes,
  candidateNewTheme,
  // decidedRaces is part of the public API (parents thread it through to the
  // chat-route amendment payload) but the editor itself doesn't read it —
  // the rescoring runs server-side. Keeping the prop on the interface so
  // callers don't have to remove it when migrating to v2.
  onSave,
  onDiscard,
  inFlight = false,
}: ThemeAmendEditorProps) {
  // Local rerank/edit state — starts as a copy of the current themes so the
  // user can rerank and remove without polluting the parent's locked themes
  // until they click Lock.
  const [draftThemes, setDraftThemes] = useState<Theme[]>(() => [
    ...currentThemes,
  ]);

  // Free-text new-theme draft — only relevant for the rail-entry path. When
  // candidateNewTheme is set, the candidate slot is rendered instead and the
  // free-text inputs are hidden.
  const [newName, setNewName] = useState("");
  const [newContext, setNewContext] = useState("");

  const handleLock = useCallback(() => {
    let newTheme: Theme | undefined;
    if (candidateNewTheme) {
      newTheme = candidateNewTheme;
    } else if (newName.trim().length > 0) {
      newTheme = {
        name: newName.trim(),
        quotes: newContext.trim().length > 0 ? [newContext.trim()] : [],
      };
    }

    const updatedThemes = newTheme
      ? [newTheme, ...draftThemes]
      : [...draftThemes];

    const payload: AmendmentPayload = {
      updatedThemes,
      newTheme,
      suggestedRank: newTheme ? 1 : undefined,
    };
    onSave(payload);
  }, [candidateNewTheme, newName, newContext, draftThemes, onSave]);

  // Capture the user's rerank/rename/remove without firing onChange callbacks
  // back up — the ranker is "dumb" and emits the full themes[] on every
  // change.
  const handleRankerChange = useCallback((next: Theme[]) => {
    setDraftThemes(next);
  }, []);

  // No-ops for the ranker's lock-in / rewrite — the editor surfaces its own
  // Lock/Discard buttons. We pass these to keep the ranker's API satisfied.
  const noopLock = useCallback(() => {}, []);
  const noopRewrite = useCallback(() => {}, []);

  return (
    <section
      data-testid="theme-amend-editor"
      role="region"
      aria-label="Edit your themes"
      className="my-3 border-l-4 border-primary bg-surface-low p-4 md:p-5 space-y-4"
    >
      <header>
        <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">
          Edit your themes
        </h3>
        <p className="text-xs text-on-surface-muted mt-1">
          Rerank, rename, or remove. Add one new theme if you like. We&rsquo;ll
          re-score every decided race when you lock the change.
        </p>
      </header>

      <ThemeRanker
        themes={draftThemes}
        onChange={handleRankerChange}
        onLockIn={noopLock}
        onRewrite={noopRewrite}
      />

      {candidateNewTheme ? (
        <div
          data-testid="theme-amend-candidate-slot"
          className="border border-dashed border-primary/50 bg-surface-lowest p-3 space-y-2"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Adding · new theme
          </p>
          <p className="text-sm font-bold text-on-surface">
            {candidateNewTheme.name}
          </p>
          <ul className="list-none p-0 m-0 space-y-1">
            {candidateNewTheme.quotes.map((q, i) => (
              <li
                key={i}
                className="text-xs italic text-on-surface-muted pl-3 border-l-2 border-outline-variant/40"
              >
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          data-testid="theme-amend-new-theme-slot"
          className="border border-dashed border-outline-variant/50 bg-surface-lowest p-3 space-y-2"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted">
            Add a new theme (optional)
          </p>
          <label className="block text-xs text-on-surface-muted">
            Name
            <input
              type="text"
              data-testid="theme-amend-new-name-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. School funding"
              className="mt-1 w-full text-sm text-on-surface bg-transparent border border-outline-variant/40 focus:border-primary focus:outline-none px-2 py-1"
            />
          </label>
          <label className="block text-xs text-on-surface-muted">
            Context (used as a verbatim quote)
            <textarea
              data-testid="theme-amend-new-context-input"
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="In a sentence or two, why does this matter to you?"
              rows={2}
              className="mt-1 w-full text-sm text-on-surface bg-transparent border border-outline-variant/40 focus:border-primary focus:outline-none px-2 py-1"
            />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          data-testid="theme-amend-discard"
          onClick={onDiscard}
          disabled={inFlight}
          className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-rose-700 underline-offset-4 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Discard amendment
        </button>
        <div className="flex items-center gap-3">
          {inFlight && (
            <span
              data-testid="theme-amend-inflight-spinner"
              className="text-xs italic text-on-surface-muted"
              role="status"
              aria-live="polite"
            >
              Re-scoring your races…
            </span>
          )}
          <button
            type="button"
            data-testid="theme-amend-lock"
            onClick={handleLock}
            disabled={inFlight}
            className="bg-primary text-on-primary px-5 py-3 text-sm font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
          >
            Lock these changes
          </button>
        </div>
      </div>
    </section>
  );
}
