"use client";

/* ──────────────────────────────────────────────────────────────
 * WorkspacePolisSection — collapsible host for PolisOverlay inside
 * the workspace rail. Per the Phase 8 packet rule (§41):
 *
 *   "The Polis view is opt-in or post-decision: it surfaces after the
 *    user has decided enough to have meaningful priorities/agreements.
 *    Doesn't compete with workspace focus."
 *
 * Mount contract:
 *   - Renders the closed shell ONLY when county + userThemes are
 *     both non-empty.
 *   - Closed by default. Overlay mounts on expand (conditional
 *     render, not display:none) so the three polis fetches don't
 *     fire until the user signals interest.
 *   - Collapsing unmounts the overlay again. Re-expand triggers
 *     fresh fetches — acceptable; the data shape is small.
 *
 * This lives in WorkspaceRail (below priorities, above the race
 * list). Previously PolisOverlay was nested inside HandoffPackage,
 * so voters never saw the county overlap until they ran out of
 * budget. Per UX feedback: "Polis should always display as long
 * as we have enough information."
 * ────────────────────────────────────────────────────────────── */

import React, { useState } from "react";
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
  const [expanded, setExpanded] = useState(false);

  // Gate: render NOTHING if we lack the inputs to honor
  // "you're not alone in {county}". A surface saying "you're not
  // alone in (nothing)" reads as a bug.
  if (!county || userThemes.length === 0) return null;

  const displayCounty = countyName ?? county;

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
          You&apos;re not alone in {displayCounty}
        </span>
        <span aria-hidden="true" className="text-on-surface-muted">
          {expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div id="workspace-polis-content" className="mt-1">
          <PolisOverlay
            stateCode={stateCode}
            county={county}
            countyName={displayCounty}
            userThemes={userThemes}
          />
        </div>
      )}
    </section>
  );
}
