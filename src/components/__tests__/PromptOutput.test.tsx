import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PromptOutput } from "../PromptOutput";
import { LanguageProvider } from "../../lib/i18n";

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

describe("PromptOutput — Spanish translations", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  afterEach(() => {
    localStorage.clear();
  });

  function renderEs(text = "Test prompt") {
    return render(
      <LanguageProvider>
        <PromptOutput promptText={text} />
      </LanguageProvider>,
    );
  }

  it("shows Spanish title", () => {
    renderEs();
    expect(screen.getByText("Tu Prompt Personalizado")).toBeInTheDocument();
  });

  it("shows Spanish instructions", () => {
    renderEs();
    expect(
      screen.getByText(
        "Copia este prompt y pégalo como tu primer mensaje en cualquier chatbot de IA.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Spanish copy button text", () => {
    renderEs();
    expect(screen.getByTestId("copy-button")).toHaveTextContent(
      "Copiar al Portapapeles",
    );
  });
});
