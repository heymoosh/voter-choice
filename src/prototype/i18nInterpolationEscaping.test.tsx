// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { I18nProvider, useI18n, escapeHtml } from "./VoterChoiceApp";

/**
 * Card 36424855 — HandoffModal and RepCard render t()'s output via
 * dangerouslySetInnerHTML so translation strings can embed <b> formatting.
 * t() itself does NOT escape interpolated {vars} (most call sites render the
 * result as plain React text, which is already injection-safe — escaping
 * there would double-escape, e.g. "&" rendered literally as "&amp;"). The
 * two call sites that use dangerouslySetInnerHTML instead escape their own
 * vars with escapeHtml() before calling t() (see RepCard.tsx's
 * attendanceShowsUp line and HandoffModal.tsx's lede).
 */

describe("escapeHtml", () => {
  it("escapes the 4 HTML-significant characters", () => {
    expect(escapeHtml('<script>alert("x")</script> & more')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more",
    );
  });

  it("leaves plain numeric/text values unchanged", () => {
    expect(escapeHtml(42)).toBe("42");
    expect(escapeHtml("1,204 votes")).toBe("1,204 votes");
  });
});

function TInterpolationConsumer({
  path,
  vars,
}: {
  path: string;
  vars: Record<string, unknown>;
}) {
  const { t } = useI18n();
  return <div data-testid="out">{t(path, vars)}</div>;
}

describe("t() interpolation (plain-text call sites, no escaping)", () => {
  it("substitutes vars into the template untouched — React's text rendering is already injection-safe here", () => {
    render(
      <I18nProvider>
        <TInterpolationConsumer
          path="repCard.attendanceShowsUp"
          vars={{ pct: 3.1, of: "1,204 votes" }}
        />
      </I18nProvider>,
    );
    expect(screen.getByTestId("out").textContent).toBe(
      "Shows up — missed <b>3.1%</b> of 1,204 votes.",
    );
  });
});

/**
 * The dangerouslySetInnerHTML call sites (RepCard's attendance line,
 * HandoffModal's lede) escape each var with escapeHtml() before passing it
 * to t() — reproduce that exact composition here rather than rendering the
 * full components (which need substantial unrelated props/context).
 */
describe("escapeHtml(var) + t() composition (the actual dangerouslySetInnerHTML call-site pattern)", () => {
  function renderEscaped(path: string, vars: Record<string, unknown>) {
    const escapedVars = Object.fromEntries(
      Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)]),
    );
    render(
      <I18nProvider>
        <TInterpolationConsumer path={path} vars={escapedVars} />
      </I18nProvider>,
    );
    return screen.getByTestId("out").textContent as string;
  }

  it("renders benign values through unchanged", () => {
    const out = renderEscaped("repCard.attendanceShowsUp", {
      pct: 3.1,
      of: "1,204 votes",
    });
    expect(out).toBe("Shows up — missed <b>3.1%</b> of 1,204 votes.");
  });

  it("neutralizes an HTML-injection attempt in an interpolated var instead of passing it through raw", () => {
    const out = renderEscaped("repCard.attendanceShowsUp", {
      pct: "</b><img src=x onerror=alert(1)>",
      of: 10,
    });
    expect(out).not.toContain("<img src=x onerror=alert(1)>");
    expect(out).not.toContain("</b><img");
    expect(out).toContain("&lt;/b&gt;&lt;img");
  });

  it("neutralizes an injection attempt in the handoffModal.lede reviewed/total vars", () => {
    const out = renderEscaped("handoffModal.lede", {
      reviewed: '"><script>alert(1)</script>',
      total: 5,
    });
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});
