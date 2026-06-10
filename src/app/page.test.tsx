// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";

// Mock both experiences so the test doesn't pull in their full dep trees.
vi.mock("../prototype/VoterChoiceApp", () => ({
  default: () => <div data-testid="voter-choice-app" />,
}));
vi.mock("../prototype/redesign/App2", () => ({
  default: () => <div data-testid="assess-congress-app" />,
}));

// Mock next/dynamic to synchronously return the imported component, since
// jsdom can't execute the lazy chunk loader and would otherwise render null.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
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

// NEXT_PUBLIC_BALLOT_ENABLED is read at module scope, so each case stubs the
// env, resets the module cache, and re-imports the page.
async function loadHome(flag: string | undefined) {
  vi.resetModules();
  if (flag === undefined) {
    vi.stubEnv("NEXT_PUBLIC_BALLOT_ENABLED", "");
  } else {
    vi.stubEnv("NEXT_PUBLIC_BALLOT_ENABLED", flag);
  }
  const mod = await import("./page");
  return mod.default;
}

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Home page — experience flag", () => {
  it("renders the #root container", async () => {
    const Home = await loadHome(undefined);
    const { container } = render(<Home />);
    expect(container.querySelector("#root")).toBeInTheDocument();
  });

  it("defaults to the congress-assessment experience (flag unset)", async () => {
    const Home = await loadHome(undefined);
    render(<Home />);
    expect(screen.getByTestId("assess-congress-app")).toBeInTheDocument();
    expect(screen.queryByTestId("voter-choice-app")).not.toBeInTheDocument();
  });

  it("serves the legacy ballot experience when the flag is true", async () => {
    const Home = await loadHome("true");
    render(<Home />);
    expect(screen.getByTestId("voter-choice-app")).toBeInTheDocument();
    expect(screen.queryByTestId("assess-congress-app")).not.toBeInTheDocument();
  });

  it("treats any non-'true' value as the new experience", async () => {
    const Home = await loadHome("false");
    render(<Home />);
    expect(screen.getByTestId("assess-congress-app")).toBeInTheDocument();
  });
});
