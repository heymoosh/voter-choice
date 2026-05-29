"use client";

import React from "react";
import type { Race, RaceSection } from "../lib/raceDeriver";
import { normalizeCandidateName } from "../lib/normalizeCandidateName";

/**
 * A single committed decision. Owned upstream by `ElectionResult`. The shape
 * is intentionally narrow so Phase 7's printable can render from the same
 * data without re-traversing chat messages.
 */
export interface Decision {
  raceId: string;
  raceLabel: string;
  section: string;
  /** Candidate name (or "Yes"/"No" for propositions). */
  pick: string;
  party?: string;
  /** Verbatim text the voter wrote at pick-time. Rendered italic on print. */
  whyNote: string;
}

export interface BallotPaneProps {
  decisions: Decision[];
  totalRaces: number;
  races: Race[];
  /**
   * City + state ONLY. PII rule: full street address never leaves the client.
   */
  cityState: string;
  /** Whether the polling-card slot should be visible (>50% complete). */
  hasPolling: boolean;
  activeRaceId: string | null;
  onPrint: () => void;
  onSaveProfile: () => void;
  onHandoff: () => void;
  /**
   * Selecting a race from the ballot. On mobile (Pattern B) this opens the
   * chat sheet for that race; on desktop it just changes the active race.
   * When omitted, the rows render non-interactive (legacy behavior).
   */
  onSelectRace?: (raceId: string) => void;
  /**
   * Ranked issues, surfaced with an edit action INSIDE the ballot on
   * tablet/mobile (≤1023px) where the left rail — the normal home of
   * "Your issues · Edit" — is hidden. Omitted on the desktop rail path.
   */
  issues?: { name: string }[];
  /** Opens the issue-amend editor (paired with `issues`). */
  onEditThemes?: () => void;
}

/**
 * BallotPane — right pane of the 3-pane workspace. Pure presentational.
 *
 * Responsibilities:
 *  - Header: "Your ballot · N/M · Draft" + address line (city + state only)
 *  - Sectioned decision list: each section header, then races; committed
 *    picks show party + italic verbatim why-note. Active undecided shows
 *    "Deciding now…"; non-active undecided shows "Not yet decided".
 *  - Polling card slot at the bottom (placeholder; Phase 7-adjacent content).
 *  - Exports footer: Print / Save profile / Continue in another chatbot.
 *
 * State lives upstream — this component is fully prop-driven so the same
 * data shape can feed Phase 7's printable artifact.
 */
export function BallotPane({
  decisions,
  totalRaces,
  races,
  cityState,
  hasPolling,
  activeRaceId,
  onPrint,
  onSaveProfile,
  onHandoff,
  onSelectRace,
  issues,
  onEditThemes,
}: BallotPaneProps) {
  const decidedCount = decisions.length;
  const canPrint = decidedCount > 0;

  // Index decisions by raceId for O(1) lookup during render.
  const decisionByRace = new Map<string, Decision>();
  decisions.forEach((d) => decisionByRace.set(d.raceId, d));

  // Group races by section while preserving the deriver's order.
  const grouped = groupRacesBySection(races);

  return (
    <aside
      data-testid="ballot-pane"
      aria-label="Your ballot"
      className="flex h-full flex-col overflow-y-auto border-l border-rule-2 bg-paper text-ink"
    >
      <header
        data-testid="ballot-pane-header"
        className="border-b border-rule px-5 pb-3.5 pt-4"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="m-0 font-serif text-[19px] font-semibold tracking-tight text-ink">
            Your ballot
          </h3>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            {decidedCount}/{totalRaces} · Draft
          </span>
        </div>
        <address
          data-testid="ballot-pane-address"
          className="mt-2 not-italic font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3"
        >
          {cityState || "—"}
        </address>
      </header>

      {/* Issues-edit relocation — only ≤1023px, where the left rail (the
          normal home of "Your issues · Edit") is hidden. Keeps the edit path
          reachable on tablet/mobile. */}
      {onEditThemes && (
        <div
          data-testid="ballot-pane-issues-edit"
          className="min-[1024px]:hidden border-b border-rule-2 bg-paper-2 px-5 py-3.5"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
              Your issues
            </span>
            <button
              type="button"
              data-testid="ballot-pane-edit-issues"
              onClick={onEditThemes}
              className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-civic hover:underline"
            >
              Edit ranking →
            </button>
          </div>
          {issues && issues.length > 0 && (
            <ol className="mt-2 flex flex-col gap-1">
              {issues.map((it, i) => (
                <li
                  key={`${i}-${it.name}`}
                  className="flex gap-2 font-serif text-[13.5px] leading-snug text-ink-2"
                >
                  <span className="font-mono text-[11px] text-civic">
                    {i + 1}.
                  </span>
                  <span>{it.name}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div
        data-testid="ballot-pane-list"
        className="flex flex-1 flex-col overflow-y-auto px-5 pb-3 pt-1.5"
      >
        {grouped.map(({ section, items }) => (
          <section key={section} className="flex flex-col">
            <div className="px-0 pb-1 pt-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
              {section}
            </div>
            <ul className="flex flex-col">
              {items.map((race) => {
                const decision = decisionByRace.get(race.id);
                const isActive = race.id === activeRaceId;
                const isDone = !!decision;
                return (
                  <li
                    key={race.id}
                    data-testid={`ballot-pane-row-${race.id}`}
                    data-active={isActive ? "true" : "false"}
                    data-decided={isDone ? "true" : "false"}
                    {...(onSelectRace
                      ? {
                          role: "button",
                          tabIndex: 0,
                          "aria-label": `Open ${race.label}`,
                          onClick: () => onSelectRace(race.id),
                          onKeyDown: (e: React.KeyboardEvent) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectRace(race.id);
                            }
                          },
                        }
                      : {})}
                    className={[
                      "grid grid-cols-[18px_1fr] gap-3 border-b border-rule-2 py-3.5",
                      onSelectRace
                        ? "cursor-pointer transition-colors hover:bg-paper-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-civic"
                        : "cursor-default",
                      isActive
                        ? "-mx-3.5 rounded-md border-b-transparent border-l-[3px] border-l-civic bg-civic-soft px-3.5"
                        : "",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "relative mt-0.5 h-[18px] w-[18px] flex-shrink-0 rounded border-[1.5px]",
                        isDone
                          ? "border-civic bg-civic after:absolute after:left-[3px] after:top-[5px] after:h-1 after:w-[9px] after:-rotate-45 after:border-b-[2px] after:border-l-[2px] after:border-paper-2 after:content-['']"
                          : "border-dashed border-rule",
                      ].join(" ")}
                    />
                    <div>
                      {/* Audit override of prototype `.b-row .race`
                          (which used mono uppercase). Per the live-audit
                          polish sweep the race label here renders in
                          sentence-case sans so it visually matches the
                          rail label and reads as body text not a micro
                          eyebrow. */}
                      <div
                        data-testid={`ballot-pane-race-label-${race.id}`}
                        className="mb-0.5 font-sans text-[13px] font-medium tracking-tight text-ink-2"
                      >
                        {race.label}
                      </div>
                      <div className="font-serif text-base font-semibold tracking-tight">
                        {isDone ? (
                          <>
                            <span className="text-ink">
                              {normalizeCandidateName(decision.pick)}
                            </span>
                            {decision.party ? (
                              <span className="ml-1 font-mono text-[10.5px] font-normal uppercase tracking-[0.1em] text-ink-3">
                                ({decision.party})
                              </span>
                            ) : null}
                          </>
                        ) : isActive ? (
                          <span className="font-serif text-base font-normal italic text-ink-3">
                            Deciding now…
                          </span>
                        ) : (
                          <span className="font-serif text-base font-normal italic text-ink-3">
                            Not yet decided
                          </span>
                        )}
                      </div>
                      {decision && decision.whyNote ? (
                        <div
                          data-testid={`ballot-pane-why-${race.id}`}
                          style={{ fontStyle: "italic" }}
                          className="mt-1 font-serif text-[12.5px] italic leading-snug text-ink-2"
                        >
                          &ldquo;{decision.whyNote}&rdquo;
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {hasPolling ? (
        <div
          data-testid="ballot-pane-polling-slot"
          className="border-t border-rule bg-paper-2 px-5 py-4 text-xs text-ink-2"
        >
          {/*
            Placeholder per packet §22. Phase 7 surfaces real polling content
            (precinct address, hours, what to bring). For Phase 3 this slot
            simply reserves the space so the layout doesn't shift when the
            content lands.
          */}
          <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            Polling place
          </div>
          <div className="mt-1 font-serif text-sm text-ink-2">
            Polling logistics will appear here.
          </div>
        </div>
      ) : null}

      <footer
        data-testid="ballot-pane-footer"
        className="flex flex-col gap-2 border-t border-rule bg-paper-2 px-5 pb-5 pt-4"
      >
        <button
          type="button"
          data-testid="ballot-pane-print"
          disabled={!canPrint}
          onClick={onPrint}
          // PR C — Print is the "final artifact" CTA, not a "go fetch" CTA.
          // Per prototype.css `.ws-ballot .b-foot button.primary`
          // (lines 1232-1237) the print primary uses INK background +
          // paper text — the artifact treatment, distinct from civic-green
          // which is reserved for fetch / forward-motion CTAs.
          className="flex w-full items-center justify-between rounded-lg border border-ink bg-ink px-4 py-3 text-[14.5px] font-semibold text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:border-rule disabled:bg-rule disabled:text-ink-3"
        >
          {/* NEEDS-KEY: ballotPane.printBallot — EN "Print my ballot (PDF)" / ES "Imprimir mi boleta (PDF)" */}
          <span>Print my ballot (PDF)</span>
          <span aria-hidden="true" className="text-paper">
            →
          </span>
        </button>
        <button
          type="button"
          data-testid="ballot-pane-save-profile"
          onClick={onSaveProfile}
          className="flex w-full items-center justify-between rounded-lg border border-civic bg-paper px-4 py-3 text-[14.5px] font-semibold text-civic hover:bg-civic-soft"
        >
          {/* NEEDS-KEY: ballotPane.saveVotingPlan — EN "Save my voting plan (.txt)" / ES "Guardar mi plan de voto (.txt)" */}
          <span>Save my voting plan (.txt)</span>
          <span aria-hidden="true" className="text-civic">
            ↓
          </span>
        </button>
        {/* Privacy footnote — prototype prototype-views.jsx `.b-foot-note`
            (line 791), sits between the save button and the handoff CTA. */}
        <small
          data-testid="ballot-pane-foot-note"
          className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3"
        >
          {/* NEEDS-KEY: ballotPane.privacyFootnote — EN "Your issues and picks — no personal info collected." / ES "Tus temas y selecciones — no se recopila información personal." */}
          Your issues and picks — no personal info collected.
        </small>
        <button
          type="button"
          data-testid="ballot-pane-handoff"
          onClick={onHandoff}
          className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-[14.5px] font-semibold text-ink-2 hover:text-civic"
        >
          <span>Continue in another chatbot</span>
          <span aria-hidden="true" className="text-ink-3">
            ↗
          </span>
        </button>
      </footer>
    </aside>
  );
}

function groupRacesBySection(
  races: Race[],
): { section: RaceSection; items: Race[] }[] {
  const out: { section: RaceSection; items: Race[] }[] = [];
  for (const race of races) {
    const last = out[out.length - 1];
    if (last && last.section === race.section) {
      last.items.push(race);
    } else {
      out.push({ section: race.section, items: [race] });
    }
  }
  return out;
}
