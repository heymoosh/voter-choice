"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type {
  AlignmentScoresEntry,
  AlignmentScore,
} from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * AlignmentScoreBanner — per-candidate alignment score cards
 *
 * Renders one compact card per issue in entry.scores, showing:
 *   - Issue label
 *   - Resolved stance ("Your side: expand healthcare access")
 *   - Vote ratio ("N of M votes")
 *   - Thin-record caption when total < 5
 *   - Tappable → calls onDrillDown(canonicalIssue)
 *   - Expanded state visually highlighted when expandedIssue matches
 *
 * Unavailable state: renders a single "Voting record not available —
 * [reason]" card when scores === null + unavailable is set.
 *
 * Phase 2 wires this into RacePatterns.tsx above the four-pattern
 * sections. Do not import from RacePatterns here.
 * ────────────────────────────────────────────────────────────── */

const THIN_RECORD_THRESHOLD = 5;

export interface AlignmentScoreBannerProps {
  entry: AlignmentScoresEntry;
  candidateLabel: string; // "Candidate A" / "Candidate B" pre-reveal; real name post-reveal
  onDrillDown: (canonicalIssue: string) => void;
  expandedIssue?: string | null; // which score's drill-down is currently open
}

/* ── Single score card ──────────────────────────────────────── */

function ScoreCard({
  score,
  isExpanded,
  onDrillDown,
  t,
}: {
  score: AlignmentScore;
  isExpanded: boolean;
  onDrillDown: () => void;
  t: (typeof translations)["en"]["research"];
}) {
  const isThin = score.total < THIN_RECORD_THRESHOLD;

  return (
    <button
      type="button"
      data-testid={`alignment-score-card-${score.canonicalIssue}`}
      onClick={onDrillDown}
      aria-pressed={isExpanded}
      aria-expanded={isExpanded}
      className={
        "w-full text-left px-3 py-2.5 border transition " +
        (isExpanded
          ? "bg-primary/10 border-primary/50 outline-none ring-1 ring-primary/30"
          : "bg-surface-lowest border-outline-variant/40 hover:bg-primary/5 hover:border-primary/30")
      }
    >
      {/* Issue label */}
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-muted mb-0.5">
        {score.issueLabel}
      </p>

      {/* Resolved stance */}
      <p className="text-[11px] text-on-surface mb-1.5 leading-snug">
        <span className="font-bold text-on-surface-muted">
          {t.alignmentScoreYourSide}{" "}
        </span>
        {score.resolvedStance}
      </p>

      {/* Ratio row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Mini dot bar: filled = voted with, unfilled = voted against */}
          <VoteDots kept={score.kept} total={score.total} />
          <span
            data-testid={`alignment-score-ratio-${score.canonicalIssue}`}
            className="text-xs font-bold text-on-surface tabular-nums"
          >
            {t.alignmentScoreOfVotes(score.kept, score.total)}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
          {t.alignmentScoreDrillDownLabel}
        </span>
      </div>

      {/* Thin-record indicator */}
      {isThin && (
        <p
          data-testid={`alignment-score-thin-record-${score.canonicalIssue}`}
          className="mt-1 text-[9px] italic text-on-surface-muted"
        >
          {t.alignmentScoreThinRecord(score.total)}
        </p>
      )}
    </button>
  );
}

/* ── Mini dot bar (distinct from PlatformAlignmentRatio) ─────
 * Dots are square, color indicates vote-with vs vote-against.
 * Capped at 10 dots so it stays compact in a card.
 */

const DOT_CAP = 10;

function VoteDots({ kept, total }: { kept: number; total: number }) {
  const visualTotal = Math.min(total, DOT_CAP);
  const visualKept =
    total <= DOT_CAP ? kept : Math.round((kept / total) * DOT_CAP);

  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5">
      {Array.from({ length: visualTotal }).map((_, i) => (
        <span
          key={i}
          className={
            "inline-block w-1.5 h-1.5 " +
            (i < visualKept ? "bg-emerald-500" : "bg-rose-400/60")
          }
        />
      ))}
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function AlignmentScoreBanner({
  entry,
  onDrillDown,
  expandedIssue,
}: AlignmentScoreBannerProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  // Defensive: null scores, no unavailable → render nothing
  if (entry.scores === null && !entry.unavailable) {
    return null;
  }

  // Unavailable state
  if (entry.scores === null && entry.unavailable) {
    return (
      <div
        data-testid={`alignment-score-unavailable-${entry.candidateId}`}
        className="px-3 py-2.5 border border-outline-variant/40 bg-surface-lowest"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-muted mb-0.5">
          {t.alignmentScoreBannerHeading}
        </p>
        <p className="text-xs italic text-on-surface-muted">
          {t.alignmentScoreUnavailablePrefix} {entry.unavailable.reason}
        </p>
      </div>
    );
  }

  const scores = entry.scores!;

  return (
    <div
      data-testid={`alignment-score-banner-${entry.candidateId}`}
      className="space-y-1"
    >
      {/* Section heading */}
      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-muted">
        {t.alignmentScoreBannerHeading}
      </h5>

      {/* Score cards — stack on mobile, 2-col grid when ≥2 scores on wider screens */}
      <div
        className={
          scores.length >= 2
            ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5"
            : "space-y-1.5"
        }
      >
        {scores.map((score) => (
          <ScoreCard
            key={score.canonicalIssue}
            score={score}
            isExpanded={expandedIssue === score.canonicalIssue}
            onDrillDown={() => onDrillDown(score.canonicalIssue)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
