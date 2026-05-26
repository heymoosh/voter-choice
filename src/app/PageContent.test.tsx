// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, act, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PageContent } from "./PageContent";
import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";

interface RenderOptions {
  initialLang?: "es";
  /**
   * PR A2 fix — production-equivalent run-time flag. Defaults to `true` so
   * existing EN tests run against the new prototype landing. Flag-off tests
   * pass `false` explicitly to exercise the legacy chrome that the CI
   * "flag off — legacy specs" matrix depends on.
   */
  promptFleetV2Enabled?: boolean;
}

function renderWithProvider(options: RenderOptions = {}) {
  const { initialLang, promptFleetV2Enabled = true } = options;
  if (initialLang === "es") {
    localStorage.setItem("ballot-tool-lang", "es");
  } else {
    localStorage.removeItem("ballot-tool-lang");
  }
  return render(
    <ResearchModeProvider>
      <LanguageProvider>
        <PageContent promptFleetV2Enabled={promptFleetV2Enabled} />
      </LanguageProvider>
    </ResearchModeProvider>,
  );
}

describe("PageContent — English landing (prototype-spec, flag-on)", () => {
  beforeEach(() => localStorage.clear());

  it("renders the prototype hero headline with an italic 'record' em", () => {
    renderWithProvider();
    const h1 = screen.getByRole("heading", { level: 1 });
    // Verbatim copy from prototype-views.jsx LandingView.
    expect(h1).toHaveTextContent("Hold Congress to its record.");
    const em = h1.querySelector("em");
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe("record.");
  });

  it("renders the eyebrow with the November 3 + 250th-election text", () => {
    renderWithProvider();
    // Star is rendered as a separate span; assert by partial match on the
    // surrounding parent text.
    expect(
      screen.getByText(/November 3, 2026 · America's 250th election/i),
    ).toBeInTheDocument();
  });

  it("renders the two-row stat-stack with both prototype statistics", () => {
    renderWithProvider();
    // Row 1 — fundraising time.
    expect(screen.getByText(/hrs \/ day/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Source · Issue One, 2024 · CBS 60 Minutes/i),
    ).toBeInTheDocument();
    // Row 2 — incumbent-win rate.
    expect(
      screen.getByText(
        /of House incumbents who ran for re-election in 2024 won/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Source · OpenSecrets · FEC filings/i),
    ).toBeInTheDocument();
  });

  it("renders the single-row hp-foot with the prototype copy", () => {
    renderWithProvider();
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("Voter Choice");
    expect(footer).toHaveTextContent("Ballot data");
    expect(footer).toHaveTextContent("Methodology");
    expect(footer).toHaveTextContent("Privacy");
    expect(footer).toHaveTextContent("Support");
    // PR A2 also normalizes the legal entity to "Gray Bird LLC".
    expect(footer).toHaveTextContent(/© 2026 · Gray Bird LLC/i);
  });

  it("removes the legacy bloat sections from the EN landing", () => {
    renderWithProvider();
    // "Pick up where you left off" / returning-voter upload block.
    expect(
      screen.queryByText(/Pick up where you left off/i),
    ).not.toBeInTheDocument();
    // "Why we built this" / mission statement block.
    expect(screen.queryByText(/Why we built this/i)).not.toBeInTheDocument();
    // "How it works" 01/02/03 step blocks — assert via the legacy section's
    // unique subtext + step1 title, since "How it works" itself is still in
    // the prototype AppNav as a placeholder anchor link.
    expect(
      screen.queryByText(/Three steps\. A few minutes\. No account\./),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Enter your address/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/See what they actually did/),
    ).not.toBeInTheDocument();
    // Green CTA banner copy.
    expect(
      screen.queryByText(/Vote for a Congress that earns it/i),
    ).not.toBeInTheDocument();
    // Three resource cards — assert by their CTAs / headlines.
    expect(screen.queryByText(/Where to vote/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Key dates/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/What to bring/i)).not.toBeInTheDocument();
  });

  it("renders the prototype AppNav with center anchor links and the brand mark", () => {
    renderWithProvider();
    const banner = screen.getByRole("banner");
    // V mark + Voter Choice wordmark.
    expect(within(banner).getByText("V")).toBeInTheDocument();
    expect(within(banner).getByText("Voter Choice")).toBeInTheDocument();
    // Center nav anchors — verbatim text from prototype-components.jsx AppNav.
    expect(within(banner).getByText("How it works")).toBeInTheDocument();
    expect(within(banner).getByText("The record")).toBeInTheDocument();
    expect(within(banner).getByText("About")).toBeInTheDocument();
  });
});

describe("PageContent — Spanish mode (legacy landing unchanged)", () => {
  beforeEach(() => localStorage.clear());

  it("renders Spanish hero title", async () => {
    renderWithProvider({ initialLang: "es" });
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tu Boleta",
    );
  });

  it("renders Spanish trust signals", async () => {
    renderWithProvider({ initialLang: "es" });
    await act(async () => {});
    expect(screen.getByText("Sin datos almacenados.")).toBeInTheDocument();
    expect(screen.getByText("Sin cuentas.")).toBeInTheDocument();
    expect(screen.getByText("100% privado.")).toBeInTheDocument();
  });

  it("renders Spanish footer with legal links", async () => {
    renderWithProvider({ initialLang: "es" });
    await act(async () => {});
    expect(
      screen.getByRole("link", { name: "Política de Privacidad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Términos de Uso" }),
    ).toBeInTheDocument();
  });

  it("renders How it Works in Spanish", async () => {
    renderWithProvider({ initialLang: "es" });
    await act(async () => {});
    expect(screen.getByText("Cómo Funciona")).toBeInTheDocument();
    expect(screen.getByText("Localiza tu Distrito")).toBeInTheDocument();
  });
});

/* ── PR A2 fix: flag-gating the EN landing ──────────────────────────
   The CI "flag off — legacy specs" job runs `npm run e2e` WITHOUT
   PROMPT_FLEET_V2 set. Production Vercel env has the flag on, so the
   prototype landing IS the user-visible surface. But the legacy
   specs assume the legacy chrome (returning-voter upload, 3-col footer
   with Privacy + Terms, How-it-works 01/02/03, mission statement, etc.)
   is reachable on EN. Restore it under the flag-off branch.

   The Spanish-mode block above already exercises the legacy landing via
   the locale switch (the legacy translations carry both EN and ES copy).
   These tests cover the parallel flag-off EN path so we don't regress
   the legacy CI matrix while production stays on the new landing. */
describe("PageContent — English landing (flag-off, legacy preserved)", () => {
  beforeEach(() => localStorage.clear());

  it("renders the legacy hero copy when promptFleetV2Enabled is false", () => {
    renderWithProvider({ promptFleetV2Enabled: false });
    // Legacy EN heroHeadline from translations.ts.
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Elect a Congress that does its job.");
    // The new prototype headline must NOT be present on the flag-off path.
    expect(h1).not.toHaveTextContent("Hold Congress to its record.");
  });

  it("renders the 'returning voter' upload block when flag-off", () => {
    renderWithProvider({ promptFleetV2Enabled: false });
    // "Pick up where you left off" is the legacy returning-voter section
    // headline. The prototype landing drops this section entirely.
    expect(screen.getByText(/Pick up where you left off/i)).toBeInTheDocument();
  });

  it("renders the legacy 3-col footer with Privacy + Terms links when flag-off", () => {
    renderWithProvider({ promptFleetV2Enabled: false });
    const footer = screen.getByRole("contentinfo");
    // The legacy footer carries both Privacy and Terms (the new prototype
    // hp-foot has Privacy only). The CI "footer contains privacy and terms
    // links" e2e spec asserts both — flag-off must satisfy that contract.
    expect(
      within(footer).getByRole("link", { name: /Privacy/i }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole("link", { name: /Terms/i }),
    ).toBeInTheDocument();
  });

  it("renders the legacy 'How it works' 01/02/03 step labels when flag-off", () => {
    renderWithProvider({ promptFleetV2Enabled: false });
    // Step numerals from the legacy "How it Works" section. The new
    // prototype landing drops this entire block.
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("does NOT render the new prototype eyebrow or stat-stack when flag-off", () => {
    renderWithProvider({ promptFleetV2Enabled: false });
    // New prototype eyebrow + stats are absent on the flag-off path.
    expect(
      screen.queryByText(/America's 250th election/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Source · OpenSecrets · FEC filings/i),
    ).not.toBeInTheDocument();
  });
});
