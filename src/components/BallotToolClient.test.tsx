// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { BallotToolClient } from "./BallotToolClient";
import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";

// Mock scrollIntoView (not available in jsdom)
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
  // Mock fetch for /api/chat GET (budget check) and POST (chat)
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url === "/api/chat") {
      return new Response(
        JSON.stringify({ budget: { tier: "normal", percent: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response("Not found", { status: 404 });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ResearchModeProvider>
      <LanguageProvider>{ui}</LanguageProvider>
    </ResearchModeProvider>,
  );
}

describe("BallotToolClient", () => {
  it("renders the zip input form initially", () => {
    renderWithProviders(<BallotToolClient />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("shows research layout after submitting a valid TX zip", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    });
  });

  it("shows prompt-output in research view after submitting a valid TX zip", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    // Wait for research layout
    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    });

    // Prompt output is now always visible in the research layout
    await waitFor(() => {
      expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    });
    expect(screen.getByTestId("prompt-output").textContent).toContain("Texas");
  });

  it("shows ballot data status in research view", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("ballot-data-status")).toBeInTheDocument();
    });
    expect(screen.getByTestId("ballot-data-status").textContent).toContain(
      "Official ballot data",
    );
  });

  it("shows not-found-message for unknown zip", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "00001" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    });
  });

  it("shows state-selector for multi-state zip 86515", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "86515" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("state-selector")).toBeInTheDocument();
    });
  });

  it("shows research layout after resolving zip", async () => {
    renderWithProviders(<BallotToolClient />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    // Research layout should eventually appear
    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    });
  });
});

describe("BallotToolClient — Spanish mode", () => {
  beforeEach(() => {
    localStorage.setItem("ballot-tool-lang", "es");
  });
  afterEach(() => {
    localStorage.clear();
  });

  function renderEs() {
    return renderWithProviders(<BallotToolClient />);
  }

  it("shows Spanish not-found message for unknown zip", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "00001" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("not-found-message")).toBeInTheDocument();
    });
    expect(screen.getByTestId("not-found-message").textContent).toContain(
      "A\u00fan no tenemos datos",
    );
  });

  it("shows research layout when state found in Spanish mode", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      const chatWindow = screen.queryByTestId("chat-window");
      const noElection = screen.queryByTestId("no-election-message");
      expect(chatWindow || noElection).toBeTruthy();
    });
  });

  it("shows Spanish prompt text when state found in Spanish mode", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));

    // Wait for research layout
    await waitFor(() => {
      expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    });

    // Prompt output is now always visible in the research layout
    await waitFor(() => {
      expect(screen.getByTestId("prompt-output")).toBeInTheDocument();
    });
    expect(screen.getByTestId("prompt-output").textContent).toMatch(
      /asistente|¡Hola!/,
    );
  });

  it("shows Spanish multi-state prompt for zip 86515", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "86515" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("state-selector")).toBeInTheDocument();
    });
    expect(screen.getByTestId("state-selector").textContent).toMatch(
      /estado|votar/i,
    );
  });
});
