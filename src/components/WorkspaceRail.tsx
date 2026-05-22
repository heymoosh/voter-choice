"use client";

import React from "react";
import type { Race, RaceSection } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";
import { WorkspacePolisSection } from "./WorkspacePolisSection";

export interface WorkspaceRailProps {
  decidedCount: number;
  totalRaces: number;
  themes: Theme[];
  races: Race[];
  activeRaceId: string | null;
  onSelectRace: (raceId: string) => void;
  /**
   * Phase 6 hooks here. Phase 3 wires this to drop back to the cold-open in
   * amend mode (set `themesLockedIn` to null upstream).
   */
  onEditThemes: () => void;
  onRestart: () => void;
  /**
   * Fix E (post-Phase 8) — Polis surface is now workspace-resident
   * (used to live inside HandoffPackage). Threaded through here so
   * `<WorkspacePolisSection>` can render between priorities and the
   * race list as a collapsible opt-in card. Optional: when county
   * is falsy or themes is empty, the section hides itself.
   */
  stateCode?: string;
  county?: string;
  countyName?: string;
}

/**
 * WorkspaceRail — left pane of the 3-pane workspace. Pure presentational.
 *
 * Responsibilities:
 *  - Progress block (N / M decided + percentage + a progress bar)
 *  - Locked priorities list with an "Edit themes" link
 *  - Grouped race list (Federal / State / Propositions / Local)
 *  - Footer: Restart / Methodology / Get help
 *
 * Owns no state. The active-race highlight and decided/undecided indicators
 * are driven entirely by props.
 */
export function WorkspaceRail({
  decidedCount,
  totalRaces,
  themes,
  races,
  activeRaceId,
  onSelectRace,
  onEditThemes,
  onRestart,
  stateCode,
  county,
  countyName,
}: WorkspaceRailProps) {
  const percent =
    totalRaces > 0 ? Math.round((decidedCount / totalRaces) * 100) : 0;

  // Group races by section while preserving the deriver's order.
  const grouped = groupRacesBySection(races);

  return (
    <nav
      data-testid="workspace-rail"
      aria-label="Workspace navigation"
      className="flex h-full flex-col gap-6 overflow-y-auto border-r border-outline-variant/30 bg-surface-lowest p-4 text-on-surface"
    >
      {/* Progress block */}
      <section
        data-testid="workspace-rail-progress"
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-on-surface-muted">
          <span>Progress</span>
          <span>
            {decidedCount} / {totalRaces}
          </span>
        </div>
        <div className="text-2xl font-black text-on-surface">
          {percent}% decided
        </div>
        <div
          role="progressbar"
          aria-valuenow={decidedCount}
          aria-valuemin={0}
          aria-valuemax={totalRaces}
          aria-label="Ballot progress"
          className="h-1.5 w-full overflow-hidden bg-surface-low"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      {/* Priorities */}
      <section
        data-testid="workspace-rail-priorities"
        className="flex flex-col gap-2"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
            Your priorities
          </span>
          <button
            type="button"
            data-testid="workspace-rail-edit-themes"
            onClick={onEditThemes}
            className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <ol className="flex flex-col gap-1 text-sm">
          {themes.map((t, i) => (
            <li
              key={`${i}-${t.name}`}
              data-testid={`workspace-rail-theme-${i}`}
              className="flex items-baseline gap-2"
            >
              <span className="text-on-surface-muted">{i + 1}.</span>
              <span>{t.name}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Fix E — Polis section. Mounts between priorities and races; closed
          by default; auto-hides when county or themes are missing. Themes
          map to {id, label} using a slug of the user-named theme so the
          PolisOverlay props are happy without coupling to canonical ids
          (the bars query just omits userConcerns when ids don't match
          canonical issues — empty/below-threshold copy carries the case). */}
      {stateCode && county && themes.length > 0 && (
        <WorkspacePolisSection
          stateCode={stateCode}
          county={county}
          countyName={countyName ?? county}
          userThemes={themes.map((t) => ({
            id: slugifyThemeName(t.name),
            label: t.name,
          }))}
        />
      )}

      {/* Race list (grouped) */}
      {grouped.map(({ section, items }) => (
        <section
          key={section}
          data-testid={`workspace-rail-section-${section}`}
          className="flex flex-col gap-1"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-on-surface-muted">
            {section}
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.map((race) => {
              const isActive = race.id === activeRaceId;
              return (
                <li key={race.id}>
                  <button
                    type="button"
                    data-testid={`workspace-rail-race-${race.id}`}
                    aria-current={isActive ? "page" : undefined}
                    data-decided={race.decided ? "true" : "false"}
                    onClick={() => onSelectRace(race.id)}
                    className={[
                      "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm",
                      isActive
                        ? "bg-primary/10 font-bold text-on-surface"
                        : "text-on-surface hover:bg-surface-low",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={
                        race.decided
                          ? "text-primary"
                          : "text-on-surface-muted/40"
                      }
                    >
                      {race.decided ? "✓" : "○"}
                    </span>
                    <span className="flex-1 truncate">{race.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Footer */}
      <footer
        data-testid="workspace-rail-footer"
        className="mt-auto flex flex-col gap-1 border-t border-outline-variant/30 pt-3 text-xs"
      >
        <button
          type="button"
          data-testid="workspace-rail-restart"
          onClick={onRestart}
          className="text-left font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary"
        >
          Restart session
        </button>
        <a
          data-testid="workspace-rail-methodology"
          href="/methodology"
          className="font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary"
        >
          Methodology
        </a>
        <a
          data-testid="workspace-rail-help"
          href="mailto:help@voterchoice.org"
          className="font-bold uppercase tracking-widest text-on-surface-muted hover:text-primary"
        >
          Get help
        </a>
      </footer>
    </nav>
  );
}

/**
 * Slugify a user-named theme into a stable id for the PolisOverlay
 * userThemes prop. Bars overlap is keyed by canonical issue id —
 * user-named themes rarely match those, so the bars panel typically
 * falls back to its honest "just getting started" copy. That's
 * acceptable: the bridges + compass surfaces don't depend on per-
 * theme overlap and still render meaningful data. When PR 6 wires
 * a canonical-id resolver into the workspace shell, this slug can
 * be replaced with the real id (or dropped — empty `userThemes` ids
 * is supported by /api/polis/bars too).
 */
function slugifyThemeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function groupRacesBySection(
  races: Race[],
): { section: RaceSection; items: Race[] }[] {
  // The deriver already orders Federal → State → Propositions → Local; we
  // simply collapse the consecutive runs into section groups while preserving
  // the inbound order.
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
