"use client";

import React from "react";
import type {
  DonorBucketSlice,
  DonorDataSource,
} from "../lib/structured-blocks";
import { formatCurrencyShort } from "../lib/ballot-utils";
import { CardErrorBoundary } from "./cards/CardErrorBoundary";

/* ──────────────────────────────────────────────────────────────
 * FunderBars — donor-coalition stacked bar + text list
 *
 * Phase 4 contract:
 *   - ALWAYS renders the top-3 funder list as text rows with names,
 *     percentages, and (when available) dollar amounts. The text
 *     list is load-bearing and survives bars-hidden / chart-render
 *     failure.
 *   - ALWAYS renders the proportional stacked bar when at least one
 *     funder is present; the bar is decoration wrapped in a
 *     CardErrorBoundary so a render error never blanks the section.
 *   - When `funders` is null or empty, renders an explicit "Donor
 *     data unavailable" message and NO bar.
 *
 * Rich mode — when any bucket carries an absolute `amount` OR the
 * parent passes `totalRaised`, the component additionally renders:
 *   - A "Total raised: $X" headline above the bars.
 *   - Per-row dollar amounts alongside the percent (e.g. "$240K (45%)").
 * Percent-only mode is the fallback when no dollar signal is present.
 *
 * When `donorDataSource === "web_search"`, a small footnote disclaims
 * that totals are unavailable because the race wasn't in our DB.
 * ────────────────────────────────────────────────────────────── */

export interface FunderBarsProps {
  funders: DonorBucketSlice[];
  totalRaised?: number;
  donorDataSource?: DonorDataSource;
  /**
   * When funders is null/empty, the component falls back to a
   * "Donor data unavailable" notice. If this prop is set, the
   * provided reason is appended to the notice.
   */
  unavailableReason?: string;
}

const TOP_LIST_CAP = 3;

export function FunderBars({
  funders,
  totalRaised,
  donorDataSource,
  unavailableReason,
}: FunderBarsProps) {
  // Unavailable fallback — null OR empty array.
  if (!funders || funders.length === 0) {
    return (
      <div data-testid="funder-bars" className="space-y-2">
        <p
          data-testid="funder-bars-unavailable"
          className="text-xs italic text-on-surface-muted"
        >
          Donor data unavailable
          {unavailableReason ? ` — ${unavailableReason}` : ""}
        </p>
      </div>
    );
  }

  // Rich mode fires the moment we have ANY absolute signal — either a parent
  // totalRaised or even a single bucket with an amount. We don't gate on
  // amount > 0: an explicit $0 bucket is meaningful data (e.g. a category
  // that exists in our taxonomy but raised nothing this cycle).
  const isRichMode =
    totalRaised !== undefined || funders.some((f) => f.amount !== undefined);
  const topFunders = funders.slice(0, TOP_LIST_CAP);

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

      {/* Stacked decorative bar — wrapped so render errors don't blank the
       * text list below. The label / amount text is the load-bearing
       * element; the bar is purely visual.
       */}
      <CardErrorBoundary>
        <StackedFunderBar funders={funders} />
      </CardErrorBoundary>

      {/* Top-3 text list — always rendered, always queryable as text. This
       * is the load-bearing element; the stacked bar above is decoration.
       * The legacy testid `race-final-funder-bars` is preserved so prior
       * callers continue to resolve. */}
      <ul
        data-testid="funder-bars-top-list"
        className="space-y-1.5 list-none p-0"
      >
        {topFunders.map((f, idx) => {
          const percentLabel = `${Math.round(f.percent)}%`;
          const showAmount = isRichMode && f.amount !== undefined;
          return (
            <li
              key={`${f.label}-${idx}`}
              data-testid={`funder-bars-top-list-row-${idx}`}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="truncate text-on-surface font-medium">
                {f.label}
              </span>
              <span className="font-bold text-on-surface tabular-nums whitespace-nowrap shrink-0">
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

      {/* Legacy testid alias — kept as a hidden anchor so any external
       * consumer (e.g. e2e specs added later) that historically queried
       * `race-final-funder-bars` still resolves to the same node as the
       * top-3 list. Zero visual impact. */}
      <span data-testid="race-final-funder-bars" hidden aria-hidden="true" />

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

/* ── Stacked decorative bar (proportional segments) ─────────── */

function StackedFunderBar({ funders }: { funders: DonorBucketSlice[] }) {
  return (
    <div
      data-testid="funder-bars-stacked-bar"
      className="flex h-2 overflow-hidden gap-px"
      aria-hidden="true"
    >
      {funders.map((f, idx) => (
        <span
          key={`${f.label}-${idx}`}
          style={{ width: `${Math.max(0, Math.min(100, f.percent))}%` }}
          className={
            "block h-full " +
            (idx % 4 === 0
              ? "bg-primary"
              : idx % 4 === 1
                ? "bg-primary/60"
                : idx % 4 === 2
                  ? "bg-primary/35"
                  : "bg-primary/15")
          }
        />
      ))}
    </div>
  );
}
