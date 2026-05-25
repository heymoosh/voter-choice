"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { Theme } from "../lib/prompts/types";

/* ──────────────────────────────────────────────────────────────
 * ThemeRanker
 *
 * Sibling to ValuesTagSelector (NOT a rename) — the legacy ES
 * locale path still uses ValuesTagSelector's chip picker. This
 * component lifts the dnd-kit machinery (SortableItem, DndContext,
 * sensors, rank badges) and discards the chip-set rendering path.
 *
 * Consumed by ConcernInterpretation when it switches into "themes"
 * mode. Parent component owns persistent state across edits; this
 * component is dumb and re-emits the full themes[] on every change.
 *
 * Verbatim quote rule: theme `quotes` are rendered as raw text;
 * no paraphrase, trim, lowercase, or other transformation. This
 * is load-bearing per .ai/work-packets/redesign-phase-2-free-form-cold-open.md.
 *
 * No MAX_ENTRIES cap — the slot count comes entirely from the
 * input. The parent (ConcernInterpretation) is responsible for
 * slicing to a max of 5 with a warning, not this component.
 * ────────────────────────────────────────────────────────────── */

export interface ThemeRankerProps {
  /** Ordered themes (index = rank-1). */
  themes: Theme[];
  /** Emitted on rerank / rename / remove. Parent merges into its state. */
  onChange: (next: Theme[]) => void;
  /** Submit handler — "Lock these in." */
  onLockIn: () => void;
  /** Restore original draft handler — "Let me rewrite my message." */
  onRewrite: () => void;
  /** Optional warning rendered above the list (e.g. truncation notice). */
  warning?: string;
}

/**
 * Pure reorder helper. Exposed so tests can validate the reorder logic
 * directly — dnd-kit's keyboard-driven reorder is unreliable in jsdom
 * (see the comment in ValuesTagSelector.test.tsx lines 241–253 for the
 * same fallback strategy).
 */
export function reorderThemes(
  themes: Theme[],
  from: number,
  to: number,
): Theme[] {
  if (from === to) return themes;
  return arrayMove(themes, from, to);
}

/* ── Sortable card subcomponent ──────────────────────────────── */

interface SortableThemeCardProps {
  theme: Theme;
  index: number;
  total: number;
  onRename: (index: number, newName: string) => void;
  onRemove: (index: number) => void;
  reorderLabel: string;
  removeLabel: string;
  renameLabel: string;
}

function SortableThemeCard({
  theme,
  index,
  onRename,
  onRemove,
  reorderLabel,
  removeLabel,
  renameLabel,
}: SortableThemeCardProps) {
  const id = `theme-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [draftName, setDraftName] = useState(theme.name);
  const lastCommittedRef = useRef(theme.name);

  // Keep the local draft in sync if the parent updates the theme name
  // for reasons unrelated to this input (e.g. an outer reset).
  useEffect(() => {
    setDraftName(theme.name);
    lastCommittedRef.current = theme.name;
  }, [theme.name]);

  function commit() {
    const next = draftName.trim();
    if (next.length === 0 || next === lastCommittedRef.current) {
      // Empty or unchanged — snap back to the committed value.
      setDraftName(lastCommittedRef.current);
      return;
    }
    lastCommittedRef.current = next;
    onRename(index, next);
  }

  function revert() {
    setDraftName(lastCommittedRef.current);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-testid={`theme-card-${index}`}
      className="flex items-start gap-3 bg-paper-2 border border-rule rounded-xl px-4 py-4"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-testid={`theme-drag-handle-${index}`}
        aria-label={`${reorderLabel}: ${theme.name}`}
        className="cursor-grab text-ink-3 hover:text-civic select-none touch-none text-lg leading-none mt-1.5"
      >
        ⠿
      </button>

      {/* Rank badge — serif italic civic numeral */}
      <span
        data-testid={`theme-rank-${index}`}
        aria-label={`Rank ${index + 1}`}
        className="font-serif italic text-civic text-3xl font-semibold shrink-0 leading-none w-7 text-center mt-0.5"
      >
        {index + 1}
      </span>

      {/* Body: editable name + verbatim quotes */}
      <div className="flex-1 min-w-0 space-y-2">
        <input
          type="text"
          data-testid={`theme-name-input-${index}`}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.currentTarget as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              revert();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          aria-label={`${renameLabel}: ${theme.name}`}
          className="w-full font-serif text-base md:text-[16.5px] font-semibold text-ink bg-transparent border-b border-transparent hover:border-rule focus:border-civic focus:outline-none px-0 py-1 tracking-tight"
        />
        {theme.quotes.length > 0 && (
          <div className="bg-paper border-l-2 border-civic-soft pl-3 py-2 space-y-1.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">
              From your input
            </p>
            <ul className="list-none p-0 space-y-1">
              {theme.quotes.map((quote, qi) => (
                <li
                  key={qi}
                  data-testid={`theme-quote-${index}-${qi}`}
                  className="font-serif italic text-sm text-ink-2 leading-snug"
                >
                  <blockquote className="m-0">&ldquo;{quote}&rdquo;</blockquote>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        data-testid={`theme-remove-${index}`}
        onClick={() => onRemove(index)}
        aria-label={`${removeLabel}: ${theme.name}`}
        className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 hover:text-vote-red px-2 py-1"
      >
        Remove
      </button>
    </li>
  );
}

/* ── Main component ──────────────────────────────────────────── */

export function ThemeRanker({
  themes,
  onChange,
  onLockIn,
  onRewrite,
  warning,
}: ThemeRankerProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  // dnd-kit sensors — lifted from ValuesTagSelector.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(String(active.id).replace("theme-", ""));
    const to = Number(String(over.id).replace("theme-", ""));
    if (Number.isNaN(from) || Number.isNaN(to)) return;
    onChange(reorderThemes(themes, from, to));
  }

  function handleRename(index: number, newName: string) {
    const next = themes.map((theme, i) =>
      i === index ? { ...theme, name: newName } : theme,
    );
    onChange(next);
  }

  function handleRemove(index: number) {
    const next = themes.filter((_, i) => i !== index);
    onChange(next);
  }

  const sortableIds = themes.map((_, i) => `theme-${i}`);
  const lockDisabled = themes.length === 0;

  return (
    <section
      data-testid="theme-ranker"
      className="bg-paper-2 border border-rule rounded-xl p-4 md:p-5 space-y-4"
    >
      {warning && (
        <p
          data-testid="theme-ranker-warning"
          role="status"
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-vote-red bg-paper border-l-2 border-vote-red px-3 py-2"
        >
          {warning}
        </p>
      )}

      {themes.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <ul
              data-testid="theme-ranker-list"
              className="space-y-2 list-none p-0"
              aria-label={t.themeRankerListLabel}
            >
              {themes.map((theme, i) => (
                <SortableThemeCard
                  key={`theme-${i}-${theme.name}`}
                  theme={theme}
                  index={i}
                  total={themes.length}
                  onRename={handleRename}
                  onRemove={handleRemove}
                  reorderLabel={t.themeRankerReorderLabel}
                  removeLabel={t.themeRankerRemoveLabel}
                  renameLabel={t.themeRankerRenameLabel}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p
          data-testid="theme-ranker-empty"
          className="text-xs italic text-ink-3"
        >
          {t.themeRankerEmpty}
        </p>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-rule-2">
        <button
          type="button"
          data-testid="theme-ranker-rewrite"
          onClick={onRewrite}
          className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 hover:text-civic underline-offset-4 hover:underline"
        >
          {t.themeRankerRewrite}
        </button>
        <button
          type="button"
          data-testid="theme-ranker-lock-in"
          onClick={onLockIn}
          disabled={lockDisabled}
          className="bg-civic text-paper-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.12em] rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {t.themeRankerLockIn}
        </button>
      </div>
    </section>
  );
}
