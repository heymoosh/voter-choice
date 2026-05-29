"use client";

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type {
  RacePatternsBlock,
  RacePatternsCandidate,
  DonorBucketSlice,
  EndorsementEntry,
  RetrospectiveEntry,
  SourceRef,
  AlignmentScoresEntry,
} from "../lib/structured-blocks";
import { FunderBars } from "./FunderBars";
import { PlatformAlignmentRatio } from "./PlatformAlignmentRatio";
import { AlignmentScoreBanner } from "./AlignmentScoreBanner";
import { AlignmentDrilldown } from "./AlignmentDrilldown";
import { getCandidateIdentity } from "../lib/candidateIdentity";
import { anonymizeText } from "../lib/anonymizeText";
import { formatCurrencyShort } from "../lib/ballot-utils";
import { getPeerComparison, type PeerEntry } from "../lib/peerComparison";

/* ──────────────────────────────────────────────────────────────
 * RacePatterns — four-pattern candidate/proposition dashboard.
 *
 * Candidate variant:
 *   - Anonymized (Candidate A / B / C) by default; Pick enabled from the start.
 *   - "Reveal candidates" / "Hide names" button toggles real names on/off
 *     so voters can pick anonymously and then optionally reveal.
 *
 * Proposition variant (detected automatically):
 *   - EVERY candidate has incumbent === false AND name starts with
 *     "YES on " or "NO on " (case-insensitive).
 *   - Labels shown from the start; no reveal button; Pick enabled.
 *
 * Source footnotes:
 *   - Inline superscript badges (¹²³…) are rendered next to each
 *     data point.
 *   - A single "Sources" section at the bottom lists them numbered
 *     in order of first appearance.
 * ────────────────────────────────────────────────────────────── */

export interface RacePatternsProps {
  block: RacePatternsBlock;
  onPick: (candidateId: string, candidateName: string) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
  pickedCandidateId?: string;
  isStreaming?: boolean;
  alignmentScoresByCandidate?: Map<string, AlignmentScoresEntry>;
  /** Blind-mode: when true, candidate names are hidden as Candidate A/B/C. */
  blindMode?: boolean;
  /** Set of candidateIds that have been individually revealed in blind mode. */
  revealedCandidates?: Set<string>;
  /** Called when the voter taps "Reveal" on a single candidate card. */
  onRevealCandidate?: (id: string) => void;
  /** Called when the voter clicks "Compare" (candidate races only). */
  onCompare?: () => void;
  /** Called when the voter clicks "See all votes →" on a candidate card. */
  onSeeAllVotes?: (payload: {
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry | undefined;
    blindMode: boolean;
    alias: string;
  }) => void;
  /** Called when voter re-anonymizes a previously revealed candidate card. */
  onHideCandidate?: (id: string) => void;
}

/* ── Anonymous label helpers ──────────────────────────────── */

const ANON_LABELS = ["A", "B", "C", "D", "E", "F"];

function anonLabel(idx: number): string {
  return ANON_LABELS[idx] ?? String(idx + 1);
}

/* ── Money-trail teaser helpers (ported from prototype) ─────── */

/* fundingMixSummary — "62% small donors · 30% large donors · 8% PACs".
   Drops any bucket that's null. Used in the Money-trail disclosure teaser. */
function fundingMixSummary(
  mix: { small: number; large: number; pac: number } | undefined,
): string | null {
  if (!mix) return null;
  const parts: string[] = [];
  /* NEEDS-KEY: research.fundingMixSmallDonors — EN "{n}% small donors" / ES "{n}% donantes pequeños" */
  if (mix.small != null) parts.push(`${mix.small}% small donors`);
  /* NEEDS-KEY: research.fundingMixLargeDonors — EN "{n}% large donors" / ES "{n}% donantes grandes" */
  if (mix.large != null) parts.push(`${mix.large}% large donors`);
  /* NEEDS-KEY: research.fundingMixPacs — EN "{n}% PACs" / ES "{n}% PACs" */
  if (mix.pac != null) parts.push(`${mix.pac}% PACs`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/* computePeerLabel — thin wrapper over getPeerComparison returning just the
   teaser label string ("2.0× more than Candidate B") or null when too close. */
function computePeerLabel(
  totalRaised: number,
  peerTotals: PeerEntry[] | undefined,
): string | null {
  if (typeof totalRaised !== "number" || !peerTotals) return null;
  const cmp = getPeerComparison(totalRaised, peerTotals);
  return cmp ? cmp.label : null;
}

/* ── Proposition detection ────────────────────────────────── */

function isPropositionBlock(block: RacePatternsBlock): boolean {
  if (block.candidates.length === 0) return false;
  return block.candidates.every(
    (c) => c.incumbent === false && /^(yes|no) on /i.test(c.name.trim()),
  );
}

/* ── Proposition impact columns (Phase 4 text-first) ──────── */

const PROP_IMPACT_FALLBACK = "(impact not yet summarized)";

function findPropSide(
  block: RacePatternsBlock,
  side: "yes" | "no",
): RacePatternsCandidate | undefined {
  const re = side === "yes" ? /^yes on /i : /^no on /i;
  return block.candidates.find((c) => re.test(c.name.trim()));
}

function PropositionImpactColumns({ block }: { block: RacePatternsBlock }) {
  const yesSide = findPropSide(block, "yes");
  const noSide = findPropSide(block, "no");
  const yesImpact = yesSide?.priorRole?.trim();
  const noImpact = noSide?.priorRole?.trim();

  return (
    <div
      data-testid="race-patterns-impact-columns"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-rule rounded-xl p-4 bg-paper-2"
    >
      <div
        data-testid="race-patterns-impact-yes"
        className="md:pt-3 md:border-t-2 md:border-civic"
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic mb-1.5">
          If yes
        </p>
        <p className="font-serif text-sm text-ink-2 leading-snug">
          {yesImpact ?? PROP_IMPACT_FALLBACK}
        </p>
      </div>
      <div
        data-testid="race-patterns-impact-no"
        className="md:pt-3 md:border-t-2 md:border-vote-red"
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-vote-red mb-1.5">
          If no
        </p>
        <p className="font-serif text-sm text-ink-2 leading-snug">
          {noImpact ?? PROP_IMPACT_FALLBACK}
        </p>
      </div>
    </div>
  );
}

/* ── Source registry (per-render, passed by ref) ────────────
 * Collects sources in order of first appearance and returns
 * the 1-based footnote number for each.
 */

interface SourceRegistry {
  add(source: SourceRef): number;
  entries(): { num: number; source: SourceRef }[];
}

function makeSourceRegistry(): SourceRegistry {
  const list: { key: string; source: SourceRef }[] = [];

  function keyOf(s: SourceRef): string {
    return s.url ?? s.name;
  }

  return {
    add(source: SourceRef): number {
      const k = keyOf(source);
      const existing = list.findIndex((e) => e.key === k);
      if (existing !== -1) return existing + 1;
      list.push({ key: k, source });
      return list.length;
    },
    entries() {
      return list.map((e, i) => ({ num: i + 1, source: e.source }));
    },
  };
}

/* ── Inline superscript footnote badge ──────────────────────*/

function FootnoteRef({ num }: { num: number }) {
  return (
    <sup
      aria-label={`Source ${num}`}
      className="ml-0.5 text-[9px] font-bold text-primary leading-none select-none"
    >
      [{num}]
    </sup>
  );
}

/* ── EndorsementCluster ─────────────────────────────────────*/

const CATEGORY_COLORS: Record<string, string> = {
  labor: "bg-amber-100 text-amber-800 border-amber-300",
  business: "bg-blue-100 text-blue-800 border-blue-300",
  civic: "bg-emerald-100 text-emerald-800 border-emerald-300",
  faith: "bg-purple-100 text-purple-800 border-purple-300",
  advocacy: "bg-rose-100 text-rose-800 border-rose-300",
  media: "bg-slate-100 text-slate-700 border-slate-300",
  other: "bg-on-surface/5 text-on-surface-muted border-outline-variant/30",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS["other"];
}

const PARTISAN_LEAN_STYLES: Record<
  NonNullable<EndorsementEntry["partisanLean"]>,
  string
> = {
  partisan: "bg-amber-100 text-amber-800 border-amber-400",
  nonpartisan: "bg-emerald-100 text-emerald-800 border-emerald-400",
  mixed: "bg-slate-100 text-slate-600 border-slate-300",
};

function EndorsementCluster({
  endorsements,
  sourceNum,
  t,
}: {
  endorsements: EndorsementEntry[];
  sourceNum?: number;
  t: (typeof translations)["en"]["research"];
}) {
  // Group by category to render visually together, preserving entry objects.
  const grouped = endorsements.reduce<Record<string, EndorsementEntry[]>>(
    (acc, e) => {
      const cat = e.category.toLowerCase();
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(e);
      return acc;
    },
    {},
  );

  function partisanLabel(lean: NonNullable<EndorsementEntry["partisanLean"]>) {
    if (lean === "partisan") return t.racePatternsEndorsementPartisan;
    if (lean === "nonpartisan") return t.racePatternsEndorsementNonpartisan;
    return t.racePatternsEndorsementMixed;
  }

  return (
    <div data-testid="endorsement-cluster" className="space-y-1.5">
      {Object.entries(grouped).map(([cat, entries]) => (
        <div key={cat} className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-muted w-14 shrink-0">
            {cat}
          </span>
          {entries.map((entry) => (
            <span
              key={entry.name}
              className={
                "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border " +
                categoryColor(cat)
              }
            >
              {entry.orgUrl ? (
                <a
                  href={entry.orgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-80"
                  data-testid={`endorsement-link-${entry.name}`}
                >
                  {entry.name}
                </a>
              ) : (
                entry.name
              )}
              {entry.partisanLean && (
                <span
                  data-testid={`endorsement-partisan-badge-${entry.name}`}
                  className={
                    "ml-0.5 px-1 py-px text-[8px] font-black uppercase tracking-wider border " +
                    PARTISAN_LEAN_STYLES[entry.partisanLean]
                  }
                >
                  {partisanLabel(entry.partisanLean)}
                </span>
              )}
            </span>
          ))}
        </div>
      ))}
      {sourceNum !== undefined && <FootnoteRef num={sourceNum} />}
    </div>
  );
}

/* ── RetrospectiveStrip ─────────────────────────────────────*/

function trendIcon(trend: string): { icon: string; cls: string } {
  const t = trend.toLowerCase();
  if (t === "improving") return { icon: "↑", cls: "text-emerald-600" };
  if (t === "declining") return { icon: "↓", cls: "text-rose-600" };
  return { icon: "→", cls: "text-on-surface-muted" };
}

function RetrospectiveStrip({
  entries,
  registry,
}: {
  entries: RetrospectiveEntry[];
  registry: SourceRegistry;
}) {
  return (
    <ul data-testid="retrospective-strip" className="space-y-2 list-none p-0">
      {entries.map((entry, idx) => {
        const { icon, cls } = trendIcon(entry.trend);
        const num = registry.add(entry.source);
        return (
          <li
            key={idx}
            className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-xs"
          >
            <span className="truncate text-on-surface-muted font-medium">
              {entry.metric}
            </span>
            <span className="font-bold text-on-surface">
              {entry.value}
              <span
                aria-label={entry.trend}
                className={"ml-1.5 font-black " + cls}
              >
                {icon}
              </span>
              <span className="ml-1 text-on-surface-muted font-normal">
                {entry.period}
              </span>
            </span>
            <FootnoteRef num={num} />
          </li>
        );
      })}
    </ul>
  );
}

/* ── Compact donor bar strip (for sticky comparison strip) ──*/

function CompactDonorStrip({
  label,
  slices,
  unavailableReason,
  t,
}: {
  label: string;
  slices: DonorBucketSlice[] | null;
  unavailableReason?: string;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <div className="min-w-[9rem] max-w-[14rem] shrink-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-muted mb-1 truncate">
        {label}
      </p>
      {slices && slices.length > 0 ? (
        <div
          className="flex h-3 overflow-hidden gap-px"
          aria-label={`Donor coalition for ${label}`}
        >
          {slices.map((s, i) => (
            <span
              key={i}
              title={`${s.label}: ${Math.round(s.percent)}%`}
              style={{ width: `${Math.max(0, Math.min(100, s.percent))}%` }}
              className={
                "block h-full " +
                (i % 4 === 0
                  ? "bg-primary"
                  : i % 4 === 1
                    ? "bg-primary/60"
                    : i % 4 === 2
                      ? "bg-primary/35"
                      : "bg-primary/15")
              }
            />
          ))}
        </div>
      ) : (
        <div className="h-3 flex items-center">
          <span className="text-[9px] italic text-on-surface-muted">
            {unavailableReason
              ? `${t.racePatternsCoalitionUnavailablePrefix} ${unavailableReason}`
              : "—"}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Individual candidate section ───────────────────────────*/

function CandidateSection({
  candidate,
  idx,
  isProposition,
  submitted,
  submitting,
  isStreaming,
  registry,
  onPick,
  onRevealCandidate,
  onSeeAllVotes,
  t,
  alignmentEntry,
  expandedDrilldownIssue,
  onDrillDown,
  onDrillDownClose,
  peerTotals,
  blindMode,
  revealedCandidates,
  onHideCandidate,
  locallyRevealed,
}: {
  candidate: RacePatternsCandidate;
  idx: number;
  isProposition: boolean;
  submitted: boolean;
  submitting: boolean;
  isStreaming: boolean;
  registry: SourceRegistry;
  onPick: () => void;
  onRevealCandidate?: (id: string) => void;
  onSeeAllVotes?: (payload: {
    candidate: RacePatternsCandidate;
    alignmentEntry: AlignmentScoresEntry | undefined;
    blindMode: boolean;
    alias: string;
  }) => void;
  t: (typeof translations)["en"]["research"];
  alignmentEntry?: AlignmentScoresEntry;
  expandedDrilldownIssue?: string | null;
  onDrillDown: (canonicalIssue: string) => void;
  onDrillDownClose: () => void;
  peerTotals?: import("../lib/peerComparison").PeerEntry[];
  blindMode?: boolean;
  revealedCandidates?: Set<string>;
  onHideCandidate?: (id: string) => void;
  /** In non-blindMode path: whether the user has tapped "Reveal candidates". */
  locallyRevealed?: boolean;
}) {
  const identity = getCandidateIdentity(candidate, {
    blindMode,
    revealed: revealedCandidates,
    index: idx,
  });
  /* Progressive disclosure: the Money-trail block (funding mix + named PACs +
     industry breakdown) is collapsed by default on mobile and expanded on
     desktop (>=901px). Keeps the decision UI tight on phones while leaving the
     funding evidence one tap away. Mirrors prototype CandidateCard. */
  const [moneyOpen, setMoneyOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 901px)").matches,
  );
  // In parent-controlled blindMode, use identity.isBlind.
  // In local-toggle mode (default, blindMode=false), use locallyRevealed.
  const showName =
    isProposition || (blindMode ? !identity.isBlind : !!locallyRevealed);
  const displayLabel = showName ? candidate.name : identity.aliasLabel;
  const pickDisabled = submitting || submitted || isStreaming;

  // Find the expanded score object (if any) for this candidate's drilldown
  const expandedScore =
    alignmentEntry?.scores && expandedDrilldownIssue
      ? (alignmentEntry.scores.find(
          (s) => s.canonicalIssue === expandedDrilldownIssue,
        ) ?? null)
      : null;

  // Total contributing votes across all of this candidate's alignment scores —
  // surfaced in the "See all N votes →" CTA. Mirrors prototype CandidateCard
  // (sum of contributingVotes.length over the alignment entry).
  const totalVotes =
    alignmentEntry?.scores?.reduce(
      (n, s) => n + (s.contributingVotes?.length ?? 0),
      0,
    ) ?? 0;

  // Header parity (prototype CandidateCardHeader): derive incumbency status
  // tag + tenure ("N yrs in office" / "No record yet") from priorRole + the
  // incumbent flag. ANON: identifying status/tenure is shown ONLY when not
  // blind (and never for propositions) so blind mode never leaks tenure/role.
  const yearsMatch = (candidate.priorRole ?? "").match(/since (\d{4})/i);
  const yearsInOffice = yearsMatch
    ? new Date().getFullYear() - parseInt(yearsMatch[1], 10)
    : 0;
  const isFirstTime =
    /first-time/i.test(candidate.priorRole ?? "") ||
    (!yearsMatch && !candidate.incumbent);
  const showHeaderDetails = !isProposition && !identity.isBlind;

  return (
    <section
      data-testid={`race-patterns-candidate-${candidate.id}`}
      className="bg-paper-2 border border-rule rounded-xl px-5 py-5 space-y-4"
      style={{
        boxShadow:
          "0 1px 0 var(--rule), 0 10px 30px -20px oklch(0.18 0.018 240 / 0.12)",
      }}
    >
      {/* Alignment score banner — above the four-pattern content */}
      {alignmentEntry && (
        <AlignmentScoreBanner
          entry={alignmentEntry}
          candidateLabel={displayLabel}
          onDrillDown={onDrillDown}
          expandedIssue={expandedDrilldownIssue}
        />
      )}

      {/* Inline drilldown — below the banner, above pattern sections.
          Pass the owning candidate so the "Issue PACs funding {name} on
          this" callout can resolve from candidate.donorCoalition. */}
      {expandedScore && (
        <AlignmentDrilldown
          score={expandedScore}
          onClose={onDrillDownClose}
          candidate={candidate}
        />
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {!isProposition && identity.isBlind && (
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-8 h-8 bg-paper border border-rule rounded-full font-serif text-base font-semibold text-civic"
              >
                {anonLabel(idx)}
              </span>
            )}
            <h4
              data-testid={`race-patterns-candidate-name-${candidate.id}`}
              className="font-serif text-lg md:text-[19px] font-semibold tracking-tight text-ink"
            >
              {displayLabel}
            </h4>
          </div>
          {/* Status tag (Incumbent / First-time / Challenger) — prototype
              CandidateCardHeader cv2-sub. Hidden in blind mode + propositions
              so the card never leaks an identifying status. */}
          {showHeaderDetails && (
            <div className="mt-1 flex items-center gap-2">
              <span
                data-testid={`race-patterns-status-tag-${candidate.id}`}
                className="inline-flex items-center px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] bg-paper border border-rule rounded-sm text-ink-2"
              >
                {candidate.incumbent ? (
                  /* NEEDS-KEY: research.candidateStatusIncumbent — EN "Incumbent" / ES "En ejercicio" */
                  <>Incumbent</>
                ) : isFirstTime ? (
                  /* NEEDS-KEY: research.candidateStatusFirstTime — EN "First-time" / ES "Primera vez" */
                  <>First-time</>
                ) : (
                  /* NEEDS-KEY: research.candidateStatusChallenger — EN "Challenger" / ES "Aspirante" */
                  <>Challenger</>
                )}
              </span>
            </div>
          )}
          {candidate.priorRole && (
            <p
              data-testid={`race-patterns-prior-role-${candidate.id}`}
              className="mt-1 text-sm text-ink-2"
            >
              {!isProposition && identity.isBlind
                ? anonymizeText(candidate.priorRole, {
                    blindMode: true,
                    realLastName: candidate.name.split(" ").pop(),
                    alias: identity.aliasLabel,
                  })
                : candidate.priorRole}
            </p>
          )}
          {/* Per-card reveal affordance (blind mode only, non-proposition) */}
          {!isProposition && identity.isBlind && onRevealCandidate && (
            <button
              type="button"
              data-testid={`race-patterns-reveal-candidate-${candidate.id}`}
              onClick={() => onRevealCandidate(candidate.id)}
              className="mt-1 inline-flex items-center gap-[5px] text-[12px] text-civic font-medium hover:text-civic-2 transition-colors"
            >
              {/* Eye icon — prototype WorkspaceView ~492 */}
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {/* NEEDS-KEY: research.revealCandidateButton — EN "Reveal" / ES "Revelar" */}
              <span>Reveal</span>
            </button>
          )}
          {/* Per-card hide affordance — re-anonymizes a revealed card while global blind mode is on */}
          {!isProposition &&
            blindMode &&
            !identity.isBlind &&
            onHideCandidate && (
              <button
                type="button"
                data-testid={`race-patterns-hide-candidate-${candidate.id}`}
                onClick={() => onHideCandidate(candidate.id)}
                className="mt-1 inline-flex items-center gap-[5px] text-[12px] text-ink-3 font-medium hover:text-ink-2 transition-colors"
              >
                {/* Eye-off icon */}
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                {/* NEEDS-KEY: research.hideCandidateButton — EN "Hide" */}
                <span>Hide</span>
              </button>
            )}
        </div>
        {/* Right rail: tenure block + values highlight. Tenure ("N yrs in
            office" / "No record yet") ports prototype CandidateCardHeader
            cv2-tenure. Hidden in blind mode + propositions (identifying). */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {showHeaderDetails &&
            (yearsInOffice > 0 ? (
              <div
                data-testid={`race-patterns-tenure-${candidate.id}`}
                className="text-right"
              >
                <div className="font-serif text-xl font-semibold leading-none text-ink">
                  {yearsInOffice}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3 mt-0.5">
                  {/* NEEDS-KEY: research.candidateTenureYrsInOffice — EN "yrs in office" / ES "años en el cargo" */}
                  yrs in office
                </div>
              </div>
            ) : isFirstTime ? (
              <div
                data-testid={`race-patterns-tenure-${candidate.id}`}
                className="text-right"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  {/* NEEDS-KEY: research.candidateTenureNoRecord — EN "No record yet" / ES "Sin historial aún" */}
                  No record yet
                </div>
              </div>
            ) : null)}
          {/* Values highlight callout */}
          {candidate.valuesHighlight && (
            <div
              data-testid={`race-patterns-values-highlight-${candidate.id}`}
              className="max-w-[11rem] bg-civic-soft border border-civic rounded-md px-2.5 py-1.5 text-[11px] leading-snug text-civic-2"
            >
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] block mb-0.5">
                {t.racePatternsValuesHighlightLabel}
              </span>
              <span className="font-serif italic">
                {candidate.valuesHighlight.element}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Donor coalition */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h5 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
              {t.racePatternsCoalitionHeading}
            </h5>
            <p
              data-testid={`race-patterns-donor-methodology-${candidate.id}`}
              className="text-[9px] text-on-surface-muted/70 mt-0.5"
            >
              {t.racePatternsDonorMethodologyNote}
            </p>
          </div>
          {candidate.donorCoalition && candidate.donorSource && (
            <>
              <FootnoteRef num={registry.add(candidate.donorSource)} />
              <a
                href={
                  candidate.donorSource.url ??
                  `https://www.google.com/search?q=${encodeURIComponent(
                    candidate.donorSource.name,
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary underline-offset-2 hover:underline"
              >
                {t.racePatternsSeeDonors}
              </a>
            </>
          )}
        </div>
        {candidate.donorCoalition ? (
          /* Progressive-disclosure: Money trail block (collapsible). Eyebrow
             + title + teaser summary (total raised · peer comparison ·
             funding-mix) with a Show details / Hide toggle that defaults open
             at >=901px. Ported from prototype CandidateCard funding section. */
          <div
            data-testid={`race-patterns-money-trail-${candidate.id}`}
            className="border border-rule rounded-xl overflow-hidden bg-paper"
          >
            <button
              type="button"
              data-testid={`race-patterns-money-trail-toggle-${candidate.id}`}
              aria-expanded={moneyOpen}
              aria-controls={`mt-${candidate.id}`}
              onClick={() => setMoneyOpen((v) => !v)}
              className="w-full flex items-start justify-between gap-3 text-left px-4 py-3 hover:bg-paper-2 transition-colors"
            >
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
                  {/* NEEDS-KEY: research.moneyTrailEyebrow — EN "Funding & influence" / ES "Financiamiento e influencia" */}
                  Funding &amp; influence
                </span>
                <span className="font-serif text-base font-semibold tracking-tight text-ink">
                  {/* NEEDS-KEY: research.moneyTrailTitle — EN "Money trail" / ES "Rastro del dinero" */}
                  Money trail
                </span>
                {/* Teaser: bottom-line (total + peer) then funding-mix breakdown */}
                <span className="text-[11.5px] text-ink-2 leading-snug mt-0.5">
                  {typeof candidate.totalRaised === "number" && (
                    <span className="block">
                      <b className="font-serif text-ink">
                        {formatCurrencyShort(candidate.totalRaised)}
                      </b>{" "}
                      {/* NEEDS-KEY: research.moneyTrailRaised — EN "raised" / ES "recaudado" */}
                      raised
                      {(() => {
                        const peer = computePeerLabel(
                          candidate.totalRaised as number,
                          peerTotals,
                        );
                        return peer ? (
                          <span className="text-ink-3"> · {peer}</span>
                        ) : null;
                      })()}
                    </span>
                  )}
                  {candidate.fundingMix &&
                    fundingMixSummary(candidate.fundingMix) && (
                      <span className="block text-ink-3">
                        {fundingMixSummary(candidate.fundingMix)}
                      </span>
                    )}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-civic whitespace-nowrap"
              >
                {moneyOpen ? (
                  <>
                    {/* NEEDS-KEY: research.moneyTrailHide — EN "Hide" / ES "Ocultar" */}
                    Hide <span aria-hidden="true">▴</span>
                  </>
                ) : (
                  <>
                    {/* NEEDS-KEY: research.moneyTrailShowDetails — EN "Show details" / ES "Ver detalles" */}
                    Show details <span aria-hidden="true">▾</span>
                  </>
                )}
              </span>
            </button>
            <div id={`mt-${candidate.id}`} hidden={!moneyOpen}>
              <FunderBars
                funders={candidate.donorCoalition}
                totalRaised={candidate.totalRaised}
                donorDataSource={candidate.donorDataSource}
                fundingMix={candidate.fundingMix}
                peerTotals={peerTotals}
              />
            </div>
          </div>
        ) : (
          <p
            data-testid={`race-patterns-coalition-unavailable-${candidate.id}`}
            className="text-xs italic text-on-surface-muted"
          >
            {t.racePatternsCoalitionUnavailablePrefix}{" "}
            {candidate.donorUnavailable?.reason ?? "data not available"}
          </p>
        )}
      </div>

      {/* Endorsements */}
      <div className="space-y-2">
        <h5 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          {t.racePatternsEndorsementsHeading}
        </h5>
        {candidate.endorsements ? (
          <EndorsementCluster
            endorsements={candidate.endorsements}
            sourceNum={
              candidate.endorsementSource
                ? registry.add(candidate.endorsementSource)
                : undefined
            }
            t={t}
          />
        ) : (
          <p
            data-testid={`race-patterns-endorsements-unavailable-${candidate.id}`}
            className="text-xs italic text-on-surface-muted"
          >
            {t.racePatternsEndorsementsUnavailablePrefix}{" "}
            {candidate.endorsementUnavailable?.reason ?? "data not available"}
          </p>
        )}
      </div>

      {/* Platform alignment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h5 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {t.racePatternsAlignmentHeading}
          </h5>
          {candidate.platformAlignment && candidate.alignmentSource && (
            <FootnoteRef num={registry.add(candidate.alignmentSource)} />
          )}
        </div>
        {candidate.platformAlignment === null ? (
          <p
            data-testid={`race-patterns-alignment-challenger-${candidate.id}`}
            className="text-xs italic text-on-surface-muted"
          >
            {t.racePatternsAlignmentChallenger}
          </p>
        ) : candidate.platformAlignment ? (
          <PlatformAlignmentRatio
            alignment={candidate.platformAlignment}
            unitLabel={t.racePatternsKeyVotesUnit}
          />
        ) : candidate.alignmentUnavailable ? (
          <p
            data-testid={`race-patterns-alignment-unavailable-${candidate.id}`}
            className="text-xs italic text-on-surface-muted"
          >
            {t.racePatternsAlignmentUnavailablePrefix}{" "}
            {candidate.alignmentUnavailable.reason}
          </p>
        ) : null}
      </div>

      {/* Retrospective */}
      <div className="space-y-2">
        <h5 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          {t.racePatternsRetrospectiveHeading}
        </h5>
        {candidate.retrospective ? (
          <RetrospectiveStrip
            entries={candidate.retrospective}
            registry={registry}
          />
        ) : (
          <p
            data-testid={`race-patterns-retrospective-unavailable-${candidate.id}`}
            className="text-xs italic text-on-surface-muted"
          >
            {t.racePatternsRetrospectiveUnavailablePrefix}{" "}
            {candidate.retrospectiveUnavailable?.reason ??
              "Challenger — no record in office yet"}
          </p>
        )}
      </div>

      {/* See all votes — prototype CandidateCard ~270-277. Shows the real
          count (sum of contributingVotes across this candidate's scores);
          falls back to "See all votes →" when the count is 0, matching the
          prototype's `{totalVotes || ''}` rendering. */}
      {alignmentEntry && onSeeAllVotes && (
        <div className="flex justify-end">
          <button
            type="button"
            data-testid={`race-patterns-see-all-votes-${candidate.id}`}
            onClick={() =>
              onSeeAllVotes({
                candidate,
                alignmentEntry,
                blindMode: !!identity.isBlind,
                alias: identity.aliasLabel,
              })
            }
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic hover:text-civic-2 underline-offset-4 hover:underline transition-colors"
          >
            {/* NEEDS-KEY: research.seeAllVotesCount — EN "See all {count} votes →" / ES "Ver los {count} votos →" */}
            See all {totalVotes > 0 ? `${totalVotes} ` : ""}votes →
          </button>
        </div>
      )}

      {/* Pick button (per candidate) */}
      {!submitted && (
        <button
          type="button"
          data-testid={`race-patterns-pick-${candidate.id}`}
          onClick={() => !pickDisabled && onPick()}
          disabled={pickDisabled}
          className="w-full bg-civic text-paper-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] rounded-lg hover:bg-civic-2 disabled:bg-rule disabled:text-ink-3 disabled:cursor-not-allowed active:scale-95 transition"
        >
          {submitting
            ? t.racePatternsSubmitting
            : `${t.racePatternsPickPrefix} ${displayLabel}`}
        </button>
      )}
    </section>
  );
}

/* ── Source footnote footer ─────────────────────────────────*/

function SourceFooter({
  entries,
  heading,
}: {
  entries: { num: number; source: SourceRef }[];
  heading: string;
}) {
  if (entries.length === 0) return null;
  return (
    <footer
      data-testid="race-patterns-sources-footer"
      className="border-t border-outline-variant/30 pt-3 space-y-1.5"
    >
      <h5 className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
        {heading}
      </h5>
      <ol className="list-none p-0 space-y-1">
        {entries.map(({ num, source }) => (
          <li key={num} className="flex items-start gap-2 text-[10px]">
            <span className="font-bold text-primary shrink-0">[{num}]</span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-muted underline underline-offset-2 hover:text-primary break-all"
              >
                {source.name}
              </a>
            ) : (
              <span className="text-on-surface-muted">{source.name}</span>
            )}
          </li>
        ))}
      </ol>
    </footer>
  );
}

/* ── Main component ─────────────────────────────────────────*/

export function RacePatterns({
  block,
  onPick,
  onSkip,
  isSubmitting = false,
  isSubmitted = false,
  pickedCandidateId,
  isStreaming = false,
  alignmentScoresByCandidate,
  blindMode = false,
  revealedCandidates = new Set<string>(),
  onRevealCandidate,
  onCompare,
  onSeeAllVotes,
  onHideCandidate,
}: RacePatternsProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  const isProp = isPropositionBlock(block);
  // The internal `revealed` toggle is kept for the "Reveal all / Hide names"
  // button (non-blind-mode path). In blind-mode, identity is controlled by
  // the parent via blindMode + revealedCandidates + onRevealCandidate.
  const [revealed, setRevealed] = useState(isProp);

  // Drilldown state: which (candidateId, canonicalIssue) is expanded
  const [expandedDrilldown, setExpandedDrilldown] = useState<{
    candidateId: string | null;
    canonicalIssue: string | null;
  }>({ candidateId: null, canonicalIssue: null });

  function handleDrillDown(candidateId: string, canonicalIssue: string) {
    setExpandedDrilldown((prev) => {
      // Tapping the same score collapses; tapping a different one swaps
      if (
        prev.candidateId === candidateId &&
        prev.canonicalIssue === canonicalIssue
      ) {
        return { candidateId: null, canonicalIssue: null };
      }
      return { candidateId, canonicalIssue };
    });
  }

  function handleDrillDownClose() {
    setExpandedDrilldown({ candidateId: null, canonicalIssue: null });
  }

  // Pre-build a source registry by walking all candidate data imperatively.
  // This must happen before the JSX return so the SourceFooter can receive
  // the fully-populated entries list (React renders child components lazily —
  // the CandidateSection render functions haven't run by the time we reach
  // the SourceFooter JSX element in the parent).
  // Reset and pre-populate on every render.
  const registry = makeSourceRegistry();
  for (const c of block.candidates) {
    if (c.donorCoalition && c.donorSource) registry.add(c.donorSource);
    if (c.endorsements && c.endorsementSource)
      registry.add(c.endorsementSource);
    if (c.platformAlignment && c.alignmentSource)
      registry.add(c.alignmentSource);
    if (c.retrospective) {
      for (const entry of c.retrospective) registry.add(entry.source);
    }
  }

  const disabled = isSubmitting || isSubmitted || isStreaming;
  const pickedCandidate =
    (pickedCandidateId &&
      block.candidates.find((c) => c.id === pickedCandidateId)) ||
    null;
  // ANON — the locked-in confirmation banner must use the alias while blind,
  // mirroring every other surface on the card. Resolve the picked candidate's
  // display name through getCandidateIdentity (respecting per-candidate
  // reveal); proposition mode always shows the real name.
  const pickedCandidateIndex = pickedCandidate
    ? block.candidates.findIndex((c) => c.id === pickedCandidate.id)
    : -1;
  const pickedDisplayName = pickedCandidate
    ? isProp
      ? pickedCandidate.name
      : getCandidateIdentity(pickedCandidate, {
          blindMode,
          revealed: revealedCandidates,
          index: pickedCandidateIndex < 0 ? 0 : pickedCandidateIndex,
        }).displayName
    : null;

  // Build peer-totals array for the money-map comparison rails.
  // aliasOrName respects anonymity: real names only when revealed or in
  // proposition mode (where names are always shown). In blindMode, also
  // respect per-candidate reveal state via getCandidateIdentity.
  const allPeerTotals = block.candidates
    .filter((c) => typeof c.totalRaised === "number" && c.totalRaised > 0)
    .map((c, idx) => {
      let aliasOrName: string;
      if (isProp) {
        aliasOrName = c.name;
      } else if (blindMode) {
        const id = getCandidateIdentity(c, {
          blindMode,
          revealed: revealedCandidates,
          index: idx,
        });
        aliasOrName = id.isBlind ? id.aliasLabel : c.name;
      } else {
        aliasOrName = revealed ? c.name : `Candidate ${anonLabel(idx)}`;
      }
      return { total: c.totalRaised as number, aliasOrName };
    });

  return (
    <section
      data-testid="race-patterns"
      className="bg-paper border border-rule rounded-xl p-4 md:p-5 space-y-4"
    >
      {/* Race header */}
      <header>
        <h3 className="font-serif text-lg md:text-xl font-semibold text-ink leading-tight tracking-tight">
          {block.race}
        </h3>
        <div className="mt-2 h-px bg-rule" aria-hidden="true" />
      </header>

      {/* Proposition impact columns — if-yes / if-no two-column layout.
       * Renders ONLY for proposition blocks; missing sides fall back
       * to "(impact not yet summarized)". */}
      {isProp && <PropositionImpactColumns block={block} />}

      {/* Disclaimer — shown when alignment scores are present */}
      {alignmentScoresByCandidate && alignmentScoresByCandidate.size > 0 && (
        <p
          data-testid="race-patterns-alignment-disclaimer"
          className="text-[10px] italic text-on-surface-muted"
        >
          {t.racePatternsDisclaimer}
        </p>
      )}

      {/* Sticky comparison strip — donor coalition side-by-side */}
      <div>
        <div
          data-testid="race-patterns-comparison-strip"
          className="flex gap-4 overflow-x-auto pb-2"
          aria-label="Donor coalition overview"
        >
          {block.candidates.map((c, idx) => {
            // When blindMode is active, use per-candidate identity for label
            let label: string;
            if (isProp) {
              label = c.name;
            } else if (blindMode) {
              const id = getCandidateIdentity(c, {
                blindMode,
                revealed: revealedCandidates,
                index: idx,
              });
              label = id.isBlind ? id.aliasLabel : c.name;
            } else {
              label = revealed ? c.name : `Candidate ${anonLabel(idx)}`;
            }
            return (
              <CompactDonorStrip
                key={c.id}
                label={label}
                slices={c.donorCoalition}
                unavailableReason={c.donorUnavailable?.reason}
                t={t}
              />
            );
          })}
        </div>
        <p
          data-testid="race-patterns-comparison-strip-methodology"
          className="text-[9px] text-on-surface-muted/70 mt-1"
        >
          {t.racePatternsDonorMethodologyNote}
        </p>
      </div>

      {/* Candidate sections */}
      <div className="space-y-4">
        {block.candidates.map((c, idx) => {
          const alignmentEntry = alignmentScoresByCandidate?.get(c.id);
          const isThisCandidateExpanded =
            expandedDrilldown.candidateId === c.id;
          return (
            <CandidateSection
              key={c.id}
              candidate={c}
              idx={idx}
              isProposition={isProp}
              submitted={isSubmitted}
              submitting={isSubmitting}
              isStreaming={isStreaming}
              registry={registry}
              onPick={() => onPick(c.id, c.name)}
              onRevealCandidate={onRevealCandidate}
              onSeeAllVotes={onSeeAllVotes}
              t={t}
              alignmentEntry={alignmentEntry}
              expandedDrilldownIssue={
                isThisCandidateExpanded
                  ? expandedDrilldown.canonicalIssue
                  : null
              }
              onDrillDown={(canonicalIssue) =>
                handleDrillDown(c.id, canonicalIssue)
              }
              onDrillDownClose={handleDrillDownClose}
              peerTotals={allPeerTotals}
              blindMode={blindMode}
              revealedCandidates={revealedCandidates}
              onHideCandidate={onHideCandidate}
              locallyRevealed={revealed}
            />
          );
        })}
      </div>

      {/* Compare button — candidate races only, per prototype WorkspaceView ~514 */}
      {!isProp && onCompare && (
        <button
          type="button"
          data-testid="race-patterns-compare"
          onClick={onCompare}
          disabled={isStreaming}
          className="w-full border border-rule text-ink-2 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] rounded-lg hover:bg-paper-2 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {/* NEEDS-KEY: research.compareCandidates — EN "Compare candidates" / ES "Comparar candidatos" */}
          Compare candidates
        </button>
      )}

      {/* Reveal/Hide toggle — candidate variant only, until submitted.
          Only rendered when NOT in parent-controlled blindMode (in that mode
          the per-card reveal affordances are used instead). */}
      {!isProp && !isSubmitted && !blindMode && (
        <button
          type="button"
          data-testid="race-patterns-reveal"
          onClick={() => !isStreaming && setRevealed((prev) => !prev)}
          disabled={isStreaming}
          className="w-full border border-civic text-civic px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] rounded-lg hover:bg-civic-soft active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {revealed ? t.racePatternsHideButton : t.racePatternsRevealButton}
        </button>
      )}

      {/* Skip button */}
      {!isSubmitted && (
        <div className="flex justify-end">
          <button
            type="button"
            data-testid="race-patterns-skip"
            onClick={() => !disabled && onSkip()}
            disabled={disabled}
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 hover:text-civic disabled:opacity-50 disabled:cursor-not-allowed underline-offset-4 hover:underline"
          >
            {t.racePatternsSkip}
          </button>
        </div>
      )}

      {/* Locked / skipped banner */}
      {isSubmitted && (
        <div
          data-testid="race-patterns-locked-banner"
          className="bg-civic-soft border border-civic rounded-lg px-4 py-3"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-civic-2">
            {pickedDisplayName
              ? `${t.racePatternsLockedIn} ${pickedDisplayName}`
              : t.racePatternsSkipped}
          </p>
        </div>
      )}

      {/* Source footnote footer — rendered after all candidate sections
          so the registry has accumulated all sources. */}
      <SourceFooter
        entries={registry.entries()}
        heading={t.racePatternsSourcesHeading}
      />
    </section>
  );
}
