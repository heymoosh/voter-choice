// @vitest-environment jsdom
/**
 * PolisOverlay — PR 10 (national-default).
 *
 * Renders three readings (bars, bridges, compass) each independently
 * fetching from its own endpoint. Defaults to scope=national;
 * a toggle lets users switch to scope=county when county is known.
 *
 * Tests cover:
 *   - National default: heading "across the country", fetches scope=national
 *   - County toggle: switches scope, fetches with scope=county
 *   - Hidden toggle when countyName is null/empty (national-only)
 *   - All three sections render with correct copy per scope
 *   - Honest empty states for zero-session, below-threshold, no-bridges-yet
 *   - Cluster labels never contain partisan strings
 *   - No identity fields surface in rendered DOM
 */

import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  const DEFAULT_BARS = {
    scope: "national",
    threshold: 50,
    count: 0,
    bars: [],
  };
  const DEFAULT_BRIDGES = {
    scope: "national",
    threshold: 50,
    count: 0,
    bridges: [],
  };
  const DEFAULT_COMPASS = {
    scope: "national",
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
  countyName?: string | null;
}) {
  return render(
    <LanguageProvider>
      <PolisOverlay
        stateCode={opts.stateCode ?? "TX"}
        county={opts.county ?? "Travis"}
        countyName={
          opts.countyName === null
            ? undefined
            : (opts.countyName ?? opts.county ?? "Travis County")
        }
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

describe("PolisOverlay — PR 10 (national-default)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ── Default scope: national ─────────────────────────────── */

  it("defaults to scope=national: fetches without scope=county, heading reflects national", async () => {
    const spy = installFetchMock({
      bars: {
        scope: "national",
        threshold: 50,
        count: 5000,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
        ],
      },
    });
    renderOverlay({});
    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    });
    // Heading reflects national framing.
    expect(screen.getByTestId("polis-bars-section")).toHaveTextContent(
      /across the country|nationwide/i,
    );
    // Fetch URLs include scope=national.
    const urls = spy.mock.calls
      .map((c) => (typeof c[0] === "string" ? c[0] : (c[0] as URL).toString()))
      .filter((u) => u.includes("/api/polis/"));
    expect(urls.length).toBeGreaterThanOrEqual(3);
    expect(urls.some((u) => u.includes("scope=national"))).toBe(true);
    // No URLs include scope=county initially.
    expect(urls.some((u) => u.includes("scope=county"))).toBe(false);
  });

  /* ── Scope toggle ─────────────────────────────────────────── */

  it("when countyName is present, renders a toggle to switch to county scope", async () => {
    installFetchMock({});
    renderOverlay({ countyName: "Travis County" });
    await waitFor(() => {
      expect(screen.getByTestId("polis-scope-toggle")).toBeInTheDocument();
    });
    // The toggle exposes both options.
    const toggle = screen.getByTestId("polis-scope-toggle");
    expect(toggle.textContent ?? "").toMatch(/nationwide/i);
    expect(toggle.textContent ?? "").toMatch(/your county|travis/i);
  });

  it("when countyName is null/empty, hides the toggle (national-only)", async () => {
    installFetchMock({});
    renderOverlay({ countyName: null, county: "" });
    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("polis-scope-toggle")).toBeNull();
  });

  it("clicking 'Your county' switches scope and re-fetches with scope=county", async () => {
    const spy = installFetchMock({
      bars: {
        scope: "county",
        county: "Travis",
        threshold: 50,
        count: 73,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
        ],
      },
    });
    renderOverlay({ countyName: "Travis County" });
    await waitFor(() => {
      expect(
        screen.getByTestId("polis-scope-toggle-county"),
      ).toBeInTheDocument();
    });
    const callsBefore = spy.mock.calls.length;
    fireEvent.click(screen.getByTestId("polis-scope-toggle-county"));
    await waitFor(() => {
      const newCalls = spy.mock.calls
        .slice(callsBefore)
        .map((c) =>
          typeof c[0] === "string" ? c[0] : (c[0] as URL).toString(),
        );
      expect(newCalls.some((u) => u.includes("scope=county"))).toBe(true);
    });
    // Heading now reflects county framing.
    await waitFor(() => {
      expect(screen.getByTestId("polis-bars-section")).toHaveTextContent(
        /Travis County|in Travis/,
      );
    });
  });

  it("clicking 'Nationwide' after switching to county returns to national", async () => {
    const spy = installFetchMock({});
    renderOverlay({ countyName: "Travis County" });
    await waitFor(() => {
      expect(
        screen.getByTestId("polis-scope-toggle-county"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("polis-scope-toggle-county"));
    const callsAfterCounty = spy.mock.calls.length;
    fireEvent.click(screen.getByTestId("polis-scope-toggle-national"));
    await waitFor(() => {
      const newCalls = spy.mock.calls
        .slice(callsAfterCounty)
        .map((c) =>
          typeof c[0] === "string" ? c[0] : (c[0] as URL).toString(),
        );
      expect(newCalls.some((u) => u.includes("scope=national"))).toBe(true);
    });
  });

  /* ── Section rendering ──────────────────────────────────── */

  it("renders the bars, bridges, and compass sections", async () => {
    installFetchMock({
      bars: {
        scope: "national",
        threshold: 50,
        count: 5000,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
          { themeId: "housing", theme: "Housing affordability", percent: 64 },
        ],
      },
      bridges: {
        scope: "national",
        threshold: 50,
        count: 5000,
        status: "no_bridges_yet",
        bridges: [],
      },
      compass: {
        scope: "national",
        threshold: 150,
        count: 5000,
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

  it("renders one overlap bar per user theme with the percent text", async () => {
    installFetchMock({
      bars: {
        scope: "national",
        threshold: 50,
        count: 5000,
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
    expect(screen.getByTestId("overlap-bar-healthcare")).toHaveTextContent(
      "78%",
    );
    expect(screen.getByTestId("overlap-bar-housing")).toHaveTextContent("64%");
  });

  it("bars empty state (count=0): honest 'just getting started' message", async () => {
    installFetchMock({
      bars: { scope: "national", threshold: 50, count: 0, bars: [] },
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
        scope: "national",
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
        scope: "national",
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
        scope: "national",
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

  it("bridges with statements: renders bridge cards with cluster names + percents", async () => {
    installFetchMock({
      bridges: {
        scope: "national",
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

  it("compass below_threshold: shows count vs threshold honest message", async () => {
    installFetchMock({
      compass: {
        scope: "national",
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
    expect(screen.getByTestId("compass-empty")).toHaveTextContent(/73/);
    expect(screen.getByTestId("compass-empty")).toHaveTextContent(/150/);
  });

  /* ── Privacy + label hygiene ─────────────────────────────── */

  it("rendered DOM does not include identity-shaped strings", async () => {
    installFetchMock({
      bars: {
        scope: "national",
        threshold: 50,
        count: 5000,
        bars: [
          { themeId: "healthcare", theme: "Healthcare access", percent: 78 },
        ],
      },
      bridges: {
        scope: "national",
        threshold: 50,
        count: 5000,
        status: "no_bridges_yet",
        bridges: [],
      },
      compass: {
        scope: "national",
        threshold: 150,
        count: 5000,
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
        scope: "national",
        threshold: 50,
        count: 5000,
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

  /* ── County mode re-fetch ────────────────────────────────── */

  it("re-fetches all three endpoints when scope toggles to county", async () => {
    const spy = installFetchMock({});
    render(
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

    fireEvent.click(screen.getByTestId("polis-scope-toggle-county"));

    await waitFor(() => {
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(callsBefore + 3);
    });
    const calledUrls = spy.mock.calls
      .map((c) => (typeof c[0] === "string" ? c[0] : (c[0] as URL).toString()))
      .join("\n");
    expect(calledUrls).toMatch(/scope=county/);
    expect(calledUrls).toMatch(/county=Travis/);
  });
});
