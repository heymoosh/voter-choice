import { describe, it, expect } from "vitest";
import { routePrompt, type RouteInput, type RouterBuilderKey } from "./router";

/**
 * Tuple-table tests for the prompt router. Each row asserts that a given
 * (view, raceType, trigger) combination resolves to the expected builder key.
 *
 * Mirrors the routing table in docs/design/2026-redesign/prompts.md
 * ("Implementation notes for Claude Code") and AC #2 of
 * .ai/work-packets/redesign-phase-1-prompt-refactor.md.
 *
 * Precedence rule under test: the overriding triggers
 * ("amend-from-rail" | "amend-from-chat" | "handoff-button" | "budget-exhausted")
 * always beat the view-based default. "user-message" is the pass-through
 * trigger and does NOT override the view default.
 */
describe("routePrompt — happy-path mappings", () => {
  const happyPathCases: Array<{
    name: string;
    input: RouteInput;
    expected: RouterBuilderKey;
  }> = [
    {
      name: "cold-open → theme-extraction",
      input: { view: "cold-open" },
      expected: "theme-extraction",
    },
    {
      name: "cold-open + user-message → theme-extraction (pass-through trigger does not override)",
      input: { view: "cold-open", trigger: "user-message" },
      expected: "theme-extraction",
    },
    {
      name: "workspace-race + choice → race-deep-dive",
      input: { view: "workspace-race", raceType: "choice" },
      expected: "race-deep-dive",
    },
    {
      name: "workspace-race + choice + user-message → race-deep-dive",
      input: {
        view: "workspace-race",
        raceType: "choice",
        trigger: "user-message",
      },
      expected: "race-deep-dive",
    },
    {
      name: "workspace-prop → proposition",
      input: { view: "workspace-prop" },
      expected: "proposition",
    },
    {
      name: "workspace-race + proposition (alias) → proposition",
      input: { view: "workspace-race", raceType: "proposition" },
      expected: "proposition",
    },
    {
      name: "workspace-prop + user-message → proposition",
      input: { view: "workspace-prop", trigger: "user-message" },
      expected: "proposition",
    },
    {
      name: "amend view → theme-amendment",
      input: { view: "amend" },
      expected: "theme-amendment",
    },
    {
      name: "handoff view → handoff",
      input: { view: "handoff" },
      expected: "handoff",
    },
  ];

  it.each(happyPathCases)("$name", ({ input, expected }) => {
    expect(routePrompt(input)).toBe(expected);
  });
});

describe("routePrompt — trigger overrides view", () => {
  const triggerOverrideCases: Array<{
    name: string;
    input: RouteInput;
    expected: RouterBuilderKey;
  }> = [
    {
      name: "workspace-race + choice + amend-from-rail → theme-amendment",
      input: {
        view: "workspace-race",
        raceType: "choice",
        trigger: "amend-from-rail",
      },
      expected: "theme-amendment",
    },
    {
      name: "workspace-race + choice + amend-from-chat → theme-amendment",
      input: {
        view: "workspace-race",
        raceType: "choice",
        trigger: "amend-from-chat",
      },
      expected: "theme-amendment",
    },
    {
      name: "workspace-prop + amend-from-chat → theme-amendment",
      input: { view: "workspace-prop", trigger: "amend-from-chat" },
      expected: "theme-amendment",
    },
    {
      name: "cold-open + budget-exhausted → handoff",
      input: { view: "cold-open", trigger: "budget-exhausted" },
      expected: "handoff",
    },
    {
      name: "workspace-race + choice + handoff-button → handoff",
      input: {
        view: "workspace-race",
        raceType: "choice",
        trigger: "handoff-button",
      },
      expected: "handoff",
    },
    {
      name: "amend view + handoff-button → handoff (handoff trigger beats amend view)",
      input: { view: "amend", trigger: "handoff-button" },
      expected: "handoff",
    },
    {
      name: "handoff view + amend-from-chat → theme-amendment (amend trigger beats handoff view)",
      input: { view: "handoff", trigger: "amend-from-chat" },
      expected: "theme-amendment",
    },
  ];

  it.each(triggerOverrideCases)("$name", ({ input, expected }) => {
    expect(routePrompt(input)).toBe(expected);
  });
});

describe("routePrompt — invalid combinations throw", () => {
  it("throws when view is workspace-race and raceType is missing", () => {
    expect(() => routePrompt({ view: "workspace-race" } as RouteInput)).toThrow(
      /routePrompt:/,
    );
  });

  it("workspace-prop without raceType does NOT throw (view is already specific)", () => {
    expect(() => routePrompt({ view: "workspace-prop" })).not.toThrow();
    expect(routePrompt({ view: "workspace-prop" })).toBe("proposition");
  });
});
