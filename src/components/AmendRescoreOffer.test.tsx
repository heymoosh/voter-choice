// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { AmendRescoreOffer } from "./AmendRescoreOffer";

/**
 * Phase 6 fix — opt-in re-score offer rendered after a theme amendment is
 * locked. The user explicitly decides whether to re-evaluate already-decided
 * races against the updated themes. Per UX feedback: re-scoring should be an
 * option, not a default.
 */

function renderOffer(
  overrides: Partial<React.ComponentProps<typeof AmendRescoreOffer>> = {},
) {
  const props = {
    newThemeName: "School funding",
    decidedCount: 3,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof AmendRescoreOffer>;
  return {
    ...render(<AmendRescoreOffer {...props} />),
    props,
  };
}

describe("AmendRescoreOffer", () => {
  it("renders the wrapper with the test id", () => {
    renderOffer();
    expect(screen.getByTestId("amend-rescore-offer")).toBeInTheDocument();
  });

  it("interpolates the decidedCount into the message", () => {
    renderOffer({ decidedCount: 5 });
    const wrapper = screen.getByTestId("amend-rescore-offer");
    expect(wrapper).toHaveTextContent(/5 races/i);
  });

  it("renders both buttons by default", () => {
    renderOffer();
    expect(screen.getByTestId("amend-rescore-accept")).toBeInTheDocument();
    expect(screen.getByTestId("amend-rescore-decline")).toBeInTheDocument();
  });

  it("clicking Accept fires onAccept (and not onDecline)", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    renderOffer({ onAccept, onDecline });
    fireEvent.click(screen.getByTestId("amend-rescore-accept"));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it("clicking Decline fires onDecline (and not onAccept)", () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    renderOffer({ onAccept, onDecline });
    fireEvent.click(screen.getByTestId("amend-rescore-decline"));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("inFlight=true disables both buttons and shows the spinner", () => {
    renderOffer({ inFlight: true });
    expect(screen.getByTestId("amend-rescore-accept")).toBeDisabled();
    expect(screen.getByTestId("amend-rescore-decline")).toBeDisabled();
    expect(screen.getByTestId("amend-rescore-spinner")).toBeInTheDocument();
  });

  it("inFlight=false (default) does NOT render the spinner", () => {
    renderOffer();
    expect(screen.queryByTestId("amend-rescore-spinner")).toBeNull();
    expect(screen.getByTestId("amend-rescore-accept")).not.toBeDisabled();
    expect(screen.getByTestId("amend-rescore-decline")).not.toBeDisabled();
  });

  it("mentions the new theme name in the offer text", () => {
    renderOffer({ newThemeName: "School funding" });
    expect(screen.getByTestId("amend-rescore-offer")).toHaveTextContent(
      /School funding/i,
    );
  });
});
