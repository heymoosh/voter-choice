// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChatPanel } from "./ChatPanel";
import { LanguageProvider } from "../lib/i18n";
import type { StateElectionData } from "../types/election";

const txState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-runoff",
      name: "2026 Texas Primary Runoff",
      date: "2026-05-26",
      type: "runoff",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-04-27",
      url: "https://www.votetexas.gov/register-to-vote/",
    },
    byMail: { deadline: "2026-04-27", sincePostmarked: true },
    inPerson: { deadline: "2026-04-27", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-05-11",
    endDate: "2026-05-22",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited in voting room.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

function streamResponse(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`),
      );
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
        ),
      );
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function renderChatPanel() {
  return render(
    <LanguageProvider>
      <ChatPanel state={txState} zipCode="73301" />
    </LanguageProvider>,
  );
}

describe("ChatPanel", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(
        "## Ballot status\nYour county election office has your exact ballot.",
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the question input before the printout button", async () => {
    renderChatPanel();

    const input = await screen.findByTestId("chat-input");
    const printout = await screen.findByRole("button", {
      name: /Generate my printout/i,
    });

    expect(screen.getByText("Ask a question")).toBeInTheDocument();
    expect(
      input.compareDocumentPosition(printout) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not render first-response status or region cards", async () => {
    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByText("Ballot status")).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Voter File Initialized"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("State of Texas")).not.toBeInTheDocument();
    expect(screen.queryByText("[CANDIDATES]")).not.toBeInTheDocument();
    expect(screen.queryByText("[PROPOSITION]")).not.toBeInTheDocument();
  });
});
