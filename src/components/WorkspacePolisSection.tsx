"use client";

/* ──────────────────────────────────────────────────────────────
 * WorkspacePolisSection — collapsible host for PolisOverlay inside
 * the workspace rail.
 *
 * PR 10 (national-default):
 *  - Heading is generic: "You're not alone" — no county scoping.
 *    The inner PolisOverlay carries the scope toggle (national / county)
 *    and per-scope copy.
 *  - Section renders whenever the user has named themes — national
 *    data is always available, so the section is no longer gated on
 *    county presence. Voters in counties with sparse sessions still
 *    get a useful reading.
 *  - When countyName is absent, the toggle inside the overlay is
 *    hidden — national becomes the only view.
 *
 * Mount contract (PR 10):
 *  - Renders the closed shell ONLY when userThemes is non-empty.
 *  - Closed by default. Overlay mounts on expand (conditional
 *    render, not display:none) so the three polis fetches don't
 *    fire until the user signals interest.
 *  - Collapsing unmounts the overlay again.
 *
 * Phase 8 packet rule (§41):
 *   "The Polis view is opt-in or post-decision: it surfaces after the
 *    user has decided enough to have meaningful priorities/agreements.
 *    Doesn't compete with workspace focus."
 * ────────────────────────────────────────────────────────────── */

import React, { useState } from "react";
import { useLanguage } from "../lib/i18n";
import { translations } from "../lib/translations";
import { PolisOverlay, type UserTheme } from "./PolisOverlay";

export interface WorkspacePolisSectionProps {
  stateCode: string;
  county: string | null | undefined;
  countyName?: string;
  /**
   * Themes the voter has locked. In workspace mode these are the
   * user-named themes (`{name, quotes}`) lifted to `{id, label}`
   * shape by the caller. May be empty — in which case the entire
   * section hides (nothing meaningful to overlap on).
   */
  userThemes: UserTheme[];
}

export function WorkspacePolisSection({
  stateCode,
  county,
  countyName,
  userThemes,
}: WorkspacePolisSectionProps) {
  const { lang } = useLanguage();
  const t = translations[lang].research;
  const [expanded, setExpanded] = useState(false);

  // PR 10 — gate ONLY on userThemes. National data is always available,
  // so a missing county no longer suppresses the section.
  if (userThemes.length === 0) return null;

  return (
    <section
      data-testid="workspace-polis-section"
      aria-labelledby="workspace-polis-heading"
      className="flex flex-col gap-2"
    >
      <button
        type="button"
        data-testid="workspace-polis-toggle"
        aria-expanded={expanded}
        aria-controls="workspace-polis-content"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 border-l-2 border-primary/40 bg-surface-low px-2 py-2 text-left text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface hover:text-primary"
      >
        <span
          id="workspace-polis-heading"
          data-testid="workspace-polis-section-heading"
        >
          {t.polisWorkspaceSectionHeading}
        </span>
        <span aria-hidden="true" className="text-on-surface-muted">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div id="workspace-polis-content" className="mt-1">
          <PolisOverlay
            stateCode={stateCode}
            county={county ?? ""}
            countyName={countyName}
            userThemes={userThemes}
          />
        </div>
      )}
    </section>
  );
}
