// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { LanguageProvider } from "../lib/i18n";
import { ElectionResult } from "./BallotToolClient";
import type { StateElectionData } from "../types/election";
import type { Theme } from "../lib/prompts/types";

/* ── Fixtures ─────────────────────────────────────────────── */

const txState: StateElectionData = {
  stateCode: "TX",
  stateName: "Texas",
  lastUpdated: "2026-03-01",
  elections: [
    {
      id: "tx-2026-general",
      name: "2026 Texas General",
      date: "2026-11-03",
      type: "general",
      isPrimary: false,
      primaryType: null,
    },
  ],
  registration: {
    online: {
      available: true,
      deadline: "2026-10-05",
      url: "https://www.votetexas.gov/",
    },
    byMail: { deadline: "2026-10-05", sincePostmarked: true },
    inPerson: { deadline: "2026-10-05", sincePostmarked: false },
    sameDayRegistration: false,
    registrationCheckUrl: "https://teamrv-mvp.sos.texas.gov/MVP/mvp.do",
  },
  earlyVoting: {
    available: true,
    startDate: "2026-10-19",
    endDate: "2026-10-30",
  },
  votingRules: {
    idRequired: true,
    acceptedIds: ["Texas driver's license"],
    phonesAtPolls: "prohibited",
    phonesAtPollsDetail: "Phones prohibited.",
    additionalRules: [],
  },
  resources: {
    stateElectionWebsite: "https://www.votetexas.gov/",
    countyElectionLookup: "https://www.votetexas.gov/voting/where.html",
    sampleBallotLookup: "https://www.votetexas.gov/voting/ballot-board.html",
    pollingPlaceLookup: "https://www.votetexas.gov/voting/where.html",
  },
};

const lockedThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ['"insulin prices keep going up"'] },
  { name: "Housing affordability", quotes: ['"rent went up 30%"'] },
];

const civicData = {
  pollingLocations: [],
  earlyVoteSites: [],
  county: "Travis County",
  contests: [
    {
      office: "U.S. President",
      district: "",
      type: "General",
      candidates: [
        { name: "Alice Anderson", party: "Democratic" },
        { name: "Bob Brown", party: "Republican" },
      ],
    },
    {
      office: "Governor",
      district: "Texas",
      type: "General",
      candidates: [
        { name: "Carol Cain", party: "Democratic" },
        { name: "Dan Davis", party: "Republican" },
      ],
    },
    {
      office: "Proposition 1",
      district: "",
      type: "Referendum",
      candidates: [],
    },
  ],
};

/* ── Mocks ────────────────────────────────────────────────── */

let originalFetch: typeof fetch;
beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = vi.fn(async () => {
    return new Response(
      JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as unknown as typeof fetch;

  window.localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  cleanup();
});

function renderElectionResult(
  overrides: { initialLockedThemes?: Theme[] } = {},
) {
  return render(
    <LanguageProvider>
      <ElectionResult
        state={txState}
        zipCode="73301"
        lang="en"
        initialPollingData={civicData}
        promptFleetV2Enabled={true}
        // Test-only escape: pre-lock themes so the workspace is up immediately.
        // Real flow: the user submits cold-open text, themes render, then locks.
        initialLockedThemes={overrides.initialLockedThemes ?? lockedThemes}
      />
    </LanguageProvider>,
  );
}

/* ── Tests ────────────────────────────────────────────────── */

describe("ElectionResult — workspace 3-pane shell (Phase 3)", () => {
  it("renders the three panes side by side once themes are locked", () => {
    renderElectionResult();
    expect(
      screen.getByRole("navigation", { name: /workspace navigation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: /your ballot/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-chat")).toBeInTheDocument();
  });

  it("displays N/M counter and address city/state in the ballot pane", () => {
    renderElectionResult();
    // Initially zero decisions across 3 races.
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("0/3");
    // City + state from civic county / state code. We require at least the
    // state name. The exact city resolution is downstream of Civic API.
    const address = screen.getByTestId("ballot-pane-address");
    expect(address.textContent ?? "").toMatch(/Texas|TX/);
  });

  it("clicking a race in the rail switches the active race", () => {
    renderElectionResult();
    const governorRow = screen.getByTestId(
      "workspace-rail-race-governor-texas",
    );
    fireEvent.click(governorRow);
    expect(governorRow).toHaveAttribute("aria-current", "page");
  });

  it("committing a decision puts the verbatim why-note in BallotPane", () => {
    renderElectionResult();
    const pickBtn = screen.getByTestId("workspace-pick-trigger");
    fireEvent.click(pickBtn);
    const whyTextarea = screen.getByTestId("workspace-why-textarea");
    fireEvent.change(whyTextarea, {
      target: { value: "Strong labor record matches my top priority" },
    });
    const commitBtn = screen.getByTestId("workspace-why-commit");
    fireEvent.click(commitBtn);

    const initialRaceId = pickBtn.getAttribute("data-race-id")!;
    const why = screen.getByTestId(`ballot-pane-why-${initialRaceId}`);
    expect(why).toHaveTextContent(
      "Strong labor record matches my top priority",
    );
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("1/3");
  });

  it("auto-advances ~600ms after commit when there is a next undecided race", () => {
    vi.useFakeTimers();
    try {
      renderElectionResult();

      const pickBtn = screen.getByTestId("workspace-pick-trigger");
      const initialRaceId = pickBtn.getAttribute("data-race-id")!;
      fireEvent.click(pickBtn);
      fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
        target: { value: "ok" },
      });
      fireEvent.click(screen.getByTestId("workspace-why-commit"));

      // Before the timer fires the active race shouldn't have changed.
      expect(
        screen.getByTestId(`workspace-rail-race-${initialRaceId}`),
      ).toHaveAttribute("aria-current", "page");

      act(() => {
        vi.advanceTimersByTime(700);
      });

      // After the delay, the active race id changes to the next undecided race.
      expect(
        screen.getByTestId(`workspace-rail-race-${initialRaceId}`),
      ).not.toHaveAttribute("aria-current", "page");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does NOT auto-advance while the why-prompt is open", () => {
    vi.useFakeTimers();
    try {
      renderElectionResult();
      const pickBtn = screen.getByTestId("workspace-pick-trigger");
      const initialRaceId = pickBtn.getAttribute("data-race-id")!;
      fireEvent.click(pickBtn);
      // Why-prompt is open; do not commit.
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      // Active race unchanged because no decision was committed.
      expect(
        screen.getByTestId(`workspace-rail-race-${initialRaceId}`),
      ).toHaveAttribute("aria-current", "page");
    } finally {
      vi.useRealTimers();
    }
  });

  it("manual review of a finished race suppresses auto-advance on re-pick", () => {
    vi.useFakeTimers();
    try {
      renderElectionResult();
      // Commit first decision and auto-advance.
      const firstPickBtn = screen.getByTestId("workspace-pick-trigger");
      const firstRaceId = firstPickBtn.getAttribute("data-race-id")!;
      fireEvent.click(firstPickBtn);
      fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
        target: { value: "first" },
      });
      fireEvent.click(screen.getByTestId("workspace-why-commit"));
      act(() => {
        vi.advanceTimersByTime(700);
      });

      // Manually click the first (decided) race — review mode.
      const decidedRow = screen.getByTestId(
        `workspace-rail-race-${firstRaceId}`,
      );
      fireEvent.click(decidedRow);
      expect(decidedRow).toHaveAttribute("aria-current", "page");

      // The chat shows an unpick affordance for the already-decided race;
      // re-pick = unpick → pick → commit.
      fireEvent.click(screen.getByTestId("workspace-unpick-trigger"));
      const repickBtn = screen.getByTestId("workspace-pick-trigger");
      fireEvent.click(repickBtn);
      fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
        target: { value: "still first" },
      });
      fireEvent.click(screen.getByTestId("workspace-why-commit"));

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Active race should NOT have auto-advanced — still the same decided race.
      expect(
        screen.getByTestId(`workspace-rail-race-${firstRaceId}`),
      ).toHaveAttribute("aria-current", "page");
    } finally {
      vi.useRealTimers();
    }
  });

  it("unpicking a race removes the decision from BallotPane and does not auto-advance", () => {
    vi.useFakeTimers();
    try {
      renderElectionResult();
      const pickBtn = screen.getByTestId("workspace-pick-trigger");
      const raceId = pickBtn.getAttribute("data-race-id")!;
      fireEvent.click(pickBtn);
      fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
        target: { value: "demo" },
      });
      fireEvent.click(screen.getByTestId("workspace-why-commit"));

      // After commit, before auto-advance, navigate back and unpick.
      // Click the same race row to re-focus it.
      const row = screen.getByTestId(`workspace-rail-race-${raceId}`);
      fireEvent.click(row);

      const unpickBtn = screen.getByTestId("workspace-unpick-trigger");
      fireEvent.click(unpickBtn);

      // Decision gone from ballot pane.
      expect(screen.queryByTestId(`ballot-pane-why-${raceId}`)).toBeNull();
      expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("0/3");

      // No auto-advance after unpick.
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(
        screen.getByTestId(`workspace-rail-race-${raceId}`),
      ).toHaveAttribute("aria-current", "page");
    } finally {
      vi.useRealTimers();
    }
  });

  it("active-race indicator propagates to rail, chat header, and ballot pane row", () => {
    renderElectionResult();
    // Click governor in the rail.
    fireEvent.click(screen.getByTestId("workspace-rail-race-governor-texas"));
    // Rail: aria-current=page.
    expect(
      screen.getByTestId("workspace-rail-race-governor-texas"),
    ).toHaveAttribute("aria-current", "page");
    // Ballot pane: data-active=true.
    expect(
      screen.getByTestId("ballot-pane-row-governor-texas"),
    ).toHaveAttribute("data-active", "true");
    // Chat header reflects label.
    const chatHeader = screen.getByTestId("workspace-chat-header");
    expect(chatHeader).toHaveTextContent(/governor/i);
    expect(chatHeader).toHaveTextContent(/race \d+ of 3/i);
  });

  it("renders a chat input the user can type into and send", () => {
    renderElectionResult();
    const input = screen.getByTestId("workspace-chat-input");
    expect(input).toBeInTheDocument();
    act(() => {
      fireEvent.change(input, {
        target: { value: "what are her labor votes?" },
      });
    });
    // Form submit should fire without throwing.
    const form = input.closest("form");
    expect(form).not.toBeNull();
    act(() => {
      fireEvent.submit(form!);
    });
    // The input clears after submit (matches Phase 2 ChatInput behavior).
    expect(input).toHaveValue("");
  });

  it("renders context-aware suggestion chips above the input", () => {
    renderElectionResult();
    // At least two suggestion chips render.
    const chips = screen.getAllByTestId(/^workspace-chat-suggestion-/);
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });

  it("switching the active race clears chat messages (per-race scope)", () => {
    renderElectionResult();
    // Send a message in the first race so messages list has content.
    const input = screen.getByTestId("workspace-chat-input");
    act(() => {
      fireEvent.change(input, { target: { value: "hi" } });
    });
    const form = input.closest("form")!;
    act(() => {
      fireEvent.submit(form);
    });

    // Switch to a different race.
    act(() => {
      fireEvent.click(screen.getByTestId("workspace-rail-race-governor-texas"));
    });

    // After race switch, the messages list contains no chat messages from
    // the previous race. Since the ChatPanel is keyed by race id, the
    // chat-message-user testid count should be zero.
    expect(screen.queryAllByTestId("chat-message-user").length).toBe(0);
  });

  it("workspace chat sends view='workspace-race' + activeRaceId + raceContext", async () => {
    const postBodies: unknown[] = [];
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (init?.body) {
        try {
          postBodies.push(JSON.parse(String(init.body)));
        } catch {
          // not JSON; ignore
        }
      }
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
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
    }) as unknown as typeof fetch;

    renderElectionResult();
    const input = screen.getByTestId("workspace-chat-input");
    act(() => {
      fireEvent.change(input, { target: { value: "tell me her record" } });
    });
    const form = input.closest("form")!;
    act(() => {
      fireEvent.submit(form);
    });
    await new Promise((r) => setTimeout(r, 0));

    const body = postBodies.find(
      (b) => typeof b === "object" && b !== null && "view" in b,
    ) as
      | {
          view: string;
          activeRaceId?: string;
          activeRaceType?: string;
          raceContext?: { raceLabel?: string; state?: string };
        }
      | undefined;
    expect(
      body,
      "expected a /api/chat POST that carries the workspace route shape",
    ).toBeDefined();
    expect(body!.view).toBe("workspace-race");
    expect(body!.activeRaceType).toBe("choice");
    expect(body!.activeRaceId).toBeTruthy();
    expect(body!.raceContext).toBeDefined();
    expect(body!.raceContext!.state).toBe("TX");
    expect(body!.raceContext!.raceLabel).toMatch(/President|Senator|Governor/);
  });

  it("workspace chat sends view='workspace-prop' for a proposition", async () => {
    const postBodies: unknown[] = [];
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (init?.body) {
        try {
          postBodies.push(JSON.parse(String(init.body)));
        } catch {
          // ignore
        }
      }
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
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
    }) as unknown as typeof fetch;

    renderElectionResult();
    // Switch active race to the proposition (no candidates).
    act(() => {
      fireEvent.click(screen.getByTestId("workspace-rail-race-proposition-1"));
    });
    const input = screen.getByTestId("workspace-chat-input");
    act(() => {
      fireEvent.change(input, { target: { value: "what does yes mean?" } });
    });
    const form = input.closest("form")!;
    act(() => {
      fireEvent.submit(form);
    });
    await new Promise((r) => setTimeout(r, 0));

    const body = postBodies.find(
      (b) =>
        typeof b === "object" &&
        b !== null &&
        "view" in b &&
        (b as { view: string }).view === "workspace-prop",
    );
    expect(body).toBeDefined();
  });
});

/* ── Phase 6 — mid-session theme amendment ───────────────── */

describe("ElectionResult — mid-session theme amendment (Phase 6)", () => {
  function mockAmendChat(verdicts: { race_id: string; verdict: string }[]) {
    const payload = {
      new_theme: {
        name: "School funding",
        quotes: ["kids' schools are crumbling"],
      },
      suggested_rank: 1,
      rescored: verdicts.map((v) => ({
        race_id: v.race_id,
        old_score: 80,
        new_score: v.verdict === "REVISIT" ? 60 : 80,
        verdict: v.verdict,
      })),
    };
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text: JSON.stringify(payload) })}\n\n`,
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
  }

  it("clicking the rail's Edit themes opens the amend editor inline in chat (not a modal)", () => {
    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    const editor = screen.getByTestId("theme-amend-editor");
    expect(editor).toBeInTheDocument();
    // Inline in chat, not a modal: descendant of the workspace-chat region.
    const workspaceChat = screen.getByTestId("workspace-chat");
    expect(workspaceChat.contains(editor)).toBe(true);
  });

  it("clicking Edit themes does NOT drop back to cold-open (Phase 6 change)", () => {
    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    // The cold-open surface is gone (we stayed in workspace mode).
    expect(screen.queryByTestId("cold-open-input")).toBeNull();
    expect(screen.getByTestId("workspace-chat")).toBeInTheDocument();
  });

  it("Discard amendment closes the editor without changing themes", () => {
    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    expect(screen.getByTestId("theme-amend-editor")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("theme-amend-discard"));
    expect(screen.queryByTestId("theme-amend-editor")).toBeNull();
    // Themes unchanged in the rail.
    expect(screen.getByTestId("workspace-rail-theme-0")).toHaveTextContent(
      "Healthcare costs",
    );
    expect(screen.getByTestId("workspace-rail-theme-1")).toHaveTextContent(
      "Housing affordability",
    );
  });

  it("locking an amendment does NOT auto-advance the active race", async () => {
    vi.useFakeTimers();
    try {
      global.fetch = vi.fn(
        async (input: unknown, init?: { body?: unknown }) => {
          if (init?.body) {
            const body = JSON.parse(String(init.body));
            if (body.view === "amend") {
              return mockAmendChat([
                { race_id: "us-president", verdict: "HOLD" },
              ]);
            }
          }
          return new Response(
            JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        },
      ) as unknown as typeof fetch;

      renderElectionResult();
      const initialActiveRaceId = screen
        .getByTestId("workspace-pick-trigger")
        .getAttribute("data-race-id");

      fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
      fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
        target: { value: "School funding" },
      });
      fireEvent.click(screen.getByTestId("theme-amend-lock"));

      await act(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(1000);
      });

      // Active race unchanged — no auto-advance after amend.
      expect(
        screen.getByTestId(`workspace-rail-race-${initialActiveRaceId}`),
      ).toHaveAttribute("aria-current", "page");
    } finally {
      vi.useRealTimers();
    }
  });

  it("locking an amendment adds the new theme to the rail's locked themes", async () => {
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (init?.body) {
        const body = JSON.parse(String(init.body));
        if (body.view === "amend") {
          return mockAmendChat([]);
        }
      }
      return new Response(
        JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    await act(async () => {
      await Promise.resolve();
    });

    // The new theme should appear at the top of the rail.
    expect(screen.getByTestId("workspace-rail-theme-0")).toHaveTextContent(
      "School funding",
    );
  });

  /* ── Phase 9 — budget exhausted continuity + BYOK ─────────── */

  it("BallotPane 'Continue elsewhere' surfaces BudgetExhausted with a populated handoff (themes + cityState in the prompt)", async () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });

    // Continuity screen mounted.
    const ta = screen.getByTestId(
      "handoff-prompt-textarea",
    ) as HTMLTextAreaElement;
    // Fixture themes from this test file: "Healthcare costs" + "Housing
    // affordability". They MUST appear in the handoff body so a paste
    // into Claude/ChatGPT carries the voter's actual priorities.
    expect(ta.value).toContain("Healthcare costs");
    expect(ta.value).toContain("Housing affordability");
    // City+state line should also be present.
    expect(ta.value).toMatch(/Travis County|Texas/);
  });

  it("structured budget_exhausted response from /api/chat mounts the BudgetExhausted screen", async () => {
    // The workspace ChatPanel is keyed by activeRace.id; structure the
    // mock so the second POST (after first themes-bootstrap) returns the
    // Phase 9 budget_exhausted shape on a 200.
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      const url = String(input);
      if (url.includes("/api/chat") && init && "body" in (init as object)) {
        return new Response(
          JSON.stringify({
            status: "budget_exhausted",
            resetAt: "2030-06-01T00:00:00Z",
            handoffPrompt: "PASTE THIS — fixture handoff for test",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    renderElectionResult();
    const input = screen.getByTestId("workspace-chat-input");
    act(() => {
      fireEvent.change(input, { target: { value: "what's her record?" } });
    });
    const form = input.closest("form")!;
    act(() => {
      fireEvent.submit(form);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The continuity screen replaces the workspace shell.
    expect(screen.getByTestId("budget-exhausted-screen")).toBeInTheDocument();
    expect(screen.getByTestId("budget-exhausted-headline")).toHaveTextContent(
      /Your ballot is saved/,
    );
    expect(screen.queryByTestId("workspace-shell")).toBeNull();
  });

  it("BYOK precedence: with a key in localStorage, chat fetches go to api.anthropic.com — NOT /api/chat", async () => {
    // Pre-seed the BYOK key. Per packet: "when key set AND community
    // budget has room, user's key is used."
    window.localStorage.setItem(
      "voter-choice:byok-anthropic-key",
      "sk-ant-precedence-1",
    );

    const fetchUrls: string[] = [];
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      const url = String(input);
      // Only record POSTs — GETs to /api/chat are the budget probe, not
      // chat sends.
      if (init && "body" in (init as object)) fetchUrls.push(url);
      // Anthropic mock — SSE shape from the BYOK client's parser.
      if (url.startsWith("https://api.anthropic.com/")) {
        const sse =
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "ok" },
          })}\n\n` +
          `event: message_stop\ndata: ${JSON.stringify({
            type: "message_stop",
          })}\n\n`;
        return new Response(sse, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      return new Response(
        JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    renderElectionResult();
    const input = screen.getByTestId("workspace-chat-input");
    act(() => {
      fireEvent.change(input, { target: { value: "tell me more" } });
    });
    const form = input.closest("form")!;
    act(() => {
      fireEvent.submit(form);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // The Anthropic endpoint was called.
    expect(
      fetchUrls.some((u) => u.startsWith("https://api.anthropic.com/")),
      "expected the BYOK path to fetch from api.anthropic.com",
    ).toBe(true);
    // The /api/chat POST endpoint was NEVER called for the chat send.
    expect(
      fetchUrls.filter((u) => /\/api\/chat$/.test(u)),
      "BYOK precedence must bypass /api/chat",
    ).toEqual([]);
  });
});
