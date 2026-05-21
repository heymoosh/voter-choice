// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ChatPanel } from "./ChatPanel";
import { LanguageProvider } from "../lib/i18n";
import type { StateElectionData } from "../types/election";

/* ──────────────────────────────────────────────────────────────
 * ColdOpen.integration tests
 *
 * Full cold-open flow against a mocked `/api/chat`. Asserts the
 * Wave A ThemeRanker + ConcernInterpretation themes-mode UI lights
 * up when the PROMPT_FLEET_V2 prop is on AND locale is `en`, and
 * the legacy chip-picker path still renders when the flag is off.
 *
 * Mock strategy mirrors src/components/ChatPanel.test.tsx — vi.spyOn
 * on fetch, returning a streaming SSE Response that the existing
 * streamResponse() loop in ChatPanel consumes.
 *
 * Cold-open turn: ChatPanel's POST body should carry
 *   view: "cold-open"
 *   raceContext: { userInput: <userText> }
 * and NOT carry activeRaceId / prevActiveRaceId / activeRaceType /
 * trigger. The model response is a JSON array of themes (returned
 * as raw text in SSE deltas). The component accumulates those text
 * deltas, parses on done, and switches to ConcernInterpretation
 * themes-mode.
 * ────────────────────────────────────────────────────────────── */

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

function makeSSEStream(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function makeThemesResponse(themesJson: string): Response {
  // Split the JSON into chunks so we exercise the accumulation path.
  const chunkSize = Math.max(1, Math.floor(themesJson.length / 3));
  const events: Array<Record<string, unknown>> = [];
  for (let i = 0; i < themesJson.length; i += chunkSize) {
    events.push({ type: "text", text: themesJson.slice(i, i + chunkSize) });
  }
  events.push({ type: "done", budget: { tier: "normal", percent: 0 } });
  return makeSSEStream(events);
}

interface FetchCallRecord {
  url: string;
  body: Record<string, unknown> | null;
}

function captureFetch(responseBuilder: () => Response): {
  fetchMock: ReturnType<typeof vi.fn>;
  calls: FetchCallRecord[];
} {
  const calls: FetchCallRecord[] = [];
  const fetchMock = vi
    .fn()
    .mockImplementation((url: string, init?: RequestInit) => {
      let body: Record<string, unknown> | null = null;
      try {
        body = init?.body ? JSON.parse(init.body as string) : null;
      } catch {
        body = null;
      }
      calls.push({ url, body });
      return Promise.resolve(responseBuilder());
    });
  return { fetchMock, calls };
}

function renderColdOpen(flag: boolean) {
  return render(
    <LanguageProvider>
      <ChatPanel state={txState} zipCode="73301" promptFleetV2Enabled={flag} />
    </LanguageProvider>,
  );
}

describe("ColdOpen integration", () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("happy path (flag on, en locale)", () => {
    it("renders themes from a streamed JSON response with verbatim quotes", async () => {
      const userText = "my mom's insulin keeps going up and copays are insane";
      const themesJson = JSON.stringify([
        {
          name: "Healthcare costs",
          quotes: ["my mom's insulin keeps going up"],
        },
      ]);
      const { fetchMock } = captureFetch(() => makeThemesResponse(themesJson));
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);

      // Cold-open UI mounts (no auto-session).
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, { target: { value: userText } });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      // Themes UI renders.
      await waitFor(
        () => {
          expect(
            screen.getByTestId("concern-interpretation-themes"),
          ).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // The verbatim quote rule: the rendered quote must be a substring
      // of the original user message.
      const quote = screen.getByTestId("theme-quote-0-0");
      expect(quote).toBeInTheDocument();
      const quoteText = quote.textContent ?? "";
      // Strip the smart quotes ThemeRanker wraps quotes in.
      const innerQuote = quoteText.replace(/[“”"]/g, "");
      expect(userText).toContain(innerQuote);

      // Lock-in is enabled (themes.length > 0).
      const lockIn = screen.getByTestId(
        "theme-ranker-lock-in",
      ) as HTMLButtonElement;
      expect(lockIn.disabled).toBe(false);
    });

    it("does NOT render the user's submitted text as a chat bubble", async () => {
      const userText = "my mom's insulin is too expensive";
      const themesJson = JSON.stringify([
        { name: "Healthcare costs", quotes: ["insulin is too expensive"] },
      ]);
      const { fetchMock } = captureFetch(() => makeThemesResponse(themesJson));
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, { target: { value: userText } });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      await waitFor(() =>
        expect(
          screen.getByTestId("concern-interpretation-themes"),
        ).toBeInTheDocument(),
      );

      // The user message should NOT appear as a chat bubble (cold-open
      // bypasses the conversation message history).
      expect(screen.queryByTestId("chat-message-user")).not.toBeInTheDocument();
      // And the raw JSON should NEVER render as assistant prose.
      expect(
        screen.queryByTestId("chat-message-assistant"),
      ).not.toBeInTheDocument();
    });
  });

  describe("flag off (legacy path preserved)", () => {
    it("does NOT render the cold-open textarea when the flag is off", async () => {
      const { fetchMock } = captureFetch(() =>
        makeSSEStream([
          { type: "text", text: "Hello, voter." },
          { type: "done", budget: { tier: "normal", percent: 0 } },
        ]),
      );
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(false);

      // Legacy chat-window mounts because the auto-startSession effect
      // fires when the flag is off.
      await screen.findByTestId("chat-window");

      // Cold-open UI must NOT render under flag-off.
      expect(
        screen.queryByTestId("cold-open-textarea"),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("cold-open-send")).not.toBeInTheDocument();
    });
  });

  describe("outgoing request shape", () => {
    it("posts view='cold-open' and raceContext.userInput=<text>", async () => {
      const userText = "I care about housing affordability";
      const themesJson = JSON.stringify([
        { name: "Housing", quotes: ["housing affordability"] },
      ]);
      const { fetchMock, calls } = captureFetch(() =>
        makeThemesResponse(themesJson),
      );
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, { target: { value: userText } });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      await waitFor(() => expect(calls.length).toBeGreaterThan(0));

      const chatCall = calls.find((c) => c.url === "/api/chat");
      expect(chatCall).toBeTruthy();
      const body = chatCall!.body!;
      expect(body.view).toBe("cold-open");
      expect((body.raceContext as { userInput?: string })?.userInput).toBe(
        userText,
      );
      // The legacy ID-less fields should NOT be set on the cold-open turn.
      expect(body.activeRaceId).toBeUndefined();
      expect(body.prevActiveRaceId).toBeUndefined();
      expect(body.activeRaceType).toBeUndefined();
      expect(body.trigger).toBeUndefined();
      // The validator requires systemPrompt; the route ignores it under
      // flag-on + view but we still send it.
      expect(typeof body.systemPrompt).toBe("string");
      expect((body.systemPrompt as string).length).toBeGreaterThan(0);
    });
  });

  describe("JSON parse error path", () => {
    it("shows the rewrite path when the model returns invalid JSON", async () => {
      const { fetchMock } = captureFetch(() =>
        makeSSEStream([
          { type: "text", text: "this is not JSON, sorry" },
          { type: "done", budget: { tier: "normal", percent: 0 } },
        ]),
      );
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, {
        target: { value: "I care about something" },
      });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      // Error banner appears.
      await waitFor(() => {
        expect(screen.getByTestId("cold-open-error")).toBeInTheDocument();
      });

      // Textarea reappears with the user's original draft preserved.
      const textareaAfter = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textareaAfter.value).toBe("I care about something");
    });
  });

  describe("rewrite restores draft", () => {
    it("clicking 'Let me rewrite my message' restores the original draft", async () => {
      const userText = "I really care about climate";
      const themesJson = JSON.stringify([
        { name: "Climate", quotes: ["climate"] },
      ]);
      const { fetchMock } = captureFetch(() => makeThemesResponse(themesJson));
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, { target: { value: userText } });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      await waitFor(() =>
        expect(
          screen.getByTestId("concern-interpretation-themes"),
        ).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTestId("theme-ranker-rewrite"));

      // Textarea reappears with the original draft preloaded.
      const textareaAfter = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textareaAfter.value).toBe(userText);
      // Themes UI is gone.
      expect(
        screen.queryByTestId("concern-interpretation-themes"),
      ).not.toBeInTheDocument();
    });
  });

  describe("lock-in transitions out of cold-open", () => {
    it("clicking 'Lock these in' renders the locked-themes confirmation panel", async () => {
      const userText = "housing is too expensive";
      const themesJson = JSON.stringify([
        { name: "Housing", quotes: ["housing is too expensive"] },
      ]);
      const { fetchMock } = captureFetch(() => makeThemesResponse(themesJson));
      vi.stubGlobal("fetch", fetchMock);

      renderColdOpen(true);
      const textarea = await screen.findByTestId("cold-open-textarea");
      fireEvent.change(textarea, { target: { value: userText } });
      fireEvent.click(screen.getByTestId("cold-open-send"));

      await waitFor(() =>
        expect(
          screen.getByTestId("concern-interpretation-themes"),
        ).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByTestId("theme-ranker-lock-in"));

      // The cold-open panel exits and a confirmation surface renders.
      // Phase 3 owns the workspace transition; for Phase 2 we show a
      // "themes locked" panel.
      await waitFor(() =>
        expect(screen.getByTestId("cold-open-locked")).toBeInTheDocument(),
      );

      // Cold-open UI is gone.
      expect(
        screen.queryByTestId("cold-open-textarea"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("concern-interpretation-themes"),
      ).not.toBeInTheDocument();
    });
  });
});
