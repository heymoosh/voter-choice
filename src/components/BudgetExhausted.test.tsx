// @vitest-environment jsdom
/**
 * BudgetExhausted — continuity screen (Phase 9).
 *
 * Tests assert:
 *   - Headline is CONTINUITY, never apology ("Your ballot is saved…").
 *   - Reset time renders with an absolute timestamp.
 *   - Exactly four chatbot links, in strict alphabetical order
 *     (Claude, ChatGPT, Gemini, Grok). Order is load-bearing per packet.
 *   - Handoff prompt textarea is readonly + pre-populated; copy button
 *     hits the clipboard.
 *   - BYOK affordance: explicit privacy copy + save & remove handlers.
 *   - Tip jar line is present with "not required" literal.
 *   - Resume button appears only when current time has passed `resetAt`.
 *
 * See `.ai/work-packets/redesign-phase-9-out-of-budget-handoff.md`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { BudgetExhausted } from "./BudgetExhausted";

const FUTURE_RESET = "2030-06-01T00:00:00Z";
const PAST_RESET = "2020-01-01T00:00:00Z";
const FIXTURE_HANDOFF = `CONTEXT: Austin, TX, 2026 general
DATE: 2026-11-03
PRIORITIES (ranked):
  1. Healthcare costs
  2. Housing affordability
DECIDED:
  · US Senate → Carol Cain — "labor record"
REMAINING:
  · Governor
Continue from where I left off.`;

function defaultProps() {
  return {
    resetAt: FUTURE_RESET,
    handoffPromptText: FIXTURE_HANDOFF,
    onByokContinue: vi.fn(),
    onByokRemove: vi.fn(),
    storedByokKey: null as string | null,
    onResume: vi.fn(),
  };
}

beforeEach(() => {
  // Stub clipboard so copy assertions can spy on it.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
});

/* ── Headline / framing ─────────────────────────────────────── */

describe("BudgetExhausted — headline + framing", () => {
  it("renders the continuity headline", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const headline = screen.getByTestId("budget-exhausted-headline");
    expect(headline.textContent ?? "").toMatch(
      /Your ballot is saved\. Keep going on any chatbot/,
    );
  });

  it("does NOT show apology framing", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    expect(screen.queryByText(/sorry/i)).toBeNull();
    // "limit" appears NOWHERE in the budget-exhausted copy.
    expect(screen.queryByText(/limit/i)).toBeNull();
  });

  it("wraps content in a screen container with a stable data-testid", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    expect(screen.getByTestId("budget-exhausted-screen")).toBeInTheDocument();
  });
});

/* ── Reset time ─────────────────────────────────────────────── */

describe("BudgetExhausted — reset time", () => {
  it("surfaces the reset time with an absolute UTC timestamp", () => {
    render(
      <BudgetExhausted {...defaultProps()} resetAt="2026-06-01T00:00:00Z" />,
    );
    const text = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    // Expect both an absolute date ("June 1") and the UTC marker.
    expect(text).toMatch(/June 1/);
    expect(text).toMatch(/UTC/i);
  });
});

/* ── Four chatbot links, alphabetical ───────────────────────── */

describe("BudgetExhausted — chatbot links", () => {
  it("renders exactly four chatbot links in strict alphabetical order", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const links = screen
      .getAllByTestId(/^chatbot-link-/)
      .map((el) => el.getAttribute("data-testid"));
    expect(links).toEqual([
      "chatbot-link-claude",
      "chatbot-link-chatgpt",
      "chatbot-link-gemini",
      "chatbot-link-grok",
    ]);
  });

  it("each chatbot link opens in a new tab with the correct destination", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const expectations: Array<[string, string]> = [
      ["chatbot-link-claude", "https://claude.ai"],
      ["chatbot-link-chatgpt", "https://chatgpt.com"],
      ["chatbot-link-gemini", "https://gemini.google.com"],
      ["chatbot-link-grok", "https://x.com/grok"],
    ];
    for (const [tid, expectedHref] of expectations) {
      const link = screen.getByTestId(tid);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("href")).toBe(expectedHref);
    }
  });
});

/* ── Handoff prompt textarea + copy ─────────────────────────── */

describe("BudgetExhausted — handoff prompt block", () => {
  it("renders the handoff prompt in a readonly textarea pre-filled with the text", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const ta = screen.getByTestId(
      "handoff-prompt-textarea",
    ) as HTMLTextAreaElement;
    expect(ta.readOnly).toBe(true);
    expect(ta.value).toBe(FIXTURE_HANDOFF);
  });

  it("copy button calls navigator.clipboard.writeText with the handoff text", async () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const btn = screen.getByTestId("handoff-prompt-copy");
    fireEvent.click(btn);
    // Wait a tick for the promise to flush.
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FIXTURE_HANDOFF);
  });
});

/* ── BYOK affordance ────────────────────────────────────────── */

describe("BudgetExhausted — BYOK affordance", () => {
  it("renders the BYOK input + privacy copy", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    expect(screen.getByTestId("byok-input")).toBeInTheDocument();
    const privacy = screen.getByTestId("byok-privacy-copy").textContent ?? "";
    expect(privacy).toMatch(/key stays in your browser/i);
    expect(privacy).toMatch(/never sent/i);
  });

  it("Save & continue button fires onByokContinue with the entered key", () => {
    const props = defaultProps();
    render(<BudgetExhausted {...props} />);
    const input = screen.getByTestId("byok-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-ant-new-key" } });
    fireEvent.click(screen.getByTestId("byok-save"));
    expect(props.onByokContinue).toHaveBeenCalledWith("sk-ant-new-key");
  });

  it("when a key is stored, shows Remove button and fires onByokRemove on click", () => {
    const props = defaultProps();
    props.storedByokKey = "sk-ant-stored-12345678";
    render(<BudgetExhausted {...props} />);
    const removeBtn = screen.getByTestId("byok-remove");
    fireEvent.click(removeBtn);
    expect(props.onByokRemove).toHaveBeenCalled();
  });

  it("hides Remove button when no key is stored", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    expect(screen.queryByTestId("byok-remove")).toBeNull();
  });
});

/* ── Tip jar ────────────────────────────────────────────────── */

describe("BudgetExhausted — tip jar", () => {
  it("renders a tip jar link with 'not required' text", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const tip = screen.getByTestId("tip-jar-link");
    expect(tip).toBeInTheDocument();
    // The literal "not required" text is required by the packet.
    expect(screen.getByText(/not required/i)).toBeInTheDocument();
  });
});

/* ── Resume button ──────────────────────────────────────────── */

describe("BudgetExhausted — resume button", () => {
  it("does NOT render Resume when current time is before resetAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T00:00:00Z"));
    render(<BudgetExhausted {...defaultProps()} />);
    expect(screen.queryByTestId("resume-button")).toBeNull();
  });

  it("renders Resume when current time has passed resetAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    const props = defaultProps();
    render(<BudgetExhausted {...props} resetAt={FUTURE_RESET} />);
    const btn = screen.getByTestId("resume-button");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(props.onResume).toHaveBeenCalled();
  });

  it("renders Resume when resetAt is in the past at mount", () => {
    render(<BudgetExhausted {...defaultProps()} resetAt={PAST_RESET} />);
    expect(screen.getByTestId("resume-button")).toBeInTheDocument();
  });
});

/* ── Smoke — entire screen renders without throwing ─────────── */

describe("BudgetExhausted — overall smoke", () => {
  it("renders all the major sections", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const screenEl = screen.getByTestId("budget-exhausted-screen");
    expect(
      within(screenEl).getByTestId("budget-exhausted-headline"),
    ).toBeInTheDocument();
    expect(
      within(screenEl).getByTestId("budget-exhausted-reset"),
    ).toBeInTheDocument();
    expect(
      within(screenEl).getByTestId("handoff-prompt-textarea"),
    ).toBeInTheDocument();
    expect(within(screenEl).getAllByTestId(/^chatbot-link-/).length).toBe(4);
    expect(within(screenEl).getByTestId("byok-input")).toBeInTheDocument();
    expect(within(screenEl).getByTestId("tip-jar-link")).toBeInTheDocument();
  });
});
