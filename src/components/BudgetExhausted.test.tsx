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
    // PR 7 — overlay refactor. Required so the overlay can be dismissed
    // independent of the budget state itself (workspace stays mounted
    // underneath; overlay is just a UI affordance).
    onDismiss: vi.fn(),
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
    // For the default community_budget variant, "limit" appears nowhere.
    // (Rate-limit variants do use "limit" in their reason line — see variant tests.)
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

/* ── PR 7 — modal overlay (portal + dismiss) ────────────────── */

describe("BudgetExhausted — modal overlay (PR 7)", () => {
  it("mounts the overlay inside document.body (React Portal — not the render container)", () => {
    const { container } = render(<BudgetExhausted {...defaultProps()} />);
    // The render container does NOT contain the overlay — it's portaled
    // to document.body so it can sit above the workspace layout without
    // z-index gymnastics.
    expect(
      container.querySelector('[data-testid="budget-exhausted-overlay"]'),
    ).toBeNull();
    // It IS in the document body.
    const inBody = document.body.querySelector(
      '[data-testid="budget-exhausted-overlay"]',
    );
    expect(inBody).not.toBeNull();
  });

  it("overlay dialog has role=dialog + aria-modal=true + accessible name", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const overlay = screen.getByTestId("budget-exhausted-overlay");
    expect(overlay.getAttribute("role")).toBe("dialog");
    expect(overlay.getAttribute("aria-modal")).toBe("true");
    // aria-labelledby points at the headline so screen readers announce
    // "Your ballot is saved" when the overlay opens.
    const labelledBy = overlay.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const headline = screen.getByTestId("budget-exhausted-headline");
    expect(headline.id).toBe(labelledBy);
  });

  it("renders a dismiss button (X) with aria-label and fires onDismiss when clicked", () => {
    const props = defaultProps();
    render(<BudgetExhausted {...props} />);
    const closeBtn = screen.getByTestId("budget-exhausted-dismiss");
    expect(closeBtn.getAttribute("aria-label")).toMatch(/dismiss|close/i);
    fireEvent.click(closeBtn);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop fires onDismiss", () => {
    const props = defaultProps();
    render(<BudgetExhausted {...props} />);
    const backdrop = screen.getByTestId("budget-exhausted-backdrop");
    fireEvent.click(backdrop);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clicking the dialog content does NOT fire onDismiss (only backdrop bubbles dismiss)", () => {
    const props = defaultProps();
    render(<BudgetExhausted {...props} />);
    const headline = screen.getByTestId("budget-exhausted-headline");
    fireEvent.click(headline);
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("pressing Escape on the document fires onDismiss", () => {
    const props = defaultProps();
    render(<BudgetExhausted {...props} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("removes the Escape listener on unmount (no leaks)", () => {
    const props = defaultProps();
    const { unmount } = render(<BudgetExhausted {...props} />);
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it("inner content (headline, links, BYOK, tip jar) remains intact within the overlay", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const overlay = screen.getByTestId("budget-exhausted-overlay");
    expect(
      within(overlay).getByTestId("budget-exhausted-headline"),
    ).toBeInTheDocument();
    expect(within(overlay).getByTestId("byok-input")).toBeInTheDocument();
    expect(within(overlay).getByTestId("tip-jar-link")).toBeInTheDocument();
    expect(within(overlay).getAllByTestId(/^chatbot-link-/).length).toBe(4);
  });

  it("moves focus to the dismiss button on mount (so aria-modal is honest)", () => {
    render(<BudgetExhausted {...defaultProps()} />);
    const dismiss = screen.getByTestId("budget-exhausted-dismiss");
    // The dismiss button should be the active element so screen readers
    // and keyboard users land inside the dialog when it opens.
    expect(document.activeElement).toBe(dismiss);
  });
});

/* ── Variant taxonomy ───────────────────────────────────────── */

describe("BudgetExhausted — variant: community_budget (default)", () => {
  it("shows Community budget resets copy with day count + timestamp", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="community_budget"
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/Community budget resets in/);
    expect(reset).toMatch(/day/i);
    expect(reset).toMatch(/UTC/i);
  });

  it("shows Resume button after reset passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="community_budget"
        resetAt={FUTURE_RESET}
      />,
    );
    expect(screen.getByTestId("resume-button")).toBeInTheDocument();
  });
});

describe("BudgetExhausted — variant: daily_limit", () => {
  it("shows 'Daily free-chat limit reached' with a reset timestamp", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="daily_limit"
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/Daily free-chat limit reached/i);
    expect(reset).toMatch(/resets/i);
    expect(reset).toMatch(/UTC/i);
  });

  it("shows Resume button after reset passes for daily_limit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="daily_limit"
        resetAt={FUTURE_RESET}
      />,
    );
    expect(screen.getByTestId("resume-button")).toBeInTheDocument();
  });

  it("does NOT show Resume before reset passes for daily_limit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="daily_limit"
        resetAt={FUTURE_RESET}
      />,
    );
    expect(screen.queryByTestId("resume-button")).toBeNull();
  });
});

describe("BudgetExhausted — variant: concurrent_limit", () => {
  it("shows 'Too many active sessions' reason copy", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="concurrent_limit"
        resetAt={FUTURE_RESET}
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/Too many active sessions/i);
    expect(reset).toMatch(/close other tabs/i);
  });

  it("does NOT show a timestamp for concurrent_limit", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="concurrent_limit"
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    // No UTC marker — not a time-based gate.
    expect(reset).not.toMatch(/UTC/i);
  });

  it("does NOT show the Resume button for concurrent_limit even after resetAt passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="concurrent_limit"
        resetAt={PAST_RESET}
      />,
    );
    expect(screen.queryByTestId("resume-button")).toBeNull();
  });
});

describe("BudgetExhausted — variant: session_limit", () => {
  it("shows 'message limit' reason copy", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="session_limit"
        resetAt={FUTURE_RESET}
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/message limit/i);
    expect(reset).toMatch(/continue on any chatbot/i);
  });

  it("does NOT show a timestamp for session_limit", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="session_limit"
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    // No UTC marker — not a time-based gate.
    expect(reset).not.toMatch(/UTC/i);
  });

  it("does NOT show the Resume button for session_limit even after resetAt passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="session_limit"
        resetAt={PAST_RESET}
      />,
    );
    expect(screen.queryByTestId("resume-button")).toBeNull();
  });
});

describe("BudgetExhausted — variant: service_unavailable", () => {
  it("shows 'temporarily unavailable' reason copy", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="service_unavailable"
        resetAt={FUTURE_RESET}
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/temporarily unavailable/i);
    expect(reset).toMatch(/try again/i);
  });

  it("does NOT show a timestamp for service_unavailable", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="service_unavailable"
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    // No UTC marker — a transient outage has no fixed reset to wait for.
    expect(reset).not.toMatch(/UTC/i);
  });

  it("does NOT show the Resume button for service_unavailable even after resetAt passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    render(
      <BudgetExhausted
        {...defaultProps()}
        variant="service_unavailable"
        resetAt={PAST_RESET}
      />,
    );
    expect(screen.queryByTestId("resume-button")).toBeNull();
  });
});

describe("BudgetExhausted — variant defaults to community_budget", () => {
  it("renders Community budget copy when no variant prop is passed", () => {
    render(
      <BudgetExhausted
        {...defaultProps()}
        resetAt="2030-06-01T00:00:00Z"
      />,
    );
    const reset = screen.getByTestId("budget-exhausted-reset").textContent ?? "";
    expect(reset).toMatch(/Community budget resets in/);
  });
});
