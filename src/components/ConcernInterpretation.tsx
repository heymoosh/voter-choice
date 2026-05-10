"use client";

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type {
  ConcernInterpretationBlock,
  ConcernInterpretationEntry,
} from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * ConcernInterpretation
 *
 * Presentation-only component. Renders a parsed [CONCERN_INTERPRETATION]
 * block. For each entry:
 *   - "clear"     → checkmark, interpretation, Confirm / Edit / Remove.
 *   - "low"       → disambiguation question + chip-select. User must pick
 *                   an option before confirming.
 *   - "off_topic" → explanatory message + Remove.
 *
 * Bottom: Confirm button fires onConfirm([...]) with resolved confirmations.
 * ────────────────────────────────────────────────────────────── */

export interface ConcernConfirmation {
  rank: number;
  /**
   * What the user agreed on. For clear entries, this is the existing
   * interpretation. For ambiguous entries, it's the picked option text.
   */
  resolvedInterpretation: string;
  /** For ambiguous entries: the option the user picked. */
  resolvedStance?: string;
  /** True if the user removed this entry instead of confirming. */
  removed?: boolean;
}

export interface ConcernInterpretationProps {
  block: ConcernInterpretationBlock;
  onConfirm: (confirmations: ConcernConfirmation[]) => void;
  onReinterpret?: (rank: number, newText: string) => void;
  onRemove?: (rank: number) => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
}

/* ── Per-entry local state ───────────────────────────────── */

interface EntryState {
  removed: boolean;
  /** For "low" entries: the picked disambiguation option, or null. */
  pickedOption: string | null;
  /** For "clear" entries: whether the edit input is open. */
  editing: boolean;
  editText: string;
}

function initialEntryState(): EntryState {
  return { removed: false, pickedOption: null, editing: false, editText: "" };
}

/* ── Rank badge ─────────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      aria-label={`Priority ${rank}`}
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black shrink-0"
    >
      {rank}
    </span>
  );
}

/* ── Source chip ────────────────────────────────────────── */

function SourceChip({ entry }: { entry: ConcernInterpretationEntry }) {
  if (entry.sourceType === "tag" && entry.sourceTagId) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border border-primary/40 text-primary bg-primary/5">
        {entry.sourceTagId}
      </span>
    );
  }
  if (entry.sourceType === "freeText" && entry.sourceText) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium italic border border-outline-variant/40 text-on-surface-muted bg-surface-lowest">
        &ldquo;{entry.sourceText}&rdquo;
      </span>
    );
  }
  return null;
}

/* ── Confidence badge ───────────────────────────────────── */

function ConfidenceBadge({
  confidence,
}: {
  confidence: ConcernInterpretationEntry["confidence"];
}) {
  if (confidence === "clear") {
    return (
      <span
        aria-label="Interpreted with high confidence"
        className="text-emerald-600 text-sm font-black"
      >
        ✓
      </span>
    );
  }
  if (confidence === "low") {
    return (
      <span
        aria-label="Needs clarification"
        className="text-amber-600 text-sm font-black"
      >
        ?
      </span>
    );
  }
  // off_topic
  return (
    <span
      aria-label="Not ballot-relevant"
      className="text-rose-500 text-sm font-black"
    >
      ✕
    </span>
  );
}

/* ── Individual entry card ──────────────────────────────── */

function EntryCard({
  entry,
  state,
  onToggleRemove,
  onPickOption,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onEditTextChange,
  disabled,
  t,
}: {
  entry: ConcernInterpretationEntry;
  state: EntryState;
  onToggleRemove: () => void;
  onPickOption: (option: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommitEdit: () => void;
  onEditTextChange: (text: string) => void;
  disabled: boolean;
  t: (typeof translations)["en"]["research"];
}) {
  if (state.removed) {
    return (
      <div
        data-testid={`concern-entry-removed-${entry.rank}`}
        className="opacity-40 bg-surface-lowest border border-outline-variant/20 px-4 py-3 flex items-center gap-3"
      >
        <RankBadge rank={entry.rank} />
        <span className="text-xs italic text-on-surface-muted line-through flex-1">
          {entry.interpretation}
        </span>
        {!disabled && (
          <button
            type="button"
            data-testid={`concern-entry-undo-${entry.rank}`}
            onClick={onToggleRemove}
            className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary underline-offset-4 hover:underline"
          >
            Undo
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid={`concern-entry-${entry.rank}`}
      className="bg-surface-lowest border border-outline-variant/40 px-4 py-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <RankBadge rank={entry.rank} />
        <div className="flex-1 min-w-0 space-y-1">
          <SourceChip entry={entry} />
          <div className="flex items-center gap-2 flex-wrap">
            <ConfidenceBadge confidence={entry.confidence} />
            <span className="text-sm font-medium text-on-surface">
              {entry.interpretation}
            </span>
          </div>
        </div>

        {/* Remove button */}
        {!disabled && (
          <button
            type="button"
            data-testid={`concern-entry-remove-${entry.rank}`}
            onClick={onToggleRemove}
            aria-label={`${t.concernInterpretationRemove} entry ${entry.rank}`}
            className="shrink-0 text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-rose-600 underline-offset-4 hover:underline"
          >
            {t.concernInterpretationRemove}
          </button>
        )}
      </div>

      {/* Off-topic notice */}
      {entry.confidence === "off_topic" && (
        <p
          data-testid={`concern-entry-offtopic-notice-${entry.rank}`}
          className="text-xs italic text-rose-600 pl-9"
        >
          {t.concernInterpretationOffTopic}
        </p>
      )}

      {/* Disambiguation (low confidence) */}
      {entry.confidence === "low" && (
        <div
          data-testid={`concern-entry-disambiguation-${entry.rank}`}
          className="pl-9 space-y-2"
        >
          <p className="text-xs font-medium text-on-surface-muted">
            {entry.disambiguationQuestion ??
              t.concernInterpretationDisambiguatePrompt}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Disambiguation options"
          >
            {(entry.disambiguationOptions ?? []).map((option) => {
              const picked = state.pickedOption === option;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid={`concern-disambig-option-${entry.rank}-${option}`}
                  aria-pressed={picked}
                  disabled={disabled}
                  onClick={() => !disabled && onPickOption(option)}
                  className={
                    "px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors " +
                    (picked
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/40 text-on-surface-muted hover:border-primary/60 hover:text-primary")
                  }
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Clear confidence: edit affordance */}
      {entry.confidence === "clear" && !disabled && (
        <div className="pl-9">
          {state.editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                data-testid={`concern-entry-edit-input-${entry.rank}`}
                value={state.editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                placeholder={entry.sourceText ?? entry.sourceTagId ?? ""}
                className="flex-1 px-3 py-1.5 text-sm border border-outline-variant/40 bg-surface-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-on-surface-muted/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommitEdit();
                  if (e.key === "Escape") onCancelEdit();
                }}
                autoFocus
              />
              <button
                type="button"
                data-testid={`concern-entry-edit-commit-${entry.rank}`}
                onClick={onCommitEdit}
                disabled={state.editText.trim().length === 0}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-widest bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              >
                Save
              </button>
              <button
                type="button"
                data-testid={`concern-entry-edit-cancel-${entry.rank}`}
                onClick={onCancelEdit}
                className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid={`concern-entry-edit-${entry.rank}`}
              onClick={onStartEdit}
              className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary underline-offset-4 hover:underline"
            >
              {t.concernInterpretationEdit}
            </button>
          )}
        </div>
      )}

      {/* "Looks right" confirmation chip for clear entries */}
      {entry.confidence === "clear" && !state.editing && !disabled && (
        <div className="pl-9">
          <span className="text-xs text-on-surface-muted italic">
            {t.concernInterpretationConfirmPerEntry}? —{" "}
            {t.concernInterpretationEdit} or {t.concernInterpretationRemove}{" "}
            above.
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────*/

export function ConcernInterpretation({
  block,
  onConfirm,
  onReinterpret,
  onRemove,
  isSubmitting = false,
  isSubmitted = false,
}: ConcernInterpretationProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  const [entryStates, setEntryStates] = useState<Record<number, EntryState>>(
    () => {
      const initial: Record<number, EntryState> = {};
      for (const entry of block.entries) {
        initial[entry.rank] = initialEntryState();
      }
      return initial;
    },
  );

  function updateState(rank: number, patch: Partial<EntryState>) {
    setEntryStates((prev) => ({
      ...prev,
      [rank]: { ...prev[rank], ...patch },
    }));
  }

  /* ── Confirm readiness ── */

  function isEntryReady(entry: ConcernInterpretationEntry): boolean {
    const s = entryStates[entry.rank];
    if (!s) return false;
    if (s.removed) return true; // removed entries are "handled"
    if (entry.confidence === "off_topic") return false; // must be removed
    if (entry.confidence === "low") return s.pickedOption !== null;
    return true; // clear
  }

  const allReady = block.entries.every(isEntryReady);
  const confirmDisabled = isSubmitting || !allReady;

  function handleConfirm() {
    if (confirmDisabled) return;

    const confirmations: ConcernConfirmation[] = block.entries.map((entry) => {
      const s = entryStates[entry.rank];
      if (s.removed) {
        return {
          rank: entry.rank,
          resolvedInterpretation: entry.interpretation,
          removed: true,
        };
      }
      if (entry.confidence === "low" && s.pickedOption) {
        return {
          rank: entry.rank,
          resolvedInterpretation: s.pickedOption,
          resolvedStance: s.pickedOption,
        };
      }
      return {
        rank: entry.rank,
        resolvedInterpretation: entry.interpretation,
        ...(entry.stance ? { resolvedStance: entry.stance } : {}),
      };
    });

    onConfirm(confirmations);
  }

  /* ── Submitted read-only view ── */

  if (isSubmitted) {
    return (
      <section
        data-testid="concern-interpretation"
        className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-3"
      >
        <header>
          <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-on-surface leading-tight">
            {t.concernInterpretationHeading}
          </h3>
        </header>
        <p
          data-testid="concern-interpretation-submitted"
          className="text-xs font-bold uppercase tracking-widest text-primary"
        >
          {t.concernInterpretationSubmitted}
        </p>
        <ul className="space-y-2 list-none p-0">
          {block.entries.map((entry) => {
            const s = entryStates[entry.rank];
            const removed = s?.removed;
            return (
              <li
                key={entry.rank}
                className={
                  "flex items-center gap-3 text-sm " +
                  (removed ? "opacity-40 line-through" : "")
                }
              >
                <RankBadge rank={entry.rank} />
                <span className="text-on-surface">
                  {entry.confidence === "low" && s?.pickedOption
                    ? s.pickedOption
                    : entry.interpretation}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  /* ── Interactive state ── */

  return (
    <section
      data-testid="concern-interpretation"
      className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-4"
    >
      <header>
        <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-on-surface leading-tight">
          {t.concernInterpretationHeading}
        </h3>
        <p className="mt-1 text-xs text-on-surface-muted">
          {t.concernInterpretationSubhead}
        </p>
      </header>

      {/* Entry cards */}
      <div className="space-y-3">
        {block.entries.map((entry) => {
          const s = entryStates[entry.rank] ?? initialEntryState();
          return (
            <EntryCard
              key={entry.rank}
              entry={entry}
              state={s}
              disabled={isSubmitting}
              t={t}
              onToggleRemove={() => {
                const nextRemoved = !s.removed;
                updateState(entry.rank, { removed: nextRemoved });
                if (nextRemoved) {
                  onRemove?.(entry.rank);
                }
              }}
              onPickOption={(option) => {
                updateState(entry.rank, { pickedOption: option });
              }}
              onStartEdit={() => {
                updateState(entry.rank, {
                  editing: true,
                  editText: entry.sourceText ?? entry.sourceTagId ?? "",
                });
              }}
              onCancelEdit={() => {
                updateState(entry.rank, { editing: false, editText: "" });
              }}
              onCommitEdit={() => {
                const text = s.editText.trim();
                if (text.length === 0) return;
                updateState(entry.rank, { editing: false, editText: "" });
                onReinterpret?.(entry.rank, text);
              }}
              onEditTextChange={(text) => {
                updateState(entry.rank, { editText: text });
              }}
            />
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          data-testid="concern-interpretation-confirm"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className="bg-primary text-on-primary px-5 py-3 text-sm font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {isSubmitting
            ? t.concernInterpretationSubmitting
            : t.concernInterpretationConfirm}
        </button>
      </div>
    </section>
  );
}
