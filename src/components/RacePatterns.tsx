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

/* ──────────────────────────────────────────────────────────────
 * RacePatterns — four-pattern candidate/proposition dashboard.
 *
 * Candidate variant:
 *   - Anonymized (Candidate A / B / C) by default.
 *   - Single "Reveal candidates" tap → names visible + Pick enabled.
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
}

/* ── Anonymous label helpers ──────────────────────────────── */

const ANON_LABELS = ["A", "B", "C", "D", "E", "F"];

function anonLabel(idx: number): string {
  return ANON_LABELS[idx] ?? String(idx + 1);
}

/* ── Proposition detection ────────────────────────────────── */

function isPropositionBlock(block: RacePatternsBlock): boolean {
  if (block.candidates.length === 0) return false;
  return block.candidates.every(
    (c) => c.incumbent === false && /^(yes|no) on /i.test(c.name.trim()),
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
  revealed,
  submitted,
  submitting,
  isStreaming,
  registry,
  onPick,
  t,
  alignmentEntry,
  expandedDrilldownIssue,
  onDrillDown,
  onDrillDownClose,
}: {
  candidate: RacePatternsCandidate;
  idx: number;
  isProposition: boolean;
  revealed: boolean;
  submitted: boolean;
  submitting: boolean;
  isStreaming: boolean;
  registry: SourceRegistry;
  onPick: () => void;
  t: (typeof translations)["en"]["research"];
  alignmentEntry?: AlignmentScoresEntry;
  expandedDrilldownIssue?: string | null;
  onDrillDown: (canonicalIssue: string) => void;
  onDrillDownClose: () => void;
}) {
  const showName = isProposition || revealed;
  const displayLabel = showName
    ? candidate.name
    : `Candidate ${anonLabel(idx)}`;
  const pickDisabled =
    submitting || submitted || (!isProposition && !revealed) || isStreaming;

  // Find the expanded score object (if any) for this candidate's drilldown
  const expandedScore =
    alignmentEntry?.scores && expandedDrilldownIssue
      ? (alignmentEntry.scores.find(
          (s) => s.canonicalIssue === expandedDrilldownIssue,
        ) ?? null)
      : null;

  return (
    <section
      data-testid={`race-patterns-candidate-${candidate.id}`}
      className="bg-surface-lowest border-l-4 border-primary border border-outline-variant/40 px-4 py-4 space-y-4"
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

      {/* Inline drilldown — below the banner, above pattern sections */}
      {expandedScore && (
        <AlignmentDrilldown score={expandedScore} onClose={onDrillDownClose} />
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {!isProposition && !revealed && (
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-7 h-7 bg-primary/10 text-primary text-sm font-black"
              >
                {anonLabel(idx)}
              </span>
            )}
            <h4
              data-testid={`race-patterns-candidate-name-${candidate.id}`}
              className="text-sm md:text-base font-black uppercase tracking-wide text-on-surface"
            >
              {displayLabel}
            </h4>
          </div>
          {candidate.priorRole && (
            <p
              data-testid={`race-patterns-prior-role-${candidate.id}`}
              className="mt-0.5 text-xs font-medium text-on-surface-muted"
            >
              {candidate.priorRole}
            </p>
          )}
        </div>
        {/* Values highlight callout */}
        {candidate.valuesHighlight && (
          <div
            data-testid={`race-patterns-values-highlight-${candidate.id}`}
            className="shrink-0 max-w-[11rem] bg-primary/8 border border-primary/30 px-2 py-1.5 text-[10px] leading-snug text-primary"
          >
            <span className="font-black block">
              {t.racePatternsValuesHighlightLabel}
            </span>
            <span>{candidate.valuesHighlight.element}</span>
          </div>
        )}
      </header>

      {/* Donor coalition */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
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
          <FunderBars funders={candidate.donorCoalition} />
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
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
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
          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
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
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
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

      {/* Pick button (per candidate) */}
      {!submitted && (
        <button
          type="button"
          data-testid={`race-patterns-pick-${candidate.id}`}
          onClick={() => !pickDisabled && onPick()}
          disabled={pickDisabled}
          className="w-full bg-primary text-on-primary px-4 py-3 text-xs md:text-sm font-black uppercase tracking-wide hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
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
      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
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
}: RacePatternsProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  const isProp = isPropositionBlock(block);
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

  return (
    <section
      data-testid="race-patterns"
      className="bg-surface-low border-l-4 border-primary p-4 md:p-5 space-y-4"
    >
      {/* Race header */}
      <header>
        <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-on-surface leading-tight">
          {block.race}
        </h3>
        <div className="mt-2 h-px bg-on-surface/15" aria-hidden="true" />
      </header>

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
            const label =
              isProp || revealed ? c.name : `Candidate ${anonLabel(idx)}`;
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
              revealed={revealed}
              submitted={isSubmitted}
              submitting={isSubmitting}
              isStreaming={isStreaming}
              registry={registry}
              onPick={() => onPick(c.id, c.name)}
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
            />
          );
        })}
      </div>

      {/* Reveal button — candidate variant only, before reveal */}
      {!isProp && !revealed && !isSubmitted && (
        <button
          type="button"
          data-testid="race-patterns-reveal"
          onClick={() => !isStreaming && setRevealed(true)}
          disabled={isStreaming}
          className="w-full border-2 border-primary text-primary px-4 py-3 text-sm font-black uppercase tracking-wide hover:bg-primary/10 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.racePatternsRevealButton}
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
            className="text-xs font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed underline-offset-4 hover:underline"
          >
            {t.racePatternsSkip}
          </button>
        </div>
      )}

      {/* Locked / skipped banner */}
      {isSubmitted && (
        <div
          data-testid="race-patterns-locked-banner"
          className="bg-primary/10 border-l-4 border-primary px-4 py-3"
        >
          <p className="text-xs font-black uppercase tracking-widest text-primary">
            {pickedCandidate
              ? `${t.racePatternsLockedIn} ${pickedCandidate.name}`
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
