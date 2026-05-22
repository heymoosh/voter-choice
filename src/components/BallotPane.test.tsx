// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { BallotPane, type BallotPaneProps, type Decision } from "./BallotPane";
import type { Race } from "../lib/raceDeriver";

const sampleRaces: Race[] = [
  {
    id: "us-president",
    section: "Federal",
    label: "U.S. President",
    decided: true,
  },
  {
    id: "us-senate",
    section: "Federal",
    label: "U.S. Senate",
    decided: false,
  },
  { id: "governor", section: "State", label: "Governor", decided: false },
  {
    id: "prop-1",
    section: "Propositions",
    label: "Proposition 1",
    decided: false,
  },
];

const sampleDecisions: Decision[] = [
  {
    raceId: "us-president",
    raceLabel: "U.S. President",
    section: "Federal",
    pick: "Jane Doe",
    party: "Democratic",
    whyNote: "I trust her labor record",
  },
];

function renderPane(overrides: Partial<BallotPaneProps> = {}) {
  const props: BallotPaneProps = {
    decisions: sampleDecisions,
    totalRaces: 4,
    races: sampleRaces,
    cityState: "Houston, TX",
    hasPolling: false,
    activeRaceId: "us-senate",
    onPrint: vi.fn(),
    onSaveProfile: vi.fn(),
    onHandoff: vi.fn(),
    ...overrides,
  };
  const result = render(<BallotPane {...props} />);
  return { ...result, props };
}

describe("BallotPane", () => {
  it("renders the header with N/M count and Draft label", () => {
    renderPane({ totalRaces: 14 });
    const header = screen.getByTestId("ballot-pane-header");
    expect(header).toHaveTextContent("Your ballot");
    expect(header).toHaveTextContent("1/14");
    expect(header).toHaveTextContent(/draft/i);
  });

  it("renders the city + state line", () => {
    renderPane({ cityState: "Houston, TX" });
    expect(screen.getByTestId("ballot-pane-address")).toHaveTextContent(
      "Houston, TX",
    );
  });

  it("renders section headers for sections present in races", () => {
    renderPane();
    const list = screen.getByTestId("ballot-pane-list");
    expect(list).toHaveTextContent("Federal");
    expect(list).toHaveTextContent("State");
    expect(list).toHaveTextContent("Propositions");
  });

  it("renders the committed pick with party and italic verbatim why-note", () => {
    renderPane();
    const row = screen.getByTestId("ballot-pane-row-us-president");
    expect(row).toHaveTextContent("Jane Doe");
    expect(row).toHaveTextContent("Democratic");
    const why = screen.getByTestId("ballot-pane-why-us-president");
    expect(why).toHaveTextContent("I trust her labor record");
    // italic styling — check inline style or class
    const styles = window.getComputedStyle(why);
    expect(styles.fontStyle).toBe("italic");
  });

  it("renders 'Deciding now…' for the active undecided race", () => {
    renderPane({ activeRaceId: "us-senate" });
    const row = screen.getByTestId("ballot-pane-row-us-senate");
    expect(row).toHaveTextContent(/deciding now/i);
  });

  it("renders 'Not yet decided' for non-active undecided races", () => {
    renderPane({ activeRaceId: "us-senate" });
    const row = screen.getByTestId("ballot-pane-row-governor");
    expect(row).toHaveTextContent(/not yet decided/i);
  });

  it("active race row carries data-active='true' so the civic-soft border can attach", () => {
    renderPane({ activeRaceId: "us-senate" });
    const active = screen.getByTestId("ballot-pane-row-us-senate");
    expect(active).toHaveAttribute("data-active", "true");
    const inactive = screen.getByTestId("ballot-pane-row-governor");
    expect(inactive).toHaveAttribute("data-active", "false");
  });

  it("polling slot is hidden when hasPolling=false", () => {
    renderPane({ hasPolling: false });
    expect(screen.queryByTestId("ballot-pane-polling-slot")).toBeNull();
  });

  it("polling slot is visible when hasPolling=true", () => {
    renderPane({ hasPolling: true });
    expect(screen.getByTestId("ballot-pane-polling-slot")).toBeInTheDocument();
  });

  it("Print button is disabled at zero decisions", () => {
    renderPane({ decisions: [] });
    expect(screen.getByTestId("ballot-pane-print")).toBeDisabled();
  });

  it("Print button is enabled when at least one decision exists", () => {
    renderPane({ decisions: sampleDecisions });
    expect(screen.getByTestId("ballot-pane-print")).not.toBeDisabled();
  });

  it("Print button fires onPrint when clicked", () => {
    const onPrint = vi.fn();
    renderPane({ onPrint });
    fireEvent.click(screen.getByTestId("ballot-pane-print"));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it("Save profile button fires onSaveProfile", () => {
    const onSaveProfile = vi.fn();
    renderPane({ onSaveProfile });
    fireEvent.click(screen.getByTestId("ballot-pane-save-profile"));
    expect(onSaveProfile).toHaveBeenCalledTimes(1);
  });

  it("Continue in another chatbot button fires onHandoff", () => {
    const onHandoff = vi.fn();
    renderPane({ onHandoff });
    fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    expect(onHandoff).toHaveBeenCalledTimes(1);
  });

  it("uses role=complementary with an aria label", () => {
    renderPane();
    const aside = screen.getByRole("complementary", {
      name: /your ballot/i,
    });
    expect(aside).toBeInTheDocument();
  });
});
