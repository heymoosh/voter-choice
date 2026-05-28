"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Decision } from "./BallotPane";
import type { Race, RaceSection } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";
import { normalizeCandidateName } from "../lib/normalizeCandidateName";

/**
 * Format an ISO date string ("2026-06-02") in a human-readable short
 * form ("Jun 2, 2026"). Anchored to local midnight so the timezone
 * offset doesn't kick us back a day on the west coast.
 */
function formatBallotDate(iso: string): string {
  if (typeof iso !== "string" || iso.length === 0) return "";
  // Cheap ISO heuristic: strict YYYY-MM-DD passes through `new Date(iso
  // + "T00:00:00")`; anything else falls back to whatever Date can
  // parse so we don't crash on legacy / API-side surprises.
  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso;
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * PrintBallot — Phase 7 printable artifact.
 *
 * One-page US-Letter ballot rendered via the browser's `window.print()`. No
 * external PDF library is shipped — the print dialog handles save-as-PDF.
 *
 * Design constraints (per .ai/work-packets/redesign-phase-7-printable-pdf.md):
 *  - One page hard cap. Overflow → inline trim-prompt, print disabled.
 *  - No color required. Heavy ink, monochrome-readable.
 *  - Polling header at top with explicit fallback when polling data missing.
 *  - Picks grouped by section in workspace order. Verbatim italic why-notes.
 *  - Undecided races in a "Decide at the polls" group at the bottom.
 *  - Themes numbered 1–N at the bottom (names only, no quotes).
 *  - Footer: brand line + "Signed at the booth" signature line.
 *
 * The on-screen "preview" of the print view uses the same `.print-sheet`
 * styling as the printed page (`src/styles/print.css`); the only screen-only
 * additions are the action buttons (carry `.no-print`) and the overflow
 * trim-prompt.
 */

/**
 * Adapter shape consumed by the printable header. The mapping from the
 * upstream Civic `PollingLocation` shape into this contract lives inside
 * WorkspaceShell so PollingLocationCard stays untouched.
 */
export interface PollingDataShape {
  precinct?: string;
  pollingPlaceName?: string;
  pollingPlaceAddress?: string;
  pollingHours?: string;
  whatToBring?: string;
  earlyVotingWindow?: string;
}

export interface PrintBallotProps {
  decisions: Decision[];
  themes: Theme[];
  races: Race[];
  pollingData: PollingDataShape | null;
  cityState: string;
  electionLabel: string;
  electionDate: string;
  onBack: () => void;
  /**
   * PR C — district label for the voter-meta 4-cell grid (e.g. "NJ-1",
   * "TX-7"). Pre-computed by BallotToolClient from races. Falls back to
   * an em-dash when omitted so the cell still renders for layout
   * stability.
   */
  district?: string;
}

/**
 * US-Letter at 96dpi after 0.5in margins ≈ 720 × 960 px.
 *
 * The width bound is enforced by the `.print-sheet` CSS rule
 * (`width: 7.5in`); we only need to verify height fits a single page. The
 * 960px cap is intentionally a conservative threshold — the browser's
 * actual print engine may have slightly different ideas about line height
 * and font metrics, so we trim a little earlier rather than spill to page 2.
 */
const MAX_HEIGHT_PX = 960;

export function PrintBallot({
  decisions,
  themes,
  races,
  pollingData,
  cityState,
  electionLabel,
  electionDate,
  onBack,
  district,
}: PrintBallotProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  // Re-measure whenever the rendered content might change. The browser
  // performs layout after this render commits, so the effect reading
  // scrollHeight here observes the post-layout value.
  useEffect(() => {
    if (!sheetRef.current) return;
    setOverflowing(sheetRef.current.scrollHeight > MAX_HEIGHT_PX);
  }, [decisions, themes, pollingData, cityState, electionLabel, electionDate]);

  // Build the section → decisions index, preserving the workspace race
  // order. Undecided races accumulate into a single "decide at the polls"
  // bucket appended after every decided group.
  const { decidedGroups, undecidedRaces } = useMemo(() => {
    const decisionByRace = new Map<string, Decision>();
    decisions.forEach((d) => decisionByRace.set(d.raceId, d));

    const groups: { section: RaceSection; items: Decision[] }[] = [];
    const undecided: Race[] = [];

    for (const race of races) {
      const decision = decisionByRace.get(race.id);
      if (!decision) {
        undecided.push(race);
        continue;
      }
      const last = groups[groups.length - 1];
      if (last && last.section === race.section) {
        last.items.push(decision);
      } else {
        groups.push({ section: race.section, items: [decision] });
      }
    }

    return { decidedGroups: groups, undecidedRaces: undecided };
  }, [decisions, races]);

  const handlePrint = () => {
    if (overflowing) return;
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div className="print-shell">
      {/* Action bar (screen-only — hidden in print) */}
      <div className="print-actions no-print">
        <button
          type="button"
          data-testid="back-button"
          onClick={onBack}
          className="no-print"
        >
          ← Back to ballot
        </button>
        <button
          type="button"
          data-testid="print-button"
          onClick={handlePrint}
          disabled={overflowing}
          className="no-print"
        >
          Print / Save as PDF
        </button>
        {overflowing ? (
          <div
            data-testid="trim-prompt"
            role="alert"
            className="no-print trim-prompt"
          >
            Your ballot is too long for one page. Edit your why-notes to shorten
            them. Notes longer than ~80 chars are the usual culprit.
            {/* Surface the offending notes with character counts so the user
                can find them without scrolling the whole sheet. */}
            <ul>
              {decisions
                .filter((d) => d.whyNote && d.whyNote.length > 80)
                .map((d) => (
                  <li key={d.raceId}>
                    {d.raceLabel}: {d.whyNote.length} chars
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* The actual printable. Both screen preview AND printed page render
          this same DOM; only `.no-print` chrome is suppressed at print time. */}
      <div ref={sheetRef} data-testid="print-sheet" className="print-sheet">
        {/* Fix 5 — two-column ph-head per prototype-views.jsx lines 514-525
            (`.l` / `.r` split). Left side carries the "My Ballot · <date>"
            serif title with brand subline; right side carries the
            polling-place block (or fallback when polling data is absent). */}
        <header className="ph-head">
          <div className="l">
            <div data-testid="ph-head-title">
              My Ballot &middot; {formatBallotDate(electionDate)}
            </div>
            <small>Voter Choice &middot; voterchoice.app</small>
          </div>
          <div className="r">
            {pollingData ? (
              <div data-testid="polling-header">
                {pollingData.precinct ? (
                  <div className="precinct">
                    <strong>{pollingData.precinct}</strong>
                  </div>
                ) : null}
                {pollingData.pollingPlaceName ? (
                  <div className="place-name">
                    {pollingData.pollingPlaceName}
                  </div>
                ) : null}
                {pollingData.pollingPlaceAddress ? (
                  <div className="place-addr">
                    {pollingData.pollingPlaceAddress}
                  </div>
                ) : null}
                {pollingData.pollingHours ? (
                  <div className="hours">
                    Election Day hours: {pollingData.pollingHours}
                  </div>
                ) : null}
                {pollingData.whatToBring ? (
                  <div className="bring">Bring: {pollingData.whatToBring}</div>
                ) : null}
                {pollingData.earlyVotingWindow ? (
                  <div className="early">
                    Early voting: {pollingData.earlyVotingWindow}
                  </div>
                ) : null}
              </div>
            ) : (
              <div data-testid="polling-fallback">
                Polling place not available — bring your ID and check sosgov.{" "}
                <a
                  href="https://www.usa.gov/election-office"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find your local election office
                </a>
                .
              </div>
            )}
          </div>
        </header>

        {/* PR C — 4-cell voter-meta grid per prototype-views.jsx PrintView
            lines 527-532 (`<div className="voter-meta">` with four
            `.cell.k/.v` pairs). The previous 3-line layout dropped
            district + bring + early-voting info onto the page header
            instead, which conflated polling-place chrome with voter
            context. The four cells are queryable by their k labels:
            Address / District / Bring / Early voting. */}
        <div className="voter-meta">
          <div className="cell">
            <div className="k">Address</div>
            <div className="v">{cityState}</div>
          </div>
          <div className="cell">
            <div className="k">District</div>
            <div className="v">{district ?? "—"}</div>
          </div>
          <div className="cell">
            <div className="k">Bring</div>
            <div className="v">{pollingData?.whatToBring ?? "ID"}</div>
          </div>
          <div className="cell">
            <div className="k">Early voting</div>
            <div className="v">{pollingData?.earlyVotingWindow ?? "—"}</div>
          </div>
        </div>
        {/* Election context line — preserved beneath the meta grid so
            the page still shows label + date. Mono micro-label, not
            another cell. Date formatted human-readable per Fix 6. */}
        <div className="election-meta">
          {electionLabel} · {formatBallotDate(electionDate)}
        </div>

        <div className="ballot-list">
          {decidedGroups.map((group) => (
            <div
              key={group.section}
              className="ballot-group"
              data-testid={`ballot-group-${group.section}`}
            >
              <h3>{group.section}</h3>
              {group.items.map((decision) => {
                const isProposition = decision.section === "Propositions";
                return (
                  <div
                    key={decision.raceId}
                    className="pick-row"
                    data-testid={`pick-row-${decision.raceId}`}
                  >
                    <div className="pick-line">
                      <span className="race-label">{decision.raceLabel}</span>
                      <span className="sep">·</span>
                      <span className="pick-name">
                        {normalizeCandidateName(decision.pick)}
                      </span>
                      {!isProposition && decision.party ? (
                        <>
                          <span className="sep">·</span>
                          <span
                            className="party-tag"
                            data-testid={`party-tag-${decision.raceId}`}
                          >
                            {decision.party}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {decision.whyNote ? (
                      <div
                        className="why-note"
                        style={{ fontStyle: "italic" }}
                        data-testid={`why-note-${decision.raceId}`}
                      >
                        {decision.whyNote}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}

          {undecidedRaces.length > 0 ? (
            <div
              className="ballot-group decide-at-polls"
              data-testid="ballot-group-decide-at-polls"
            >
              <h3>Decide at the polls</h3>
              <div data-testid="decide-at-polls-group">
                {undecidedRaces.map((race) => (
                  <div key={race.id} className="undecided-row">
                    {race.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {themes.length > 0 ? (
          <section className="themes-section">
            <h3>Themes you voted on</h3>
            {/* Explicit "1./2./3." numerals inside each <li> rather than
                relying solely on CSS-generated list markers — print engines
                occasionally drop markers, and the structural greyscale test
                wants the rank queryable as text. We hide the default marker
                via `list-style: none` in print.css so the explicit number
                doesn't double up. */}
            <ol className="themes-list" data-testid="themes-list">
              {themes.map((theme, i) => (
                <li key={`${i}-${theme.name}`}>
                  {i + 1}. {theme.name}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <footer className="print-foot">
          <div className="brand">
            Built with Voter Choice · Free · non-partisan · voterchoice.app
          </div>
          <div className="signature-line">
            Signed at the booth: ________________________________
          </div>
        </footer>
      </div>
    </div>
  );
}
