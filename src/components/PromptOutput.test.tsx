// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PromptOutput } from "./PromptOutput";

describe("PromptOutput", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders prompt-output with the prompt text", () => {
    render(<PromptOutput promptText="Hello ballot research" />);
    expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    expect(screen.getByTestId("prompt-output").textContent).toContain(
      "Hello ballot research",
    );
  });

  it("renders copy-button with default text", () => {
    render(<PromptOutput promptText="test" />);
    expect(screen.getByTestId("copy-button")).toHaveTextContent(
      "Copy to Clipboard",
    );
  });

  it("renders copy-confirmation with aria-live polite", () => {
    render(<PromptOutput promptText="test" />);
    expect(screen.getByTestId("copy-confirmation")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("calls clipboard.writeText when copy button clicked", async () => {
    render(<PromptOutput promptText="my prompt" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("copy-button"));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("my prompt");
  });

  it("shows Copied! after successful copy", async () => {
    render(<PromptOutput promptText="test" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("copy-button"));
    });
    expect(screen.getByTestId("copy-button")).toHaveTextContent("Copied!");
  });

  it("shows fallback message when clipboard unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    render(<PromptOutput promptText="test" />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("copy-button"));
    });
    expect(screen.getByTestId("copy-confirmation").textContent).toMatch(
      /Ctrl\+C|Cmd\+C/,
    );
  });
});
