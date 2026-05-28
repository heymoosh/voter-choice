"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { CardErrorBoundary } from "./cards/CardErrorBoundary";
import type {
  AlignmentScoresEntry,
  AlignmentScore,
} from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * AlignmentScoreBanner — per-candidate alignment score cards
 *
 * Renders one row per issue in entry.scores, showing:
 *   - Issue label (truncated with title= when long) — load-bearing,
 *     always inside the card button for test queryability
 *   - Resolved stance below the label
 *   - Horizontal bar (8px, civic/gold/vote-red fill by threshold)
 *   - Big serif % on the right (30px, colored by threshold)
 *   - Chevron ▾/▴ when hasVotes (has contributingVotes)
 *   - Sample-size caption ("Aligned on N of M votes")
 *   - Thin-record caption when total < 5
 *   - Em-dash for rows missing kept/total — never a fake 0%
 *   - Overall avg % in block header when any scored issues exist
 *   - Web-search path: source label + confidence + evidence (unchanged)
 *
 * Unavailable state: renders a "Voting record not available —
 * [reason]" notice when scores === null + unavailable is set.
 * No empty chart frame, no fake zero.
 *
 * Phase 2 wires this into RacePatterns.tsx above the four-pattern
 * sections. Do not import from RacePatterns here.
 * ────────────────────────────────────────────────────────────── */

const THIN_RECORD_THRESHOLD = 5;

/** Visible-label truncation budget for theme/issue names. */
const LABEL_TRUNCATE_AT = 18;
/** Number of chars retained before the ellipsis (matches prototype). */
const LABEL_TRUNCATE_KEEP = 16;

const CONFIDENCE_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-on-surface-muted",
};

/** Truncate a long label and surface the full string via title=. */
function truncateLabel(label: string): {
  visible: string;
  truncated: boolean;
} {
  if (label.length <= LABEL_TRUNCATE_AT) {
    return { visible: label, truncated: false };
  }
  return {
    visible: `${label.slice(0, LABEL_TRUNCATE_KEEP)}…`,
    truncated: true,
  };
}

/**
 * Compute the integer percentage for a voting_record score. Returns
 * `null` when the score is partial (kept or total missing) so callers
 * can render an em-dash rather than a misleading "0%".
 */
function scorePercentage(score: AlignmentScore): number | null {
  if (
    typeof score.kept !== "number" ||
    typeof score.total !== "number" ||
    !Number.isFinite(score.kept) ||
    !Number.isFinite(score.total) ||
    score.total <= 0
  ) {
    return null;
  }
  return Math.round((score.kept / score.total) * 100);
}

/** Bar fill color class based on percentage threshold */
function barFillClass(pct: number | null): string {
  if (pct === null) return "bg-civic"; // won't be rendered when pct is null
  if (pct >= 65) return "bg-civic";
  if (pct >= 50) return "bg-gold";
  return "bg-vote-red";
}

/** Percentage text color class */
function pctTextClass(pct: number | null): string {
  if (pct === null) return "text-ink";
  if (pct >= 65) return "text-ink";
  if (pct >= 50) return "text-ink-2";
  return "text-vote-red";
}

function formatDelta(delta: number): string {
  if (delta === 0) return "±0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

export interface AlignmentScoreBannerProps {
  entry: AlignmentScoresEntry;
  candidateLabel: string; // "Candidate A" / "Candidate B" pre-reveal; real name post-reveal
  onDrillDown: (canonicalIssue: string) => void;
  expandedIssue?: string | null; // which score's drill-down is currently open
  /**
   * Per-canonicalIssue percentage delta to display next to each
   * score. Phase 6 (theme amendment) uses this to surface re-score
   * changes — e.g. `{ healthcare: 12 }` renders "+12%" next to the
   * healthcare percentage. Omit (or omit individual keys) to render
   * the card without delta annotations.
   */
  scoreDeltas?: Record<string, number>;
}

/* ── Label with truncation + title fallback ────────────────── */

function ScoreLabel({ score }: { score: AlignmentScore }) {
  const { visible, truncated } = truncateLabel(score.issueLabel);
  return (
    <p
      data-testid={`alignment-score-label-${score.canonicalIssue}`}
      title={score.issueLabel}
      className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 mb-0.5"
    >
      {truncated ? visible : score.issueLabel}
    </p>
  );
}

/* ── Horizontal bar (8px tall, rounded 4px) ────────────────── */

function AlignmentBar({
  pct,
}: {
  pct: number | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="h-2 rounded bg-[oklch(0.90_0.012_85)] overflow-hidden"
    >
      <div
        className={
          "h-full rounded transition-[width] duration-300 ease-in-out " +
          barFillClass(pct)
        }
        style={{ width: `${pct ?? 0}%` }}
      />
    </div>
  );
}

/* ── Exported ScoreCard (Phase 6 / scoreDeltas consumers) ───
 * Thin wrapper around IssueRow so existing named-export consumers
 * continue to compile. Always allows click (no hasVotes gate here —
 * callers decide whether to render based on their own state).
 */

export function ScoreCard({
  score,
  isExpanded,
  onDrillDown,
  scoreDelta,
  t,
}: {
  score: AlignmentScore;
  isExpanded: boolean;
  onDrillDown: () => void;
  /** Phase 6 hook — when set, renders "+N%" / "-N%" next to the percentage. */
  scoreDelta?: number;
  t: (typeof translations)["en"]["research"];
}) {
  return (
    <IssueRow
      score={score}
      isOpen={isExpanded}
      onDrillDown={onDrillDown}
      scoreDelta={scoreDelta}
      t={t}
    />
  );
}

/* ── Single issue row ──────────────────────────────────────── */

function IssueRow({
  score,
  isOpen,
  onDrillDown,
  scoreDelta,
  t,
}: {
  score: AlignmentScore;
  isOpen: boolean;
  onDrillDown: () => void;
  scoreDelta?: number;
  t: (typeof translations)["en"]["research"];
}) {
  const isWebSearch = score.sourceType === "web_search";
  const isThin =
    !isWebSearch &&
    typeof score.total === "number" &&
    score.total < THIN_RECORD_THRESHOLD;

  const pct = isWebSearch ? null : scorePercentage(score);
  const hasNumericRecord = pct !== null;
  const hasVotes = !!(score.contributingVotes?.length);

  // Open row: bg-paper, left civic inset shadow
  const openClass = isOpen
    ? " bg-paper -mx-5 px-5 border-t border-rule shadow-[inset_4px_0_0_theme(colors.civic)]"
    : "";

  return (
    <div
      data-testid={`alignment-issue-row-${score.canonicalIssue}`}
      className={"border-t border-rule-2 first:border-t-0" + openClass}
    >
      <button
        type="button"
        data-testid={`alignment-score-card-${score.canonicalIssue}`}
        onClick={onDrillDown}
        aria-expanded={isOpen}
        aria-pressed={isOpen}
        className={
          "grid w-full text-left bg-transparent py-[14px] items-center " +
          "grid-cols-[1fr_auto] gap-4 " +
          (hasVotes ? "cursor-pointer group" : "cursor-pointer")
        }
        style={{ border: "none" }}
      >
        {/* Left: issue label, resolved stance, bar, meta */}
        <div className="min-w-0">
          {/* Always-present label (truncated with title= fallback) */}
          <ScoreLabel score={score} />

          {/* Resolved stance */}
          <p className="text-[13px] text-ink mb-1.5 leading-snug">
            <span className="font-semibold text-ink-3">
              {t.alignmentScoreYourSide}{" "}
            </span>
            {score.resolvedStance}
          </p>

          {/* Voting record: bar + meta */}
          {!isWebSearch && (
            <>
              {hasNumericRecord && (
                <CardErrorBoundary>
                  <AlignmentBar pct={pct} />
                </CardErrorBoundary>
              )}
              <div className="font-mono text-[11.5px] text-ink-3 mt-1.5 tracking-[0.02em]">
                {hasNumericRecord ? (
                  <span
                    data-testid={`alignment-score-ratio-${score.canonicalIssue}`}
                  >
                    {/*
                      NEEDS-KEY: research.alignmentScoreAlignedOnRatio — EN "Aligned on {kept} of {total} {vote|votes}" / ES "Alineado en {kept} de {total} {voto|votos}"
                      Note: alignmentScoreOfVotes(kept, total) exists but returns a flat string without the <b> inline markup — cannot be reused here.
                    */}
                    Aligned on{" "}
                    <b className="text-ink-2 font-semibold">{score.kept}</b> of{" "}
                    <b className="text-ink-2 font-semibold">{score.total}</b>{" "}
                    {score.total === 1 ? "vote" : "votes"}
                    {!hasVotes && (
                      <span className="text-ink-3">
                        {/* NEEDS-KEY: research.alignmentScoreDetailNotCurated — EN "· detail not yet curated" / ES "· detalle pendiente de edición" */}
                        {" "}
                        · detail not yet curated
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="italic text-ink-3">
                    {t.alignmentScoreThinRecord(score.total ?? 0)}
                  </span>
                )}
              </div>
              {isThin && hasNumericRecord && (
                <p
                  data-testid={`alignment-score-thin-record-${score.canonicalIssue}`}
                  className="mt-1 text-[9px] italic text-ink-3"
                >
                  {t.alignmentScoreThinRecord(score.total ?? 0)}
                </p>
              )}
            </>
          )}

          {/* Web-search path: source + confidence + evidence */}
          {isWebSearch && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] italic text-ink-3">
                  {t.alignmentScoreWebSearchSource}
                </span>
                {score.confidence && (
                  <span
                    className={
                      "text-[10px] font-semibold " +
                      CONFIDENCE_COLOR[score.confidence]
                    }
                  >
                    {t.alignmentScoreConfidence(score.confidence)}
                  </span>
                )}
              </div>
              {score.evidence && score.evidence.length > 0 && (
                <ul className="space-y-0.5">
                  {score.evidence.slice(0, 3).map((ev, i) => (
                    <li key={i} className="text-[10px] text-ink-3 leading-snug">
                      <span className="mr-1">•</span>
                      {ev.summary}
                    </li>
                  ))}
                </ul>
              )}
              <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic shrink-0 mt-1 block">
                {t.alignmentScoreDrillDownLabel}
              </span>
            </div>
          )}
        </div>

        {/* Right: big serif % + chevron (voting_record) or drilldown label (web_search) */}
        {!isWebSearch ? (
          <div
            className={
              "font-serif text-[30px] font-semibold leading-none tracking-[-0.02em] flex items-baseline gap-1.5 " +
              pctTextClass(pct)
            }
          >
            {hasNumericRecord ? (
              <>
                <span
                  data-testid={`alignment-score-percentage-${score.canonicalIssue}`}
                >
                  {pct}%
                </span>
                {scoreDelta !== undefined && (
                  <span
                    data-testid={`alignment-score-delta-${score.canonicalIssue}`}
                    className={
                      "font-mono text-[10px] font-semibold tabular-nums " +
                      (scoreDelta > 0
                        ? "text-civic"
                        : scoreDelta < 0
                          ? "text-vote-red"
                          : "text-ink-3")
                    }
                  >
                    {formatDelta(scoreDelta)}
                  </span>
                )}
                {hasVotes && (
                  <span className="text-[14px] text-ink-3 font-sans ml-0.5">
                    {isOpen ? "▴" : "▾"}
                  </span>
                )}
              </>
            ) : (
              <span
                data-testid={`alignment-score-no-data-${score.canonicalIssue}`}
                className="font-mono text-xs font-semibold text-ink-3 tabular-nums"
                aria-label={/* NEEDS-KEY: research.alignmentScoreNoDataAriaLabel — EN "No data for this issue" / ES "Sin datos para este tema" */ "No data for this issue"}
              >
                —
              </span>
            )}
          </div>
        ) : (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-civic shrink-0">
            {t.alignmentScoreDrillDownLabel}
          </span>
        )}
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function AlignmentScoreBanner({
  entry,
  candidateLabel,
  onDrillDown,
  expandedIssue,
  scoreDeltas,
}: AlignmentScoreBannerProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  // Defensive: null scores, no unavailable → render nothing
  if (entry.scores === null && !entry.unavailable) {
    return null;
  }

  // Unavailable state — no-record / first-time-candidate notice.
  if (entry.scores === null && entry.unavailable) {
    return (
      <div
        data-testid={`alignment-score-unavailable-${entry.candidateId}`}
        aria-label={`Alignment scores for ${candidateLabel}`}
        className="px-5 py-[18px] pb-5 bg-paper-2 border-b border-rule-2"
      >
        <div className="flex items-baseline justify-between gap-3 mb-3.5 flex-wrap gap-y-1">
          <p className="font-mono text-[13px] uppercase tracking-[0.10em] text-ink font-bold whitespace-nowrap">
            {t.alignmentScoreBannerHeading}
          </p>
        </div>
        <p className="text-xs italic text-ink-3 mb-1">
          {t.alignmentScoreUnavailablePrefix} {entry.unavailable.reason}
        </p>
        <p
          data-testid={`alignment-score-no-record-hint-${entry.candidateId}`}
          className="text-[14px] text-ink-2 leading-[1.55]"
        >
          {t.alignmentScoreNoRecordHint}
        </p>
      </div>
    );
  }

  const scores = entry.scores!;

  // Compute overall avg % across scoring issues (voting_record only)
  const scored = scores.filter(
    (s) => s.sourceType !== "web_search" && scorePercentage(s) !== null,
  );
  const overallPct =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, s) => sum + (scorePercentage(s) as number), 0) /
            scored.length,
        )
      : null;

  return (
    <div
      data-testid={`alignment-score-banner-${entry.candidateId}`}
      aria-label={`Alignment scores for ${candidateLabel}`}
      className="px-5 py-[18px] pb-5 bg-paper-2 border-b border-rule-2"
    >
      {/* Block header: label left, overall avg right */}
      <div className="flex items-baseline justify-between gap-3 mb-3.5 flex-wrap gap-y-1">
        <span className="font-mono text-[13px] uppercase tracking-[0.10em] text-ink font-bold whitespace-nowrap">
          {t.alignmentScoreBannerHeading}
        </span>
        {overallPct !== null && (
          <span className="font-serif text-[14px] text-ink-2">
            <b className="text-ink text-[18px] font-semibold">{overallPct}%</b>{" "}
            {/* NEEDS-KEY: research.alignmentScoreOverallAvgSuffix — EN "avg" / ES "prom" */}
            avg
          </span>
        )}
      </div>

      {/* Issue rows */}
      <div>
        {scores.map((score) => (
          <IssueRow
            key={score.canonicalIssue}
            score={score}
            isOpen={expandedIssue === score.canonicalIssue}
            onDrillDown={() => onDrillDown(score.canonicalIssue)}
            scoreDelta={scoreDeltas?.[score.canonicalIssue]}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
