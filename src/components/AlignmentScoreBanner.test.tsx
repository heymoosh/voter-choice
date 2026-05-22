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

  it("renders the issue label for each score (full label surfaced via title= when truncated)", () => {
    renderBanner(multiScoreEntry);
    // "Healthcare Access" (17 chars) renders in full.
    expect(screen.getByText("Healthcare Access")).toBeInTheDocument();
    // "Public Education Funding" (24 chars) > 18 → visible text is truncated
    // with ellipsis; full label always lives in the title attribute so
    // tooltips + screen readers still surface it.
    const eduLabel = screen.getByTestId("alignment-score-label-education");
    expect(eduLabel.getAttribute("title")).toBe("Public Education Funding");
    expect(eduLabel.textContent).toMatch(/…/);
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

describe("AlignmentScoreBanner — aria-label accessibility", () => {
  it("wrapper element carries aria-label containing the candidateLabel", () => {
    renderBanner(multiScoreEntry, { candidateLabel: "Candidate B" });
    expect(
      screen.getByLabelText("Alignment scores for Candidate B"),
    ).toBeInTheDocument();
  });

  it("unavailable state wrapper also carries aria-label containing the candidateLabel", () => {
    renderBanner(unavailableEntry, { candidateLabel: "Candidate C" });
    expect(
      screen.getByLabelText("Alignment scores for Candidate C"),
    ).toBeInTheDocument();
  });
});

/* ──────────────────────────────────────────────────────────────
 * Phase 4 — text-first card additions
 *
 * The card's labels and percentages are load-bearing; bars are
 * decoration. The following tests assert each text-first contract
 * the Phase 4 redesign introduces.
 * ────────────────────────────────────────────────────────────── */

describe("AlignmentScoreBanner — phase 4 percentage display", () => {
  it("renders a kept/total percentage alongside the N-of-M ratio", () => {
    renderBanner(multiScoreEntry);
    // healthcare: kept=7, total=10 → 70%
    const healthcareCard = screen.getByTestId(
      "alignment-score-card-healthcare",
    );
    expect(healthcareCard.textContent).toMatch(/70%/);
    // education: kept=3, total=8 → 38%
    const educationCard = screen.getByTestId("alignment-score-card-education");
    expect(educationCard.textContent).toMatch(/38%/);
  });

  it("each percentage is queryable as text (load-bearing, not decoration)", () => {
    renderBanner(multiScoreEntry);
    // Even with bars hidden / no chart rendered, the percentage reads.
    const healthcareCard = screen.getByTestId(
      "alignment-score-card-healthcare",
    );
    const pctEl = healthcareCard.querySelector(
      '[data-testid="alignment-score-percentage-healthcare"]',
    );
    expect(pctEl).not.toBeNull();
    expect(pctEl?.textContent).toMatch(/70%/);
  });
});

describe("AlignmentScoreBanner — phase 4 partial / unknown scores", () => {
  it("renders an em-dash (—) and no bar for a score with missing kept/total", () => {
    // A score row with undefined kept/total (type allows it) — the
    // partial-alignment case. Render should show "—" instead of "0%".
    const partialEntry: AlignmentScoresEntry = {
      candidateId: "cand-partial",
      scores: [
        {
          canonicalIssue: "housing",
          issueLabel: "Housing",
          resolvedStance: "expand affordable housing",
          // kept and total intentionally undefined to simulate partial data
          contributingVotes: [],
        } as AlignmentScoresEntry["scores"] extends Array<infer S> | null
          ? S
          : never,
      ],
    };
    renderBanner(partialEntry);
    const housingCard = screen.getByTestId("alignment-score-card-housing");
    // Should contain literal em-dash for the missing value.
    expect(housingCard.textContent).toMatch(/—/);
    // Should NOT contain a fake "0%" for the missing value.
    expect(housingCard.textContent).not.toMatch(/0%/);
    // No bar/dots element for this row.
    const ratio = housingCard.querySelector(
      '[data-testid="alignment-score-ratio-housing"]',
    );
    expect(ratio).toBeNull();
  });
});

describe("AlignmentScoreBanner — phase 4 no-record explicit notice", () => {
  it("renders the first-time-candidate hint on the unavailable state", () => {
    renderBanner(unavailableEntry, { candidateLabel: "Candidate C" });
    // The packet copy mandates an explicit "judge on policy statements
    // and donor base instead" hint for first-time candidates.
    expect(
      screen.getByText(/judge on policy statements and donor base instead/i),
    ).toBeInTheDocument();
  });

  it("does NOT render an empty chart frame (no svg) for the no-record state", () => {
    const { container } = render(
      <LanguageProvider>
        <AlignmentScoreBanner
          entry={unavailableEntry}
          candidateLabel="Candidate C"
          onDrillDown={vi.fn()}
        />
      </LanguageProvider>,
    );
    // No svg, no dot-bar — text only.
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("AlignmentScoreBanner — phase 4 long-name truncation", () => {
  const longNameEntry: AlignmentScoresEntry = {
    candidateId: "cand-long",
    scores: [
      {
        canonicalIssue: "criminal_justice_reform_and_decarceration",
        issueLabel:
          "Criminal Justice Reform and Decarceration Policy Initiative",
        resolvedStance: "reduce mass incarceration",
        kept: 4,
        total: 9,
        contributingVotes: [],
      },
    ],
  };

  it("truncates label > 18 chars with an ellipsis", () => {
    renderBanner(longNameEntry);
    const card = screen.getByTestId(
      "alignment-score-card-criminal_justice_reform_and_decarceration",
    );
    const label = card.querySelector(
      '[data-testid="alignment-score-label-criminal_justice_reform_and_decarceration"]',
    );
    expect(label).not.toBeNull();
    // Visible text contains an ellipsis (… U+2026)
    expect(label?.textContent).toMatch(/…/);
    // Visible text is shorter than the full label
    expect(label?.textContent?.length ?? 0).toBeLessThan(
      "Criminal Justice Reform and Decarceration Policy Initiative".length,
    );
  });

  it("full label is surfaced via title attribute when truncated", () => {
    renderBanner(longNameEntry);
    const card = screen.getByTestId(
      "alignment-score-card-criminal_justice_reform_and_decarceration",
    );
    const label = card.querySelector(
      '[data-testid="alignment-score-label-criminal_justice_reform_and_decarceration"]',
    );
    expect(label?.getAttribute("title")).toBe(
      "Criminal Justice Reform and Decarceration Policy Initiative",
    );
  });
});

describe("AlignmentScoreBanner — phase 4 greyscale comprehension", () => {
  it("issue labels + percentages remain queryable by text under greyscale filter", () => {
    const { container } = render(
      <LanguageProvider>
        <div style={{ filter: "grayscale(1)" }}>
          <AlignmentScoreBanner
            entry={multiScoreEntry}
            candidateLabel="Candidate A"
            onDrillDown={vi.fn()}
          />
        </div>
      </LanguageProvider>,
    );
    // Healthcare Access (≤18 chars) renders in full.
    expect(screen.getByText("Healthcare Access")).toBeInTheDocument();
    // Long label is truncated for layout but the full name remains
    // accessible via the title attribute regardless of color.
    const eduLabel = screen.getByTestId("alignment-score-label-education");
    expect(eduLabel.getAttribute("title")).toBe("Public Education Funding");
    // Percentages remain readable.
    expect(container.textContent).toMatch(/70%/);
    expect(container.textContent).toMatch(/38%/);
  });
});
