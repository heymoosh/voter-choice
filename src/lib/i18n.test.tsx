// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { LanguageProvider, useLanguage } from "./i18n";

// Helper component to expose hook values
function LanguageConsumer() {
  const { lang, setLang } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <button data-testid="set-es" onClick={() => setLang("es")}>
        Set ES
      </button>
      <button data-testid="set-en" onClick={() => setLang("en")}>
        Set EN
      </button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders children", () => {
    render(
      <LanguageProvider>
        <span data-testid="child">hello</span>
      </LanguageProvider>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("defaults to English", () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("reads stored language from localStorage on mount", async () => {
    localStorage.setItem("ballot-tool-lang", "es");
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    // After useEffect runs
    await act(async () => {});
    expect(screen.getByTestId("lang").textContent).toBe("es");
  });

  it("ignores invalid stored language values", async () => {
    localStorage.setItem("ballot-tool-lang", "fr");
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });
});

describe("useLanguage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setLang updates the current language", async () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    const btn = screen.getByTestId("set-es");
    await act(async () => {
      btn.click();
    });
    expect(screen.getByTestId("lang").textContent).toBe("es");
  });

  it("setLang persists to localStorage", async () => {
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    await act(async () => {
      screen.getByTestId("set-es").click();
    });
    expect(localStorage.getItem("ballot-tool-lang")).toBe("es");
  });

  it("setLang back to en persists to localStorage", async () => {
    localStorage.setItem("ballot-tool-lang", "es");
    render(
      <LanguageProvider>
        <LanguageConsumer />
      </LanguageProvider>,
    );
    await act(async () => {});
    await act(async () => {
      screen.getByTestId("set-en").click();
    });
    expect(localStorage.getItem("ballot-tool-lang")).toBe("en");
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });
});
