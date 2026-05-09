// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ValuesTagSelector } from "./ValuesTagSelector";
import { LanguageProvider } from "../lib/i18n";
import type { ValuesTagRequestBlock } from "../lib/structured-blocks";

/* ── Test fixtures ───────────────────────────────────────── */

const block: ValuesTagRequestBlock = {
  items: [
    { id: "public_safety", label: "Public safety" },
    { id: "education", label: "Education" },
    { id: "housing", label: "Housing" },
    { id: "environment", label: "Environment" },
    { id: "show_ballot", label: "Show me the full ballot" },
    { id: "custom", label: "Something else…" },
  ],
};

function renderSelector(
  props: Partial<React.ComponentProps<typeof ValuesTagSelector>> = {},
) {
  const onSubmit = vi.fn();
  render(
    <LanguageProvider>
      <ValuesTagSelector block={block} onSubmit={onSubmit} {...props} />
    </LanguageProvider>,
  );
  return { onSubmit };
}

/* ── Tests ───────────────────────────────────────────────── */

describe("ValuesTagSelector", () => {
  it("renders all items from block.items as chips", () => {
    renderSelector();
    expect(
      screen.getByTestId("values-tag-chip-public_safety"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("values-tag-chip-education")).toBeInTheDocument();
    expect(screen.getByTestId("values-tag-chip-housing")).toBeInTheDocument();
    expect(
      screen.getByTestId("values-tag-chip-environment"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("values-tag-chip-show_ballot"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("values-tag-chip-custom")).toBeInTheDocument();
  });

  it("selecting up to 3 issue tags works", () => {
    renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    fireEvent.click(screen.getByTestId("values-tag-chip-education"));
    fireEvent.click(screen.getByTestId("values-tag-chip-housing"));

    expect(screen.getByTestId("values-tag-chip-public_safety")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("values-tag-chip-education")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("values-tag-chip-housing")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("selecting a 4th issue tag is rejected (max 3 enforced)", () => {
    renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    fireEvent.click(screen.getByTestId("values-tag-chip-education"));
    fireEvent.click(screen.getByTestId("values-tag-chip-housing"));
    // 4th chip should be disabled now (aria-pressed stays false)
    fireEvent.click(screen.getByTestId("values-tag-chip-environment"));
    expect(screen.getByTestId("values-tag-chip-environment")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("selecting show_ballot clears prior tag selection", () => {
    renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    fireEvent.click(screen.getByTestId("values-tag-chip-education"));
    // Now select show_ballot
    fireEvent.click(screen.getByTestId("values-tag-chip-show_ballot"));
    expect(screen.getByTestId("values-tag-chip-show_ballot")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("values-tag-chip-public_safety")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("values-tag-chip-education")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("selecting an issue tag clears show_ballot", () => {
    renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-show_ballot"));
    expect(screen.getByTestId("values-tag-chip-show_ballot")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    expect(screen.getByTestId("values-tag-chip-show_ballot")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByTestId("values-tag-chip-public_safety")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("selecting custom reveals the free-text input", () => {
    renderSelector();
    expect(
      screen.queryByTestId("values-tag-custom-input"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("values-tag-chip-custom"));
    expect(screen.getByTestId("values-tag-custom-input")).toBeInTheDocument();
  });

  it("submitting with non-empty custom text emits { tags: [], custom: '...' }", () => {
    const { onSubmit } = renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-custom"));
    fireEvent.change(screen.getByTestId("values-tag-custom-input"), {
      target: { value: "affordable housing crisis" },
    });
    fireEvent.click(screen.getByTestId("values-tag-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      tags: [],
      custom: "affordable housing crisis",
    });
  });

  it("custom input clears tag selection (custom and tags are mutually exclusive)", () => {
    renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    expect(screen.getByTestId("values-tag-chip-public_safety")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByTestId("values-tag-chip-custom"));
    // After selecting custom, issue tags should be cleared
    expect(screen.getByTestId("values-tag-chip-public_safety")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("submitting with no selection and no custom text emits { tags: [] }", () => {
    const { onSubmit } = renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ tags: [] });
  });

  it("submitting with selected tags emits { tags: [selectedIds] }", () => {
    const { onSubmit } = renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-chip-public_safety"));
    fireEvent.click(screen.getByTestId("values-tag-chip-education"));
    fireEvent.click(screen.getByTestId("values-tag-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0][0] as { tags: string[] };
    expect(call.tags).toContain("public_safety");
    expect(call.tags).toContain("education");
    expect(call.tags).toHaveLength(2);
  });

  it("skip button emits 'skipped'", () => {
    const { onSubmit } = renderSelector();
    fireEvent.click(screen.getByTestId("values-tag-skip"));
    expect(onSubmit).toHaveBeenCalledWith("skipped");
  });

  it("isSubmitting disables the submit button", () => {
    renderSelector({ isSubmitting: true });
    expect(screen.getByTestId("values-tag-submit")).toBeDisabled();
    expect(screen.getByTestId("values-tag-skip")).toBeDisabled();
  });

  it("isSubmitted renders a read-only confirmation summary", () => {
    renderSelector({
      isSubmitted: true,
      submittedTags: ["public_safety", "education"],
    });
    expect(
      screen.getByTestId("values-tag-selector-submitted"),
    ).toBeInTheDocument();
    // Pick buttons should be gone
    expect(screen.queryByTestId("values-tag-submit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("values-tag-skip")).not.toBeInTheDocument();
    // Labels should show
    expect(screen.getByText("Public safety")).toBeInTheDocument();
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("isSubmitted without submittedTags shows confirmation without chips", () => {
    renderSelector({ isSubmitted: true });
    expect(
      screen.getByTestId("values-tag-selector-submitted"),
    ).toBeInTheDocument();
  });
});
