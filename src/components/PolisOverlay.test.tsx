// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PolisOverlay } from "./PolisOverlay";
import { LanguageProvider } from "../lib/i18n";
import type { PolisData } from "./PolisOverlay";

/* ── Fixtures ─────────────────────────────────────────────────── */

const baseDots: PolisData["dots"] = [
  { x: 0.1, y: 0.2, primary: "DEM" },
  { x: 0.5, y: 0.6, primary: "REP" },
  { x: 0.9, y: 0.4, primary: "DEM" },
  { x: 0.3, y: 0.8, primary: "REP" },
  { x: 0.7, y: 0.1, primary: "OPEN" },
];

const consensus: PolisData["consensus"] = [
  { canonicalIssue: "healthcare", issueLabel: "Healthcare", percent: 72 },
  { canonicalIssue: "education", issueLabel: "Education", percent: 65 },
  { canonicalIssue: "economy", issueLabel: "Economy", percent: 58 },
  { canonicalIssue: "environment", issueLabel: "Environment", percent: 51 },
  { canonicalIssue: "housing", issueLabel: "Housing", percent: 44 },
  { canonicalIssue: "immigration", issueLabel: "Immigration", percent: 38 }, // 6th — should be excluded
];

const youDot: PolisData["you"] = { x: 0.45, y: 0.55 };

const lockedData: PolisData = {
  scope: "county",
  sampleSize: 87,
  thresholdMet: false,
  countToUnlock: 113,
  dots: [],
  you: null,
  consensus: [],
};

const unlockedDataWithYou: PolisData = {
  scope: "county",
  sampleSize: 312,
  thresholdMet: true,
  dots: baseDots,
  you: youDot,
  consensus,
};

const unlockedDataWithoutYou: PolisData = {
  scope: "county",
  sampleSize: 312,
  thresholdMet: true,
  dots: baseDots,
  you: null,
  consensus,
};

const unlockedStateData: PolisData = {
  scope: "state",
  sampleSize: 1200,
  thresholdMet: true,
  dots: baseDots,
  you: youDot,
  consensus,
};

/* ── Helper ──────────────────────────────────────────────────── */

function renderOverlay(
  data: PolisData,
  opts: Partial<Omit<React.ComponentProps<typeof PolisOverlay>, "data">> = {},
) {
  return render(
    <LanguageProvider>
      <PolisOverlay
        data={data}
        countyName="Harris County"
        stateName="Texas"
        {...opts}
      />
    </LanguageProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("PolisOverlay — loading state", () => {
  it("renders loading state without crash", () => {
    renderOverlay(lockedData, { loading: true });
    expect(screen.getByTestId("polis-overlay-loading")).toBeInTheDocument();
  });

  it("loading state shows loading text", () => {
    renderOverlay(lockedData, { loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("loading state does not render locked or unlocked sections", () => {
    renderOverlay(lockedData, { loading: true });
    expect(
      screen.queryByTestId("polis-overlay-locked"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("polis-overlay-unlocked"),
    ).not.toBeInTheDocument();
  });
});

describe("PolisOverlay — threshold-not-met (locked)", () => {
  it("renders locked placeholder", () => {
    renderOverlay(lockedData);
    expect(screen.getByTestId("polis-overlay-locked")).toBeInTheDocument();
  });

  it("renders locked heading with scope name", () => {
    renderOverlay(lockedData);
    const heading = screen.getByTestId("polis-overlay-locked-heading");
    expect(heading).toHaveTextContent("Harris County");
  });

  it("renders unlock counter with correct count", () => {
    renderOverlay(lockedData);
    const counter = screen.getByTestId("polis-overlay-unlock-counter");
    expect(counter).toHaveTextContent("113");
  });

  it("renders privacy callout in locked state", () => {
    renderOverlay(lockedData);
    // Privacy callout renders p1 text
    expect(screen.getByTestId("privacy-callout-p1")).toBeInTheDocument();
  });

  it("does NOT render the scatter SVG", () => {
    renderOverlay(lockedData);
    expect(screen.queryByTestId("polis-scatter-svg")).not.toBeInTheDocument();
  });
});

describe("PolisOverlay — threshold-met, with 'you' dot", () => {
  it("renders unlocked section", () => {
    renderOverlay(unlockedDataWithYou);
    expect(screen.getByTestId("polis-overlay-unlocked")).toBeInTheDocument();
  });

  it("renders the scatter SVG", () => {
    renderOverlay(unlockedDataWithYou);
    expect(screen.getByTestId("polis-scatter-svg")).toBeInTheDocument();
  });

  it("renders one dot per data point", () => {
    renderOverlay(unlockedDataWithYou);
    const dots = screen.getAllByTestId("polis-dot");
    expect(dots).toHaveLength(baseDots.length);
  });

  it("renders the 'you' dot when you is present", () => {
    renderOverlay(unlockedDataWithYou);
    expect(screen.getByTestId("polis-you-dot")).toBeInTheDocument();
  });

  it("does NOT render the no-you caption when you is present", () => {
    renderOverlay(unlockedDataWithYou);
    expect(
      screen.queryByTestId("polis-no-you-caption"),
    ).not.toBeInTheDocument();
  });

  it("renders the consensus panel", () => {
    renderOverlay(unlockedDataWithYou);
    expect(screen.getByTestId("polis-consensus-panel")).toBeInTheDocument();
  });

  it("renders top 5 consensus items and excludes the 6th", () => {
    renderOverlay(unlockedDataWithYou);
    // Top 5 should be present
    expect(
      screen.getByTestId("consensus-percent-healthcare"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("consensus-percent-education"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("consensus-percent-economy")).toBeInTheDocument();
    expect(
      screen.getByTestId("consensus-percent-environment"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("consensus-percent-housing")).toBeInTheDocument();
    // 6th item excluded
    expect(
      screen.queryByTestId("consensus-percent-immigration"),
    ).not.toBeInTheDocument();
  });

  it("consensus percentages are shown correctly", () => {
    renderOverlay(unlockedDataWithYou);
    expect(
      screen.getByTestId("consensus-percent-healthcare"),
    ).toHaveTextContent("72%");
  });

  it("renders privacy callout in unlocked state", () => {
    renderOverlay(unlockedDataWithYou);
    expect(screen.getByTestId("privacy-callout-p1")).toBeInTheDocument();
  });

  it("dots have animation inline styles applied", () => {
    renderOverlay(unlockedDataWithYou);
    const dots = screen.getAllByTestId("polis-dot");
    // At least one dot should have an animation style
    const hasDotWithAnimation = dots.some((dot) =>
      (dot.getAttribute("style") ?? "").includes("animation"),
    );
    expect(hasDotWithAnimation).toBe(true);
  });

  it("scope 'county' uses countyName in heading", () => {
    renderOverlay(unlockedDataWithYou);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Harris County");
  });

  it("scope 'state' uses stateName in heading", () => {
    renderOverlay(unlockedStateData);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Texas");
  });
});

describe("PolisOverlay — threshold-met, without 'you' dot", () => {
  it("renders unlocked section", () => {
    renderOverlay(unlockedDataWithoutYou);
    expect(screen.getByTestId("polis-overlay-unlocked")).toBeInTheDocument();
  });

  it("does NOT render the 'you' dot when you is null", () => {
    renderOverlay(unlockedDataWithoutYou);
    expect(screen.queryByTestId("polis-you-dot")).not.toBeInTheDocument();
  });

  it("renders the no-you explanatory caption", () => {
    renderOverlay(unlockedDataWithoutYou);
    const caption = screen.getByTestId("polis-no-you-caption");
    expect(caption).toBeInTheDocument();
    expect(caption).toHaveTextContent("priorities");
  });

  it("still renders the consensus panel without 'you'", () => {
    renderOverlay(unlockedDataWithoutYou);
    expect(screen.getByTestId("polis-consensus-panel")).toBeInTheDocument();
  });
});

describe("PolisOverlay — animation & accessibility", () => {
  it("each aggregate dot has a <title> for screen readers", () => {
    const { container } = renderOverlay(unlockedDataWithYou);
    const circles = container.querySelectorAll("[data-testid='polis-dot']");
    circles.forEach((circle) => {
      const title = circle.querySelector("title");
      expect(title).not.toBeNull();
      expect(title?.textContent).toMatch(/voter dot/i);
    });
  });

  it("'you' dot SVG group exists and has inner title 'You'", () => {
    const { container } = renderOverlay(unlockedDataWithYou);
    const youGroup = container.querySelector("[data-testid='polis-you-dot']");
    expect(youGroup).not.toBeNull();
    const titles = youGroup?.querySelectorAll("title");
    const youTitle = Array.from(titles ?? []).find(
      (t) => t.textContent === "You",
    );
    expect(youTitle).not.toBeNull();
  });

  it("scatter SVG has role=img and aria-label", () => {
    renderOverlay(unlockedDataWithYou);
    const svg = screen.getByTestId("polis-scatter-svg");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg).toHaveAttribute("aria-label");
  });

  it("section has aria-label 'Voter overlap visualization'", () => {
    const { container } = renderOverlay(unlockedDataWithYou);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute(
      "aria-label",
      "Voter overlap visualization",
    );
  });
});
