// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

// Mock the prototype component so the test doesn't pull in its full dep tree.
vi.mock("../prototype/VoterChoiceApp", () => ({
  default: () => <div data-testid="voter-choice-app" />,
}));

// Mock next/dynamic to synchronously return the imported component, since
// jsdom can't execute the lazy chunk loader and would otherwise render null.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Capture the resolved module synchronously via a closure trick:
    // we return a component that calls the loader on first render and
    // immediately renders whatever it resolves to (synchronously in
    // the test environment because the mock module is already in cache).
    let Resolved: React.ComponentType | null = null;
    loader().then((mod) => {
      Resolved = mod.default;
    });
    return function DynamicStub(props: Record<string, unknown>) {
      if (!Resolved) return null;
      return React.createElement(Resolved, props);
    };
  },
}));

import Home from "./page";

describe("Home page", () => {
  it("renders the #root container", () => {
    const { container } = render(<Home />);
    const root = container.querySelector("#root");
    expect(root).toBeInTheDocument();
  });

  it("renders the VoterChoiceApp inside #root", () => {
    render(<Home />);
    expect(screen.getByTestId("voter-choice-app")).toBeInTheDocument();
  });
});
