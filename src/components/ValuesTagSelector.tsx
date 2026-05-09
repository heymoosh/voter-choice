"use client";

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type { ValuesTagRequestBlock } from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * ValuesTagSelector
 *
 * Renders a [VALUES_TAG_REQUEST] block as a multi-select chip set
 * with optional free-text ("custom") entry and a skip affordance.
 *
 * Special item IDs:
 *   "show_ballot" — single-select; selecting it clears all other
 *                   selections; selecting any other tag clears it.
 *   "custom"      — reveals a free-text input; submitting with a
 *                   non-empty string sends { tags: [], custom }.
 *                   Selecting custom clears any selected tags.
 *
 * Max tag selections: 3 (excluding show_ballot and custom).
 * ────────────────────────────────────────────────────────────── */

const MAX_TAG_SELECTIONS = 3;

export interface ValuesTagSelectorProps {
  block: ValuesTagRequestBlock;
  onSubmit: (
    selection: { tags: string[]; custom?: string } | "skipped",
  ) => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  submittedTags?: string[]; // for read-only post-submit display
}

function isSpecial(id: string): boolean {
  return id === "show_ballot" || id === "custom";
}

export function ValuesTagSelector({
  block,
  onSubmit,
  isSubmitting = false,
  isSubmitted = false,
  submittedTags = [],
}: ValuesTagSelectorProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");

  const disabled = isSubmitting || isSubmitted;

  function handleChipClick(id: string) {
    if (disabled) return;

    if (id === "show_ballot") {
      // Single-select; clear everything else.
      if (selectedTags.has("show_ballot")) {
        setSelectedTags(new Set());
      } else {
        setSelectedTags(new Set(["show_ballot"]));
        setShowCustom(false);
        setCustomText("");
      }
      return;
    }

    if (id === "custom") {
      // Toggle custom input; clears tag selections.
      if (showCustom) {
        setShowCustom(false);
        setCustomText("");
      } else {
        setShowCustom(true);
        setSelectedTags(new Set());
      }
      return;
    }

    // Issue tag toggle.
    const next = new Set(selectedTags);
    // Clear show_ballot if it was selected.
    next.delete("show_ballot");

    if (next.has(id)) {
      next.delete(id);
    } else {
      // Enforce max; reject if at limit and not custom path.
      if (next.size >= MAX_TAG_SELECTIONS) return;
      // Selecting an issue tag clears custom.
      if (showCustom) {
        setShowCustom(false);
        setCustomText("");
      }
      next.add(id);
    }
    setSelectedTags(next);
  }

  function handleSubmit() {
    if (disabled) return;

    if (showCustom && customText.trim().length > 0) {
      onSubmit({ tags: [], custom: customText.trim() });
    } else {
      onSubmit({ tags: Array.from(selectedTags) });
    }
  }

  function handleSkip() {
    if (disabled) return;
    onSubmit("skipped");
  }

  // ── Submitted read-only state ──────────────────────────────
  if (isSubmitted) {
    const displayTags = submittedTags.length > 0 ? submittedTags : [];
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
        {displayTags.length > 0 && (
          <ul
            className="flex flex-wrap gap-2 list-none p-0"
            aria-label="Your submitted priorities"
          >
            {displayTags.map((tag) => {
              const item = block.items.find((i) => i.id === tag);
              return (
                <li key={tag}>
                  <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-primary text-primary bg-primary/10">
                    {item ? item.label : tag}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  // ── Interactive state ──────────────────────────────────────
  const regularItems = block.items.filter((i) => !isSpecial(i.id));
  const showBallotItem = block.items.find((i) => i.id === "show_ballot");
  const customItem = block.items.find((i) => i.id === "custom");

  const isShowBallotSelected = selectedTags.has("show_ballot");
  const regularSelectedCount = [...selectedTags].filter(
    (id) => !isSpecial(id),
  ).length;
  const atMax = regularSelectedCount >= MAX_TAG_SELECTIONS;

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

      {/* Regular issue tags */}
      <ul
        className="flex flex-wrap gap-2 list-none p-0"
        role="group"
        aria-label="Issue priorities"
      >
        {regularItems.map((item) => {
          const selected = selectedTags.has(item.id);
          const reachedMax = atMax && !selected && !isShowBallotSelected;
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

      {/* Special items: show_ballot and custom */}
      <div className="flex flex-wrap gap-2">
        {showBallotItem && (
          <button
            type="button"
            data-testid="values-tag-chip-show_ballot"
            aria-pressed={isShowBallotSelected}
            disabled={disabled}
            onClick={() => handleChipClick("show_ballot")}
            className={
              "px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors " +
              (isShowBallotSelected
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant/40 text-on-surface-muted hover:border-primary/60 hover:text-primary")
            }
          >
            {showBallotItem.label}
          </button>
        )}
        {customItem && (
          <button
            type="button"
            data-testid="values-tag-chip-custom"
            aria-pressed={showCustom}
            disabled={disabled}
            onClick={() => handleChipClick("custom")}
            className={
              "px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors " +
              (showCustom
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant/40 text-on-surface-muted hover:border-primary/60 hover:text-primary")
            }
          >
            {customItem.label}
          </button>
        )}
      </div>

      {/* Custom text input */}
      {showCustom && (
        <div>
          <input
            type="text"
            data-testid="values-tag-custom-input"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={t.valuesTagSelectorCustomPlaceholder}
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-outline-variant/40 bg-surface-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-on-surface-muted/60"
          />
        </div>
      )}

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
