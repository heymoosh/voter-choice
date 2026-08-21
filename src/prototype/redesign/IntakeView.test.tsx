// @vitest-environment jsdom
/* Regression coverage for the intake chat's budget-block wiring: a
   BUDGET_SOFT_CLOSE / _HANDOFF / _EXHAUSTED block from sendChatTurn must open
   the host's budget flow (App2's BudgetModal, via the onBudgetBlock prop),
   never fall through to the plain inline red error line. A non-budget error
   must still surface as that inline error — this isn't a blanket swallow. */
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
import { IntakeView } from "./IntakeView";

/** Script the NEXT sendChatTurn call to synchronously invoke `cb.onBudgetBlock`
 *  with the given code — mirrors what chatTransport does for a BUDGET_* block. */
function mockNextBudgetBlock(code = "BUDGET_EXHAUSTED") {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onBudgetBlock(code);
    return Promise.resolve();
  });
}

/** Script the NEXT sendChatTurn call to fail with a non-budget error. */
function mockNextError(reason = "network") {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onError(reason);
    return Promise.resolve();
  });
}

beforeEach(() => {
  sendChatTurn.mockReset();
});

function renderIntake(onBudgetBlock = vi.fn()) {
  render(
    <I18nProvider>
      <IntakeView
        address="1100 Congress Ave, Austin, TX 78701"
        savedIssues={null}
        contextNote="your 3 members of Congress"
        onLock={vi.fn()}
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

describe("IntakeView — budget-block wiring", () => {
  it("opens the budget flow (host onBudgetBlock) instead of showing the inline error on a budget block", () => {
    const { onBudgetBlock } = renderIntake();
    mockNextBudgetBlock("BUDGET_EXHAUSTED");

    sendMessage("my rent keeps climbing");

    expect(onBudgetBlock).toHaveBeenCalledTimes(1);
    // No plain red error line — the budget flow owns this, not the banner.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves the failed turn for retry — the retry callback re-sends the same text", () => {
    const { onBudgetBlock } = renderIntake();
    mockNextBudgetBlock("BUDGET_SOFT_CLOSE");
    sendMessage("my rent keeps climbing");

    expect(sendChatTurn).toHaveBeenCalledTimes(1);
    const retry = onBudgetBlock.mock.calls[0][0];
    expect(typeof retry).toBe("function");

    mockNextBudgetBlock("BUDGET_SOFT_CLOSE");
    act(() => retry());

    expect(sendChatTurn).toHaveBeenCalledTimes(2);
    const secondArgs = sendChatTurn.mock.calls[1][0];
    expect(secondArgs.messages[secondArgs.messages.length - 1]).toEqual({
      role: "user",
      content: "my rent keeps climbing",
    });
  });

  it("still shows the ordinary inline error for a non-budget failure — real errors are not swallowed", () => {
    const { onBudgetBlock } = renderIntake();
    mockNextError("network");

    sendMessage("my rent keeps climbing");

    expect(onBudgetBlock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
