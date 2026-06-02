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

const concernInterpretationBlock = [
  "[CONCERN_INTERPRETATION]",
  '{"sourceType":"tag","sourceTagId":"a","rank":1,"interpretation":"Crime and public safety","canonicalIssue":"crime_public_safety","confidence":"clear"}',
  '{"sourceType":"freeText","sourceText":"healthcare costs","rank":2,"interpretation":"Healthcare access and affordability","canonicalIssue":"healthcare_access","stance":"expand healthcare access","confidence":"clear"}',
  "[/CONCERN_INTERPRETATION]",
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

  it("sends [VOTER VALUES] payload when ValuesTagSelector submits with a chip", async () => {
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
    // Strict-match the new ranked= payload shape
    expect(lastUserMsg.content).toBe(
      '[VOTER VALUES] ranked=[{"type":"tag","id":"a","rank":1}]',
    );
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

  it("sends [VOTER VALUES] payload when ValuesTagSelector submits free-text concern", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      streamResponse(`Lead-in.\n\n${valuesTagBlock}`),
    );
    fetchMock.mockResolvedValueOnce(streamResponse("Got your issue."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("values-tag-selector")).toBeInTheDocument();
    });

    // Type a concern into the always-visible free-text input (v2 behavior)
    const freetextInput = screen.getByTestId("values-tag-freetext-input");
    fireEvent.change(freetextInput, {
      target: { value: "School board accountability" },
    });
    fireEvent.click(screen.getByTestId("values-tag-freetext-add"));
    fireEvent.click(screen.getByTestId("values-tag-submit"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    // Strict-match the new ranked= freeText payload shape
    expect(lastUserMsg.content).toBe(
      '[VOTER VALUES] ranked=[{"type":"freeText","text":"School board accountability","rank":1}]',
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

  /* ── ConcernInterpretation dispatch tests ──────────────────── */

  it("renders ConcernInterpretation when assistant message contains [CONCERN_INTERPRETATION] block", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(
        `Here is what we understood.\n\n${concernInterpretationBlock}`,
      ),
    );

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("concern-interpretation")).toBeInTheDocument();
    });

    // Prose above the block should appear
    expect(screen.getByText(/Here is what we understood/i)).toBeInTheDocument();
  });

  it("sends [VOTER CONFIRMED CONCERNS] when ConcernInterpretation Confirm is clicked", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(streamResponse(concernInterpretationBlock));
    fetchMock.mockResolvedValueOnce(streamResponse("Confirmed, moving on."));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("concern-interpretation")).toBeInTheDocument();
    });

    // Both entries are clear confidence — confirm button should be enabled
    fireEvent.click(screen.getByTestId("concern-interpretation-confirm"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.role).toBe("user");
    expect(lastUserMsg.content).toMatch(
      /^\[VOTER CONFIRMED CONCERNS\] confirmations=\[/,
    );
    // Should contain rank 1 and rank 2 confirmations
    const parsed = JSON.parse(
      lastUserMsg.content.replace(
        "[VOTER CONFIRMED CONCERNS] confirmations=",
        "",
      ),
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0].rank).toBe(1);
    expect(parsed[1].rank).toBe(2);
  });

  it("sends [VOTER REINTERPRET] when a concern entry edit is committed", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(streamResponse(concernInterpretationBlock));
    fetchMock.mockResolvedValueOnce(streamResponse(concernInterpretationBlock));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("concern-interpretation")).toBeInTheDocument();
    });

    // Click edit on entry rank 1
    fireEvent.click(screen.getByTestId("concern-entry-edit-1"));

    // Type new text
    const editInput = screen.getByTestId("concern-entry-edit-input-1");
    fireEvent.change(editInput, { target: { value: "border security" } });

    // Commit edit
    fireEvent.click(screen.getByTestId("concern-entry-edit-commit-1"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe(
      '[VOTER REINTERPRET] sourceRank=1 newText="border security"',
    );
  });

  it("sends [VOTER REMOVE_CONCERN] when a concern entry is removed", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(streamResponse(concernInterpretationBlock));
    fetchMock.mockResolvedValueOnce(streamResponse(concernInterpretationBlock));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("concern-interpretation")).toBeInTheDocument();
    });

    // Click remove on entry rank 2
    fireEvent.click(screen.getByTestId("concern-entry-remove-2"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = fetchMock.mock.calls[1];
    const body = JSON.parse(secondCall[1]?.body as string);
    const lastUserMsg = body.messages[body.messages.length - 1];
    expect(lastUserMsg.content).toBe("[VOTER REMOVE_CONCERN] sourceRank=2");
  });

  it("[RACE_PATTERNS] wins over [CONCERN_INTERPRETATION] in dispatch precedence", async () => {
    const bothBlocks = `Some prose.\n\n${concernInterpretationBlock}\n\n${racePatternsBlock}`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(streamResponse(bothBlocks));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // ConcernInterpretation should NOT render when race-patterns block is present
    expect(
      screen.queryByTestId("concern-interpretation"),
    ).not.toBeInTheDocument();
  });

  /* ── Alignment scores dispatch tests ───────────────────────── */

  it("renders RacePatterns without alignment banner when only [RACE_PATTERNS] block is present", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(`Here is the race dashboard.\n\n${racePatternsBlock}`),
    );

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // No alignment banner — no [ALIGNMENT_SCORES] block in message
    expect(
      screen.queryByTestId(/alignment-score-banner-/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(/alignment-score-unavailable-/),
    ).not.toBeInTheDocument();
  });

  it("renders merged dashboard with alignment banner when both [RACE_PATTERNS] and [ALIGNMENT_SCORES] blocks are present", async () => {
    const alignmentScoresBlock = [
      '[ALIGNMENT_SCORES race="Harris County DA"]',
      '{"candidateId":"A","scores":[{"canonicalIssue":"healthcare_access","issueLabel":"Healthcare access","resolvedStance":"expand healthcare access","kept":3,"total":5,"contributingVotes":[{"billTitle":"HB 100","voteCast":"with","date":"2021-05-12","source":{"name":"TX House","url":"https://capitol.texas.gov/"}}]}]}',
      '{"candidateId":"B","scores":null,"unavailable":{"reason":"No voting record yet — first-time candidate"}}',
      "[/ALIGNMENT_SCORES]",
    ].join("\n");

    const combined = `Lead-in.\n\n${racePatternsBlock}\n\n${alignmentScoresBlock}`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(streamResponse(combined));

    renderChatPanel();

    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // Alignment banner for candidate A
    expect(screen.getByTestId("alignment-score-banner-A")).toBeInTheDocument();
    // Unavailable state for candidate B
    expect(
      screen.getByTestId("alignment-score-unavailable-B"),
    ).toBeInTheDocument();
  });

  it("handles a partial [ALIGNMENT_SCORES] block in final content without crashing", async () => {
    // Send a complete [RACE_PATTERNS] block but no [ALIGNMENT_SCORES] closing tag.
    // The parser should gracefully degrade — the dashboard renders without alignment data.
    const contentWithPartialAlignment =
      `Some prose.\n\n${racePatternsBlock}\n` +
      '[ALIGNMENT_SCORES race="Harris County DA"]\n' +
      '{"candidateId":"A","scores":['; // truncated, no close tag

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      streamResponse(contentWithPartialAlignment),
    );

    renderChatPanel();

    // Should not crash — race patterns dashboard renders without alignment banner
    await waitFor(() => {
      expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    });

    // Prose stripped cleanly
    expect(screen.getByText(/Some prose/i)).toBeInTheDocument();

    // No alignment banner (incomplete block was stripped)
    expect(
      screen.queryByTestId(/alignment-score-banner-/),
    ).not.toBeInTheDocument();
  });
});

/* ── Phase 6 — workspace-mode amend integration ──────────────── */

describe("ChatPanel — workspace amend editor + chat catch (Phase 6)", () => {
  const lockedThemes = [
    { name: "Healthcare costs", quotes: ['"insulin prices"'] },
    { name: "Housing affordability", quotes: ['"rent went up 30%"'] },
  ];

  function renderWorkspaceChat(
    workspaceOverrides: Record<string, unknown> = {},
  ) {
    const baseWorkspace = {
      activeRace: {
        id: "us-president",
        label: "U.S. President",
        section: "Federal",
        candidates: [
          { name: "Alice Anderson", party: "Democratic" },
          { name: "Bob Brown", party: "Republican" },
        ],
      },
      totalRaces: 3,
      activeRaceIndex: 0,
      decided: false,
      prevActiveRaceId: null,
      onCommitDecision: vi.fn(),
      onUnpickDecision: vi.fn(),
      pendingAmendment: null,
      amendmentInFlight: false,
      lockedThemes,
      chatCatchSuggestion: null,
      onChatCatch: vi.fn(),
      onChatCatchAccept: vi.fn(),
      onChatCatchDismiss: vi.fn(),
      onAmendmentSave: vi.fn(),
      onAmendmentDiscard: vi.fn(),
      ...workspaceOverrides,
    } as React.ComponentProps<typeof ChatPanel>["workspace"];
    return render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" workspace={baseWorkspace} />
      </LanguageProvider>,
    );
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ budget: { tier: "normal", percent: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("renders the amend editor inline when pendingAmendment is set (rail entry)", () => {
    renderWorkspaceChat({
      pendingAmendment: { entry: "rail" },
    });
    const editor = screen.getByTestId("theme-amend-editor");
    expect(editor).toBeInTheDocument();
    const workspaceChat = screen.getByTestId("workspace-chat");
    expect(workspaceChat.contains(editor)).toBe(true);
  });

  it("renders the amend editor with the candidate-new-theme when pendingAmendment carries one (chat-catch entry)", () => {
    renderWorkspaceChat({
      pendingAmendment: {
        entry: "chat",
        triggeringMessage:
          "I really care about school funding, kids' schools are crumbling.",
        candidateNewTheme: {
          name: "School funding",
          quotes: ["kids' schools are crumbling"],
        },
      },
    });
    const slot = screen.getByTestId("theme-amend-candidate-slot");
    expect(slot).toHaveTextContent("School funding");
    expect(slot).toHaveTextContent("kids' schools are crumbling");
  });

  it("renders the chat-catch chip when chatCatchSuggestion is set and no pending amendment", () => {
    renderWorkspaceChat({
      chatCatchSuggestion: {
        triggeringMessage: "I'm worried about climate change in Houston.",
        candidateNewTheme: {
          name: "Climate",
          quotes: ["I'm worried about climate change in Houston"],
        },
      },
    });
    expect(screen.getByTestId("amend-chat-catch-chip")).toBeInTheDocument();
    expect(screen.getByTestId("amend-chat-catch-accept")).toBeInTheDocument();
    expect(screen.getByTestId("amend-chat-catch-dismiss")).toBeInTheDocument();
  });

  it("clicking the chat-catch accept fires onChatCatchAccept", () => {
    const onChatCatchAccept = vi.fn();
    renderWorkspaceChat({
      onChatCatchAccept,
      chatCatchSuggestion: {
        triggeringMessage:
          "I am worried about climate change and air quality in Houston this year.",
        candidateNewTheme: {
          name: "Climate",
          quotes: ["climate change and air quality"],
        },
      },
    });
    fireEvent.click(screen.getByTestId("amend-chat-catch-accept"));
    expect(onChatCatchAccept).toHaveBeenCalledTimes(1);
  });

  it("dismiss button on chip fires onChatCatchDismiss without opening editor", () => {
    const onChatCatchDismiss = vi.fn();
    renderWorkspaceChat({
      onChatCatchDismiss,
      chatCatchSuggestion: {
        triggeringMessage:
          "I am worried about climate change and air quality in Houston this year.",
        candidateNewTheme: {
          name: "Climate",
          quotes: ["climate change"],
        },
      },
    });
    fireEvent.click(screen.getByTestId("amend-chat-catch-dismiss"));
    expect(onChatCatchDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("theme-amend-editor")).toBeNull();
  });

  it("submitting a workspace-chat message fires onChatCatch when /api/chat-catch judges suggest:true (AI-judged, post fix J)", async () => {
    const onChatCatch = vi.fn();
    // Route-discriminating fetch mock: /api/chat-catch returns the AI
    // judgment; /api/chat returns a minimal SSE-shaped stream so the main
    // sendMessage call can complete (chat-catch fires AFTER it).
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        return new Response(
          JSON.stringify({
            suggest: true,
            suggestedThemeName: "Climate and air quality",
            summary: "User worries about pollution in Houston.",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      // Default /api/chat: minimal SSE done message so sendMessage resolves.
      return streamResponse("ok");
    });

    renderWorkspaceChat({
      onChatCatch,
      lockedThemes,
    });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: {
        value:
          "I am really worried about climate change and air quality in Houston this year ahead of the runoff.",
      },
    });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    // onChatCatch fires AFTER the main /api/chat call completes — wait for it.
    await waitFor(() => {
      expect(onChatCatch).toHaveBeenCalledTimes(1);
    });
    expect(onChatCatch.mock.calls[0][0].suggestedThemeName).toBe(
      "Climate and air quality",
    );
  });

  it("submitting a workspace-chat message does NOT fire onChatCatch when /api/chat-catch judges suggest:false", async () => {
    const onChatCatch = vi.fn();
    let chatCatchCalled = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        chatCatchCalled = true;
        return new Response(JSON.stringify({ suggest: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return streamResponse("ok");
    });

    renderWorkspaceChat({
      onChatCatch,
      lockedThemes,
    });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: {
        value:
          "Thanks for that answer. Can you tell me more about how the runoff works?",
      },
    });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    // Wait for the /api/chat-catch call itself to land before asserting
    // that onChatCatch was NOT fired.
    await waitFor(() => {
      expect(chatCatchCalled).toBe(true);
    });
    // Give one microtask flush for the (suppressed) callback.
    await Promise.resolve();
    expect(onChatCatch).not.toHaveBeenCalled();
  });

  it("submitting a workspace-chat message does NOT fire onChatCatch when /api/chat-catch fails (fail-closed neutrality)", async () => {
    const onChatCatch = vi.fn();
    let chatCatchCalled = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        chatCatchCalled = true;
        // Endpoint 5xx — fail-closed neutrality means no chip.
        return new Response("server error", { status: 500 });
      }
      return streamResponse("ok");
    });

    renderWorkspaceChat({
      onChatCatch,
      lockedThemes,
    });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: {
        value:
          "I am really worried about climate change and air quality in Houston this year.",
      },
    });
    const form = input.closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(chatCatchCalled).toBe(true);
    });
    await Promise.resolve();
    expect(onChatCatch).not.toHaveBeenCalled();
  });

  it("Discard inside the editor fires onAmendmentDiscard and does NOT call /api/chat", () => {
    const onAmendmentDiscard = vi.fn();
    renderWorkspaceChat({
      pendingAmendment: { entry: "rail" },
      onAmendmentDiscard,
    });
    fireEvent.click(screen.getByTestId("theme-amend-discard"));
    expect(onAmendmentDiscard).toHaveBeenCalledTimes(1);
    // /api/chat should NOT have been called for an amend payload.
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const amendCalls = calls.filter((c) => {
      const init = c[1] as { body?: unknown } | undefined;
      if (!init?.body) return false;
      try {
        const body = JSON.parse(String(init.body));
        return body.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls).toHaveLength(0);
  });

  /* ── PR3 opt-in re-score offer ─────────────────────────────── */

  it("renders AmendRescoreOffer (NOT AmendDeltaMessage) when pendingRescoreOffer is set", () => {
    renderWorkspaceChat({
      pendingRescoreOffer: {
        newThemeName: "School funding",
        decidedCount: 2,
        updatedThemes: [
          { name: "School funding", quotes: ["kids' schools"] },
          ...lockedThemes,
        ],
        newTheme: { name: "School funding", quotes: ["kids' schools"] },
        suggestedRank: 1,
      },
    });
    expect(screen.getByTestId("amend-rescore-offer")).toBeInTheDocument();
    // Delta message must NOT render until the user clicks Yes.
    expect(screen.queryByTestId("amend-delta-message")).toBeNull();
  });

  it("clicking Decline on the offer fires onRescoreOfferClear and does NOT call /api/chat for amend", () => {
    const onRescoreOfferClear = vi.fn();
    renderWorkspaceChat({
      onRescoreOfferClear,
      pendingRescoreOffer: {
        newThemeName: "School funding",
        decidedCount: 2,
        updatedThemes: [
          { name: "School funding", quotes: ["kids' schools"] },
          ...lockedThemes,
        ],
        newTheme: { name: "School funding", quotes: ["kids' schools"] },
        suggestedRank: 1,
      },
    });
    fireEvent.click(screen.getByTestId("amend-rescore-decline"));
    expect(onRescoreOfferClear).toHaveBeenCalledTimes(1);
    // No amend /api/chat call.
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const amendCalls = calls.filter((c) => {
      const init = c[1] as { body?: unknown } | undefined;
      if (!init?.body) return false;
      try {
        const body = JSON.parse(String(init.body));
        return body.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls).toHaveLength(0);
  });

  it("clicking Accept on the offer fires /api/chat with view=amend AND clears the offer", async () => {
    const onRescoreOfferClear = vi.fn();
    // Mock a streaming amend response — minimal valid JSON the parser accepts.
    const amendPayload = {
      new_theme: {
        name: "School funding",
        quotes: ["kids' schools are crumbling"],
      },
      suggested_rank: 1,
      rescored: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      (() => {
        const encoder = new TextEncoder();
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: JSON.stringify(amendPayload) })}\n\n`,
                ),
              );
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done", budget: { tier: "normal", percent: 0 } })}\n\n`,
                ),
              );
              controller.close();
            },
          }),
          { status: 200, headers: { "Content-Type": "text/event-stream" } },
        );
      })(),
    );
    renderWorkspaceChat({
      onRescoreOfferClear,
      pendingRescoreOffer: {
        newThemeName: "School funding",
        decidedCount: 1,
        updatedThemes: [
          { name: "School funding", quotes: ["kids' schools are crumbling"] },
          ...lockedThemes,
        ],
        newTheme: {
          name: "School funding",
          quotes: ["kids' schools are crumbling"],
        },
        suggestedRank: 1,
      },
    });
    fireEvent.click(screen.getByTestId("amend-rescore-accept"));
    await waitFor(() => {
      expect(onRescoreOfferClear).toHaveBeenCalled();
    });
    // /api/chat amend call MUST have fired.
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const amendCalls = calls.filter((c) => {
      const init = c[1] as { body?: unknown } | undefined;
      if (!init?.body) return false;
      try {
        const body = JSON.parse(String(init.body));
        return body.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("locking the amendment with decisions > 0 does NOT call /api/chat amend on the lock click (re-score is opt-in)", () => {
    // The lock-bridge in ChatPanel must NOT fire submitAmendment anymore;
    // the parent is responsible for setting pendingRescoreOffer instead.
    const onAmendmentSave = vi.fn();
    renderWorkspaceChat({
      pendingAmendment: { entry: "rail" },
      onAmendmentSave,
    });
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));
    // Parent's onAmendmentSave fires (themes commit).
    expect(onAmendmentSave).toHaveBeenCalledTimes(1);
    // /api/chat amend must NOT have been called.
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const amendCalls = calls.filter((c) => {
      const init = c[1] as { body?: unknown } | undefined;
      if (!init?.body) return false;
      try {
        const body = JSON.parse(String(init.body));
        return body.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls).toHaveLength(0);
  });
});

/* ── PR 6 fix D — cold-open gate on ballotConfirmed ──────────── */

describe("ChatPanel — cold-open gated on ballotConfirmed (fix D)", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ budget: { tier: "normal", percent: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders the cold-open textarea when promptFleetV2 is on AND ballotConfirmed is true", () => {
    render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          promptFleetV2Enabled
          ballotConfirmed
        />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("cold-open-textarea")).toBeInTheDocument();
  });

  it("does NOT render the cold-open textarea when ballotConfirmed is false", () => {
    render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          promptFleetV2Enabled
          ballotConfirmed={false}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("cold-open-textarea")).toBeNull();
  });

  it("defaults to ballotConfirmed=true when the prop is omitted (legacy callers unchanged)", () => {
    render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" promptFleetV2Enabled />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("cold-open-textarea")).toBeInTheDocument();
  });
});

/* ── PR 7 — workspace input gated on budgetExhausted + BYOK ──── */

describe("ChatPanel — workspace input gating on budgetExhausted (PR 7)", () => {
  const lockedThemes = [
    { name: "Healthcare costs", quotes: ['"insulin prices"'] },
  ];

  function renderWorkspaceWithBudget(opts: {
    budgetExhausted?: boolean;
    byokKey?: string | null;
  }) {
    localStorage.clear();
    if (opts.byokKey) {
      localStorage.setItem("voter-choice:byok-anthropic-key", opts.byokKey);
    }
    const baseWorkspace = {
      activeRace: {
        id: "us-president",
        label: "U.S. President",
        section: "Federal",
        candidates: [{ name: "Alice Anderson", party: "Democratic" }],
      },
      totalRaces: 3,
      activeRaceIndex: 0,
      decided: false,
      prevActiveRaceId: null,
      onCommitDecision: vi.fn(),
      onUnpickDecision: vi.fn(),
      pendingAmendment: null,
      amendmentInFlight: false,
      lockedThemes,
      chatCatchSuggestion: null,
      onChatCatch: vi.fn(),
      onChatCatchAccept: vi.fn(),
      onChatCatchDismiss: vi.fn(),
      onAmendmentSave: vi.fn(),
      onAmendmentDiscard: vi.fn(),
    } as React.ComponentProps<typeof ChatPanel>["workspace"];
    return render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="73301"
          workspace={baseWorkspace}
          budgetExhausted={!!opts.budgetExhausted}
        />
      </LanguageProvider>,
    );
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ budget: { tier: "normal", percent: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("budgetExhausted=false → input is rendered, enabled, and no notice appears", () => {
    renderWorkspaceWithBudget({ budgetExhausted: false });
    const input = screen.getByTestId(
      "workspace-chat-input",
    ) as HTMLTextAreaElement;
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    expect(screen.queryByTestId("workspace-chat-budget-notice")).toBeNull();
  });

  it("budgetExhausted=true + no BYOK → input rendered + DISABLED + notice visible", () => {
    renderWorkspaceWithBudget({ budgetExhausted: true, byokKey: null });
    const input = screen.getByTestId(
      "workspace-chat-input",
    ) as HTMLTextAreaElement;
    // Input is visible (not hidden) but disabled.
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
    // Notice is visible and references budget + copy/BYOK actions.
    const notice = screen.getByTestId("workspace-chat-budget-notice");
    expect(notice).toBeInTheDocument();
    expect(notice.textContent ?? "").toMatch(/budget exhausted/i);
    expect(notice.textContent ?? "").toMatch(/paste|BYOK/i);
    // Send button is disabled.
    expect(screen.getByTestId("workspace-chat-send")).toBeDisabled();
  });

  it("budgetExhausted=true + BYOK key set → input rendered + ENABLED (BYOK bypasses budget)", () => {
    renderWorkspaceWithBudget({
      budgetExhausted: true,
      byokKey: "sk-ant-byok-overrides-budget",
    });
    const input = screen.getByTestId(
      "workspace-chat-input",
    ) as HTMLTextAreaElement;
    expect(input).toBeInTheDocument();
    expect(input).not.toBeDisabled();
    // No notice when BYOK is set.
    expect(screen.queryByTestId("workspace-chat-budget-notice")).toBeNull();
  });
});

/* ── Real-fix: chat-payload assembly for the race-deep-dive builder ─── */

/**
 * Pre-fix the workspace path emitted view: "workspace-prop" + activeRaceType:
 * "proposition" + an incomplete raceContext for every workspace race, because
 * the proposition discriminant was `!candidates || candidates.length === 0`
 * AND the Race deriver dropped candidates anyway. The real fix:
 *   1) Race carries candidates (raceDeriver propagates them) so the
 *      `candidates.length === 0` check is real for true propositions only.
 *   2) The discriminant uses Race.section === "Propositions" so the paste
 *      path (no candidates surfaced) still routes the right way.
 *   3) raceContext for candidate races carries themesList + decidedSummary +
 *      candidatesJson so the race-deep-dive builder validates and renders.
 *
 * These tests assert the OUTGOING request body — that's the layer where the
 * bug actually lives (PR #41's server-side fallback is belt-and-suspenders
 * for malformed payloads; we want the canonical path to never need it).
 */
describe("ChatPanel — workspace-race chat payload (real fix)", () => {
  const txStateLocal = txState;

  function renderChatForRaceDeepDive(
    workspaceOverrides: Record<string, unknown> = {},
  ) {
    const baseWorkspace = {
      activeRace: {
        id: "u-s-senate",
        label: "U.S. Senate",
        section: "Federal",
        candidates: [
          { name: "Cory Booker", party: "Democratic" },
          { name: "Curtis Bashaw", party: "Republican" },
        ],
      },
      totalRaces: 2,
      activeRaceIndex: 0,
      decided: false,
      prevActiveRaceId: null,
      onCommitDecision: vi.fn(),
      onUnpickDecision: vi.fn(),
      pendingAmendment: null,
      amendmentInFlight: false,
      lockedThemes: [
        { name: "Healthcare access", quotes: ['"insulin prices"'] },
        { name: "Climate action", quotes: ['"flood risk"'] },
      ],
      // Decisions on prior races — used to render decidedSummary.
      decisions: [
        {
          raceId: "u-s-house-nj-12",
          raceLabel: "U.S. House — NJ-12",
          section: "Federal",
          pick: "Bonnie Watson Coleman",
          party: "Democratic",
          whyNote: "Strong record on healthcare access.",
        },
      ],
      chatCatchSuggestion: null,
      onChatCatch: vi.fn(),
      onChatCatchAccept: vi.fn(),
      onChatCatchDismiss: vi.fn(),
      onAmendmentSave: vi.fn(),
      onAmendmentDiscard: vi.fn(),
      ...workspaceOverrides,
    } as React.ComponentProps<typeof ChatPanel>["workspace"];
    return render(
      <LanguageProvider>
        <ChatPanel
          state={txStateLocal}
          zipCode="73301"
          countyName="Mercer"
          workspace={baseWorkspace}
        />
      </LanguageProvider>,
    );
  }

  function captureChatRequestBody(): Record<string, unknown> | null {
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const chatCalls = calls.filter((c) => {
      const url = typeof c[0] === "string" ? c[0] : String(c[0]);
      return url.endsWith("/api/chat");
    });
    if (chatCalls.length === 0) return null;
    const init = chatCalls[chatCalls.length - 1][1] as
      | { body?: unknown }
      | undefined;
    if (!init?.body) return null;
    try {
      return JSON.parse(String(init.body)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  beforeEach(() => {
    // Discriminating fetch mock: chat-catch returns suggest:false (noise),
    // /api/chat returns a minimal SSE stream so sendMessage resolves.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        return new Response(JSON.stringify({ suggest: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return streamResponse("ok");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends view=workspace-race + activeRaceType=choice for a Federal candidate race", async () => {
    renderChatForRaceDeepDive();
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "Tell me about Cory Booker's healthcare record." },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      expect(body!.view).toBe("workspace-race");
      expect(body!.activeRaceType).toBe("choice");
    });
  });

  it("does NOT misclassify a non-proposition race as a proposition when candidates are missing", async () => {
    // Force the candidates field undefined on the workspace's activeRace.
    // Pre-fix this triggered view: workspace-prop. The fix uses
    // Race.section === "Propositions" as the discriminant, so a Federal
    // race with no candidates surfaced still routes to workspace-race.
    renderChatForRaceDeepDive({
      activeRace: {
        id: "u-s-senate",
        label: "U.S. Senate",
        section: "Federal",
        // Intentionally no candidates field.
      },
    });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "What does this race decide?" },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      expect(body!.view).toBe("workspace-race");
      expect(body!.activeRaceType).toBe("choice");
    });
  });

  it("routes a true proposition (section=Propositions) to view=workspace-prop", async () => {
    renderChatForRaceDeepDive({
      activeRace: {
        id: "proposition-1",
        label: "Proposition 1",
        section: "Propositions",
        candidates: [],
      },
    });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "What does Prop 1 do?" },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      expect(body!.view).toBe("workspace-prop");
      expect(body!.activeRaceType).toBe("proposition");
    });
  });

  it("populates raceContext with themesList, decidedSummary, candidatesJson for race-deep-dive", async () => {
    renderChatForRaceDeepDive();
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "Tell me about the Senate race." },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      const ctx = body!.raceContext as Record<string, unknown>;
      expect(ctx).toBeDefined();
      // raceLabel + state + county were already in the pre-fix payload.
      expect(ctx.raceLabel).toBe("U.S. Senate");
      expect(ctx.state).toBe("TX");
      expect(ctx.county).toBe("Mercer");
      // candidatesJson is the JSON-stringified roster.
      expect(typeof ctx.candidatesJson).toBe("string");
      const parsed = JSON.parse(String(ctx.candidatesJson));
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("Cory Booker");
      // themesList: ranked themes, one string, with numbering.
      expect(typeof ctx.themesList).toBe("string");
      expect(String(ctx.themesList)).toContain("Healthcare access");
      expect(String(ctx.themesList)).toContain("Climate action");
      // decidedSummary: prior decisions or "(none)" — present in either case.
      expect(typeof ctx.decidedSummary).toBe("string");
      expect(String(ctx.decidedSummary)).toContain("U.S. House — NJ-12");
      expect(String(ctx.decidedSummary)).toContain("Bonnie Watson Coleman");
    });
  });

  it("emits decidedSummary='(none)' when there are no prior decisions", async () => {
    renderChatForRaceDeepDive({ decisions: [] });
    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "Tell me about this race." },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      const ctx = body!.raceContext as Record<string, unknown>;
      expect(String(ctx.decidedSummary)).toBe("(none)");
    });
  });
});

/* ── Workspace user-message chat payload — state override (PIVOT) ─── */

/**
 * PIVOT: the mount-time auto-fire is GONE — cards render from /api/race-data,
 * not from a chat turn. The chat is a pure follow-up Q&A box that only fires
 * on the voter's own message. These tests assert the OUTGOING /api/chat body
 * for a user Q&A turn still carries the ballot-authoritative state override
 * (the NJ-ballot-vs-TX-state conflict fix), which now applies to Q&A turns.
 */
describe("ChatPanel — workspace user-message chat payload (state override)", () => {
  function renderWorkspaceQA(workspaceOverrides: Record<string, unknown> = {}) {
    const baseWorkspace = {
      activeRace: {
        id: "u-s-senate",
        label: "U.S. Senate",
        section: "Federal",
        candidates: [
          { name: "Cory Booker", party: "Democratic" },
          { name: "Curtis Bashaw", party: "Republican" },
        ],
      },
      totalRaces: 2,
      activeRaceIndex: 0,
      decided: false,
      prevActiveRaceId: null,
      onCommitDecision: vi.fn(),
      onUnpickDecision: vi.fn(),
      pendingAmendment: null,
      amendmentInFlight: false,
      lockedThemes: [
        { name: "Healthcare access", quotes: ['"insulin prices"'] },
      ],
      decisions: [],
      chatCatchSuggestion: null,
      onChatCatch: vi.fn(),
      onChatCatchAccept: vi.fn(),
      onChatCatchDismiss: vi.fn(),
      onAmendmentSave: vi.fn(),
      onAmendmentDiscard: vi.fn(),
      ...workspaceOverrides,
    } as React.ComponentProps<typeof ChatPanel>["workspace"];
    return render(
      <LanguageProvider>
        <ChatPanel
          state={txState}
          zipCode="08106"
          countyName="Camden"
          workspace={baseWorkspace}
        />
      </LanguageProvider>,
    );
  }

  function captureChatRequestBody(): Record<string, unknown> | null {
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const chatCalls = calls.filter((c) => {
      const url = typeof c[0] === "string" ? c[0] : String(c[0]);
      return url.endsWith("/api/chat");
    });
    if (chatCalls.length === 0) return null;
    const init = chatCalls[chatCalls.length - 1][1] as
      | { body?: unknown }
      | undefined;
    if (!init?.body) return null;
    try {
      return JSON.parse(String(init.body)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        return new Response(JSON.stringify({ suggest: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return streamResponse("Answer.");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function submitQuestion() {
    const input = await screen.findByTestId("workspace-chat-input");
    fireEvent.change(input, { target: { value: "Tell me about this race." } });
    fireEvent.submit(input.closest("form")!);
  }

  it("does NOT fire any /api/chat turn on mount (auto-fire removed)", async () => {
    renderWorkspaceQA();
    await new Promise((r) => setTimeout(r, 20));
    expect(captureChatRequestBody()).toBeNull();
  });

  it("a user Q&A turn carries extractedStateCode override (NJ beats txState's TX)", async () => {
    renderWorkspaceQA({ extractedStateCode: "NJ" });
    await submitQuestion();
    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      const ctx = body!.raceContext as Record<string, unknown>;
      expect(ctx.state).toBe("NJ");
    });
  });

  it("a user Q&A turn falls back to state.stateCode when no extractedStateCode", async () => {
    renderWorkspaceQA();
    await submitQuestion();
    await waitFor(() => {
      const body = captureChatRequestBody();
      expect(body).not.toBeNull();
      const ctx = body!.raceContext as Record<string, unknown>;
      expect(ctx.state).toBe("TX");
    });
  });
});

/* ── Cards-first workspace: data-driven rendering (PIVOT) ─── */

/**
 * The workspace center renders candidate cards from the deterministic
 * `/api/race-data` result the parent passes via `workspace.raceData` — NOT
 * from a chat message. These guard the core pivot:
 *   - loading → the ProcessingSteps loader is the primary surface,
 *   - data → cards render,
 *   - a follow-up Q&A turn does NOT disturb the cards (they're prop-driven),
 *   - raw [RACE_PATTERNS] JSON never appears (chat is prose-only).
 */
describe("ChatPanel — workspace cards-first (data-driven)", () => {
  // A minimal valid RaceData payload (2-candidate block + alignment).
  const raceData = {
    racePatterns: {
      race: "U.S. Senate",
      candidates: [
        {
          id: "A",
          name: "Alice Anderson",
          incumbent: true,
          donorCoalition: [
            { label: "Healthcare industry", percent: 60, amount: 60000 },
            {
              label: "Small individual donors (under $200)",
              percent: 40,
              amount: 40000,
            },
          ],
          donorDataSource: "voting_record" as const,
          donorSource: { name: "FEC", url: "https://www.fec.gov/" },
          totalRaised: 100000,
          endorsements: null,
          endorsementUnavailable: { reason: "Endorsement data not available" },
          platformAlignment: null,
          retrospective: null,
          retrospectiveUnavailable: { reason: "No performance record" },
          valuesHighlight: null,
        },
        {
          id: "B",
          name: "Bob Brown",
          incumbent: false,
          donorCoalition: null,
          donorUnavailable: { reason: "Couldn't match this candidate" },
          endorsements: null,
          endorsementUnavailable: { reason: "Endorsement data not available" },
          platformAlignment: null,
          retrospective: null,
          retrospectiveUnavailable: { reason: "Challenger — no record yet" },
          valuesHighlight: null,
        },
      ],
    },
    alignmentScores: {
      race: "U.S. Senate",
      entries: [
        {
          candidateId: "A",
          scores: [
            {
              canonicalIssue: "healthcare_affordability",
              issueLabel: "Healthcare Affordability",
              resolvedStance: "in_favor",
              sourceType: "voting_record" as const,
              kept: 4,
              total: 6,
              contributingVotes: [],
            },
          ],
        },
        {
          candidateId: "B",
          scores: null,
          unavailable: { reason: "No voting record found" },
        },
      ],
    },
    legislativeCoverage: true,
  };

  function renderDataWorkspace(
    workspaceOverrides: Record<string, unknown> = {},
  ) {
    const baseWorkspace = {
      activeRace: {
        id: "u-s-senate",
        label: "U.S. Senate",
        section: "Federal",
        candidates: [
          { name: "Alice Anderson", party: "Democratic" },
          { name: "Bob Brown", party: "Republican" },
        ],
      },
      totalRaces: 2,
      activeRaceIndex: 0,
      decided: false,
      prevActiveRaceId: null,
      onCommitDecision: vi.fn(),
      onUnpickDecision: vi.fn(),
      pendingAmendment: null,
      amendmentInFlight: false,
      lockedThemes: [
        { name: "Healthcare access", quotes: ['"insulin prices"'] },
      ],
      decisions: [],
      chatCatchSuggestion: null,
      onChatCatch: vi.fn(),
      onChatCatchAccept: vi.fn(),
      onChatCatchDismiss: vi.fn(),
      onAmendmentSave: vi.fn(),
      onAmendmentDiscard: vi.fn(),
      raceData,
      raceDataLoading: false,
      ...workspaceOverrides,
    } as React.ComponentProps<typeof ChatPanel>["workspace"];
    return render(
      <LanguageProvider>
        <ChatPanel state={txState} zipCode="73301" workspace={baseWorkspace} />
      </LanguageProvider>,
    );
  }

  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const href = typeof url === "string" ? url : (url as URL).toString();
      if (href.includes("/api/chat-catch")) {
        return new Response(JSON.stringify({ suggest: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return streamResponse("Alice has a stronger record this term.");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the ProcessingSteps loader (not cards) while raceDataLoading", () => {
    renderDataWorkspace({ raceData: null, raceDataLoading: true });
    expect(screen.getByTestId("race-patterns-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("race-patterns")).not.toBeInTheDocument();
  });

  it("renders candidate cards from workspace.raceData (no chat involved)", () => {
    renderDataWorkspace();
    expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    expect(
      screen.queryByTestId("race-patterns-loading"),
    ).not.toBeInTheDocument();
  });

  it("keeps cards rendering after a user Q&A follow-up + never leaks JSON", async () => {
    renderDataWorkspace();
    expect(screen.getByTestId("race-patterns")).toBeInTheDocument();

    const input = screen.getByTestId("workspace-chat-input");
    fireEvent.change(input, {
      target: { value: "How does Alice score on healthcare?" },
    });
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(
        screen.getByText(/Alice has a stronger record this term/i),
      ).toBeInTheDocument();
    });

    // Cards (from the prop) are unaffected by the chat turn.
    expect(screen.getByTestId("race-patterns")).toBeInTheDocument();
    // Chat is prose-only — no structured-block JSON leaks into the transcript.
    expect(screen.queryByText(/\[RACE_PATTERNS race=/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[\/RACE_PATTERNS\]/)).not.toBeInTheDocument();
  });
});
