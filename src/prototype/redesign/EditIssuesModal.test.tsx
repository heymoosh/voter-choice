// @vitest-environment jsdom
/* Regression coverage for the edit-issues modal's budget-block wiring — same
   contract as IntakeView.test.tsx, exercised through the other host of
   useIssueConversation: a BUDGET_* block must reach the host's onBudgetBlock
   prop (App2's BudgetModal), not fall through to the inline red error line. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

const sendChatTurn = vi.fn();
vi.mock("./chatTransport", () => ({
  sendChatTurn: (...args: unknown[]) => sendChatTurn(...(args as [any, any])),
}));
vi.mock("../realData", () => ({
  getChatSessionId: () => "test-session-id",
}));

import { I18nProvider } from "../VoterChoiceApp";
import { EditIssuesModal } from "./EditIssuesModal";

const SEED_ISSUES = [
  {
    sourceType: "freeText",
    sourceText: "guns",
    rank: 1,
    interpretation: "Gun ownership concerns",
    canonicalIssue: "gun_rights_safety",
    confidence: "clear",
    quotes: [{ label: "example", text: "I care about guns" }],
  },
];

function mockNextBudgetBlock(code = "BUDGET_EXHAUSTED") {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onBudgetBlock(code);
    return Promise.resolve();
  });
}

function mockNextError(reason = "network") {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onError(reason);
    return Promise.resolve();
  });
}

beforeEach(() => {
  sendChatTurn.mockReset();
});

function renderEditModal(onBudgetBlock = vi.fn()) {
  render(
    <I18nProvider>
      <EditIssuesModal
        issues={SEED_ISSUES}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        onBudgetBlock={onBudgetBlock}
      />
    </I18nProvider>,
  );
  return { onBudgetBlock };
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByTestId("issue-convo-input"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByTestId("issue-convo-send"));
}

describe("EditIssuesModal — budget-block wiring", () => {
  it("opens the budget flow (host onBudgetBlock) instead of showing the inline error on a budget block", () => {
    const { onBudgetBlock } = renderEditModal();
    mockNextBudgetBlock("BUDGET_HANDOFF");

    sendMessage("also housing costs");

    expect(onBudgetBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves the failed turn for retry — the retry callback re-sends the same text", () => {
    const { onBudgetBlock } = renderEditModal();
    mockNextBudgetBlock("BUDGET_EXHAUSTED");
    sendMessage("also housing costs");

    const retry = onBudgetBlock.mock.calls[0][0];
    expect(typeof retry).toBe("function");

    mockNextBudgetBlock("BUDGET_EXHAUSTED");
    act(() => retry());

    expect(sendChatTurn).toHaveBeenCalledTimes(2);
    const secondArgs = sendChatTurn.mock.calls[1][0];
    expect(secondArgs.messages[secondArgs.messages.length - 1]).toEqual({
      role: "user",
      content: "also housing costs",
    });
  });

  it("still shows the ordinary inline error for a non-budget failure — real errors are not swallowed", () => {
    const { onBudgetBlock } = renderEditModal();
    mockNextError("network");

    sendMessage("also housing costs");

    expect(onBudgetBlock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
