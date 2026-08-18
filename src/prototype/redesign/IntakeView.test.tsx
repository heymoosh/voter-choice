// @vitest-environment jsdom
/* Drives the real IntakeView conversational intake flow end-to-end.
   Reps-first flow (2026-08-18): locking issues finalizes directly — no
   pre-lock confirm screen (IntakeLocked.tsx stays in the tree, but is no
   longer wired into this path) and no forced interstitial sit between
   "issues picked via chat" and the caller's onLock. Renamed from
   IntakeLocked.test.tsx, which pinned the now-removed confirm gate this
   file replaces. */
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

function renderIntake({
  onLock = vi.fn(),
  onCancel,
}: { onLock?: (issues: unknown) => void; onCancel?: () => void } = {}) {
  render(
    <I18nProvider>
      <IntakeView
        address="1100 Congress Ave, Austin, TX 78701"
        savedIssues={null}
        contextNote="your 3 members of Congress"
        onLock={onLock}
        onBudgetBlock={() => {}}
        onCancel={onCancel}
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

describe("IntakeView — direct lock (reps-first flow)", () => {
  it("locking fires onLock immediately with the reviewed issues — no intermediate confirm screen", async () => {
    const { onLock } = renderIntake();
    await driveToThemesCard();

    fireEvent.click(screen.getByTestId("issue-primary"));

    expect(onLock).toHaveBeenCalledTimes(1);
    const locked = onLock.mock.calls[0][0] as Array<{
      interpretation: string;
    }>;
    expect(locked).toHaveLength(1);
    expect(locked[0].interpretation).toBe("Cost of living & inflation");
    // The removed pre-lock confirm screen never mounts.
    expect(screen.queryByTestId("issue-locked-confirm")).toBeNull();
  });

  it("shows no cancel affordance by default (the first-run path has nowhere to cancel to)", () => {
    renderIntake();
    expect(screen.queryByTestId("intake-cancel")).toBeNull();
  });

  it("shows a cancel affordance when onCancel is passed (tailoring from an existing workspace), and it fires onCancel", () => {
    const onCancel = vi.fn();
    renderIntake({ onCancel });
    fireEvent.click(screen.getByTestId("intake-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
