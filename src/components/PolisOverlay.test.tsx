// @vitest-environment jsdom
/**
 * PolisOverlay — Phase 8 restructure.
 *
 * Renders three readings (bars, bridges, compass) each independently
 * fetching from its own endpoint. Tests cover:
 *   - All three sections are rendered (heading + content / empty state)
 *   - Honest empty states for zero-session, below-threshold, no-bridges-yet
 *   - Re-fetch on county change
 *   - Cluster labels never contain partisan strings (rendered surface)
 *   - No identity fields surface in rendered DOM
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PolisOverlay } from "./PolisOverlay";
import { LanguageProvider } from "../lib/i18n";

/* ── Fetch stub helpers ──────────────────────────────────────── */

interface MockResponses {
  bars?: Record<string, unknown>;
  bridges?: Record<string, unknown>;
  compass?: Record<string, unknown>;
}

function installFetchMock(responses: MockResponses) {
  // Sensible shape-correct defaults so a test that only overrides one
  // endpoint doesn't crash the other two on missing array fields.
  const DEFAULT_BARS = {
    county: "Travis",
    threshold: 50,
    count: 0,
    bars: [],
  };
  const DEFAULT_BRIDGES = {
    county: "Travis",
    threshold: 50,
    count: 0,
    bridges: [],
  };
  const DEFAULT_COMPASS = {
    county: "Travis",
    threshold: 150,
    count: 0,
    status: "below_threshold",
    clusters: [],
    dots: [],
  };

  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      let body: Record<string, unknown>;
      if (url.includes("/api/polis/bars")) {
        body = responses.bars ?? DEFAULT_BARS;
      } else if (url.includes("/api/polis/bridges")) {
        body = responses.bridges ?? DEFAULT_BRIDGES;
      } else if (url.includes("/api/polis/compass")) {
        body = responses.compass ?? DEFAULT_COMPASS;
      } else {
        body = {};
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
  return fetchSpy;
}

function renderOverlay(opts: {
  county?: string;
  stateCode?: string;
  userThemes?: Array<{ id: string; label: string }>;
  countyName?: string;
}) {
  return render(
    <LanguageProvider>
      <PolisOverlay
        stateCode={opts.stateCode ?? "TX"}
        county={opts.county ?? "Travis"}
        countyName={opts.countyName ?? opts.county ?? "Travis County"}
        userThemes={
          opts.userThemes ?? [
            { id: "healthcare", label: "Healthcare access" },
            { id: "housing", label: "Housing affordability" },
          ]
        }
      />
    </LanguageProvider>,
  );
}

/* ── Setup ───────────────────────────────────────────────────── */

describe("PolisOverlay (Phase 8 — bars + bridges + compass)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Section rendering ──────────────────────────────────── */

  it("renders the bars, bridges, and compass sections", async () => {
    installFetchMock({
      bars: {
        county: "Travis",
        threshold: 50,
        count: 73,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
          { themeId: "housing", theme: "Housing affordability", percent: 64 },
        ],
      },
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 73,
        status: "no_bridges_yet",
        bridges: [],
      },
      compass: {
        county: "Travis",
        threshold: 150,
        count: 73,
        status: "below_threshold",
        clusters: [],
        dots: [],
      },
    });

    renderOverlay({});

    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    });
    expect(screen.getByTestId("polis-bridges-section")).toBeInTheDocument();
    expect(screen.getByTestId("polis-compass-section")).toBeInTheDocument();
  });

  /* ── Bars rendering ─────────────────────────────────────── */

  it("renders one overlap bar per user theme with the percent text", async () => {
    installFetchMock({
      bars: {
        county: "Travis",
        threshold: 50,
        count: 73,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
          { themeId: "housing", theme: "Housing affordability", percent: 64 },
        ],
      },
    });

    renderOverlay({});

    await waitFor(() => {
      expect(screen.getByTestId("overlap-bar-healthcare")).toBeInTheDocument();
    });
    expect(screen.getByTestId("overlap-bar-housing")).toBeInTheDocument();
    // Percent text is load-bearing (not just decoration).
    expect(screen.getByTestId("overlap-bar-healthcare")).toHaveTextContent(
      "78%",
    );
    expect(screen.getByTestId("overlap-bar-housing")).toHaveTextContent("64%");
  });

  it("bars empty state (count=0): honest 'just getting started' message", async () => {
    installFetchMock({
      bars: { county: "Travis", threshold: 50, count: 0, bars: [] },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("polis-bars-empty")).toHaveTextContent(
      /just getting started|haven't been seen/i,
    );
  });

  it("bars below_threshold: shows count and threshold in honest copy", async () => {
    installFetchMock({
      bars: {
        county: "Travis",
        threshold: 50,
        count: 12,
        status: "below_threshold",
        bars: [],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(
        screen.getByTestId("polis-bars-below-threshold"),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId("polis-bars-below-threshold")).toHaveTextContent(
      /12/,
    );
  });

  /* ── Bridges rendering ───────────────────────────────────── */

  it("bridges empty state (no_bridges_yet): honest 'needs more data' message", async () => {
    installFetchMock({
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 80,
        status: "no_bridges_yet",
        bridges: [],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("polis-bridges-empty")).toBeInTheDocument();
    });
    expect(screen.getByTestId("polis-bridges-empty")).toHaveTextContent(
      /no bridge statements yet|needs more data/i,
    );
  });

  it("bridges below_threshold: shows count and threshold", async () => {
    installFetchMock({
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 12,
        status: "below_threshold",
        bridges: [],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(
        screen.getByTestId("polis-bridges-below-threshold"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId("polis-bridges-below-threshold"),
    ).toHaveTextContent(/12/);
  });

  it("bridges with statements (future v2): renders bridge cards with cluster names + percents", async () => {
    installFetchMock({
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 200,
        bridges: [
          {
            statement:
              "Members of Congress should not trade individual stocks while in office.",
            clusters: [
              {
                name: "Service-first progressives",
                agreementPercent: 93,
              },
              { name: "Pocketbook moderates", agreementPercent: 89 },
              { name: "Civic libertarians", agreementPercent: 94 },
            ],
          },
        ],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("bridge-statement-0")).toBeInTheDocument();
    });
    expect(screen.getByTestId("bridge-statement-0")).toHaveTextContent(
      /trade individual stocks/,
    );
    expect(screen.getByTestId("bridge-statement-0")).toHaveTextContent(/93/);
    expect(screen.getByTestId("bridge-statement-0")).toHaveTextContent(/89/);
    expect(screen.getByTestId("bridge-statement-0")).toHaveTextContent(/94/);
    expect(screen.getByTestId("bridge-statement-0")).toHaveTextContent(
      /Service-first progressives/,
    );
  });

  /* ── Compass rendering ───────────────────────────────────── */

  it("compass below_threshold: shows the count vs threshold honest message", async () => {
    installFetchMock({
      compass: {
        county: "Travis",
        threshold: 150,
        count: 73,
        status: "below_threshold",
        clusters: [],
        dots: [],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("compass-empty")).toBeInTheDocument();
    });
    // Both numbers visible.
    expect(screen.getByTestId("compass-empty")).toHaveTextContent(/73/);
    expect(screen.getByTestId("compass-empty")).toHaveTextContent(/150/);
  });

  /* ── Privacy + label hygiene of the rendered DOM ─────────── */

  it("rendered DOM does not include identity-shaped strings (user_id, session_id, email, address)", async () => {
    installFetchMock({
      bars: {
        county: "Travis",
        threshold: 50,
        count: 73,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
        ],
      },
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 73,
        status: "no_bridges_yet",
        bridges: [],
      },
      compass: {
        county: "Travis",
        threshold: 150,
        count: 73,
        status: "below_threshold",
        clusters: [],
        dots: [],
      },
    });
    const { container } = renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    });
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/user_id|session_id|@.*\.|address/i);
  });

  it("rendered DOM does not contain partisan strings in bridge cluster labels", async () => {
    installFetchMock({
      bridges: {
        county: "Travis",
        threshold: 50,
        count: 200,
        bridges: [
          {
            statement: "Something everyone agrees on.",
            clusters: [
              { name: "Service-first progressives", agreementPercent: 92 },
              { name: "Pocketbook moderates", agreementPercent: 88 },
              { name: "Civic libertarians", agreementPercent: 91 },
            ],
          },
        ],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("bridge-statement-0")).toBeInTheDocument();
    });
    const cardText = screen.getByTestId("bridge-statement-0").textContent ?? "";
    expect(cardText).not.toMatch(
      /democrat|republican|independent|\bdem\b|\brep\b/i,
    );
  });

  /* ── County re-fetch ─────────────────────────────────────── */

  it("re-fetches all three endpoints when the county prop changes", async () => {
    const spy = installFetchMock({});
    const { rerender } = render(
      <LanguageProvider>
        <PolisOverlay
          stateCode="TX"
          county="Travis"
          countyName="Travis County"
          userThemes={[{ id: "healthcare", label: "Healthcare access" }]}
        />
      </LanguageProvider>,
    );
    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    const callsBefore = spy.mock.calls.length;

    // Change county.
    rerender(
      <LanguageProvider>
        <PolisOverlay
          stateCode="TX"
          county="Harris"
          countyName="Harris County"
          userThemes={[{ id: "healthcare", label: "Healthcare access" }]}
        />
      </LanguageProvider>,
    );

    await waitFor(() => {
      // Each endpoint re-fetched once more (3 additional calls minimum).
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(callsBefore + 3);
    });
    const calledUrls = spy.mock.calls
      .map((c) => (typeof c[0] === "string" ? c[0] : (c[0] as URL).toString()))
      .join("\n");
    expect(calledUrls).toMatch(/county=Harris/);
  });
});
