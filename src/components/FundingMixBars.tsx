"use client";

import React from "react";

/**
 * FundingMixBars — shared stacked small/large/PAC funding bar + legend.
 *
 * Ported from docs/design/2026-redesign/prototype/prototype-components.jsx
 * (FundingMixBars, lines 368–390) with styles from prototype-c.css (.fmix*).
 *
 * Used by both CandidateCard (Money trail) and CompareModal — keep this
 * component self-contained and presentational; no side effects, no data fetching.
 *
 * Segment colors come directly from the prototype CSS:
 *   .seg.small → var(--civic)   (teal)
 *   .seg.large → var(--gold)    (gold)
 *   .seg.pac   → var(--vote-red)(red)
 * All three are @theme tokens in globals.css, so Tailwind utility classes work.
 *
 * NEEDS-KEY (English literals rendered verbatim — do NOT edit translations.ts):
 *   - "Small donors"              aria / legend label
 *   - "Large donors"              aria / legend label
 *   - "PACs"                      aria / legend label
 *   - "<$200"                     descriptor <small>
 *   - "≥$200"                     descriptor <small>
 *   - "groups & lobbies"          descriptor <small>
 *   - "Funding by source type"    aria-label on the bar wrapper
 */

export interface FundingMix {
  small: number;
  large: number;
  pac: number;
}

export interface FundingMixBarsProps {
  mix: FundingMix;
  /**
   * Minimum percent below which a segment's inline % label is hidden.
   * Avoids cramped text on narrow segments. Prototype default is 12.
   */
  labelMin?: number;
}

export function FundingMixBars({ mix, labelMin = 12 }: FundingMixBarsProps) {
  if (!mix) return null;

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Stacked bar — 30px tall, radius 6px, border-rule, paper-2 bg */}
      <div
        className="flex h-[30px] rounded-[6px] overflow-hidden border border-rule bg-paper-2"
        role="img"
        aria-label="Funding by source type" /* NEEDS-KEY */
      >
        {/* Small donors segment — civic (teal) */}
        <div
          className="grid place-items-center min-w-0 bg-civic text-paper-2 font-serif font-semibold text-[14px] tracking-[-0.01em]"
          style={{ flexBasis: mix.small + "%" }}
        >
          {mix.small >= labelMin && (
            <span>{mix.small}%</span>
          )}
        </div>

        {/* Large donors segment — gold */}
        <div
          className="grid place-items-center min-w-0 bg-gold text-ink font-serif font-semibold text-[14px] tracking-[-0.01em]"
          style={{ flexBasis: mix.large + "%" }}
        >
          {mix.large >= labelMin && (
            <span>{mix.large}%</span>
          )}
        </div>

        {/* PAC segment — vote-red */}
        <div
          className="grid place-items-center min-w-0 bg-vote-red text-paper-2 font-serif font-semibold text-[14px] tracking-[-0.01em]"
          style={{ flexBasis: mix.pac + "%" }}
        >
          {mix.pac >= labelMin && (
            <span>{mix.pac}%</span>
          )}
        </div>
      </div>

      {/* Legend — 3-column grid (collapses to 1-column on narrow screens) */}
      <div className="grid grid-cols-3 gap-x-[18px] gap-y-[6px] sm:grid-cols-1 justify-start text-[13px] text-ink-3">
        {/* Small donors */}
        <div className="flex items-center gap-[7px] leading-[1.3]">
          <span className="w-[11px] h-[11px] rounded-[3px] flex-shrink-0 bg-civic" />
          <span>
            <b className="text-ink font-semibold">{mix.small}%</b>{" "}
            {/* NEEDS-KEY: "Small donors" */}
            Small donors{" "}
            <small className="text-ink-3">
              {/* NEEDS-KEY: "<$200" */}
              &lt;$200
            </small>
          </span>
        </div>

        {/* Large donors */}
        <div className="flex items-center gap-[7px] leading-[1.3]">
          <span className="w-[11px] h-[11px] rounded-[3px] flex-shrink-0 bg-gold" />
          <span>
            <b className="text-ink font-semibold">{mix.large}%</b>{" "}
            {/* NEEDS-KEY: "Large donors" */}
            Large donors{" "}
            <small className="text-ink-3">
              {/* NEEDS-KEY: "≥$200" */}
              &ge;$200
            </small>
          </span>
        </div>

        {/* PACs */}
        <div className="flex items-center gap-[7px] leading-[1.3]">
          <span className="w-[11px] h-[11px] rounded-[3px] flex-shrink-0 bg-vote-red" />
          <span>
            <b className="text-ink font-semibold">{mix.pac}%</b>{" "}
            {/* NEEDS-KEY: "PACs" */}
            PACs{" "}
            <small className="text-ink-3">
              {/* NEEDS-KEY: "groups & lobbies" */}
              groups &amp; lobbies
            </small>
          </span>
        </div>
      </div>
    </div>
  );
}
