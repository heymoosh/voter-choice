// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { WorkspaceRail, type WorkspaceRailProps } from "./WorkspaceRail";
import type { Race } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";

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

const sampleThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ['"insulin keeps going up"'] },
  { name: "Housing affordability", quotes: ['"rent went up 30%"'] },
];

function renderRail(overrides: Partial<WorkspaceRailProps> = {}) {
  const props: WorkspaceRailProps = {
    decidedCount: 3,
    totalRaces: 14,
    themes: sampleThemes,
    races: sampleRaces,
    activeRaceId: "us-senate",
    onSelectRace: vi.fn(),
    onEditThemes: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
  const result = render(<WorkspaceRail {...props} />);
  return { ...result, props };
}

describe("WorkspaceRail", () => {
  it("renders the progress text in N / M form", () => {
    renderRail({ decidedCount: 3, totalRaces: 14 });
    expect(screen.getByText("3 / 14")).toBeInTheDocument();
  });

  it("renders a progress bar with aria-valuenow equal to decidedCount", () => {
    renderRail({ decidedCount: 3, totalRaces: 14 });
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "14");
  });

  it("renders themes in passed order", () => {
    renderRail();
    const themeItems = screen.getAllByTestId(/^workspace-rail-theme-/);
    expect(themeItems).toHaveLength(2);
    expect(themeItems[0]).toHaveTextContent("Healthcare costs");
    expect(themeItems[1]).toHaveTextContent("Housing affordability");
  });

  it("fires onEditThemes when the Edit themes button is clicked", () => {
    const onEditThemes = vi.fn();
    renderRail({ onEditThemes });
    const editBtn = screen.getByTestId("workspace-rail-edit-themes");
    fireEvent.click(editBtn);
    expect(onEditThemes).toHaveBeenCalledTimes(1);
  });

  it("renders race-list section headers (Federal / State / Propositions)", () => {
    renderRail();
    expect(screen.getByText("Federal")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Propositions")).toBeInTheDocument();
  });

  it("renders every race row", () => {
    renderRail();
    sampleRaces.forEach((r) => {
      expect(
        screen.getByTestId(`workspace-rail-race-${r.id}`),
      ).toHaveTextContent(r.label);
    });
  });

  it("clicking a race row fires onSelectRace with the race id", () => {
    const onSelectRace = vi.fn();
    renderRail({ onSelectRace });
    fireEvent.click(screen.getByTestId("workspace-rail-race-governor"));
    expect(onSelectRace).toHaveBeenCalledWith("governor");
  });

  it("active race row carries aria-current=page", () => {
    renderRail({ activeRaceId: "us-senate" });
    const active = screen.getByTestId("workspace-rail-race-us-senate");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("decided rows are marked decided", () => {
    renderRail();
    const decided = screen.getByTestId("workspace-rail-race-us-president");
    expect(decided).toHaveAttribute("data-decided", "true");
    const undecided = screen.getByTestId("workspace-rail-race-us-senate");
    expect(undecided).toHaveAttribute("data-decided", "false");
  });

  it("rail uses navigation role with an aria label", () => {
    renderRail();
    const nav = screen.getByRole("navigation", {
      name: /workspace navigation/i,
    });
    expect(nav).toBeInTheDocument();
  });

  it("Restart link fires onRestart", () => {
    const onRestart = vi.fn();
    renderRail({ onRestart });
    fireEvent.click(screen.getByTestId("workspace-rail-restart"));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("renders a Methodology and Get help link in the footer", () => {
    renderRail();
    expect(
      screen.getByTestId("workspace-rail-methodology"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-rail-help")).toBeInTheDocument();
  });
});
