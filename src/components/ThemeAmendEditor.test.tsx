// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ThemeAmendEditor } from "./ThemeAmendEditor";
import { LanguageProvider } from "../lib/i18n";
import type { Theme } from "../lib/prompts/types";

const sampleThemes: Theme[] = [
  { name: "Healthcare costs", quotes: ['"insulin keeps going up"'] },
  { name: "Housing affordability", quotes: ['"rent went up 30%"'] },
];

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof ThemeAmendEditor>> = {},
) {
  const props = {
    currentThemes: sampleThemes,
    decidedRaces: [],
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    ...overrides,
  } as React.ComponentProps<typeof ThemeAmendEditor>;
  return {
    ...render(
      <LanguageProvider>
        <ThemeAmendEditor {...props} />
      </LanguageProvider>,
    ),
    props,
  };
}

describe("ThemeAmendEditor", () => {
  it("renders an editor region with the test id", () => {
    renderEditor();
    expect(screen.getByTestId("theme-amend-editor")).toBeInTheDocument();
  });

  it("renders the ThemeRanker with the current themes", () => {
    renderEditor();
    expect(screen.getByTestId("theme-ranker")).toBeInTheDocument();
    // ThemeRanker shows the theme name in an editable input (value, not text).
    expect(screen.getByTestId("theme-name-input-0")).toHaveValue(
      "Healthcare costs",
    );
    expect(screen.getByTestId("theme-name-input-1")).toHaveValue(
      "Housing affordability",
    );
  });

  it("renders the candidate-new-theme chip when a candidate is passed", () => {
    renderEditor({
      candidateNewTheme: {
        name: "School funding",
        quotes: ["kids' schools are crumbling"],
      },
      triggeringMessage:
        "I really care about school funding here in Houston, kids' schools are crumbling.",
    });
    const slot = screen.getByTestId("theme-amend-candidate-slot");
    expect(slot).toHaveTextContent(/Adding/i);
    expect(slot).toHaveTextContent(/School funding/i);
    expect(slot).toHaveTextContent("kids' schools are crumbling");
  });

  it("the candidate quote is a verbatim substring of the triggering message", () => {
    const triggeringMessage =
      "I really care about school funding here in Houston, kids' schools are crumbling.";
    const candidateNewTheme = {
      name: "School funding",
      quotes: ["kids' schools are crumbling"],
    };
    renderEditor({ candidateNewTheme, triggeringMessage });
    // Verbatim contract: every quote must be a substring of the triggering
    // message (case-sensitive, exact).
    candidateNewTheme.quotes.forEach((q) => {
      expect(triggeringMessage.includes(q)).toBe(true);
    });
  });

  it("renders a free-text new-theme input when no candidate is passed", () => {
    renderEditor();
    expect(
      screen.getByTestId("theme-amend-new-name-input"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("theme-amend-new-context-input"),
    ).toBeInTheDocument();
  });

  it("Lock button calls onSave with updated themes + new theme when added via free text", () => {
    const onSave = vi.fn();
    renderEditor({ onSave });

    fireEvent.change(screen.getByTestId("theme-amend-new-name-input"), {
      target: { value: "School funding" },
    });
    fireEvent.change(screen.getByTestId("theme-amend-new-context-input"), {
      target: { value: "my kids' school is crumbling" },
    });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));

    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.newTheme).toEqual({
      name: "School funding",
      quotes: ["my kids' school is crumbling"],
    });
    expect(payload.updatedThemes).toHaveLength(3);
    expect(payload.updatedThemes[0].name).toBe("School funding");
    expect(payload.suggestedRank).toBe(1);
  });

  it("Lock without adding a new theme still saves (rerank-only path)", () => {
    const onSave = vi.fn();
    renderEditor({ onSave });
    fireEvent.click(screen.getByTestId("theme-amend-lock"));
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.newTheme).toBeUndefined();
    expect(payload.updatedThemes).toHaveLength(2);
  });

  it("Discard calls onDiscard and does NOT call onSave", () => {
    const onDiscard = vi.fn();
    const onSave = vi.fn();
    renderEditor({ onDiscard, onSave });
    fireEvent.click(screen.getByTestId("theme-amend-discard"));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("inFlight=true disables the Lock + Discard buttons and shows a spinner", () => {
    renderEditor({ inFlight: true });
    expect(screen.getByTestId("theme-amend-lock")).toBeDisabled();
    expect(screen.getByTestId("theme-amend-discard")).toBeDisabled();
    expect(
      screen.getByTestId("theme-amend-inflight-spinner"),
    ).toBeInTheDocument();
  });
});
