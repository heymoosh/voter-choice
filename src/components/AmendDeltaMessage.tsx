"use client";

import React, { useState } from "react";
import type { VerdictDecision } from "../lib/server/decide-verdict";

/**
 * Phase 6 — inline chat message that surfaces the per-race deltas after the
 * user locks a theme amendment.
 *
 * Renders verbatim from the verdict decisions:
 *   · Heading: "Re-scored N races after adding '<new theme>'"
 *   · Summary line: counts of REVISIT / HOLD / N/A
 *   · REVISIT block (prominent): top 3 by raceLabel order; "+M more to review"
 *     overflow affordance when >3
 *   · HOLD section: collapsed by default, expandable via toggle
 *   · N/A section (propositions): collapsed by default, expandable via toggle
 *
 * The REVISIT race labels are clickable and call back to the parent so the
 * chat can switch the active race (no auto-advance — the user explicitly
 * chooses to inspect a REVISIT).
 *
 * `aria-live="polite"` lets screen readers announce the deltas without
 * preempting the user's current focus. Per the packet's accessibility lane:
 * "the delta message announces REVISIT counts."
 */

export interface AmendDeltaMessageProps {
  verdicts: VerdictDecision[];
  newThemeName: string;
  /** Optional: fired when the user clicks a REVISIT race label. */
  onJumpToRace?: (raceId: string) => void;
}

const REVISIT_PREVIEW_LIMIT = 3;

function formatDelta(d: number): string {
  if (d === 0) return "±0";
  return d > 0 ? `+${d}` : String(d);
}

function VerdictRow({
  verdict,
  prominent,
  onJump,
}: {
  verdict: VerdictDecision;
  prominent: boolean;
  onJump?: (raceId: string) => void;
}) {
  const labelButton = onJump ? (
    <button
      type="button"
      data-testid={`amend-delta-jump-${verdict.raceId}`}
      onClick={() => onJump(verdict.raceId)}
      className="font-bold text-left hover:underline underline-offset-2"
    >
      {verdict.raceLabel}
    </button>
  ) : (
    <span className="font-bold">{verdict.raceLabel}</span>
  );

  return (
    <li
      data-testid={`amend-delta-row-${verdict.raceId}`}
      data-revisit={prominent ? "true" : "false"}
      className={
        "flex items-baseline justify-between gap-3 px-3 py-2 text-sm " +
        (prominent
          ? "bg-amber-50 border-l-2 border-amber-500 text-on-surface"
          : "text-on-surface-muted")
      }
    >
      <div className="min-w-0 flex-1 truncate">{labelButton}</div>
      <div className="shrink-0 tabular-nums text-xs">
        {verdict.oldScore} → {verdict.newScore}{" "}
        <span
          className={
            "ml-1 " +
            (verdict.delta < 0
              ? "text-rose-700 font-bold"
              : verdict.delta > 0
                ? "text-emerald-700 font-bold"
                : "text-on-surface-muted")
          }
        >
          ({formatDelta(verdict.delta)})
        </span>
      </div>
    </li>
  );
}

export function AmendDeltaMessage({
  verdicts,
  newThemeName,
  onJumpToRace,
}: AmendDeltaMessageProps) {
  const [holdOpen, setHoldOpen] = useState(false);
  const [naOpen, setNaOpen] = useState(false);

  const revisits = verdicts.filter((v) => v.verdict === "REVISIT");
  const holds = verdicts.filter((v) => v.verdict === "HOLD");
  const nas = verdicts.filter((v) => v.verdict === "N/A");

  const revisitVisible = revisits.slice(0, REVISIT_PREVIEW_LIMIT);
  const revisitOverflow = revisits.length - revisitVisible.length;

  return (
    <section
      data-testid="amend-delta-message"
      aria-live="polite"
      role="region"
      aria-label="Theme amendment re-score deltas"
      className="my-3 border border-outline-variant/40 bg-surface-lowest p-4"
    >
      <header className="mb-2">
        <h3 className="text-sm font-black text-on-surface">
          Re-scored {verdicts.length} {verdicts.length === 1 ? "race" : "races"}{" "}
          after adding &ldquo;
          {newThemeName}&rdquo;
        </h3>
        {verdicts.length > 0 ? (
          <p
            data-testid="amend-delta-summary"
            className="text-xs text-on-surface-muted mt-1"
          >
            {revisits.length} to revisit · {holds.length} held · {nas.length}{" "}
            not applicable
          </p>
        ) : (
          <p className="text-xs italic text-on-surface-muted mt-1">
            No decided races yet — nothing to re-score.
          </p>
        )}
      </header>

      {revisits.length > 0 && (
        <div
          data-testid="amend-delta-revisit-block"
          className="mt-2 border border-amber-200 bg-amber-50/60"
        >
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800">
            Revisit
          </div>
          <ul className="list-none m-0 p-0">
            {revisitVisible.map((v) => (
              <VerdictRow
                key={v.raceId}
                verdict={v}
                prominent
                onJump={onJumpToRace}
              />
            ))}
          </ul>
          {revisitOverflow > 0 && (
            <div
              data-testid="amend-delta-revisit-overflow"
              className="px-3 py-1.5 text-xs italic text-amber-800 border-t border-amber-200"
            >
              +{revisitOverflow} more to review
            </div>
          )}
        </div>
      )}

      {holds.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            data-testid="amend-delta-hold-toggle"
            onClick={() => setHoldOpen((p) => !p)}
            aria-expanded={holdOpen}
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted hover:text-primary"
          >
            {holdOpen ? "Hide" : "Show"} {holds.length} unchanged
          </button>
          {holdOpen && (
            <ul
              data-testid="amend-delta-hold-list"
              className="list-none m-0 p-0 mt-1 border border-outline-variant/30"
            >
              {holds.map((v) => (
                <VerdictRow
                  key={v.raceId}
                  verdict={v}
                  prominent={false}
                  onJump={onJumpToRace}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {nas.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            data-testid="amend-delta-na-toggle"
            onClick={() => setNaOpen((p) => !p)}
            aria-expanded={naOpen}
            className="text-[10px] font-black uppercase tracking-widest text-on-surface-muted hover:text-primary"
          >
            {naOpen ? "Hide" : "Show"} {nas.length} not applicable
            (propositions)
          </button>
          {naOpen && (
            <ul
              data-testid="amend-delta-na-list"
              className="list-none m-0 p-0 mt-1 border border-outline-variant/30"
            >
              {nas.map((v) => (
                <VerdictRow
                  key={v.raceId}
                  verdict={v}
                  prominent={false}
                  onJump={onJumpToRace}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
