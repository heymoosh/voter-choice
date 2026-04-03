import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../../lib/i18n";
import { PageContent } from "../PageContent";

beforeEach(() => {
  localStorage.clear();
});

function renderWithProvider() {
  return render(
    <LanguageProvider>
      <PageContent />
    </LanguageProvider>,
  );
}

describe("PageContent", () => {
  it("renders English hero title by default", () => {
    renderWithProvider();
    expect(screen.getByText("Know What You're Voting For")).toBeInTheDocument();
  });

  it("renders English tips heading by default", () => {
    renderWithProvider();
    expect(screen.getByText("Tips for the conversation")).toBeInTheDocument();
  });

  it("renders English footer by default", () => {
    renderWithProvider();
    expect(
      screen.getByText("Created by a human using AI tools"),
    ).toBeInTheDocument();
  });

  it("renders 'Works with:' in English", () => {
    renderWithProvider();
    expect(screen.getByText("Works with:")).toBeInTheDocument();
  });
});

describe("PageContent — Spanish", () => {
  beforeEach(() => {
    localStorage.setItem("lang", "es");
  });

  it("renders Spanish hero title when lang=es", () => {
    renderWithProvider();
    expect(screen.getByText("Sabe por quién vas a votar")).toBeInTheDocument();
  });

  it("renders Spanish tips heading when lang=es", () => {
    renderWithProvider();
    expect(
      screen.getByText("Consejos para la conversación"),
    ).toBeInTheDocument();
  });

  it("renders Spanish footer when lang=es", () => {
    renderWithProvider();
    expect(
      screen.getByText("Creado por una persona usando herramientas de IA"),
    ).toBeInTheDocument();
  });
});
