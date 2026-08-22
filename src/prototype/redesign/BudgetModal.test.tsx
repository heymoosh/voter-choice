// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

// Keep the test scoped to BudgetModal's own copy/branch logic — ByokCard and
// HandoffActions are exercised by their own test files.
vi.mock("./ByokCard", () => ({
  ByokCard: () => <div data-testid="byok-card" />,
}));
vi.mock("./HandoffActions", () => ({
  HandoffActions: () => <div data-testid="handoff-actions" />,
}));

import { BudgetModal } from "./BudgetModal";

/**
 * BudgetModal's user-visible copy is the surface an adversarial audit found
 * still lying after the plumbing (onShowBudgetOptions upstream flag) was
 * fixed: `blocked`/`upstream` were threaded into the MODAL correctly, but
 * this component itself, and the CARD copy upstream of it, weren't checked
 * for what they actually render. These tests assert on rendered TEXT, not
 * just prop calls — a negative assertion that the upstream path never shows
 * the community-budget claim is the one that would have caught the bug.
 */
describe("BudgetModal — cause-honest copy", () => {
  it("never claims the community budget for an upstream (Anthropic-account) block", () => {
    render(
      <BudgetModal blocked upstream prompt="prompt text" onClose={() => {}} />,
    );
    const modal = screen.getByTestId("budget-modal");
    expect(modal).toHaveTextContent("shared AI access");
    expect(modal).toHaveTextContent(/not the community budget/i);
    // The dishonest claim FIX A found on the research cards, restated here
    // as the specific false sentence the non-upstream branch uses — must
    // NEVER appear when upstream is true.
    expect(modal).not.toHaveTextContent(
      "The shared community AI budget is used up",
    );
  });

  it("blames the community budget (correctly) for a non-upstream block", () => {
    render(
      <BudgetModal
        blocked
        upstream={false}
        prompt="prompt text"
        onClose={() => {}}
      />,
    );
    const modal = screen.getByTestId("budget-modal");
    expect(modal).toHaveTextContent("The shared community AI budget is used up");
    expect(modal).not.toHaveTextContent(/shared ai access/i);
  });

  it("does not promise an immediate resume when no retry is stashed (research path) — FIX F: BYOK cannot resume research", () => {
    render(
      <BudgetModal
        blocked
        upstream
        prompt="prompt text"
        onClose={() => {}}
        onRetryWithKey={undefined}
      />,
    );
    const modal = screen.getByTestId("budget-modal");
    expect(modal).not.toHaveTextContent("To keep going right now");
    expect(modal).toHaveTextContent(/won.t resume it/i);
    expect(screen.queryByTestId("budget-retry-key")).not.toBeInTheDocument();
  });

  it("keeps the immediate-resume promise + Retry-with-my-key button when a real retry IS stashed (chat/intake path)", () => {
    // hasByokKey() reads localStorage (anthropic-client-byok.ts STORAGE_KEY)
    // — stub it present so the onRetryWithKey && keyReady gate opens.
    localStorage.setItem("voter-choice:byok-anthropic-key", "sk-ant-test");
    render(
      <BudgetModal
        blocked
        upstream
        prompt="prompt text"
        onClose={() => {}}
        onRetryWithKey={() => {}}
      />,
    );
    const modal = screen.getByTestId("budget-modal");
    expect(modal).toHaveTextContent("To keep going right now");
    localStorage.clear();
  });

  it("shows the soft ribbon framing (not a refusal) when blocked is false", () => {
    render(<BudgetModal blocked={false} prompt="prompt text" onClose={() => {}} />);
    const modal = screen.getByTestId("budget-modal");
    expect(modal).toHaveTextContent("running low");
    expect(modal).not.toHaveTextContent(/shared ai access/i);
    expect(modal).not.toHaveTextContent("is used up for this month");
  });
});
