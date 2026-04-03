// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { LanguageToggle } from "./LanguageToggle";
import { LanguageProvider } from "../lib/i18n";

function renderWithProvider(
  ui: React.ReactElement,
  initialLang?: "en" | "es",
) {
  if (initialLang === "es") {
    localStorage.setItem("ballot-tool-lang", "es");
  } else {
    localStorage.removeItem("ballot-tool-lang");
  }
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("LanguageToggle", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders with data-testid='language-toggle'", () => {
    renderWithProvider(<LanguageToggle />);
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("has an accessible aria-label", () => {
    renderWithProvider(<LanguageToggle />);
    const btn = screen.getByTestId("language-toggle");
    expect(btn).toHaveAttribute("aria-label");
    expect(btn.getAttribute("aria-label")).toBeTruthy();
  });

  it("shows 'Español' when language is English", async () => {
    renderWithProvider(<LanguageToggle />);
    await act(async () => {});
    expect(screen.getByTestId("language-toggle")).toHaveTextContent("Español");
  });

  it("shows 'English' when language is Spanish", async () => {
    renderWithProvider(<LanguageToggle />, "es");
    await act(async () => {});
    expect(screen.getByTestId("language-toggle")).toHaveTextContent("English");
  });

  it("calls setLang to Spanish when clicked in English mode", async () => {
    renderWithProvider(<LanguageToggle />);
    await act(async () => {});
    await act(async () => {
      screen.getByTestId("language-toggle").click();
    });
    expect(localStorage.getItem("ballot-tool-lang")).toBe("es");
  });

  it("calls setLang to English when clicked in Spanish mode", async () => {
    renderWithProvider(<LanguageToggle />, "es");
    await act(async () => {});
    await act(async () => {
      screen.getByTestId("language-toggle").click();
    });
    expect(localStorage.getItem("ballot-tool-lang")).toBe("en");
  });

  it("is a button element (keyboard accessible)", () => {
    renderWithProvider(<LanguageToggle />);
    const btn = screen.getByTestId("language-toggle");
    expect(btn.tagName.toLowerCase()).toBe("button");
  });
});
