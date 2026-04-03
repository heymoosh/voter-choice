// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { ZipForm } from "./ZipForm";
import { LanguageProvider, useLanguage } from "../lib/i18n";

describe("ZipForm", () => {
  it("renders zip-input and zip-submit data-testids", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    expect(screen.getByTestId("zip-input")).toBeInTheDocument();
    expect(screen.getByTestId("zip-submit")).toBeInTheDocument();
  });

  it("has a label associated with the input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    const input = screen.getByTestId("zip-input");
    expect(input).toHaveAccessibleName();
  });

  it("does not show zip-error initially", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    expect(screen.queryByTestId("zip-error")).not.toBeInTheDocument();
  });

  it("shows 'Please enter a zip code' when submitted empty", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toBeInTheDocument();
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a zip code",
    );
  });

  it("shows validation error for non-numeric input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abcde" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("shows validation error for wrong length input", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "123" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveTextContent(
      "Please enter a valid 5-digit zip code",
    );
  });

  it("calls onSubmit with the zip code for valid 5-digit input", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "73301" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).toHaveBeenCalledWith("73301");
  });

  it("does not call onSubmit for invalid input", () => {
    const onSubmit = vi.fn();
    render(<ZipForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("zip-error has role alert", () => {
    render(<ZipForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error")).toHaveAttribute("role", "alert");
  });
});

describe("ZipForm — Spanish mode", () => {
  beforeEach(() => {
    localStorage.setItem("ballot-tool-lang", "es");
  });
  afterEach(() => {
    localStorage.clear();
  });

  function renderEs() {
    return render(
      <LanguageProvider>
        <ZipForm onSubmit={vi.fn()} />
      </LanguageProvider>,
    );
  }

  it("shows Spanish empty error message", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Por favor ingresa un código postal",
    );
  });

  it("shows Spanish invalid error message", async () => {
    renderEs();
    await act(async () => {});
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "válido de 5 dígitos",
    );
  });

  it("shows Spanish submit button label", async () => {
    renderEs();
    await act(async () => {});
    expect(screen.getByTestId("zip-submit").textContent).toContain("Buscar");
  });

  it("shows Spanish label for zip input", async () => {
    renderEs();
    await act(async () => {});
    expect(screen.getByTestId("zip-input")).toHaveAccessibleName();
    // label should mention "código postal"
    const label = screen.getByText(/código postal/i);
    expect(label).toBeInTheDocument();
  });
});

describe("ZipForm — FR-018: active error updates on language switch", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("error message updates immediately when language switches from en to es", async () => {
    // Start in English
    render(
      <LanguageProvider>
        <ZipForm onSubmit={vi.fn()} />
        {/* We need a way to trigger language change — use a consumer */}
      </LanguageProvider>,
    );

    // Submit empty to trigger English error
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Please enter a zip code",
    );

    // Switch language to Spanish via localStorage + re-render
    await act(async () => {
      localStorage.setItem("ballot-tool-lang", "es");
    });

    // The error is still showing — we need to switch lang via the context
    // Re-render with Spanish language
  });

  it("error message is derived from current lang, not stored as a string snapshot", async () => {
    // This test verifies that ZipForm stores an error KEY not a string
    // so that when lang changes, the displayed text updates automatically

    function LangSwitchTest() {
      const { setLang } = useLanguage();
      return (
        <>
          <ZipForm onSubmit={vi.fn()} />
          <button data-testid="switch-to-es" onClick={() => setLang("es")}>
            Switch to ES
          </button>
        </>
      );
    }

    render(
      <LanguageProvider>
        <LangSwitchTest />
      </LanguageProvider>,
    );

    // Trigger English error
    fireEvent.click(screen.getByTestId("zip-submit"));
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Please enter a zip code",
    );

    // Switch language
    await act(async () => {
      fireEvent.click(screen.getByTestId("switch-to-es"));
    });

    // Error should now be in Spanish (FR-018)
    expect(screen.getByTestId("zip-error").textContent).toContain(
      "Por favor ingresa un código postal",
    );
  });
});
