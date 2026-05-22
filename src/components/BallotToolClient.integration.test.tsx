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
