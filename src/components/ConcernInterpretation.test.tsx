// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConcernInterpretation } from "./ConcernInterpretation";
import { LanguageProvider } from "../lib/i18n";
import type {
  ConcernInterpretationBlock,
  ConcernInterpretationEntry,
} from "../lib/structured-blocks";
import type { ConcernConfirmation } from "./ConcernInterpretation";

/* ── Fixtures ─────────────────────────────────────────────── */

const clearEntry: ConcernInterpretationEntry = {
  sourceType: "tag",
  sourceTagId: "a",
  rank: 1,
  interpretation: "Crime / public safety",
  canonicalIssue: "crime_public_safety",
  confidence: "clear",
};

const lowEntry: ConcernInterpretationEntry = {
  sourceType: "freeText",
  sourceText: "reproductive rights",
  rank: 2,
  interpretation: "Abortion and reproductive healthcare",
  confidence: "low",
  disambiguationQuestion: "Which side matches your view?",
  disambiguationOptions: [
    "Pro-choice / abortion access protections",
    "Pro-life / abortion restrictions",
  ],
};

const offTopicEntry: ConcernInterpretationEntry = {
  sourceType: "freeText",
  sourceText: "I want to know about my dog",
  rank: 3,
  interpretation: "Not ballot-relevant",
  confidence: "off_topic",
};

const mixedBlock: ConcernInterpretationBlock = {
  entries: [clearEntry, lowEntry, offTopicEntry],
};

const clearOnlyBlock: ConcernInterpretationBlock = {
  entries: [clearEntry],
};

const lowOnlyBlock: ConcernInterpretationBlock = {
  entries: [lowEntry],
};

const offTopicOnlyBlock: ConcernInterpretationBlock = {
  entries: [offTopicEntry],
};

function renderComponent(
  block: ConcernInterpretationBlock,
  props: Partial<React.ComponentProps<typeof ConcernInterpretation>> = {},
) {
  const onConfirm = vi.fn();
  const onReinterpret = vi.fn();
  const onRemove = vi.fn();

  const result = render(
    <LanguageProvider>
      <ConcernInterpretation
        block={block}
        onConfirm={onConfirm}
        onReinterpret={onReinterpret}
        onRemove={onRemove}
        {...props}
      />
    </LanguageProvider>,
  );

  return { ...result, onConfirm, onReinterpret, onRemove };
}

/* ── Tests ─────────────────────────────────────────────────── */

describe("ConcernInterpretation", () => {
  describe("rendering", () => {
    it("renders all entries with rank badges in order", () => {
      renderComponent(mixedBlock);

      // All rank badges should appear
      expect(screen.getByLabelText("Priority 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Priority 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Priority 3")).toBeInTheDocument();

      // All entry cards present
      expect(screen.getByTestId("concern-entry-1")).toBeInTheDocument();
      expect(screen.getByTestId("concern-entry-2")).toBeInTheDocument();
      expect(screen.getByTestId("concern-entry-3")).toBeInTheDocument();
    });

    it("renders the heading and subhead", () => {
      renderComponent(clearOnlyBlock);
      expect(screen.getByText("Did we get this right?")).toBeInTheDocument();
      expect(
        screen.getByText(/We interpreted your concerns/i),
      ).toBeInTheDocument();
    });

    it("renders clear entry interpretation text", () => {
      renderComponent(clearOnlyBlock);
      expect(screen.getByText("Crime / public safety")).toBeInTheDocument();
    });

    it("renders disambiguation options for low-confidence entry", () => {
      renderComponent(lowOnlyBlock);
      expect(
        screen.getByTestId(
          "concern-disambig-option-2-Pro-choice / abortion access protections",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(
          "concern-disambig-option-2-Pro-life / abortion restrictions",
        ),
      ).toBeInTheDocument();
    });

    it("renders off-topic notice for off_topic entry", () => {
      renderComponent(offTopicOnlyBlock);
      expect(
        screen.getByTestId("concern-entry-offtopic-notice-3"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/doesn't look like a ballot-relevant concern/i),
      ).toBeInTheDocument();
    });

    it("renders the disambiguation question text", () => {
      renderComponent(lowOnlyBlock);
      expect(
        screen.getByText("Which side matches your view?"),
      ).toBeInTheDocument();
    });
  });

  describe("Confirm button state", () => {
    it("is enabled for a clear-only block (no action needed from user)", () => {
      renderComponent(clearOnlyBlock);
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).not.toBeDisabled();
    });

    it("is disabled when a low-confidence entry has no option picked", () => {
      renderComponent(lowOnlyBlock);
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();
    });

    it("is enabled after user picks a disambiguation option", () => {
      renderComponent(lowOnlyBlock);
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();

      fireEvent.click(
        screen.getByTestId(
          "concern-disambig-option-2-Pro-choice / abortion access protections",
        ),
      );

      expect(btn).not.toBeDisabled();
    });

    it("is disabled when an off_topic entry is not removed", () => {
      renderComponent(offTopicOnlyBlock);
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();
    });

    it("is enabled after removing the off_topic entry", () => {
      renderComponent(offTopicOnlyBlock);
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();

      fireEvent.click(screen.getByTestId("concern-entry-remove-3"));

      expect(btn).not.toBeDisabled();
    });

    it("is disabled while isSubmitting", () => {
      renderComponent(clearOnlyBlock, { isSubmitting: true });
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();
    });

    it("is hidden when isSubmitted", () => {
      renderComponent(clearOnlyBlock, { isSubmitted: true });
      expect(
        screen.queryByTestId("concern-interpretation-confirm"),
      ).not.toBeInTheDocument();
    });
  });

  describe("onConfirm payload", () => {
    it("clear entry: clicking Confirm fires onConfirm with resolved interpretation", () => {
      const { onConfirm } = renderComponent(clearOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-interpretation-confirm"));

      expect(onConfirm).toHaveBeenCalledOnce();
      const confirmations: ConcernConfirmation[] = onConfirm.mock.calls[0][0];
      expect(confirmations).toHaveLength(1);
      expect(confirmations[0].rank).toBe(1);
      expect(confirmations[0].resolvedInterpretation).toBe(
        "Crime / public safety",
      );
      expect(confirmations[0].removed).toBeUndefined();
    });

    it("ambiguous entry: after picking option, onConfirm includes resolvedStance", () => {
      const { onConfirm } = renderComponent(lowOnlyBlock);

      fireEvent.click(
        screen.getByTestId(
          "concern-disambig-option-2-Pro-choice / abortion access protections",
        ),
      );
      fireEvent.click(screen.getByTestId("concern-interpretation-confirm"));

      expect(onConfirm).toHaveBeenCalledOnce();
      const confirmations: ConcernConfirmation[] = onConfirm.mock.calls[0][0];
      expect(confirmations[0].rank).toBe(2);
      expect(confirmations[0].resolvedInterpretation).toBe(
        "Pro-choice / abortion access protections",
      );
      expect(confirmations[0].resolvedStance).toBe(
        "Pro-choice / abortion access protections",
      );
    });

    it("removed entry is included in confirmations with removed: true", () => {
      const { onConfirm } = renderComponent(clearOnlyBlock);

      fireEvent.click(screen.getByTestId("concern-entry-remove-1"));
      fireEvent.click(screen.getByTestId("concern-interpretation-confirm"));

      expect(onConfirm).toHaveBeenCalledOnce();
      const confirmations: ConcernConfirmation[] = onConfirm.mock.calls[0][0];
      expect(confirmations[0].removed).toBe(true);
    });

    it("mixed block: onConfirm receives confirmations for all entries", () => {
      const { onConfirm } = renderComponent(mixedBlock);

      // Remove off_topic entry (required)
      fireEvent.click(screen.getByTestId("concern-entry-remove-3"));

      // Pick option for low entry
      fireEvent.click(
        screen.getByTestId(
          "concern-disambig-option-2-Pro-life / abortion restrictions",
        ),
      );

      // Now confirm button should be enabled
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).not.toBeDisabled();

      fireEvent.click(btn);
      expect(onConfirm).toHaveBeenCalledOnce();
      const confirmations: ConcernConfirmation[] = onConfirm.mock.calls[0][0];
      expect(confirmations).toHaveLength(3);

      const c1 = confirmations.find((c) => c.rank === 1)!;
      expect(c1.resolvedInterpretation).toBe("Crime / public safety");
      expect(c1.removed).toBeUndefined();

      const c2 = confirmations.find((c) => c.rank === 2)!;
      expect(c2.resolvedStance).toBe("Pro-life / abortion restrictions");

      const c3 = confirmations.find((c) => c.rank === 3)!;
      expect(c3.removed).toBe(true);
    });
  });

  describe("off_topic entry", () => {
    it("clicking Remove fires onRemove callback", () => {
      const { onRemove } = renderComponent(offTopicOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-entry-remove-3"));
      expect(onRemove).toHaveBeenCalledWith(3);
    });

    it("shows removed visual state after clicking Remove", () => {
      renderComponent(offTopicOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-entry-remove-3"));
      expect(screen.getByTestId("concern-entry-removed-3")).toBeInTheDocument();
    });

    it("entry can be undone after removal", () => {
      renderComponent(offTopicOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-entry-remove-3"));
      fireEvent.click(screen.getByTestId("concern-entry-undo-3"));
      // Should be back to interactive state
      expect(screen.getByTestId("concern-entry-3")).toBeInTheDocument();
    });
  });

  describe("edit affordance", () => {
    it("clicking Edit opens the edit input for a clear entry", () => {
      renderComponent(clearOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      expect(
        screen.getByTestId("concern-entry-edit-input-1"),
      ).toBeInTheDocument();
    });

    it("typing new text and clicking Save fires onReinterpret(rank, newText)", () => {
      const { onReinterpret } = renderComponent(clearOnlyBlock);

      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      const input = screen.getByTestId("concern-entry-edit-input-1");
      fireEvent.change(input, { target: { value: "public transit funding" } });
      fireEvent.click(screen.getByTestId("concern-entry-edit-commit-1"));

      expect(onReinterpret).toHaveBeenCalledWith(1, "public transit funding");
    });

    it("pressing Enter in the edit input commits the edit", () => {
      const { onReinterpret } = renderComponent(clearOnlyBlock);

      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      const input = screen.getByTestId("concern-entry-edit-input-1");
      fireEvent.change(input, { target: { value: "gun safety laws" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(onReinterpret).toHaveBeenCalledWith(1, "gun safety laws");
    });

    it("pressing Escape cancels the edit without firing onReinterpret", () => {
      const { onReinterpret } = renderComponent(clearOnlyBlock);

      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      const input = screen.getByTestId("concern-entry-edit-input-1");
      fireEvent.change(input, { target: { value: "something" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onReinterpret).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("concern-entry-edit-input-1"),
      ).not.toBeInTheDocument();
    });

    it("Cancel button closes the edit input without firing onReinterpret", () => {
      const { onReinterpret } = renderComponent(clearOnlyBlock);

      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      fireEvent.click(screen.getByTestId("concern-entry-edit-cancel-1"));

      expect(onReinterpret).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("concern-entry-edit-input-1"),
      ).not.toBeInTheDocument();
    });

    it("Save button is disabled when edit text is empty", () => {
      renderComponent(clearOnlyBlock);
      fireEvent.click(screen.getByTestId("concern-entry-edit-1"));
      const saveBtn = screen.getByTestId("concern-entry-edit-commit-1");
      // Input is pre-filled with sourceTagId but may be empty depending on entry
      // Clear it to test empty state
      const input = screen.getByTestId("concern-entry-edit-input-1");
      fireEvent.change(input, { target: { value: "" } });
      expect(saveBtn).toBeDisabled();
    });
  });

  describe("isSubmitting", () => {
    it("disables the Confirm button", () => {
      renderComponent(clearOnlyBlock, { isSubmitting: true });
      const btn = screen.getByTestId("concern-interpretation-confirm");
      expect(btn).toBeDisabled();
    });

    it("shows the submitting label on the Confirm button", () => {
      renderComponent(clearOnlyBlock, { isSubmitting: true });
      expect(
        screen.getByTestId("concern-interpretation-confirm"),
      ).toHaveTextContent(/Confirming/i);
    });

    it("disables Remove buttons", () => {
      renderComponent(clearOnlyBlock, { isSubmitting: true });
      const removeBtn = screen.queryByTestId("concern-entry-remove-1");
      // Remove buttons are hidden when submitting
      if (removeBtn) {
        expect(removeBtn).toBeDisabled();
      } else {
        // The button is conditionally rendered — not shown when disabled
        expect(removeBtn).not.toBeInTheDocument();
      }
    });
  });

  describe("isSubmitted", () => {
    it("renders the read-only submitted view", () => {
      renderComponent(clearOnlyBlock, { isSubmitted: true });
      expect(
        screen.getByTestId("concern-interpretation-submitted"),
      ).toBeInTheDocument();
      expect(screen.getByText(/Concerns confirmed/i)).toBeInTheDocument();
    });

    it("does not render the Confirm button", () => {
      renderComponent(clearOnlyBlock, { isSubmitted: true });
      expect(
        screen.queryByTestId("concern-interpretation-confirm"),
      ).not.toBeInTheDocument();
    });

    it("renders confirmed interpretations in the summary", () => {
      renderComponent(clearOnlyBlock, { isSubmitted: true });
      expect(screen.getByText("Crime / public safety")).toBeInTheDocument();
    });
  });

  describe("disambiguation option toggle", () => {
    it("selecting a different option updates the pick", () => {
      renderComponent(lowOnlyBlock);

      const optionA = screen.getByTestId(
        "concern-disambig-option-2-Pro-choice / abortion access protections",
      );
      const optionB = screen.getByTestId(
        "concern-disambig-option-2-Pro-life / abortion restrictions",
      );

      fireEvent.click(optionA);
      expect(optionA).toHaveAttribute("aria-pressed", "true");
      expect(optionB).toHaveAttribute("aria-pressed", "false");

      // Switch to B
      fireEvent.click(optionB);
      expect(optionA).toHaveAttribute("aria-pressed", "false");
      expect(optionB).toHaveAttribute("aria-pressed", "true");
    });
  });
});
