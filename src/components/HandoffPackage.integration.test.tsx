// @vitest-environment jsdom
/**
 * HandoffPackage integration tests — Phase 2, Agent C.
 * Covers: polis viz render, counter-write fire, polis fetch query params,
 * and the session-context parsing helpers.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import {
  HandoffPackage,
  parseConfirmedConcerns,
  parsePicks,
  derivePrimary,
} from "./HandoffPackage";
import { LanguageProvider } from "../lib/i18n";
import type { ParsedHandoff } from "./HandoffPackage";

/* ── helpers ──────────────────────────────────────────────────── */

const MINIMAL_PARSED: ParsedHandoff = {
  ballot: null,
  voterProfile: null,
  handoffBlock: "=== VOTER SESSION HANDOFF ===\n=== END HANDOFF ===",
  preamble: "Here is your session summary.",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

/* ── parseConfirmedConcerns ───────────────────────────────────── */

describe("parseConfirmedConcerns", () => {
  it("returns empty array when no confirmed concerns message exists", () => {
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    expect(parseConfirmedConcerns(messages)).toEqual([]);
  });

  it("extracts canonicalIssue ids from the latest [VOTER CONFIRMED CONCERNS] message", () => {
    const confirmations = JSON.stringify([
      { canonicalIssue: "crime_public_safety", rank: 1 },
      { canonicalIssue: "property_taxes", rank: 2 },
    ]);
    const messages = [
      {
        role: "user",
        content: `[VOTER CONFIRMED CONCERNS] confirmations=${confirmations}`,
      },
    ];
    expect(parseConfirmedConcerns(messages)).toEqual([
      "crime_public_safety",
      "property_taxes",
    ]);
  });

  it("skips entries without canonicalIssue", () => {
    const confirmations = JSON.stringify([
      { canonicalIssue: "housing", rank: 1 },
      { rank: 2 }, // missing canonicalIssue
    ]);
    const messages = [
      {
        role: "user",
        content: `[VOTER CONFIRMED CONCERNS] confirmations=${confirmations}`,
      },
    ];
    expect(parseConfirmedConcerns(messages)).toEqual(["housing"]);
  });

  it("returns empty array if the JSON is malformed", () => {
    const messages = [
      {
        role: "user",
        content: "[VOTER CONFIRMED CONCERNS] confirmations=not-json",
      },
    ];
    expect(parseConfirmedConcerns(messages)).toEqual([]);
  });
});

/* ── parsePicks ───────────────────────────────────────────────── */

describe("parsePicks", () => {
  it("returns empty array when no picks exist", () => {
    expect(parsePicks([{ role: "user", content: "Hello" }])).toEqual([]);
  });

  it("extracts a single pick", () => {
    const messages = [
      {
        role: "user",
        content: `[VOTER PICKED] race="Mayor" choice="candidate-a" candidateName="Jane Doe"`,
      },
    ];
    expect(parsePicks(messages)).toEqual([
      { race: "Mayor", candidateId: "candidate-a" },
    ]);
  });

  it("accumulates multiple picks across messages", () => {
    const messages = [
      {
        role: "user",
        content: `[VOTER PICKED] race="Mayor" choice="cand-a" candidateName="Jane"`,
      },
      { role: "assistant", content: "Got it." },
      {
        role: "user",
        content: `[VOTER PICKED] race="School Board" choice="cand-b" candidateName="Bob"`,
      },
    ];
    expect(parsePicks(messages)).toEqual([
      { race: "Mayor", candidateId: "cand-a" },
      { race: "School Board", candidateId: "cand-b" },
    ]);
  });
});

/* ── derivePrimary ────────────────────────────────────────────── */

describe("derivePrimary", () => {
  it("returns GENERAL when runoffChoice is null", () => {
    expect(derivePrimary(null)).toBe("GENERAL");
  });

  it("maps voted_dem_primary to DEM", () => {
    expect(derivePrimary("voted_dem_primary")).toBe("DEM");
  });

  it("maps did_not_vote_dem_runoff to DEM", () => {
    expect(derivePrimary("did_not_vote_dem_runoff")).toBe("DEM");
  });

  it("maps voted_rep_primary to REP", () => {
    expect(derivePrimary("voted_rep_primary")).toBe("REP");
  });

  it("maps did_not_vote_rep_runoff to REP", () => {
    expect(derivePrimary("did_not_vote_rep_runoff")).toBe("REP");
  });

  it("maps unsure to OPEN", () => {
    expect(derivePrimary("unsure")).toBe("OPEN");
  });
});

/* ── HandoffPackage render + fetch ─────────────────────────── */

describe("HandoffPackage — polis overlay + counter write", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // Default: polis fetch returns a locked state
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/polis")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              scope: "county",
              sampleSize: 5,
              thresholdMet: false,
              countToUnlock: 195,
              dots: [],
              you: null,
              consensus: [],
            }),
        });
      }
      // counters endpoint
      if (typeof url === "string" && url.includes("/api/counters")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the handoff summary without polis overlay when stateCode/county absent", () => {
    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
      />,
      { wrapper },
    );

    expect(screen.getByTestId("chat-handoff-package")).toBeInTheDocument();
    expect(
      screen.queryByTestId("polis-overlay-section"),
    ).not.toBeInTheDocument();
  });

  it("renders the polis overlay section when stateCode and county are provided", async () => {
    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        countyName="Harris County"
        stateName="Texas"
        primary="DEM"
        messages={[]}
      />,
      { wrapper },
    );

    // The polis overlay section wrapper should render
    expect(screen.getByTestId("polis-overlay-section")).toBeInTheDocument();
  });

  it("fires a counter-write POST once on mount when stateCode + county present", async () => {
    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="REP"
        messages={[]}
      />,
      { wrapper },
    );

    await waitFor(() => {
      const counterCalls = fetchMock.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("/api/counters"),
      );
      expect(counterCalls).toHaveLength(1);
    });
  });

  it("sends correct query params to /api/polis", async () => {
    const confirmations = JSON.stringify([
      { canonicalIssue: "crime_public_safety", rank: 1 },
    ]);
    const messages = [
      {
        role: "user",
        content: `[VOTER CONFIRMED CONCERNS] confirmations=${confirmations}`,
      },
    ];

    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={messages}
      />,
      { wrapper },
    );

    await waitFor(() => {
      const polisCalls = fetchMock.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("/api/polis"),
      );
      expect(polisCalls).toHaveLength(1);
      const url = polisCalls[0][0] as string;
      expect(url).toContain("stateCode=TX");
      expect(url).toContain("county=Harris");
      expect(url).toContain("userConcerns=crime_public_safety");
    });
  });

  it("counter POST body includes sessionId, stateCode, county, primary, concerns, picks", async () => {
    const confirmations = JSON.stringify([
      { canonicalIssue: "housing", rank: 1 },
    ]);
    const messages = [
      {
        role: "user",
        content: `[VOTER CONFIRMED CONCERNS] confirmations=${confirmations}`,
      },
      {
        role: "user",
        content: `[VOTER PICKED] race="Mayor" choice="cand-x" candidateName="Sam"`,
      },
    ];

    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Travis"
        primary="OPEN"
        messages={messages}
      />,
      { wrapper },
    );

    await waitFor(() => {
      const counterCalls = fetchMock.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("/api/counters"),
      );
      expect(counterCalls).toHaveLength(1);
      const body = JSON.parse(counterCalls[0][1].body as string);
      expect(body).toHaveProperty("sessionId");
      expect(body.stateCode).toBe("TX");
      expect(body.county).toBe("Travis");
      expect(body.primary).toBe("OPEN");
      expect(body.confirmedConcerns).toEqual([{ canonicalIssue: "housing" }]);
      expect(body.picks).toEqual([{ race: "Mayor", candidateId: "cand-x" }]);
    });
  });

  it("does not fire /api/polis before parsed handoff is provided", async () => {
    // Render without parsed (null) — polis fetch must not fire yet
    const { rerender } = render(
      <HandoffPackage
        parsed={null}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={[]}
      />,
      { wrapper },
    );

    // Give effects a tick to run
    await new Promise((r) => setTimeout(r, 50));

    const polisCallsBefore = fetchMock.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("/api/polis"),
    );
    expect(polisCallsBefore).toHaveLength(0);

    // Now supply a parsed handoff — polis fetch should fire once
    rerender(
      <HandoffPackage
        parsed={MINIMAL_PARSED}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={[]}
      />,
    );

    await waitFor(() => {
      const polisCallsAfter = fetchMock.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("/api/polis"),
      );
      expect(polisCallsAfter).toHaveLength(1);
    });
  });

  it("does not fire counter-write twice on re-render", async () => {
    const { rerender } = render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={[]}
      />,
      { wrapper },
    );

    // Re-render with same props using the same wrapper — component stays mounted
    rerender(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={[]}
      />,
    );

    // Wait for any async effects and confirm counter fired exactly once
    await waitFor(() => {
      const counterCalls = fetchMock.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("/api/counters"),
      );
      expect(counterCalls).toHaveLength(1);
    });
  });

  it("counter-write failure does not crash the component", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/api/counters")) {
        return Promise.reject(new Error("Network error"));
      }
      if (typeof url === "string" && url.includes("/api/polis")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(
      <HandoffPackage
        parsed={MINIMAL_PARSED!}
        continuationPrompt="Continue here"
        stateCode="TX"
        county="Harris"
        primary="DEM"
        messages={[]}
      />,
      { wrapper },
    );

    // Component should still render the handoff package
    await waitFor(() => {
      expect(screen.getByTestId("chat-handoff-package")).toBeInTheDocument();
    });
  });
});
