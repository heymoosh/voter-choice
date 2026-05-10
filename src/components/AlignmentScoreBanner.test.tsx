// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AlignmentScoreBanner } from "./AlignmentScoreBanner";
import { LanguageProvider } from "../lib/i18n";
import type { AlignmentScoresEntry } from "../lib/structured-blocks";

/* ── Fixtures ─────────────────────────────────────────────── */

const multiScoreEntry: AlignmentScoresEntry = {
  candidateId: "cand-a",
  scores: [
    {
      canonicalIssue: "healthcare",
      issueLabel: "Healthcare Access",
      resolvedStance: "expand public healthcare coverage",
      kept: 7,
      total: 10,
      contributingVotes: [
        {
          billTitle: "HB 100 — Medicaid Expansion Act",
          voteCast: "with",
          date: "2022-03-15",
          source: {
            name: "Vote Smart",
            url: "https://votesmart.org/example",
          },
        },
      ],
    },
    {
      canonicalIssue: "education",
      issueLabel: "Public Education Funding",
      resolvedStance: "increase K-12 funding",
      kept: 3,
      total: 8,
      contributingVotes: [],
    },
  ],
};

const thinRecordEntry: AlignmentScoresEntry = {
  candidateId: "cand-b",
  scores: [
    {
      canonicalIssue: "environment",
      issueLabel: "Environment",
      resolvedStance: "protect state parks",
      kept: 2,
      total: 4, // < 5 → thin record
      contributingVotes: [],
    },
  ],
};

const unavailableEntry: AlignmentScoresEntry = {
  candidateId: "cand-c",
  scores: null,
  unavailable: { reason: "no Key Votes data for this office" },
};

const nullNoUnavailableEntry: AlignmentScoresEntry = {
  candidateId: "cand-d",
  scores: null,
  // no unavailable — defensive case
};

/* ── Helpers ──────────────────────────────────────────────── */

function renderBanner(
  entry: AlignmentScoresEntry,
  props: Partial<React.ComponentProps<typeof AlignmentScoreBanner>> = {},
) {
  const onDrillDown = vi.fn();
  render(
    <LanguageProvider>
      <AlignmentScoreBanner
        entry={entry}
        candidateLabel="Candidate A"
        onDrillDown={onDrillDown}
        {...props}
      />
    </LanguageProvider>,
  );
  return { onDrillDown };
}

/* ── Tests ────────────────────────────────────────────────── */

describe("AlignmentScoreBanner — multi-score entry", () => {
  it("renders all scores from a multi-score entry", () => {
    renderBanner(multiScoreEntry);
    expect(
      screen.getByTestId("alignment-score-card-healthcare"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("alignment-score-card-education"),
    ).toBeInTheDocument();
  });

  it("renders the issue label for each score", () => {
    renderBanner(multiScoreEntry);
    expect(screen.getByText("Healthcare Access")).toBeInTheDocument();
    expect(screen.getByText("Public Education Funding")).toBeInTheDocument();
  });

  it("renders the resolved stance for each score", () => {
    renderBanner(multiScoreEntry);
    expect(
      screen.getByText("expand public healthcare coverage"),
    ).toBeInTheDocument();
    expect(screen.getByText("increase K-12 funding")).toBeInTheDocument();
  });

  it("renders the N of M vote ratio for each score", () => {
    renderBanner(multiScoreEntry);
    expect(
      screen.getByTestId("alignment-score-ratio-healthcare"),
    ).toHaveTextContent("7 of 10 votes");
    expect(
      screen.getByTestId("alignment-score-ratio-education"),
    ).toHaveTextContent("3 of 8 votes");
  });

  it("tapping a score calls onDrillDown with canonicalIssue", () => {
    const { onDrillDown } = renderBanner(multiScoreEntry);
    fireEvent.click(screen.getByTestId("alignment-score-card-healthcare"));
    expect(onDrillDown).toHaveBeenCalledWith("healthcare");
  });

  it("tapping the second score calls onDrillDown with its canonicalIssue", () => {
    const { onDrillDown } = renderBanner(multiScoreEntry);
    fireEvent.click(screen.getByTestId("alignment-score-card-education"));
    expect(onDrillDown).toHaveBeenCalledWith("education");
  });

  it("highlights the expanded score card when expandedIssue matches", () => {
    renderBanner(multiScoreEntry, { expandedIssue: "healthcare" });
    // aria-pressed should be true for the expanded card
    expect(
      screen.getByTestId("alignment-score-card-healthcare"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByTestId("alignment-score-card-education"),
    ).toHaveAttribute("aria-pressed", "false");
  });
});

describe("AlignmentScoreBanner — thin record", () => {
  it("renders thin-record caption when total < 5", () => {
    renderBanner(thinRecordEntry);
    expect(
      screen.getByTestId("alignment-score-thin-record-environment"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("alignment-score-thin-record-environment"),
    ).toHaveTextContent("Based on 4 votes");
  });

  it("does not render thin-record caption when total >= 5", () => {
    renderBanner(multiScoreEntry);
    expect(
      screen.queryByTestId("alignment-score-thin-record-healthcare"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("alignment-score-thin-record-education"),
    ).not.toBeInTheDocument();
  });

  it("thin-record caption uses singular 'vote' when total === 1", () => {
    const singleVoteEntry: AlignmentScoresEntry = {
      candidateId: "cand-x",
      scores: [
        {
          canonicalIssue: "environment",
          issueLabel: "Environment",
          resolvedStance: "protect state parks",
          kept: 1,
          total: 1,
          contributingVotes: [],
        },
      ],
    };
    renderBanner(singleVoteEntry);
    expect(
      screen.getByTestId("alignment-score-thin-record-environment"),
    ).toHaveTextContent("Based on 1 vote");
  });
});

describe("AlignmentScoreBanner — unavailable state", () => {
  it("renders the unavailable empty state with the reason", () => {
    renderBanner(unavailableEntry);
    expect(
      screen.getByTestId("alignment-score-unavailable-cand-c"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no Key Votes data for this office/),
    ).toBeInTheDocument();
  });

  it("renders the unavailablePrefix text", () => {
    renderBanner(unavailableEntry);
    expect(screen.getByText(/Voting record not available/)).toBeInTheDocument();
  });

  it("renders nothing when scores is null and unavailable is absent", () => {
    const { container } = render(
      <LanguageProvider>
        <AlignmentScoreBanner
          entry={nullNoUnavailableEntry}
          candidateLabel="Candidate D"
          onDrillDown={vi.fn()}
        />
      </LanguageProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("AlignmentScoreBanner — banner heading", () => {
  it("renders the section heading", () => {
    renderBanner(multiScoreEntry);
    expect(screen.getByText("Voted with you on...")).toBeInTheDocument();
  });
});
