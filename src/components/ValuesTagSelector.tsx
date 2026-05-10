"use client";

import React, { useState } from "react";
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
import type { ValuesTagRequestBlock } from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * ValuesTagSelector v2
 *
 * Renders a [VALUES_TAG_REQUEST] block as:
 *   - A chip set for issue tags (including show_ballot special chip)
 *   - A "Ranked priorities" list with drag-and-drop reorder
 *   - A free-text input (always visible) for custom concerns
 *
 * Special item IDs:
 *   "show_ballot" — single-select; selecting it clears everything else.
 *   "custom"      — ignored/hidden in chip rendering (free-text input
 *                   is always available as a sibling, not chip-gated).
 *
 * Cap: 3 total ranked entries (chips + free-text combined).
 *
 * Submit payload shape:
 *   { ranked: RankedEntry[] } | "skipped"
 *   RankedEntry = { type: "tag"; id: string; rank: number }
 *               | { type: "freeText"; text: string; rank: number }
 * ────────────────────────────────────────────────────────────── */

const MAX_ENTRIES = 3;

export type RankedEntry =
  | { type: "tag"; id: string; rank: number }
  | { type: "freeText"; text: string; rank: number };

export type SubmitPayload = { ranked: RankedEntry[] } | "skipped";

export interface ValuesTagSelectorProps {
  block: ValuesTagRequestBlock;
  onSubmit: (selection: SubmitPayload) => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  /** New: for read-only post-submit display using the new ranked shape. */
  submittedRanked?: RankedEntry[];
}

function isSpecial(id: string): boolean {
  return id === "show_ballot" || id === "custom";
}

/* ── Internal ranked list item type (with a stable key for dnd) ── */
type TagItem = { key: string; type: "tag"; id: string };
type FreeTextItem = { key: string; type: "freeText"; text: string };
type RankedListItem = TagItem | FreeTextItem;

/* ── Sortable item subcomponent ─────────────────────────────── */
interface SortableItemProps {
  item: RankedListItem;
  rank: number;
  removeLabel: string;
  onRemove: (key: string) => void;
  disabled: boolean;
}

function SortableItem({
  item,
  rank,
  removeLabel,
  onRemove,
  disabled,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.key, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = item.type === "tag" ? item.id : item.text;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-testid={`ranked-item-${item.key}`}
      className="flex items-center gap-2 bg-surface-lowest border border-outline-variant/40 px-3 py-2"
    >
      {/* Drag handle */}
      {!disabled && (
        <span
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${item.key}`}
          aria-label="Drag to reorder"
          className="cursor-grab text-on-surface-muted hover:text-primary select-none touch-none"
        >
          ⠿
        </span>
      )}

      {/* Rank badge */}
      <span
        data-testid={`rank-badge-${item.key}`}
        className="text-xs font-black text-primary min-w-[1.5rem]"
      >
        #{rank}
      </span>

      {/* Label */}
      <span
        className={
          "flex-1 text-xs " +
          (item.type === "freeText"
            ? "italic text-on-surface"
            : "font-bold uppercase tracking-widest text-on-surface")
        }
      >
        {label}
        {item.type === "freeText" && (
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-primary/70 not-italic">
            custom
          </span>
        )}
      </span>

      {/* Remove button */}
      <button
        type="button"
        data-testid={`remove-item-${item.key}`}
        aria-label={`${removeLabel}: ${label}`}
        disabled={disabled}
        onClick={() => onRemove(item.key)}
        className="text-on-surface-muted hover:text-primary disabled:opacity-40 text-sm leading-none px-1"
      >
        ✕
      </button>
    </li>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function ValuesTagSelector({
  block,
  onSubmit,
  isSubmitting = false,
  isSubmitted = false,
  submittedRanked = [],
}: ValuesTagSelectorProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  /* Ranked list state */
  const [rankedItems, setRankedItems] = useState<RankedListItem[]>([]);
  /* Free-text input state */
  const [freeText, setFreeText] = useState("");
  /* show_ballot special state */
  const [showBallotSelected, setShowBallotSelected] = useState(false);

  const disabled = isSubmitting || isSubmitted;
  const atCap = rankedItems.length >= MAX_ENTRIES;

  /* The set of tag IDs currently in the ranked list */
  const selectedTagIds = new Set(
    rankedItems.filter((i) => i.type === "tag").map((i) => (i as TagItem).id),
  );

  /* dnd-kit sensors */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ── Chip click ─────────────────────────────────────────── */
  function handleChipClick(id: string) {
    if (disabled) return;

    if (id === "show_ballot") {
      if (showBallotSelected) {
        setShowBallotSelected(false);
      } else {
        setShowBallotSelected(true);
        setRankedItems([]);
      }
      return;
    }

    /* Regular tag toggle */
    if (selectedTagIds.has(id)) {
      /* Deselect: remove from ranked list */
      setRankedItems((prev) =>
        prev.filter((i) => !(i.type === "tag" && (i as TagItem).id === id)),
      );
    } else {
      /* Select: add to ranked list if under cap */
      if (atCap) return;
      setShowBallotSelected(false);
      const key = `tag-${id}`;
      setRankedItems((prev) => [...prev, { key, type: "tag", id }]);
    }
  }

  /* ── Free-text add ──────────────────────────────────────── */
  function handleFreeTextAdd() {
    const text = freeText.trim();
    if (!text || atCap || disabled) return;
    const key = `ft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setRankedItems((prev) => [...prev, { key, type: "freeText", text }]);
    setFreeText("");
  }

  function handleFreeTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFreeTextAdd();
    }
  }

  /* ── Remove from ranked list ────────────────────────────── */
  function handleRemove(key: string) {
    if (disabled) return;
    setRankedItems((prev) => prev.filter((i) => i.key !== key));
  }

  /* ── Drag end ───────────────────────────────────────────── */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRankedItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.key === active.id);
        const newIndex = prev.findIndex((i) => i.key === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  /* ── Submit ─────────────────────────────────────────────── */
  function handleSubmit() {
    if (disabled) return;
    if (showBallotSelected) {
      onSubmit({
        ranked: [{ type: "tag", id: "show_ballot", rank: 1 }],
      });
      return;
    }
    const ranked: RankedEntry[] = rankedItems.map((item, i) => {
      if (item.type === "tag") {
        return {
          type: "tag",
          id: (item as TagItem).id,
          rank: i + 1,
        };
      }
      return {
        type: "freeText",
        text: (item as FreeTextItem).text,
        rank: i + 1,
      };
    });
    onSubmit({ ranked });
  }

  function handleSkip() {
    if (disabled) return;
    onSubmit("skipped");
  }

  /* ── Submitted read-only state ──────────────────────────── */
  if (isSubmitted) {
    return (
      <section
        data-testid="values-tag-selector"
        className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-3"
      >
        <h3 className="text-sm font-black uppercase tracking-wide text-on-surface">
          {t.valuesTagSelectorTitle}
        </h3>
        <p
          data-testid="values-tag-selector-submitted"
          className="text-xs font-bold uppercase tracking-widest text-primary"
        >
          {t.valuesTagSelectorSubmitted}
        </p>
        {submittedRanked.length > 0 && (
          <ol
            className="space-y-1 list-none p-0"
            aria-label="Submitted priorities"
          >
            {submittedRanked.map((entry) => {
              const displayText =
                entry.type === "tag"
                  ? (block.items.find((i) => i.id === entry.id)?.label ??
                    entry.id)
                  : entry.text;
              return (
                <li key={entry.rank} className="flex items-center gap-2">
                  <span className="text-xs font-black text-primary">
                    #{entry.rank}
                  </span>
                  <span
                    className={
                      "text-xs " +
                      (entry.type === "freeText"
                        ? "italic text-on-surface"
                        : "font-bold uppercase tracking-widest text-on-surface")
                    }
                  >
                    {displayText}
                    {entry.type === "freeText" && (
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-primary/70 not-italic">
                        custom
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    );
  }

  /* ── Interactive state ──────────────────────────────────── */
  const regularItems = block.items.filter((i) => !isSpecial(i.id));
  const showBallotItem = block.items.find((i) => i.id === "show_ballot");

  return (
    <section
      data-testid="values-tag-selector"
      className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-4"
    >
      <header>
        <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-on-surface leading-tight">
          {t.valuesTagSelectorTitle}
        </h3>
        <p className="mt-1 text-xs text-on-surface-muted">
          {t.valuesTagSelectorInstruction}
        </p>
      </header>

      {/* Regular issue tag chips */}
      <ul
        className="flex flex-wrap gap-2 list-none p-0"
        role="group"
        aria-label="Issue priorities"
      >
        {regularItems.map((item) => {
          const selected = selectedTagIds.has(item.id);
          const reachedMax = atCap && !selected && !showBallotSelected;
          return (
            <li key={item.id}>
              <button
                type="button"
                data-testid={`values-tag-chip-${item.id}`}
                aria-pressed={selected}
                disabled={disabled || reachedMax}
                onClick={() => handleChipClick(item.id)}
                className={
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors " +
                  (selected
                    ? "bg-primary text-on-primary border-primary"
                    : reachedMax
                      ? "opacity-40 cursor-not-allowed border-outline-variant/40 text-on-surface-muted"
                      : "border-outline-variant/40 text-on-surface-muted hover:border-primary/60 hover:text-primary")
                }
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* show_ballot special chip */}
      {showBallotItem && (
        <div>
          <button
            type="button"
            data-testid="values-tag-chip-show_ballot"
            aria-pressed={showBallotSelected}
            disabled={disabled}
            onClick={() => handleChipClick("show_ballot")}
            className={
              "px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors " +
              (showBallotSelected
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant/40 text-on-surface-muted hover:border-primary/60 hover:text-primary")
            }
          >
            {showBallotItem.label}
          </button>
        </div>
      )}

      {/* Ranked list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-muted">
            {rankedItems.length === 0
              ? t.valuesTagSelectorEmpty
              : t.valuesTagSelectorRankedHeading}
          </h4>
          {rankedItems.length > 1 && (
            <span className="text-[10px] text-on-surface-muted">
              {t.valuesTagSelectorReorderHint}
            </span>
          )}
        </div>

        {rankedItems.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rankedItems.map((i) => i.key)}
              strategy={verticalListSortingStrategy}
            >
              <ul
                data-testid="ranked-list"
                className="space-y-1 list-none p-0"
                aria-label="Ranked priorities"
              >
                {rankedItems.map((item, idx) => (
                  <SortableItem
                    key={item.key}
                    item={item}
                    rank={idx + 1}
                    removeLabel={t.valuesTagSelectorRemoveLabel}
                    onRemove={handleRemove}
                    disabled={disabled}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        {/* At-cap notice */}
        {atCap && (
          <p
            data-testid="at-cap-notice"
            className="text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            {t.valuesTagSelectorAtCap}
          </p>
        )}
      </div>

      {/* Free-text input */}
      <div className="flex gap-2">
        <input
          type="text"
          data-testid="values-tag-freetext-input"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={handleFreeTextKeyDown}
          placeholder={t.valuesTagSelectorFreeTextPlaceholder}
          disabled={disabled || atCap}
          aria-label={t.valuesTagSelectorFreeTextPlaceholder}
          className="flex-1 px-3 py-2 text-sm border border-outline-variant/40 bg-surface-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-on-surface-muted/60 disabled:opacity-50"
        />
        <button
          type="button"
          data-testid="values-tag-freetext-add"
          onClick={handleFreeTextAdd}
          disabled={disabled || atCap || !freeText.trim()}
          className="px-4 py-2 text-xs font-black uppercase tracking-wide bg-primary text-on-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {t.valuesTagSelectorFreeTextAdd}
        </button>
      </div>

      {/* Footer actions */}
      <div className="flex justify-end items-center gap-3 pt-1">
        <button
          type="button"
          data-testid="values-tag-skip"
          onClick={handleSkip}
          disabled={disabled}
          className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed underline-offset-4 hover:underline"
        >
          {t.valuesTagSelectorSkip}
        </button>
        <button
          type="button"
          data-testid="values-tag-submit"
          onClick={handleSubmit}
          disabled={disabled}
          className="bg-primary text-on-primary px-5 py-3 text-sm font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {isSubmitting
            ? t.valuesTagSelectorSubmitting
            : t.valuesTagSelectorSubmit}
        </button>
      </div>
    </section>
  );
}
