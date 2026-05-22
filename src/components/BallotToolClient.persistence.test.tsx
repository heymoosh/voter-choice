// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { LanguageProvider } from "../lib/i18n";
import { ElectionResult } from "./BallotToolClient";
import type { StateElectionData } from "../types/election";
import type { Theme } from "../lib/prompts/types";

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
];

const civicData = {
  pollingLocations: [],
  earlyVoteSites: [],
  county: "Travis County",
  contests: [
    {
      office: "Governor",
      district: "Texas",
      type: "General",
      candidates: [{ name: "Alice", party: "Democratic" }],
    },
    {
      office: "U.S. Senator",
      district: "Texas",
      type: "General",
      candidates: [{ name: "Bob", party: "Republican" }],
    },
  ],
};

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

function renderElectionResult() {
  return render(
    <LanguageProvider>
      <ElectionResult
        state={txState}
        zipCode="73301"
        lang="en"
        initialPollingData={civicData}
        promptFleetV2Enabled={true}
        initialLockedThemes={lockedThemes}
      />
    </LanguageProvider>,
  );
}

describe("ElectionResult — workspace persistence (Phase 3)", () => {
  it("persists committed decisions to localStorage", () => {
    const { unmount } = renderElectionResult();
    const pickBtn = screen.getByTestId("workspace-pick-trigger");
    const raceId = pickBtn.getAttribute("data-race-id")!;
    fireEvent.click(pickBtn);
    fireEvent.change(screen.getByTestId("workspace-why-textarea"), {
      target: { value: "they have a record" },
    });
    fireEvent.click(screen.getByTestId("workspace-why-commit"));

    const raw = window.localStorage.getItem("voter-choice:workspace:state:v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.decisions).toHaveLength(1);
    expect(parsed.decisions[0].raceId).toBe(raceId);
    expect(parsed.decisions[0].whyNote).toBe("they have a record");

    unmount();
  });

  it("rehydrates decisions and activeRaceId from localStorage on mount", () => {
    const seed = {
      decisions: [
        {
          raceId: "governor-texas",
          raceLabel: "Governor — Texas",
          section: "State",
          pick: "Alice",
          party: "Democratic",
          whyNote: "rehydrated",
        },
      ],
      activeRaceId: "governor-texas",
    };
    window.localStorage.setItem(
      "voter-choice:workspace:state:v1",
      JSON.stringify(seed),
    );

    renderElectionResult();

    // Decision rehydrated into the ballot pane.
    expect(
      screen.getByTestId("ballot-pane-why-governor-texas"),
    ).toHaveTextContent("rehydrated");
    expect(screen.getByTestId("ballot-pane-header")).toHaveTextContent("1/2");
    // Active race rehydrated into the rail.
    expect(
      screen.getByTestId("workspace-rail-race-governor-texas"),
    ).toHaveAttribute("aria-current", "page");
  });

  it("does NOT clobber saved state with an empty mount", () => {
    const seed = {
      decisions: [
        {
          raceId: "governor-texas",
          raceLabel: "Governor — Texas",
          section: "State",
          pick: "Alice",
          party: "Democratic",
          whyNote: "preserved",
        },
      ],
      activeRaceId: "governor-texas",
    };
    window.localStorage.setItem(
      "voter-choice:workspace:state:v1",
      JSON.stringify(seed),
    );

    const { unmount } = renderElectionResult();
    // Unmount without committing anything; the saved state should still be there.
    unmount();
    const raw = window.localStorage.getItem("voter-choice:workspace:state:v1");
    const parsed = JSON.parse(raw!);
    expect(parsed.decisions).toHaveLength(1);
    expect(parsed.decisions[0].whyNote).toBe("preserved");
  });

  it("persists lockedThemes to localStorage so they survive remount", () => {
    // Production flow: user comes back from the BudgetExhausted screen
    // (or refresh), the workspace remounts without initialLockedThemes,
    // and themes MUST still surface from localStorage. Otherwise the user
    // is dropped back to cold-open, losing their session.
    const { unmount } = renderElectionResult();
    // The locked themes fixture is passed via initialLockedThemes; after
    // the first hydration-driven persistence write, they should land in
    // localStorage.
    const raw = window.localStorage.getItem("voter-choice:workspace:state:v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.lockedThemes).toBeDefined();
    expect(parsed.lockedThemes).toHaveLength(1);
    expect(parsed.lockedThemes[0].name).toBe("Healthcare costs");
    unmount();
  });

  it("rehydrates lockedThemes from localStorage so a fresh mount keeps the workspace open", () => {
    // Seed full state (decisions + activeRaceId + lockedThemes) — simulate
    // the second render after BudgetExhausted unmounted the workspace.
    const seed = {
      decisions: [],
      activeRaceId: "u-s-president",
      lockedThemes: [
        {
          name: "Healthcare costs",
          quotes: ['"insulin prices keep going up"'],
        },
      ],
    };
    window.localStorage.setItem(
      "voter-choice:workspace:state:v1",
      JSON.stringify(seed),
    );

    // Render WITHOUT the test-only initialLockedThemes hook — production
    // callers never pass it. The workspace shell should still come up.
    render(
      <LanguageProvider>
        <ElectionResult
          state={txState}
          zipCode="73301"
          lang="en"
          initialPollingData={civicData}
          promptFleetV2Enabled={true}
        />
      </LanguageProvider>,
    );

    // The workspace shell (rail + chat + ballot pane) renders only when
    // lockedThemes !== null. If hydration didn't restore themes, we'd see
    // the cold-open surface instead.
    expect(screen.getByTestId("workspace-rail-theme-0")).toHaveTextContent(
      "Healthcare costs",
    );
  });
});
