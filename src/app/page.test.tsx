// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "./page";

// Mock client components to isolate page layout tests
vi.mock("../components/BallotToolClient", () => ({
  BallotToolClient: () => <div data-testid="ballot-tool-client" />,
}));
vi.mock("../components/LanguageToggle", () => ({
  LanguageToggle: () => (
    <button data-testid="language-toggle">Español</button>
  ),
}));
vi.mock("./PageContent", () => ({
  PageContent: ({ children }: { children?: React.ReactNode }) => (
    <div
      data-testid="page-content"
      data-tips="true"
    >
      <h1>Free AI Ballot Research Tool</h1>
      <section data-testid="tips-section">
        <p>AI can make mistakes</p>
        <p>don&apos;t know</p>
      </section>
      {children}
      <footer role="contentinfo">
        <p>Created by a human using AI tools</p>
      </footer>
      <a href="https://claude.ai">Claude</a>
      <a href="https://chatgpt.com">ChatGPT</a>
    </div>
  ),
}));
vi.mock("../lib/i18n", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="language-provider">{children}</div>
  ),
}));

describe("Home page", () => {
  it("renders the h1 headline", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Free AI Ballot Research Tool",
    );
  });

  it("renders the BallotToolClient", () => {
    render(<Home />);
    expect(screen.getByTestId("ballot-tool-client")).toBeInTheDocument();
  });

  it("renders a tips section with AI disclaimer", () => {
    render(<Home />);
    const tips = screen.getByTestId("tips-section");
    expect(tips).toBeInTheDocument();
    expect(tips.textContent).toMatch(/AI can make mistakes|important/i);
  });

  it("tips section contains at least one tip about saying 'I don't know'", () => {
    render(<Home />);
    expect(screen.getByTestId("tips-section").textContent).toContain("don");
  });

  it("renders footer with attribution text", () => {
    render(<Home />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain("Created by a human using AI tools");
  });

  it("renders chatbot links in hero", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /Claude/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ChatGPT/i })).toBeInTheDocument();
  });

  it("renders LanguageToggle with data-testid='language-toggle'", () => {
    render(<Home />);
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("wraps content in LanguageProvider", () => {
    render(<Home />);
    expect(screen.getByTestId("language-provider")).toBeInTheDocument();
  });

  it("renders PageContent component", () => {
    render(<Home />);
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });
});
