"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Race } from "@/lib/raceDeriver";
import type {
  ConcernInterpretationEntry,
  RacePatternsBlock,
  AlignmentScoresEntry,
} from "@/lib/structured-blocks";
import { getCandidateIdentity } from "@/lib/candidateIdentity";
import { anonymizeText } from "@/lib/anonymizeText";
import { formatCurrencyShort } from "@/lib/ballot-utils";
import { getPeerComparison } from "@/lib/peerComparison";
import type { PeerEntry } from "@/lib/peerComparison";
import { FundingMixBars } from "@/components/FundingMixBars";

/* ──────────────────────────────────────────────────────────────
 * CompareModal — side-by-side issue grid for the active race's
 * two candidates. Opened from the "Compare" button in the chat
 * header.
 *
 * Ported from docs/design/2026-redesign/prototype/prototype-screens.jsx
 * (CompareModal, § line 576–730).
 *
 * Design conventions from COMPONENT_MAP.md §10:
 *   - Modal shell: overlay + stopPropagation + Escape-to-close +
 *     focus-on-open. A shared <Modal> wrapper is recommended in
 *     §10 but not yet extracted; the pattern is hand-rolled here
 *     identical to the other modal ports.
 *   - Candidate identity: uses getCandidateIdentity (lib) — single
 *     source of truth for Candidate A/B alias vs real name.
 *   - Reveal button: eye icon + "Reveal" — same pattern as
 *     CandidateCardHeader (§10 consolidation candidate).
 *   - FundingMixBars: shared component (not re-implemented here).
 *   - Money comparison: uses getPeerComparison (lib) for the
 *     "2.0× more/less than Candidate B" note.
 *
 * DATA ACCESS:
 *   The prototype reads global mocks RACE_PATTERNS / ALIGNMENT_SCORES.
 *   This port NEVER reaches for globals. The host passes:
 *     racePatterns?: RacePatternsBlock   — candidates + fundingMix
 *     alignmentScoresByCandidate?: Map<string, AlignmentScoresEntry>
 *       — same Map shape ChatPanel already builds for RacePatterns
 * ────────────────────────────────────────────────────────────── */

export interface CompareModalProps {
  open: boolean;
  race: Race;
  issues: ConcernInterpretationEntry[];
  blindMode: boolean;
  revealedCandidates: Set<string>;
  onRevealCandidate: (id: string) => void;
  onClose: () => void;
  /**
   * Candidate funding + donorCoalition data. Supply the RacePatternsBlock
   * for this race so CompareModal can render fundingMix bars and totalRaised.
   * Optional — the modal renders "—" when absent or incomplete.
   */
  racePatterns?: RacePatternsBlock;
  /**
   * Per-candidate alignment scores. Pass the same Map that ChatPanel builds
   * from parseAlignmentScoresBlock: Map<candidateId, AlignmentScoresEntry>.
   * Optional — the modal renders "—" rows when absent.
   */
  alignmentScoresByCandidate?: Map<string, AlignmentScoresEntry>;
}

/** Bar fill color from prototype (≥65 civic, ≥50 gold, else vote-red). */
function barFillClass(pct: number): string {
  if (pct >= 65) return "bg-civic";
  if (pct >= 50) return "bg-gold";
  return "bg-vote-red";
}

/** Percentage text color. */
function pctTextClass(pct: number): string {
  if (pct >= 65) return "text-ink";
  if (pct >= 50) return "text-ink-2";
  return "text-vote-red";
}

export function CompareModal({
  open,
  race,
  issues,
  blindMode,
  revealedCandidates,
  onRevealCandidate,
  onClose,
  racePatterns,
  alignmentScoresByCandidate,
}: CompareModalProps) {
  // Expanded key: `${candidateId}|${canonicalIssue}` — one at a time
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Escape-to-close + focus management
  useEffect(() => {
    if (!open) return;

    // Capture focus origin so we can restore it on close
    previousFocusRef.current = document.activeElement;

    // Focus the close button on mount (basic focus handling)
    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (!open && previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  const handleOverlayClick = useCallback(() => onClose(), [onClose]);
  const handleInnerClick = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  if (!open) return null;

  const candidates = racePatterns?.candidates ?? [];
  if (candidates.length < 2) return null;

  // Build identity labels for each candidate
  const labels = candidates.map((c, idx) => {
    const id = getCandidateIdentity(c, {
      blindMode,
      revealed: revealedCandidates,
      index: idx,
    });
    return {
      primary: id.displayName,
      secondary: id.isBlind ? id.secondary : (c.priorRole ?? ""),
      isBlind: id.isBlind,
      alias: id.alias,
    };
  });

  const allBlind = labels.every((l) => l.isBlind);
  const anyBlind = labels.some((l) => l.isBlind);

  // Peer comparison data for funding panel
  const peerEntries: PeerEntry[] = candidates
    .map((c, idx) => ({
      total: c.totalRaised ?? 0,
      aliasOrName: labels[idx].primary,
    }))
    .filter((p) => p.total > 0);

  return (
    /* Overlay — click backdrop to close */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-4"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={
        /* NEEDS-KEY: compare.modalLabel — EN "Side-by-side comparison" / ES "Comparación lado a lado" */
        "Side-by-side comparison"
      }
    >
      {/* Modal inner — stop propagation so clicks inside don't close */}
      <div
        className="relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-paper rounded-t-[16px] sm:rounded-[16px] shadow-2xl overflow-hidden"
        onClick={handleInnerClick}
      >
        {/* ── Header ── */}
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-rule flex-shrink-0">
          <div className="min-w-0">
            {/* Eyebrow */}
            <div className="font-mono text-[11px] uppercase tracking-widest text-ink-3 mb-1">
              {/* NEEDS-KEY: compare.eyebrow — EN "Side-by-side · {raceLabel}" / ES "Lado a lado · {raceLabel}" */}
              Side-by-side &middot; {race.label}
            </div>
            {/* Title */}
            <h3 className="font-serif text-[19px] leading-[1.25] text-ink">
              {allBlind
                ? /* NEEDS-KEY: compare.titleBlind — EN "Same record, same issues — names hidden." / ES "El mismo historial, los mismos temas — nombres ocultos." */
                  "Same record, same issues — names hidden."
                : /* NEEDS-KEY: compare.title — EN "Same record, same issues, both candidates." / ES "El mismo historial, los mismos temas, ambos candidatos." */
                  "Same record, same issues, both candidates."}
            </h3>
          </div>
          {/* × close */}
          <button
            ref={closeButtonRef}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-ink-3 hover:bg-paper-2 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-civic focus-visible:outline-offset-1"
            onClick={onClose}
            aria-label={
              /* NEEDS-KEY: compare.closeAriaLabel — EN "Close" / ES "Cerrar" */ "Close"
            }
          >
            <span aria-hidden="true" className="text-[22px] leading-none">
              &times;
            </span>
          </button>
        </header>

        {/* ── Candidate roster header ── */}
        <div className="grid grid-cols-2 gap-px bg-rule border-b border-rule flex-shrink-0">
          {candidates.map((c, idx) => {
            const lab = labels[idx];
            return (
              <div
                key={c.id}
                className={`flex flex-col gap-1 px-4 py-3 bg-paper${lab.isBlind ? " opacity-90" : ""}`}
              >
                {/* Alias badge */}
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  {/* NEEDS-KEY: compare.candidateAliasPrefix — EN "Candidate {alias}" / ES "Candidato {alias}" */}
                  Candidate {lab.alias}
                </div>
                {/* Display name */}
                <div className="font-serif text-[15px] font-semibold text-ink leading-snug">
                  {lab.primary}
                </div>
                {/* Role subtitle or hidden notice */}
                {!lab.isBlind && lab.secondary && (
                  <div className="text-[13px] text-ink-3 leading-snug">
                    {lab.secondary}
                  </div>
                )}
                {/* Reveal button */}
                {lab.isBlind && (
                  <button
                    className="mt-1 inline-flex items-center gap-[5px] text-[12px] text-civic font-medium hover:text-civic-2 focus-visible:outline-2 focus-visible:outline-civic focus-visible:outline-offset-1 transition-colors self-start"
                    onClick={() => onRevealCandidate(c.id)}
                  >
                    {/* Eye icon */}
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
                    {/* NEEDS-KEY: compare.revealButton — EN "Reveal" / ES "Revelar" */}
                    <span>Reveal</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Issue panels (scrollable) ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Per-issue stacked panels */}
          {issues.map((iss) => (
            <div
              key={iss.canonicalIssue ?? iss.interpretation}
              className="border-b border-rule last:border-b-0"
            >
              {/* Issue header */}
              <div className="px-5 pt-4 pb-2">
                <div className="font-sans text-[14px] font-semibold text-ink leading-snug">
                  {iss.interpretation}
                </div>
                {iss.stance && (
                  <div className="mt-0.5 text-[12px] text-ink-3 italic">
                    {iss.stance}
                  </div>
                )}
              </div>

              {/* One row per candidate */}
              {candidates.map((c, ci) => {
                const lab = labels[ci];
                const entry = alignmentScoresByCandidate?.get(c.id);
                const score = entry?.scores?.find(
                  (s) => s.canonicalIssue === iss.canonicalIssue,
                );
                const expandKey = `${c.id}|${iss.canonicalIssue}`;
                const isExpanded = expandedKey === expandKey;

                let bodyEl: React.ReactNode;

                if (!score && entry?.unavailable) {
                  bodyEl = (
                    <div className="text-[13px] text-ink-3 italic py-2">
                      {/* NEEDS-KEY: compare.noRecord — EN "No legislative record" / ES "Sin historial legislativo" */}
                      No legislative record
                    </div>
                  );
                } else if (!score) {
                  bodyEl = (
                    <div className="text-[13px] text-ink-3 py-2">&mdash;</div>
                  );
                } else {
                  const pct =
                    typeof score.kept === "number" &&
                    typeof score.total === "number" &&
                    score.total > 0
                      ? Math.round((score.kept / score.total) * 100)
                      : null;

                  const hasVotes = !!score.contributingVotes?.length;
                  const voteCount = score.contributingVotes?.length ?? 0;

                  bodyEl = (
                    <>
                      {/* Bar + pct + meta */}
                      <div className="flex items-center gap-3 py-2">
                        {/* Bar track */}
                        <div className="flex-1 h-[8px] rounded-full bg-paper-2 overflow-hidden border border-rule">
                          {pct !== null && (
                            <div
                              className={`h-full rounded-full ${barFillClass(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          )}
                        </div>
                        {/* Pct */}
                        {pct !== null ? (
                          <div
                            className={`font-serif text-[18px] font-bold leading-none w-[44px] text-right tabular-nums ${pctTextClass(pct)}`}
                          >
                            {pct}
                            <small className="text-[11px] font-normal">%</small>
                          </div>
                        ) : (
                          <div className="font-serif text-[18px] text-ink-3 w-[44px] text-right">
                            &mdash;
                          </div>
                        )}
                        {/* N of M */}
                        {typeof score.kept === "number" &&
                          typeof score.total === "number" && (
                            <div className="text-[11px] text-ink-3 whitespace-nowrap">
                              {/* NEEDS-KEY: compare.voteMeta — EN "{kept} of {total} votes" / ES "{kept} de {total} votos" */}
                              {score.kept} of {score.total} votes
                            </div>
                          )}
                      </div>

                      {/* Expand toggle */}
                      {hasVotes && (
                        <button
                          className="text-[12px] text-civic hover:text-civic-2 focus-visible:outline-2 focus-visible:outline-civic focus-visible:outline-offset-1 transition-colors mb-1"
                          onClick={() =>
                            setExpandedKey(isExpanded ? null : expandKey)
                          }
                          aria-expanded={isExpanded}
                        >
                          {isExpanded
                            ? /* NEEDS-KEY: compare.hideVotes — EN "▴ Hide votes" / ES "▴ Ocultar votos" */
                              "▴ Hide votes"
                            : /* NEEDS-KEY: compare.viewVotes — EN "▾ View the {n} vote(s)" / ES "▾ Ver los {n} voto(s)" */
                              `▾ View the ${voteCount} ${voteCount === 1 ? "vote" : "votes"}`}
                        </button>
                      )}

                      {/* Expanded vote cards */}
                      {isExpanded && hasVotes && (
                        <div className="flex flex-col gap-3 pb-3 border-t border-rule-2 mt-1 pt-3">
                          {score.contributingVotes!.map((v, vi) => {
                            const parts = (v.billTitle ?? "").split(" · ");
                            const billNum = parts[0] ?? "";
                            const billName = parts[1] ?? "";
                            const anonCtx = {
                              blindMode: lab.isBlind,
                              realLastName: c.name?.split(" ").pop(),
                              alias: lab.primary,
                            };
                            return (
                              <div
                                key={vi}
                                className="bg-paper-2 rounded-[8px] p-3 text-[13px]"
                              >
                                {/* Vote head: bill number + with/against badge */}
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="font-mono text-[11px] text-ink-3 leading-snug">
                                    {billNum}
                                  </span>
                                  <span
                                    className={`flex-shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                      v.voteCast === "with"
                                        ? "bg-civic text-paper"
                                        : v.voteCast === "against"
                                          ? "bg-vote-red text-paper"
                                          : "bg-paper-2 text-ink-3 border border-rule"
                                    }`}
                                  >
                                    {v.voteCast === "with"
                                      ? /* NEEDS-KEY: compare.withYou — EN "WITH YOU" / ES "CON USTED" */
                                        "WITH YOU"
                                      : v.voteCast === "against"
                                        ? /* NEEDS-KEY: compare.againstYou — EN "AGAINST YOU" / ES "EN CONTRA" */
                                          "AGAINST YOU"
                                        : /* NEEDS-KEY: compare.voteOther — EN "—" / ES "—" */
                                          "—"}
                                  </span>
                                </div>
                                {/* Bill title */}
                                {billName && (
                                  <div className="text-ink leading-snug mb-1">
                                    {billName}
                                  </div>
                                )}
                                {/* Narrative (anonymized) */}
                                {v.narrative && (
                                  <p className="text-ink-2 leading-relaxed mb-2">
                                    {anonymizeText(v.narrative, anonCtx)}
                                  </p>
                                )}
                                {/* Source citation */}
                                <div className="text-[11px] text-ink-3">
                                  {v.source?.url ? (
                                    <a
                                      href={v.source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline underline-offset-2 hover:text-ink transition-colors"
                                    >
                                      {v.source.name}
                                      {/* NEEDS-KEY: compare.viewRollCall — EN " →" */}
                                      {" →"}
                                    </a>
                                  ) : (
                                    <span>
                                      {v.source?.name ??
                                        /* NEEDS-KEY: compare.sourcePending — EN "Source pending" / ES "Fuente pendiente" */
                                        "Source pending"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className="px-5 pb-3 border-t border-rule-2 first:border-t-0"
                  >
                    {/* Candidate tag */}
                    <div className="text-[11px] font-mono uppercase tracking-widest text-ink-3 pt-3 pb-1">
                      {lab.primary}
                    </div>
                    {bodyEl}
                  </div>
                );
              })}
            </div>
          ))}

          {/* ── Funding mix panel ── */}
          <div className="border-t border-rule">
            {/* Panel header */}
            <div className="px-5 pt-4 pb-2">
              <div className="font-sans text-[14px] font-semibold text-ink leading-snug">
                {/* NEEDS-KEY: compare.fundingMixTitle — EN "Funding mix" / ES "Mezcla de financiamiento" */}
                Funding mix
              </div>
              <div className="mt-0.5 text-[12px] text-ink-3 italic">
                {/* NEEDS-KEY: compare.fundingMixSubtitle — EN "small / large individual / PAC" / ES "pequeños / grandes individuales / PAC" */}
                small / large individual / PAC
              </div>
            </div>

            {candidates.map((c, ci) => {
              const lab = labels[ci];
              const totalRaised = c.totalRaised;
              const fundingMix = c.fundingMix;

              // Peer comparison note
              const peerCmp =
                peerEntries.length >= 2 && totalRaised
                  ? getPeerComparison(totalRaised, peerEntries)
                  : null;

              return (
                <div
                  key={c.id}
                  className="px-5 pb-4 border-t border-rule-2 first:border-t-0"
                >
                  {/* Candidate tag + total raised */}
                  <div className="flex items-baseline gap-2 pt-3 pb-2">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-ink-3">
                      {lab.primary}
                    </span>
                    {totalRaised ? (
                      <span className="text-[13px] font-serif font-semibold text-ink">
                        {formatCurrencyShort(totalRaised)}
                      </span>
                    ) : null}
                    {peerCmp && (
                      <span className="text-[11px] text-ink-3">
                        {/* NEEDS-KEY: compare.peerCmpLabel — English: "{n}× more/less than {peer}" */}
                        {peerCmp.label}
                      </span>
                    )}
                  </div>

                  {/* Funding mix bars */}
                  {fundingMix ? (
                    <FundingMixBars mix={fundingMix} labelMin={15} />
                  ) : (
                    <div className="text-[13px] text-ink-3 italic">
                      {/* NEEDS-KEY: compare.fundingUnavailable — EN "—" / ES "—" */}
                      &mdash;
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom padding for scroll breathing room */}
          <div className="h-4" />
        </div>

        {/* ── Footer: blind-mode reminder ── */}
        {anyBlind && (
          <footer className="flex items-start gap-2.5 px-5 py-3 bg-civic-soft border-t border-rule flex-shrink-0">
            <span
              className="text-[14px] leading-none mt-0.5"
              aria-hidden="true"
            >
              &#9888;
            </span>
            <p className="text-[12px] text-ink-2 leading-relaxed">
              {/* NEEDS-KEY: compare.blindFooter — EN "Candidate identities are hidden so you decide on the record. Tap <b>Reveal</b> at the top when you're ready to see who's who." / ES "Las identidades de los candidatos están ocultas para que decidas según el historial. Toca <b>Revelar</b> arriba cuando estés listo para ver quién es quién." */}
              Candidate identities are hidden so you decide on the record. Tap{" "}
              <strong className="font-semibold">Reveal</strong> at the top when
              you&rsquo;re ready to see who&rsquo;s who.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
