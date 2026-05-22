// @vitest-environment jsdom
/**
 * PrintBallot — overflow detection / one-page hard cap.
 *
 * The load-bearing physical constraint: the printable artifact must fit on a
 * single US-Letter sheet. When `scrollHeight` of the `.print-sheet` container
 * exceeds the page bound (US-Letter at 96dpi after 0.5in margins ≈ 960px),
 * the print action is blocked inline and the user is prompted to trim notes.
 *
 * jsdom returns `scrollHeight === 0` for every element by default, so we
 * mock it both directions explicitly via `Object.defineProperty` on
 * `HTMLElement.prototype`. The override is `configurable: true` so afterEach
 * can restore the original descriptor (or delete the override when there
 * was no prototype getter to start with).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PrintBallot, type PrintBallotProps } from "./PrintBallot";
import type { Decision } from "./BallotPane";
import type { Race } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";

// ── scrollHeight mock helpers ────────────────────────────────────────

const originalDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight",
);

function mockScrollHeight(px: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => px,
  });
}

function restoreScrollHeight() {
  if (originalDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      originalDescriptor,
    );
  } else {
    // No native getter on the prototype — delete the override so subsequent
    // tests see the jsdom default again.
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)
      .scrollHeight;
  }
}

afterEach(() => {
  restoreScrollHeight();
  vi.restoreAllMocks();
});

// ── Fixtures ─────────────────────────────────────────────────────────

const races: Race[] = [
  {
    id: "us-president",
    section: "Federal",
    label: "U.S. President",
    decided: true,
  },
  { id: "governor", section: "State", label: "Governor", decided: true },
];

const decisions: Decision[] = [
  {
    raceId: "us-president",
    raceLabel: "U.S. President",
    section: "Federal",
    pick: "Jane Doe",
    party: "Democratic",
    whyNote: "Trust her labor record",
  },
  {
    raceId: "governor",
    raceLabel: "Governor",
    section: "State",
    pick: "Carol Cain",
    party: "Democratic",
    whyNote: "Solid on healthcare costs",
  },
];

const themes: Theme[] = [
  { name: "Healthcare costs", quotes: ["insulin keeps going up"] },
  { name: "Housing affordability", quotes: ["rent went up 30%"] },
];

function renderBallot(overrides: Partial<PrintBallotProps> = {}) {
  const props: PrintBallotProps = {
    decisions,
    themes,
    races,
    pollingData: null,
    cityState: "Travis County, Texas",
    electionLabel: "2026 General Election",
    electionDate: "2026-11-03",
    onBack: vi.fn(),
    ...overrides,
  };
  return render(<PrintBallot {...props} />);
}

describe("PrintBallot — one-page hard cap (overflow detection)", () => {
  it("shows the trim-prompt and disables print when scrollHeight exceeds the page bound", async () => {
    // 1500px is comfortably > 960px (US-Letter at 96dpi after 0.5in margins).
    mockScrollHeight(1500);
    renderBallot();

    await waitFor(() => {
      expect(screen.getByTestId("trim-prompt")).toBeInTheDocument();
    });

    const printBtn = screen.getByTestId("print-button");
    expect(printBtn).toBeDisabled();
  });

  it("does NOT call window.print when print clicked while overflowing", async () => {
    mockScrollHeight(1500);
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBallot();

    await waitFor(() => {
      expect(screen.getByTestId("trim-prompt")).toBeInTheDocument();
    });

    const printBtn = screen.getByTestId("print-button");
    // Defensive: even if test bypasses the `disabled` attr, the click handler
    // short-circuits when overflowing. fireEvent.click ignores `disabled`.
    fireEvent.click(printBtn);

    expect(printSpy).not.toHaveBeenCalled();
  });

  it("hides the trim-prompt and enables print when scrollHeight is within bounds", async () => {
    // 600px is well under the 960px cap.
    mockScrollHeight(600);
    renderBallot();

    // After the effect runs, the trim prompt should NOT appear.
    await waitFor(() => {
      expect(screen.getByTestId("print-button")).not.toBeDisabled();
    });
    expect(screen.queryByTestId("trim-prompt")).toBeNull();
  });

  it("calls window.print exactly once on click when not overflowing", async () => {
    mockScrollHeight(600);
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    renderBallot();

    await waitFor(() => {
      expect(screen.getByTestId("print-button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("print-button"));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("re-measures when decisions change (effect dep)", async () => {
    mockScrollHeight(600);
    const { rerender } = renderBallot();

    await waitFor(() => {
      expect(screen.queryByTestId("trim-prompt")).toBeNull();
    });

    // Now flip the world to overflowing and re-render with new decisions
    // (the effect's dependency on `decisions` triggers re-measure).
    mockScrollHeight(1500);
    const moreDecisions: Decision[] = [
      ...decisions,
      {
        raceId: "us-senate",
        raceLabel: "U.S. Senate",
        section: "Federal",
        pick: "Sam Smith",
        party: "Democratic",
        whyNote: "x".repeat(400),
      },
    ];

    rerender(
      <PrintBallot
        decisions={moreDecisions}
        themes={themes}
        races={races}
        pollingData={null}
        cityState="Travis County, Texas"
        electionLabel="2026 General Election"
        electionDate="2026-11-03"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("trim-prompt")).toBeInTheDocument();
    });
    expect(screen.getByTestId("print-button")).toBeDisabled();
  });
});
