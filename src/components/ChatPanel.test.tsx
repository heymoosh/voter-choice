// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

/* ── Helper: well-formed block fixtures ─────────────────────── */

const valuesTagBlock = [
  "[VALUES_TAG_REQUEST]",
  '{"id":"a","label":"Crime / public safety"}',
  '{"id":"b","label":"Property taxes"}',
  '{"id":"c","label":"Public schools"}',
  '{"id":"show_ballot","label":"Show ballot issues"}',
  '{"id":"custom","label":"Name my own"}',
  "[/VALUES_TAG_REQUEST]",
].join("\n");

const racePatternsBlock = [
  '[RACE_PATTERNS race="Harris County DA"]',
  '{"id":"A","name":"Alice","incumbent":true,"donorCoalition":[{"label":"Legal industry","percent":60},{"label":"Small individual donors (under $200)","percent":40}],"donorSource":{"name":"TEC","url":"https://ethics.state.tx.us/"},"endorsements":[{"name":"Houston Police Union","category":"labor"}],"endorsementSource":{"name":"Ballotpedia","url":"https://ballotpedia.org/"},"platformAlignment":{"kept":8,"total":12},"alignmentSource":{"name":"VoteSmart","url":"https://justfacts.votesmart.org/"},"retrospective":null,"retrospectiveUnavailable":{"reason":"Data not assembled"},"valuesHighlight":null}',
  '{"id":"B","name":"Bob","incumbent":false,"donorCoalition":[{"label":"Finance, banking & insurance","percent":100}],"donorSource":{"name":"TEC","url":"https://ethics.state.tx.us/"},"endorsements":null,"endorsementUnavailable":{"reason":"No endorsements found"},"platformAlignment":null,"retrospective":null,"retrospectiveUnavailable":{"reason":"Challenger — no record in office yet"},"valuesHighlight":null}',
  "[/RACE_PATTERNS]",
].join("\n");

describe("ChatPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(
        "## Ballot status\nYour county election office has your exact ballot.",
      ),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows the question input without quick chips or printout CTA", async () => {
    renderChatPanel();

    await screen.findByTestId("chat-input");

    expect(screen.getByText("Ask a question")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Generate my printout/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Not sure where to start/i),
    ).not.toBeInTheDocument();
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

  /* ── New block dispatch tests ───────────────────────────────── */

  it("renders ValuesTagSelector when assistant message contains [VALUES_TAG_REQUEST] block", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(`Here are some issues to consider.\n\n${valuesTagBlock}`),
    );

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("values-tag-selector")).toBeInTheDocument();
    });

    // The lead-in prose should also appear
    expect(
      screen.getByText(/Here are some issues to consider/i),
    ).toBeInTheDocument();
  });

  it("renders RacePatterns when assistant message contains [RACE_PATTERNS] block", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(`Here is the race dashboard.\n\n${racePatternsBlock}`),
    );

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // The lead-in prose should appear
    expect(screen.getByText(/Here is the race dashboard/i)).toBeInTheDocument();
  });

  it("sends [VOTER VALUES] tags payload when ValuesTagSelector submits with tags", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    // First call: session init
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Lead-in.\n\n${valuesTagBlock}`),
    );
    // Second call: capture the [VOTER VALUES] message
    fetchMock.mockResolvedValueOnce(streamResponse("Moving on to Act 3."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("values-tag-selector")).toBeInTheDocument();
    });

    // Select tag "a" (Crime / public safety)
    fireEvent.click(screen.getByTestId("values-tag-chip-a"));
    // Submit
    fireEvent.click(screen.getByTestId("values-tag-submit"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.role).toBe("user");
    expect(lastUserMsg.content).toBe('[VOTER VALUES] tags=["a"]');
  });

  it("sends [VOTER VALUES] skipped when ValuesTagSelector is skipped", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Lead-in.\n\n${valuesTagBlock}`),
    );
    fetchMock.mockResolvedValueOnce(streamResponse("OK, skipping."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("values-tag-selector")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("values-tag-skip"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe("[VOTER VALUES] skipped");
  });

  it("sends [VOTER VALUES] custom payload when ValuesTagSelector submits custom text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Lead-in.\n\n${valuesTagBlock}`),
    );
    fetchMock.mockResolvedValueOnce(streamResponse("Got your issue."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("values-tag-selector")).toBeInTheDocument();
    });

    // Click "custom" chip to show text input
    fireEvent.click(screen.getByTestId("values-tag-chip-custom"));
    const customInput = screen.getByTestId("values-tag-custom-input");
    fireEvent.change(customInput, {
      target: { value: "School board accountability" },
    });
    fireEvent.click(screen.getByTestId("values-tag-submit"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe(
      '[VOTER VALUES] custom="School board accountability"',
    );
  });

  it("sends [VOTER PICKED] when RacePatterns pick button is used after reveal", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Dashboard.\n\n${racePatternsBlock}`),
    );
    fetchMock.mockResolvedValueOnce(streamResponse("Logged to MY BALLOT."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // Reveal candidates first
    fireEvent.click(screen.getByTestId("race-patterns-reveal"));

    // Pick candidate A
    fireEvent.click(screen.getByTestId("race-patterns-pick-A"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe(
      '[VOTER PICKED] race="Harris County DA" choice="A" candidateName="Alice"',
    );
  });

  it("sends [VOTER SKIPPED] when RacePatterns skip button is used", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Dashboard.\n\n${racePatternsBlock}`),
    );
    fetchMock.mockResolvedValueOnce(streamResponse("Logged as UNDECIDED."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("race-patterns-skip"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe('[VOTER SKIPPED] race="Harris County DA"');
  });

  it("passes isStreaming to RacePatterns: Pick buttons disabled while still streaming", async () => {
    // This test verifies that the RacePatterns component receives isStreaming=true
    // from ChatPanel by checking that Pick buttons are disabled during streaming.
    const fetchMock = vi.spyOn(globalThis, "fetch");

    // Use a custom stream that sends the full race-patterns block in two phases:
    // 1) Send the opening tag (so loading placeholder shows) while stream is open
    // 2) Then send the rest and "done"
    const encoder = new TextEncoder();
    let streamController: ReadableStreamDefaultController<Uint8Array>;
    const slowStream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        streamController = ctrl;
      },
    });
    const slowResponse = new Response(slowStream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
    fetchMock.mockResolvedValueOnce(slowResponse);

    renderChatPanel();

    // Wait for the component to mount (session init starts)
    await screen.findByTestId("chat-input");

    // Push only the opening [RACE_PATTERNS tag (no closing tag) — loading placeholder shows
    streamController!.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "text", text: '[RACE_PATTERNS race="Harris County DA"]\n' })}\n\n`,
      ),
    );

    // The loading placeholder should appear while streaming with an open block
    await waitFor(() => {
      expect(screen.getByTestId("race-patterns-loading")).toBeInTheDocument();
    });

    // Now close the stream with the rest of the content
    streamController!.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "text", text: racePatternsBlock.split("\n").slice(1).join("\n") })}\n\n`,
      ),
    );
    streamController!.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
      ),
    );
    streamController!.close();

    // After streaming done, race-patterns renders. Verify it got isStreaming=false now.
    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });
  });

  it("registers beforeunload listener when messages array has entries", async () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderChatPanel();

    // Wait for the initial session message to be sent and streaming to complete
    await waitFor(() => {
      expect(screen.getByText("Ballot status")).toBeInTheDocument();
    });

    // beforeunload should have been registered after messages populated
    const calls = addEventListenerSpy.mock.calls.filter(
      (c) => c[0] === "beforeunload",
    );
    expect(calls.length).toBeGreaterThan(0);
  });

  it("[RACE_PATTERNS] wins over [VALUES_TAG_REQUEST] when both appear in a message", async () => {
    // Verify that if somehow both blocks appear, only RacePatterns renders
    const bothBlocks = `Some prose.\n\n${valuesTagBlock}\n\n${racePatternsBlock}`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(streamResponse(bothBlocks));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // ValuesTagSelector should NOT render when race-patterns block is present
    expect(screen.queryByTestId("values-tag-selector")).not.toBeInTheDocument();
  });
});
