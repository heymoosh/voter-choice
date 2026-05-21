// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeRanker, reorderThemes } from "./ThemeRanker";
import { LanguageProvider } from "../lib/i18n";
import type { Theme } from "../lib/prompts/types";

/* ── Fixtures ────────────────────────────────────────────────── */

const oneTheme: Theme[] = [
  { name: "Healthcare costs", quotes: ["my mom's insulin keeps going up"] },
];

const twoThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ["my mom's insulin keeps going up"] },
  {
    name: "Housing affordability",
    quotes: ["rent went up 30% in two years"],
  },
];

const threeThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ["my mom's insulin keeps going up"] },
  {
    name: "Housing affordability",
    quotes: ["rent went up 30% in two years"],
  },
  { name: "Public safety", quotes: ["it's not safe to walk home at night"] },
];

const fiveThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ["insulin is too expensive"] },
  { name: "Housing affordability", quotes: ["rent is crushing me"] },
  { name: "Public safety", quotes: ["walk home at night"] },
  { name: "Climate", quotes: ["the fires near my house"] },
  { name: "Education funding", quotes: ["my kids' school is falling apart"] },
];

/* ── Helpers ─────────────────────────────────────────────────── */

interface RenderOptions {
  themes?: Theme[];
  onChange?: (next: Theme[]) => void;
  onLockIn?: () => void;
  onRewrite?: () => void;
  warning?: string;
  disableAutofocus?: boolean;
}

function renderRanker(opts: RenderOptions = {}) {
  const onChange = opts.onChange ?? vi.fn();
  const onLockIn = opts.onLockIn ?? vi.fn();
  const onRewrite = opts.onRewrite ?? vi.fn();
  const themes = opts.themes ?? threeThemes;
  const utils = render(
    <LanguageProvider>
      <ThemeRanker
        themes={themes}
        onChange={onChange}
        onLockIn={onLockIn}
        onRewrite={onRewrite}
        warning={opts.warning}
        disableAutofocus={opts.disableAutofocus ?? true}
      />
    </LanguageProvider>,
  );
  return { ...utils, onChange, onLockIn, onRewrite };
}

/* ── Tests ───────────────────────────────────────────────────── */

describe("ThemeRanker", () => {
  describe("rendering N theme cards (no padding)", () => {
    it.each([
      [1, oneTheme],
      [2, twoThemes],
      [5, fiveThemes],
    ])("renders exactly %i cards when given %i themes", (n, themes) => {
      renderRanker({ themes });
      const items = screen.getAllByTestId(/^theme-card-/);
      expect(items).toHaveLength(n);
    });

    it("renders zero cards when given an empty themes array", () => {
      renderRanker({ themes: [] });
      const items = screen.queryAllByTestId(/^theme-card-/);
      expect(items).toHaveLength(0);
    });

    it("renders 1-indexed rank badges that match position", () => {
      renderRanker({ themes: threeThemes });
      expect(screen.getByTestId("theme-rank-0")).toHaveTextContent("1");
      expect(screen.getByTestId("theme-rank-1")).toHaveTextContent("2");
      expect(screen.getByTestId("theme-rank-2")).toHaveTextContent("3");
    });
  });

  describe("verbatim quote rule (load-bearing per packet)", () => {
    it("renders the verbatim quote text without any transformation", () => {
      const originalMessage =
        "my mom's insulin keeps going up and copays are insane";
      const themes: Theme[] = [
        {
          name: "Healthcare costs",
          quotes: ["my mom's insulin keeps going up"],
        },
      ];
      const { container } = renderRanker({ themes });
      // Case-sensitive exact substring assertion.
      expect(container.textContent).toContain(
        "my mom's insulin keeps going up",
      );
      // And the rendered quote must be a substring of the original message.
      const quote = themes[0].quotes[0];
      expect(originalMessage).toContain(quote);
    });

    it("renders 2 quotes when a theme provides 2", () => {
      const themes: Theme[] = [
        {
          name: "Healthcare costs",
          quotes: ["insulin keeps going up", "copays are insane"],
        },
      ];
      const { container } = renderRanker({ themes });
      expect(container.textContent).toContain("insulin keeps going up");
      expect(container.textContent).toContain("copays are insane");
    });
  });

  describe("inline rename", () => {
    it("blur commits the new name via onChange", () => {
      const onChange = vi.fn();
      renderRanker({ themes: twoThemes, onChange });
      const input = screen.getByTestId("theme-name-input-0");
      fireEvent.change(input, { target: { value: "Insulin prices" } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].name).toBe("Insulin prices");
      expect(lastCall[0].quotes).toEqual(twoThemes[0].quotes);
      expect(lastCall[1].name).toBe(twoThemes[1].name);
    });

    it("Escape reverts and does not commit the typed text", () => {
      const onChange = vi.fn();
      renderRanker({ themes: twoThemes, onChange });
      const input = screen.getByTestId(
        "theme-name-input-0",
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "something else" } });
      fireEvent.keyDown(input, { key: "Escape" });
      // No commit with the typed text.
      const sawTypedText = onChange.mock.calls.some(
        (call) => call[0][0]?.name === "something else",
      );
      expect(sawTypedText).toBe(false);
      // Displayed value reverts to the original name.
      expect(input.value).toBe(twoThemes[0].name);
    });

    it("Enter commits the new name", () => {
      const onChange = vi.fn();
      renderRanker({ themes: twoThemes, onChange });
      const input = screen.getByTestId("theme-name-input-0");
      fireEvent.change(input, { target: { value: "Insulin prices" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall[0].name).toBe("Insulin prices");
    });
  });

  describe("remove", () => {
    it("removing the rank-2 theme resorts; rank badges read 1 and 2", () => {
      const onChange = vi.fn();
      renderRanker({ themes: threeThemes, onChange });
      fireEvent.click(screen.getByTestId("theme-remove-1"));
      expect(onChange).toHaveBeenCalledOnce();
      const next: Theme[] = onChange.mock.calls[0][0];
      expect(next).toHaveLength(2);
      expect(next[0]).toEqual(threeThemes[0]);
      expect(next[1]).toEqual(threeThemes[2]);
    });

    it("remove button has an accessible name including the theme name", () => {
      renderRanker({ themes: twoThemes });
      const removeBtn = screen.getByTestId("theme-remove-0");
      const ariaLabel = removeBtn.getAttribute("aria-label") ?? "";
      expect(ariaLabel).toMatch(/Healthcare costs/);
    });
  });

  describe("reorder helper (unit-tested directly because jsdom dnd-kit keyboard reorder is flaky)", () => {
    // The brief's test #6 (Space + ArrowDown + Space in dnd-kit) is unreliable
    // in jsdom — getBoundingClientRect returns zeros and the KeyboardSensor
    // does not activate cleanly. The existing ValuesTagSelector test file
    // (lines 241–253) documents the same fallback approach. We test the
    // pure reorder helper directly, and assert the drag handles exist with
    // the right accessible names below for the component-level surface.
    it("reorderThemes moves rank-1 to rank-2 correctly", () => {
      const next = reorderThemes(threeThemes, 0, 1);
      expect(next[0]).toEqual(threeThemes[1]);
      expect(next[1]).toEqual(threeThemes[0]);
      expect(next[2]).toEqual(threeThemes[2]);
    });

    it("reorderThemes is a no-op when from === to", () => {
      const next = reorderThemes(threeThemes, 1, 1);
      expect(next).toEqual(threeThemes);
    });

    it("reorderThemes moves last to first", () => {
      const next = reorderThemes(threeThemes, 2, 0);
      expect(next[0]).toEqual(threeThemes[2]);
      expect(next[1]).toEqual(threeThemes[0]);
      expect(next[2]).toEqual(threeThemes[1]);
    });

    it("drag handles are rendered for each theme with accessible names", () => {
      renderRanker({ themes: twoThemes });
      const handle0 = screen.getByTestId("theme-drag-handle-0");
      const handle1 = screen.getByTestId("theme-drag-handle-1");
      expect(handle0.getAttribute("aria-label")).toMatch(/Healthcare costs/);
      expect(handle1.getAttribute("aria-label")).toMatch(
        /Housing affordability/,
      );
    });
  });

  describe("lock-in button", () => {
    it("is disabled when themes is empty", () => {
      renderRanker({ themes: [] });
      const btn = screen.getByRole("button", { name: /lock/i });
      expect(btn).toBeDisabled();
    });

    it("is enabled when at least one theme exists", () => {
      renderRanker({ themes: oneTheme });
      const btn = screen.getByRole("button", { name: /lock/i });
      expect(btn).not.toBeDisabled();
    });

    it("fires onLockIn once when clicked with >=1 theme", () => {
      const onLockIn = vi.fn();
      renderRanker({ themes: oneTheme, onLockIn });
      const btn = screen.getByRole("button", { name: /lock/i });
      fireEvent.click(btn);
      expect(onLockIn).toHaveBeenCalledOnce();
    });
  });

  describe("rewrite button", () => {
    it("fires onRewrite when clicked", () => {
      const onRewrite = vi.fn();
      renderRanker({ themes: oneTheme, onRewrite });
      const btn = screen.getByTestId("theme-ranker-rewrite");
      fireEvent.click(btn);
      expect(onRewrite).toHaveBeenCalledOnce();
    });
  });

  describe("warning surface", () => {
    it("renders the warning text when provided", () => {
      renderRanker({
        themes: fiveThemes,
        warning: "AI returned 7 themes; showing top 5.",
      });
      expect(
        screen.getByText(/showing top 5/i),
      ).toBeInTheDocument();
    });

    it("does not render the warning region when no warning is provided", () => {
      renderRanker({ themes: oneTheme });
      expect(screen.queryByTestId("theme-ranker-warning")).not.toBeInTheDocument();
    });
  });
});
