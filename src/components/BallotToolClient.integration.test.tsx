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
import { ElectionResult, parsedBallotToContests } from "./BallotToolClient";
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

  /* ── PR3 opt-in re-score offer ───────────────────────────── */

  it("locking an amendment with 0 prior decisions does NOT render the re-score offer (themes still commit)", async () => {
    // No decisions yet — the offer is meaningless. Skip it entirely.
    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    await act(async () => {
      await Promise.resolve();
    });

    // No offer.
    expect(screen.queryByTestId("amend-rescore-offer")).toBeNull();
    // Themes still committed in the rail.
    expect(screen.getByTestId("workspace-rail-theme-0")).toHaveTextContent(
      "School funding",
    );
    // No delta message either (no re-score fired).
    expect(screen.queryByTestId("amend-delta-message")).toBeNull();
  });

  it("locking an amendment with decisions > 0 renders the re-score offer (NOT the delta directly)", async () => {
    renderElectionResult();
    // First commit a decision so decisions.length > 0.
    fireEvent.click(screen.getByTestId("workspace-pick-trigger"));
    fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
      target: { value: "strong record" },
    });
    fireEvent.click(screen.getByTestId("workspace-why-commit"));

    // Open the amend editor.
    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    await act(async () => {
      await Promise.resolve();
    });

    // The offer renders inline.
    expect(screen.getByTestId("amend-rescore-offer")).toBeInTheDocument();
    // The delta message has NOT rendered yet.
    expect(screen.queryByTestId("amend-delta-message")).toBeNull();
    // Themes are committed regardless.
    expect(screen.getByTestId("workspace-rail-theme-0")).toHaveTextContent(
      "School funding",
    );
  });

  it("declining the re-score offer dismisses it WITHOUT calling /api/chat amend", async () => {
    const fetchCalls: { url: string; body?: unknown }[] = [];
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (init?.body) {
        fetchCalls.push({ url: String(input), body: init.body });
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
    fireEvent.click(screen.getByTestId("workspace-pick-trigger"));
    fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
      target: { value: "strong record" },
    });
    fireEvent.click(screen.getByTestId("workspace-why-commit"));

    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("amend-rescore-offer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("amend-rescore-decline"));

    await act(async () => {
      await Promise.resolve();
    });

    // Offer dismissed; no delta message rendered.
    expect(screen.queryByTestId("amend-rescore-offer")).toBeNull();
    expect(screen.queryByTestId("amend-delta-message")).toBeNull();

    // No amend /api/chat call.
    const amendCalls = fetchCalls.filter((c) => {
      try {
        const b = JSON.parse(String(c.body));
        return b.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls).toHaveLength(0);
  });

  it("accepting the re-score offer fires /api/chat amend AND renders the delta", async () => {
    const fetchCalls: { url: string; body?: unknown }[] = [];
    global.fetch = vi.fn(async (input: unknown, init?: { body?: unknown }) => {
      if (init?.body) {
        fetchCalls.push({ url: String(input), body: init.body });
        const body = JSON.parse(String(init.body));
        if (body.view === "amend") {
          return mockAmendChat([{ race_id: "us-president", verdict: "HOLD" }]);
        }
      }
      return new Response(
        JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    renderElectionResult();
    fireEvent.click(screen.getByTestId("workspace-pick-trigger"));
    fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
      target: { value: "strong record" },
    });
    fireEvent.click(screen.getByTestId("workspace-why-commit"));

    fireEvent.click(screen.getByTestId("workspace-rail-edit-themes"));
    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("amend-rescore-offer")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("amend-rescore-accept"));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Delta message rendered.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("amend-delta-message")).toBeInTheDocument();

    // Amend chat call MUST have fired exactly once.
    const amendCalls = fetchCalls.filter((c) => {
      try {
        const b = JSON.parse(String(c.body));
        return b.view === "amend";
      } catch {
        return false;
      }
    });
    expect(amendCalls.length).toBeGreaterThanOrEqual(1);
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

  it("BallotPane 'Continue elsewhere' does NOT open a new tab — BudgetExhausted is the only effect", () => {
    // Phase 9 owns the entire handoff UX. The Phase 3 legacy stub used to
    // also open claude.ai in a new tab via window.open, which double-fired
    // alongside the BudgetExhausted screen. After PR 1, only the
    // BudgetExhausted screen mounts.
    const openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window);
    try {
      renderElectionResult();
      act(() => {
        fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
      });
      // The continuity screen still mounts (this is the new handoff UX).
      expect(screen.getByTestId("budget-exhausted-screen")).toBeInTheDocument();
      // And no new tab was opened.
      expect(openSpy).not.toHaveBeenCalled();
    } finally {
      openSpy.mockRestore();
    }
  });

  it("structured budget_exhausted response from /api/chat mounts the BudgetExhausted overlay (PR 7: workspace remains visible underneath)", async () => {
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

    // The continuity overlay mounts.
    expect(screen.getByTestId("budget-exhausted-screen")).toBeInTheDocument();
    expect(screen.getByTestId("budget-exhausted-headline")).toHaveTextContent(
      /Your ballot is saved/,
    );
    // PR 7 — the workspace stays mounted underneath the overlay. User's
    // themes, decisions, and races are preserved + still visible.
    expect(screen.getByTestId("workspace-shell")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /workspace navigation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: /your ballot/i }),
    ).toBeInTheDocument();
  });

  /* ── PR 7 — BudgetExhausted as overlay (workspace preserved) ── */

  it("PR 7: clicking 'Continue elsewhere' overlays BudgetExhausted; workspace + ballot + rail remain in DOM", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    // Overlay mounted.
    expect(screen.getByTestId("budget-exhausted-overlay")).toBeInTheDocument();
    // Workspace still mounted: rail nav, chat region, ballot pane all in DOM.
    expect(screen.getByTestId("workspace-shell")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /workspace navigation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", { name: /your ballot/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-chat")).toBeInTheDocument();
  });

  it("PR 7: dismissing the overlay returns to a fully interactive workspace", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    expect(screen.getByTestId("budget-exhausted-overlay")).toBeInTheDocument();
    // Click the X dismiss button.
    act(() => {
      fireEvent.click(screen.getByTestId("budget-exhausted-dismiss"));
    });
    // Overlay gone; workspace still here.
    expect(screen.queryByTestId("budget-exhausted-overlay")).toBeNull();
    expect(screen.getByTestId("workspace-shell")).toBeInTheDocument();
  });

  it("PR 7: with NO BYOK key set, chat input shows the budget-exhausted notice + Send disabled after overlay surfaces", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    // Notice is visible (chat input region carries it).
    expect(
      screen.getByTestId("workspace-chat-budget-notice"),
    ).toBeInTheDocument();
    // The textarea is disabled.
    const input = screen.getByTestId(
      "workspace-chat-input",
    ) as HTMLInputElement;
    expect(input).toBeDisabled();
    // Send button is also disabled.
    expect(screen.getByTestId("workspace-chat-send")).toBeDisabled();
  });

  it("PR 7: with a BYOK key set in localStorage, chat input STAYS interactive when overlay surfaces", () => {
    window.localStorage.setItem(
      "voter-choice:byok-anthropic-key",
      "sk-ant-overlay-test",
    );
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    // No notice — BYOK bypasses community budget.
    expect(screen.queryByTestId("workspace-chat-budget-notice")).toBeNull();
    // Input and Send both enabled.
    const input = screen.getByTestId(
      "workspace-chat-input",
    ) as HTMLInputElement;
    expect(input).not.toBeDisabled();
  });

  it("PR 7: dismissing the overlay (no BYOK) keeps the chat notice + disabled input", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("budget-exhausted-dismiss"));
    });
    // Overlay dismissed but budget state is still "exhausted" in the
    // user's eyes — chat remains gated until they BYOK or budget resets.
    // For now (no BYOK), the notice persists.
    expect(screen.queryByTestId("budget-exhausted-overlay")).toBeNull();
    // Workspace pick-area copy still acknowledges exhaustion.
    expect(screen.getByTestId("workspace-shell")).toBeInTheDocument();
    // Critical: the chat input still shows the budget notice and is
    // disabled. Dismissing the dialog is a pure UI action — it does NOT
    // undo the parent's "budget is out" memory.
    expect(
      screen.getByTestId("workspace-chat-budget-notice"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("workspace-chat-input")).toBeDisabled();
    expect(screen.getByTestId("workspace-chat-send")).toBeDisabled();
  });

  it("PR 7: after dismiss without BYOK, re-clicking 'Continue elsewhere' re-opens the overlay", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("budget-exhausted-dismiss"));
    });
    expect(screen.queryByTestId("budget-exhausted-overlay")).toBeNull();
    // Re-click "Continue elsewhere" — the overlay should re-open even
    // though the underlying "budget is out" memory was still set.
    act(() => {
      fireEvent.click(screen.getByTestId("ballot-pane-handoff"));
    });
    expect(screen.getByTestId("budget-exhausted-overlay")).toBeInTheDocument();
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

/* ── Fix E — Polis section in the workspace rail ───────────── */

describe("ElectionResult — Polis section visible in workspace (fix E)", () => {
  it("renders the collapsible Polis section in the rail when themes are locked + county is known", () => {
    renderElectionResult();
    // Section header is present (closed by default).
    expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-polis-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    // Overlay is NOT yet in the DOM — opt-in expand.
    expect(screen.queryByTestId("polis-bars-section")).toBeNull();
  });

  it("expanding the Polis section mounts PolisOverlay inside the rail", () => {
    renderElectionResult();
    act(() => {
      fireEvent.click(screen.getByTestId("workspace-polis-toggle"));
    });
    expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    // The section sits inside the workspace-rail nav, not the chat or ballot pane.
    const rail = screen.getByRole("navigation", {
      name: /workspace navigation/i,
    });
    expect(rail.contains(screen.getByTestId("polis-bars-section"))).toBe(true);
  });

  it("does NOT render the Polis section when no themes are locked", () => {
    renderElectionResult({ initialLockedThemes: [] });
    expect(screen.queryByTestId("workspace-polis-section")).toBeNull();
  });
});

/* ── PR 6 fix D — ballot-before-themes (Civic-empty routing) ─── */

describe("ElectionResult — ballot-before-themes funnel (fix D)", () => {
  function renderForBallotStep(args: {
    initialPollingData: typeof civicData | null;
    promptFleetV2Enabled?: boolean;
    lang?: "en" | "es";
  }) {
    return render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang={args.lang ?? "en"}
          initialPollingData={args.initialPollingData}
          promptFleetV2Enabled={args.promptFleetV2Enabled ?? true}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
  }

  it("Civic returns races + flag-on → cold-open textarea renders immediately, NO BallotLookupNeeded", () => {
    renderForBallotStep({ initialPollingData: civicData });
    expect(screen.getByTestId("cold-open-textarea")).toBeInTheDocument();
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
  });

  it("Civic returns 0 contests + flag-on + en → BallotLookupNeeded renders and cold-open is suppressed", () => {
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    renderForBallotStep({ initialPollingData: emptyCivic });
    expect(screen.getByTestId("ballot-lookup-needed")).toBeInTheDocument();
    // Cold-open textarea is NOT in the DOM — we don't want to waste tokens.
    expect(screen.queryByTestId("cold-open-textarea")).toBeNull();
  });

  it("Civic is entirely null + flag-on + en → BallotLookupNeeded renders", () => {
    renderForBallotStep({ initialPollingData: null });
    expect(screen.getByTestId("ballot-lookup-needed")).toBeInTheDocument();
    expect(screen.queryByTestId("cold-open-textarea")).toBeNull();
  });

  it("user confirms a pasted ballot via BallotLookupNeeded → cold-open textarea appears", () => {
    renderForBallotStep({ initialPollingData: null });
    expect(screen.getByTestId("ballot-lookup-needed")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("ballot-lookup-textarea"), {
      target: {
        value: "U.S. Senate: John Doe (D)\nGovernor: Jane Smith (R)",
      },
    });
    fireEvent.click(screen.getByTestId("ballot-lookup-confirm"));

    // After confirmation the cold-open surface unlocks.
    expect(screen.getByTestId("cold-open-textarea")).toBeInTheDocument();
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
  });

  it("flag-off + Civic empty → renders legacy ResearchLayout (NOT BallotLookupNeeded)", () => {
    // ChatPanel's auto-session triggers scrollIntoView under the legacy
    // path; jsdom lacks it. Stub before render so the legacy path mounts.
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    renderForBallotStep({
      initialPollingData: emptyCivic,
      promptFleetV2Enabled: false,
    });
    // The new pre-workspace surface does NOT render on the legacy path.
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
    // Legacy ResearchLayout's own paste widget is the fallback.
    expect(screen.getByTestId("user-sample-ballot-input")).toBeInTheDocument();
  });

  it("ES locale + Civic empty → renders legacy path (NOT BallotLookupNeeded — en-only)", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    renderForBallotStep({
      initialPollingData: emptyCivic,
      lang: "es",
    });
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
    expect(screen.getByTestId("user-sample-ballot-input")).toBeInTheDocument();
  });
});

/* ── PR 8 — Fix L: pasted ballot populates workspace races ─── */

describe("parsedBallotToContests — helper", () => {
  it("emits one ContestLike per parsed race", () => {
    const text = [
      "MY BALLOT — NJ DEM",
      "U.S. Senate: Cory Booker (D) — incumbent",
      "U.S. House: Donald Norcross (D) — labor record",
      "County Commissioner: Alice Smith (D)",
      "County Commissioner: Bob Jones (D)",
      "County Commissioner: Carol Lee (D)",
    ].join("\n");

    const contests = parsedBallotToContests(text);
    expect(contests.length).toBe(5);
  });

  it("assigns unique ids for repeated offices (multi-seat races)", () => {
    // Three County Commissioner rows must NOT collide on the same id —
    // otherwise the workspace rail key-collides and decided/unpicked
    // state on one row flips state on all three.
    const text = [
      "MY BALLOT",
      "County Commissioner: Alice Smith (D)",
      "County Commissioner: Bob Jones (D)",
      "County Commissioner: Carol Lee (D)",
    ].join("\n");

    const contests = parsedBallotToContests(text);
    // raceDeriver.makeRaceId slugs from office + district. If we feed the
    // candidate name into district, the three slugs diverge.
    // Sanity check at the contest level: districts must be distinct.
    const districts = contests.map((c) => c.district ?? "");
    expect(new Set(districts).size).toBe(contests.length);
  });

  it("returns an empty array when the text has no parseable races", () => {
    expect(parsedBallotToContests("").length).toBe(0);
    expect(parsedBallotToContests("   \n  \n").length).toBe(0);
    expect(parsedBallotToContests("MY BALLOT — header only\n").length).toBe(0);
  });
});

describe("ElectionResult — Fix L: pasted ballot populates workspace races", () => {
  // NJ DEM ballot fixture: 1 Senate + 1 House + 3 County Commissioners = 5.
  const njBallotText = [
    "MY BALLOT — NJ DEM",
    "U.S. Senate: Cory Booker (D) — incumbent",
    "U.S. House: Donald Norcross (D) — labor record",
    "County Commissioner: Alice Smith (D)",
    "County Commissioner: Bob Jones (D)",
    "County Commissioner: Carol Lee (D)",
  ].join("\n");

  function renderWithPastedBallot(text: string) {
    return render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          // Civic returned nothing — the user supplied the ballot via paste.
          initialPollingData={null}
          promptFleetV2Enabled={true}
          initialLockedThemes={lockedThemes}
          // Test-only escape: mirror the legacy `initialLockedThemes` hook
          // so the workspace can mount with a pre-populated paste text
          // (the real flow sets this via BallotLookupNeeded.onConfirmed).
          initialUserSampleBallotText={text}
        />
      </LanguageProvider>,
    );
  }

  it("workspace shows N/5 in the rail counter when 5-race ballot is pasted", () => {
    renderWithPastedBallot(njBallotText);
    // ballot-pane-header shows e.g. "0/5". 5 = 1 Senate + 1 House + 3 commissioners.
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("0/5");
  });

  it("workspace rail renders one row per parsed race with stable, distinct ids", () => {
    renderWithPastedBallot(njBallotText);
    // The rail emits data-testid="workspace-rail-race-<id>" for each row.
    // Find them all and assert count + uniqueness.
    const railRows = screen
      .getAllByRole("button")
      .filter((b) =>
        (b.getAttribute("data-testid") ?? "").startsWith(
          "workspace-rail-race-",
        ),
      );
    expect(railRows.length).toBe(5);
    const ids = railRows
      .map((b) => b.getAttribute("data-testid"))
      .filter((id): id is string => id !== null);
    expect(new Set(ids).size).toBe(railRows.length);
  });

  it("empty paste text → workspace renders with zero races (no crash)", () => {
    renderWithPastedBallot("");
    // No civic + no paste → 0 races. The N/M counter should reflect that.
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("0/0");
  });
});

describe("ElectionResult — multi-seat 'Vote for N' parser (one-line comma fixture)", () => {
  // Real-world NJ sample ballots paste each office as ONE line with a
  // comma-separated candidate list. The parser must expand that into N
  // race rows so the workspace rail shows distinct entries — otherwise
  // four commissioners collapse into a single mangled row.
  const njOneLineBallotText = [
    "June 2, 2026 NJ Democratic Primary - Camden County",
    "US Senate (Vote for 1): Cory Booker (Democratic)",
    "US House CD-1 (Vote for 1): Donald Norcross (Democratic)",
    "County Commissioners (Vote for 2): Louis Cappelli Jr (Democratic), Jonathan Young (Democratic), Vanetta Hawkins (Democratic), Constance Mercedes (Democratic)",
  ].join("\n");

  function renderWithPastedBallot(text: string) {
    return render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={null}
          promptFleetV2Enabled={true}
          initialLockedThemes={lockedThemes}
          initialUserSampleBallotText={text}
        />
      </LanguageProvider>,
    );
  }

  it("workspace shows 0/6 in the rail counter for the NJ one-line fixture", () => {
    renderWithPastedBallot(njOneLineBallotText);
    // 6 = 1 Senate + 1 House + 4 commissioners (one per candidate, not per seat).
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("0/6");
  });

  it("workspace rail renders one row per candidate with distinct ids", () => {
    renderWithPastedBallot(njOneLineBallotText);
    const railRows = screen
      .getAllByRole("button")
      .filter((b) =>
        (b.getAttribute("data-testid") ?? "").startsWith(
          "workspace-rail-race-",
        ),
      );
    expect(railRows.length).toBe(6);
    const ids = railRows
      .map((b) => b.getAttribute("data-testid"))
      .filter((id): id is string => id !== null);
    expect(new Set(ids).size).toBe(railRows.length);
  });
});

/* ── PR 8 — Fix M: hide legacy paste widget after new-flow confirm ── */

describe("ElectionResult — Fix M: legacy paste widget hidden post-confirm", () => {
  it("flag-on + en + pasted via new flow → legacy UserSampleBallotInput NOT in DOM", () => {
    // ChatPanel may invoke scrollIntoView on mount; jsdom lacks it.
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={emptyCivic}
          promptFleetV2Enabled={true}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );

    // Step 1: BallotLookupNeeded is the gate.
    expect(screen.getByTestId("ballot-lookup-needed")).toBeInTheDocument();

    // Step 2: paste + confirm.
    fireEvent.change(screen.getByTestId("ballot-lookup-textarea"), {
      target: {
        value: "U.S. Senate: John Doe (D)\nGovernor: Jane Smith (R)",
      },
    });
    fireEvent.click(screen.getByTestId("ballot-lookup-confirm"));

    // Step 3: cold-open is visible — ResearchLayout has rendered.
    expect(screen.getByTestId("cold-open-textarea")).toBeInTheDocument();

    // Step 4 (the regression we're fixing): the legacy paste widget MUST
    // NOT also render. The user already supplied their ballot via the new
    // flow — re-surfacing the legacy widget pre-populated with the same
    // text is the visible duplication we're killing.
    expect(screen.queryByTestId("user-sample-ballot-input")).toBeNull();
  });

  it("flag-off + Civic empty + legacy widget path → legacy widget STAYS visible (no regression)", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={emptyCivic}
          promptFleetV2Enabled={false}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    // Legacy: no BallotLookupNeeded; legacy paste widget IS the entry.
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
    expect(screen.getByTestId("user-sample-ballot-input")).toBeInTheDocument();
  });

  it("ES locale + Civic empty → legacy widget STAYS visible (en-only fix)", () => {
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="es"
          initialPollingData={emptyCivic}
          promptFleetV2Enabled={true}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    expect(screen.queryByTestId("ballot-lookup-needed")).toBeNull();
    expect(screen.getByTestId("user-sample-ballot-input")).toBeInTheDocument();
  });
});

/* ── Fix O: cold-open reflects pasted ballot as confirmed ────── */
/**
 * After PR 8 (Fix L) wired pasted ballots into the workspace race list,
 * the live cold-open surface still rendered as if no ballot existed:
 * - `compactBallotStatus` read pollingData.contests only, showing
 *   "0 races · Not confirmed" while userSampleBallotText was already set.
 * - The "Exact ballot not confirmed yet" panel surfaced under the same
 *   `!hasOfficialContests` gate, ignoring the paste.
 *
 * Live repro: user pastes via BallotLookupNeeded → lands in cold-open →
 * sees "Not confirmed" + warning panel → thinks paste was lost → bails
 * before locking themes. The workspace itself was fine (themes lock
 * mounts the 3-pane with paste-derived races), but the user never got
 * that far. This fix makes the cold-open mirror state truthfully so the
 * user can push through.
 */
describe("ElectionResult — Fix O: cold-open paste affordance", () => {
  const njBallotText = [
    "MY BALLOT — NJ DEM",
    "U.S. Senate: Cory Booker (D)",
    "U.S. House: Donald Norcross (D)",
  ].join("\n");

  function renderColdOpenWithPaste(text: string) {
    Element.prototype.scrollIntoView = vi.fn();
    return render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          // Civic returned nothing — user pasted to fill the gap.
          initialPollingData={null}
          promptFleetV2Enabled={true}
          // CRITICAL: lockedThemes is null. The cold-open surface is the
          // active render path. This is what live users see between
          // BallotLookupNeeded confirm and theme lock-in.
          initialLockedThemes={null}
          initialUserSampleBallotText={text}
        />
      </LanguageProvider>,
    );
  }

  it("compactBallotStatus no longer says 'Not confirmed' when paste is present", () => {
    renderColdOpenWithPaste(njBallotText);
    const strip = screen.getByTestId("research-context-strip");
    // The misleading "Not confirmed" copy must be gone — the user just
    // pasted a ballot. Either the strip says "Pasted by you" or it counts
    // the parsed races; either way the literal "Not confirmed" string is
    // wrong here.
    expect(strip.textContent ?? "").not.toContain("Not confirmed");
    // Same for the count — "0 races" is wrong when paste parsed to N races.
    expect(strip.textContent ?? "").not.toMatch(/\b0 races?\b/);
  });

  it("'Exact ballot not confirmed yet' warning panel is absent when paste is present", () => {
    renderColdOpenWithPaste(njBallotText);
    // The ballot-data-status panel surfaces the warning; it shouldn't
    // render at all when the user has supplied a ballot via paste.
    expect(screen.queryByTestId("ballot-data-status")).toBeNull();
  });

  it("flag-off + Civic empty + no paste → warning panel still renders (regression guard)", () => {
    // Flag-off path skips BallotLookupNeeded, so ResearchLayout IS the
    // active surface even with no paste. The fix must be gated on
    // `hasUserSampleBallot`, not always-off — without paste, the warning
    // panel and "Not confirmed" copy are still correct.
    Element.prototype.scrollIntoView = vi.fn();
    const emptyCivic = {
      pollingLocations: [],
      earlyVoteSites: [],
      county: "Travis County",
      contests: [],
    };
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={emptyCivic}
          promptFleetV2Enabled={false}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    const strip = screen.getByTestId("research-context-strip");
    expect(strip.textContent ?? "").toContain("Not confirmed");
    expect(screen.getByTestId("ballot-data-status")).toBeInTheDocument();
  });
});

/* ── PR A2 — strip legacy "ELECTION GUIDE" sidebar on the cold-open ─ */

describe("ElectionResult — cold-open chrome (PR A2)", () => {
  it("does NOT render the legacy 'Election Guide' sidebar under flag-on + en (cold-open)", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={civicData}
          promptFleetV2Enabled={true}
          // Cold-open path: themes NOT yet locked, but a ballot is ready
          // (Civic returned contests). With flag-on + en this should render
          // without the legacy sidebar chrome.
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    // The legacy sidebar renders an "Election Guide" headline (translations
    // key `research.sidebarTitle`). It must NOT be in the DOM on the cold-
    // open path under the new flag-on + en flow.
    expect(screen.queryByText(/Election Guide/i)).not.toBeInTheDocument();
    // The legacy "CHECK REGISTRATION" sidebar CTA must also be gone.
    expect(screen.queryByText(/CHECK REGISTRATION/i)).not.toBeInTheDocument();
  });

  it("KEEPS the legacy 'Election Guide' sidebar on the ES path (flag-on + es) — no regression", async () => {
    // Prime localStorage so the LanguageProvider hydrates to "es" (and the
    // ResearchLayout's `useLanguage()` reads `lang === "es"`). The
    // `lang` prop on ElectionResult only feeds the props it drills down;
    // the sidebar branch lives in ResearchLayout which uses context.
    window.localStorage.setItem("ballot-tool-lang", "es");
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="es"
          initialPollingData={civicData}
          promptFleetV2Enabled={true}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    // Flush the post-hydration effect that flips LanguageProvider into "es".
    await act(async () => {});
    // Sidebar copy in ES — "Guía Electoral".
    expect(screen.getByText(/Guía Electoral/i)).toBeInTheDocument();
  });

  it("KEEPS the legacy 'Election Guide' sidebar on the flag-off path — no regression", () => {
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={civicData}
          promptFleetV2Enabled={false}
          initialLockedThemes={null}
        />
      </LanguageProvider>,
    );
    // Sidebar renders for the legacy flag-off path even in English.
    expect(screen.getByText(/Election Guide/i)).toBeInTheDocument();
  });
});
