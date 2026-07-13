// @vitest-environment jsdom
/* Drives the real IntakeView conversational flow end-to-end through the new
   pre-lock confirm gate — card "Intake locked state: is IntakeLocked meant
   to ship as its own screen?" (decision: yes, ship it as its own step
   between "issues picked via chat" and "issues actually locked in"). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

/** Script the NEXT sendChatTurn call to synchronously stream `raw` back. */
function mockNextReply(raw: string) {
  sendChatTurn.mockImplementationOnce((_args: any, cb: any) => {
    cb.onText(raw);
    cb.onDone();
    return Promise.resolve();
  });
}

const EXTRACTED_THEME = [
  {
    name: "Cost of living & inflation",
    quotes: ["my rent keeps climbing"],
  },
];

beforeEach(() => {
  sendChatTurn.mockReset();
});

function renderIntake(onLock = vi.fn()) {
  render(
    <I18nProvider>
      <IntakeView
        address="1100 Congress Ave, Austin, TX 78701"
        savedIssues={null}
        contextNote="your 3 members of Congress"
        onLock={onLock}
        onBudgetBlock={() => {}}
      />
    </I18nProvider>,
  );
  return { onLock };
}

async function driveToThemesCard() {
  mockNextReply(JSON.stringify(EXTRACTED_THEME));
  fireEvent.change(screen.getByTestId("issue-convo-input"), {
    target: { value: "my rent keeps climbing" },
  });
  fireEvent.click(screen.getByTestId("issue-convo-send"));
}

describe("IntakeView → IntakeLocked pre-lock confirm gate", () => {
  it("does NOT show the confirm screen while the conversation is still active", () => {
    renderIntake();
    expect(screen.getByTestId("issue-convo-input")).toBeInTheDocument();
    expect(screen.queryByTestId("issue-locked-confirm")).toBeNull();
  });

  it("clicking the chat's lock button opens IntakeLocked as a distinct screen — NOT an immediate onLock", async () => {
    const { onLock } = renderIntake();
    await driveToThemesCard();

    const lockBtn = screen.getByTestId("issue-primary");
    fireEvent.click(lockBtn);

    // The conversational composer is gone — replaced by the confirm screen.
    expect(screen.queryByTestId("issue-convo-input")).toBeNull();
    expect(screen.getByTestId("issue-locked-confirm")).toBeInTheDocument();
    // The issue selection has NOT been finalized by merely reaching this
    // screen — onLock only fires from IntakeLocked's own confirm control.
    expect(onLock).not.toHaveBeenCalled();

    // The canvas artboard's copy (intake.css .iq-locked / screens-intake.jsx
    // IntakeLocked), ported verbatim.
    expect(screen.getByText("Your issues are set.")).toBeInTheDocument();
    expect(
      screen.getByText("These travel with every record we show you."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Perfect\. Here's your final list\./),
    ).toBeInTheDocument();
    // The reviewed issue is still visible on the confirm screen.
    expect(screen.getByText("Cost of living & inflation")).toBeInTheDocument();
  });

  it("the confirm screen's control advances the flow to the locked state (onLock fires with the issues)", async () => {
    const { onLock } = renderIntake();
    await driveToThemesCard();
    fireEvent.click(screen.getByTestId("issue-primary"));

    fireEvent.click(screen.getByTestId("issue-locked-confirm-btn"));

    expect(onLock).toHaveBeenCalledTimes(1);
    const locked = onLock.mock.calls[0][0];
    expect(locked).toHaveLength(1);
    expect(locked[0].interpretation).toBe("Cost of living & inflation");
  });

  it("counts a custom (unmapped) issue toward BOTH jurisdiction buckets — the same 'both' level decorateIssues gives it after lock", async () => {
    // EXTRACTED_THEME carries no canonicalIssue, so at extraction time its
    // level is undefined. Pre-fix, the banner counted it toward neither
    // bucket ("1 issue listed, 0 federal · 0 state" — the split disagreed
    // with the list right above it). The workspace resolves exactly this
    // issue to level "both" (decorateIssues), so the banner must predict
    // that: 1 federal · 1 state.
    renderIntake();
    await driveToThemesCard();
    fireEvent.click(screen.getByTestId("issue-primary"));

    expect(screen.getByText("1 Federal")).toBeInTheDocument();
    expect(screen.getByText("1 State")).toBeInTheDocument();
  });

  it("the confirm screen's back control returns to the live conversation without losing it", async () => {
    const { onLock } = renderIntake();
    await driveToThemesCard();
    fireEvent.click(screen.getByTestId("issue-primary"));
    expect(screen.getByTestId("issue-locked-confirm")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("issue-locked-back"));

    expect(screen.queryByTestId("issue-locked-confirm")).toBeNull();
    expect(screen.getByTestId("issue-convo-input")).toBeInTheDocument();
    // The conversation's themes card is still there, untouched.
    expect(screen.getByText("Cost of living & inflation")).toBeInTheDocument();
    expect(onLock).not.toHaveBeenCalled();
  });
});
