// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { ColdOpenInput } from "./ColdOpenInput";
import type { Theme } from "../lib/prompts/types";
import { LanguageProvider } from "../lib/i18n";

/* ──────────────────────────────────────────────────────────────
 * ColdOpenInput tests
 *
 * Free-form textarea + Send for the Phase 2 cold open. Renders above the
 * legacy chip picker when PROMPT_FLEET_V2 is on and locale is `en`. The
 * "Show me an example" affordance fills the textarea with a localized
 * SAMPLE_LONGFORM string. The "Use a starter profile" chip opens a file
 * picker, reads a saved `.txt` voter profile, parses its `## Priorities`
 * block, and emits a `Theme[]` to the parent so the parent can advance
 * the cold-open phase machine directly to the themes-confirm step
 * (skipping Haiku extraction).
 * ────────────────────────────────────────────────────────────── */

interface RenderOptions {
  initialDraft?: string;
  onSubmit?: (text: string) => void;
  onStarterProfileLoaded?: (themes: Theme[], originalText: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function renderInput(opts: RenderOptions = {}) {
  const onSubmit = opts.onSubmit ?? vi.fn();
  const onStarterProfileLoaded = opts.onStarterProfileLoaded ?? vi.fn();
  const utils = render(
    <LanguageProvider>
      <ColdOpenInput
        initialDraft={opts.initialDraft}
        onSubmit={onSubmit}
        onStarterProfileLoaded={onStarterProfileLoaded}
        disabled={opts.disabled}
        loading={opts.loading}
      />
    </LanguageProvider>,
  );
  return { ...utils, onSubmit, onStarterProfileLoaded };
}

/** Build a profile text exactly like BallotToolClient.handleSaveProfile does. */
function buildProfile(themeNames: string[]): string {
  const themesBlock = themeNames
    .map((name, i) => `${i + 1}. ${name}`)
    .join("\n");
  return [
    "# Voter Choice — saved profile",
    "",
    "## Priorities",
    themesBlock,
    "",
    "## Decisions",
    "(no decisions yet)",
    "",
  ].join("\n");
}

/**
 * Dispatch a change event on the hidden file input with a real `File`.
 * `fireEvent.change` is sync, but the component's onChange uses FileReader,
 * which resolves on a microtask in jsdom — wrap in `act` so React state
 * updates from the reader callback are flushed before assertions.
 */
function uploadFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input);
}

describe("ColdOpenInput", () => {
  describe("rendering", () => {
    it("renders the textarea with the accessible label", () => {
      renderInput();
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      // PR B — the prototype `.co-input` card has no visible label
      // (the prompting is owned by the AI-opener bubble above the card).
      // The textarea keeps an accessible name via aria-label so screen
      // readers still announce it.
      expect(textarea).toHaveAccessibleName(
        "What's on your mind this election?",
      );
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

    it("keeps the 'Show me an example' affordance visible when textarea has content", () => {
      // PR D — faithful to prototype-views.jsx 252-255: both starter chips show
      // for the ENTIRE prompt phase, independent of draft length. The earlier
      // `isEmpty` gate (which hid them as soon as the user typed) was
      // deliberately dropped to match the prototype.
      renderInput({ initialDraft: "I care about healthcare" });
      expect(screen.getByTestId("cold-open-show-example")).toBeInTheDocument();
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

  describe("Use a starter profile", () => {
    it("renders a hidden file input scoped to .txt files", () => {
      renderInput();
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.type).toBe("file");
      expect(fileInput.accept).toContain(".txt");
    });

    it("uploading a file with a valid '## Priorities' block emits the parsed themes", async () => {
      const onStarterProfileLoaded = vi.fn();
      const { onSubmit } = renderInput({ onStarterProfileLoaded });
      const profileText = buildProfile([
        "Healthcare access",
        "Climate action",
        "Protecting democracy",
      ]);
      const file = new File([profileText], "profile.txt", {
        type: "text/plain",
      });
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;

      await act(async () => {
        uploadFile(fileInput, file);
      });

      await waitFor(() => {
        expect(onStarterProfileLoaded).toHaveBeenCalledTimes(1);
      });
      const [themes, originalText] = onStarterProfileLoaded.mock.calls[0];
      expect(themes).toEqual([
        { name: "Healthcare access", quotes: ['"Healthcare access"'] },
        { name: "Climate action", quotes: ['"Climate action"'] },
        { name: "Protecting democracy", quotes: ['"Protecting democracy"'] },
      ]);
      expect(typeof originalText).toBe("string");
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("uploading a file with no '## Priorities' block shows a friendly error and does NOT emit themes", async () => {
      const onStarterProfileLoaded = vi.fn();
      renderInput({ onStarterProfileLoaded });
      const file = new File(
        ["This is just a random text file.\nNothing useful here.\n"],
        "random.txt",
        { type: "text/plain" },
      );
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;

      await act(async () => {
        uploadFile(fileInput, file);
      });

      const errorEl = await screen.findByTestId(
        "cold-open-starter-profile-error",
      );
      expect(errorEl).toBeInTheDocument();
      expect(errorEl.textContent ?? "").toMatch(/\S/);
      expect(onStarterProfileLoaded).not.toHaveBeenCalled();
      // textarea should remain empty so the user can retry or type
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });

    it("uploading a file with '## Priorities' but no numbered items shows the error", async () => {
      const onStarterProfileLoaded = vi.fn();
      renderInput({ onStarterProfileLoaded });
      const profileText = [
        "# Voter Choice — saved profile",
        "",
        "## Priorities",
        "(no themes locked)",
        "",
      ].join("\n");
      const file = new File([profileText], "empty-profile.txt", {
        type: "text/plain",
      });
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;

      await act(async () => {
        uploadFile(fileInput, file);
      });

      const errorEl = await screen.findByTestId(
        "cold-open-starter-profile-error",
      );
      expect(errorEl).toBeInTheDocument();
      expect(onStarterProfileLoaded).not.toHaveBeenCalled();
    });

    it("uploading a file > 10KB shows the error and does NOT emit themes", async () => {
      const onStarterProfileLoaded = vi.fn();
      renderInput({ onStarterProfileLoaded });
      // 11KB of plausible content
      const big =
        "# Voter Choice — saved profile\n\n## Priorities\n" +
        "x".repeat(11 * 1024);
      const file = new File([big], "big.txt", { type: "text/plain" });
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;

      await act(async () => {
        uploadFile(fileInput, file);
      });

      const errorEl = await screen.findByTestId(
        "cold-open-starter-profile-error",
      );
      expect(errorEl).toBeInTheDocument();
      expect(onStarterProfileLoaded).not.toHaveBeenCalled();
    });

    it("uploading a non-.txt file shows the error and does NOT emit themes", async () => {
      const onStarterProfileLoaded = vi.fn();
      renderInput({ onStarterProfileLoaded });
      const file = new File(["binary blob"], "profile.pdf", {
        type: "application/pdf",
      });
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;

      await act(async () => {
        uploadFile(fileInput, file);
      });

      const errorEl = await screen.findByTestId(
        "cold-open-starter-profile-error",
      );
      expect(errorEl).toBeInTheDocument();
      expect(onStarterProfileLoaded).not.toHaveBeenCalled();
    });

    it("clicking the chip triggers the hidden file input (no submit / no textarea fill)", () => {
      const { onSubmit, onStarterProfileLoaded } = renderInput();
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");
      fireEvent.click(screen.getByTestId("cold-open-use-starter-profile"));
      expect(clickSpy).toHaveBeenCalledTimes(1);
      // No themes emitted until a file is read
      expect(onStarterProfileLoaded).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
      // Textarea remains empty
      const textarea = screen.getByTestId(
        "cold-open-textarea",
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });

    it("after a successful upload, a subsequent re-upload of a bad file clears the previous error before showing the new one", async () => {
      const onStarterProfileLoaded = vi.fn();
      renderInput({ onStarterProfileLoaded });
      const fileInput = screen.getByTestId(
        "cold-open-starter-profile-input",
      ) as HTMLInputElement;
      // First: bad upload
      const badFile = new File(["nothing here"], "bad.txt", {
        type: "text/plain",
      });
      await act(async () => {
        uploadFile(fileInput, badFile);
      });
      expect(
        await screen.findByTestId("cold-open-starter-profile-error"),
      ).toBeInTheDocument();
      // Then: good upload clears the error and emits themes
      const goodFile = new File(
        [buildProfile(["Schools", "Transit"])],
        "good.txt",
        { type: "text/plain" },
      );
      await act(async () => {
        uploadFile(fileInput, goodFile);
      });
      await waitFor(() => {
        expect(onStarterProfileLoaded).toHaveBeenCalledTimes(1);
      });
      expect(
        screen.queryByTestId("cold-open-starter-profile-error"),
      ).not.toBeInTheDocument();
    });
  });
});
