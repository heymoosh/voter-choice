import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LanguageProvider } from "../../lib/i18n";
import { LanguageToggle } from "../LanguageToggle";

beforeEach(() => {
  localStorage.clear();
});

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <LanguageToggle />
    </LanguageProvider>,
  );
}

describe("LanguageToggle", () => {
  it("renders with data-testid='language-toggle'", () => {
    renderWithProvider();
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("shows 'Español' when language is English (switch to Spanish)", () => {
    renderWithProvider();
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "Español",
    );
  });

  it("shows 'English' when language is Spanish", () => {
    localStorage.setItem("lang", "es");
    renderWithProvider();
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "English",
    );
  });

  it("clicking toggles language from en to es", () => {
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByTestId("language-toggle"));
    });
    expect(screen.getByTestId("language-toggle").textContent).toContain(
      "English",
    );
  });

  it("is a button element (keyboard accessible)", () => {
    renderWithProvider();
    const toggle = screen.getByTestId("language-toggle");
    expect(toggle.tagName).toBe("BUTTON");
  });
});
