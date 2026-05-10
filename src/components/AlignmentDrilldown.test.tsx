// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AlignmentDrilldown } from "./AlignmentDrilldown";
import { LanguageProvider } from "../lib/i18n";
import type { AlignmentScore } from "../lib/structured-blocks";

/* ── Fixtures ─────────────────────────────────────────────── */

const scoreWithVotes: AlignmentScore = {
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
    {
      billTitle: "SB 44 — Healthcare Cuts",
      voteCast: "against",
      date: "2023-06-01",
      source: {
        name: "Texas Legislature Online",
        // no url — test source chip without direct URL
      },
    },
    {
      billTitle: "HB 201 — Community Health Centers",
      voteCast: "with",
      date: "2021-09-20",
      source: {
        name: "Ballotpedia",
        url: "https://ballotpedia.org/example",
      },
    },
  ],
};

const scoreNoVotes: AlignmentScore = {
  canonicalIssue: "environment",
  issueLabel: "Environment",
  resolvedStance: "protect state parks",
  kept: 0,
  total: 5,
  contributingVotes: [],
};

/* ── Helpers ──────────────────────────────────────────────── */

function renderDrilldown(
  score: AlignmentScore,
  props: Partial<React.ComponentProps<typeof AlignmentDrilldown>> = {},
) {
  const onClose = vi.fn();
  render(
    <LanguageProvider>
      <AlignmentDrilldown score={score} onClose={onClose} {...props} />
    </LanguageProvider>,
  );
  return { onClose };
}

/* ── Tests ────────────────────────────────────────────────── */

describe("AlignmentDrilldown — vote list", () => {
  it("renders all contributing votes", () => {
    renderDrilldown(scoreWithVotes);
    const voteList = screen.getByTestId("alignment-drilldown-vote-list");
    expect(voteList).toBeInTheDocument();
    // Three votes in the fixture
    expect(screen.getAllByTestId(/^alignment-vote-bill/)).toHaveLength(3);
  });

  it("renders bill title for each vote", () => {
    renderDrilldown(scoreWithVotes);
    expect(
      screen.getByText("HB 100 — Medicaid Expansion Act"),
    ).toBeInTheDocument();
    expect(screen.getByText("SB 44 — Healthcare Cuts")).toBeInTheDocument();
    expect(
      screen.getByText("HB 201 — Community Health Centers"),
    ).toBeInTheDocument();
  });

  it("renders vote cast badge for each vote", () => {
    renderDrilldown(scoreWithVotes);
    const withBadges = screen.getAllByTestId("vote-cast-badge-with");
    const againstBadges = screen.getAllByTestId("vote-cast-badge-against");
    expect(withBadges).toHaveLength(2); // two "with" votes
    expect(againstBadges).toHaveLength(1); // one "against" vote
  });

  it("renders date for each vote", () => {
    renderDrilldown(scoreWithVotes);
    expect(screen.getByText("2022-03-15")).toBeInTheDocument();
    expect(screen.getByText("2023-06-01")).toBeInTheDocument();
    expect(screen.getByText("2021-09-20")).toBeInTheDocument();
  });

  it("renders source chip for each vote", () => {
    renderDrilldown(scoreWithVotes);
    const chips = screen.getAllByTestId("alignment-source-chip");
    expect(chips).toHaveLength(3);
  });

  it("source chip with URL is clickable — renders as <a> with href", () => {
    renderDrilldown(scoreWithVotes);
    // "Vote Smart" has a URL
    const link = screen
      .getAllByTestId("alignment-source-chip")
      .find((el) => el.textContent?.includes("Vote Smart"));
    expect(link).toBeDefined();
    expect(link!.getAttribute("href")).toBe("https://votesmart.org/example");
  });

  it("source chip without URL falls back to a Google search link", () => {
    renderDrilldown(scoreWithVotes);
    // "Texas Legislature Online" has no url → should fall back
    const chip = screen
      .getAllByTestId("alignment-source-chip")
      .find((el) => el.textContent?.includes("Texas Legislature Online"));
    expect(chip).toBeDefined();
    expect(chip!.getAttribute("href")).toMatch(/google\.com\/search\?q=/i);
    expect(chip!.getAttribute("href")).toMatch(/Texas/i);
  });

  it("bill title with URL renders as a link", () => {
    renderDrilldown(scoreWithVotes);
    const links = screen.getAllByTestId("alignment-vote-bill-link");
    // Two votes have URLs (Vote Smart + Ballotpedia)
    expect(links).toHaveLength(2);
  });

  it("bill title without URL renders as plain text", () => {
    renderDrilldown(scoreWithVotes);
    const plain = screen.getAllByTestId("alignment-vote-bill-title");
    // One vote has no URL (Texas Legislature Online)
    expect(plain).toHaveLength(1);
    expect(plain[0]).toHaveTextContent("SB 44 — Healthcare Cuts");
  });

  it("renders empty state message when contributingVotes is empty", () => {
    renderDrilldown(scoreNoVotes);
    expect(
      screen.getByText("No individual votes on record."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("alignment-drilldown-vote-list"),
    ).not.toBeInTheDocument();
  });
});

describe("AlignmentDrilldown — header", () => {
  it("renders the drilldown heading with kept/total/issueLabel", () => {
    renderDrilldown(scoreWithVotes);
    expect(
      screen.getByText("Why 7 of 10 on Healthcare Access?"),
    ).toBeInTheDocument();
  });
});

describe("AlignmentDrilldown — disclaimer", () => {
  it("renders the AI disclaimer at the bottom", () => {
    renderDrilldown(scoreWithVotes);
    const disclaimer = screen.getByTestId("alignment-drilldown-disclaimer");
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveTextContent(
      "AI can make mistakes. Click any source to verify.",
    );
  });
});

describe("AlignmentDrilldown — close button", () => {
  it("renders a close button", () => {
    renderDrilldown(scoreWithVotes);
    expect(screen.getByTestId("alignment-drilldown-close")).toBeInTheDocument();
  });

  it("close button calls onClose when clicked", () => {
    const { onClose } = renderDrilldown(scoreWithVotes);
    fireEvent.click(screen.getByTestId("alignment-drilldown-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AlignmentDrilldown — vote cast styling", () => {
  it("voted-with badge has accessible text", () => {
    renderDrilldown(scoreWithVotes);
    const withBadges = screen.getAllByTestId("vote-cast-badge-with");
    withBadges.forEach((badge) => {
      expect(badge).toHaveTextContent("Voted with");
    });
  });

  it("voted-against badge has accessible text", () => {
    renderDrilldown(scoreWithVotes);
    const againstBadge = screen.getByTestId("vote-cast-badge-against");
    expect(againstBadge).toHaveTextContent("Voted against");
  });
});
