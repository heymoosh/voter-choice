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
      className="flex h-full flex-col gap-4 overflow-y-auto border-r border-rule-2 bg-paper-2 p-4 text-ink"
    >
      {/* Progress block — paper card with rule border, serif headline number */}
      <section
        data-testid="workspace-rail-progress"
        className="flex flex-col gap-2 rounded-lg border border-rule bg-paper p-3.5"
      >
        <div className="flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
          <span>Progress</span>
          <span>
            {decidedCount} / {totalRaces}
          </span>
        </div>
        <div className="font-serif text-2xl font-semibold tracking-tight text-ink">
          {percent}% decided
        </div>
        <div
          role="progressbar"
          aria-valuenow={decidedCount}
          aria-valuemin={0}
          aria-valuemax={totalRaces}
          aria-label="Ballot progress"
          className="h-1.5 w-full overflow-hidden rounded-sm bg-rule-2"
        >
          <div
            // PR A2 — civic-green fill matches the prototype's progress bar.
            className="h-full bg-civic transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </section>

      {/* Priorities — paper card with mono label + serif numbered list */}
      <section
        data-testid="workspace-rail-priorities"
        className="flex flex-col gap-1.5 rounded-lg border border-rule bg-paper px-3.5 py-3"
      >
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
            Your priorities
          </span>
          <button
            type="button"
            data-testid="workspace-rail-edit-themes"
            onClick={onEditThemes}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-civic hover:text-civic-2"
          >
            Edit
          </button>
        </div>
        <ol className="ml-4 list-decimal font-serif text-[14px] leading-relaxed text-ink marker:font-semibold marker:text-civic">
          {themes.map((t, i) => (
            <li
              key={`${i}-${t.name}`}
              data-testid={`workspace-rail-theme-${i}`}
              className="pl-1"
            >
              {t.name}
            </li>
          ))}
        </ol>
      </section>

      {/* Fix E + PR 10 — Polis section. Mounts between priorities and races;
          closed by default. PR 10 changes the gate: section now renders
          whenever stateCode + themes are present — national data is always
          available, so a missing county no longer suppresses the section.
          The inner overlay carries the scope toggle (national / county)
          and hides the toggle when countyName is absent. */}
      {stateCode && themes.length > 0 && (
        <WorkspacePolisSection
          stateCode={stateCode}
          county={county ?? null}
          countyName={countyName ?? county ?? undefined}
          userThemes={themes.map((t) => ({
            id: slugifyThemeName(t.name),
            label: t.name,
          }))}
        />
      )}

      {/* Race list (grouped) — mono section label, circle indicators with
          rule (undecided) / civic (active or decided) tinting */}
      {grouped.map(({ section, items }) => (
        <section
          key={section}
          data-testid={`workspace-rail-section-${section}`}
          className="flex flex-col gap-0.5"
        >
          <div className="mx-2 mb-1 mt-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            {section}
          </div>
          <ul className="flex flex-col gap-px">
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
                      "grid w-full grid-cols-[18px_1fr] items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px]",
                      isActive
                        ? "border-l-2 border-l-civic bg-civic-soft font-medium text-ink"
                        : "text-ink-2 hover:bg-paper",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "relative inline-block h-3.5 w-3.5 rounded-full border-[1.5px]",
                        race.decided
                          ? "border-civic bg-civic after:absolute after:left-[3px] after:top-[5px] after:h-[3px] after:w-[6px] after:-rotate-45 after:border-b-[1.6px] after:border-l-[1.6px] after:border-paper-2 after:content-['']"
                          : isActive
                            ? "border-civic bg-civic shadow-[inset_0_0_0_3px_var(--paper)]"
                            : "border-rule",
                      ].join(" ")}
                    />
                    <span className="truncate">{race.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Footer — mono uppercase ink-3 links, civic on hover, dashed top rule */}
      <footer
        data-testid="workspace-rail-footer"
        className="mt-auto flex flex-col gap-1.5 border-t border-dashed border-rule pt-4 font-mono text-[10.5px] uppercase tracking-[0.12em]"
      >
        <button
          type="button"
          data-testid="workspace-rail-restart"
          onClick={onRestart}
          className="text-left text-ink-3 hover:text-civic"
        >
          Restart session
        </button>
        <a
          data-testid="workspace-rail-methodology"
          href="/methodology"
          className="text-ink-3 hover:text-civic"
        >
          Methodology
        </a>
        <a
          data-testid="workspace-rail-help"
          href="mailto:help@voterchoice.org"
          className="text-ink-3 hover:text-civic"
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
