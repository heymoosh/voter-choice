// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyCallout } from "./PrivacyCallout";
import { LanguageProvider } from "../lib/i18n";

/* ── Helper ──────────────────────────────────────────────────── */

function renderCallout(variant?: "inline" | "compact") {
  return render(
    <LanguageProvider>
      <PrivacyCallout variant={variant} />
    </LanguageProvider>,
  );
}

/* ── Tests ───────────────────────────────────────────────────── */

describe("PrivacyCallout — inline variant (default)", () => {
  it("renders all three paragraphs", () => {
    renderCallout("inline");
    expect(screen.getByTestId("privacy-callout-p1")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-callout-p2")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-callout-p3")).toBeInTheDocument();
  });

  it("contains the no-accounts copy in P1", () => {
    renderCallout("inline");
    expect(screen.getByTestId("privacy-callout-p1")).toHaveTextContent(
      "No accounts",
    );
  });

  it("contains the subpoena line in P3", () => {
    renderCallout("inline");
    expect(screen.getByTestId("privacy-callout-p3")).toHaveTextContent(
      "subpoena",
    );
  });

  it("subpoena paragraph is distinguishable — has a role=note and strong tag", () => {
    renderCallout("inline");
    const p3 = screen.getByTestId("privacy-callout-p3");
    // role=note makes it distinct for screen readers
    expect(p3).toHaveAttribute("role", "note");
    // strong element inside for visual + semantic emphasis
    const strong = p3.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toContain("subpoena");
  });

  it("subpoena paragraph has aria-label describing the guarantee", () => {
    renderCallout("inline");
    const p3 = screen.getByTestId("privacy-callout-p3");
    expect(p3).toHaveAttribute("aria-label");
    const label = p3.getAttribute("aria-label") ?? "";
    expect(label.toLowerCase()).toContain("subpoena");
  });

  it("renders default (inline) when no variant prop", () => {
    renderCallout();
    expect(screen.getByTestId("privacy-callout-p1")).toBeInTheDocument();
  });
});

describe("PrivacyCallout — compact variant", () => {
  it("renders the headline in collapsed state", () => {
    renderCallout("compact");
    expect(
      screen.getByTestId("privacy-callout-compact-headline"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("privacy-callout-compact-headline"),
    ).toHaveTextContent("anonymous counts");
  });

  it("does NOT render full paragraphs when collapsed", () => {
    renderCallout("compact");
    expect(
      screen.queryByTestId("privacy-callout-expanded"),
    ).not.toBeInTheDocument();
  });

  it("expand toggle is present and labeled Read more", () => {
    renderCallout("compact");
    const toggle = screen.getByTestId("privacy-callout-expand-toggle");
    expect(toggle).toHaveTextContent("Read more");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking expand reveals all three paragraphs", () => {
    renderCallout("compact");
    const toggle = screen.getByTestId("privacy-callout-expand-toggle");
    fireEvent.click(toggle);
    expect(screen.getByTestId("privacy-callout-expanded")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-callout-p3")).toBeInTheDocument();
  });

  it("clicking collapse hides the expanded content", () => {
    renderCallout("compact");
    const toggle = screen.getByTestId("privacy-callout-expand-toggle");
    fireEvent.click(toggle); // expand
    expect(toggle).toHaveTextContent("Show less");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle); // collapse
    expect(
      screen.queryByTestId("privacy-callout-expanded"),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("expanded subpoena paragraph has role=note for screen readers", () => {
    renderCallout("compact");
    fireEvent.click(screen.getByTestId("privacy-callout-expand-toggle"));
    const p3 = screen.getByTestId("privacy-callout-p3");
    expect(p3).toHaveAttribute("role", "note");
  });
});

describe("PrivacyCallout — accessibility", () => {
  it("component has aria-label 'Privacy promise'", () => {
    const { container } = renderCallout("inline");
    const aside = container.querySelector("aside");
    expect(aside).toHaveAttribute("aria-label", "Privacy promise");
  });

  it("lock icon is aria-hidden", () => {
    const { container } = renderCallout("inline");
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
