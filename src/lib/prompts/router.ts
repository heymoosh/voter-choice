/**
 * Prompt router for the v2 prompt fleet.
 *
 * Maps the current app state (view + raceType + trigger) to a builder key so
 * the chat route can pick the right task prompt. Pure function — returns a
 * key, never invokes a builder, performs no I/O, emits no logs. Keeping it
 * pure makes it cheap to tuple-table test in isolation; the chat route owns
 * the dispatch from key → builder call.
 *
 * Routing table mirrors docs/design/2026-redesign/prompts.md ("Implementation
 * notes for Claude Code") and AC #2 of
 * .ai/work-packets/redesign-phase-1-prompt-refactor.md.
 *
 * Precedence: the overriding triggers (amend-from-rail / amend-from-chat /
 * handoff-button / budget-exhausted) can fire from any view, so they MUST
 * be evaluated before the view-based default. "user-message" is the
 * pass-through trigger and never overrides.
 */
import type { RouterView, RaceType, RouterTrigger } from "./types";

export type RouterBuilderKey =
  | "theme-extraction"
  | "race-deep-dive"
  | "proposition"
  | "theme-amendment"
  | "handoff";

export interface RouteInput {
  view: RouterView;
  /** Required when view is "workspace-race"; ignored for other views. */
  raceType?: RaceType;
  /**
   * Optional. Overriding triggers ("amend-from-rail" | "amend-from-chat" |
   * "handoff-button" | "budget-exhausted") win over the view-based default.
   * "user-message" is a no-op pass-through.
   */
  trigger?: RouterTrigger;
}

/**
 * Resolve (view, raceType, trigger) to a builder key. Pure function.
 *
 * Throws when the input is structurally invalid (e.g. `view: "workspace-race"`
 * with no `raceType`) — callers shouldn't reach the model with an ambiguous
 * route. Error messages are prefixed with `routePrompt:` so they're greppable
 * in logs and stable for tests.
 */
export function routePrompt(input: RouteInput): RouterBuilderKey {
  const { view, raceType, trigger } = input;

  // Overriding triggers fire from any view and beat the view-based default.
  // Evaluating them first keeps the rest of the function focused on the
  // ordinary view → builder mapping.
  if (trigger === "amend-from-rail" || trigger === "amend-from-chat") {
    return "theme-amendment";
  }
  if (trigger === "handoff-button" || trigger === "budget-exhausted") {
    return "handoff";
  }

  // View-based default. The "user-message" trigger lands here as a pass-through.
  // Candidate cards are NOT produced by the chat anymore — they render from
  // the deterministic /api/race-data endpoint. The chat's workspace-race turn
  // is always a prose Q&A follow-up (race-deep-dive).
  switch (view) {
    case "cold-open":
      return "theme-extraction";

    case "workspace-race":
      if (raceType === "choice") return "race-deep-dive";
      if (raceType === "proposition") return "proposition";
      throw new Error(
        `routePrompt: view "workspace-race" requires raceType ("choice" | "proposition"); got ${
          raceType === undefined ? "undefined" : JSON.stringify(raceType)
        }`,
      );

    case "workspace-prop":
      return "proposition";

    case "amend":
      return "theme-amendment";

    case "handoff":
      return "handoff";

    default: {
      // Exhaustiveness guard — if a new RouterView is added without
      // updating this switch, TypeScript narrows `view` to `never` here.
      const _exhaustive: never = view;
      throw new Error(
        `routePrompt: unknown view ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
