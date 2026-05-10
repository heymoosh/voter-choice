"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import type {
  AlignmentScore,
  ContributingVote,
} from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * AlignmentDrilldown — inline panel listing contributing votes
 *
 * Sits below the AlignmentScoreBanner row for the selected score.
 * Not a modal — renders inline in the candidate section flow.
 *
 * Per vote: bill title (clickable if source.url), vote cast badge
 * (with = emerald, against = rose), date, source chip.
 *
 * Footer: AI disclaimer + close button.
 * Phase 2 wires this into RacePatterns.tsx.
 * ────────────────────────────────────────────────────────────── */

export interface AlignmentDrilldownProps {
  score: AlignmentScore;
  onClose: () => void;
}

/* ── Vote cast badge ────────────────────────────────────────── */

function VoteCastBadge({
  voteCast,
  t,
}: {
  voteCast: ContributingVote["voteCast"];
  t: (typeof translations)["en"]["research"];
}) {
  const isWith = voteCast === "with";
  return (
    <span
      data-testid={`vote-cast-badge-${voteCast}`}
      className={
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 " +
        (isWith
          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
          : "bg-rose-100 text-rose-800 border border-rose-300")
      }
    >
      <span aria-hidden="true">{isWith ? "✓" : "✗"}</span>
      {isWith ? t.alignmentScoreVotedWith : t.alignmentScoreVotedAgainst}
    </span>
  );
}

/* ── Source chip ────────────────────────────────────────────── */

function SourceChip({ name, url }: { name: string; url?: string }) {
  const href =
    url ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  return (
    <a
      data-testid="alignment-source-chip"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 transition-colors no-underline"
    >
      <span className="opacity-60" aria-hidden="true">
        §
      </span>
      <span>{name}</span>
    </a>
  );
}

/* ── Individual vote row ────────────────────────────────────── */

function VoteRow({
  vote,
  t,
}: {
  vote: ContributingVote;
  t: (typeof translations)["en"]["research"];
}) {
  const titleEl = vote.source.url ? (
    <a
      data-testid="alignment-vote-bill-link"
      href={vote.source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-on-surface underline underline-offset-2 hover:text-primary"
    >
      {vote.billTitle}
    </a>
  ) : (
    <span
      data-testid="alignment-vote-bill-title"
      className="font-medium text-on-surface"
    >
      {vote.billTitle}
    </span>
  );

  return (
    <li className="py-2 border-b border-outline-variant/20 last:border-0 space-y-1.5">
      {/* Bill title + date row */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs leading-snug">{titleEl}</div>
        <span
          data-testid="alignment-vote-date"
          className="text-[10px] text-on-surface-muted shrink-0 tabular-nums"
        >
          {vote.date}
        </span>
      </div>
      {/* Vote cast + source row */}
      <div className="flex items-center gap-2 flex-wrap">
        <VoteCastBadge voteCast={vote.voteCast} t={t} />
        <SourceChip name={vote.source.name} url={vote.source.url} />
      </div>
    </li>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function AlignmentDrilldown({
  score,
  onClose,
}: AlignmentDrilldownProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  return (
    <div
      data-testid={`alignment-drilldown-${score.canonicalIssue}`}
      className="border border-primary/30 bg-surface-lowest px-4 py-3 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <h5 className="text-xs font-black uppercase tracking-wide text-on-surface leading-tight">
          {t.alignmentDrilldownHeading(
            score.kept,
            score.total,
            score.issueLabel,
          )}
        </h5>
        <button
          type="button"
          data-testid="alignment-drilldown-close"
          onClick={onClose}
          aria-label={t.alignmentScoreDrillDownClose}
          className="shrink-0 text-[10px] font-black uppercase tracking-widest text-on-surface-muted hover:text-primary transition-colors px-1.5 py-0.5 border border-outline-variant/40 hover:border-primary/40"
        >
          {t.alignmentScoreDrillDownClose}
        </button>
      </div>

      {/* Vote list */}
      {score.contributingVotes.length > 0 ? (
        <ul
          data-testid="alignment-drilldown-vote-list"
          className="list-none p-0 space-y-0 divide-y divide-outline-variant/20"
        >
          {score.contributingVotes.map((vote, idx) => (
            <VoteRow key={idx} vote={vote} t={t} />
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-on-surface-muted">
          No individual votes on record.
        </p>
      )}

      {/* Footer disclaimer */}
      <footer
        data-testid="alignment-drilldown-disclaimer"
        className="border-t border-outline-variant/20 pt-2"
      >
        <p className="text-[10px] text-on-surface-muted italic">
          {t.alignmentDrilldownDisclaimer}
        </p>
      </footer>
    </div>
  );
}
