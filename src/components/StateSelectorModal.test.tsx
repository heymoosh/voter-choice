// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { StateSelectorModal } from "./StateSelectorModal";
import { LanguageProvider } from "../lib/i18n";

describe("StateSelectorModal", () => {
  it("renders state-selector data-testid", () => {
    render(<StateSelectorModal states={["AZ", "NM"]} onSelect={vi.fn()} />);
    expect(screen.getByTestId("state-selector")).toBeInTheDocument();
  });

  it("shows the question text", () => {
    render(<StateSelectorModal states={["AZ", "NM"]} onSelect={vi.fn()} />);
    expect(screen.getByTestId("state-selector").textContent).toContain(
      "Which state are you voting in?",
    );
  });

  it("renders a button for each state code", () => {
    render(<StateSelectorModal states={["AZ", "NM"]} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "AZ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NM" })).toBeInTheDocument();
  });

  it("calls onSelect with the state code when a button is clicked", () => {
    const onSelect = vi.fn();
    render(<StateSelectorModal states={["AZ", "NM"]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "AZ" }));
    expect(onSelect).toHaveBeenCalledWith("AZ");
  });

  it("renders correct number of buttons for 3 states", () => {
    render(
      <StateSelectorModal states={["TX", "OK", "NM"]} onSelect={vi.fn()} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });
});

describe("StateSelectorModal — Spanish mode", () => {
  beforeEach(() => {
    localStorage.setItem("ballot-tool-lang", "es");
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("shows Spanish prompt text in Spanish mode", async () => {
    render(
      <LanguageProvider>
        <StateSelectorModal states={["AZ", "NM"]} onSelect={vi.fn()} />
      </LanguageProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("state-selector").textContent).toMatch(
      /estado|votar/i,
    );
  });

  it("shows Spanish select button text in Spanish mode", async () => {
    render(
      <LanguageProvider>
        <StateSelectorModal states={["AZ", "NM"]} onSelect={vi.fn()} />
      </LanguageProvider>,
    );
    await act(async () => {});
    // The select button label or button text should be in Spanish if applicable
    expect(screen.getByTestId("state-selector").textContent).toContain(
      "varios estados",
    );
  });
});
