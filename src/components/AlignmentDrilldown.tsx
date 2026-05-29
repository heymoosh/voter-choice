"use client";

import React from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { formatCurrencyShort } from "../lib/ballot-utils";
import type {
  AlignmentScore,
  ContributingVote,
  DonorBucketSlice,
  RacePatternsCandidate,
} from "../lib/structured-blocks";

// Workaround intersection types removed — DonorBucketSlice.isIssuePAC,
// DonorBucketSlice.alignsWith, and ContributingVote.narrative are now
// present directly on the base interfaces in structured-blocks.ts.

/* ──────────────────────────────────────────────────────────────
 * AlignmentDrilldown — inline panel listing contributing votes
 *
 * Sits below the AlignmentScoreBanner row for the selected score.
 * Not a modal — renders inline in the candidate section flow.
 *
 * Per vote (prototype card style):
 *   - Bill number + title (split on " · " if present; otherwise full
 *     title shown directly). Bill title is a link when source.url present.
 *   - Vote cast badge (WITH / AGAINST styling per prototype palette)
 *   - Date in mono
 *   - Curated narrative paragraph [Δ] when vote.narrative is set
 *   - Source chip (link) + "View roll call →" link
 *
 * Footer: AI disclaimer + close button.
 *
 * Optional `candidate` prop unlocks the "Issue PACs funding X on
 * this" gold-tinted callout [Δ] below the vote list. When omitted
 * the callout is silently skipped; existing call sites that don't
 * pass candidate continue to compile and render unmodified.
 *
 * Phase 2 wires this into RacePatterns.tsx.
 * ────────────────────────────────────────────────────────────── */

export interface AlignmentDrilldownProps {
  score: AlignmentScore;
  onClose: () => void;
  /**
   * When provided, renders the "Issue PACs funding [candidate] on
   * this" callout by filtering `candidate.donorCoalition` for slices
   * where `isIssuePAC === true` and (`relevantToIssue` or `alignsWith`)
   * matches `score.canonicalIssue`.
   *
   * Optional: existing call sites that omit this prop continue to
   * compile and render without the callout.
   */
  candidate?: RacePatternsCandidate;
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
  const isAgainst = voteCast === "against";
  return (
    <span
      data-testid={`vote-cast-badge-${voteCast}`}
      className={
        "font-mono text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-[5px] rounded-[6px] whitespace-nowrap " +
        (isWith
          ? "bg-civic-soft text-civic-2"
          : isAgainst
            ? "bg-[oklch(0.93_0.05_28)] text-[oklch(0.40_0.12_28)]"
            : "bg-[oklch(0.92_0.012_85)] text-ink-2")
      }
    >
      {isWith
        ? t.alignmentScoreVotedWith
        : isAgainst
          ? t.alignmentScoreVotedAgainst
          : "—"}
    </span>
  );
}

/* ── Source chip — always an <a> (with URL or Google fallback) ── */

function SourceChip({ name, url }: { name: string; url?: string }) {
  const href =
    url ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  return (
    <a
      data-testid="alignment-source-chip"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 px-2 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] bg-civic-soft text-civic-2 hover:bg-civic hover:text-paper-2 rounded transition-colors no-underline"
    >
      <span className="opacity-60" aria-hidden="true">
        §
      </span>
      <span>{name}</span>
    </a>
  );
}

/* ── Individual vote card ───────────────────────────────────── */

function VoteCard({
  vote,
  t,
}: {
  vote: ContributingVote;
  t: (typeof translations)["en"]["research"];
}) {
  // Bill title element: link when source.url present, plain text otherwise
  // data-testids preserved for test compatibility
  const titleEl = vote.source.url ? (
    <a
      data-testid="alignment-vote-bill-link"
      href={vote.source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-serif text-[16px] font-semibold tracking-[-0.005em] leading-[1.25] text-ink hover:text-civic underline underline-offset-2"
    >
      {vote.billTitle}
    </a>
  ) : (
    <span
      data-testid="alignment-vote-bill-title"
      className="font-serif text-[16px] font-semibold tracking-[-0.005em] leading-[1.25] text-ink"
    >
      {vote.billTitle}
    </span>
  );

  return (
    <li className="bg-paper-2 border border-rule rounded-[10px] px-4 py-3.5 pb-3">
      {/* Head: bill title + vote badge */}
      <div className="grid grid-cols-[1fr_auto] gap-3 items-start mb-1">
        <div className="min-w-0 leading-snug">{titleEl}</div>
        <VoteCastBadge voteCast={vote.voteCast} t={t} />
      </div>

      {/* Date */}
      <div
        data-testid="alignment-vote-date"
        className="font-mono text-[11px] text-ink-3 mb-2.5 tracking-[0.04em]"
      >
        {vote.date}
      </div>

      {/* [Δ] Curated narrative paragraph */}
      {vote.narrative && (
        <p className="text-[14px] text-ink leading-[1.55] mb-3">
          {vote.narrative}
        </p>
      )}

      {/* Citation row */}
      <div className="flex items-center gap-2.5 pt-2.5 border-t border-rule-2">
        <SourceChip name={vote.source.name} url={vote.source.url} />
        {vote.source.url && (
          <a
            href={vote.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11.5px] text-ink-2 no-underline ml-auto hover:text-civic transition-colors"
          >
            {/* NEEDS-KEY: research.alignmentVoteViewRollCall — EN "View roll call →" / ES "Ver votación →" */}
            View roll call →
          </a>
        )}
      </div>
    </li>
  );
}

/* ── Main component ─────────────────────────────────────────── */

export function AlignmentDrilldown({
  score,
  onClose,
  candidate,
}: AlignmentDrilldownProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;

  // Fix pre-existing TS errors (lines 143, 160, 165): use ?? 0 and ?? []
  const kept = score.kept ?? 0;
  const total = score.total ?? 0;
  const votes = score.contributingVotes ?? [];

  // [Δ] Issue-PAC callout: only when candidate prop is supplied.
  // Note: relevantToIssue was a speculative field in the old workaround type;
  // the canonical DonorBucketSlice only has alignsWith, so that's the sole
  // filter used here.
  const issuePacs: DonorBucketSlice[] = candidate
    ? (candidate.donorCoalition ?? []).filter(
        (slice) =>
          slice.isIssuePAC && slice.alignsWith === score.canonicalIssue,
      )
    : [];

  const candidateShortName = candidate
    ? (candidate.name.split(" ").pop() ?? candidate.name)
    : /* NEEDS-KEY: research.alignmentIssuePacFallbackName — EN "this candidate" / ES "este candidato" */ "this candidate";

  return (
    <div
      data-testid={`alignment-drilldown-${score.canonicalIssue}`}
      className="py-1.5 pb-[18px] border-t border-dashed border-rule"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mt-3.5 mb-3">
        <h5 className="font-serif text-sm font-semibold text-ink leading-tight tracking-tight">
          {t.alignmentDrilldownHeading(kept, total, score.issueLabel)}
        </h5>
        <button
          type="button"
          data-testid="alignment-drilldown-close"
          onClick={onClose}
          aria-label={t.alignmentScoreDrillDownClose}
          className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3 hover:text-civic transition-colors px-2 py-0.5 border border-rule rounded-sm hover:border-civic"
        >
          {t.alignmentScoreDrillDownClose}
        </button>
      </div>

      {/* Vote list */}
      {votes.length > 0 ? (
        <ul
          data-testid="alignment-drilldown-vote-list"
          className="list-none p-0 m-0 flex flex-col gap-3"
        >
          {votes.map((vote, idx) => (
            <VoteCard key={idx} vote={vote} t={t} />
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-ink-3">
          {/* NEEDS-KEY: research.alignmentDrilldownNoVotes — EN "No individual votes on record." / ES "No hay votos individuales registrados." */}
          No individual votes on record.
        </p>
      )}

      {/* [Δ] Issue-PAC callout */}
      {issuePacs.length > 0 && (
        <div className="mt-3.5 px-3.5 py-3 bg-[oklch(0.95_0.04_75/0.45)] rounded-lg border border-[oklch(0.85_0.04_75/0.5)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-[oklch(0.42_0.08_60)] mb-2 font-semibold">
            {/* NEEDS-KEY: research.alignmentIssuePacCalloutHeading — EN "Issue PACs funding {name} on this" / ES "PACs de temas financiando a {name} en esto" */}
            Issue PACs funding {candidateShortName} on this
          </div>
          {issuePacs.map((pac, i) => (
            <div
              key={i}
              className="grid grid-cols-[12px_1fr_auto] gap-2.5 items-center text-[13.5px] py-[5px]"
            >
              <span
                className="inline-block w-[11px] h-[11px] rounded-[3px] shrink-0"
                style={{ background: "oklch(0.55 0.10 30)" }}
              />
              <span className="text-ink-2">{pac.label}</span>
              <span className="font-serif text-[15px] font-semibold text-ink">
                {pac.amount !== undefined
                  ? formatCurrencyShort(pac.amount)
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      <footer
        data-testid="alignment-drilldown-disclaimer"
        className="border-t border-rule-2 pt-2 mt-3"
      >
        <p className="text-[10px] text-ink-3 italic">
          {t.alignmentDrilldownDisclaimer}
        </p>
      </footer>
    </div>
  );
}
