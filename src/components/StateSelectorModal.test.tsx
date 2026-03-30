// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StateSelectorModal } from "./StateSelectorModal";

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
