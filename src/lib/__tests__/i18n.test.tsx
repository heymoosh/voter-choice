import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "../i18n";

// Helper component that exposes language state
function LangDisplay() {
  const { lang, setLang, t } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t.hero.title}</span>
      <button onClick={() => setLang(lang === "en" ? "es" : "en")}>
        Toggle
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("LanguageProvider", () => {
  it("defaults to English", () => {
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("en");
  });

  it("reads persisted language from localStorage", () => {
    localStorage.setItem("lang", "es");
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang").textContent).toBe("es");
  });

  it("toggling language updates state and localStorage", () => {
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(screen.getByTestId("lang").textContent).toBe("es");
    expect(localStorage.getItem("lang")).toBe("es");
  });

  it("t reflects current language translations", () => {
    localStorage.setItem("lang", "es");
    render(
      <LanguageProvider>
        <LangDisplay />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("title").textContent).toBe(
      "Sabe por quién vas a votar",
    );
  });
});
