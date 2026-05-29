// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ProcessingSteps } from "./ProcessingSteps";

const STEPS = [
  "Reading your issues",
  "Pulling each candidate's record",
  "Scoring alignment with your issues",
  "Building your candidate comparison",
];

function renderSteps(currentStep?: number) {
  return render(
    <ProcessingSteps
      eyebrow="Assessing candidates"
      heading="Matching each candidate to your issues."
      steps={STEPS}
      hint="This usually takes 10–30 seconds — don't refresh."
      currentStep={currentStep}
      data-testid="assess-processing"
    />,
  );
}

describe("ProcessingSteps", () => {
  it("renders the eyebrow, heading, every step, and the hint", () => {
    renderSteps(0);
    expect(screen.getByTestId("assess-processing")).toBeInTheDocument();
    expect(screen.getByText("Assessing candidates")).toBeInTheDocument();
    expect(
      screen.getByText("Matching each candidate to your issues."),
    ).toBeInTheDocument();
    STEPS.forEach((label, i) => {
      const li = screen.getByTestId(`processing-step-${i}`);
      expect(li).toHaveTextContent(label);
    });
    expect(screen.getByText(/10–30 seconds/)).toBeInTheDocument();
  });

  it("marks earlier steps done, the current step active, and later steps pending (parent-driven)", () => {
    renderSteps(2);
    expect(screen.getByTestId("processing-step-0")).toHaveAttribute(
      "data-status",
      "done",
    );
    expect(screen.getByTestId("processing-step-1")).toHaveAttribute(
      "data-status",
      "done",
    );
    expect(screen.getByTestId("processing-step-2")).toHaveAttribute(
      "data-status",
      "active",
    );
    expect(screen.getByTestId("processing-step-3")).toHaveAttribute(
      "data-status",
      "pending",
    );
  });

  it("defaults the first step to active when self-driven (no currentStep)", () => {
    renderSteps(undefined);
    // Before any timer fires, step 0 is active and the rest pending.
    expect(screen.getByTestId("processing-step-0")).toHaveAttribute(
      "data-status",
      "active",
    );
    expect(screen.getByTestId("processing-step-3")).toHaveAttribute(
      "data-status",
      "pending",
    );
  });
});
