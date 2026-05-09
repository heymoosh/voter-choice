"use client";

import React from "react";

/* ──────────────────────────────────────────────────────────────
 * PlatformAlignmentRatio — platform-alignment ratio render
 *
 * Renders { kept } / { total } with proportional dot indicators.
 * Capped at ALIGNMENT_DOT_CAP dots for readability.
 * Extracted from RaceFinalEvaluation.tsx; behavior is unchanged.
 *
 * Callers are responsible for rendering the surrounding heading,
 * the source chip, and the challenger-null / alignmentUnavailable
 * empty states — this component only renders when a numeric
 * alignment object is available.
 * ────────────────────────────────────────────────────────────── */

const ALIGNMENT_DOT_CAP = 12;

export interface PlatformAlignmentRatioProps {
  alignment: { kept: number; total: number };
  unitLabel: string;
}

export function PlatformAlignmentRatio({
  alignment,
  unitLabel,
}: PlatformAlignmentRatioProps) {
  const { kept, total } = alignment;
  const visualTotal = Math.min(total, ALIGNMENT_DOT_CAP);
  const visualKept =
    total <= ALIGNMENT_DOT_CAP
      ? kept
      : Math.round((kept / total) * ALIGNMENT_DOT_CAP);

  const dots: React.ReactElement[] = [];
  for (let i = 0; i < visualTotal; i++) {
    const filled = i < visualKept;
    dots.push(
      <span
        key={i}
        aria-hidden="true"
        className={
          "inline-block text-base leading-none " +
          (filled ? "text-primary" : "text-on-surface/15")
        }
      >
        ●
      </span>,
    );
  }

  return (
    <div
      data-testid="race-final-alignment-ladder"
      className="flex items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-1">{dots}</div>
      <span className="font-bold text-on-surface tabular-nums shrink-0">
        {kept} / {total} {unitLabel}
      </span>
    </div>
  );
}
