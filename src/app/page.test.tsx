// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "./page";

// Mock BallotToolClient to isolate page layout tests
vi.mock("../components/BallotToolClient", () => ({
  BallotToolClient: () => <div data-testid="ballot-tool-client" />,
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
});
