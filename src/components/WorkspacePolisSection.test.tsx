// @vitest-environment jsdom
/**
 * WorkspacePolisSection — collapsible workspace surface that hosts
 * PolisOverlay. Closed by default per the Phase 8 packet rule
 * ("Polis is opt-in or post-decision: doesn't compete with workspace
 * focus"). Mounted in the WorkspaceRail.
 *
 * Behavior contract:
 *  - Renders only when county + userThemes are both non-empty.
 *  - Closed by default — overlay is NOT in the DOM at rest.
 *  - Expand toggle reveals the overlay (conditional render, not
 *    display:none — avoids firing the three polis fetches before the
 *    user signals interest).
 *  - Collapse toggle removes the overlay from the DOM again.
 */
import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LanguageProvider } from "../lib/i18n";
import { WorkspacePolisSection } from "./WorkspacePolisSection";

/* ── Fetch stub so PolisOverlay's internal fetches don't blow up ── */

function installPolisFetchStub() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const empty = {
        county: "Travis",
        threshold: 50,
        count: 0,
        bars: [],
        bridges: [],
        clusters: [],
        dots: [],
        status: "below_threshold",
      };
      if (url.includes("/api/polis/")) {
        return new Response(JSON.stringify(empty), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 200 });
    });
}

interface RenderOpts {
  county?: string | null;
  countyName?: string;
  stateCode?: string;
  userThemes?: Array<{ id: string; label: string }>;
}

function renderSection(opts: RenderOpts = {}) {
  return render(
    <LanguageProvider>
      <WorkspacePolisSection
        stateCode={opts.stateCode ?? "TX"}
        county={opts.county === undefined ? "Travis" : opts.county}
        countyName={opts.countyName ?? "Travis County"}
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

describe("WorkspacePolisSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the section wrapper when county + themes are present", () => {
    installPolisFetchStub();
    renderSection();
    expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
  });

  it("renders the 'You're not alone in {countyName}' heading", () => {
    installPolisFetchStub();
    renderSection({ countyName: "Travis County" });
    const heading = screen.getByTestId("workspace-polis-section-heading");
    expect(heading).toHaveTextContent(/Travis County/);
    expect(heading.textContent ?? "").toMatch(/you're not alone|not alone/i);
  });

  it("is collapsed by default — PolisOverlay is NOT in the DOM", () => {
    installPolisFetchStub();
    renderSection();
    // Section wrapper exists but the overlay's bars/bridges/compass don't.
    expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
    expect(screen.queryByTestId("polis-bars-section")).toBeNull();
    expect(screen.queryByTestId("polis-bridges-section")).toBeNull();
    expect(screen.queryByTestId("polis-compass-section")).toBeNull();
  });

  it("the toggle button has aria-expanded=false at rest", () => {
    installPolisFetchStub();
    renderSection();
    const toggle = screen.getByTestId("workspace-polis-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking the toggle expands the section and mounts PolisOverlay", async () => {
    installPolisFetchStub();
    renderSection();
    fireEvent.click(screen.getByTestId("workspace-polis-toggle"));
    // Aria reflects new state.
    expect(screen.getByTestId("workspace-polis-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // Overlay sections are now in the DOM.
    expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    expect(screen.getByTestId("polis-bridges-section")).toBeInTheDocument();
    expect(screen.getByTestId("polis-compass-section")).toBeInTheDocument();
  });

  it("clicking the toggle a second time collapses and unmounts PolisOverlay", () => {
    installPolisFetchStub();
    renderSection();
    const toggle = screen.getByTestId("workspace-polis-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("polis-bars-section")).toBeNull();
  });

  it("does NOT render anything when county is empty/null", () => {
    installPolisFetchStub();
    const { container } = renderSection({ county: "" });
    expect(container).toBeEmptyDOMElement();
  });

  it("does NOT render anything when county is null", () => {
    installPolisFetchStub();
    const { container } = renderSection({ county: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("does NOT render anything when userThemes is empty", () => {
    installPolisFetchStub();
    const { container } = renderSection({ userThemes: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("does NOT fire any /api/polis fetches while collapsed (opt-in)", async () => {
    const spy = installPolisFetchStub();
    renderSection();
    // Let any microtasks settle.
    await Promise.resolve();
    await Promise.resolve();
    const polisCalls = spy.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as URL).toString();
      return u.includes("/api/polis/");
    });
    expect(polisCalls).toHaveLength(0);
  });

  it("fires /api/polis fetches AFTER the user expands the section", async () => {
    const spy = installPolisFetchStub();
    renderSection();
    fireEvent.click(screen.getByTestId("workspace-polis-toggle"));
    // Allow effects to flush.
    await Promise.resolve();
    await Promise.resolve();
    const polisCalls = spy.mock.calls.filter((c) => {
      const u = typeof c[0] === "string" ? c[0] : (c[0] as URL).toString();
      return u.includes("/api/polis/");
    });
    expect(polisCalls.length).toBeGreaterThanOrEqual(3);
  });
});
