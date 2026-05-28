// @vitest-environment jsdom
/**
 * WorkspacePolisSection — PR 10 (national-default).
 *
 * Collapsible workspace surface that hosts PolisOverlay. Closed by default
 * per the Phase 8 packet rule ("Polis is opt-in or post-decision: doesn't
 * compete with workspace focus"). Mounted in the WorkspaceRail.
 *
 * PR 10 changes:
 *  - Section heading is generic: "You're not alone" — no county scoping.
 *  - Section renders whenever user has themes (national data is always
 *    available). Previously gated on non-empty county.
 *  - Inside the expanded overlay, the scope toggle handles per-scope copy.
 *
 * Behavior contract:
 *  - Renders only when userThemes is non-empty.
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
import {
  POLIS_V1_VISIBLE,
  WorkspacePolisSection,
} from "./WorkspacePolisSection";

/* ── Fetch stub so PolisOverlay's internal fetches don't blow up ── */

function installPolisFetchStub() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const empty = {
        scope: "national",
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

// PR D Fix 3 — POLIS_V1_VISIBLE=false hides the entire workspace
// polis surface in v1 (the polis API returns below_threshold by design;
// the visible shell created noise). This describe block holds the
// future-enabled contract — it skips automatically while the flag is
// off, and re-activates as soon as the flag flips.
describe.skipIf(!POLIS_V1_VISIBLE)(
  "WorkspacePolisSection — PR 10 (national-default)",
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("renders the section wrapper when userThemes are present (county+countyName given)", () => {
      installPolisFetchStub();
      renderSection();
      expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
    });

    it("renders generic 'You're not alone' heading (no county scoping in the section header)", () => {
      installPolisFetchStub();
      renderSection({ countyName: "Travis County" });
      const heading = screen.getByTestId("workspace-polis-section-heading");
      expect(heading.textContent ?? "").toMatch(/you're not alone|not alone/i);
      // Generic — does NOT mention the county in the section header.
      expect(heading.textContent ?? "").not.toMatch(/Travis/);
    });

    it("is collapsed by default — PolisOverlay is NOT in the DOM", () => {
      installPolisFetchStub();
      renderSection();
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

    it("clicking the toggle expands the section and mounts PolisOverlay", () => {
      installPolisFetchStub();
      renderSection();
      fireEvent.click(screen.getByTestId("workspace-polis-toggle"));
      expect(screen.getByTestId("workspace-polis-toggle")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
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

    /* ── PR 10 — national-first: section renders even without a county ── */

    it("renders the section even when county is empty/null (national is always available)", () => {
      installPolisFetchStub();
      const { container } = renderSection({
        county: "",
        countyName: undefined,
      });
      // Section IS rendered — national reading needs no county.
      expect(container).not.toBeEmptyDOMElement();
      expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
    });

    it("renders the section when county is null (national is always available)", () => {
      installPolisFetchStub();
      const { container } = renderSection({
        county: null,
        countyName: undefined,
      });
      expect(container).not.toBeEmptyDOMElement();
      expect(screen.getByTestId("workspace-polis-section")).toBeInTheDocument();
    });

    it("does NOT render anything when userThemes is empty", () => {
      installPolisFetchStub();
      const { container } = renderSection({ userThemes: [] });
      expect(container).toBeEmptyDOMElement();
    });

    it("does NOT fire any /api/polis fetches while collapsed (opt-in)", async () => {
      const spy = installPolisFetchStub();
      renderSection();
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
      await Promise.resolve();
      await Promise.resolve();
      const polisCalls = spy.mock.calls.filter((c) => {
        const u = typeof c[0] === "string" ? c[0] : (c[0] as URL).toString();
        return u.includes("/api/polis/");
      });
      expect(polisCalls.length).toBeGreaterThanOrEqual(3);
    });

    it("expanding with no county still mounts the overlay in national-only mode", async () => {
      const spy = installPolisFetchStub();
      renderSection({ county: null, countyName: undefined });
      fireEvent.click(screen.getByTestId("workspace-polis-toggle"));
      expect(screen.getByTestId("polis-bars-section")).toBeInTheDocument();
      // No scope toggle (countyName missing).
      expect(screen.queryByTestId("polis-scope-toggle")).toBeNull();
      // Fetches all hit scope=national.
      await Promise.resolve();
      await Promise.resolve();
      const polisUrls = spy.mock.calls
        .map((c) =>
          typeof c[0] === "string" ? c[0] : (c[0] as URL).toString(),
        )
        .filter((u) => u.includes("/api/polis/"));
      expect(polisUrls.length).toBeGreaterThanOrEqual(3);
      expect(polisUrls.every((u) => u.includes("scope=national"))).toBe(true);
    });
  },
);
