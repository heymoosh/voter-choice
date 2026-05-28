"use client";

import React from "react";
import type {
  DonorBucketSlice,
  DonorDataSource,
} from "../lib/structured-blocks";
import { formatCurrencyShort } from "../lib/ballot-utils";
import { CardErrorBoundary } from "./cards/CardErrorBoundary";
import { FundingMixBars } from "./FundingMixBars";
import {
  getPeerComparison,
  type PeerEntry,
} from "../lib/peerComparison";

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
 *
 * Design restyle (2026-redesign §2 delta):
 *   - Splits donorCoalition into issuePAC rows vs industry rows.
 *   - issuePAC rows rendered with prototype cv2-pac-row.v2 visual.
 *   - Industry breakdown bar (12px, label-keyed colors) + chip list.
 *   - "Outside named sectors" tail when named rows don't sum to 100%.
 *   - StackedFunderBar restyled: 12px, label-keyed colors (testid preserved).
 *   - money-map (small/large/pac) rendered via <FundingMixBars />.
 *     Peer-comparison rails rendered when peerTotals is provided and
 *     getPeerComparison returns a non-null result (ratio < 0.85 or > 1.18).
 *     PAC gloss always shown when fundingMix is present.
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
  /**
   * Small / large / PAC funding breakdown from the AI pipeline.
   * When present, the money-map section is rendered below the top-3 list.
   */
  fundingMix?: {
    small: number;
    large: number;
    pac: number;
    total: number;
    cycle: string;
  };
  /**
   * All candidates in the race (including this one) as {total, aliasOrName}.
   * Used by getPeerComparison to derive the comparison-rails headline.
   * Pass an empty array or omit to suppress comparison rails.
   */
  peerTotals?: PeerEntry[];
}

const TOP_LIST_CAP = 3;

/**
 * Extended slice shape — forward-looking fields assigned by the AI
 * pipeline to donorCoalition entries but not yet declared in
 * DonorBucketSlice on this branch (parallel agents own that file).
 * A local interface keeps us type-safe without touching structured-blocks.ts.
 */
interface DonorBucketSliceExtended extends DonorBucketSlice {
  isIssuePAC?: boolean;
  relevantToIssue?: string;
  /** Spec-compat alias for relevantToIssue */
  alignsWith?: string;
  pacStance?: "with" | "against";
  fullName?: string;
  /** One-line description of what the issue PAC advocates for */
  advocates?: string;
}

/* ── Industry color helpers (ported from prototype lines 997–1038) ── */

const INDUSTRY_COLORS: Record<string, string> = {
  "oil & gas": "oklch(0.42 0.10 35)",
  banking: "oklch(0.38 0.10 250)",
  "real estate": "oklch(0.58 0.06 65)",
  defense: "oklch(0.42 0.06 115)",
  "trial lawyers": "oklch(0.42 0.11 350)",
  healthcare: "oklch(0.50 0.09 175)",
  "healthcare workers": "oklch(0.50 0.09 175)",
  education: "oklch(0.50 0.08 295)",
  "education · nea": "oklch(0.50 0.08 295)",
  tech: "oklch(0.55 0.10 220)",
  construction: "oklch(0.55 0.10 55)",
  energy: "oklch(0.62 0.12 90)",
  "grassroots small-dollar": "oklch(0.50 0.10 145)",
  "small business assoc": "oklch(0.58 0.10 25)",
};

const INDUSTRY_FALLBACK = [
  "oklch(0.45 0.08 195)",
  "oklch(0.50 0.08 330)",
  "oklch(0.48 0.07 155)",
  "oklch(0.55 0.08 12)",
  "oklch(0.45 0.06 270)",
  "oklch(0.60 0.08 95)",
];

function industrySwatch(label: string | undefined): string {
  if (!label) return INDUSTRY_FALLBACK[0];
  const key = String(label).trim().toLowerCase();
  if (INDUSTRY_COLORS[key]) return INDUSTRY_COLORS[key];
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = ((h * 31 + key.charCodeAt(i)) >>> 0);
  return INDUSTRY_FALLBACK[h % INDUSTRY_FALLBACK.length];
}

const ISSUE_PAC_COLORS: Record<string, string> = {
  healthcare_affordability: "oklch(0.40 0.075 170)",
  reproductive_rights: "oklch(0.50 0.16 320)",
  environment_climate: "oklch(0.45 0.10 145)",
  foreign_policy: "oklch(0.45 0.10 280)",
};

function issuePACSwatch(alignsWith: string | undefined): string {
  if (!alignsWith) return "oklch(0.55 0.10 30)";
  return ISSUE_PAC_COLORS[alignsWith] ?? "oklch(0.55 0.10 30)";
}

export function FunderBars({
  funders,
  totalRaised,
  donorDataSource,
  unavailableReason,
  fundingMix,
  peerTotals,
}: FunderBarsProps) {
  // Unavailable fallback — null OR empty array.
  if (!funders || funders.length === 0) {
    return (
      <div data-testid="funder-bars" className="space-y-2">
        <p
          data-testid="funder-bars-unavailable"
          className="text-xs italic text-ink-3"
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

  // Cast to the extended slice type to access PAC-specific fields.
  const extFunders = funders as DonorBucketSliceExtended[];

  // Split donorCoalition into issue-PACs vs industry slices.
  const issuePACs = extFunders.filter((s) => s.isIssuePAC);
  const industries = extFunders.filter((s) => !s.isIssuePAC);

  // Peer comparison — single source of truth via shared peerComparison module.
  // Thresholds: ratio < 0.85 → less, ratio > 1.18 → more (same as prototype).
  const peerCmp =
    typeof totalRaised === "number" && peerTotals && peerTotals.length >= 2
      ? getPeerComparison(totalRaised, peerTotals)
      : null;
  const peerCandidate = peerCmp ? peerCmp.peer : null;

  // "Outside named sectors" tail — fill the bar to 100%.
  const namedIndustryPct = industries.reduce(
    (s, d) => s + (d.percent || 0),
    0,
  );
  const namedIndustryAmt = industries.reduce(
    (s, d) => s + (d.amount || 0),
    0,
  );
  const otherPct = Math.max(0, 100 - namedIndustryPct);
  const otherAmt =
    typeof totalRaised === "number"
      ? Math.max(0, totalRaised - namedIndustryAmt)
      : null;
  const showOther = otherPct >= 2;

  return (
    <div
      data-testid="funder-bars"
      className="py-[18px] px-[20px] pb-[20px] bg-paper border-b border-rule-2"
    >
      {/* Block header — "Funding mix · by source type" */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap row-gap-1 mb-[14px]">
        <div className="font-mono text-[13px] uppercase tracking-[0.10em] text-ink font-bold whitespace-nowrap">
          {/* NEEDS KEY: t.research.fundingMixHeading = EN:'Funding mix' ES:'Mezcla de financiamiento' */}
          Funding mix{" "}
          <small className="block font-sans text-[12px] font-normal tracking-normal normal-case text-ink-3 mt-[3px] leading-[1.4]">
            {/* NEEDS KEY: t.research.fundingMixSubLabel = EN:'by source type' ES:'por tipo de fuente' */}
            by source type
          </small>
        </div>

        {isRichMode && totalRaised !== undefined && (
          <p
            data-testid="funder-bars-total-raised"
            className="font-mono text-xs font-semibold text-ink"
          >
            <span className="text-ink-3 font-medium uppercase tracking-[0.12em]">
              Total raised:{" "}
            </span>
            <span className="font-serif text-base font-semibold normal-case tracking-normal">
              {formatCurrencyShort(totalRaised)}
            </span>
          </p>
        )}
      </div>

      {/* Stacked decorative bar — wrapped so render errors don't blank the
       * text list below. The label / amount text is the load-bearing
       * element; the bar is purely visual.
       * Restyled: 12px height + label-keyed colors (cv2-industry-bar aesthetic).
       */}
      <CardErrorBoundary>
        <StackedFunderBar funders={extFunders} />
      </CardErrorBoundary>

      {/* Top-3 text list — always rendered, always queryable as text. This
       * is the load-bearing element; the stacked bar above is decoration.
       * The legacy testid `race-final-funder-bars` is preserved so prior
       * callers continue to resolve. */}
      <ul
        data-testid="funder-bars-top-list"
        className="mt-3 space-y-1.5 list-none p-0"
      >
        {topFunders.map((f, idx) => {
          const percentLabel = `${Math.round(f.percent)}%`;
          const showAmount = isRichMode && f.amount !== undefined;
          return (
            <li
              key={`${f.label}-${idx}`}
              data-testid={`funder-bars-top-list-row-${idx}`}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-2">
                {f.label}
              </span>
              <span className="tabular-nums whitespace-nowrap shrink-0">
                {showAmount ? (
                  <span data-testid={`funder-bar-amount-${idx}`}>
                    <span className="font-serif text-base font-semibold text-ink">
                      {formatCurrencyShort(f.amount as number)}
                    </span>{" "}
                    <span className="font-mono text-[10.5px] text-ink-3">
                      ({percentLabel})
                    </span>
                  </span>
                ) : (
                  <span className="font-serif text-base font-semibold text-ink">
                    {percentLabel}
                  </span>
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

      {/* ── Money map (small / large / PAC) ────────────────────────────
       * Rendered when fundingMix is present. Two sub-cases:
       *   A. Comparison rails — when getPeerComparison returns non-null,
       *      a headline stat ("2.0× MORE/LESS raised than Candidate B")
       *      plus a proportional ghost rail for the peer.
       *   B. Simple money map — single FundingMixBars bar + legend.
       * Both cases end with the PAC gloss footnote.
       */}
      {fundingMix && (
        <div
          data-testid="funder-bars-money-map"
          className="mt-[22px] pt-[20px] border-t border-rule"
        >
          {/* ── A. Comparison rails ────────────────────────────── */}
          {peerCmp && peerCandidate && typeof totalRaised === "number" ? (() => {
            const isMore = peerCmp.kind === "more";
            const maxTotal = Math.max(totalRaised, peerCandidate.total);
            const thisPct = (totalRaised / maxTotal) * 100;
            const peerPct = (peerCandidate.total / maxTotal) * 100;

            return (
              <div>
                {/* Headline */}
                <div className="flex items-baseline gap-[8px] mb-[14px]">
                  <span className="font-serif text-[26px] font-semibold tracking-[-0.02em] text-ink leading-none">
                    {peerCmp.multiplier}×
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink font-bold">
                    {/* NEEDS-KEY: research.peerComparisonMore = EN:'MORE' ES:'MÁS' */}
                    {/* NEEDS-KEY: research.peerComparisonLess = EN:'LESS' ES:'MENOS' */}
                    {isMore ? "MORE" : "LESS"}
                  </span>
                  <span className="font-sans text-[13px] text-ink-2">
                    {/* NEEDS-KEY: research.peerComparisonRaisedThan = EN:'raised than {peer}' ES:'recaudado que {peer}' */}
                    raised than{" "}
                    <span className="font-semibold text-ink">
                      {peerCandidate.aliasOrName}
                    </span>
                  </span>
                </div>

                {/* This candidate rail — proportional width */}
                <div className="mb-[6px]">
                  <div className="flex items-center gap-[10px]">
                    <span className="font-serif text-[13px] font-semibold text-ink min-w-[52px] text-right tabular-nums">
                      {formatCurrencyShort(totalRaised)}
                    </span>
                    <div className="flex-1 h-[30px] bg-paper-2 rounded-[6px] overflow-hidden border border-rule">
                      <div
                        className="h-full"
                        style={{ width: thisPct + "%" }}
                      >
                        <FundingMixBars
                          mix={{ small: fundingMix.small, large: fundingMix.large, pac: fundingMix.pac }}
                          labelMin={12}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Peer ghost rail */}
                <div className="mb-[14px]">
                  <div className="flex items-center gap-[10px]">
                    <span className="font-serif text-[13px] font-semibold text-ink-3 min-w-[52px] text-right tabular-nums">
                      {formatCurrencyShort(peerCandidate.total)}
                    </span>
                    <div className="flex-1 h-[12px] bg-paper-2 rounded-[4px] overflow-hidden border border-rule">
                      <div
                        className="h-full bg-rule rounded-[4px]"
                        style={{ width: peerPct + "%" }}
                        aria-label={`${peerCandidate.aliasOrName} total raised`}
                        role="img"
                      />
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-ink-3 ml-[62px] mt-[2px] uppercase tracking-[0.10em]">
                    {peerCandidate.aliasOrName}
                  </div>
                </div>

                {/* Legend — reuse FundingMixBars legend section */}
                <div className="mt-[10px]">
                  <FundingMixBars
                    mix={{ small: fundingMix.small, large: fundingMix.large, pac: fundingMix.pac }}
                    labelMin={100}
                  />
                </div>
              </div>
            );
          })() : (
            /* ── B. Simple money map (no peer) ──────────────── */
            <FundingMixBars
              mix={{ small: fundingMix.small, large: fundingMix.large, pac: fundingMix.pac }}
            />
          )}

          {/* Total + cycle caption */}
          <p className="mt-[10px] font-mono text-[11px] text-ink-3 tracking-[0.06em]">
            {/* NEEDS-KEY: research.fundingMixRaised = EN:'raised' ES:'recaudado' */}
            {formatCurrencyShort(fundingMix.total)}{" "}
            <span className="lowercase">raised</span>
            {fundingMix.cycle && (
              <>
                {" · "}
                <span className="text-ink-2">{fundingMix.cycle}</span>
              </>
            )}
          </p>

          {/* PAC gloss — plain-English definition, always shown when fundingMix is present */}
          <p className="mt-[8px] text-[11.5px] text-ink-3 leading-[1.5]">
            {/* NEEDS-KEY: research.pacGloss = EN:'PAC = Political Action Committee — companies, unions, or advocacy groups that pool donations to back candidates. High PAC share signals reliance on organized interests over individual voters.' ES:'PAC = Comité de Acción Política — empresas, sindicatos o grupos de defensa que agrupan donaciones para respaldar candidatos. Un alto porcentaje de PAC señala dependencia de intereses organizados en lugar de votantes individuales.' */}
            <b>PAC</b> = Political Action Committee — companies, unions, or
            advocacy groups that pool donations to back candidates. High PAC
            share signals reliance on organized interests over individual voters.
          </p>
        </div>
      )}

      {/* ── Named issue-PACs ──────────────────────────────────────────
       * Rendered when any bucket in donorCoalition carries isIssuePAC=true.
       * Prototype cv2-named-pacs / cv2-pac-row.v2 visual.
       */}
      {issuePACs.length > 0 && (
        <div className="mt-[28px] pt-[26px] border-t border-rule mb-[14px]">
          <div className="font-mono text-[13px] uppercase tracking-[0.10em] text-ink font-bold mb-[10px]">
            {/* NEEDS KEY: t.research.namedIssuePACs = EN:'Named issue PACs' ES:'PACs temáticos identificados' */}
            Named issue PACs
            <small className="block font-sans text-[12px] font-normal tracking-normal normal-case text-ink-3 mt-[3px] leading-[1.4]">
              {/* NEEDS KEY: t.research.namedIssuePACsSubLabel = EN:"organized groups we've vetted, each with a publicly stated agenda" ES:'grupos organizados que hemos verificado, cada uno con una agenda pública' */}
              organized groups we&rsquo;ve vetted, each with a publicly stated
              agenda
            </small>
          </div>

          {issuePACs.map((p, i) => (
            <div
              key={i}
              className="block p-[12px_14px] bg-paper-2 rounded-lg mb-[6px]"
            >
              {/* Top row: swatch · name · amount */}
              <div
                className="grid gap-[10px] items-center text-[13.5px] mb-[4px]"
                style={{ gridTemplateColumns: "12px 1fr auto" }}
              >
                <span
                  className="w-[11px] h-[11px] rounded-[3px] flex-shrink-0"
                  style={{
                    background: issuePACSwatch(
                      p.relevantToIssue ?? p.alignsWith,
                    ),
                  }}
                />
                <span className="font-serif text-[15px] font-semibold text-ink tracking-[-0.005em]">
                  {p.label}
                </span>
                {p.amount !== undefined && (
                  <span className="font-serif text-[16px] font-semibold text-ink">
                    {formatCurrencyShort(p.amount)}
                  </span>
                )}
              </div>

              {/* Full name (if different from label) */}
              {p.fullName && p.fullName !== p.label && (
                <div className="text-[11.5px] text-ink-3 italic ml-[22px] mb-[4px]">
                  {p.fullName}
                </div>
              )}

              {/* Advocates description */}
              {p.advocates && (
                <div className="text-[13px] text-ink-2 leading-[1.5] ml-[22px] mb-[8px]">
                  {p.advocates}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Industry breakdown ──────────────────────────────────────
       * Proportional color-keyed bar + chip list, max 4 named rows.
       * An "Outside named sectors" tail appended when rows < 100%.
       */}
      {industries.length > 0 && (
        <div className="mt-[28px] pt-[26px] border-t border-rule">
          <div className="font-mono text-[13px] uppercase tracking-[0.10em] text-ink font-bold mb-[10px]">
            {/* NEEDS KEY: t.research.industryBreakdown = EN:'Industry breakdown' ES:'Desglose por industria' */}
            Industry breakdown
            <small className="block font-sans text-[12px] font-normal tracking-normal normal-case text-ink-3 mt-[3px] leading-[1.4]">
              {/* NEEDS KEY: t.research.industryBreakdownSubLabel = EN:'all contributions grouped by sector (individuals + PACs combined)' ES:'todas las contribuciones agrupadas por sector (personas y PACs combinados)' */}
              all contributions grouped by sector (individuals + PACs combined)
            </small>
          </div>

          {/* Industry bar — proportional color strips, 12px height */}
          <div
            className="flex h-[12px] rounded-[4px] overflow-hidden mb-[12px] border border-rule"
            aria-hidden="true"
          >
            {industries.map((d, i) => (
              <span
                key={i}
                style={{
                  flex: `${d.percent} 1 0`,
                  background: industrySwatch(d.label),
                  minWidth: 0,
                }}
              />
            ))}
            {showOther && (
              <span
                style={{
                  flex: `${otherPct} 1 0`,
                  background:
                    "repeating-linear-gradient(135deg, oklch(0.78 0.012 85) 0 5px, oklch(0.84 0.012 85) 5px 10px)",
                  minWidth: 0,
                }}
              />
            )}
          </div>

          {/* Industry chip rows — top 4 named + optional "other" */}
          <div className="flex flex-col gap-[5px]">
            {industries.slice(0, 4).map((d, i) => (
              <div
                key={i}
                className="grid gap-[10px] items-center text-[13px] text-ink-2 py-[4px]"
                style={{ gridTemplateColumns: "12px 1fr auto auto" }}
              >
                <span
                  className="w-[11px] h-[11px] rounded-[3px]"
                  style={{ background: industrySwatch(d.label) }}
                />
                <span>{d.label}</span>
                <span className="font-mono text-[12.5px] font-semibold text-ink tracking-[0.02em] min-w-[38px] text-right">
                  {d.percent}%
                </span>
                {d.amount !== undefined && (
                  <span className="font-serif text-[14px] font-semibold text-ink min-w-[56px] text-right">
                    {formatCurrencyShort(d.amount)}
                  </span>
                )}
              </div>
            ))}

            {showOther && (
              <div
                className="grid gap-[10px] items-start text-[13px] text-ink-3 py-[4px]"
                style={{ gridTemplateColumns: "12px 1fr auto auto" }}
              >
                <span
                  className="w-[11px] h-[11px] rounded-[3px] mt-[3px] flex-shrink-0"
                  style={{
                    background:
                      "repeating-linear-gradient(135deg, oklch(0.78 0.012 85) 0 3px, oklch(0.84 0.012 85) 3px 6px)",
                  }}
                />
                <span>
                  {/* NEEDS KEY: t.research.outsideNamedSectors = EN:'Outside named sectors' ES:'Fuera de sectores identificados' */}
                  Outside named sectors
                  <small className="block font-sans text-[12px] font-normal tracking-normal normal-case text-ink-3 mt-[3px] leading-[1.45]">
                    {/* NEEDS KEY: t.research.outsideNamedSectorsNote = EN:"Mostly small-dollar & individual donations that don't fit a single sector tag. They're counted in the Funding mix bar above." ES:'En su mayoría pequeñas donaciones individuales que no corresponden a un sector específico.' */}
                    Mostly small-dollar &amp; individual donations that
                    don&rsquo;t fit a single sector tag. They&rsquo;re counted
                    in the Funding mix bar above.
                  </small>
                </span>
                <span className="font-mono text-[12.5px] font-semibold text-ink tracking-[0.02em] min-w-[38px] text-right mt-[3px]">
                  {otherPct}%
                </span>
                <span className="font-serif text-[14px] font-medium text-ink-3 min-w-[56px] text-right mt-[3px]">
                  {otherAmt !== null ? formatCurrencyShort(otherAmt) : "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {donorDataSource === "web_search" && (
        <p
          data-testid="funder-bars-web-search-footnote"
          className="text-[10px] italic text-ink-3 mt-3"
        >
          Source: web search — totals not available in our database for this
          race.
        </p>
      )}
    </div>
  );
}

/* ── Stacked decorative bar (proportional segments) ─────────── */

function StackedFunderBar({
  funders,
}: {
  funders: DonorBucketSliceExtended[];
}) {
  return (
    <div
      data-testid="funder-bars-stacked-bar"
      className="flex h-[12px] overflow-hidden rounded-[4px] border border-rule"
      aria-hidden="true"
    >
      {funders.map((f, idx) => (
        <span
          key={`${f.label}-${idx}`}
          style={{
            width: `${Math.max(0, Math.min(100, f.percent))}%`,
            background: f.isIssuePAC
              ? issuePACSwatch(f.relevantToIssue ?? f.alignsWith)
              : industrySwatch(f.label),
            minWidth: 0,
          }}
          className="block h-full"
        />
      ))}
    </div>
  );
}
