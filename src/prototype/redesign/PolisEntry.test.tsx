// @vitest-environment jsdom
/* PolisEntry — the optional Polis invite/preview screen shown once the
   scorecard is done, in place of the old one-line "where you stand among
   your neighbors" link (card 4936d17b). Covers: seat-count copy
   (singular/plural), and that each control fires the expected callback
   without gating the others (print never blocks standing/skip, etc.). */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PolisEntry } from "./PolisEntry";

function renderEntry(seatsCount = 2) {
  const onPrint = vi.fn();
  const onSeeStanding = vi.fn();
  const onSkip = vi.fn();
  render(
    <PolisEntry
      seatsCount={seatsCount}
      onPrint={onPrint}
      onSeeStanding={onSeeStanding}
      onSkip={onSkip}
    />,
  );
  return { onPrint, onSeeStanding, onSkip };
}

describe("PolisEntry", () => {
  it("renders the done-state heading and pluralizes the seat count", () => {
    renderEntry(2);
    expect(screen.getByText("Your scorecard's ready.")).toBeInTheDocument();
    expect(screen.getByText(/2 seats decided\./)).toBeInTheDocument();
  });

  it("uses singular phrasing for exactly one seat", () => {
    renderEntry(1);
    expect(screen.getByText(/1 seat decided\./)).toBeInTheDocument();
  });

  it("both 'Print my scorecard' and 'Save as PDF' call the same onPrint — one print surface, not a new pipeline", () => {
    const { onPrint } = renderEntry();
    fireEvent.click(screen.getByTestId("polis-entry-print"));
    fireEvent.click(screen.getByText("Save as PDF"));
    expect(onPrint).toHaveBeenCalledTimes(2);
  });

  it("'See where I stand' calls onSeeStanding — the accept path into the real standing report", () => {
    const { onSeeStanding, onSkip } = renderEntry();
    fireEvent.click(screen.getByTestId("polis-entry-see-standing"));
    expect(onSeeStanding).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it("'No thanks' calls onSkip without ever touching onSeeStanding or onPrint", () => {
    const { onSeeStanding, onSkip, onPrint } = renderEntry();
    fireEvent.click(screen.getByTestId("polis-entry-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSeeStanding).not.toHaveBeenCalled();
    expect(onPrint).not.toHaveBeenCalled();
  });
});
