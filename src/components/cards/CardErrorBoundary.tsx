"use client";

import React from "react";

/* ──────────────────────────────────────────────────────────────
 * CardErrorBoundary — render-isolation primitive for cards
 *
 * Wraps a chart-rendering subtree so that a throw inside one
 * decoration (bars, dots, svg) does not blank the surrounding
 * text content of the candidate / proposition card.
 *
 * Per Phase 4 packet: "Card text content reads top-to-bottom as
 * a clean labeled list. Bars are decoration that may or may not
 * render; their absence does not break layout or comprehension."
 *
 * Use this around any card subtree whose render correctness is
 * decorative — never around the labels / percentages / dollar
 * amounts themselves.
 *
 * The default fallback is an empty <span aria-hidden> so the card
 * layout doesn't shift jarringly when a chart fails. Pass a
 * `fallback` prop to provide custom inline text.
 * ────────────────────────────────────────────────────────────── */

export interface CardErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional fallback rendered in place of the thrown subtree.
   * Defaults to an aria-hidden empty span so the card flow is not
   * disrupted when a decoration fails.
   */
  fallback?: React.ReactNode;
}

interface CardErrorBoundaryState {
  hasError: boolean;
}

export class CardErrorBoundary extends React.Component<
  CardErrorBoundaryProps,
  CardErrorBoundaryState
> {
  constructor(props: CardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): CardErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Surface to logs without crashing; production observability
    // can swap this for a real error reporter later.
    // eslint-disable-next-line no-console
    console.error("[CardErrorBoundary] render failure caught:", error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <span data-testid="card-error-boundary-fallback" aria-hidden="true" />
        )
      );
    }
    return this.props.children;
  }
}
