"use client";

import React from "react";
import type { Race, RaceSection } from "../lib/raceDeriver";

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
                    className={[
                      "grid cursor-default grid-cols-[18px_1fr] gap-3 border-b border-rule-2 py-3.5",
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
                      <div className="mb-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                        {race.label}
                      </div>
                      <div className="font-serif text-base font-semibold tracking-tight">
                        {isDone ? (
                          <>
                            <span className="text-ink">{decision.pick}</span>
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
          // PR B — sentence-case sans CTA. Prototype reserves mono-uppercase
          // for eyebrow / section dividers; primary buttons are sans 14.5px
          // font-weight 600.
          className="flex w-full items-center justify-between rounded-lg border border-civic bg-civic px-4 py-3 text-[14.5px] font-semibold text-paper-2 hover:bg-civic-2 disabled:cursor-not-allowed disabled:border-rule disabled:bg-rule disabled:text-ink-3"
        >
          <span>Print my ballot</span>
          <span aria-hidden="true" className="text-paper-2">
            →
          </span>
        </button>
        <button
          type="button"
          data-testid="ballot-pane-save-profile"
          onClick={onSaveProfile}
          className="flex w-full items-center justify-between rounded-lg border border-civic bg-paper px-4 py-3 text-[14.5px] font-semibold text-civic hover:bg-civic-soft"
        >
          <span>Save my profile</span>
          <span aria-hidden="true" className="text-civic">
            ↓
          </span>
        </button>
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
