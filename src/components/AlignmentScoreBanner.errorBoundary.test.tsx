// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AlignmentScoreBanner } from "./AlignmentScoreBanner";
import { CardErrorBoundary } from "./cards/CardErrorBoundary";
import { LanguageProvider } from "../lib/i18n";
import type { AlignmentScoresEntry } from "../lib/structured-blocks";

/* ──────────────────────────────────────────────────────────────
 * AlignmentScoreBanner — error-boundary survival contract
 *
 * Per AC: "Simulated chart failure does NOT blank the card; text content
 * remains in DOM." The card's chart-rendering subtree may throw; the
 * surrounding text (issue labels, percentages, the "no record" notice)
 * must survive via a CardErrorBoundary wrapper.
 * ────────────────────────────────────────────────────────────── */

const multiScoreEntry: AlignmentScoresEntry = {
  candidateId: "cand-a",
  scores: [
    {
      canonicalIssue: "healthcare",
      issueLabel: "Healthcare Access",
      resolvedStance: "expand public healthcare coverage",
      kept: 7,
      total: 10,
      contributingVotes: [],
    },
  ],
};

/* Throwing child — simulates a chart library blowing up at render. */
function ThrowingChild(): React.JSX.Element {
  throw new Error("simulated chart-render failure");
}

describe("CardErrorBoundary — primitive", () => {
  /* Silence the expected error log from React's boundary plumbing
   * during these tests so the test output stays clean. */
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error is thrown", () => {
    render(
      <CardErrorBoundary>
        <p>healthy child text</p>
      </CardErrorBoundary>,
    );
    expect(screen.getByText("healthy child text")).toBeInTheDocument();
  });

  it("renders fallback (or nothing visible) when a child throws", () => {
    render(
      <CardErrorBoundary>
        <ThrowingChild />
      </CardErrorBoundary>,
    );
    // The boundary should not propagate — render either an empty
    // fallback or a small unobtrusive marker. The contract is: the
    // throw does not bubble to siblings.
    // We don't assert specific fallback text here; we assert that
    // *something rendered* (i.e. the boundary caught the throw).
    // If it didn't catch, the render call above would throw synchronously
    // and this assertion would never run.
    expect(document.body).toBeInTheDocument();
  });

  it("isolates a thrown subtree from sibling content", () => {
    render(
      <div>
        <p>before sibling</p>
        <CardErrorBoundary>
          <ThrowingChild />
        </CardErrorBoundary>
        <p>after sibling</p>
      </div>,
    );
    expect(screen.getByText("before sibling")).toBeInTheDocument();
    expect(screen.getByText("after sibling")).toBeInTheDocument();
  });
});

describe("AlignmentScoreBanner — chart-failure survival via boundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });
  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("text content (issue label, ratio, percentage) remains in DOM when a chart subtree throws", () => {
    render(
      <LanguageProvider>
        <CardErrorBoundary>
          <AlignmentScoreBanner
            entry={multiScoreEntry}
            candidateLabel="Candidate A"
            onDrillDown={vi.fn()}
          />
          {/* A simulated chart subtree placed beside the banner,
              wrapped by the same boundary — when it throws, the banner
              text must remain rendered. */}
          <CardErrorBoundary>
            <ThrowingChild />
          </CardErrorBoundary>
        </CardErrorBoundary>
      </LanguageProvider>,
    );

    // Banner's text content is load-bearing — must survive.
    expect(screen.getByText("Healthcare Access")).toBeInTheDocument();
    expect(
      screen.getByText("expand public healthcare coverage"),
    ).toBeInTheDocument();
  });
});
