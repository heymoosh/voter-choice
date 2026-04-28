// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PageContent } from "./PageContent";
import { LanguageProvider } from "../lib/i18n";
import { ResearchModeProvider } from "../lib/researchMode";

function renderWithProvider(initialLang?: "es") {
  if (initialLang === "es") {
    localStorage.setItem("ballot-tool-lang", "es");
  } else {
    localStorage.removeItem("ballot-tool-lang");
  }
  return render(
    <ResearchModeProvider>
      <LanguageProvider>
        <PageContent />
      </LanguageProvider>
    </ResearchModeProvider>,
  );
}

describe("PageContent — English mode", () => {
  beforeEach(() => localStorage.clear());

  it("renders English hero title", () => {
    renderWithProvider();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Know what’s on your ballot before you walk in.",
    );
  });

  it("renders trust signals", () => {
    renderWithProvider();
    expect(screen.getByText("Nothing saved.")).toBeInTheDocument();
    expect(screen.getByText("No account.")).toBeInTheDocument();
    expect(screen.getByText("No tracking.")).toBeInTheDocument();
  });

  it("renders English footer with legal links", () => {
    renderWithProvider();
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Voter Choice",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Terms of Use" }),
    ).toBeInTheDocument();
  });

  it("renders How it Works section", () => {
    renderWithProvider();
    expect(screen.getByText("How it works")).toBeInTheDocument();
    expect(screen.getByText("Enter your address")).toBeInTheDocument();
    expect(screen.getByText("Ask anything")).toBeInTheDocument();
    expect(screen.getByText("Take it with you")).toBeInTheDocument();
  });
});

describe("PageContent — Spanish mode", () => {
  beforeEach(() => localStorage.clear());

  it("renders Spanish hero title", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tu Boleta",
    );
  });

  it("renders Spanish trust signals", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(screen.getByText("Sin datos almacenados.")).toBeInTheDocument();
    expect(screen.getByText("Sin cuentas.")).toBeInTheDocument();
    expect(screen.getByText("100% privado.")).toBeInTheDocument();
  });

  it("renders Spanish footer with legal links", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(
      screen.getByRole("link", { name: "Política de Privacidad" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Términos de Uso" }),
    ).toBeInTheDocument();
  });

  it("renders How it Works in Spanish", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(screen.getByText("Cómo Funciona")).toBeInTheDocument();
    expect(screen.getByText("Localiza tu Distrito")).toBeInTheDocument();
  });
});
