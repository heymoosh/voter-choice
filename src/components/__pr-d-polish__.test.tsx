// @vitest-environment jsdom
/**
 * PR D — Comprehensive audit polish pass (P2/P3).
 *
 * Mirrors PR B/C polish-test file pattern at __pr-b-polish__.test.tsx /
 * __pr-c-polish__.test.tsx. These are the polish fixes that came out of the
 * post-PR-#57 comprehensive audit — every one is a single-screen behavior
 * contract, no extraction-pipeline / chat-content / workspace-filter logic
 * is touched.
 *
 * Fixes covered:
 *   Fix 1 — Mobile horizontal scroll on landing (375px viewport)
 *     • The grid items inside the EnglishShell hero section default to
 *       `min-width: auto = min-content`, but the H1's max-content (≈563px)
 *       and the inline-flex eyebrow forced the auto column to ≈481px on a
 *       360–375px viewport, creating horizontal scroll. Apply `min-w-0`
 *       on each grid child so the column collapses to viewport.
 *   Fix 2 — WorkspaceRail long-label truncation
 *     • Long Texas / Florida labels ("Comptroller of Public Accounts",
 *       "Commissioner of the General Land Office") truncate with `truncate`.
 *       Swap to `whitespace-normal break-words` so multi-line wraps are
 *       legible — vertical density still feels right (icons stay aligned
 *       via items-center on the grid parent).
 *   Fix 3 — Polis widget shell hide
 *     • /api/polis/* always returns below_threshold in v1 by design. The
 *       collapsed shell creates noise. WorkspacePolisSection becomes
 *       feature-flagged with POLIS_V1_VISIBLE=false: it returns null in
 *       v1 instead of rendering the shell. The flag makes intent honest
 *       ("we'll bring this back when the data lands"). PolisOverlay can
 *       still be mounted directly (e.g. for unit tests), so the
 *       inner-component behavior is untouched.
 *   Fix 4 — /api/extract-ballot _meta leak
 *     • Strip cost_usd and detector_score from the client-shipped _meta.
 *       Keep extraction_path, pages, latency_ms, cache_hit. Internal
 *       storage (cache write) keeps the full ExtractMeta so detector_score
 *       remains available for future debugging.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

import { WorkspaceRail, type WorkspaceRailProps } from "./WorkspaceRail";
import {
  WorkspacePolisSection,
  type WorkspacePolisSectionProps,
} from "./WorkspacePolisSection";
import { PageContent } from "../app/PageContent";
import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";
import type { Race } from "../lib/raceDeriver";
import type { Theme } from "../lib/prompts/types";
import {
  toPublicExtractMeta,
  type ExtractMeta,
} from "../lib/server/extract-types";

/* ── Shared fixtures ───────────────────────────────────────────── */

const railRaces: Race[] = [
  {
    id: "tx-comptroller",
    section: "State",
    label: "Comptroller of Public Accounts",
    decided: false,
  },
  {
    id: "tx-land-commissioner",
    section: "State",
    label: "Commissioner of the General Land Office",
    decided: false,
  },
];

const railThemes: Theme[] = [{ name: "Healthcare", quotes: ['"insulin"'] }];

function renderRail(overrides: Partial<WorkspaceRailProps> = {}) {
  const props: WorkspaceRailProps = {
    decidedCount: 0,
    totalRaces: railRaces.length,
    themes: railThemes,
    races: railRaces,
    activeRaceId: null,
    onSelectRace: vi.fn(),
    onEditThemes: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
  return render(
    <LanguageProvider>
      <WorkspaceRail {...props} />
    </LanguageProvider>,
  );
}

/* ── Fix 1 — Mobile horizontal scroll on landing ────────────────── */

describe("PR D / Fix 1 — landing EnglishShell hero grid is mobile-safe", () => {
  beforeEach(() => localStorage.clear());

  function renderLanding() {
    return render(
      <ResearchModeProvider>
        <LanguageProvider>
          <PageContent promptFleetV2Enabled={true} />
        </LanguageProvider>
      </ResearchModeProvider>,
    );
  }

  it("hero section's direct grid children carry min-w-0 so they collapse to viewport on mobile", () => {
    const { container } = renderLanding();
    const section = container.querySelector(
      'section[aria-labelledby="hero-heading"]',
    );
    expect(section).not.toBeNull();
    const children = Array.from(section!.children) as HTMLElement[];
    // Both columns (left content wrapper + right stat-stack aside) must
    // declare `min-w-0` so the grid track collapses below the H1's
    // max-content width at 375px. Without this Tailwind class the grid
    // default `min-width: auto = min-content` of an item that contains
    // a 44px serif H1 wins, and we see ≈140px of horizontal scroll.
    expect(children.length).toBeGreaterThanOrEqual(2);
    children.forEach((child) => {
      expect(child.className).toMatch(/\bmin-w-0\b/);
    });
  });
});

/* ── Fix 2 — Long-label truncation in the rail ───────────────────── */

describe("PR D / Fix 2 — WorkspaceRail long labels wrap instead of truncating", () => {
  it("each race label span is whitespace-normal + break-words (not truncate)", () => {
    renderRail();
    for (const race of railRaces) {
      const button = screen.getByTestId(`workspace-rail-race-${race.id}`);
      // The label span is the second child of the grid button (after the
      // aria-hidden indicator dot). It's the element carrying the race
      // label text.
      const labelSpan = Array.from(button.querySelectorAll("span")).find(
        (s) => (s.textContent ?? "") === race.label,
      );
      expect(labelSpan).toBeDefined();
      expect(labelSpan!.className).not.toMatch(/\btruncate\b/);
      expect(labelSpan!.className).toMatch(/\bwhitespace-normal\b/);
      expect(labelSpan!.className).toMatch(/\bbreak-words\b/);
    }
  });

  it("the grid parent stays items-center so the indicator dot stays aligned with wrapped multi-line labels", () => {
    renderRail();
    const button = screen.getByTestId(`workspace-rail-race-tx-comptroller`);
    // The button is the grid; check that items-center remains on the
    // grid container so wrapped labels keep the dot vertically aligned.
    expect(button.className).toMatch(/\bitems-center\b/);
  });
});

/* ── Fix 3 — Polis widget shell hide ─────────────────────────────── */

describe("PR D / Fix 3 — WorkspacePolisSection hides the v1 placeholder shell", () => {
  // Stub fetch so even if the section *did* mount, the polis API calls
  // wouldn't escape the test runner.
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          scope: "national",
          threshold: 50,
          count: 0,
          status: "below_threshold",
          bars: [],
          bridges: [],
          clusters: [],
          dots: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderSection(overrides: Partial<WorkspacePolisSectionProps> = {}) {
    const props: WorkspacePolisSectionProps = {
      stateCode: "TX",
      county: "Travis",
      countyName: "Travis County",
      userThemes: [{ id: "healthcare", label: "Healthcare access" }],
      ...overrides,
    };
    return render(
      <LanguageProvider>
        <WorkspacePolisSection {...props} />
      </LanguageProvider>,
    );
  }

  it("renders nothing in v1 (the polis API always returns below_threshold; the empty shell creates noise)", () => {
    const { container } = renderSection();
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("workspace-polis-section")).toBeNull();
    expect(screen.queryByTestId("workspace-polis-toggle")).toBeNull();
  });

  it("WorkspaceRail does not render the polis section either (downstream of the gate)", () => {
    renderRail({
      stateCode: "NJ",
      county: "camden",
      countyName: "Camden County",
    });
    expect(screen.queryByTestId("workspace-polis-section")).toBeNull();
  });
});

/* ── Fix 4 — /api/extract-ballot _meta leak ──────────────────────── */

describe("PR D / Fix 4 — extract-ballot client meta strips telemetry-only fields", () => {
  it("toPublicExtractMeta drops cost_usd and detector_score (server-only fields)", () => {
    const full: ExtractMeta = {
      extraction_path: "vision",
      pages: 14,
      latency_ms: 8421,
      cost_usd: 0.123456,
      detector_score: {
        dictionary_ratio: 0.7321,
        ballot_vocab_hits: 12,
        proper_noun_count: 18,
        decision_reason: "high dictionary ratio + ballot vocab hits",
      },
      cache_hit: false,
    };
    const pub = toPublicExtractMeta(full);
    // Telemetry-only — these must NOT ship to the client.
    expect(pub).not.toHaveProperty("cost_usd");
    expect(pub).not.toHaveProperty("detector_score");
  });

  it("toPublicExtractMeta keeps extraction_path, pages, latency_ms, cache_hit", () => {
    const full: ExtractMeta = {
      extraction_path: "cached",
      pages: 14,
      latency_ms: 122,
      cost_usd: 0.123456,
      detector_score: {
        dictionary_ratio: 0.73,
        ballot_vocab_hits: 12,
        proper_noun_count: 18,
        decision_reason: "high dictionary ratio + ballot vocab hits",
      },
      cache_hit: true,
    };
    const pub = toPublicExtractMeta(full);
    expect(pub.extraction_path).toBe("cached");
    expect(pub.pages).toBe(14);
    expect(pub.latency_ms).toBe(122);
    expect(pub.cache_hit).toBe(true);
  });

  it("toPublicExtractMeta omits cache_hit cleanly when the source meta omits it (fresh extraction path)", () => {
    const full: ExtractMeta = {
      extraction_path: "pdfjs",
      pages: 2,
      latency_ms: 4200,
      cost_usd: 0.000952,
      detector_score: {
        dictionary_ratio: 0.81,
        ballot_vocab_hits: 9,
        proper_noun_count: 7,
        decision_reason: "pdfjs",
      },
    };
    const pub = toPublicExtractMeta(full);
    expect(pub).not.toHaveProperty("cache_hit");
    expect(pub).not.toHaveProperty("cost_usd");
    expect(pub).not.toHaveProperty("detector_score");
    expect(pub.extraction_path).toBe("pdfjs");
  });
});
