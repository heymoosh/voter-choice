"use client";

/**
 * AmendmentEditor
 *
 * Modal overlay opened when the user clicks "EDIT" on the workspace left rail.
 * Allows re-rank, rename, remove, and free-text add of issues without losing
 * workspace state. Submitting calls `onApply(newIssues)` → host runs the
 * rescore and shows AmendDeltaMessage in the chat.
 *
 * Source: docs/design/2026-redesign/prototype/prototype-screens.jsx — AmendmentEditor
 * Target: src/components/AmendmentEditor.tsx (new — COMPONENT_MAP §2)
 *
 * Intended mount point: rendered as a portal/overlay from WorkspaceRail when
 * the "EDIT" button is clicked, with issues and decisionsCount passed down.
 * Host is responsible for rendering it conditionally:
 *   {showAmend && (
 *     <AmendmentEditor
 *       issues={lockedIssues}
 *       decisionsCount={decidedCount}
 *       onApply={handleAmendApply}
 *       onCancel={() => setShowAmend(false)}
 *     />
 *   )}
 */

import React, { useState, useRef, useCallback } from "react";
import type { ConcernInterpretationEntry } from "../lib/structured-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AmendmentEditorProps {
  /** The current locked issues list (will be copied into local draft state). */
  issues: ConcernInterpretationEntry[];
  /**
   * How many candidate picks are already recorded — shown in the header
   * so the user understands that changing issues will trigger a rescore.
   */
  decisionsCount: number;
  /** Called with the edited issues when the user clicks "Apply & re-score". */
  onApply: (updatedIssues: ConcernInterpretationEntry[]) => void;
  /** Called when the user dismisses the modal without saving. */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shallow re-rank: mutates ranks to be 1-based after a splice/reorder. */
function rerank(
  items: ConcernInterpretationEntry[],
): ConcernInterpretationEntry[] {
  return items.map((it, i) => ({ ...it, rank: i + 1 }));
}

/**
 * Very rough heuristic mapping for the demo path.
 * Real app: AI extraction round-trip.
 * Mirrors prototype-screens.jsx `guessCanonicalIssue`.
 */
function guessCanonicalIssue(text: string): string {
  const t = text.toLowerCase();
  if (/insulin|drug|medicare|health|hospital/.test(t))
    return "healthcare_affordability";
  if (/rent|housing|cost of living|mortgage/.test(t))
    return "housing_affordability";
  if (/stock|disclosure|congress|trading|term limits/.test(t))
    return "congressional_accountability";
  if (/climate|environment|carbon|emissions/.test(t))
    return "environment_climate";
  if (/abortion|reproductive|roe/.test(t)) return "reproductive_rights";
  if (/gun|firearm|second amendment/.test(t)) return "gun_rights_safety";
  if (/immigration|border|asylum/.test(t)) return "immigration";
  if (/school|education|teacher/.test(t)) return "education_funding";
  return "unrecognized_issue";
}

// ---------------------------------------------------------------------------
// IssueRow — inline (private to this file)
// Mirrors prototype-components.jsx IssueRow adapted to repo token utilities.
// Drag-and-drop from the prototype is preserved via pointer events.
// ---------------------------------------------------------------------------

interface IssueRowProps {
  issue: ConcernInterpretationEntry;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onReorderTo: (from: number, to: number) => void;
}

function IssueRow({
  issue,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRename,
  onRemove,
  onReorderTo,
}: IssueRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.interpretation);
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    startY: 0,
    currentIdx: index,
    rowH: 80,
  });
  const [dragging, setDragging] = useState(false);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  function commit() {
    if (draft.trim()) onRename(draft.trim());
    setEditing(false);
  }

  function isInteractive(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!(el?.closest && el.closest("button, input, a, textarea, select"));
  }

  const onHandleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (editing) return;
      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 640px)").matches;
      const target = e.target as HTMLElement;
      if (!isMobile && !target.closest(".amend-drag-handle")) return;
      if (isMobile && isInteractive(e.target)) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
      drag.current = {
        active: true,
        startY: e.clientY,
        currentIdx: index,
        rowH: rowRef.current?.offsetHeight || 80,
      };
      setDragging(true);
      setDropIdx(index);
    },
    [editing, index],
  );

  const onHandleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current.active) return;
      const dy = e.clientY - drag.current.startY;
      if (rowRef.current)
        rowRef.current.style.transform = `translateY(${dy}px)`;
      const slots = Math.round(dy / drag.current.rowH);
      const target = Math.max(0, Math.min(total - 1, index + slots));
      if (target !== drag.current.currentIdx) {
        drag.current.currentIdx = target;
        setDropIdx(target);
      }
    },
    [index, total],
  );

  const onHandleUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current.active) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {
        // ignore
      }
      const finalIdx = drag.current.currentIdx;
      drag.current.active = false;
      setDragging(false);
      setDropIdx(null);
      if (rowRef.current) rowRef.current.style.transform = "";
      if (finalIdx !== index) onReorderTo(index, finalIdx);
    },
    [index, onReorderTo],
  );

  return (
    <div
      ref={rowRef}
      data-testid={`amend-issue-row-${issue.rank}`}
      className={[
        // base row: 4-column grid matching .amend-row
        "grid items-center gap-[10px] px-[10px] py-2 bg-paper-2 rounded-lg select-none",
        // grid-template-columns: ord(28px) rank(22px) name(1fr) remove(auto)
        "grid-cols-[28px_22px_1fr_auto]",
        dragging ? "opacity-50 z-10 relative" : "",
        dropIdx === index && !dragging ? "ring-2 ring-civic/40" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onHandleDown}
      onPointerMove={onHandleMove}
      onPointerUp={onHandleUp}
      onPointerCancel={onHandleUp}
    >
      {/* Up/down arrow controls + drag handle */}
      <div className="flex flex-col gap-[1px]">
        {/* Drag handle — 6-dot grip */}
        <span
          className="amend-drag-handle cursor-grab active:cursor-grabbing text-ink-3 flex justify-center"
          aria-label="Drag to re-rank"
          role="button"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="6" cy="4" r="1" />
            <circle cx="10" cy="4" r="1" />
            <circle cx="6" cy="8" r="1" />
            <circle cx="10" cy="8" r="1" />
            <circle cx="6" cy="12" r="1" />
            <circle cx="10" cy="12" r="1" />
          </svg>
        </span>
        {/* Arrow buttons */}
        <div className="flex flex-col gap-[1px]">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up"
            className="bg-transparent border-0 text-ink-3 text-[9px] px-1 py-[1px] cursor-pointer disabled:opacity-25 hover:text-ink hover:not-disabled:text-ink"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
            className="bg-transparent border-0 text-ink-3 text-[9px] px-1 py-[1px] cursor-pointer disabled:opacity-25 hover:text-ink hover:not-disabled:text-ink"
          >
            ▼
          </button>
        </div>
      </div>

      {/* Rank number */}
      <div className="font-mono text-[13px] text-civic font-semibold text-center">
        {index + 1}
      </div>

      {/* Name — editable inline */}
      <div>
        {editing ? (
          <input
            type="text"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(issue.interpretation);
                setEditing(false);
              }
            }}
            className="w-full bg-paper border border-rule rounded-[6px] px-[10px] py-2 text-[14px] font-serif font-medium text-ink focus:outline-none focus:border-civic"
          />
        ) : (
          <span className="text-[14px] font-serif font-medium text-ink">
            {issue.interpretation}
          </span>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${issue.interpretation}`}
        className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 bg-transparent border border-rule rounded-[5px] px-2 py-[5px] cursor-pointer hover:text-vote-red hover:border-vote-red transition-colors"
      >
        {/* NEEDS-KEY: research.amendmentEditorRemove — EN "REMOVE" / ES "QUITAR" */}
        REMOVE
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AmendmentEditor
// ---------------------------------------------------------------------------

export function AmendmentEditor({
  issues,
  decisionsCount,
  onApply,
  onCancel,
}: AmendmentEditorProps) {
  const [draft, setDraft] = useState<ConcernInterpretationEntry[]>(() =>
    issues.map((i) => ({ ...i })),
  );
  const [newIssueText, setNewIssueText] = useState("");

  function move(idx: number, dir: -1 | 1) {
    const next = [...draft];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft(rerank(next));
  }

  function rename(idx: number, interpretation: string) {
    const next = [...draft];
    next[idx] = { ...next[idx], interpretation };
    setDraft(next);
  }

  function remove(idx: number) {
    setDraft(rerank(draft.filter((_, i) => i !== idx)));
  }

  function reorderDraft(from: number, to: number) {
    if (from === to) return;
    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(rerank(next));
  }

  function addNew() {
    const text = newIssueText.trim();
    if (!text) return;
    const newEntry: ConcernInterpretationEntry = {
      sourceType: "freeText",
      sourceText: text,
      rank: draft.length + 1,
      interpretation: text,
      canonicalIssue: guessCanonicalIssue(text),
      stance: "",
      confidence: "clear",
      quotes: [{ label: "just added", text }],
    };
    setDraft([...draft, newEntry]);
    setNewIssueText("");
  }

  // Close on backdrop click
  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel();
  }

  // Close on Escape
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") onCancel();
  }

  return (
    /* Backdrop — fixed overlay, dark + blur, centred card */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Amend your issues"
      data-testid="amendment-editor"
      className={[
        "fixed inset-0 z-[100]",
        "grid place-items-center px-5 py-10",
        /* background: oklch(0.18 0.018 240 / 0.55) — closest token-adjacent
           arbitrary value; backdrop-filter blur to match prototype */
        "bg-[oklch(0.18_0.018_240/0.55)] backdrop-blur-[6px]",
        /* fade-in animation matching prototype @keyframes be-fadein */
        "animate-[fadein_0.15s_ease]",
      ].join(" ")}
      onClick={onBackdropClick}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      {/* Card — .amend-card extends .be-modal shared card rules */}
      <div
        className={[
          "bg-paper border border-rule rounded-[14px]",
          /* shadow-card token from globals.css */
          "shadow-[var(--shadow-card)]",
          "max-w-[640px] w-full max-h-[calc(100vh-80px)] overflow-y-auto",
          "flex flex-col",
          "px-[30px] py-[26px]",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            {/* Eyebrow — .amend-eyebrow */}
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-civic font-semibold mb-[6px]">
              {/* NEEDS-KEY: research.amendmentEditorEyebrow — EN "Amend your issues" / ES "Modifica tus temas" */}
              Amend your issues
            </div>
            {/* Title */}
            <h3 className="font-serif font-semibold text-[22px] tracking-[-0.01em] text-ink leading-[1.2] m-0">
              {/* NEEDS-KEY: research.amendmentEditorTitle — EN "Re-evaluate {count} {picks} against new priorities" / ES "Re-evalúa {count} {picks} con nuevas prioridades" */}
              Re-evaluate {decisionsCount}{" "}
              {decisionsCount === 1 ? "pick" : "picks"} against new priorities
            </h3>
          </div>
          {/* Close × */}
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className={[
              "border border-rule bg-paper-2 rounded-lg",
              "w-8 h-8 text-[18px] text-ink-2 cursor-pointer",
              "grid place-items-center shrink-0",
              "hover:bg-rule-2 transition-colors",
            ].join(" ")}
          >
            ×
          </button>
        </header>

        {/* Help text */}
        <p className="text-[13.5px] text-ink-2 leading-[1.5] m-0 mb-[18px] pb-4 border-b border-dashed border-rule">
          {/* NEEDS-KEY: research.amendmentEditorHelp — EN "Re-rank, rename, remove, or add issues. When you save, I'll re-score every candidate you've already picked and surface any whose score shifts past the noise floor." / ES "Reordena, renombra, elimina o agrega temas. Al guardar, re-puntuaré cada candidato que ya elegiste y mostraré aquellos cuya puntuación cambie significativamente." */}
          Re-rank, rename, remove, or add issues. When you save, I&rsquo;ll
          re-score every candidate you&rsquo;ve already picked and surface any
          whose score shifts past the noise floor.
        </p>

        {/* Issue list */}
        <div className="flex flex-col gap-[6px]">
          {draft.map((iss, i) => (
            <IssueRow
              key={iss.canonicalIssue ?? iss.sourceText ?? String(i)}
              issue={iss}
              index={i}
              total={draft.length}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              onReorderTo={reorderDraft}
              onRename={(name) => rename(i, name)}
              onRemove={() => remove(i)}
            />
          ))}
        </div>

        {/* Add new issue row */}
        <div
          className={[
            "mt-[14px] grid grid-cols-[1fr_auto] gap-2",
            "bg-paper-2 border border-dashed border-rule rounded-lg",
            "px-3 py-[5px]",
          ].join(" ")}
        >
          <input
            type="text"
            value={newIssueText}
            onChange={(e) => setNewIssueText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNew();
            }}
            placeholder="Add a new issue — e.g. clean energy permitting, school book bans, immigration enforcement…"
            className="bg-transparent border-0 text-[14px] py-[9px] outline-none text-ink placeholder:text-ink-3"
          />
          <button
            type="button"
            onClick={addNew}
            disabled={!newIssueText.trim()}
            aria-label="Add issue"
            className={[
              "bg-civic text-paper-2 border-0 px-[14px] py-2 rounded-[6px]",
              "text-[13px] font-semibold cursor-pointer",
              "disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed",
              "hover:bg-civic-2 transition-colors",
            ].join(" ")}
          >
            {/* NEEDS-KEY: research.amendmentEditorAddBtn — EN "+ Add" / ES "+ Agregar" */}
            + Add
          </button>
        </div>

        {/* Footer */}
        <footer className="mt-[18px] pt-4 border-t border-rule-2 flex justify-between items-center gap-[10px]">
          <button
            type="button"
            onClick={onCancel}
            className={[
              "bg-transparent text-ink-2 border border-rule rounded-lg",
              "px-[18px] py-[11px] text-[13.5px] font-semibold cursor-pointer",
              "hover:bg-rule-2 transition-colors",
            ].join(" ")}
          >
            {/* NEEDS-KEY: research.amendmentEditorCancel — EN "Cancel" / ES "Cancelar" */}
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={draft.length === 0}
            className={[
              "bg-civic text-paper-2 border-0 rounded-lg",
              "px-[18px] py-[11px] text-[13.5px] font-semibold cursor-pointer",
              "disabled:bg-rule disabled:cursor-not-allowed",
              "hover:bg-civic-2 transition-colors",
            ].join(" ")}
          >
            {/* NEEDS-KEY: research.amendmentEditorApply — EN "Apply & re-score →" / ES "Aplicar y re-puntuar →" */}
            Apply &amp; re-score &rarr;
          </button>
        </footer>
      </div>
    </div>
  );
}
