"use client";

import React, { useEffect, useState } from "react";
import { getCandidateIdentity } from "@/lib/candidateIdentity";
import { anonymizeText } from "@/lib/anonymizeText";
import type {
  RacePatternsCandidate,
  AlignmentScoresEntry,
  ContributingVote,
} from "@/lib/structured-blocks";

/* ─────────────────────────────────────────────────────────────
 * AllVotesPanel
 *
 * Filterable flat list of every curated contributing vote across
 * ALL issues for ONE candidate. Opened from "See all votes →"
 * on a candidate card.
 *
 * § COMPONENT_MAP.md §2 row: new — src/components/AllVotesPanel.tsx
 * § Dedup notes (§10): uses getCandidateIdentity + anonymizeText
 *   (candidate-identity pattern) and hand-rolls the modal shell
 *   per the modal-shell dedup note (to be extracted later).
 * ───────────────────────────────────────────────────────────── */

/* ── ContributingVote extended with issue info from its parent score ── */
type FlatVote = ContributingVote & {
  /** Optional narrative paragraph [Δ] added by CAN2026. */
  narrative?: string;
  issueLabel: string;
  canonicalIssue: string;
};

/* ── Props ────────────────────────────────────────────────────
 *
 * Final prop contract (for host wiring):
 *
 *   open:           boolean
 *   candidate:      RacePatternsCandidate   — the candidate whose votes are shown
 *   alignmentEntry: AlignmentScoresEntry    — their alignment scores block entry
 *   blindMode:      boolean                 — whether blind-mode is active
 *   alias?:         string                  — e.g. "Candidate A"; used as display name
 *                                            when blindMode is true
 *   onClose:        () => void
 *
 * Note: `alias` here is the full display label ("Candidate A"), not
 * just the letter. The prototype-app.jsx call site passes
 * `alias={allVotesFor.alias && \`Candidate ${allVotesFor.alias}\`}`.
 * getCandidateIdentity is used internally for narrative anonymisation.
 * ─────────────────────────────────────────────────────────── */
export interface AllVotesPanelProps {
  open: boolean;
  candidate: RacePatternsCandidate;
  alignmentEntry: AlignmentScoresEntry;
  blindMode: boolean;
  alias?: string;
  onClose: () => void;
}

/* ─── VoteCastBadge ──────────────────────────────────────── */

function VoteCastBadge({ voteCast }: { voteCast: ContributingVote["voteCast"] }) {
  const isWith = voteCast === "with";
  const isAgainst = voteCast === "against";
  return (
    <span
      className={
        "font-mono text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-[5px] rounded-[6px] whitespace-nowrap " +
        (isWith
          ? "bg-civic-soft text-civic-2"
          : isAgainst
            ? "bg-[oklch(0.93_0.05_28)] text-[oklch(0.40_0.12_28)]"
            : "bg-[oklch(0.92_0.012_85)] text-ink-2")
      }
    >
      {/* NEEDS-KEY: research.allVotesWith — EN "WITH YOU" / ES "A TU FAVOR" */}
      {/* NEEDS-KEY: research.allVotesAgainst — EN "AGAINST YOU" / ES "EN TU CONTRA" */}
      {isWith ? "WITH YOU" : isAgainst ? "AGAINST YOU" : "—"}
    </span>
  );
}

/* ─── SourceChip ─────────────────────────────────────────── */

function SourceChip({ name, url }: { name: string; url?: string }) {
  const href = url ?? `https://www.google.com/search?q=${encodeURIComponent(name)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 px-2 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] bg-civic-soft text-civic-2 hover:bg-civic hover:text-paper-2 rounded transition-colors no-underline"
    >
      <span className="opacity-60" aria-hidden="true">§</span>
      <span>{name}</span>
    </a>
  );
}

/* ─── VoteRow ────────────────────────────────────────────── */

function VoteRow({
  vote,
  anonCtx,
}: {
  vote: FlatVote;
  anonCtx: { blindMode: boolean; realLastName?: string; alias?: string };
}) {
  // Split bill number from title on " · " separator (prototype convention)
  const [billNum, ...rest] = (vote.billTitle || "").split(" · ");
  const billTitle = rest.join(" · ");

  // Anonymize narrative when blind mode is on
  const narrativeText = vote.narrative
    ? anonymizeText(vote.narrative, anonCtx)
    : undefined;

  // Format date like prototype: "Dec 5, 2023"
  let formattedDate = vote.date;
  try {
    formattedDate = new Date(vote.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    // keep raw string on parse failure
  }

  return (
    <div className="bg-paper-2 border border-rule rounded-[10px] px-4 py-3.5 pb-3">
      {/* Head: bill identifier + vote badge */}
      <div className="grid grid-cols-[1fr_auto] gap-3 items-start mb-1">
        <div className="min-w-0 leading-snug">
          {billNum && (
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 mb-0.5">
              {billNum}
            </div>
          )}
          {billTitle ? (
            <div className="font-serif text-[15px] font-semibold tracking-[-0.005em] leading-[1.25] text-ink">
              {billTitle}
            </div>
          ) : (
            /* No separator — full string is the title */
            <div className="font-serif text-[15px] font-semibold tracking-[-0.005em] leading-[1.25] text-ink">
              {vote.billTitle}
            </div>
          )}
        </div>
        <VoteCastBadge voteCast={vote.voteCast} />
      </div>

      {/* Issue tag + date */}
      <div className="flex items-center gap-2.5 mt-1.5 mb-2.5">
        <span className="inline-block px-2 py-0.5 rounded-[5px] bg-tag-bg font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-3 font-medium">
          {vote.issueLabel}
        </span>
        <span className="font-mono text-[11px] text-ink-3 tracking-[0.04em]">
          {formattedDate}
        </span>
      </div>

      {/* [Δ] Curated narrative paragraph (CAN2026) */}
      {narrativeText && (
        <p className="text-[14px] text-ink leading-[1.55] mb-3 mt-0">
          {narrativeText}
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
            {/* NEEDS-KEY: research.allVotesViewRollCall — EN "View roll call →" / ES "Ver votación →" */}
            View roll call →
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */

export function AllVotesPanel({
  open,
  candidate,
  alignmentEntry,
  blindMode,
  alias,
  onClose,
}: AllVotesPanelProps) {
  // NOTE: useLanguage() is NOT called here because AllVotesPanel's translation
  // keys don't exist yet. All user-visible strings are English literals with
  // NEEDS-KEY comments. Add useLanguage() + translations[lang] access once
  // the keys are merged into translations.ts.

  const [filter, setFilter] = useState<string>("all");

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll while panel is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || !candidate) return null;

  // Build candidate identity (for anon context)
  const identity = getCandidateIdentity(candidate, { blindMode });
  const anonCtx = {
    blindMode,
    realLastName: candidate.name.split(" ").pop(),
    alias: alias ?? identity.aliasLabel,
  };

  // Flatten all contributing votes across every score in the entry
  const allVotes: FlatVote[] = [];
  for (const score of alignmentEntry.scores ?? []) {
    for (const v of score.contributingVotes ?? []) {
      allVotes.push({
        ...v,
        // Cast to include optional narrative [Δ]
        narrative: (v as ContributingVote & { narrative?: string }).narrative,
        issueLabel: score.issueLabel,
        canonicalIssue: score.canonicalIssue,
      });
    }
  }

  // Unique canonical issue ids (in order of first appearance)
  const issueIds = [...new Set(allVotes.map((v) => v.canonicalIssue))];

  // Filtered list
  const filtered =
    filter === "all"
      ? allVotes
      : allVotes.filter((v) => v.canonicalIssue === filter);

  // Display name in header
  const headerName = blindMode ? (alias ?? identity.aliasLabel) : candidate.name;

  return (
    /* Backdrop — fixed overlay */
    <div
      role="dialog"
      aria-modal="true"
      /* NEEDS-KEY: research.allVotesPanelAriaLabel — EN "All curated votes" / ES "Todas las votaciones" */
      aria-label="All curated votes"
      className={[
        "fixed inset-0 z-[100]",
        "flex items-stretch justify-end",
        "bg-[oklch(0.18_0.018_240/0.55)] backdrop-blur-[4px]",
        "animate-[fadein_0.15s_ease]",
      ].join(" ")}
      onClick={onClose}
    >
      {/* Panel shell — right-side drawer */}
      <div
        className={[
          "relative flex flex-col",
          "bg-paper border-l border-rule",
          "shadow-[var(--shadow-card)]",
          "w-full max-w-[560px]",
          "overflow-hidden",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────── */}
        <header className="flex items-start justify-between gap-4 px-[26px] pt-[22px] pb-[14px] border-b border-rule shrink-0">
          <div className="min-w-0">
            {/* Eyebrow */}
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-civic font-semibold mb-[5px] truncate">
              {/* NEEDS-KEY: research.allVotesPanelEyebrow — EN "{name} · all curated votes" / ES "{name} · todas las votaciones" */}
              {headerName} · all curated votes
            </div>
            {/* Title */}
            <h3 className="font-serif font-semibold text-[20px] tracking-[-0.01em] text-ink leading-[1.2] m-0">
              {/* NEEDS-KEY: research.allVotesPanelTitle — EN "{count} votes across {issueCount} of your issues" / ES "{count} votos en {issueCount} de tus temas" */}
              {allVotes.length} vote{allVotes.length !== 1 ? "s" : ""} across{" "}
              {issueIds.length} of your issue{issueIds.length !== 1 ? "s" : ""}
            </h3>
          </div>
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[6px] font-mono text-[18px] leading-none text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors -mt-0.5"
          >
            ×
          </button>
        </header>

        {/* ── Filter strip ───────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-[26px] py-3 border-b border-rule-2 shrink-0 scrollbar-none">
          {/* "All" tab */}
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] border font-mono text-[11px] uppercase tracking-[0.1em] whitespace-nowrap transition-colors",
              filter === "all"
                ? "bg-civic text-paper-2 border-civic"
                : "bg-paper-2 text-ink-2 border-rule hover:border-civic hover:text-civic",
            ].join(" ")}
          >
            {/* NEEDS-KEY: research.allVotesFilterAll — EN "All" / ES "Todos" */}
            All
            <span className="opacity-70 font-semibold">{allVotes.length}</span>
          </button>

          {/* Per-issue tabs */}
          {issueIds.map((ci) => {
            const count = allVotes.filter((v) => v.canonicalIssue === ci).length;
            const label = allVotes.find((v) => v.canonicalIssue === ci)!.issueLabel;
            return (
              <button
                key={ci}
                type="button"
                onClick={() => setFilter(ci)}
                className={[
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] border font-mono text-[11px] uppercase tracking-[0.1em] whitespace-nowrap transition-colors",
                  filter === ci
                    ? "bg-civic text-paper-2 border-civic"
                    : "bg-paper-2 text-ink-2 border-rule hover:border-civic hover:text-civic",
                ].join(" ")}
              >
                {label}
                <span className="opacity-70 font-semibold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Vote list (scrollable) ──────────────────── */}
        <div className="flex-1 overflow-y-auto px-[22px] py-4 flex flex-col gap-3">
          {filtered.length === 0 ? (
            <p className="px-1 py-4 text-[14px] italic text-ink-3">
              {/* NEEDS-KEY: research.allVotesEmpty — EN "No votes on this issue yet." / ES "Aún no hay votos sobre este tema." */}
              No votes on this issue yet.
            </p>
          ) : (
            filtered.map((v, i) => (
              <VoteRow key={i} vote={v} anonCtx={anonCtx} />
            ))
          )}
        </div>

        {/* ── Methodology footer ──────────────────────── */}
        <footer className="shrink-0 border-t border-rule px-[26px] py-[18px] bg-paper-2">
          {/* NEEDS-KEY: research.allVotesMethodHead — EN "How we know" / ES "Cómo lo sabemos" */}
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-civic font-semibold mb-2">
            How we know
          </div>
          <p className="text-[13px] text-ink-2 leading-[1.5] mb-2 mt-0">
            {/* NEEDS-KEY: research.allVotesMethodBody — EN ""With you" / "against you" is computed by comparing each roll-call vote to your stated stance on the issue this bill touches." / ES "" */}
            <b>"With you" / "against you"</b> is computed by comparing each
            roll-call vote to your stated stance on the issue this bill touches.
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-1 text-[12px] text-ink-3 leading-[1.5]">
            <li>
              Vote data:{" "}
              <a
                href="https://www.congress.gov/roll-call-votes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                Congress.gov · federal roll calls
              </a>
              {" · "}
              <a
                href="https://capitol.texas.gov/Reports/Daily/Default.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                TX Legislature daily reports
              </a>
            </li>
            <li>
              Narrative context:{" "}
              <a
                href="https://can2026.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                CAN2026 case files
              </a>
              {" · "}
              <a
                href="/methodology"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                our methodology
              </a>
            </li>
            <li>
              Donor breakdowns:{" "}
              <a
                href="https://www.opensecrets.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                OpenSecrets
              </a>
              {" · "}
              <a
                href="https://www.fec.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civic hover:underline"
              >
                FEC committee filings
              </a>
            </li>
          </ul>
          <p className="text-[11.5px] text-ink-3 italic mt-2.5 mb-0 leading-[1.45]">
            {/* NEEDS-KEY: research.allVotesDisclaimer — EN "We don't generate vote claims from AI — if a vote isn't in our database, we don't show it. Every claim on every card links to a primary source." / ES "" */}
            We don&apos;t generate vote claims from AI — if a vote isn&apos;t in
            our database, we don&apos;t show it. Every claim on every card links
            to a primary source.
          </p>
        </footer>
      </div>
    </div>
  );
}
