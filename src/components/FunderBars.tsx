"use client";

import React from "react";
import type { RaceFinalFunder } from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * FunderBars — donor-coalition stacked bar render
 *
 * Takes an array of { label, percent } entries and renders
 * proportional horizontal bar segments for each funder bucket.
 * Extracted from RaceFinalEvaluation.tsx; behavior is unchanged.
 * ────────────────────────────────────────────────────────────── */

export interface FunderBarsProps {
  funders: RaceFinalFunder[];
}

export function FunderBars({ funders }: FunderBarsProps) {
  return (
    <ul
      data-testid="race-final-funder-bars"
      className="space-y-1.5 list-none p-0"
    >
      {funders.map((f, idx) => (
        <li
          key={`${f.label}-${idx}`}
          className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 text-xs"
        >
          <span className="truncate text-on-surface font-medium">
            {f.label}
          </span>
          <span
            className="relative h-2 bg-on-surface/10 overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="block h-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(100, f.percent))}%` }}
            />
          </span>
          <span className="font-bold text-on-surface tabular-nums">
            {Math.round(f.percent)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
