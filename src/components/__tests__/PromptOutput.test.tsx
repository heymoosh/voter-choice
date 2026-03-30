import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptOutput } from "../PromptOutput";

const SAMPLE_PROMPT =
  "You are a nonpartisan civic research assistant\n\nHi! I'm voting in Texas.";

describe("PromptOutput", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it("renders prompt-output testid", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
  });

  it("renders copy-button testid", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("copy-button")).toBeInTheDocument();
  });

  it("shows prompt text", () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    expect(screen.getByTestId("prompt-output")).toHaveTextContent(
      "nonpartisan civic research assistant",
    );
  });

  it("shows copy-confirmation after clicking copy", async () => {
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("copy-button"));
    expect(screen.getByTestId("copy-confirmation")).toBeInTheDocument();
    expect(screen.getByTestId("copy-confirmation")).toHaveTextContent(
      "Copied!",
    );
  });

  it("copy-confirmation disappears after 2 seconds", async () => {
    vi.useFakeTimers();
    render(<PromptOutput promptText={SAMPLE_PROMPT} />);
    // Use fireEvent to avoid userEvent async issues with fake timers
    await act(async () => {
      fireEvent.click(screen.getByTestId("copy-button"));
    });
    expect(screen.getByTestId("copy-confirmation")).toBeInTheDocument();
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.queryByTestId("copy-confirmation")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
