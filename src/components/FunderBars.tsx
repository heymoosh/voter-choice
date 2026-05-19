"use client";

import React from "react";
import type {
  DonorBucketSlice,
  DonorDataSource,
} from "../lib/structured-blocks";
import { formatCurrencyShort } from "../lib/ballot-utils";

/* ──────────────────────────────────────────────────────────────
 * FunderBars — donor-coalition stacked bar render
 *
 * Takes an array of { label, percent } entries and renders
 * proportional horizontal bar segments for each funder bucket.
 *
 * "Rich mode" — when any bucket carries an absolute `amount` OR the
 * parent passes `totalRaised`, the component additionally renders:
 *   - A "Total raised: $X" headline above the bars.
 *   - Per-bar dollar amounts alongside the percent (e.g. "$240K (45%)").
 * Percent-only mode (the original behavior) is used otherwise.
 *
 * When `donorDataSource === "web_search"`, a small footnote disclaims
 * that totals are unavailable because the race wasn't in our DB.
 * ────────────────────────────────────────────────────────────── */

export interface FunderBarsProps {
  funders: DonorBucketSlice[];
  totalRaised?: number;
  donorDataSource?: DonorDataSource;
}

export function FunderBars({
  funders,
  totalRaised,
  donorDataSource,
}: FunderBarsProps) {
  // Rich mode fires the moment we have ANY absolute signal — either a parent
  // totalRaised or even a single bucket with an amount. We don't gate on
  // amount > 0: an explicit $0 bucket is meaningful data (e.g. a category
  // that exists in our taxonomy but raised nothing this cycle).
  const isRichMode =
    totalRaised !== undefined || funders.some((f) => f.amount !== undefined);

  return (
    <div data-testid="funder-bars" className="space-y-2">
      {isRichMode && totalRaised !== undefined && (
        <p
          data-testid="funder-bars-total-raised"
          className="text-xs font-bold text-on-surface"
        >
          <span className="text-on-surface-muted font-medium">
            Total raised:{" "}
          </span>
          {formatCurrencyShort(totalRaised)}
        </p>
      )}
      <ul
        data-testid="race-final-funder-bars"
        className="space-y-1.5 list-none p-0"
      >
        {funders.map((f, idx) => {
          const percentLabel = `${Math.round(f.percent)}%`;
          // Per-bar amount only appears in rich mode when the bucket has one
          // — the parent total alone shouldn't force a "$undefined" per bar.
          const showAmount = isRichMode && f.amount !== undefined;
          return (
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
                  style={{
                    width: `${Math.max(0, Math.min(100, f.percent))}%`,
                  }}
                />
              </span>
              <span className="font-bold text-on-surface tabular-nums whitespace-nowrap">
                {showAmount ? (
                  <span data-testid={`funder-bar-amount-${idx}`}>
                    {formatCurrencyShort(f.amount as number)}{" "}
                    <span className="text-on-surface-muted font-medium">
                      ({percentLabel})
                    </span>
                  </span>
                ) : (
                  percentLabel
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {donorDataSource === "web_search" && (
        <p
          data-testid="funder-bars-web-search-footnote"
          className="text-[10px] italic text-on-surface-muted"
        >
          Source: web search — totals not available in our database for this
          race.
        </p>
      )}
    </div>
  );
}
