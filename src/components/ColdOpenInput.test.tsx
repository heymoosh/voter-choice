// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ColdOpenInput } from "./ColdOpenInput";
import { LanguageProvider } from "../lib/i18n";

/* ──────────────────────────────────────────────────────────────
 * ColdOpenInput tests
 *
 * Free-form textarea + Send for the Phase 2 cold open. Renders above the
 * legacy chip picker when PROMPT_FLEET_V2 is on and locale is `en`. The
 * "Show me an example" affordance fills the textarea with a localized
 * SAMPLE_LONGFORM string. The "Use a starter profile" chip is rendered
 * but is a no-op (the file-picker flow is deferred per packet).
 * ────────────────────────────────────────────────────────────── */

interface RenderOptions {
  initialDraft?: string;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function renderInput(opts: RenderOptions = {}) {
  const onSubmit = opts.onSubmit ?? vi.fn();
  const utils = render(
    <LanguageProvider>
      <ColdOpenInput
        initialDraft={opts.initialDraft}
        onSubmit={onSubmit}
        disabled={opts.disabled}
        loading={opts.loading}
      />
    </LanguageProvider>,
  );
  return { ...utils, onSubmit };
}

describe("ColdOpenInput", () => {
  describe("rendering", () => {
    it("renders the textarea with the accessible label", () => {
      renderInput();
      const textarea = screen.getByTestId("cold-open-textarea");
      expect(textarea).toBeInTheDocument();
      // Label is associated by htmlFor → id
      const label = screen.getByText("What's on your mind this election?");
      expect(label).toBeInTheDocument();
    });

    it("renders the Send button", () => {
      renderInput();
      expect(screen.getByTestId("cold-open-send")).toBeInTheDocument();
    });

    it("renders the 'Show me an example' affordance when textarea is empty", () => {
      renderInput();
      expect(screen.getByTestId("cold-open-show-example")).toBeInTheDocument();
    });

    it("renders the 'Use a starter profile' affordance when textarea is empty", () => {
      renderInput();
      expect(
        screen.getByTestId("cold-open-use-starter-profile"),
      ).toBeInTheDocument();
    });

    it("hides the 'Show me an example' affordance when textarea has content", () => {
      renderInput({ initialDraft: "I care about healthcare" });
      expect(
        screen.queryByTestId("cold-open-show-example"),
      ).not.toBeInTheDocument();
    });

    it("preloads the textarea from initialDraft", () => {
      renderInput({ initialDraft: "I care about healthcare" });
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("I care about healthcare");
    });
  });

  describe("submit behavior", () => {
    it("Send button is disabled when textarea is empty", () => {
      renderInput();
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(true);
    });

    it("Send button is disabled when textarea is whitespace-only", () => {
      renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "   \n  " } });
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(true);
    });

    it("Send button enables when textarea has non-whitespace content", () => {
      renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: "I care about healthcare" },
      });
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(false);
    });

    it("clicking Send calls onSubmit with the trimmed text", () => {
      const { onSubmit } = renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: "  I care about healthcare  " },
      });
      fireEvent.click(screen.getByTestId("cold-open-send"));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith("I care about healthcare");
    });

    it("Cmd+Enter submits", () => {
      const { onSubmit } = renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "hello world" } });
      fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
      expect(onSubmit).toHaveBeenCalledWith("hello world");
    });

    it("Ctrl+Enter submits", () => {
      const { onSubmit } = renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "hello world" } });
      fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });
      expect(onSubmit).toHaveBeenCalledWith("hello world");
    });

    it("plain Enter (no modifier) does NOT submit — for multiline composition", () => {
      const { onSubmit } = renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "hello world" } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("disabled / loading", () => {
    it("Send is disabled when disabled prop is true", () => {
      renderInput({ disabled: true });
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "hello" } });
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(true);
    });

    it("Send is disabled when loading prop is true", () => {
      renderInput({ loading: true });
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "hello" } });
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(true);
    });

    it("textarea is disabled when disabled prop is true", () => {
      renderInput({ disabled: true });
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });
  });

  describe("Show me an example", () => {
    it("clicking 'Show me an example' fills the textarea with sample text", () => {
      renderInput();
      fireEvent.click(screen.getByTestId("cold-open-show-example"));
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      // The sample text should be non-empty and mention insulin (per the
      // sample copy in translations).
      expect(textarea.value.length).toBeGreaterThan(20);
      expect(textarea.value.toLowerCase()).toContain("insulin");
    });

    it("after clicking 'Show me an example', Send becomes enabled", () => {
      renderInput();
      fireEvent.click(screen.getByTestId("cold-open-show-example"));
      const send = screen.getByTestId("cold-open-send") as HTMLButtonElement;
      expect(send.disabled).toBe(false);
    });
  });

  describe("Use a starter profile (deferred)", () => {
    it("clicking 'Use a starter profile' does not submit and does not fill the textarea", () => {
      const { onSubmit } = renderInput();
      fireEvent.click(screen.getByTestId("cold-open-use-starter-profile"));
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
