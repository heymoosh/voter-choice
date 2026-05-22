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
      className="flex h-full flex-col overflow-y-auto border-l border-outline-variant/30 bg-surface-lowest text-on-surface"
    >
      <header
        data-testid="ballot-pane-header"
        className="border-b border-outline-variant/30 p-4"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="font-black text-lg tracking-tight">Your ballot</h3>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
            {decidedCount}/{totalRaces} · Draft
          </span>
        </div>
        <address
          data-testid="ballot-pane-address"
          className="mt-1 not-italic text-xs text-on-surface-muted"
        >
          {cityState || "—"}
        </address>
      </header>

      <div
        data-testid="ballot-pane-list"
        className="flex-1 overflow-y-auto p-4"
      >
        {grouped.map(({ section, items }) => (
          <section key={section} className="mb-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-on-surface-muted">
              {section}
            </div>
            <ul className="flex flex-col gap-2">
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
                      "border-l-4 pl-3 py-1",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-transparent",
                    ].join(" ")}
                  >
                    <div className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
                      {race.label}
                    </div>
                    <div className="text-sm text-on-surface">
                      {isDone ? (
                        <>
                          <span className="font-bold">{decision.pick}</span>
                          {decision.party ? (
                            <span className="text-on-surface-muted">
                              {" "}
                              ({decision.party})
                            </span>
                          ) : null}
                        </>
                      ) : isActive ? (
                        <span className="text-on-surface-muted">
                          Deciding now…
                        </span>
                      ) : (
                        <span className="text-on-surface-muted/70">
                          Not yet decided
                        </span>
                      )}
                    </div>
                    {decision && decision.whyNote ? (
                      <div
                        data-testid={`ballot-pane-why-${race.id}`}
                        style={{ fontStyle: "italic" }}
                        className="mt-1 text-xs text-on-surface-muted"
                      >
                        &ldquo;{decision.whyNote}&rdquo;
                      </div>
                    ) : null}
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
          className="border-t border-outline-variant/30 p-4 text-xs text-on-surface-muted"
        >
          {/*
            Placeholder per packet §22. Phase 7 surfaces real polling content
            (precinct address, hours, what to bring). For Phase 3 this slot
            simply reserves the space so the layout doesn't shift when the
            content lands.
          */}
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
            Polling place
          </div>
          <div className="mt-1">Polling logistics will appear here.</div>
        </div>
      ) : null}

      <footer
        data-testid="ballot-pane-footer"
        className="flex flex-col gap-2 border-t border-outline-variant/30 p-4"
      >
        <button
          type="button"
          data-testid="ballot-pane-print"
          disabled={!canPrint}
          onClick={onPrint}
          className="bg-primary py-2 text-sm font-bold uppercase tracking-widest text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Print my ballot (PDF)
        </button>
        <button
          type="button"
          data-testid="ballot-pane-save-profile"
          onClick={onSaveProfile}
          className="border border-outline-variant/40 py-2 text-sm font-bold uppercase tracking-widest text-on-surface hover:bg-surface-low"
        >
          Save my profile (.txt)
        </button>
        <button
          type="button"
          data-testid="ballot-pane-handoff"
          onClick={onHandoff}
          className="border border-outline-variant/40 py-2 text-sm font-bold uppercase tracking-widest text-on-surface hover:bg-surface-low"
        >
          Continue in another chatbot
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
