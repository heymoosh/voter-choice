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
 * Renders one compact card per issue in entry.scores, showing:
 *   - Issue label (truncated with title= when long)
 *   - Resolved stance ("Your side: expand healthcare access")
 *   - Vote ratio ("N of M votes")
 *   - Percentage (kept/total → "70%"), load-bearing alongside the
 *     decorative dot bar
 *   - Optional scoreDelta (Phase 6 theme amendment) showing
 *     "+X%" / "-X%" next to the percentage
 *   - Thin-record caption when total < 5
 *   - Em-dash (—) for rows missing kept/total (partial data —
 *     never a fake 0%)
 *   - Tappable → calls onDrillDown(canonicalIssue)
 *   - Expanded state visually highlighted when expandedIssue matches
 *
 * Unavailable state: renders a "Voting record not available —
 * [reason]" notice when scores === null + unavailable is set,
 * followed by an explicit "first-time candidate" hint so voters
 * know to judge on policy statements + donor base instead. No
 * empty chart frame, no fake zero.
 *
 * Chart-rendering subtree (the dot bar) is wrapped in a
 * CardErrorBoundary so a decoration throw does not blank the
 * card's load-bearing text.
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

/* ── Single score card ──────────────────────────────────────── */

function formatDelta(delta: number): string {
  if (delta === 0) return "±0%";
  return `${delta > 0 ? "+" : ""}${delta}%`;
}

/* ── Label with truncation + title fallback ────────────────── */

function ScoreLabel({ score }: { score: AlignmentScore }) {
  const { visible, truncated } = truncateLabel(score.issueLabel);
  return (
    <p
      data-testid={`alignment-score-label-${score.canonicalIssue}`}
      title={score.issueLabel}
      className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-muted mb-0.5"
    >
      {truncated ? visible : score.issueLabel}
    </p>
  );
}

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
  const isWebSearch = score.sourceType === "web_search";
  const isThin =
    !isWebSearch &&
    typeof score.total === "number" &&
    score.total < THIN_RECORD_THRESHOLD;
  const percentage = isWebSearch ? null : scorePercentage(score);
  const hasNumericRecord = percentage !== null;

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
      {/* Issue label — truncated visible text, full label via title= */}
      <ScoreLabel score={score} />

      {/* Resolved stance */}
      <p className="text-[11px] text-on-surface mb-1.5 leading-snug">
        <span className="font-bold text-on-surface-muted">
          {t.alignmentScoreYourSide}{" "}
        </span>
        {score.resolvedStance}
      </p>

      {isWebSearch ? (
        /* Web-search path: source label + confidence + evidence snippets */
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] italic text-on-surface-muted">
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
                <li
                  key={i}
                  className="text-[10px] text-on-surface-muted leading-snug"
                >
                  <span className="mr-1">•</span>
                  {ev.summary}
                </li>
              ))}
            </ul>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0 mt-1 block">
            {t.alignmentScoreDrillDownLabel}
          </span>
        </div>
      ) : (
        /* Voting-record path: ratio + percentage + (optional) dot bar.
         * Text labels are load-bearing; dot bar is decoration wrapped
         * in CardErrorBoundary so a chart-render error never blanks
         * the row. Partial rows (no numeric record) show em-dash
         * and skip the bar entirely — no fake 0%. */
        <>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              {hasNumericRecord ? (
                <>
                  <CardErrorBoundary>
                    <VoteDots kept={score.kept ?? 0} total={score.total ?? 0} />
                  </CardErrorBoundary>
                  <span
                    data-testid={`alignment-score-ratio-${score.canonicalIssue}`}
                    className="text-xs font-bold text-on-surface tabular-nums"
                  >
                    {t.alignmentScoreOfVotes(score.kept ?? 0, score.total ?? 0)}
                  </span>
                  <span
                    data-testid={`alignment-score-percentage-${score.canonicalIssue}`}
                    className="text-xs font-bold text-primary tabular-nums"
                  >
                    {percentage}%
                  </span>
                  {scoreDelta !== undefined && (
                    <span
                      data-testid={`alignment-score-delta-${score.canonicalIssue}`}
                      className={
                        "text-[10px] font-bold tabular-nums " +
                        (scoreDelta > 0
                          ? "text-emerald-700"
                          : scoreDelta < 0
                            ? "text-rose-700"
                            : "text-on-surface-muted")
                      }
                    >
                      {formatDelta(scoreDelta)}
                    </span>
                  )}
                </>
              ) : (
                <span
                  data-testid={`alignment-score-no-data-${score.canonicalIssue}`}
                  className="text-xs font-bold text-on-surface-muted tabular-nums"
                  aria-label="No data for this issue"
                >
                  —
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
              {t.alignmentScoreDrillDownLabel}
            </span>
          </div>

          {isThin && hasNumericRecord && (
            <p
              data-testid={`alignment-score-thin-record-${score.canonicalIssue}`}
              className="mt-1 text-[9px] italic text-on-surface-muted"
            >
              {t.alignmentScoreThinRecord(score.total ?? 0)}
            </p>
          )}
        </>
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
  // Two stacked text lines: the parsed reason (preserving prior data),
  // followed by an explicit hint pointing voters at policy + donor base.
  // Deliberately renders NO chart frame, NO fake 0% bar.
  if (entry.scores === null && entry.unavailable) {
    return (
      <div
        data-testid={`alignment-score-unavailable-${entry.candidateId}`}
        aria-label={`Alignment scores for ${candidateLabel}`}
        className="px-3 py-2.5 border border-outline-variant/40 bg-surface-lowest"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-on-surface-muted mb-0.5">
          {t.alignmentScoreBannerHeading}
        </p>
        <p className="text-xs italic text-on-surface-muted">
          {t.alignmentScoreUnavailablePrefix} {entry.unavailable.reason}
        </p>
        <p
          data-testid={`alignment-score-no-record-hint-${entry.candidateId}`}
          className="mt-1 text-[11px] italic text-on-surface-muted leading-snug"
        >
          {t.alignmentScoreNoRecordHint}
        </p>
      </div>
    );
  }

  const scores = entry.scores!;

  return (
    <div
      data-testid={`alignment-score-banner-${entry.candidateId}`}
      aria-label={`Alignment scores for ${candidateLabel}`}
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
            scoreDelta={scoreDeltas?.[score.canonicalIssue]}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
