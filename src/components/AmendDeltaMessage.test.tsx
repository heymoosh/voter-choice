// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { AmendDeltaMessage } from "./AmendDeltaMessage";
import type { VerdictDecision } from "../lib/server/decide-verdict";

function holdRace(id: string, label = `Race ${id}`): VerdictDecision {
  return {
    raceId: id,
    raceLabel: label,
    oldScore: 70,
    newScore: 70,
    delta: 0,
    verdict: "HOLD",
  };
}

function revisitRace(id: string, label = `Race ${id}`): VerdictDecision {
  return {
    raceId: id,
    raceLabel: label,
    oldScore: 80,
    newScore: 60,
    delta: -20,
    verdict: "REVISIT",
  };
}

function naRace(id: string, label = `Race ${id}`): VerdictDecision {
  return {
    raceId: id,
    raceLabel: label,
    oldScore: 0,
    newScore: 0,
    delta: 0,
    verdict: "N/A",
  };
}

describe("AmendDeltaMessage", () => {
  it("renders a heading with the new theme name and total count", () => {
    render(
      <AmendDeltaMessage
        verdicts={[holdRace("a"), holdRace("b")]}
        newThemeName="School funding"
      />,
    );
    expect(screen.getByTestId("amend-delta-message")).toBeInTheDocument();
    expect(screen.getByText(/School funding/i)).toBeInTheDocument();
    expect(screen.getByText(/2 races/i)).toBeInTheDocument();
  });

  it("renders summary counts: REVISITs, HOLDs, N/As", () => {
    render(
      <AmendDeltaMessage
        verdicts={[
          revisitRace("r1"),
          holdRace("h1"),
          holdRace("h2"),
          holdRace("h3"),
          holdRace("h4"),
          holdRace("h5"),
          holdRace("h6"),
          holdRace("h7"),
          holdRace("h8"),
          holdRace("h9"),
        ]}
        newThemeName="Climate"
      />,
    );
    const summary = screen.getByTestId("amend-delta-summary");
    expect(summary).toHaveTextContent(/1 to revisit/i);
    expect(summary).toHaveTextContent(/9 held/i);
  });

  it("renders zero REVISITs without the REVISIT block when all are HOLD", () => {
    render(
      <AmendDeltaMessage
        verdicts={[
          holdRace("a"),
          holdRace("b"),
          holdRace("c"),
          holdRace("d"),
          holdRace("e"),
        ]}
        newThemeName="Healthcare"
      />,
    );
    expect(
      screen.queryByTestId("amend-delta-revisit-block"),
    ).not.toBeInTheDocument();
  });

  it("renders the REVISIT block prominently when at least one REVISIT exists", () => {
    render(
      <AmendDeltaMessage
        verdicts={[revisitRace("r1"), holdRace("h1")]}
        newThemeName="Climate"
      />,
    );
    expect(screen.getByTestId("amend-delta-revisit-block")).toBeInTheDocument();
    const row = screen.getByTestId("amend-delta-row-r1");
    expect(row).toHaveAttribute("data-revisit", "true");
  });

  it("renders only the first 3 REVISIT rows + an overflow affordance when >3", () => {
    render(
      <AmendDeltaMessage
        verdicts={[
          revisitRace("r1", "First race"),
          revisitRace("r2", "Second race"),
          revisitRace("r3", "Third race"),
          revisitRace("r4", "Fourth race"),
          revisitRace("r5", "Fifth race"),
        ]}
        newThemeName="Schools"
      />,
    );
    expect(screen.getByTestId("amend-delta-row-r1")).toBeInTheDocument();
    expect(screen.getByTestId("amend-delta-row-r2")).toBeInTheDocument();
    expect(screen.getByTestId("amend-delta-row-r3")).toBeInTheDocument();
    expect(screen.queryByTestId("amend-delta-row-r4")).not.toBeInTheDocument();
    expect(screen.queryByTestId("amend-delta-row-r5")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("amend-delta-revisit-overflow"),
    ).toHaveTextContent(/\+2 more to review/i);
  });

  it("clicking a REVISIT row's race label fires onJumpToRace with the raceId", () => {
    const onJumpToRace = vi.fn();
    render(
      <AmendDeltaMessage
        verdicts={[revisitRace("r1", "U.S. Senate")]}
        newThemeName="Climate"
        onJumpToRace={onJumpToRace}
      />,
    );
    const jumpBtn = screen.getByTestId("amend-delta-jump-r1");
    fireEvent.click(jumpBtn);
    expect(onJumpToRace).toHaveBeenCalledWith("r1");
  });

  it("HOLD list is collapsed by default and expandable via toggle", () => {
    render(
      <AmendDeltaMessage
        verdicts={[
          holdRace("h1", "Hold race 1"),
          holdRace("h2", "Hold race 2"),
        ]}
        newThemeName="Climate"
      />,
    );
    // Collapsed: HOLD rows not visible
    expect(screen.queryByTestId("amend-delta-row-h1")).not.toBeInTheDocument();
    // Toggle exists and is wired
    const toggle = screen.getByTestId("amend-delta-hold-toggle");
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByTestId("amend-delta-row-h1")).toBeInTheDocument();
    expect(screen.getByTestId("amend-delta-row-h2")).toBeInTheDocument();
  });

  it("renders N/A propositions in their own collapsed group", () => {
    render(
      <AmendDeltaMessage
        verdicts={[naRace("prop-1", "Proposition 1")]}
        newThemeName="Climate"
      />,
    );
    expect(
      screen.queryByTestId("amend-delta-row-prop-1"),
    ).not.toBeInTheDocument();
    const toggle = screen.getByTestId("amend-delta-na-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("amend-delta-row-prop-1")).toBeInTheDocument();
    const row = screen.getByTestId("amend-delta-row-prop-1");
    expect(row).toHaveAttribute("data-revisit", "false");
  });

  it("uses an aria-live region so screen readers announce the deltas", () => {
    render(
      <AmendDeltaMessage verdicts={[holdRace("a")]} newThemeName="Schools" />,
    );
    const region = screen.getByTestId("amend-delta-message");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("renders empty-state copy when verdicts is empty", () => {
    render(<AmendDeltaMessage verdicts={[]} newThemeName="Climate" />);
    expect(screen.getByTestId("amend-delta-message")).toBeInTheDocument();
    expect(screen.getByText(/no decided races/i)).toBeInTheDocument();
  });
});
