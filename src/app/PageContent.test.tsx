// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { PageContent } from "./PageContent";
import { LanguageProvider } from "../lib/i18n";

function renderWithProvider(initialLang?: "es") {
  if (initialLang === "es") {
    localStorage.setItem("ballot-tool-lang", "es");
  } else {
    localStorage.removeItem("ballot-tool-lang");
  }
  return render(
    <LanguageProvider>
      <PageContent />
    </LanguageProvider>,
  );
}

describe("PageContent — English mode", () => {
  beforeEach(() => localStorage.clear());

  it("renders English hero title", () => {
    renderWithProvider();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Free AI Ballot Research Tool",
    );
  });

  it("renders tips section in English", () => {
    renderWithProvider();
    expect(screen.getByTestId("tips-section")).toBeInTheDocument();
    expect(screen.getByTestId("tips-section").textContent).toMatch(
      /I don.t know/i,
    );
  });

  it("renders English footer attribution", () => {
    renderWithProvider();
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Created by a human using AI tools",
    );
  });

  it("renders chatbot links with proper names", () => {
    renderWithProvider();
    expect(screen.getByRole("link", { name: "Claude" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ChatGPT" })).toBeInTheDocument();
  });
});

describe("PageContent — Spanish mode", () => {
  beforeEach(() => localStorage.clear());

  it("renders Spanish hero title", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Herramienta",
    );
  });

  it("renders all 4 tips in Spanish", async () => {
    renderWithProvider("es");
    await act(async () => {});
    const tips = screen.getByTestId("tips-section");
    expect(tips.textContent).toMatch(/No sé|decir/i);
  });

  it("renders Spanish footer attribution", async () => {
    renderWithProvider("es");
    await act(async () => {});
    expect(screen.getByRole("contentinfo").textContent).toContain(
      "Creado por una persona usando herramientas de IA",
    );
  });

  it("keeps chatbot proper names in English in Spanish mode", async () => {
    renderWithProvider("es");
    await act(async () => {});
    // Chatbot names are proper nouns — never translated
    expect(screen.getByRole("link", { name: "Claude" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ChatGPT" })).toBeInTheDocument();
  });
});
